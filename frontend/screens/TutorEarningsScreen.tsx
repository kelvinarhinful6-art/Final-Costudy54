import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import SkyBackground from "./SkyBackground";
import { useTheme } from "../ThemeContext";
import { session, tutorEarnings } from "../api";
import type { StackProps } from "../types";

export default function TutorEarningsScreen({ navigation }: StackProps<"TutorEarnings">) {
  const insets = useSafeAreaInsets();
  const { colors, isDarkMode } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [latestEarning, setLatestEarning] = useState(0);
  const [sessions, setSessions] = useState(0);
  const [currency, setCurrency] = useState("GHS");

  const load = useCallback(async () => {
    try {
      const tutorId = session.user ? session.user.userId : "";
      const data = await tutorEarnings(tutorId);
      setTotalEarnings(data.totalEarned ?? data.totalEarnings ?? 0);
      setLatestEarning(data.latestEarning ?? 0);
      setSessions(data.sessions ?? data.sessionCount ?? 0);
      setCurrency(data.currency ?? "GHS");
    } catch (e) {
      // ignore
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

  return (
    <SkyBackground>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 90 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.white} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.85}>
            <Ionicons name="chevron-back" size={26} color={colors.white} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.white }]}>My Earnings</Text>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.white} style={{ marginTop: 24 }} />
        ) : (
          <>
            {/* New Money Received FIRST */}
            <View style={[styles.newMoneyCard, { backgroundColor: "rgba(34,197,94,0.12)", borderColor: colors.green }]}>
              <View style={styles.badgeRow}>
                <Ionicons name="sparkles" size={14} color={colors.green} />
                <Text style={[styles.badgeText, { color: colors.green }]}>New Money Received</Text>
              </View>
              <Text style={[styles.newAmount, { color: colors.green }]}>+ {latestEarning.toFixed(2)} {currency}</Text>
              <Text style={[styles.newSub, { color: colors.textMuted }]}>Latest incoming payout from your recent session</Text>
            </View>

            {/* Total Earned So Far */}
            <View style={[styles.card, { backgroundColor: colors.darkGray, borderColor: colors.cardBorder }]}>
              <Ionicons name="cash-outline" size={28} color={colors.blue} />
              <Text style={[styles.amount, { color: colors.white }]}>{totalEarnings.toFixed(2)} {currency}</Text>
              <Text style={[styles.label, { color: colors.textMuted }]}>Total earned so far</Text>
            </View>

            {/* Completed Sessions */}
            <View style={[styles.card, { backgroundColor: colors.darkGray, borderColor: colors.cardBorder }]}>
              <Ionicons name="school-outline" size={26} color={colors.blue} />
              <Text style={[styles.amount, { color: colors.white }]}>{sessions}</Text>
              <Text style={[styles.label, { color: colors.textMuted }]}>Tutoring sessions completed</Text>
            </View>

            <Text style={[styles.note, { color: colors.textMuted }]}>
              You earn 50% of each session fee. New income is updated right after each session completes.
            </Text>
          </>
        )}
      </ScrollView>
    </SkyBackground>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 },
  title: { fontSize: 24, fontWeight: "700" },
  newMoneyCard: {
    borderRadius: 20,
    padding: 22,
    alignItems: "center",
    gap: 6,
    marginBottom: 16,
    borderWidth: 1.5,
  },
  badgeRow: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(34,197,94,0.15)", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 12, fontWeight: "700" },
  newAmount: { fontSize: 32, fontWeight: "800", marginVertical: 4 },
  newSub: { fontSize: 12, textAlign: "center" },
  card: {
    borderRadius: 18,
    padding: 20,
    alignItems: "center",
    gap: 6,
    marginBottom: 14,
    borderWidth: 1,
  },
  amount: { fontSize: 26, fontWeight: "700" },
  label: { fontSize: 13 },
  note: { fontSize: 12, textAlign: "center", marginTop: 8, lineHeight: 18 },
});

