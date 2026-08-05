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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import SkyBackground from "./SkyBackground";
import { useTheme } from "../ThemeContext";
import { session, myBookings, tutorReviews } from "../api";
import type { Booking, Review } from "../types";

export default function MySessionsScreen({ navigation }: { navigation: any }) {
  const insets = useSafeAreaInsets();
  const { colors, isDarkMode } = useTheme();
  const me = (session.user ?? ({} as any)) as any;
  const [sessions, setSessions] = useState<Booking[]>([]);
  const [reviews, setReviews] = useState<Record<string, Review>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await myBookings();
      const list = Array.isArray(data) ? data : [];
      setSessions(list);

      const reviewed: Record<string, Review> = {};
      await Promise.all(
        list
          .filter((s: Booking) => (s.status || "").toUpperCase() === "COMPLETED" && s.tutorId)
          .map(async (s: Booking) => {
            try {
              const rs: Review[] = await tutorReviews(s.tutorId as string);
              const mine = (Array.isArray(rs) ? rs : []).find(
                (r) => r.bookingId === s.bookingId && r.studentId === me.userId
              );
              if (mine) reviewed[s.bookingId] = mine;
            } catch (e) {}
          })
      );
      setReviews(reviewed);
    } catch (e) {
      Alert.alert("Could not load sessions", (e as Error).message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [me.userId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const openReview = (s: Booking) => {
    navigation.navigate("Review", { bookingId: s.bookingId, tutorId: s.tutorId ?? "", tutorName: s.tutorId });
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
          <Text style={[styles.title, { color: colors.white }]}>My Sessions</Text>
        </View>
        <Text style={[styles.sub, { color: colors.textMuted }]}>Track all your booked study and tutoring sessions.</Text>

        {loading ? (
          <ActivityIndicator color={colors.white} style={{ marginTop: 24 }} />
        ) : sessions.length === 0 ? (
          <View style={[styles.empty, { backgroundColor: colors.darkGray, borderColor: colors.cardBorder }]}>
            <Ionicons name="calendar-outline" size={32} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>No tutoring sessions booked yet.</Text>
          </View>
        ) : (
          sessions.map((s) => {
            const completed = (s.status || "").toUpperCase() === "COMPLETED";
            const existing = reviews[s.bookingId];
            return (
              <View key={s.bookingId} style={[styles.card, { backgroundColor: colors.darkGray, borderColor: colors.cardBorder }]}>
                <View style={styles.cardTop}>
                  <View style={[styles.sessionIconBox, { backgroundColor: colors.surfaceHover }]}>
                    <Ionicons name="school" size={20} color={colors.green} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.course, { color: colors.white }]}>{s.courseId || "Tutoring Session"}</Text>
                    <Text style={[styles.meta, { color: colors.textMuted }]}>
                      {s.hours || 1} Hour(s) • {s.grossAmount ? `GH₵ ${s.grossAmount}` : "Paid"}
                    </Text>
                  </View>
                  <View style={[styles.statusPill, { backgroundColor: "rgba(34,197,94,0.15)" }]}>
                    <Text style={[styles.statusText, { color: colors.green }]}>{s.status || "CONFIRMED"}</Text>
                  </View>
                </View>

                {completed &&
                  (existing ? (
                    <View style={styles.reviewedRow}>
                      <Ionicons name="checkmark-circle" size={16} color={colors.green} />
                      <Text style={[styles.reviewedText, { color: colors.green }]}>
                        Rated {existing.rating}/5{existing.comment ? ` — “${existing.comment}”` : ""}
                      </Text>
                    </View>
                  ) : (
                    <TouchableOpacity style={[styles.reviewBtn, { backgroundColor: colors.surfaceHover }]} onPress={() => openReview(s)} activeOpacity={0.85}>
                      <Ionicons name="star-outline" size={16} color={colors.yellow} />
                      <Text style={[styles.reviewText, { color: colors.yellow }]}>Leave a Review</Text>
                    </TouchableOpacity>
                  ))}
              </View>
            );
          })
        )}
      </ScrollView>
    </SkyBackground>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 },
  title: { fontSize: 24, fontWeight: "700" },
  sub: { fontSize: 13, marginBottom: 20 },
  empty: {
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
  },
  emptyText: { fontSize: 14 },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  sessionIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  course: { fontSize: 16, fontWeight: "700" },
  meta: { fontSize: 12, marginTop: 2 },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: { fontSize: 11, fontWeight: "700" },
  reviewedRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12 },
  reviewedText: { fontSize: 13 },
  reviewBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 12,
  },
  reviewText: { fontWeight: "700", fontSize: 13 },
});

