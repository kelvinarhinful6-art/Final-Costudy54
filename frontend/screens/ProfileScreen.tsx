import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import SkyBackground from "./SkyBackground";
import { colors } from "../theme";
import { useTheme } from "../ThemeContext";

import {
  session,
  proStatus,
  myBookings,
  cancelBooking,
  myApplications,
  updateProfile,
  deleteBooking,
  listUsers,
  deleteApplication,
  resignApplication,
  tutorReviews,
  changePassword,
  deleteAccount,
} from "../api";
import type { Booking, TabProps, TutorApplication, User, Review } from "../types";
import { Modal } from "react-native";

const STATUS_LABELS: Record<string, string> = {
  APPROVED: "Approved ✓",
  UNDER_REVIEW: "In Review",
  REJECTED: "Rejected",
  AWAITING_DOCUMENTS: "Awaiting Docs",
  RESIGNED: "Resigned",
};

function statusLabel(s?: string): string {
  return STATUS_LABELS[s || ""] || (s || "").replace(/_/g, " ");
}

export default function ProfileScreen({ navigation }: TabProps<"Profile">) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const user = (session.user ?? ({} as User)) as User;
  const [activeTab, setActiveTab] = useState<"profile" | "settings">("profile");

  const [isPro, setIsPro] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [apps, setApps] = useState<TutorApplication[]>([]);
  const [usersById, setUsersById] = useState<Record<string, User>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelId, setCancelId] = useState<string | null>(null);

  const [editingProfile, setEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [fullName, setFullName] = useState(user.fullName || "");
  const [program, setProgram] = useState(user.program || "");
  const [age, setAge] = useState(user.age != null ? String(user.age) : "");
  const [yearOfStudy, setYearOfStudy] = useState(user.yearOfStudy != null ? String(user.yearOfStudy) : "");
  const [tutorDisplayName, setTutorDisplayName] = useState(user.tutorDisplayName || "");

  // Settings State: Change Password
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Settings State: Delete Account Modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmPass, setDeleteConfirmPass] = useState("");
  const [deletingAcc, setDeletingAcc] = useState(false);

  const [bookReviews, setBookReviews] = useState<Record<string, Review>>({});

  const load = useCallback(async () => {
    try {
      const [s, b, a, u] = await Promise.all([proStatus(), myBookings(), myApplications(), listUsers()]);
      setIsPro(!!s.active);
      const bList = Array.isArray(b) ? b : [];
      setBookings(bList);
      setApps(Array.isArray(a) ? a : []);
      const map: Record<string, User> = {};
      (Array.isArray(u) ? u : []).forEach((usr: User) => {
        map[usr.userId] = usr;
      });
      setUsersById(map);

      const completed = bList.filter(
        (bk: Booking) => (bk.status || "").toUpperCase() === "COMPLETED" && bk.tutorId
      );
      const revMap: Record<string, Review> = {};
      if (completed.length > 0) {
        await Promise.all(
          completed.map(async (bk: Booking) => {
            try {
              const res = await tutorReviews(bk.tutorId!);
              const rList: Review[] = Array.isArray(res) ? res : res?.reviews || [];
              const mine = rList.find((r) => r.bookingId === bk.bookingId || r.studentId === user.userId);
              if (mine) revMap[bk.bookingId] = mine;
            } catch (e) {}
          })
        );
      }
      setBookReviews(revMap);
    } catch (e) {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user.userId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const logout = () => {
    Alert.alert("Log out?", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Yes, Log Out",
        style: "destructive",
        onPress: () => {
          session.token = null;
          session.user = null;
          (navigation.getParent() as any)?.replace("Login");
        },
      },
    ]);
  };

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      const ageNum = age ? parseInt(age, 10) : null;
      const yearNum = yearOfStudy ? parseInt(yearOfStudy, 10) : null;
      const updated = await updateProfile(fullName, program, ageNum, yearNum, tutorDisplayName);
      session.user = { ...session.user, ...updated } as User;
      setEditingProfile(false);
    } catch (e) {
      Alert.alert("Could not save profile", (e as Error).message);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!oldPassword.trim()) {
      Alert.alert("Required", "Please enter your current password.");
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      Alert.alert("Invalid Password", "New password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Password Mismatch", "New password and confirmation do not match.");
      return;
    }
    if (oldPassword === newPassword) {
      Alert.alert("Same Password", "New password cannot be the same as your current password.");
      return;
    }

    setUpdatingPassword(true);
    try {
      await changePassword(oldPassword, newPassword);
      Alert.alert("Password Updated! 🎉", "Your password has been changed successfully.");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e) {
      Alert.alert("Update Failed", (e as Error).message);
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleDeleteAccountPress = () => {
    Alert.alert(
      "Delete Account?",
      "Are you sure you want to permanently delete your CoStudy account? All your profile data, sessions, and memberships will be deleted. This action CANNOT be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes, Delete Account",
          style: "destructive",
          onPress: () => setShowDeleteModal(true),
        },
      ]
    );
  };

  const handleFinalDeleteAccount = async () => {
    setDeletingAcc(true);
    try {
      await deleteAccount(deleteConfirmPass.trim() || undefined);
      session.token = null;
      session.user = null;
      setShowDeleteModal(false);
      Alert.alert("Account Deleted", "Your account has been permanently deleted.");
      (navigation.getParent() as any)?.replace("Login");
    } catch (e) {
      Alert.alert("Could not delete account", (e as Error).message);
    } finally {
      setDeletingAcc(false);
    }
  };

  const initial = (user.username || "?").charAt(0).toUpperCase();

  const STATUS_COLORS: Record<string, string> = {
    APPROVED: colors.green,
    UNDER_REVIEW: colors.yellow,
    REJECTED: colors.red,
    AWAITING_DOCUMENTS: colors.blue,
    RESIGNED: colors.textMuted,
  };

  return (
    <SkyBackground>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 90 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.white} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <View style={styles.topHeader}>
          <Text style={[styles.title, { color: colors.white }]}>Profile & Settings</Text>
          <TouchableOpacity
            style={[styles.supportBadge, { backgroundColor: colors.darkGray, borderColor: colors.cardBorder }]}
            onPress={() => navigation.navigate("SupportList")}
            activeOpacity={0.85}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={16} color={colors.blue} />
            <Text style={[styles.supportText, { color: colors.white }]}>Help & Support</Text>
          </TouchableOpacity>
        </View>

        {/* Central Segment Selector */}
        <View style={[styles.segmentContainer, { backgroundColor: colors.darkGray, borderColor: colors.cardBorder }]}>
          <TouchableOpacity
            style={[styles.segmentBtn, activeTab === "profile" && { backgroundColor: colors.blue }]}
            onPress={() => setActiveTab("profile")}
            activeOpacity={0.8}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Ionicons name="person-outline" size={15} color={activeTab === "profile" ? "#FFFFFF" : colors.textMuted} />
              <Text style={[styles.segmentText, { color: activeTab === "profile" ? "#FFFFFF" : colors.textMuted }]}>
                My Profile
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, activeTab === "settings" && { backgroundColor: colors.blue }]}
            onPress={() => setActiveTab("settings")}
            activeOpacity={0.8}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Ionicons name="settings-outline" size={15} color={activeTab === "settings" ? "#FFFFFF" : colors.textMuted} />
              <Text style={[styles.segmentText, { color: activeTab === "settings" ? "#FFFFFF" : colors.textMuted }]}>
                Settings
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* --- TAB 1: MY PROFILE --- */}
        {activeTab === "profile" && (
          <>
            {/* User Card */}
            <View style={[styles.userCard, { backgroundColor: colors.darkGray, borderColor: colors.cardBorder }]}>
              <View style={[styles.avatar, { backgroundColor: colors.surfaceHover }]}>
                <Text style={[styles.avatarText, { color: colors.blue }]}>{initial}</Text>
              </View>
              <Text style={[styles.username, { color: colors.white }]}>{user.username || "User"}</Text>
              <Text style={[styles.email, { color: colors.textMuted }]}>{user.email || ""}</Text>
              <View style={[styles.badge, isPro ? { backgroundColor: colors.yellow } : { backgroundColor: colors.surfaceHover }]}>
                <Ionicons name={isPro ? "star" : "person"} size={12} color={isPro ? "#000000" : colors.white} />
                <Text style={[styles.badgeText, { color: isPro ? "#000000" : colors.white }]}>
                  {isPro ? "Pro member" : "Free member"}
                </Text>
              </View>
            </View>

            {/* Personal Info Card */}
            <View style={[styles.infoCard, { backgroundColor: colors.darkGray, borderColor: colors.cardBorder }]}>
              <View style={styles.cardHeader}>
                <Text style={[styles.cardTitle, { color: colors.white }]}>Personal Information</Text>
                {!editingProfile && (
                  <TouchableOpacity onPress={() => setEditingProfile(true)} activeOpacity={0.85}>
                    <Ionicons name="create-outline" size={18} color={colors.blue} />
                  </TouchableOpacity>
                )}
              </View>

              {editingProfile ? (
                <>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.surfaceHover, borderColor: colors.cardBorder, color: colors.white }]}
                    placeholder="Full name"
                    placeholderTextColor={colors.textMuted}
                    value={fullName}
                    onChangeText={setFullName}
                  />
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.surfaceHover, borderColor: colors.cardBorder, color: colors.white }]}
                    placeholder="Program (e.g. BSc Computer Science)"
                    placeholderTextColor={colors.textMuted}
                    value={program}
                    onChangeText={setProgram}
                  />
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.surfaceHover, borderColor: colors.cardBorder, color: colors.white }]}
                    placeholder="Age"
                    placeholderTextColor={colors.textMuted}
                    value={age}
                    onChangeText={setAge}
                    keyboardType="number-pad"
                  />
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.surfaceHover, borderColor: colors.cardBorder, color: colors.white }]}
                    placeholder="Year of study"
                    placeholderTextColor={colors.textMuted}
                    value={yearOfStudy}
                    onChangeText={setYearOfStudy}
                    keyboardType="number-pad"
                  />
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.surfaceHover, borderColor: colors.cardBorder, color: colors.white }]}
                    placeholder="Tutor Display Name (optional)"
                    placeholderTextColor={colors.textMuted}
                    value={tutorDisplayName}
                    onChangeText={setTutorDisplayName}
                  />
                  <View style={{ flexDirection: "row", gap: 10, marginTop: 6 }}>
                    <TouchableOpacity
                      style={[styles.profileBtn, { backgroundColor: colors.surfaceHover }]}
                      onPress={() => setEditingProfile(false)}
                      disabled={savingProfile}
                      activeOpacity={0.85}
                    >
                      <Text style={[styles.cancelBtnText, { color: colors.white }]}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.profileBtn, { backgroundColor: colors.blue }]}
                      onPress={saveProfile}
                      disabled={savingProfile}
                      activeOpacity={0.85}
                    >
                      {savingProfile ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <Text style={styles.saveBtnText}>Save</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.infoRow}>
                    <Ionicons name="person-outline" size={16} color={colors.textMuted} />
                    <Text style={[styles.infoValue, { color: colors.white }]}>{user.fullName || "Full name not set"}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Ionicons name="book-outline" size={16} color={colors.textMuted} />
                    <Text style={[styles.infoValue, { color: colors.white }]}>{user.program || "Program not set"}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Ionicons name="calendar-outline" size={16} color={colors.textMuted} />
                    <Text style={[styles.infoValue, { color: colors.white }]}>{user.age != null ? `${user.age} years old` : "Age not set"}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Ionicons name="school-outline" size={16} color={colors.textMuted} />
                    <Text style={[styles.infoValue, { color: colors.white }]}>
                      {user.yearOfStudy != null ? `Year ${user.yearOfStudy}` : "Year not set"}
                    </Text>
                  </View>
                </>
              )}
            </View>

            {/* My Applications */}
            {apps.length > 0 && (
              <>
                <Text style={[styles.sectionHeaderTitle, { color: colors.white }]}>My Applications</Text>
                {apps.map((a) => (
                  <View key={a.applicationId} style={[styles.appCard, { backgroundColor: colors.darkGray, borderColor: colors.cardBorder }]}>
                    <View style={styles.appCardRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.appCourseText, { color: colors.white }]}>{a.courseId}</Text>
                        <Text style={[styles.appMetaText, { color: colors.textMuted }]}>Tutor Application</Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[a.status || ""] || "#555" }]}>
                        <Text style={styles.statusBadgeText}>{statusLabel(a.status)}</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </>
            )}
          </>
        )}

        {/* --- TAB 2: SETTINGS & SECURITY --- */}
        {activeTab === "settings" && (
          <>
            {/* Security & Password Card */}
            <View style={[styles.infoCard, { backgroundColor: colors.darkGray, borderColor: colors.cardBorder }]}>
              <View style={styles.cardHeader}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Ionicons name="key-outline" size={18} color={colors.blue} />
                  <Text style={[styles.cardTitle, { color: colors.white }]}>Security & Password</Text>
                </View>
              </View>
              <Text style={[styles.cardSubText, { color: colors.textMuted }]}>
                Change your account password to keep your CoStudy profile safe.
              </Text>

              {/* Current Password */}
              <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Current Password</Text>
              <View style={[styles.passInputRow, { backgroundColor: colors.surfaceHover, borderColor: colors.cardBorder }]}>
                <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} />
                <TextInput
                  style={[styles.passInput, { color: colors.white }]}
                  placeholder="Enter current password"
                  placeholderTextColor={colors.textMuted}
                  value={oldPassword}
                  onChangeText={setOldPassword}
                  secureTextEntry={!showOldPass}
                />
                <TouchableOpacity onPress={() => setShowOldPass((p) => !p)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name={showOldPass ? "eye-off-outline" : "eye-outline"} size={18} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              {/* New Password */}
              <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>New Password</Text>
              <View style={[styles.passInputRow, { backgroundColor: colors.surfaceHover, borderColor: colors.cardBorder }]}>
                <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} />
                <TextInput
                  style={[styles.passInput, { color: colors.white }]}
                  placeholder="Min. 6 characters"
                  placeholderTextColor={colors.textMuted}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showNewPass}
                />
                <TouchableOpacity onPress={() => setShowNewPass((p) => !p)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name={showNewPass ? "eye-off-outline" : "eye-outline"} size={18} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              {/* Confirm New Password */}
              <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Confirm New Password</Text>
              <View style={[styles.passInputRow, { backgroundColor: colors.surfaceHover, borderColor: colors.cardBorder }]}>
                <Ionicons name="shield-checkmark-outline" size={18} color={colors.textMuted} />
                <TextInput
                  style={[styles.passInput, { color: colors.white }]}
                  placeholder="Re-type new password"
                  placeholderTextColor={colors.textMuted}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPass}
                />
                <TouchableOpacity onPress={() => setShowConfirmPass((p) => !p)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name={showConfirmPass ? "eye-off-outline" : "eye-outline"} size={18} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              {/* Update Password Action Button */}
              <TouchableOpacity
                style={[styles.actionSubmitBtn, { backgroundColor: colors.blue }]}
                onPress={handleChangePassword}
                disabled={updatingPassword}
                activeOpacity={0.85}
              >
                {updatingPassword ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.actionSubmitText}>Update Password</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Account Deletion / Danger Zone */}
            <View style={[styles.infoCard, { backgroundColor: colors.darkGray, borderColor: "rgba(239,68,68,0.3)" }]}>
              <View style={styles.cardHeader}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Ionicons name="warning-outline" size={18} color={colors.red} />
                  <Text style={[styles.cardTitle, { color: colors.red }]}>Danger Zone</Text>
                </View>
              </View>
              <Text style={[styles.cardSubText, { color: colors.textMuted }]}>
                Permanently delete your account. This action logs you out, deletes your profile, and cannot be reversed.
              </Text>

              <TouchableOpacity
                style={[styles.deleteAccBtn, { backgroundColor: "rgba(239,68,68,0.12)", borderColor: colors.red }]}
                onPress={handleDeleteAccountPress}
                activeOpacity={0.85}
              >
                <Ionicons name="trash-outline" size={18} color={colors.red} />
                <Text style={[styles.deleteAccBtnText, { color: colors.red }]}>Delete Account</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Global Logout Button */}
        <TouchableOpacity style={[styles.logoutButton, { backgroundColor: colors.darkGray, borderColor: colors.red }]} onPress={logout} activeOpacity={0.85}>
          <Ionicons name="log-out-outline" size={18} color={colors.red} />
          <Text style={[styles.logoutText, { color: colors.red }]}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Delete Account Password Confirmation Modal */}
      <Modal visible={showDeleteModal} transparent animationType="fade" onRequestClose={() => setShowDeleteModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.darkGray, borderColor: colors.cardBorder }]}>
            <View style={[styles.warningIconCircle, { backgroundColor: "rgba(239,68,68,0.15)" }]}>
              <Ionicons name="warning" size={32} color={colors.red} />
            </View>
            <Text style={[styles.modalTitle, { color: colors.white }]}>Delete Account</Text>
            <Text style={[styles.modalSub, { color: colors.textMuted }]}>
              Confirm deletion of account <Text style={{ fontWeight: "700", color: colors.white }}>{user.email}</Text>. Please enter your password to proceed.
            </Text>

            <TextInput
              style={[styles.deletePassInput, { backgroundColor: colors.surfaceHover, borderColor: colors.cardBorder, color: colors.white }]}
              placeholder="Enter your password"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              value={deleteConfirmPass}
              onChangeText={setDeleteConfirmPass}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.surfaceHover }]}
                onPress={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmPass("");
                }}
                disabled={deletingAcc}
                activeOpacity={0.85}
              >
                <Text style={[styles.modalCancelText, { color: colors.white }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.red }]}
                onPress={handleFinalDeleteAccount}
                disabled={deletingAcc}
                activeOpacity={0.85}
              >
                {deletingAcc ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalConfirmDeleteText}>Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SkyBackground>
  );
}

const styles = StyleSheet.create({
  topHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: { fontSize: 24, fontWeight: "700" },
  supportBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
  },
  supportText: { fontSize: 12, fontWeight: "600" },

  segmentContainer: {
    flexDirection: "row",
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentText: {
    fontSize: 13,
    fontWeight: "700",
  },

  userCard: {
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  avatarText: { fontSize: 24, fontWeight: "700" },
  username: { fontSize: 20, fontWeight: "700" },
  email: { fontSize: 13, marginTop: 2 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginTop: 10,
  },
  badgeText: { fontWeight: "700", fontSize: 11 },

  infoCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  cardTitle: { fontSize: 15, fontWeight: "700" },
  cardSubText: { fontSize: 12, marginBottom: 14, lineHeight: 18 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  infoValue: { fontSize: 14 },

  fieldLabel: { fontSize: 12, fontWeight: "600", marginBottom: 6, marginTop: 6 },
  passInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  passInput: { flex: 1, fontSize: 14 },
  actionSubmitBtn: {
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    minHeight: 46,
  },
  actionSubmitText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },

  deleteAccBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    marginTop: 10,
  },
  deleteAccBtnText: { fontSize: 14, fontWeight: "700" },

  input: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 10,
  },
  profileBtn: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 11, borderRadius: 10 },
  cancelBtnText: { fontWeight: "600" },
  saveBtnText: { color: "#FFFFFF", fontWeight: "700" },

  sectionHeaderTitle: { fontSize: 16, fontWeight: "700", marginTop: 14, marginBottom: 10 },
  appCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
  },
  appCardRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  appCourseText: { fontSize: 15, fontWeight: "700" },
  appMetaText: { fontSize: 12, marginTop: 2 },
  statusBadge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  statusBadgeText: { color: "#FFFFFF", fontSize: 11, fontWeight: "700" },

  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 14,
    borderWidth: 1,
  },
  logoutText: { fontSize: 15, fontWeight: "700" },

  // Delete Account Modal Styles
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.72)", justifyContent: "center", paddingHorizontal: 20 },
  modalCard: {
    borderRadius: 20,
    padding: 22,
    alignItems: "center",
    borderWidth: 1,
    width: "100%",
  },
  warningIconCircle: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  modalTitle: { fontSize: 20, fontWeight: "700", marginBottom: 6 },
  modalSub: { fontSize: 13, textAlign: "center", marginBottom: 16, lineHeight: 18 },
  deletePassInput: {
    width: "100%",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    borderWidth: 1,
    marginBottom: 18,
  },
  modalBtnRow: { flexDirection: "row", gap: 12, width: "100%" },
  modalBtn: { flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: "center", justifyContent: "center" },
  modalCancelText: { fontWeight: "600", fontSize: 14 },
  modalConfirmDeleteText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },
});

