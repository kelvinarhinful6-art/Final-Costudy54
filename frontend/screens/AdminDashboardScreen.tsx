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
import { adminDashboardSummary, adminDashboardTutors } from "../api";
import type { StackProps } from "../types";

export default function AdminDashboardScreen({ navigation }: StackProps<"AdminDashboard">) {
  const insets = useSafeAreaInsets();
  const { colors, isDarkMode } = useTheme();
  const [summary, setSummary] = useState<any>(null);
  const [tutors, setTutors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [sumData, tutorList] = await Promise.all([
        adminDashboardSummary(),
        adminDashboardTutors(),
      ]);
      setSummary(sumData);
      setTutors(Array.isArray(tutorList) ? tutorList : []);
    } catch (e) {
      Alert.alert("Dashboard Error", "Failed to load dashboard data. " + (e as Error).message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
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
          <Text style={[styles.title, { color: colors.white }]}>Admin Dashboard</Text>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.white} style={{ marginTop: 40 }} />
        ) : (
          <>
            <Text style={[styles.sectionTitle, { color: colors.white }]}>Platform Financial Overview</Text>
            {summary && (
              <View style={styles.statsGrid}>
                <View style={[styles.statCard, { backgroundColor: colors.darkGray, borderColor: colors.cardBorder }]}>
                  <Ionicons name="people" size={20} color={colors.blue} />
                  <Text style={[styles.statVal, { color: colors.white }]}>{summary.totalTutors || 0} / {summary.totalStudents || 0}</Text>
                  <Text style={[styles.statLbl, { color: colors.textMuted }]}>Tutors / Students</Text>
                </View>

                <View style={[styles.statCard, { backgroundColor: colors.darkGray, borderColor: colors.cardBorder }]}>
                  <Ionicons name="checkmark-done-circle" size={20} color={colors.green} />
                  <Text style={[styles.statVal, { color: colors.white }]}>{summary.totalCompletedSessions || 0} / {summary.totalActiveBookings || 0}</Text>
                  <Text style={[styles.statLbl, { color: colors.textMuted }]}>Completed / Active</Text>
                </View>

                <View style={[styles.statCard, { backgroundColor: colors.darkGray, borderColor: colors.cardBorder }]}>
                  <Ionicons name="cash" size={20} color="#22C55E" />
                  <Text style={[styles.statVal, { color: colors.white }]}>GH₵{(summary.totalPlatformRevenue || 0).toFixed(2)}</Text>
                  <Text style={[styles.statLbl, { color: colors.textMuted }]}>Platform Rev (50%)</Text>
                </View>

                <View style={[styles.statCard, { backgroundColor: colors.darkGray, borderColor: colors.cardBorder }]}>
                  <Ionicons name="alert-circle" size={20} color="#EF4444" />
                  <Text style={[styles.statVal, { color: colors.white }]}>GH₵{(summary.totalTutorPayoutsPending || 0).toFixed(2)}</Text>
                  <Text style={[styles.statLbl, { color: colors.textMuted }]}>Pending Payouts</Text>
                </View>

                <View style={[styles.statCard, { backgroundColor: colors.darkGray, borderColor: colors.cardBorder }]}>
                  <Ionicons name="card" size={20} color="#EAB308" />
                  <Text style={[styles.statVal, { color: colors.white }]}>GH₵{(summary.totalTutorPayoutsCompleted || 0).toFixed(2)}</Text>
                  <Text style={[styles.statLbl, { color: colors.textMuted }]}>Completed Payouts</Text>
                </View>

                <View style={[styles.statCard, { backgroundColor: colors.darkGray, borderColor: colors.cardBorder }]}>
                  <Ionicons name="calendar-number" size={20} color={colors.blue} />
                  <Text style={[styles.statVal, { color: colors.white }]}>GH₵{(summary.monthlyPlatformEarnings || 0).toFixed(2)}</Text>
                  <Text style={[styles.statLbl, { color: colors.textMuted }]}>This Month's Rev</Text>
                </View>
              </View>
            )}

            <Text style={[styles.sectionTitle, { color: colors.white, marginTop: 24 }]}>Tutors & Monthly Payouts</Text>
            {tutors.length === 0 ? (
              <View style={[styles.empty, { backgroundColor: colors.darkGray, borderColor: colors.cardBorder }]}>
                <Ionicons name="school-outline" size={26} color={colors.textMuted} />
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>No tutor payout records found.</Text>
              </View>
            ) : (
              tutors.map((item) => {
                const isPaid = item.payoutStatus === "Paid";
                const hasUnpaid = (item.unpaidBalance || 0) > 0;
                return (
                  <TouchableOpacity
                    key={item.tutorId}
                    activeOpacity={0.85}
                    onPress={() =>
                      navigation.navigate("AdminTutorDetail", {
                        tutorId: item.tutorId,
                        tutorName: item.tutorName,
                      })
                    }
                  >
                    <View style={[styles.tutorCard, { backgroundColor: colors.darkGray, borderColor: colors.cardBorder }]}>
                      <View style={styles.tutorHeader}>
                        <View style={[styles.avatar, { backgroundColor: colors.surfaceHover }]}>
                          <Text style={[styles.avatarText, { color: colors.blue }]}>
                            {(item.tutorName || "T").charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.tutorName, { color: colors.white }]}>{item.tutorName || item.tutorId}</Text>
                          <Text style={[styles.tutorMeta, { color: colors.textMuted }]}>
                            {item.completedSessions || 0} completed session(s)
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.statusBadge,
                            { backgroundColor: isPaid ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)" },
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusBadgeText,
                              { color: isPaid ? colors.green : colors.red },
                            ]}
                          >
                            {item.payoutStatus}
                          </Text>
                        </View>
                      </View>

                      <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />

                      <View style={styles.tutorFinancials}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.finLabel, { color: colors.textMuted }]}>Total Earnings (50%)</Text>
                          <Text style={[styles.finVal, { color: colors.white }]}>GH₵{(item.totalEarnings || 0).toFixed(2)}</Text>
                        </View>
                        <View style={{ flex: 1, alignItems: "flex-end" }}>
                          <Text style={[styles.finLabel, { color: colors.textMuted }]}>Unpaid Balance</Text>
                          <Text
                            style={[
                              styles.finVal,
                              { color: hasUnpaid ? colors.red : colors.white },
                              hasUnpaid && { fontWeight: "700" },
                            ]}
                          >
                            GH₵{(item.unpaidBalance || 0).toFixed(2)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </>
        )}
      </ScrollView>
    </SkyBackground>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 20 },
  title: { fontSize: 22, fontWeight: "700" },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 12 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statCard: {
    width: "48%",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    gap: 4,
  },
  statVal: { fontSize: 16, fontWeight: "700", marginTop: 4 },
  statLbl: { fontSize: 12 },
  empty: {
    borderRadius: 16,
    padding: 22,
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
  },
  emptyText: { fontSize: 14 },
  tutorCard: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  tutorHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 18, fontWeight: "700" },
  tutorName: { fontSize: 16, fontWeight: "600" },
  tutorMeta: { fontSize: 12, marginTop: 1 },
  statusBadge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  statusBadgeText: { fontWeight: "700", fontSize: 12 },
  divider: { height: 1, marginVertical: 12 },
  tutorFinancials: { flexDirection: "row", justifyContent: "space-between" },
  finLabel: { fontSize: 12 },
  finVal: { fontSize: 14, fontWeight: "600", marginTop: 2 },
});

