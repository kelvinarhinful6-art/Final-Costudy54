import React, { useState, useCallback, useMemo } from "react";
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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import SkyBackground from "./SkyBackground";
import { useTheme } from "../ThemeContext";
import { session, listUsers, myGroups, sendInvite } from "../api";
import type { StackProps, User } from "../types";

export default function FindPeopleScreen({ navigation }: StackProps<"FindPeople">) {
  const insets = useSafeAreaInsets();
  const { colors, isDarkMode } = useTheme();
  const me = (session.user ?? ({} as User)) as User;
  const meId = me.userId || "";
  const myProgram = (me.program || "").trim().toLowerCase();
  const [people, setPeople] = useState<User[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [invitingId, setInvitingId] = useState<string | null>(null);
  const [viewingPerson, setViewingPerson] = useState<User | null>(null);

  const load = useCallback(async () => {
    try {
      const [u, g] = await Promise.all([listUsers(), myGroups()]);
      setPeople((Array.isArray(u) ? u : []).filter((p: User) => p.userId !== meId));
      setGroups(Array.isArray(g) ? g : []);
    } catch (e) {
      Alert.alert("Could not load people", (e as Error).message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [meId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );
  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const sortedPeople = useMemo(() => {
    if (!myProgram) return people;
    const mine: User[] = [];
    const rest: User[] = [];
    for (const p of people) {
      const theirs = (p.program || "").trim().toLowerCase();
      if (theirs && theirs === myProgram) mine.push(p);
      else rest.push(p);
    }
    return [...mine, ...rest];
  }, [people, myProgram]);

  const isSameProgram = (p: User) => {
    const theirs = (p.program || "").trim().toLowerCase();
    return myProgram && theirs && theirs === myProgram;
  };

  const invite = (person: User) => {
    if (groups.length === 0) {
      Alert.alert("No groups", "Create a group first, then you can invite people to it.");
      return;
    }
    const buttons: Array<{ text: string; onPress?: () => void; style?: "cancel" | "default" | "destructive" }> =
      groups.slice(0, 3).map((g) => ({
      text: g.groupName,
      onPress: async () => {
        setInvitingId(person.userId);
        try {
          await sendInvite(g.groupId, g.groupName, person.userId);
          Alert.alert("Invite sent", `${person.username} was invited to ${g.groupName}.`);
        } catch (e) {
          Alert.alert("Could not invite", (e as Error).message);
        } finally {
          setInvitingId(null);
        }
      },
    }));
    buttons.push({ text: "Cancel", style: "cancel" });
    Alert.alert("Invite to which group?", `Invite ${person.username} to:`, buttons);
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
          <Text style={[styles.title, { color: colors.white }]}>Find people</Text>
        </View>
        <Text style={[styles.sub, { color: colors.textMuted }]}>Invite other students to your study groups.</Text>

        {loading ? (
          <ActivityIndicator color={colors.white} style={{ marginTop: 24 }} />
        ) : sortedPeople.length === 0 ? (
          <View style={[styles.empty, { backgroundColor: colors.darkGray, borderColor: colors.cardBorder }]}>
            <Ionicons name="people-outline" size={28} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>No other users yet.</Text>
          </View>
        ) : (
          sortedPeople.map((p) => (
            <TouchableOpacity key={p.userId} activeOpacity={0.85} onPress={() => setViewingPerson(p)}>
              <View style={[styles.card, { backgroundColor: colors.darkGray, borderColor: colors.cardBorder }]}>
                <View style={[styles.avatar, { backgroundColor: colors.surfaceHover }]}>
                  <Text style={[styles.avatarText, { color: colors.blue }]}>{(p.username || "?").charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.name, { color: colors.white }]}>{p.username}</Text>
                  <Text style={[styles.role, { color: colors.textMuted }]}>{p.userType}</Text>
                  {isSameProgram(p) && (
                    <View style={[styles.sameProgramTag, { backgroundColor: "rgba(34,197,94,0.15)" }]}>
                      <Ionicons name="checkmark-circle" size={12} color={colors.green} />
                      <Text style={[styles.sameProgramText, { color: colors.green }]}>Same program</Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity
                  style={[styles.inviteBtn, { backgroundColor: colors.blue }]}
                  onPress={() => invite(p)}
                  disabled={invitingId === p.userId}
                  activeOpacity={0.85}
                >
                  {invitingId === p.userId ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.inviteText}>Invite</Text>
                  )}
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <Modal visible={!!viewingPerson} transparent animationType="fade" onRequestClose={() => setViewingPerson(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.darkGray, borderColor: colors.cardBorder }]}>
            {viewingPerson && (
              <>
                <View style={[styles.modalAvatar, { backgroundColor: colors.surfaceHover }]}>
                  <Text style={[styles.modalAvatarText, { color: colors.blue }]}>{(viewingPerson.username || "?").charAt(0).toUpperCase()}</Text>
                </View>
                <Text style={[styles.modalName, { color: colors.white }]}>{viewingPerson.username}</Text>
                <Text style={[styles.modalRole, { color: colors.textMuted }]}>{viewingPerson.userType}</Text>

                <View style={styles.modalInfoRow}>
                  <Ionicons name="person-outline" size={16} color={colors.textMuted} />
                  <Text style={[styles.modalInfoText, { color: colors.white }]}>{viewingPerson.fullName || "Full name not set"}</Text>
                </View>
                <View style={styles.modalInfoRow}>
                  <Ionicons name="book-outline" size={16} color={colors.textMuted} />
                  <Text style={[styles.modalInfoText, { color: colors.white }]}>{viewingPerson.program || "Program not set"}</Text>
                </View>
                <View style={styles.modalInfoRow}>
                  <Ionicons name="calendar-outline" size={16} color={colors.textMuted} />
                  <Text style={[styles.modalInfoText, { color: colors.white }]}>
                    {viewingPerson.age != null ? `${viewingPerson.age} years old` : "Age not set"}
                  </Text>
                </View>
                <View style={styles.modalInfoRow}>
                  <Ionicons name="school-outline" size={16} color={colors.textMuted} />
                  <Text style={[styles.modalInfoText, { color: colors.white }]}>
                    {viewingPerson.yearOfStudy != null ? `Year ${viewingPerson.yearOfStudy}` : "Year not set"}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.modalCloseBtn, { backgroundColor: colors.surfaceHover, borderColor: colors.cardBorder }]}
                  onPress={() => setViewingPerson(null)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.modalCloseText, { color: colors.white }]}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SkyBackground>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 },
  title: { fontSize: 22, fontWeight: "700" },
  sub: { fontSize: 13, marginBottom: 18 },
  empty: {
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
  },
  emptyText: { fontSize: 14 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
  },
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 18, fontWeight: "700" },
  name: { fontSize: 16, fontWeight: "600" },
  role: { fontSize: 12, marginTop: 2 },
  sameProgramTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 6,
    alignSelf: "flex-start",
  },
  sameProgramText: { fontSize: 10, fontWeight: "700" },
  inviteBtn: {
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 9,
    minWidth: 76,
    alignItems: "center",
  },
  inviteText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center", padding: 24 },
  modalCard: {
    width: "100%",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
  },
  modalAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  modalAvatarText: { fontSize: 24, fontWeight: "700" },
  modalName: { fontSize: 19, fontWeight: "700" },
  modalRole: { fontSize: 12, marginBottom: 14 },
  modalInfoRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10, alignSelf: "flex-start" },
  modalInfoText: { fontSize: 14 },
  modalCloseBtn: {
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  modalCloseText: { fontWeight: "700", fontSize: 14 },
});

