import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as DocumentPicker from "expo-document-picker";
import SkyBackground from "./SkyBackground";
import { useTheme } from "../ThemeContext";
import { uploadQuestionFile } from "../api";
import type { LocalFile, StackProps } from "../types";

export default function AdminVettingScreen({ navigation }: StackProps<"AdminVetting">) {
  const insets = useSafeAreaInsets();
  const { colors, isDarkMode } = useTheme();
  const [course, setCourse] = useState("");
  const [file, setFile] = useState<LocalFile | null>(null);
  const [uploading, setUploading] = useState(false);

  const pickFile = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: "*/*", copyToCacheDirectory: true });
      if (!res.canceled && res.assets) setFile(res.assets[0] as LocalFile);
    } catch (e) {
      // ignore
    }
  };

  const handleUpload = async () => {
    if (!course.trim()) {
      Alert.alert("Missing info", "Please enter a course code.");
      return;
    }
    if (!file) {
      Alert.alert("Missing file", "Please choose a PDF/Doc file to upload.");
      return;
    }
    setUploading(true);
    try {
      await uploadQuestionFile(course.trim().toUpperCase(), file);
      Alert.alert("Success", "Question file uploaded successfully!");
      setCourse("");
      setFile(null);
    } catch (e) {
      Alert.alert("Upload failed", (e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <SkyBackground>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.85}>
            <Ionicons name="chevron-back" size={26} color={colors.white} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.white }]}>Subject Assessment</Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.darkGray, borderColor: colors.cardBorder }]}>
          <Text style={[styles.cardTitle, { color: colors.white }]}>Upload Subject Assessment (PDF)</Text>
          <Text style={[styles.cardSub, { color: colors.textMuted }]}>
            Upload a PDF with the assessment questions for a course. Applicants download this file, solve it, and upload
            their answers with their CV and transcript. Uploading again replaces the current file.
          </Text>

          <TextInput
            style={[styles.input, { backgroundColor: colors.surfaceHover, borderColor: colors.cardBorder, color: colors.white }]}
            placeholder="Course code (e.g., PHY101)"
            placeholderTextColor={colors.textMuted}
            value={course}
            onChangeText={setCourse}
            autoCapitalize="characters"
          />

          <TouchableOpacity
            style={[styles.fileBtn, { backgroundColor: colors.surfaceHover, borderColor: colors.cardBorder }]}
            onPress={pickFile}
            activeOpacity={0.85}
          >
            <Ionicons name="document-attach-outline" size={18} color={colors.blue} />
            <Text style={[styles.fileText, { color: colors.white }]}>{file ? file.name : "Choose a file"}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.button, { backgroundColor: colors.blue }]} onPress={handleUpload} disabled={uploading} activeOpacity={0.85}>
            {uploading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Upload Assessment</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SkyBackground>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 24 },
  title: { fontSize: 22, fontWeight: "700" },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
  },
  cardTitle: { fontSize: 16, fontWeight: "700", marginBottom: 8 },
  cardSub: { fontSize: 13, marginBottom: 16 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 12,
  },
  fileBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    alignSelf: "stretch",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  fileText: { fontWeight: "600", fontSize: 14 },
  button: { borderRadius: 10, paddingVertical: 12, alignItems: "center", marginTop: 4 },
  buttonText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },
});

