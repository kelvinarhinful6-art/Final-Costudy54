import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import SkyBackground from "./SkyBackground";
import { useTheme } from "../ThemeContext";
import { myGroups, createGroup, groupRecommendations, joinGroup, leaveGroup } from "../api";
import { refreshBus } from "../lib/refreshBus";
import * as chatActivity from "../lib/chatActivity";
import type { Group, TabProps } from "../types";

export default function GroupsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { colors, isDarkMode } = useTheme();
  const [groups, setGroups] = useState<Group[]>([]);
  const [recommendations, setRecommendations] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [name, setName] = useState("");
  const [course, setCourse] = useState("");
  const [creating, setCreating] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [, setActivityTick] = useState(0);

  const load = useCallback(async () => {
    try {
      const [mine, recs] = await Promise.all([
        myGroups(),
        groupRecommendations(),
      ]);
      setGroups(Array.isArray(mine) ? mine : []);
      setRecommendations(Array.isArray(recs) ? recs : []);
    } catch (e) {
      Alert.alert("Could not load groups", (e as Error).message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    const unsub = refreshBus.subscribe(() => load());
    const unsubActivity = chatActivity.subscribe(() => setActivityTick((t) => t + 1));
    return () => {
      unsub();
      unsubActivity();
    };
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const handleCreate = async () => {
    if (!name.trim() || !course.trim()) {
      Alert.alert("Missing info", "Please enter a group name and course code.");
      return;
    }
    setCreating(true);
    try {
      await createGroup(name.trim(), course.trim());
      setName("");
      setCourse("");
      await load();
      Alert.alert("Success", "Group created!");
    } catch (e) {
      Alert.alert("Could not create group", (e as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = async (group: Group) => {
    setJoiningId(group.groupId);
    try {
      await joinGroup(group.groupId);
      await load();
      Alert.alert("Group Joined! 🎉", `You are now a member of ${group.groupName}.`);
    } catch (e) {
      Alert.alert("Could not join group", (e as Error).message);
    } finally {
      setJoiningId(null);
    }
  };

  const handleLeave = (group: Group) => {
    Alert.alert(
      "Leave Group",
      `Are you sure you want to leave ${group.groupName}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: async () => {
            try {
              await leaveGroup(group.groupId);
              await load();
              Alert.alert("Left Group", `You have left ${group.groupName}.`);
            } catch (e) {
              Alert.alert("Could not leave group", (e as Error).message);
            }
          },
        },
      ]
    );
  };

  // Filter groups based on search query
  const q = searchQuery.trim().toLowerCase();

  const sortedGroups = chatActivity.sortByActivity(
    groups.filter((g, i) => groups.findIndex((x) => x.groupId === g.groupId) === i)
  ).filter(g => !q || (g.groupName || "").toLowerCase().includes(q) || (g.courseId || "").toLowerCase().includes(q));

  const filteredRecommendations = recommendations.filter(
    g => !q || (g.groupName || "").toLowerCase().includes(q) || (g.courseId || "").toLowerCase().includes(q)
  );

  return (
    <SkyBackground>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 90 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.white} />}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: colors.white }]}>Study Groups</Text>

        {/* Group Search Bar */}
        <View style={[styles.searchRow, { backgroundColor: colors.darkGray, borderColor: colors.cardBorder }]}>
          <Ionicons name="search" size={20} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.white }]}
            placeholder="Search my groups or courses..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Create Group Card */}
        <View style={[styles.card, { backgroundColor: colors.darkGray, borderColor: colors.cardBorder }]}>
          <Text style={[styles.cardTitle, { color: colors.white }]}>Create a New Group</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surfaceHover, borderColor: colors.cardBorder, color: colors.white }]}
            placeholder="Group name (e.g. Data Structures Squad)"
            placeholderTextColor={colors.textMuted}
            value={name}
            onChangeText={setName}
          />
          <TextInput
            style={[styles.input, { backgroundColor: colors.surfaceHover, borderColor: colors.cardBorder, color: colors.white }]}
            placeholder="Course code (e.g., CS101)"
            placeholderTextColor={colors.textMuted}
            value={course}
            onChangeText={setCourse}
          />
          <TouchableOpacity style={[styles.btn, { backgroundColor: colors.yellow }]} onPress={handleCreate} disabled={creating} activeOpacity={0.85}>
            {creating ? <ActivityIndicator color="#000000" /> : <Text style={styles.btnText}>Create Group</Text>}
          </TouchableOpacity>
        </View>

        {/* My Groups Section */}
        <Text style={[styles.sectionLabel, { color: colors.white }]}>My Groups</Text>
        {loading ? (
          <ActivityIndicator color={colors.white} style={{ marginVertical: 16 }} />
        ) : sortedGroups.length === 0 ? (
          <View style={[styles.empty, { backgroundColor: colors.darkGray, borderColor: colors.cardBorder }]}>
            <Ionicons name="people-outline" size={28} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              {q ? "No joined groups match your search." : "No groups joined yet. Create one or join recommended groups below!"}
            </Text>
          </View>
        ) : (
          sortedGroups.map((g) => {
            const act = chatActivity.getActivity(g.groupId);
            const unread = act.unreadCount;
            return (
              <TouchableOpacity
                key={g.groupId}
                activeOpacity={0.85}
                onPress={() => navigation.navigate("Chat", { groupId: g.groupId, groupName: g.groupName })}
              >
                <View style={[styles.groupCard, { backgroundColor: colors.darkGray, borderColor: colors.cardBorder }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.groupName, { color: colors.white }]}>{g.groupName}</Text>
                    <Text style={[styles.groupCourse, { color: colors.textMuted }]}>{g.courseId || "General Study"}</Text>
                  </View>
                  <View style={styles.rightSide}>
                    {unread > 0 && (
                      <View style={[styles.unreadBadge, { backgroundColor: colors.green }]}>
                        <Text style={styles.unreadText}>{unread > 99 ? "99+" : unread}</Text>
                      </View>
                    )}
                    <View style={styles.memberCount}>
                      <Ionicons name="people" size={14} color={colors.textMuted} />
                      <Text style={[styles.memberCountText, { color: colors.textMuted }]}>{g.memberCount ?? 1}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.leaveIconBtn}
                      onPress={() => handleLeave(g)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="log-out-outline" size={18} color={colors.red} />
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}


        {/* Recommended Groups Section */}
        <Text style={[styles.sectionLabel, { marginTop: 24, color: colors.white }]}>Recommended Study Groups</Text>
        {loading ? (
          <ActivityIndicator color={colors.white} style={{ marginVertical: 16 }} />
        ) : filteredRecommendations.length === 0 ? (
          <View style={[styles.empty, { backgroundColor: colors.darkGray, borderColor: colors.cardBorder }]}>
            <Ionicons name="sparkles-outline" size={28} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              {q ? "No recommendations match your search." : "No group recommendations right now. Check back soon!"}
            </Text>
          </View>
        ) : (
          filteredRecommendations.map((g) => {
            const score = g.matchScore ?? 88;
            return (
              <View key={g.groupId} style={[styles.recCard, { backgroundColor: colors.darkGray, borderColor: colors.cardBorder }]}>
                <View style={styles.recHeader}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.recTitleRow}>
                      <Text style={[styles.groupName, { color: colors.white }]}>{g.groupName}</Text>
                      <View style={styles.scoreBadge}>
                        <Text style={styles.scoreText}>🎯 {score}% Match</Text>
                      </View>
                    </View>
                    <Text style={[styles.groupCourse, { color: colors.textMuted }]}>Course: {g.courseId || "General"}</Text>
                    {!!g.description && <Text style={[styles.recDesc, { color: colors.textMuted }]}>{g.description}</Text>}
                  </View>
                </View>

                <View style={styles.recFooter}>
                  <View style={styles.memberCount}>
                    <Ionicons name="people" size={14} color={colors.textMuted} />
                    <Text style={[styles.memberCountText, { color: colors.textMuted }]}>{g.memberCount ?? 1} members</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.joinBtn, { backgroundColor: colors.yellow }]}
                    onPress={() => handleJoin(g)}
                    disabled={joiningId === g.groupId}
                    activeOpacity={0.8}
                  >
                    {joiningId === g.groupId ? (
                      <ActivityIndicator color="#000000" size="small" />
                    ) : (
                      <Text style={styles.joinBtnText}>Join Group</Text>
                    )}
                  </TouchableOpacity>
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
  title: { fontSize: 24, fontWeight: "700", marginBottom: 16 },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  searchInput: { flex: 1, fontSize: 14 },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    overflow: "hidden",
  },
  cardTitle: { fontSize: 16, fontWeight: "700", marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 10,
  },
  btn: { borderRadius: 10, paddingVertical: 12, alignItems: "center", marginTop: 4 },
  btnText: { color: "#000000", fontWeight: "700", fontSize: 14 },
  sectionLabel: { fontSize: 16, fontWeight: "700", marginBottom: 12 },
  empty: {
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    overflow: "hidden",
  },
  emptyText: { fontSize: 13, textAlign: "center" },
  groupCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    overflow: "hidden",
  },
  groupName: { fontSize: 16, fontWeight: "600" },
  groupCourse: { fontSize: 13, marginTop: 2 },
  rightSide: { flexDirection: "row", alignItems: "center", gap: 8 },
  unreadBadge: {
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  unreadText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  memberCount: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  memberCountText: { fontSize: 12, fontWeight: "600" },
  leaveIconBtn: { padding: 4, marginLeft: 4 },

  /* Recommendation Card Styles */
  recCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  recHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  recTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  scoreBadge: {
    backgroundColor: "rgba(34, 197, 94, 0.25)",
    borderColor: "rgba(34, 197, 94, 0.5)",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  scoreText: { color: "#22c55e", fontSize: 12, fontWeight: "700" },
  recDesc: { fontSize: 12, marginTop: 4 },
  recFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 },
  joinBtn: { borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
  joinBtnText: { color: "#000000", fontSize: 13, fontWeight: "700" },
});

