import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import SkyBackground from "./SkyBackground";
import { useTheme } from "../ThemeContext";
import { tutorBookings, setZoomLink, startSession, endSession, listUsers, userName } from "../api";
import type { Booking, StackProps } from "../types";

export default function TutorSessionsScreen({ navigation }: StackProps<"TutorSessions">) {
  const insets = useSafeAreaInsets();
  const { colors, isDarkMode } = useTheme();
  const [sessions, setSessions] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [links, setLinks] = useState<Record<string, string>>({});
  const [names, setNames] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await tutorBookings();
      const list = Array.isArray(data) ? data : [];
      setSessions(list);
      const initial: Record<string, string> = {};
      list.forEach((s: Booking) => {
        initial[s.bookingId] = s.zoomLink || "";
      });
      setLinks(initial);
      listUsers()
        .then((users) => {
          const map: Record<string, string> = {};
          (Array.isArray(users) ? users : []).forEach((u: any) => {
            if (u && u.userId) map[u.userId] = userName(u);
          });
          setNames(map);
        })
        .catch(() => {});
    } catch (e) {
      Alert.alert("Could not load sessions", (e as Error).message);
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

  const saveLink = async (s: Booking) => {
    const link = (links[s.bookingId] || "").trim();
    if (!link) {
      Alert.alert("Enter a link", "Paste your Zoom meeting link first.");
      return;
    }
    setBusyId(s.bookingId);
    try {
      await setZoomLink(s.bookingId, link);
      await load();
      Alert.alert("Link saved", "Students can now join from the chat.");
    } catch (e) {
      Alert.alert("Could not save link", (e as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const doStart = async (s: Booking) => {
    setBusyId(s.bookingId);
    try {
      await startSession(s.bookingId);
      Alert.alert("Session started", "The student has been notified.");
    } catch (e) {
      Alert.alert("Could not start", (e as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const doEnd = async (s: Booking) => {
    setBusyId(s.bookingId);
    try {
      await endSession(s.bookingId);
      await load();
      Alert.alert("Session ended", "The student has been notified.");
    } catch (e) {
      Alert.alert("Could not end", (e as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const active = (st?: string) => {
    const x = (st || "").toUpperCase();
    return x !== "COMPLETED" && x !== "CANCELLED" && x !== "CANCELED";
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
          <Text style={[styles.title, { color: colors.white }]}>My tutoring sessions</Text>
        </View>
        <Text style={[styles.sub, { color: colors.textMuted }]}>Post the Zoom link, start and end sessions, and message your students.</Text>

        {loading ? (
          <ActivityIndicator color={colors.white} style={{ marginTop: 24 }} />
        ) : sessions.length === 0 ? (
          <View style={[styles.empty, { backgroundColor: colors.darkGray, borderColor: colors.cardBorder }]}>
            <Ionicons name="briefcase-outline" size={28} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>No one has booked you yet.</Text>
          </View>
        ) : (
          sessions.map((s) => {
            const studentName = names[s.studentId || ""] || "";
            return (
              <View key={s.bookingId} style={[styles.card, { backgroundColor: colors.darkGray, borderColor: colors.cardBorder }]}>
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.course, { color: colors.white }]}>{studentName || s.courseId}</Text>
                    <Text style={[styles.meta, { color: colors.textMuted }]}>
                      {s.courseId ? s.courseId + " · " : ""}{s.hours} hr · {s.grossAmount} {s.currency} · {s.status}
                    </Text>
                  </View>
                </View>

                {active(s.status) && (
                  <>
                    <View style={[styles.inputRow, { backgroundColor: colors.surfaceHover, borderColor: colors.cardBorder }]}>
                      <Ionicons name="link-outline" size={16} color={colors.textMuted} />
                      <TextInput
                        style={[styles.input, { color: colors.white }]}
                        placeholder="Paste Zoom link"
                        placeholderTextColor={colors.textMuted}
                        value={links[s.bookingId] || ""}
                        onChangeText={(v) => setLinks((m) => ({ ...m, [s.bookingId]: v }))}
                        autoCapitalize="none"
                      />
                      <TouchableOpacity onPress={() => saveLink(s)} disabled={busyId === s.bookingId}>
                        <Text style={[styles.saveText, { color: colors.blue }]}>Save</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.btnRow}>
                      <TouchableOpacity
                        style={[styles.btn, { backgroundColor: colors.green }]}
                        onPress={() => doStart(s)}
                        disabled={busyId === s.bookingId}
                        activeOpacity={0.85}
                      >
                        <Ionicons name="play" size={15} color="#FFFFFF" />
                        <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 14 }}>Start</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.btn, { backgroundColor: "rgba(239,68,68,0.15)", borderColor: colors.red, borderWidth: 1 }]}
                        onPress={() => doEnd(s)}
                        disabled={busyId === s.bookingId}
                        activeOpacity={0.85}
                      >
                        <Ionicons name="stop" size={15} color={colors.red} />
                        <Text style={{ color: colors.red, fontWeight: "700", fontSize: 14 }}>End</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}

                <TouchableOpacity
                  style={[styles.chatBtn, { backgroundColor: colors.surfaceHover, borderColor: colors.cardBorder }]}
                  onPress={() => navigation.navigate("SessionChat", { bookingId: s.bookingId, title: studentName || "Session: " + s.courseId })}
                  activeOpacity={0.85}
                >
                  <Ionicons name="chatbubbles-outline" size={16} color={colors.blue} />
                  <Text style={[styles.chatText, { color: colors.blue }]}>Message student</Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </ScrollView>
    </SkyBackground>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  title: { fontSize: 21, fontWeight: "700" },
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
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
  },
  cardTop: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  course: { fontSize: 16, fontWeight: "600" },
  meta: { fontSize: 12, marginTop: 2 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 10,
  },
  input: { flex: 1, fontSize: 13 },
  saveText: { fontWeight: "700", fontSize: 13 },
  btnRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  btn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 10, borderRadius: 12, minHeight: 42 },
  chatBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
  },
  chatText: { fontWeight: "700", fontSize: 14 },
});

