import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import SkyBackground from "./SkyBackground";
import { useTheme } from "../ThemeContext";
import { session, myGroups, myBookings, getNotifications, listTutors, listUsers } from "../api";
import type { Booking, TabProps, User } from "../types";

export default function HomeScreen({ navigation }: TabProps<"Home">) {
  const insets = useSafeAreaInsets();
  const { colors, isDarkMode, toggleTheme } = useTheme();

  const user = session.user as User | null;
  const rawName = user ? user.username || user.fullName || "Kelvin" : "Kelvin";
  const displayName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
  const isAdmin = (user?.userType || "").toUpperCase() === "ADMIN";

  const [upcomingSession, setUpcomingSession] = useState<Booking | null>(null);
  const [tutorUser, setTutorUser] = useState<User | null>(null);
  const [recommendedTutor, setRecommendedTutor] = useState<{ id: string; name: string; course: string; rating: string; rate: string } | null>(null);
  const [unreadNotifs, setUnreadNotifs] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      Promise.all([
        myBookings().catch(() => []),
        getNotifications().catch(() => []),
        listTutors("").catch(() => []),
        listUsers().catch(() => []),
      ]).then(([bookingsData, notifsData, tutorsData, usersData]) => {
        if (!active) return;

        // Unread notifications count
        const notifList = Array.isArray(notifsData) ? notifsData : [];
        setUnreadNotifs(notifList.filter((x: any) => !x.read).length);

        // Upcoming Session
        const bList: Booking[] = Array.isArray(bookingsData) ? bookingsData : [];
        const activeBooking = bList.find(
          (b) => b.status === "CONFIRMED" || b.status === "APPROVED" || b.status === "PENDING_PAYMENT"
        ) || bList[0] || null;
        setUpcomingSession(activeBooking);

        const userMap: Record<string, User> = {};
        (Array.isArray(usersData) ? usersData : []).forEach((u: User) => {
          userMap[u.userId] = u;
        });

        if (activeBooking && activeBooking.tutorId && userMap[activeBooking.tutorId]) {
          setTutorUser(userMap[activeBooking.tutorId]);
        }

        // Recommended Tutor
        const tIds = Array.isArray(tutorsData) ? tutorsData : [];
        const meId = session.user ? session.user.userId : null;
        const validTutorId = tIds.find((id: string) => id !== meId) || tIds[0];

        if (validTutorId && userMap[validTutorId]) {
          const u = userMap[validTutorId];
          setRecommendedTutor({
            id: validTutorId,
            name: u.tutorDisplayName || u.fullName || u.username || "Adjoa Mensah",
            course: u.program || "Physics",
            rating: "4.9 ★",
            rate: "GH₵ 50/hr",
          });
        } else {
          setRecommendedTutor({
            id: "tutor_demo",
            name: "Adjoa Mensah",
            course: "Physics",
            rating: "4.9 ★",
            rate: "GH₵ 50/hr",
          });
        }
      });

      return () => {
        active = false;
      };
    }, [])
  );

  return (
    <SkyBackground>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 90 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.greeting, { color: colors.white }]}>Hello, {displayName} 👋</Text>
            <Text style={[styles.subGreeting, { color: colors.textMuted }]}>What do you want to learn today?</Text>
          </View>
          
          <View style={styles.topActionsRow}>
            {/* Light/Dark Mode Toggle Button */}
            <TouchableOpacity
              style={[styles.headerIconBtn, { backgroundColor: colors.darkGray, borderColor: colors.cardBorder }]}
              onPress={toggleTheme}
              activeOpacity={0.8}
            >
              <Ionicons
                name={isDarkMode ? "sunny" : "moon"}
                size={20}
                color={isDarkMode ? colors.yellow : colors.blue}
              />
            </TouchableOpacity>

            {/* Notifications Bell Button */}
            <TouchableOpacity
              style={[styles.headerIconBtn, { backgroundColor: colors.darkGray, borderColor: colors.cardBorder }]}
              onPress={() => navigation.navigate("Notifications")}
              activeOpacity={0.8}
            >
              <Ionicons name="notifications-outline" size={20} color={colors.white} />
              {unreadNotifs > 0 && <View style={styles.bellDot} />}
            </TouchableOpacity>
          </View>
        </View>

        {/* Admin Dashboard Banner (For Admin Users Only) */}
        {isAdmin && (
          <TouchableOpacity
            style={[styles.adminBanner, { backgroundColor: colors.darkGray, borderColor: colors.yellow }]}
            activeOpacity={0.85}
            onPress={() => navigation.navigate("AdminDashboard")}
          >
            <View style={styles.adminBannerLeft}>
              <View style={[styles.adminIconBox, { backgroundColor: "rgba(255, 214, 0, 0.15)" }]}>
                <Ionicons name="shield-checkmark" size={24} color={colors.yellow} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.adminBannerTitle, { color: colors.white }]}>Admin Dashboard</Text>
                <Text style={[styles.adminBannerSub, { color: colors.textMuted }]}>
                  Manage platform users, vetting & payouts
                </Text>
              </View>
            </View>
            <View style={[styles.adminBadge, { backgroundColor: colors.yellow }]}>
              <Text style={styles.adminBadgeText}>Manage</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Resources Card Section */}
        <TouchableOpacity
          style={[styles.resourcesCard, { backgroundColor: colors.red }]}
          activeOpacity={0.88}
          onPress={() => navigation.navigate("StudyPlanner")}
        >
          <View style={styles.resourcesLeft}>
            <View style={styles.resourcesIconWrap}>
              <Ionicons name="book" size={24} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.resourcesTitle}>Study Resources & Planner</Text>
              <Text style={styles.resourcesSub}>Access course materials, guides & schedules</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Upcoming Sessions Section */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.white }]}>Upcoming Sessions</Text>
          <TouchableOpacity onPress={() => navigation.navigate("Tutors")}>
            <Text style={[styles.seeAllText, { color: colors.blue }]}>See all</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.contextCard, { backgroundColor: colors.darkGray, borderColor: colors.cardBorder }]}>
          <View style={styles.sessionLeft}>
            <View style={[styles.tutorAvatarCircle, { backgroundColor: colors.surfaceHover }]}>
              <Ionicons name="person" size={20} color={colors.white} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sessionName, { color: colors.white }]}>
                {upcomingSession
                  ? `${upcomingSession.courseId || "Session"} with ${tutorUser ? tutorUser.tutorDisplayName || tutorUser.username : "Tutor"}`
                  : "Physics with Adjoa"}
              </Text>
              <Text style={[styles.sessionTime, { color: colors.textMuted }]}>Today • 6:00 PM</Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.joinButton, { backgroundColor: colors.green }]}
            activeOpacity={0.85}
            onPress={() => {
              if (upcomingSession) {
                navigation.navigate("SessionChat", {
                  bookingId: upcomingSession.bookingId,
                  title: "Session: " + (upcomingSession.courseId || "Tutor"),
                });
              } else {
                navigation.navigate("Tutors");
              }
            }}
          >
            <Text style={styles.joinButtonText}>Join</Text>
          </TouchableOpacity>
        </View>

        {/* Recommended Tutors Section */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.white }]}>Recommended Tutors</Text>
          <TouchableOpacity onPress={() => navigation.navigate("Tutors")}>
            <Text style={[styles.seeAllText, { color: colors.blue }]}>See all</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.contextCard, { backgroundColor: colors.darkGray, borderColor: colors.cardBorder }]}>
          <View style={styles.tutorLeft}>
            <View style={[styles.tutorAvatarSquare, { backgroundColor: colors.surfaceHover }]}>
              <Ionicons name="school" size={22} color={colors.yellow} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.tutorName, { color: colors.white }]}>{recommendedTutor?.name || "Adjoa Mensah"}</Text>
              <View style={styles.ratingRow}>
                <Text style={[styles.tutorCourse, { color: colors.textMuted }]}>{recommendedTutor?.course || "Physics"}</Text>
                <Text style={[styles.bulletDivider, { color: colors.textMuted }]}>•</Text>
                <Ionicons name="star" size={13} color={colors.yellow} />
                <Text style={[styles.ratingText, { color: colors.white }]}>{recommendedTutor?.rating || "4.9 ★"}</Text>
              </View>
              <Text style={[styles.rateTag, { color: colors.yellow }]}>{recommendedTutor?.rate || "GH₵ 50/hr"}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.viewProfileBtn, { backgroundColor: colors.blue }]}
            activeOpacity={0.85}
            onPress={() => navigation.navigate("Tutors")}
          >
            <Text style={styles.viewProfileText}>View Profile</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SkyBackground>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  greeting: {
    fontSize: 22,
    fontWeight: "700",
  },
  subGreeting: {
    fontSize: 13,
    marginTop: 3,
  },
  topActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerIconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  bellDot: {
    position: "absolute",
    top: 9,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#22C55E",
  },
  adminBanner: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    elevation: 2,
  },
  adminBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  adminIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  adminBannerTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  adminBannerSub: {
    fontSize: 12,
    marginTop: 2,
  },
  adminBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  adminBadgeText: {
    color: "#000000",
    fontWeight: "800",
    fontSize: 12,
  },
  resourcesCard: {
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
    elevation: 3,
  },
  resourcesLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flex: 1,
  },
  resourcesIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  resourcesTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  resourcesSub: {
    color: "rgba(255, 255, 255, 0.85)",
    fontSize: 12,
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: "600",
  },
  contextCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  sessionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  tutorAvatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  sessionName: {
    fontSize: 15,
    fontWeight: "600",
  },
  sessionTime: {
    fontSize: 12,
    marginTop: 3,
  },
  joinButton: {
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  joinButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },
  tutorLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  tutorAvatarSquare: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  tutorName: {
    fontSize: 15,
    fontWeight: "600",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  tutorCourse: {
    fontSize: 12,
  },
  bulletDivider: {
    fontSize: 12,
    marginHorizontal: 2,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: "600",
  },
  rateTag: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: 3,
  },
  viewProfileBtn: {
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  viewProfileText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 13,
  },
});

