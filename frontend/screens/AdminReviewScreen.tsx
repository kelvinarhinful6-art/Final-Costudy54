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
  Modal,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { WebView } from "react-native-webview";
import SkyBackground from "./SkyBackground";
import { useTheme } from "../ThemeContext";
import { BASE_URL, adminQueue, adminApprove, adminDecline, listUsers } from "../api";
import type { StackProps, TutorApplication, User } from "../types";

export default function AdminReviewScreen({ navigation }: StackProps<"AdminReview">) {
  const insets = useSafeAreaInsets();
  const { colors, isDarkMode } = useTheme();
  const [apps, setApps] = useState<TutorApplication[]>([]);
  const [usersById, setUsersById] = useState<Record<string, User>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [viewingDoc, setViewingDoc] = useState<string | null>(null);
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [data, users] = await Promise.all([adminQueue("UNDER_REVIEW"), listUsers()]);
      setApps(Array.isArray(data) ? data : []);
      const map: Record<string, User> = {};
      (Array.isArray(users) ? users : []).forEach((u: User) => {
        map[u.userId] = u;
      });
      setUsersById(map);
    } catch (e) {
      Alert.alert("Could not load queue", (e as Error).message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );
  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const decide = (app: TutorApplication, approve: boolean) => {
    Alert.alert(approve ? "Approve applicant?" : "Decline applicant?", `${app.userId} for ${app.courseId}`, [
      { text: "Cancel", style: "cancel" },
      {
        text: approve ? "Approve" : "Decline",
        style: approve ? "default" : "destructive",
        onPress: async () => {
          setActingId(app.applicationId);
          try {
            if (approve) await adminApprove(app.applicationId);
            else await adminDecline(app.applicationId);
            await load();
            Alert.alert("Done", `Applicant ${approve ? "approved" : "declined"}.`);
          } catch (e) {
            Alert.alert("Action failed", (e as Error).message);
          } finally {
            setActingId(null);
          }
        },
      },
    ]);
  };

  const openDoc = (docRef: string) => {
    const url = `${BASE_URL}/api/tutor-applications/documents/${docRef}`;
    const ext = docRef.split(".").pop()?.toLowerCase() ?? "";
    if (["png", "jpg", "jpeg", "gif", "webp", "bmp"].includes(ext)) {
      setViewingImage(url);
    } else {
      setViewingDoc(url);
    }
  };

  return (
    <SkyBackground>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 60 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.white} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.85}>
            <Ionicons name="chevron-back" size={26} color={colors.white} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.white }]}>Review applications</Text>
        </View>
        <Text style={[styles.sub, { color: colors.textMuted }]}>Applicants waiting for a decision.</Text>

        {loading ? (
          <ActivityIndicator color={colors.white} style={{ marginTop: 24 }} />
        ) : apps.length === 0 ? (
          <View style={[styles.empty, { backgroundColor: colors.darkGray, borderColor: colors.cardBorder }]}>
            <Ionicons name="checkmark-done" size={28} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>No applications waiting for review.</Text>
          </View>
        ) : (
          apps.map((a) => {
            const userInfo = usersById[a.userId ?? ""];
            const displayName = userInfo ? userInfo.username : "Unknown User";
            const docs = a.documentRef ? a.documentRef.split(",") : [];

            return (
              <View key={a.applicationId} style={[styles.card, { backgroundColor: colors.darkGray, borderColor: colors.cardBorder }]}>
                <View style={styles.cardTop}>
                  <View style={[styles.avatar, { backgroundColor: colors.surfaceHover }]}>
                    <Ionicons name="person" size={18} color={colors.blue} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.applicant, { color: colors.white }]}>{displayName}</Text>
                    <Text style={[styles.meta, { color: colors.textMuted }]}>Course: {a.courseId}</Text>
                  </View>
                </View>

                {a.registeredCourse === false && (
                  <View style={styles.newCourseBadge}>
                    <Ionicons name="sparkles" size={14} color="#FFFFFF" />
                    <Text style={styles.newCourseBadgeText}>New course · manual review</Text>
                  </View>
                )}

                {docs.length > 0 ? (
                  <View style={styles.docListContainer}>
                    {docs.map((doc, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[styles.docRow, { backgroundColor: colors.surfaceHover }]}
                        onPress={() => openDoc(doc)}
                      >
                        <Ionicons name="document-attach-outline" size={18} color={colors.blue} />
                        <Text style={[styles.docLink, { color: colors.blue }]}>View Document {index + 1}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : (
                  <View style={[styles.docRow, { backgroundColor: colors.surfaceHover }]}>
                    <Ionicons name="document-attach-outline" size={15} color={colors.textMuted} />
                    <Text style={[styles.docText, { color: colors.textMuted }]}>No documents uploaded</Text>
                  </View>
                )}

                <View style={styles.btnRow}>
                  <TouchableOpacity
                    style={[styles.decideBtn, { backgroundColor: "rgba(239,68,68,0.12)", borderColor: "rgba(239,68,68,0.4)", borderWidth: 1 }]}
                    onPress={() => decide(a, false)}
                    disabled={actingId === a.applicationId}
                    activeOpacity={0.85}
                  >
                    <Text style={{ color: colors.red, fontWeight: "700", fontSize: 14 }}>Decline</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.decideBtn, { backgroundColor: colors.blue }]}
                    onPress={() => decide(a, true)}
                    disabled={actingId === a.applicationId}
                    activeOpacity={0.85}
                  >
                    {actingId === a.applicationId ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 14 }}>Approve</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <Modal visible={!!viewingDoc} transparent={true} animationType="fade" onRequestClose={() => setViewingDoc(null)}>
        <View style={styles.fileViewerOverlay}>
          <View style={styles.fileViewerHeader}>
            <Text style={styles.fileViewerTitle}>Viewing Document</Text>
            <TouchableOpacity onPress={() => setViewingDoc(null)}>
              <Ionicons name="close-circle" size={36} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          {viewingDoc && (
            <View style={styles.webviewContainer}>
              <WebView source={{ uri: viewingDoc }} />
            </View>
          )}
        </View>
      </Modal>

      <Modal visible={!!viewingImage} transparent={true} animationType="fade" onRequestClose={() => setViewingImage(null)}>
        <View style={styles.fileViewerOverlay}>
          <View style={styles.fileViewerHeader}>
            <Text style={styles.fileViewerTitle}>Image</Text>
            <TouchableOpacity onPress={() => setViewingImage(null)}>
              <Ionicons name="close-circle" size={36} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          {viewingImage && (
            <View style={styles.webviewContainer}>
              <Image source={{ uri: viewingImage }} style={styles.fullImage} resizeMode="contain" />
            </View>
          )}
        </View>
      </Modal>
    </SkyBackground>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  title: { fontSize: 22, fontWeight: "700" },
  sub: { fontSize: 13, marginBottom: 18 },
  empty: {
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
  },
  emptyText: { fontSize: 14, textAlign: "center" },
  card: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
  },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  applicant: { fontSize: 16, fontWeight: "600" },
  meta: { fontSize: 12, marginTop: 2 },
  newCourseBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: "#D97706",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 10,
    marginBottom: 10,
  },
  newCourseBadgeText: { color: "#FFFFFF", fontSize: 12, fontWeight: "600" },
  docListContainer: { marginBottom: 14, gap: 8 },
  docRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 8,
  },
  docText: { fontSize: 13, flex: 1 },
  docLink: { fontSize: 14, fontWeight: "600", flex: 1 },
  btnRow: { flexDirection: "row", gap: 10 },
  decideBtn: { flex: 1, paddingVertical: 11, borderRadius: 12, alignItems: "center", justifyContent: "center", minHeight: 44 },
  fileViewerOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.95)", paddingTop: 60 },
  fileViewerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  fileViewerTitle: { color: "#FFFFFF", fontSize: 18, fontWeight: "600" },
  webviewContainer: { flex: 1, backgroundColor: "#FFFFFF", margin: 10, borderRadius: 12, overflow: "hidden" },
  fullImage: { width: "100%", height: "100%" },
});

