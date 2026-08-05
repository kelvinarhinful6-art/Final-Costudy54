import React, { useState, useEffect } from "react";
import { StyleSheet, StatusBar, Text } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { IconName, RootTabParamList } from "../types";
import { useTheme } from "../ThemeContext";
import HomeScreen from "./HomeScreen";
import TutorsScreen from "./TutorsScreen";
import GroupsScreen from "./GroupsScreen";
import StudyPlannerScreen from "./StudyPlannerScreen";
import ProfileScreen from "./ProfileScreen";
import * as chatActivity from "../lib/chatActivity";
import { getNotifications } from "../api";

const Tab = createBottomTabNavigator<RootTabParamList>();

const icons: Record<string, { active: IconName; inactive: IconName; label: string }> = {
  Home: { active: "home", inactive: "home-outline", label: "Home" },
  Tutors: { active: "school", inactive: "school-outline", label: "Tutors" },
  Groups: { active: "people", inactive: "people-outline", label: "Groups" },
  Planner: { active: "calendar", inactive: "calendar-outline", label: "Planner" },
  Profile: { active: "person", inactive: "person-outline", label: "Profile" },
};


export default function MainTabs() {
  const insets = useSafeAreaInsets();
  const { colors, isDarkMode } = useTheme();
  const [unreadGroups, setUnreadGroups] = useState(0);
  const [unreadNotifs, setUnreadNotifs] = useState(0);

  // Dynamic bottom padding to lift tab items rationally above screen edge
  const bottomPadding = Math.max(insets.bottom + 6, 16);
  const barHeight = 54 + bottomPadding;

  // Keep Groups badge in sync with chat activity
  useEffect(() => {
    const unsub = chatActivity.subscribe(() => {
      setUnreadGroups(chatActivity.getTotalUnread());
    });
    return unsub;
  }, []);

  // Poll for unread system notifications
  useEffect(() => {
    const fetchNotifs = async () => {
      try {
        const data = await getNotifications();
        const unread = Array.isArray(data) ? data.filter((n: any) => !n.read).length : 0;
        setUnreadNotifs(unread);
      } catch (_) {
        // ignore
      }
    };
    fetchNotifs();
    const id = setInterval(fetchNotifs, 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={colors.black} />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: isDarkMode ? colors.yellow : colors.blue,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarStyle: [
            styles.tabBar,
            {
              backgroundColor: colors.darkGray,
              borderTopColor: colors.cardBorder,
              height: barHeight,
              paddingBottom: bottomPadding,
            },
          ],
          tabBarItemStyle: styles.tabBarItem,
          tabBarIcon: ({ focused, color }) => {
            const iconConfig = icons[route.name];
            const iconName = focused ? iconConfig.active : iconConfig.inactive;
            return <Ionicons name={iconName} size={22} color={color} />;
          },
          tabBarLabel: ({ focused, color }) => {
            const label = icons[route.name]?.label || route.name;
            return (
              <Text style={[styles.tabLabel, { color: focused ? (isDarkMode ? colors.yellow : colors.blue) : colors.textMuted }]}>
                {label}
              </Text>
            );
          },
          tabBarBadge: route.name === "Groups" && unreadGroups > 0
            ? unreadGroups > 99 ? "99+" : unreadGroups
            : route.name === "Home" && unreadNotifs > 0
            ? unreadNotifs > 99 ? "99+" : unreadNotifs
            : undefined,
          tabBarBadgeStyle: styles.badgeStyle,
        })}
      >
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Tutors" component={TutorsScreen} />
        <Tab.Screen name="Groups" component={GroupsScreen} />
        <Tab.Screen name="Planner" component={StudyPlannerScreen} />
        <Tab.Screen name="Profile" component={ProfileScreen} />

      </Tab.Navigator>
    </>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    borderTopWidth: 1,
    paddingTop: 8,
    elevation: 8,
  },
  tabBarItem: {
    paddingVertical: 2,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
  },
  badgeStyle: {
    backgroundColor: "#22C55E",
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
});

