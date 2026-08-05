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
import { getAnalytics } from "../api";
import type { AnalyticsResponse, DayBucket, StackProps } from "../types";

const RANGES = [7, 14, 30];

export default function AnalyticsScreen({ navigation }: StackProps<"Analytics">) {
  const insets = useSafeAreaInsets();
  const { colors, isDarkMode } = useTheme();
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await getAnalytics(days);
      setData(d);
    } catch (e) {
      Alert.alert("Could not load analytics", (e as Error).message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [days]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const maxMinutes = data ? Math.max(60, ...data.byDay.map((d) => d.minutes)) : 60;
  const totalHrs = data ? (data.totalMinutes / 60).toFixed(1) : "0";
  const streak = data?.currentStreakDays ?? 0;
  const avgDuration = data?.averageSessionDuration ?? 0;
  const longest = data?.longestSessionMinutes ?? 0;

  const subjectEntries = data?.subjectBreakdown
    ? Object.entries(data.subjectBreakdown).sort((a, b) => b[1] - a[1])
    : [];

  const maxSubjectMins = subjectEntries.length > 0 ? subjectEntries[0][1] : 1;

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
          <Text style={[styles.title, { color: colors.white }]}>Analytics & Insights</Text>
        </View>
        <Text style={[styles.sub, { color: colors.textMuted }]}>Track your study habits, streaks, and performance breakdown.</Text>

        <View style={styles.rangeRow}>
          {RANGES.map((r) => (
            <TouchableOpacity
              key={r}
              style={[
                styles.rangeBtn,
                { backgroundColor: colors.surfaceHover, borderColor: colors.cardBorder },
                days === r && { backgroundColor: colors.blue, borderColor: colors.blue },
              ]}
              onPress={() => setDays(r)}
              activeOpacity={0.85}
            >
              <Text style={[styles.rangeText, { color: colors.textMuted }, days === r && { color: "#FFFFFF", fontWeight: "700" }]}>{r} Days</Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <ActivityIndicator color={colors.white} style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* Top Metrics Grid (2x2) */}
            <View style={styles.statGrid}>
              <View style={[styles.statCard, { backgroundColor: colors.darkGray, borderColor: colors.cardBorder }]}>
                <Ionicons name="time-outline" size={20} color={colors.blue} />
                <Text style={[styles.statValue, { color: colors.white }]}>{totalHrs}h</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Total Study Time</Text>
              </View>

              <View style={[styles.statCard, { backgroundColor: colors.darkGray, borderColor: colors.cardBorder }]}>
                <Ionicons name="flame-outline" size={20} color="#ff8c42" />
                <Text style={[styles.statValue, { color: colors.white }]}>{streak} {streak === 1 ? "Day" : "Days"}</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Current Streak</Text>
              </View>

              <View style={[styles.statCard, { backgroundColor: colors.darkGray, borderColor: colors.cardBorder }]}>
                <Ionicons name="speedometer-outline" size={20} color={colors.blue} />
                <Text style={[styles.statValue, { color: colors.white }]}>{avgDuration}m</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Avg Session Length</Text>
              </View>

              <View style={[styles.statCard, { backgroundColor: colors.darkGray, borderColor: colors.cardBorder }]}>
                <Ionicons name="trophy-outline" size={20} color={colors.yellow} />
                <Text style={[styles.statValue, { color: colors.white }]}>{longest}m</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Longest Session</Text>
              </View>
            </View>

            {/* Daily Minutes Bar Chart */}
            <View style={[styles.sectionCard, { backgroundColor: colors.darkGray, borderColor: colors.cardBorder }]}>
              <Text style={[styles.cardHeaderTitle, { color: colors.white }]}>Daily Study Time (Minutes)</Text>
              <View style={styles.chart}>
                {(data?.byDay ?? []).map((d: DayBucket, i: number) => {
                  const h = Math.max(6, Math.round((d.minutes / maxMinutes) * 110));
                  const dayNum = d.date.length >= 10 ? d.date.slice(8, 10) : String(i + 1);
                  return (
                    <View key={d.date} style={styles.col}>
                      <Text style={[styles.colValue, { color: colors.textMuted }]}>{d.minutes > 0 ? d.minutes : ""}</Text>
                      <View style={[styles.bar, { height: h, backgroundColor: d.minutes > 0 ? colors.blue : colors.surfaceHover }]} />
                      <Text style={[styles.colLabel, { color: colors.textMuted }]}>{dayNum}</Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Subject Breakdown Progress Bars */}
            <View style={[styles.sectionCard, { backgroundColor: colors.darkGray, borderColor: colors.cardBorder }]}>
              <Text style={[styles.cardHeaderTitle, { color: colors.white }]}>Subject Breakdown</Text>
              {subjectEntries.length === 0 ? (
                <Text style={[styles.emptySubText, { color: colors.textMuted }]}>No subject study sessions logged yet.</Text>
              ) : (
                subjectEntries.map(([subj, mins]) => {
                  const pct = Math.min(100, Math.round((mins / maxSubjectMins) * 100));
                  const hrs = (mins / 60).toFixed(1);
                  return (
                    <View key={subj} style={styles.subjectRow}>
                      <View style={styles.subjectLabelRow}>
                        <Text style={[styles.subjectName, { color: colors.white }]}>{subj}</Text>
                        <Text style={[styles.subjectMins, { color: colors.textMuted }]}>{hrs}h ({mins} mins)</Text>
                      </View>
                      <View style={[styles.subjectTrack, { backgroundColor: colors.surfaceHover }]}>
                        <View style={[styles.subjectFill, { width: `${pct}%`, backgroundColor: colors.blue }]} />
                      </View>
                    </View>
                  );
                })
              )}
            </View>

            {/* Performance Insights */}
            <View style={[styles.sectionCard, { backgroundColor: colors.darkGray, borderColor: colors.cardBorder }]}>
              <View style={styles.insightHeaderRow}>
                <Ionicons name="sparkles" size={18} color={colors.yellow} />
                <Text style={[styles.cardHeaderTitle, { color: colors.white }]}>Performance Insights</Text>
              </View>
              {(!data?.insights || data.insights.length === 0) ? (
                <Text style={[styles.emptySubText, { color: colors.textMuted }]}>Keep completing timer sessions to unlock personalized habits!</Text>
              ) : (
                data.insights.map((insight, idx) => (
                  <View key={idx} style={styles.insightRow}>
                    <Ionicons name="checkmark-circle-outline" size={18} color={colors.green} />
                    <Text style={[styles.insightText, { color: colors.white }]}>{insight}</Text>
                  </View>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SkyBackground>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  title: { fontSize: 22, fontWeight: "700" },
  sub: { fontSize: 13, marginBottom: 16 },
  rangeRow: { flexDirection: "row", gap: 8, marginBottom: 18 },
  rangeBtn: {
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 12,
    borderWidth: 1,
  },
  rangeText: { fontWeight: "600", fontSize: 13 },
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 },
  statCard: {
    width: "48%",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    gap: 4,
  },
  statValue: { fontSize: 22, fontWeight: "700" },
  statLabel: { fontSize: 12 },
  sectionCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  cardHeaderTitle: { fontSize: 15, fontWeight: "700", marginBottom: 12 },
  insightHeaderRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12 },
  chart: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: 130,
    paddingTop: 10,
  },
  col: { flex: 1, alignItems: "center", justifyContent: "flex-end", gap: 4 },
  colValue: { fontSize: 9, fontWeight: "600" },
  bar: { width: 14, borderRadius: 7 },
  colLabel: { fontSize: 10 },
  subjectRow: { marginBottom: 12 },
  subjectLabelRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  subjectName: { fontSize: 13, fontWeight: "600" },
  subjectMins: { fontSize: 12 },
  subjectTrack: { height: 8, borderRadius: 4, overflow: "hidden" },
  subjectFill: { height: "100%", borderRadius: 4 },
  emptySubText: { fontSize: 13, fontStyle: "italic" },
  insightRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  insightText: { fontSize: 13, flex: 1, lineHeight: 18 },
});

