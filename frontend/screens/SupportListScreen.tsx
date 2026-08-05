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
import { getSupportAccounts, getSupportConversations, session, userName } from "../api";
import type { StackProps, User } from "../types";

interface SupportConversation {
  roomKey: string;
  userId: string;
  displayName: string | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
}

export default function SupportListScreen({ navigation }: StackProps<"SupportList">) {
  const insets = useSafeAreaInsets();
  const { colors, isDarkMode } = useTheme();
  const me = session.user as User;
  const isAdmin = me?.userType === "ADMIN";

  const [supportAccounts, setSupportAccounts] = useState<User[]>([]);
  const [conversations, setConversations] = useState<SupportConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      if (isAdmin) {
        const data = await getSupportConversations(me.userId);
        setConversations(Array.isArray(data) ? data : []);
      } else {
        const data = await getSupportAccounts();
        setSupportAccounts(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      Alert.alert("Support Notice", "Could not load support data. " + (e as Error).message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAdmin, me?.userId]);

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
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 60 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.white} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.85}>
            <Ionicons name="chevron-back" size={26} color={colors.white} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.white }]}>{isAdmin ? "Support Inbox" : "CoStudy Support"}</Text>
        </View>

        <View style={[styles.bannerCard, { backgroundColor: colors.darkGray, borderColor: colors.cardBorder }]}>
          <Ionicons name={isAdmin ? "people-outline" : "headset-outline"} size={32} color={colors.blue} />
          <Text style={[styles.bannerTitle, { color: colors.white }]}>
            {isAdmin ? "User Conversations" : "We are here to help!"}
          </Text>
          <Text style={[styles.bannerSub, { color: colors.textMuted }]}>
            {isAdmin
              ? "Conversations from users who have messaged you for support."
              : "Select a support administrator below to start a 1-on-1 chat."}
          </Text>
        </View>

        <Text style={[styles.sectionLabel, { color: colors.white }]}>
          {isAdmin ? "Active Conversations" : "Available Support Agents"}
        </Text>

        {loading ? (
          <ActivityIndicator color={colors.white} style={{ marginTop: 24 }} />
        ) : isAdmin ? (
          conversations.length === 0 ? (
            <View style={[styles.empty, { backgroundColor: colors.darkGray, borderColor: colors.cardBorder }]}>
              <Ionicons name="chatbubbles-outline" size={28} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.white }]}>No user conversations yet.</Text>
              <Text style={[styles.emptySubText, { color: colors.textMuted }]}>
                When users send you support messages, they will appear here.
              </Text>
            </View>
          ) : (
            conversations.map((conv) => {
              const displayName = conv.displayName || conv.userId || "User";
              const preview = conv.lastMessage || "No messages yet";
              return (
                <TouchableOpacity
                  key={conv.roomKey}
                  activeOpacity={0.85}
                  onPress={() =>
                    navigation.navigate("SupportChat", {
                      recipientId: conv.userId,
                      recipientName: displayName,
                      roomKey: conv.roomKey,
                    })
                  }
                >
                  <View style={[styles.accountCard, { backgroundColor: colors.darkGray, borderColor: colors.cardBorder }]}>
                    <View style={[styles.avatar, { backgroundColor: colors.surfaceHover }]}>
                      <Ionicons name="person" size={20} color={colors.blue} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.accountName, { color: colors.white }]}>{displayName}</Text>
                      <Text style={[styles.previewText, { color: colors.textMuted }]} numberOfLines={1}>{preview}</Text>
                    </View>
                    <Ionicons name="chatbubble-ellipses" size={20} color={colors.blue} />
                  </View>
                </TouchableOpacity>
              );
            })
          )
        ) : (
          supportAccounts.length === 0 ? (
            <View style={[styles.empty, { backgroundColor: colors.darkGray, borderColor: colors.cardBorder }]}>
              <Ionicons name="chatbubbles-outline" size={28} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.white }]}>No support accounts currently active.</Text>
            </View>
          ) : (
            supportAccounts.map((account) => {
              const displayName = userName(account) || account.username || "Support Admin";
              const roomKey = `support.${me.userId}.${account.userId}`;
              return (
                <TouchableOpacity
                  key={account.userId}
                  activeOpacity={0.85}
                  onPress={() =>
                    navigation.navigate("SupportChat", {
                      recipientId: account.userId,
                      recipientName: displayName,
                      roomKey,
                    })
                  }
                >
                  <View style={[styles.accountCard, { backgroundColor: colors.darkGray, borderColor: colors.cardBorder }]}>
                    <View style={[styles.avatar, { backgroundColor: colors.surfaceHover }]}>
                      <Ionicons name="headset" size={20} color={colors.blue} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.accountName, { color: colors.white }]}>{displayName}</Text>
                      <Text style={[styles.accountRole, { color: colors.textMuted }]}>Official CoStudy Administrator</Text>
                    </View>
                    <Ionicons name="chatbubble-ellipses" size={20} color={colors.blue} />
                  </View>
                </TouchableOpacity>
              );
            })
          )
        )}
      </ScrollView>
    </SkyBackground>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 },
  title: { fontSize: 22, fontWeight: "700" },
  bannerCard: {
    borderRadius: 18,
    padding: 20,
    alignItems: "center",
    gap: 8,
    marginBottom: 20,
    borderWidth: 1,
  },
  bannerTitle: { fontSize: 18, fontWeight: "700" },
  bannerSub: { fontSize: 13, textAlign: "center", lineHeight: 18 },
  sectionLabel: { fontSize: 15, fontWeight: "700", marginBottom: 12 },
  empty: {
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
  },
  emptyText: { fontSize: 14, fontWeight: "700" },
  emptySubText: { fontSize: 12, textAlign: "center" },
  accountCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  accountName: { fontSize: 16, fontWeight: "700" },
  accountRole: { fontSize: 12, marginTop: 2 },
  previewText: { fontSize: 12, marginTop: 2 },
});

