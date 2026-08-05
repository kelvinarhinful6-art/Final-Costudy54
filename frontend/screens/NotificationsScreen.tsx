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
import { getNotifications, markNotificationRead, markAllNotificationsRead } from "../api";
import type { AppNotification, StackProps } from "../types";

function iconFor(type?: string): keyof typeof Ionicons.glyphMap {
  switch (type) {
    case "PAYMENT_SUCCESS":
      return "checkmark-circle";
    case "PAYMENT_FAILED":
      return "close-circle";
    case "BOOKING_NEW":
    case "BOOKING_CONFIRMED":
      return "calendar";
    case "BOOKING_CANCELLED":
      return "calendar-outline";
    case "SESSION_STARTED":
      return "play-circle";
    case "SESSION_COMPLETED":
      return "checkmark-done-circle";
    case "APPLICATION_APPROVED":
      return "trophy";
    case "APPLICATION_DECLINED":
      return "sad-outline";
    case "PRO_ACTIVATED":
      return "star";
    case "CHAT":
      return "chatbubble";
    default:
      return "notifications";
  }
}

function getIconColor(type?: string, isRead?: boolean, isDark?: boolean): string {
  if (isRead) return isDark ? "#9CA3AF" : "#64748B";
  switch (type) {
    case "PAYMENT_SUCCESS":
    case "SESSION_STARTED":
    case "SESSION_COMPLETED":
      return "#22C55E";
    case "PAYMENT_FAILED":
    case "APPLICATION_DECLINED":
      return "#EF4444";
    case "APPLICATION_APPROVED":
    case "PRO_ACTIVATED":
      return "#EAB308";
    case "BOOKING_CANCELLED":
      return "#F97316";
    default:
      return "#2563EB";
  }
}

export default function NotificationsScreen({ navigation }: StackProps<"Notifications">) {
  const insets = useSafeAreaInsets();
  const { colors, isDarkMode } = useTheme();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getNotifications();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      Alert.alert("Could not load notifications", (e as Error).message);
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

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await markAllNotificationsRead();
      setItems((prev) => prev.map((x) => ({ ...x, read: true })));
    } catch (e) {
      Alert.alert("Notice", (e as Error).message);
    } finally {
      setMarkingAll(false);
    }
  };

  const open = async (n: AppNotification) => {
    if (!n.read) {
      try {
        await markNotificationRead(n.notificationId);
        setItems((prev) => prev.map((x) => (x.notificationId === n.notificationId ? { ...x, read: true } : x)));
      } catch (e) {
        // ignore
      }
    }
  };

  const unread = items.filter((i) => !i.read).length;

  return (
    <SkyBackground>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 90 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.white} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <Ionicons name="chevron-back" size={26} color={colors.white} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.white }]}>Notifications</Text>
          {unread > 0 && (
            <View style={[styles.badge, { backgroundColor: colors.green }]}>
              <Text style={styles.badgeText}>{unread}</Text>
            </View>
          )}

          <View style={{ flex: 1 }} />
          {unread > 0 && (
            <TouchableOpacity
              onPress={handleMarkAllRead}
              disabled={markingAll}
              style={[styles.readAllBtn, { backgroundColor: colors.darkGray, borderColor: colors.cardBorder }]}
            >
              {markingAll ? (
                <ActivityIndicator size="small" color={colors.blue} />
              ) : (
                <Text style={[styles.readAllText, { color: colors.blue }]}>Mark all read</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <ActivityIndicator color={colors.white} style={{ marginTop: 30 }} />
        ) : items.length === 0 ? (
          <View style={[styles.empty, { backgroundColor: colors.darkGray, borderColor: colors.cardBorder }]}>
            <Ionicons name="notifications-off-outline" size={32} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>You're all caught up.</Text>
          </View>
        ) : (
          items.map((n) => (
            <TouchableOpacity key={n.notificationId} onPress={() => open(n)} activeOpacity={0.85}>
              <View
                style={[
                  styles.card,
                  { backgroundColor: colors.darkGray, borderColor: colors.cardBorder },
                  !n.read && { borderColor: colors.blue, borderWidth: 1.5 },
                ]}
              >
                <Ionicons name={iconFor(n.type)} size={22} color={getIconColor(n.type, n.read, isDarkMode)} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.msg, { color: colors.white }, !n.read && { fontWeight: "700" }]}>
                    {n.message}
                  </Text>
                  {!n.read && <Text style={[styles.newTag, { color: colors.blue }]}>New</Text>}
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SkyBackground>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 20 },
  title: { fontSize: 24, fontWeight: "700" },
  badge: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 4,
  },
  badgeText: { color: "#FFFFFF", fontWeight: "700", fontSize: 12 },
  readAllBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  readAllText: { fontSize: 12, fontWeight: "700" },
  empty: {
    borderRadius: 16,
    padding: 28,
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
  },
  emptyText: { fontSize: 14 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
  },
  msg: { fontSize: 14, lineHeight: 20 },
  newTag: { fontSize: 11, fontWeight: "700", marginTop: 4 },
});
