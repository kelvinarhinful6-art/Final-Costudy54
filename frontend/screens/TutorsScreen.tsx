import React, { useState, useCallback, useEffect, useRef } from "react";
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
  Linking,
  AppState,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import SkyBackground from "./SkyBackground";
import { colors } from "../theme";
import { useTheme } from "../ThemeContext";

import {
  session,
  proStatus,
  proPlan,
  subscribePro,
  listTutors,
  bookTutor,
  listUsers,
  initiatePayment,
  verifyPayment,
  confirmBookingPayment,
  tutorReviews,
  deleteReview,
  updateReview,
  myBookings,
  myApplications,
} from "../api";
import type { Plan, User, TutorReviewsData, Review, TabProps, Booking, TutorApplication } from "../types";

export default function TutorsScreen({ navigation }: TabProps<"Tutors">) {
  const insets = useSafeAreaInsets();
  const { colors, isDarkMode } = useTheme();

  // Centralized Tab State
  const [mainSegment, setMainSegment] = useState<"find" | "sessions" | "portal">("find");

  const [isPro, setIsPro] = useState(false);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [checking, setChecking] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [course, setCourse] = useState("");
  const [tutors, setTutors] = useState<string[]>([]);
  const [usersById, setUsersById] = useState<Record<string, User>>({});
  const [reviewsByTutor, setReviewsByTutor] = useState<Record<string, TutorReviewsData>>({});
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Sessions and Applications data for Centralized Tutoring
  const [bookedSessions, setBookedSessions] = useState<Booking[]>([]);
  const [tutorApps, setTutorApps] = useState<TutorApplication[]>([]);
  const [myReviews, setMyReviews] = useState<Record<string, Review>>({});

  // Flow State: 0 = Hidden, 1 = Tutor Details (Screen 2), 2 = Book Session (Screen 3), 3 = Payment (Screen 4)
  const [flowStep, setFlowStep] = useState<number>(0);
  const [selectedTutorId, setSelectedTutorId] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<"about" | "availability" | "reviews">("about");

  // Booking Form Details
  const [bookSubject, setBookSubject] = useState("Physics");
  const [bookDate, setBookDate] = useState("Sun, 18 May 2025");
  const [bookTime, setBookTime] = useState("6:00 PM");
  const [bookHours, setBookHours] = useState(1);
  const [sessionType, setSessionType] = useState<"Online" | "In-Person">("Online");
  const [paymentMethod, setPaymentMethod] = useState<string>("momo");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const pendingPaymentRef = useRef<{ ref: string; type: "pro" | "booking"; bookingId?: string } | null>(null);

  const fetchTutorReviews = async (tutorIds: string[]) => {
    const map: Record<string, TutorReviewsData> = {};
    await Promise.all(
      tutorIds.map(async (tid) => {
        try {
          const res = await tutorReviews(tid);
          if (res) map[tid] = res;
        } catch (_) {}
      })
    );
    setReviewsByTutor((prev) => ({ ...prev, ...map }));
  };

  const loadStatus = useCallback(async () => {
    try {
      const [s, p, users, b, a] = await Promise.all([
        proStatus(),
        proPlan(),
        listUsers(),
        myBookings().catch(() => []),
        myApplications().catch(() => []),
      ]);
      setIsPro(!!s.active);
      setPlan(p);
      const map: Record<string, User> = {};
      (Array.isArray(users) ? users : []).forEach((u: User) => {
        map[u.userId] = u;
      });
      setUsersById(map);

      const bList = Array.isArray(b) ? b : [];
      setBookedSessions(bList);
      setTutorApps(Array.isArray(a) ? a : []);

      if (s.active) {
        try {
          const data = await listTutors("");
          const meId = session.user ? session.user.userId : null;
          const filtered = (Array.isArray(data) ? data : []).filter((id: string) => id !== meId);
          setTutors(filtered);
          setSearched(true);
          fetchTutorReviews(filtered);
        } catch (_) {}
      }
    } catch (e) {
    } finally {
      setChecking(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadStatus();
    }, [loadStatus])
  );

  useEffect(() => {
    const sub = AppState.addEventListener("change", async (nextAppState) => {
      if (nextAppState === "active" && pendingPaymentRef.current) {
        const { ref, type, bookingId: pendingBId } = pendingPaymentRef.current;
        pendingPaymentRef.current = null;
        try {
          const verifyRes = await verifyPayment(ref);
          const status = verifyRes && verifyRes.status ? String(verifyRes.status).toUpperCase() : "";
          if (status === "SUCCESS") {
            if (type === "pro") {
              await subscribePro();
              await loadStatus();
              Alert.alert("Welcome to Pro!", "Your Pro subscription is now active.");
            } else if (type === "booking" && pendingBId) {
              await confirmBookingPayment(pendingBId, ref);
              Alert.alert("Booking Confirmed!", "Your booking has been verified and confirmed.");
              setFlowStep(0);
            }
          } else {
            Alert.alert("Payment status", "Payment incomplete or abandoned. Please try again.");
          }
        } catch (err) {
          Alert.alert("Verification Notice", "Could not verify payment automatically. Check bookings.");
        }
      }
    });
    return () => sub.remove();
  }, [loadStatus]);

  const onRefresh = () => {
    setRefreshing(true);
    loadStatus();
  };

  const handleSubscribe = () => {
    const priceText = plan ? `${plan.price} ${plan.currency}` : "Subscription";
    Alert.alert(
      "Upgrade to Pro",
      `${priceText} — Unlock all premium tutoring features.\n\nContinue to checkout?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue to Payment",
          onPress: async () => {
            setSubscribing(true);
            try {
              const priceNum = plan && plan.price ? Number(plan.price) : 0;
              const amountKobo = Math.round(priceNum * 100);
              const email = (session.user && session.user.email) || "guest@costudy.com";
              const payment = await initiatePayment(amountKobo, "pro_subscription", email);
              pendingPaymentRef.current = { ref: payment.reference, type: "pro" };
              await Linking.openURL(payment.authorizationUrl);
            } catch (e) {
              pendingPaymentRef.current = null;
              Alert.alert("Upgrade failed", (e as Error).message);
            } finally {
              setSubscribing(false);
            }
          },
        },
      ]
    );
  };

  const handleSearch = async () => {
    setSearching(true);
    setSearched(true);
    try {
      const data = await listTutors(course.trim().toUpperCase());
      const meId = session.user ? session.user.userId : null;
      const filtered = (Array.isArray(data) ? data : []).filter((tutorId: string) => tutorId !== meId);
      setTutors(filtered);
      fetchTutorReviews(filtered);
    } catch (e) {
      setTutors([]);
      Alert.alert("Could not load tutors", (e as Error).message);
    } finally {
      setSearching(false);
    }
  };

  const openTutorDetails = (tutorId: string) => {
    setSelectedTutorId(tutorId);
    setBookSubject(course.trim().toUpperCase() || "Physics");
    setFlowStep(1);
  };

  const handleExecutePayment = async () => {
    if (!selectedTutorId) return;
    setIsProcessingPayment(true);
    try {
      const b = await bookTutor(selectedTutorId, bookSubject, bookHours);
      const amountKobo = Math.round((b.grossAmount || 50) * 100);
      const email = (session.user && session.user.email) || "guest@costudy.com";
      const payment = await initiatePayment(amountKobo, "tutoring_booking", email);
      pendingPaymentRef.current = { ref: payment.reference, type: "booking", bookingId: b.bookingId };
      await Linking.openURL(payment.authorizationUrl);
    } catch (e) {
      pendingPaymentRef.current = null;
      Alert.alert("Booking failed", (e as Error).message);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  if (checking) {
    return (
      <SkyBackground>
        <View style={styles.loaderWrap}>
          <ActivityIndicator color={colors.white} size="large" />
        </View>
      </SkyBackground>
    );
  }

  const selectedTutorObj = selectedTutorId ? usersById[selectedTutorId] : null;
  const tutorName = selectedTutorObj
    ? selectedTutorObj.tutorDisplayName || selectedTutorObj.fullName || selectedTutorObj.username
    : "Adjoa Mensah";
  const revData = selectedTutorId ? reviewsByTutor[selectedTutorId] : null;
  const avgRating = revData ? revData.averageRating : 4.9;
  const reviewCount = revData ? revData.count : 120;
  const calculatedPrice = bookHours * 50;

  const isApprovedTutor = tutorApps.some((a) => a.status === "APPROVED");

  return (
    <SkyBackground>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 90 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.white} />}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.headerTitle, { color: colors.white }]}>Tutoring Hub</Text>
        <Text style={[styles.headerSub, { color: colors.textMuted }]}>
          One place for all your tutoring search, bookings & sessions.
        </Text>

        {/* Central Segment Tabs */}
        <View style={[styles.segmentContainer, { backgroundColor: colors.darkGray, borderColor: colors.cardBorder }]}>
          <TouchableOpacity
            style={[styles.segmentBtn, mainSegment === "find" && { backgroundColor: colors.blue }]}
            onPress={() => setMainSegment("find")}
            activeOpacity={0.8}
          >
            <Text style={[styles.segmentText, { color: mainSegment === "find" ? "#FFFFFF" : colors.textMuted }]}>
              Find Tutors
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, mainSegment === "sessions" && { backgroundColor: colors.blue }]}
            onPress={() => setMainSegment("sessions")}
            activeOpacity={0.8}
          >
            <Text style={[styles.segmentText, { color: mainSegment === "sessions" ? "#FFFFFF" : colors.textMuted }]}>
              My Sessions ({bookedSessions.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, mainSegment === "portal" && { backgroundColor: colors.blue }]}
            onPress={() => setMainSegment("portal")}
            activeOpacity={0.8}
          >
            <Text style={[styles.segmentText, { color: mainSegment === "portal" ? "#FFFFFF" : colors.textMuted }]}>
              Tutor Portal
            </Text>
          </TouchableOpacity>
        </View>

        {/* --- SEGMENT 1: FIND TUTORS --- */}
        {mainSegment === "find" && (
          <>
            {!isPro ? (
              <View style={[styles.paywallCard, { backgroundColor: colors.darkGray, borderColor: colors.cardBorder }]}>
                <Ionicons name="lock-closed" size={32} color={colors.yellow} />
                <Text style={[styles.paywallTitle, { color: colors.white }]}>Tutors are a Pro Feature</Text>
                <Text style={[styles.paywallSub, { color: colors.textMuted }]}>
                  Upgrade to Pro to unlock direct access to top verified tutors and 1-on-1 booking.
                </Text>
                {plan && (
                  <Text style={[styles.paywallPrice, { color: colors.yellow }]}>
                    {plan.price} {plan.currency} / {plan.months === 1 ? "month" : plan.months + " months"}
                  </Text>
                )}
                <TouchableOpacity
                  style={[styles.upgradeBtn, { backgroundColor: colors.yellow }]}
                  onPress={handleSubscribe}
                  disabled={subscribing}
                  activeOpacity={0.85}
                >
                  {subscribing ? (
                    <ActivityIndicator color="#000000" />
                  ) : (
                    <Text style={styles.upgradeBtnText}>Upgrade to Pro</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {/* Search Input */}
                <View style={[styles.searchCard, { backgroundColor: colors.darkGray, borderColor: colors.cardBorder }]}>
                  <View style={[styles.inputRow, { backgroundColor: colors.surfaceHover, borderColor: colors.cardBorder }]}>
                    <Ionicons name="search-outline" size={18} color={colors.textMuted} />
                    <TextInput
                      style={[styles.searchInput, { color: colors.white }]}
                      placeholder="Filter by course (e.g. PHY101)"
                      placeholderTextColor={colors.textMuted}
                      value={course}
                      onChangeText={setCourse}
                      autoCapitalize="characters"
                      returnKeyType="search"
                      onSubmitEditing={handleSearch}
                    />
                  </View>
                  <TouchableOpacity
                    style={[styles.searchBtn, { backgroundColor: colors.blue }]}
                    onPress={handleSearch}
                    disabled={searching}
                    activeOpacity={0.85}
                  >
                    {searching ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.searchBtnText}>Search Tutors</Text>
                    )}
                  </TouchableOpacity>
                </View>

                {searched && !searching && tutors.length === 0 && (
                  <View style={[styles.emptyState, { backgroundColor: colors.darkGray, borderColor: colors.cardBorder }]}>
                    <Ionicons name="school-outline" size={32} color={colors.textMuted} />
                    <Text style={[styles.emptyText, { color: colors.textMuted }]}>No tutors found for this course search.</Text>
                  </View>
                )}

                {/* List of Tutors */}
                {tutors.map((tid) => {
                  const u = usersById[tid];
                  const nameStr = u ? u.tutorDisplayName || u.fullName || u.username : "Tutor";
                  const rData = reviewsByTutor[tid];
                  const rAvg = rData ? rData.averageRating : 4.9;
                  const rCount = rData ? rData.count : 12;

                  return (
                    <TouchableOpacity
                      key={tid}
                      style={[styles.tutorListItem, { backgroundColor: colors.darkGray, borderColor: colors.cardBorder }]}
                      activeOpacity={0.88}
                      onPress={() => openTutorDetails(tid)}
                    >
                      <View style={[styles.tutorAvatar, { backgroundColor: colors.surfaceHover }]}>
                        <Ionicons name="person" size={24} color={colors.yellow} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={styles.nameRow}>
                          <Text style={[styles.tutorListName, { color: colors.white }]}>{nameStr}</Text>
                          <Ionicons name="checkmark-circle" size={16} color={colors.green} />
                        </View>
                        <Text style={[styles.tutorListSub, { color: colors.textMuted }]}>{course || u?.program || "Physics Tutor"}</Text>
                        <View style={styles.ratingBadgeRow}>
                          <Ionicons name="star" size={13} color={colors.yellow} />
                          <Text style={[styles.ratingNum, { color: colors.white }]}>
                            {rAvg.toFixed(1)} <Text style={{ color: colors.textMuted }}>({rCount})</Text>
                          </Text>
                        </View>
                      </View>
                      <View style={styles.rateCol}>
                        <Text style={[styles.priceTagText, { color: colors.yellow }]}>GH₵ 50/hr</Text>
                        <View style={styles.bookChevron}>
                          <Text style={[styles.bookChevronText, { color: colors.blue }]}>View</Text>
                          <Ionicons name="chevron-forward" size={14} color={colors.blue} />
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </>
            )}
          </>
        )}

      </ScrollView>

      {/* MULTI-STEP MODAL FLOW (Screens 2, 3, 4) */}
      <Modal visible={flowStep > 0} animationType="slide" transparent={false}>
        <View style={[styles.modalContainer, { backgroundColor: colors.black, paddingTop: insets.top + 12 }]}>
          {/* Header Navigation */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.cardBorder }]}>
            <TouchableOpacity style={styles.backBtn} onPress={() => setFlowStep((prev) => prev - 1)} activeOpacity={0.85}>
              <Ionicons name="arrow-back" size={22} color={colors.white} />
            </TouchableOpacity>
            <Text style={[styles.modalHeaderTitle, { color: colors.white }]}>
              {flowStep === 1 ? "Tutor Profile" : flowStep === 2 ? "Book Session" : "Payment"}
            </Text>
            {flowStep === 1 ? (
              <TouchableOpacity activeOpacity={0.85}>
                <Ionicons name="heart-outline" size={22} color={colors.white} />
              </TouchableOpacity>
            ) : (
              <View style={{ width: 22 }} />
            )}
          </View>

          {/* SCREEN 2: TUTOR PROFILE DETAILS */}
          {flowStep === 1 && (
            <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
              {/* Profile Card */}
              <View style={[styles.tutorHeroCard, { backgroundColor: colors.darkGray, borderColor: colors.cardBorder }]}>
                <View style={[styles.tutorHeroAvatar, { backgroundColor: colors.surfaceHover }]}>
                  <Ionicons name="person" size={40} color={colors.yellow} />
                </View>
                <View style={styles.heroNameRow}>
                  <Text style={[styles.heroName, { color: colors.white }]}>{tutorName}</Text>
                  <Ionicons name="checkmark-circle" size={18} color={colors.green} />
                </View>
                <Text style={[styles.heroSub, { color: colors.textMuted }]}>{bookSubject} Tutor</Text>

                <View style={styles.heroRatingRow}>
                  <Ionicons name="star" size={15} color={colors.yellow} />
                  <Text style={[styles.heroRatingText, { color: colors.white }]}>
                    {avgRating.toFixed(1)} ({reviewCount} reviews)
                  </Text>
                </View>

                <Text style={styles.heroPrice}>GH₵ 50/hr</Text>

                {/* Segmented Tabs */}
                <View style={[styles.segTabContainer, { backgroundColor: colors.surfaceHover }]}>
                  <TouchableOpacity
                    style={[styles.segTab, selectedTab === "about" && { backgroundColor: colors.blue }]}
                    onPress={() => setSelectedTab("about")}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.segTabText, { color: colors.textMuted }, selectedTab === "about" && { color: "#FFFFFF", fontWeight: "700" }]}>
                      About
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.segTab, selectedTab === "availability" && { backgroundColor: colors.blue }]}
                    onPress={() => setSelectedTab("availability")}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.segTabText, { color: colors.textMuted }, selectedTab === "availability" && { color: "#FFFFFF", fontWeight: "700" }]}>
                      Availability
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.segTab, selectedTab === "reviews" && { backgroundColor: colors.blue }]}
                    onPress={() => setSelectedTab("reviews")}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.segTabText, { color: colors.textMuted }, selectedTab === "reviews" && { color: "#FFFFFF", fontWeight: "700" }]}>
                      Reviews
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Tab Content */}
                {selectedTab === "about" && (
                  <View style={styles.tabContentBlock}>
                    <Text style={[styles.bioText, { color: colors.textMuted }]}>
                      I am a passionate {bookSubject} tutor with 5+ years experience helping students excel. I specialize in Senior High & University level physics and mathematics.
                    </Text>

                    {/* Stats */}
                    <View style={styles.statsGrid}>
                      <View style={styles.statBox}>
                        <Text style={[styles.statBoxNum, { color: colors.white }]}>5+</Text>
                        <Text style={[styles.statBoxLabel, { color: colors.textMuted }]}>Years Exp.</Text>
                      </View>
                      <View style={styles.statBox}>
                        <Text style={[styles.statBoxNum, { color: colors.white }]}>120</Text>
                        <Text style={[styles.statBoxLabel, { color: colors.textMuted }]}>Students</Text>
                      </View>
                      <View style={styles.statBox}>
                        <Text style={[styles.statBoxNum, { color: colors.white }]}>95%</Text>
                        <Text style={[styles.statBoxLabel, { color: colors.textMuted }]}>Success</Text>
                      </View>
                    </View>
                  </View>
                )}

                {selectedTab === "availability" && (
                  <View style={styles.tabContentBlock}>
                    <Text style={[styles.availText, { color: colors.white }]}>📅 Available Mon - Sat: 9:00 AM - 8:00 PM</Text>
                    <Text style={[styles.availSub, { color: colors.textMuted }]}>Instant confirmation for online sessions.</Text>
                  </View>
                )}

                {selectedTab === "reviews" && (
                  <View style={styles.tabContentBlock}>
                    {revData?.reviews && revData.reviews.length > 0 ? (
                      revData.reviews.map((r, i) => (
                        <View key={i} style={[styles.reviewItem, { backgroundColor: colors.surfaceHover }]}>
                          <View style={styles.revStarRow}>
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Ionicons
                                key={s}
                                name="star"
                                size={12}
                                color={s <= (r.rating || 5) ? colors.yellow : colors.cardBorder}
                              />
                            ))}
                          </View>
                          <Text style={[styles.revComment, { color: colors.white }]}>{r.comment || "Great tutoring session!"}</Text>
                        </View>
                      ))
                    ) : (
                      <Text style={[styles.availSub, { color: colors.textMuted }]}>★ 4.9 rating from 120 verified student sessions.</Text>
                    )}
                  </View>
                )}
              </View>

              {/* Bottom Action Bar */}
              <View style={styles.stickyFooterRow}>
                <TouchableOpacity
                  style={[styles.messageOutlineBtn, { borderColor: colors.blue }]}
                  onPress={() => {
                    setFlowStep(0);
                    navigation.navigate("Groups");
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.messageOutlineText, { color: colors.blue }]}>Message</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.bookGreenBtn, { backgroundColor: colors.blue }]}
                  onPress={() => setFlowStep(2)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.bookGreenText}>Book Session</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}

          {/* SCREEN 3: BOOK SESSION */}
          {flowStep === 2 && (
            <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
              <View style={[styles.formCard, { backgroundColor: colors.darkGray, borderColor: colors.cardBorder }]}>
                {/* Subject Selector */}
                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Subject</Text>
                <View style={[styles.dropdownBox, { backgroundColor: colors.surfaceHover }]}>
                  <Text style={[styles.dropdownText, { color: colors.white }]}>{bookSubject}</Text>
                  <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
                </View>

                {/* Date Selector */}
                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Date</Text>
                <View style={[styles.dropdownBox, { backgroundColor: colors.surfaceHover }]}>
                  <Text style={[styles.dropdownText, { color: colors.white }]}>{bookDate}</Text>
                  <Ionicons name="calendar-outline" size={16} color={colors.textMuted} />
                </View>

                {/* Time Selector */}
                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Time</Text>
                <View style={[styles.dropdownBox, { backgroundColor: colors.surfaceHover }]}>
                  <Text style={[styles.dropdownText, { color: colors.white }]}>{bookTime}</Text>
                  <Ionicons name="time-outline" size={16} color={colors.textMuted} />
                </View>

                {/* Duration Selector */}
                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Duration</Text>
                <View style={styles.durationChipRow}>
                  {[1, 2, 3].map((h) => (
                    <TouchableOpacity
                      key={h}
                      style={[styles.durationChip, { backgroundColor: colors.surfaceHover }, bookHours === h && { backgroundColor: colors.blue }]}
                      onPress={() => setBookHours(h)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.durationChipText, { color: colors.textMuted }, bookHours === h && { color: "#FFFFFF", fontWeight: "700" }]}>
                        {h} {h === 1 ? "Hour" : "Hours"}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Session Type */}
                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Session Type</Text>
                <View style={styles.typePillRow}>
                  <TouchableOpacity
                    style={[styles.typePill, { backgroundColor: colors.surfaceHover }, sessionType === "Online" && { backgroundColor: colors.blue }]}
                    onPress={() => setSessionType("Online")}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.typePillText, { color: colors.textMuted }, sessionType === "Online" && { color: "#FFFFFF", fontWeight: "700" }]}>
                      Online
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.typePill, { backgroundColor: colors.surfaceHover }, sessionType === "In-Person" && { backgroundColor: colors.blue }]}
                    onPress={() => setSessionType("In-Person")}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.typePillText, { color: colors.textMuted }, sessionType === "In-Person" && { color: "#FFFFFF", fontWeight: "700" }]}>
                      In-Person
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Price Summary */}
                <View style={[styles.priceSummaryRow, { borderTopColor: colors.cardBorder }]}>
                  <Text style={[styles.priceSummaryLabel, { color: colors.white }]}>Price Summary</Text>
                  <Text style={styles.priceSummaryValue}>GH₵ {calculatedPrice.toFixed(2)}</Text>
                </View>
              </View>

              {/* Proceed to Pay Button */}
              <TouchableOpacity
                style={[styles.proceedGreenBtn, { backgroundColor: colors.blue }]}
                onPress={() => setFlowStep(3)}
                activeOpacity={0.85}
              >
                <Text style={styles.proceedGreenText}>Proceed to Pay</Text>
              </TouchableOpacity>
            </ScrollView>
          )}

          {/* SCREEN 4: PAYMENT */}
          {flowStep === 3 && (
            <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
              <View style={[styles.paymentCard, { backgroundColor: colors.darkGray, borderColor: colors.cardBorder }]}>
                <Text style={[styles.amountLabel, { color: colors.textMuted }]}>Amount</Text>
                <Text style={[styles.amountValue, { color: colors.white }]}>GH₵ {calculatedPrice.toFixed(2)}</Text>

                <Text style={[styles.fieldLabel, { color: colors.textMuted, marginTop: 20 }]}>Pay with</Text>

                {/* Pay Options */}
                {[
                  { id: "momo", label: "Mobile Money", icon: "phone-portrait-outline", color: colors.red },
                  { id: "card", label: "Card Payment", icon: "card-outline", color: colors.blue },
                  { id: "paypal", label: "PayPal", icon: "logo-paypal", color: "#0079C1" },
                  { id: "bank", label: "Bank Transfer", icon: "business-outline", color: colors.green },
                ].map((opt) => (
                  <TouchableOpacity
                    key={opt.id}
                    style={[styles.payMethodOption, { backgroundColor: colors.surfaceHover }, paymentMethod === opt.id && { borderWidth: 1, borderColor: colors.blue }]}
                    onPress={() => setPaymentMethod(opt.id)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.payMethodLeft}>
                      <View style={[styles.payIconBox, { backgroundColor: opt.color }]}>
                        <Ionicons name={opt.icon as any} size={18} color="#FFFFFF" />
                      </View>
                      <Text style={[styles.payMethodLabel, { color: colors.white }]}>{opt.label}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                ))}
              </View>

              {/* Pay Now Button */}
              <TouchableOpacity
                style={[styles.payNowGreenBtn, { backgroundColor: colors.blue }]}
                onPress={handleExecutePayment}
                disabled={isProcessingPayment}
                activeOpacity={0.85}
              >
                {isProcessingPayment ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.payNowGreenText}>Pay Now</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </Modal>
    </SkyBackground>
  );
}

const styles = StyleSheet.create({
  loaderWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  headerTitle: { color: colors.white, fontSize: 24, fontWeight: "700", marginBottom: 16 },

  paywallCard: {
    backgroundColor: colors.darkGray,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  paywallTitle: { color: colors.white, fontSize: 18, fontWeight: "700" },
  paywallSub: { color: colors.lightGray, fontSize: 14, textAlign: "center", lineHeight: 20 },
  paywallPrice: { color: colors.yellow, fontSize: 16, fontWeight: "700" },
  upgradeBtn: {
    backgroundColor: colors.yellow,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    alignSelf: "stretch",
    marginTop: 6,
  },
  upgradeBtnText: { color: colors.black, fontWeight: "700", fontSize: 15 },

  searchCard: {
    backgroundColor: colors.darkGray,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#262626",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  searchInput: { flex: 1, color: colors.white, fontSize: 14 },
  searchBtn: {
    backgroundColor: colors.blue,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  searchBtnText: { color: colors.white, fontWeight: "700", fontSize: 14 },

  emptyState: {
    backgroundColor: colors.darkGray,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  emptyText: { color: colors.lightGray, fontSize: 14, textAlign: "center" },

  tutorListItem: {
    backgroundColor: colors.darkGray,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  tutorAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#262626",
    alignItems: "center",
    justifyContent: "center",
  },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  tutorListName: { color: colors.white, fontSize: 16, fontWeight: "700" },
  tutorListSub: { color: colors.lightGray, fontSize: 12, marginTop: 2 },
  ratingBadgeRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  ratingNum: { color: colors.white, fontSize: 12, fontWeight: "600" },
  rateCol: { alignItems: "flex-end" },
  priceTagText: { color: colors.yellow, fontSize: 14, fontWeight: "700" },
  bookChevron: { flexDirection: "row", alignItems: "center", gap: 2, marginTop: 8 },
  bookChevronText: { fontSize: 13, fontWeight: "700" },

  // MODAL STYLING
  modalContainer: { flex: 1, backgroundColor: colors.black },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  modalHeaderTitle: { color: colors.white, fontSize: 18, fontWeight: "700" },

  // TUTOR HERO CARD (SCREEN 2)
  tutorHeroCard: {
    backgroundColor: colors.darkGray,
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  tutorHeroAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#262626",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  heroNameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  heroName: { color: colors.white, fontSize: 22, fontWeight: "700" },
  heroSub: { color: colors.lightGray, fontSize: 14, marginTop: 2 },
  heroRatingRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 },
  heroRatingText: { color: colors.white, fontSize: 14, fontWeight: "600" },
  heroPrice: { color: colors.yellow, fontSize: 18, fontWeight: "700", marginTop: 8 },

  segTabContainer: {
    flexDirection: "row",
    backgroundColor: "#262626",
    borderRadius: 12,
    padding: 4,
    marginTop: 18,
    alignSelf: "stretch",
  },
  segTab: { flex: 1, paddingVertical: 8, alignItems: "center", borderRadius: 8 },
  segTabActive: { backgroundColor: colors.darkGray },
  segTabText: { color: colors.textMuted, fontSize: 13, fontWeight: "600" },
  segTabTextActive: { color: colors.white },

  tabContentBlock: { marginTop: 14, alignSelf: "stretch" },
  bioText: { color: colors.lightGray, fontSize: 13, lineHeight: 20, textAlign: "center" },
  headerSub: { fontSize: 13, marginTop: 4, marginBottom: 16 },

  /* Segment Selector Styles */
  segmentContainer: {
    flexDirection: "row",
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentText: {
    fontSize: 13,
    fontWeight: "700",
  },

  /* My Sessions Card Item */
  sessionCardItem: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  sessionCardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  sessionIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  sessionCourseText: {
    fontSize: 15,
    fontWeight: "700",
  },
  sessionMetaText: {
    fontSize: 12,
    marginTop: 2,
  },
  statusTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusTagText: {
    fontSize: 11,
    fontWeight: "700",
  },
  sessionJoinBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 10,
    paddingVertical: 10,
    marginTop: 14,
  },
  sessionJoinBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },

  /* Tutor Portal Action Cards */
  portalActionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  portalActionTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  portalActionSub: {
    fontSize: 12,
    marginTop: 2,
  },

  statsGrid: { flexDirection: "row", justifyContent: "space-around", marginTop: 16 },
  statBox: { alignItems: "center" },
  statBoxNum: { color: colors.white, fontSize: 18, fontWeight: "700" },
  statBoxLabel: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  availText: { color: colors.white, fontSize: 14, fontWeight: "600" },
  availSub: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  reviewItem: { backgroundColor: "#262626", borderRadius: 8, padding: 10, marginBottom: 8 },
  revStarRow: { flexDirection: "row", gap: 3, marginBottom: 4 },
  revComment: { color: colors.lightGray, fontSize: 12 },

  stickyFooterRow: { flexDirection: "row", gap: 12, marginTop: 24 },
  messageOutlineBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.blue,
    paddingVertical: 14,
    alignItems: "center",
  },
  messageOutlineText: { color: colors.blue, fontWeight: "700", fontSize: 15 },
  bookGreenBtn: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: colors.green,
    paddingVertical: 14,
    alignItems: "center",
  },
  bookGreenText: { color: colors.white, fontWeight: "700", fontSize: 15 },

  // FORM CARD (SCREEN 3)
  formCard: {
    backgroundColor: colors.darkGray,
    borderRadius: 20,
    padding: 20,
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  fieldLabel: { color: colors.lightGray, fontSize: 13, fontWeight: "600", marginBottom: 8, marginTop: 12 },
  dropdownBox: {
    backgroundColor: "#262626",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dropdownText: { color: colors.white, fontSize: 14 },
  durationChipRow: { flexDirection: "row", gap: 10 },
  durationChip: {
    flex: 1,
    backgroundColor: "#262626",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  durationChipActive: { backgroundColor: colors.blue },
  durationChipText: { color: colors.textMuted, fontSize: 13, fontWeight: "600" },
  durationChipTextActive: { color: colors.white },

  typePillRow: { flexDirection: "row", gap: 10 },
  typePill: {
    flex: 1,
    backgroundColor: "#262626",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  typePillActive: { backgroundColor: colors.blue },
  typePillText: { color: colors.textMuted, fontSize: 13, fontWeight: "600" },
  typePillTextActive: { color: colors.white },

  priceSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    marginTop: 20,
    paddingTop: 14,
  },
  priceSummaryLabel: { color: colors.white, fontSize: 15, fontWeight: "700" },
  priceSummaryValue: { color: colors.yellow, fontSize: 18, fontWeight: "700" },

  proceedGreenBtn: {
    backgroundColor: colors.green,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 20,
  },
  proceedGreenText: { color: colors.white, fontWeight: "700", fontSize: 16 },

  // PAYMENT CARD (SCREEN 4)
  paymentCard: {
    backgroundColor: colors.darkGray,
    borderRadius: 20,
    padding: 20,
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  amountLabel: { color: colors.textMuted, fontSize: 13 },
  amountValue: { color: colors.white, fontSize: 26, fontWeight: "700", marginTop: 4 },
  payMethodOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#262626",
    borderRadius: 12,
    padding: 14,
    marginTop: 10,
  },
  payMethodActive: { borderWidth: 1, borderColor: colors.green },
  payMethodLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  payIconBox: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  payMethodLabel: { color: colors.white, fontSize: 14, fontWeight: "600" },

  payNowGreenBtn: {
    backgroundColor: colors.green,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 20,
  },
  payNowGreenText: { color: colors.white, fontWeight: "700", fontSize: 16 },
});

