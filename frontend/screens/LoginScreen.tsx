import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  ActivityIndicator,
  Alert,
  Modal,
  Keyboard,
  TouchableWithoutFeedback,
  ScrollView,
} from "react-native";

import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../ThemeContext";
import { login, register, requestOtp } from "../api";
import { registerForPushNotifications } from "../lib/notifications";
import type { StackProps } from "../types";

export default function LoginScreen({ navigation }: StackProps<"Login">) {
  const { colors, isDarkMode, toggleTheme } = useTheme();
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);


  // 4-Digit OTP state
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [resending, setResending] = useState(false);

  const isRegister = mode === "register";

  const handleSubmit = async () => {
    if (isRegister) {
      if (!username.trim()) {
        Alert.alert("Missing Username", "Please enter a username.");
        return;
      }
      if (!email.trim() || !email.includes("@")) {
        Alert.alert("Invalid Email", "Please enter a valid email address.");
        return;
      }
      if (password.length < 8) {
        Alert.alert("Weak Password", "Password must be at least 8 characters long.");
        return;
      }

      setLoading(true);
      try {
        await requestOtp(email.trim(), username.trim());
        setShowOtpModal(true);
        Alert.alert(
          "Code Sent! ✉️",
          `A 4-digit verification code was sent to ${email.trim()}. Please check your email inbox.`
        );
      } catch (e) {
        Alert.alert("Registration failed", (e as Error).message);
      } finally {
        setLoading(false);
      }
    } else {
      setLoading(true);
      try {
        await login((email || username).trim(), password);
        registerForPushNotifications();
        navigation.replace("Main");
      } catch (e) {
        Alert.alert("Sign in failed", (e as Error).message);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleVerifyOtp = async () => {
    const code = otpCode.trim();
    if (code.length !== 4) {
      Alert.alert("Invalid Code", "Please enter the 4-digit code sent to your email.");
      return;
    }

    setVerifyingOtp(true);
    try {
      await register(username.trim(), email.trim(), password, "STUDENT", code);
      registerForPushNotifications();
      setShowOtpModal(false);
      Alert.alert("Welcome! 🎉", "Your account has been created successfully.");
      navigation.replace("Main");
    } catch (e) {
      Alert.alert("Verification failed", (e as Error).message);
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleResendOtp = async () => {
    setResending(true);
    try {
      await requestOtp(email.trim(), username.trim());
      Alert.alert("New Code Sent ✉️", `A new 4-digit code was sent to ${email.trim()}.`);
    } catch (e) {
      Alert.alert("Could not resend code", (e as Error).message);
    } finally {
      setResending(false);
    }
  };

  const floatIconColor = isDarkMode ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.06)";
  const cardBg = isDarkMode ? "rgba(26,26,26,0.85)" : "rgba(255,255,255,0.92)";
  const inputBg = isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)";
  const inputBorder = isDarkMode ? "rgba(255,255,255,0.18)" : "#CBD5E1";
  const placeholderColor = isDarkMode ? "rgba(255,255,255,0.55)" : "#64748B";

  return (
    <LinearGradient colors={colors.sky} style={styles.fill}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />

      {/* Top Header Row with Theme Toggle */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={[styles.themeBtn, { backgroundColor: isDarkMode ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.06)" }]}
          onPress={toggleTheme}
          activeOpacity={0.8}
        >
          <Ionicons
            name={isDarkMode ? "sunny" : "moon"}
            size={20}
            color={isDarkMode ? colors.yellow : colors.blue}
          />
        </TouchableOpacity>
      </View>

      <Ionicons name="book" size={46} color={floatIconColor} style={styles.floatA} />
      <Ionicons name="pencil" size={52} color={floatIconColor} style={styles.floatB} />
      <Ionicons name="library" size={40} color={floatIconColor} style={styles.floatC} />
      
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.center}>
        <View style={styles.brandRow}>
          <Ionicons name="school" size={32} color={colors.blue} />
          <Text style={[styles.brand, { color: colors.white }]}>CoStudy</Text>
        </View>
        <Text style={[styles.tagline, { color: colors.lightGray }]}>Study together. Achieve more.</Text>
        
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: colors.cardBorder }]}>
          <Text style={[styles.cardTitle, { color: colors.white }]}>{isRegister ? "Create account" : "Welcome back"}</Text>
          <Text style={[styles.cardSub, { color: colors.textMuted }]}>{isRegister ? "Join CoStudy" : "Sign in to continue"}</Text>
          
          {isRegister && (
            <View style={[styles.inputRow, { backgroundColor: inputBg, borderColor: inputBorder }]}>
              <Ionicons name="person-outline" size={20} color={colors.textMuted} />
              <TextInput
                style={[styles.input, { color: colors.white }]}
                placeholder="Username"
                placeholderTextColor={placeholderColor}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
              />
            </View>
          )}
          <View style={[styles.inputRow, { backgroundColor: inputBg, borderColor: inputBorder }]}>
            <Ionicons name="mail-outline" size={20} color={colors.textMuted} />
            <TextInput
              style={[styles.input, { color: colors.white }]}
              placeholder={isRegister ? "Email" : "Email or username"}
              placeholderTextColor={placeholderColor}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
            />
          </View>
          <View style={[styles.inputRow, { backgroundColor: inputBg, borderColor: inputBorder }]}>
            <Ionicons name="lock-closed-outline" size={20} color={colors.textMuted} />
            <TextInput
              style={[styles.input, { color: colors.white }]}
              placeholder="Password"
              placeholderTextColor={placeholderColor}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity
              onPress={() => setShowPassword((prev) => !prev)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              activeOpacity={0.7}
            >
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={20}
                color={colors.textMuted}
              />
            </TouchableOpacity>
          </View>

          
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.blue }]}
            activeOpacity={0.85}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>{isRegister ? "Sign up" : "Sign in"}</Text>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => setMode(isRegister ? "login" : "register")}>
          <Text style={[styles.footer, { color: colors.textMuted }]}>
            {isRegister ? "Already have an account? " : "New here? "}
            <Text style={[styles.footerLink, { color: colors.blue }]}>{isRegister ? "Sign in" : "Create account"}</Text>
          </Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>

      {/* 4-Digit Email OTP Verification Modal */}
      <Modal visible={showOtpModal} transparent animationType="slide" onRequestClose={() => setShowOtpModal(false)}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalBackdrop}>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              style={{ width: "100%", alignItems: "center" }}
            >
              <ScrollView
                contentContainerStyle={{ alignItems: "center", justifyContent: "center", width: "100%" }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View style={[styles.modalCard, { backgroundColor: isDarkMode ? "#0F172A" : colors.darkGray, borderColor: colors.cardBorder }]}>
                  <View style={[styles.otpHeaderIcon, { backgroundColor: isDarkMode ? "rgba(59,130,246,0.12)" : colors.surfaceHover }]}>
                    <Ionicons name="mail-outline" size={28} color={colors.blue} />
                  </View>
                  <Text style={[styles.otpTitle, { color: colors.white }]}>Verify Your Email</Text>
                  <Text style={[styles.otpSub, { color: colors.textMuted }]}>
                    We sent a 4-digit verification code to{"\n"}
                    <Text style={{ fontWeight: "700", color: colors.white }}>{email.trim()}</Text>
                  </Text>

                  <Text style={[styles.otpInputLabel, { color: colors.textMuted }]}>ENTER 4-DIGIT CODE</Text>

                  <TextInput
                    style={[styles.otpInput, { backgroundColor: inputBg, borderColor: inputBorder, color: colors.white }]}
                    keyboardType="number-pad"
                    maxLength={4}
                    value={otpCode}
                    onChangeText={setOtpCode}
                    placeholder="• • • •"
                    placeholderTextColor={placeholderColor}
                  />

                  <TouchableOpacity
                    style={[styles.otpVerifyBtn, { backgroundColor: colors.blue }]}
                    onPress={handleVerifyOtp}
                    disabled={verifyingOtp}
                    activeOpacity={0.85}
                  >
                    {verifyingOtp ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.otpVerifyBtnText}>VERIFY</Text>
                    )}
                  </TouchableOpacity>

                  <View style={styles.otpFooterRow}>
                    <TouchableOpacity onPress={handleResendOtp} disabled={resending} style={{ paddingVertical: 6, paddingHorizontal: 8 }}>
                      <Text style={[styles.resendText, { color: colors.blue }]}>
                        {resending ? "Resending..." : "Resend Code"}
                      </Text>
                    </TouchableOpacity>
                    <Text style={{ color: colors.textMuted, opacity: 0.4 }}>|</Text>
                    <TouchableOpacity onPress={() => setShowOtpModal(false)} style={{ paddingVertical: 6, paddingHorizontal: 8 }}>
                      <Text style={[styles.cancelText, { color: colors.textMuted }]}>Edit Email</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  topBar: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 10,
  },
  themeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  center: { flex: 1, justifyContent: "center", paddingHorizontal: 24 },
  floatA: { position: "absolute", top: 90, left: 28 },
  floatB: { position: "absolute", top: 200, right: 30, transform: [{ rotate: "20deg" }] },
  floatC: { position: "absolute", bottom: 120, left: 40 },
  brandRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  brand: { fontSize: 28, fontWeight: "700" },
  tagline: { fontSize: 14, textAlign: "center", marginTop: 4, marginBottom: 28 },
  card: {
    borderRadius: 22,
    padding: 22,
    overflow: "hidden",
    borderWidth: 1,
    elevation: 4,
  },
  cardTitle: { fontSize: 20, fontWeight: "700" },
  cardSub: { fontSize: 13, marginTop: 4, marginBottom: 18 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  input: { flex: 1, fontSize: 15 },
  button: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 6,
    minHeight: 48,
    justifyContent: "center",
  },
  buttonText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
  footer: { textAlign: "center", fontSize: 13, marginTop: 20 },
  footerLink: { fontWeight: "700" },

  // OTP Modal Styles
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.75)", justifyContent: "center", paddingHorizontal: 20 },
  modalCard: {
    borderRadius: 12,
    padding: 26,
    alignItems: "center",
    borderWidth: 1,
    width: "100%",
  },
  otpHeaderIcon: { width: 56, height: 56, borderRadius: 10, justifyContent: "center", alignItems: "center", marginBottom: 16 },
  otpTitle: { fontSize: 22, fontWeight: "700", marginBottom: 6 },
  otpSub: { fontSize: 13, textAlign: "center", marginBottom: 20, lineHeight: 20 },
  otpInputLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 1, marginBottom: 8 },
  otpInput: {
    width: "100%",
    height: 52,
    borderWidth: 1,
    borderRadius: 6,
    textAlign: "center",
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: 12,
    marginBottom: 20,
  },
  otpVerifyBtn: {
    width: "100%",
    borderRadius: 6,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    marginBottom: 16,
  },
  otpVerifyBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700", letterSpacing: 1 },
  otpFooterRow: { flexDirection: "row", gap: 12, alignItems: "center", marginTop: 4 },
  resendText: { fontSize: 13, fontWeight: "700" },
  cancelText: { fontSize: 13, fontWeight: "500" },
});
