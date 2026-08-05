import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import SkyBackground from "./SkyBackground";
import { useTheme } from "../ThemeContext";
import { createReview, updateReview } from "../api";
import type { StackProps } from "../types";

export default function ReviewScreen({ route, navigation }: StackProps<"Review">) {
  const insets = useSafeAreaInsets();
  const { colors, isDarkMode } = useTheme();
  const { bookingId, tutorName, existingReviewId, initialRating, initialComment } = route.params;
  const [rating, setRating] = useState(initialRating || 0);
  const [comment, setComment] = useState(initialComment || "");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (rating < 1) {
      Alert.alert("Rate the session", "Please tap a star to rate your tutor.");
      return;
    }
    const trimmed = comment.trim();
    if (trimmed.length > 0 && trimmed.length < 5) {
      Alert.alert("Review too short", "Please enter at least 5 characters for your review.");
      return;
    }
    if (trimmed.length > 500) {
      Alert.alert("Review too long", "Review comment cannot exceed 500 characters.");
      return;
    }

    setSubmitting(true);
    try {
      if (existingReviewId) {
        await updateReview(existingReviewId, rating, trimmed);
        Alert.alert("Updated! 🎉", "Your review has been updated successfully.");
      } else {
        await createReview(bookingId, rating, trimmed);
        Alert.alert("Thanks! 🎉", "Your review was submitted successfully.");
      }
      if (navigation.canGoBack()) navigation.goBack();
    } catch (e) {
      Alert.alert("Could not save review", (e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

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
          <Text style={[styles.title, { color: colors.white }]}>Rate your tutor</Text>
        </View>
        <Text style={[styles.sub, { color: colors.textMuted }]}>
          {tutorName ? `How was your session with ${tutorName}?` : "How was your session?"}
        </Text>

        <View style={[styles.card, { backgroundColor: colors.darkGray, borderColor: colors.cardBorder }]}>
          <Text style={[styles.cardLabel, { color: colors.white }]}>Your rating (1 to 5 stars)</Text>
          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map((n) => (
              <TouchableOpacity key={n} onPress={() => setRating(n)} activeOpacity={0.7}>
                <Ionicons
                  name={n <= rating ? "star" : "star-outline"}
                  size={40}
                  color={n <= rating ? colors.yellow : colors.textMuted}
                />
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.labelRow}>
            <Text style={[styles.cardLabel, { color: colors.white }]}>Your review</Text>
            <Text style={[styles.charCount, { color: colors.textMuted }]}>{comment.length}/500</Text>
          </View>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surfaceHover, borderColor: colors.cardBorder, color: colors.white }]}
            placeholder="Share your experience (min 5 characters)"
            placeholderTextColor={colors.textMuted}
            value={comment}
            onChangeText={setComment}
            maxLength={500}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.blue }]}
            onPress={submit}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.btnText}>Submit Review</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SkyBackground>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  title: { fontSize: 22, fontWeight: "700" },
  sub: { fontSize: 13, marginBottom: 18 },
  card: {
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
  },
  cardLabel: { fontSize: 14, fontWeight: "700", marginBottom: 10, marginTop: 6 },
  labelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  charCount: { fontSize: 12 },
  stars: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    minHeight: 96,
    marginBottom: 16,
  },
  btn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    minHeight: 48,
    justifyContent: "center",
  },
  btnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 15 },
});

