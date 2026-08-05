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
import { myInvites, acceptInvite, declineInvite } from "../api";
import { refreshBus } from "../lib/refreshBus";
import type { Invite, StackProps } from "../types";

export default function InvitesScreen({ navigation }: StackProps<"Invites">) {
  const insets = useSafeAreaInsets();
  const { colors, isDarkMode } = useTheme();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await myInvites();
      setInvites(Array.isArray(data) ? data : []);
    } catch (e) {
      Alert.alert("Could not load invites", (e as Error).message);
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

  const act = async (inv: Invite, accept: boolean) => {
    setActingId(inv.inviteId);
    try {
      if (accept) await acceptInvite(inv.inviteId);
      else await declineInvite(inv.inviteId);
      await load();
      if (accept) refreshBus.emit();
      Alert.alert(accept ? "Joined" : "Declined", accept ? `You joined ${inv.groupName}.` : "Invite declined.");
    } catch (e) {
      Alert.alert("Action failed", (e as Error).message);
    } finally {
      setActingId(null);
    }
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
          <Text style={[styles.title, { color: colors.white }]}>Invites</Text>
        </View>
        <Text style={[styles.sub, { color: colors.textMuted }]}>Group invitations sent to you.</Text>

        {loading ? (
          <ActivityIndicator color={colors.white} style={{ marginTop: 24 }} />
        ) : invites.length === 0 ? (
          <View style={[styles.empty, { backgroundColor: colors.darkGray, borderColor: colors.cardBorder }]}>
            <Ionicons name="mail-open-outline" size={28} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>No pending invites.</Text>
          </View>
        ) : (
          invites.map((inv) => (
            <View key={inv.inviteId} style={[styles.card, { backgroundColor: colors.darkGray, borderColor: colors.cardBorder }]}>
              <View style={styles.cardTop}>
                <Ionicons name="people-circle-outline" size={32} color={colors.blue} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.group, { color: colors.white }]}>{inv.groupName}</Text>
                  <Text style={[styles.from, { color: colors.textMuted }]}>from {inv.fromUsername || inv.fromUserId}</Text>
                </View>
              </View>
              <View style={styles.btnRow}>
                <TouchableOpacity
                  style={[styles.btn, { backgroundColor: "rgba(239,68,68,0.15)", borderColor: colors.red, borderWidth: 1 }]}
                  onPress={() => act(inv, false)}
                  disabled={actingId === inv.inviteId}
                  activeOpacity={0.85}
                >
                  <Text style={{ color: colors.red, fontWeight: "700", fontSize: 14 }}>Decline</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, { backgroundColor: colors.blue }]}
                  onPress={() => act(inv, true)}
                  disabled={actingId === inv.inviteId}
                  activeOpacity={0.85}
                >
                  {actingId === inv.inviteId ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.acceptText}>Accept</Text>}
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SkyBackground>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  title: { fontSize: 22, fontWeight: "700" },
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
  cardTop: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  group: { fontSize: 16, fontWeight: "700" },
  from: { fontSize: 12, marginTop: 2 },
  btnRow: { flexDirection: "row", gap: 10 },
  btn: { flex: 1, paddingVertical: 11, borderRadius: 12, alignItems: "center", justifyContent: "center", minHeight: 44 },
  acceptText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },
});

