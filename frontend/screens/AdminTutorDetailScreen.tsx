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
import { adminDashboardTutorDetail, adminMarkTutorPaid } from "../api";
import type { StackProps } from "../types";

export default function AdminTutorDetailScreen({ route, navigation }: StackProps<"AdminTutorDetail">) {
  const insets = useSafeAreaInsets();
  const { colors, isDarkMode } = useTheme();
  const { tutorId, tutorName } = route.params;

  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [paying, setPaying] = useState(false);

  const loadDetail = useCallback(async () => {
    try {
      const data = await adminDashboardTutorDetail(tutorId);
      setDetail(data);
    } catch (e) {
      Alert.alert("Error", "Could not fetch tutor details. " + (e as Error).message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tutorId]);

  useFocusEffect(
    useCallback(() => {
      loadDetail();
    }, [loadDetail])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadDetail();
  };

  const handleMarkPaid = () => {
    const date = new Date();
    const monthName = date.toLocaleString("default", { month: "long" });
    const year = date.getFullYear();
    const periodLabel = `${monthName} ${year}`;
    const amountStr = (detail?.unpaidBalance || 0).toFixed(2);

    Alert.alert(
      "Confirm Payout Record",
      `Record a payout of GH₵${amountStr} for ${tutorName || tutorId} (${periodLabel})?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Mark as Paid",
          onPress: async () => {
            setPaying(true);
            try {
              const updated = await adminMarkTutorPaid(tutorId, periodLabel);
              setDetail(updated);
              Alert.alert("Success", `Payout of GH₵${amountStr} recorded for ${periodLabel}.`);
            } catch (e) {
              Alert.alert("Payout Error", (e as Error).message);
            } finally {
              setPaying(false);
            }
          },
        },
      ]
    );
  };

  const unpaidBalance = detail?.unpaidBalance || 0;
  const hasUnpaid = unpaidBalance > 0.01;

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
          <Text style={[styles.title, { color: colors.white }]}>Tutor Payout Detail</Text>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.white} style={{ marginTop: 40 }} />
        ) : !detail ? (
          <View style={[styles.empty, { backgroundColor: colors.darkGray, borderColor: colors.cardBorder }]}>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>Tutor details unavailable.</Text>
          </View>
        ) : (
          <>
            <View style={[styles.headerCard, { backgroundColor: colors.darkGray, borderColor: colors.cardBorder }]}>
              <View style={[styles.avatar, { backgroundColor: colors.surfaceHover }]}>
                <Ionicons name="person" size={24} color={colors.blue} />
              </View>
              <Text style={[styles.tutorName, { color: colors.white }]}>{detail.tutorName || tutorName || tutorId}</Text>
              <Text style={[styles.tutorMeta, { color: colors.textMuted }]}>
                {detail.completedSessions || 0} completed session(s)
              </Text>
            </View>

            <View style={styles.gridContainer}>
              <View style={[styles.card, { backgroundColor: colors.darkGray, borderColor: colors.cardBorder }]}>
                <Text style={[styles.cardLabel, { color: colors.textMuted }]}>Total Gross Revenue</Text>
                <Text style={[styles.cardValue, { color: colors.white }]}>GH₵{(detail.totalGrossRevenue || 0).toFixed(2)}</Text>
              </View>

              <View style={[styles.card, { backgroundColor: colors.darkGray, borderColor: colors.cardBorder }]}>
                <Text style={[styles.cardLabel, { color: colors.textMuted }]}>Tutor Share (50%)</Text>
                <Text style={[styles.cardValue, { color: colors.white }]}>GH₵{(detail.totalTutorEarnings || 0).toFixed(2)}</Text>
              </View>

              <View style={[styles.card, { backgroundColor: colors.darkGray, borderColor: colors.cardBorder }]}>
                <Text style={[styles.cardLabel, { color: colors.textMuted }]}>Platform Share (50%)</Text>
                <Text style={[styles.cardValue, { color: colors.white }]}>GH₵{(detail.totalPlatformEarnings || 0).toFixed(2)}</Text>
              </View>

              <View style={[styles.card, { backgroundColor: colors.darkGray, borderColor: hasUnpaid ? colors.red : colors.cardBorder }]}>
                <Text style={[styles.cardLabel, { color: colors.textMuted }]}>Current Unpaid Balance</Text>
                <Text style={[styles.cardValue, { color: hasUnpaid ? colors.red : colors.green }]}>
                  GH₵{unpaidBalance.toFixed(2)}
                </Text>
              </View>
            </View>

            {hasUnpaid ? (
              <TouchableOpacity
                style={[styles.payBtn, { backgroundColor: colors.blue }]}
                onPress={handleMarkPaid}
                disabled={paying}
                activeOpacity={0.85}
              >
                {paying ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                    <Text style={styles.payBtnText}>Mark as Paid (Disburse GH₵{unpaidBalance.toFixed(2)})</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : (
              <View style={[styles.paidNotice, { backgroundColor: "rgba(34,197,94,0.15)", borderColor: "rgba(34,197,94,0.4)" }]}>
                <Ionicons name="checkmark-done-circle" size={20} color={colors.green} />
                <Text style={[styles.paidNoticeText, { color: colors.green }]}>All earnings for this tutor have been paid out!</Text>
              </View>
            )}

            <Text style={[styles.sectionTitle, { color: colors.white }]}>Payout History</Text>
            {(!detail.payouts || detail.payouts.length === 0) ? (
              <View style={[styles.empty, { backgroundColor: colors.darkGray, borderColor: colors.cardBorder }]}>
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>No historical payouts recorded yet.</Text>
              </View>
            ) : (
              detail.payouts.map((payout: any) => (
                <View key={payout.payoutId} style={[styles.historyCard, { backgroundColor: colors.darkGray, borderColor: colors.cardBorder }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.historyLabel, { color: colors.white }]}>{payout.periodLabel || "Monthly Payout"}</Text>
                    <Text style={[styles.historyDate, { color: colors.textMuted }]}>
                      {payout.paidAt ? new Date(payout.paidAt).toLocaleDateString() : ""}
                    </Text>
                  </View>
                  <Text style={[styles.historyAmount, { color: colors.green }]}>
                    GH₵{Number(payout.amountPaid || 0).toFixed(2)}
                  </Text>
                </View>
              ))
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
  headerCard: {
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  tutorName: { fontSize: 20, fontWeight: "700" },
  tutorMeta: { fontSize: 13, marginTop: 2 },
  gridContainer: { gap: 10, marginBottom: 20 },
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  cardLabel: { fontSize: 13 },
  cardValue: { fontSize: 20, fontWeight: "700", marginTop: 4 },
  payBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 24,
  },
  payBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  paidNotice: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    marginBottom: 24,
  },
  paidNoticeText: { fontSize: 14, fontWeight: "600" },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 12 },
  empty: {
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
  },
  emptyText: { fontSize: 14 },
  historyCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
  },
  historyLabel: { fontSize: 15, fontWeight: "600" },
  historyDate: { fontSize: 12, marginTop: 2 },
  historyAmount: { fontSize: 16, fontWeight: "700" },
});

