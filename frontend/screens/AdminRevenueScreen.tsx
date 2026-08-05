import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import SkyBackground from "./SkyBackground";
import { useTheme } from "../ThemeContext";
import { adminTutoringRevenue, adminProRevenue } from "../api";
import type { StackProps } from "../types";

export default function AdminRevenueScreen({ navigation }: StackProps<"AdminRevenue">) {
  const insets = useSafeAreaInsets();
  const { colors, isDarkMode } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tutoringSessions, setTutoringSessions] = useState(0);
  const [tutoringRevenue, setTutoringRevenue] = useState(0);
  const [latestCommission, setLatestCommission] = useState(0);
  const [currency, setCurrency] = useState("GHS");
  const [proTransactions, setProTransactions] = useState(0);
  const [proRevenueGhs, setProRevenueGhs] = useState(0);

  const load = useCallback(async () => {
    try {
      const [t, p] = await Promise.all([adminTutoringRevenue(), adminProRevenue()]);
      setTutoringSessions(t.sessions ?? 0);
      setTutoringRevenue(t.totalCommission ?? 0);
      setLatestCommission(t.latestCommission ?? 0);
      setCurrency(t.currency ?? "GHS");
      setProTransactions(p.transactionCount ?? 0);
      setProRevenueGhs((p.totalAmountKobo ?? 0) / 100);
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

  const total = tutoringRevenue + proRevenueGhs;

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
          <Text style={[styles.title, { color: colors.white }]}>Total App Revenue</Text>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.white} style={{ marginTop: 24 }} />
        ) : (
          <>
            {/* New Revenue Received FIRST */}
            <View style={[styles.newRevCard, { backgroundColor: "rgba(34,197,94,0.12)", borderColor: colors.green }]}>
              <View style={styles.badgeRow}>
                <Ionicons name="sparkles" size={14} color={colors.green} />
                <Text style={[styles.badgeText, { color: colors.green }]}>New Revenue Received</Text>
              </View>
              <Text style={[styles.newAmount, { color: colors.green }]}>+ {latestCommission.toFixed(2)} {currency}</Text>
              <Text style={[styles.newSub, { color: colors.textMuted }]}>Latest incoming platform commission received</Text>
            </View>

            {/* Total App Revenue */}
            <View style={[styles.heroCard, { backgroundColor: colors.darkGray, borderColor: colors.cardBorder }]}>
              <Ionicons name="trending-up" size={28} color={colors.blue} />
              <Text style={[styles.heroAmount, { color: colors.white }]}>{total.toFixed(2)} {currency}</Text>
              <Text style={[styles.label, { color: colors.textMuted }]}>Total app revenue so far</Text>
            </View>

            <Text style={[styles.sectionLabel, { color: colors.white }]}>Tutoring session revenue</Text>
            <View style={[styles.card, { backgroundColor: colors.darkGray, borderColor: colors.cardBorder }]}>
              <Text style={[styles.amount, { color: colors.white }]}>{tutoringRevenue.toFixed(2)} {currency}</Text>
              <Text style={[styles.label, { color: colors.textMuted }]}>{tutoringSessions} sessions completed (platform share)</Text>
            </View>

            <Text style={[styles.sectionLabel, { color: colors.white }]}>Pro feature revenue</Text>
            <View style={[styles.card, { backgroundColor: colors.darkGray, borderColor: colors.cardBorder }]}>
              <Text style={[styles.amount, { color: colors.white }]}>{proRevenueGhs.toFixed(2)} {currency}</Text>
              <Text style={[styles.label, { color: colors.textMuted }]}>{proTransactions} Pro subscriptions</Text>
            </View>
          </>
        )}
      </ScrollView>
    </SkyBackground>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 },
  title: { fontSize: 24, fontWeight: "700" },
  newRevCard: {
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
  heroCard: {
    borderRadius: 18,
    padding: 22,
    alignItems: "center",
    gap: 6,
    marginBottom: 20,
    borderWidth: 1,
  },
  heroAmount: { fontSize: 28, fontWeight: "700" },
  sectionLabel: { fontSize: 15, fontWeight: "700", marginBottom: 10 },
  card: {
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
    gap: 6,
    marginBottom: 16,
    borderWidth: 1,
  },
  amount: { fontSize: 22, fontWeight: "700" },
  label: { fontSize: 13 },
});

