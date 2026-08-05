import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import SkyBackground from "./SkyBackground";
import { useTheme } from "../ThemeContext";
import { logStudySession, getStudySessions } from "../api";
import type { StackProps, StudySession } from "../types";

export default function StudyTimerScreen({ navigation }: StackProps<"StudyTimer">) {
  const insets = useSafeAreaInsets();
  const { colors, isDarkMode } = useTheme();
  const [mode, setMode] = useState<"focus" | "break">("focus");
  const [duration, setDuration] = useState(25);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [subject, setSubject] = useState("");
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const endTimeRef = useRef<number | null>(null);

  const loadStats = useCallback(async () => {
    try {
      const data = await getStudySessions();
      setSessions(Array.isArray(data) ? data : []);
    } catch (e) {
      // ignore
    } finally {
      setLoadingStats(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [loadStats])
  );

  useEffect(() => {
    if (isActive) {
      if (!endTimeRef.current) {
        endTimeRef.current = Date.now() + timeLeft * 1000;
      }
      intervalRef.current = setInterval(() => {
        const remaining = Math.max(0, Math.ceil((endTimeRef.current! - Date.now()) / 1000));
        setTimeLeft(remaining);
        if (remaining <= 0) {
          setIsActive(false);
          endTimeRef.current = null;
          if (intervalRef.current) clearInterval(intervalRef.current);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

          if (mode === "focus") {
            Alert.alert("Focus Session Complete! 🎉", "Great job! Time for a well-deserved break.");
            logSession(duration);
            setMode("break");
            setDuration(5);
            setTimeLeft(5 * 60);
          } else {
            Alert.alert("Break Over! ⏰", "Ready for another focus session?");
            setMode("focus");
            setDuration(25);
            setTimeLeft(25 * 60);
          }
        }
      }, 500);
    } else {
      endTimeRef.current = null;
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isActive, mode, duration]);

  const logSession = async (minutes: number) => {
    if (minutes > 0) {
      try {
        await logStudySession(subject.trim() || "General", minutes);
        await loadStats();
      } catch (e) {
        console.log("Failed to log session", (e as Error).message);
      }
    }
  };

  const toggleTimer = () => {
    if (!isActive && mode === "focus" && timeLeft === duration * 60 && !subject.trim()) {
      Alert.alert("Enter Subject", "Please enter the subject you are studying to track it.");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!isActive) {
      endTimeRef.current = Date.now() + timeLeft * 1000;
    } else {
      endTimeRef.current = null;
    }
    setIsActive(!isActive);
  };

  const stopTimer = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsActive(false);
    endTimeRef.current = null;
    if (mode === "focus" && timeLeft < duration * 60) {
      const elapsedSecs = duration * 60 - timeLeft;
      const elapsedMins = Math.max(1, Math.round(elapsedSecs / 60));
      Alert.alert(
        "Stop Study Session",
        `Save completed ${elapsedMins} minute session for ${subject.trim() || "General"}?`,
        [
          { text: "Discard", style: "cancel", onPress: () => resetTimer() },
          {
            text: "Save Session",
            onPress: () => {
              logSession(elapsedMins);
              resetTimer();
            },
          },
        ]
      );
    } else {
      resetTimer();
    }
  };

  const changeDuration = (mins: number) => {
    if (isActive) return;
    Haptics.selectionAsync();
    setDuration(mins);
    setTimeLeft(mins * 60);
  };

  const resetTimer = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsActive(false);
    endTimeRef.current = null;
    setTimeLeft(duration * 60);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const progress = timeLeft / (duration * 60);

  const totalMinsToday = sessions
    .filter((s) => new Date(s.sessionDate || "").toDateString() === new Date().toDateString())
    .reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
  const hoursToday = Math.floor(totalMinsToday / 60);
  const minsToday = totalMinsToday % 60;
  const sessionsToday = sessions.filter(
    (s) => new Date(s.sessionDate || "").toDateString() === new Date().toDateString()
  ).length;

  return (
    <SkyBackground>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.85}>
            <Ionicons name="chevron-back" size={26} color={colors.white} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.white }]}>Study Timer</Text>
        </View>

        <View style={[styles.modeToggle, { backgroundColor: colors.surfaceHover }]}>
          <TouchableOpacity
            style={[styles.modeBtn, mode === "focus" && { backgroundColor: colors.blue }]}
            onPress={() => {
              if (!isActive) {
                setMode("focus");
                setDuration(25);
                setTimeLeft(25 * 60);
              }
            }}
          >
            <Text style={[styles.modeBtnText, { color: colors.textMuted }, mode === "focus" && { color: "#FFFFFF", fontWeight: "700" }]}>Focus Mode</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, mode === "break" && { backgroundColor: colors.green }]}
            onPress={() => {
              if (!isActive) {
                setMode("break");
                setDuration(5);
                setTimeLeft(5 * 60);
              }
            }}
          >
            <Text style={[styles.modeBtnText, { color: colors.textMuted }, mode === "break" && { color: "#FFFFFF", fontWeight: "700" }]}>Break Time</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.timerCard, { backgroundColor: colors.darkGray, borderColor: colors.cardBorder }]}>
          <Text style={[styles.modeLabel, { color: colors.textMuted }]}>{mode === "focus" ? "🎯 Deep Focus" : "☕ Short Break"}</Text>

          <Text style={[styles.timerText, { color: colors.white }]}>{formatTime(timeLeft)}</Text>

          <View style={[styles.progressTrack, { backgroundColor: colors.surfaceHover }]}>
            <View
              style={[
                styles.progressBar,
                { width: `${progress * 100}%`, backgroundColor: mode === "focus" ? colors.blue : colors.green },
              ]}
            />
          </View>

          {mode === "focus" && (
            <TextInput
              style={[styles.subjectInput, { backgroundColor: colors.surfaceHover, borderColor: colors.cardBorder, color: colors.white }]}
              placeholder="What subject are you studying?"
              placeholderTextColor={colors.textMuted}
              value={subject}
              onChangeText={setSubject}
            />
          )}

          {!isActive && (
            <View style={styles.durationRow}>
              {[15, 25, 45, 60].map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[
                    styles.durationChip,
                    { backgroundColor: colors.surfaceHover, borderColor: colors.cardBorder },
                    duration === m && { backgroundColor: colors.blue, borderColor: colors.blue },
                  ]}
                  onPress={() => changeDuration(m)}
                >
                  <Text style={[styles.durationText, { color: colors.textMuted }, duration === m && { color: "#FFFFFF", fontWeight: "700" }]}>{m}m</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={styles.controlsRow}>
            <TouchableOpacity style={styles.controlBtn} onPress={toggleTimer}>
              <Ionicons name={isActive ? "pause-circle" : "play-circle"} size={64} color={colors.blue} />
            </TouchableOpacity>
            {isActive && (
              <TouchableOpacity style={styles.controlBtn} onPress={stopTimer}>
                <Ionicons name="stop-circle" size={54} color={colors.red} />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.controlBtn} onPress={resetTimer}>
              <Ionicons name="refresh-circle" size={44} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={[styles.statsTitle, { color: colors.white }]}>Daily Statistics</Text>
        {loadingStats ? (
          <ActivityIndicator color={colors.white} style={{ marginTop: 16 }} />
        ) : (
          <View style={styles.statsRow}>
            <View style={[styles.statsCard, { backgroundColor: colors.darkGray, borderColor: colors.cardBorder }]}>
              <Ionicons name="time-outline" size={24} color={colors.blue} />
              <Text style={[styles.statsText, { color: colors.white }]}>{hoursToday > 0 ? `${hoursToday}h ` : ""}{minsToday}m</Text>
              <Text style={[styles.statsSub, { color: colors.textMuted }]}>Studied Today</Text>
            </View>
            <View style={[styles.statsCard, { backgroundColor: colors.darkGray, borderColor: colors.cardBorder }]}>
              <Ionicons name="checkmark-done-outline" size={24} color={colors.green} />
              <Text style={[styles.statsText, { color: colors.white }]}>{sessionsToday}</Text>
              <Text style={[styles.statsSub, { color: colors.textMuted }]}>Sessions Today</Text>
            </View>
          </View>
        )}

        <Text style={[styles.statsTitle, { color: colors.white, marginTop: 24 }]}>Study Session History</Text>
        {sessions.length === 0 ? (
          <View style={[styles.historyEmpty, { backgroundColor: colors.darkGray, borderColor: colors.cardBorder }]}>
            <Ionicons name="journal-outline" size={24} color={colors.textMuted} />
            <Text style={[styles.historyEmptyText, { color: colors.textMuted }]}>No sessions recorded yet. Start a focus session above!</Text>
          </View>
        ) : (
          sessions.slice(0, 5).map((s, idx) => {
            const dateStr = s.sessionDate ? new Date(s.sessionDate).toLocaleDateString() : "Recent";
            return (
              <View key={s.sessionId || idx} style={[styles.historyCard, { backgroundColor: colors.darkGray, borderColor: colors.cardBorder }]}>
                <View style={styles.historyLeft}>
                  <Ionicons name="book-outline" size={18} color={colors.blue} />
                  <Text style={[styles.historySubject, { color: colors.white }]}>{s.subject || "General Study"}</Text>
                </View>
                <View style={styles.historyRight}>
                  <Text style={[styles.historyDuration, { color: colors.green }]}>{s.durationMinutes} mins</Text>
                  <Text style={[styles.historyDate, { color: colors.textMuted }]}>{dateStr}</Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </SkyBackground>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 20 },
  title: { fontSize: 22, fontWeight: "700" },
  modeToggle: { flexDirection: "row", borderRadius: 12, padding: 4, marginBottom: 20 },
  modeBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center" },
  modeBtnText: { fontWeight: "600", fontSize: 14 },
  timerCard: {
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    marginBottom: 24,
  },
  modeLabel: { fontSize: 14, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1, marginBottom: 16 },
  timerText: { fontSize: 64, fontWeight: "700", fontVariant: ["tabular-nums"], marginBottom: 20 },
  progressTrack: { width: "100%", height: 8, borderRadius: 4, overflow: "hidden", marginBottom: 24 },
  progressBar: { height: "100%", borderRadius: 4 },
  subjectInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    width: "100%",
    textAlign: "center",
    marginBottom: 20,
  },
  durationRow: { flexDirection: "row", justifyContent: "center", gap: 8, marginBottom: 20 },
  durationChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
  },
  durationText: { fontWeight: "600", fontSize: 14 },
  controlsRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 16 },
  controlBtn: { padding: 4 },
  statsTitle: { fontSize: 16, fontWeight: "700", marginBottom: 12 },
  statsRow: { flexDirection: "row", gap: 12 },
  statsCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    gap: 4,
  },
  statsText: { fontSize: 20, fontWeight: "700" },
  statsSub: { fontSize: 12 },
  historyEmpty: {
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    gap: 8,
  },
  historyEmptyText: { fontSize: 13, textAlign: "center" },
  historyCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  historyLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  historySubject: { fontSize: 14, fontWeight: "600" },
  historyRight: { alignItems: "flex-end" },
  historyDuration: { fontSize: 13, fontWeight: "700" },
  historyDate: { fontSize: 11 },
});

