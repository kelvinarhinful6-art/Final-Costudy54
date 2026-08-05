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
import * as Print from "expo-print";
import SkyBackground from "./SkyBackground";
import { useTheme } from "../ThemeContext";
import { BASE_URL, applyTutor, uploadDocument, getQuestionFile, submitApplication } from "../api";
import type { LocalFile, StackProps } from "../types";

export default function BecomeTutorScreen({ navigation, route }: StackProps<"BecomeTutor">) {
  const insets = useSafeAreaInsets();
  const { colors, isDarkMode } = useTheme();
  const resume = route.params;
  const [stage, setStage] = useState<"apply" | "upload" | "done">(resume?.appId ? "upload" : "apply");
  const [course, setCourse] = useState(resume?.courseId ?? "");
  const [appId, setAppId] = useState<string | null>(resume?.appId ?? null);
  const [questionFileUrl, setQuestionFileUrl] = useState<string | null>(null);
  const [files, setFiles] = useState<LocalFile[]>([]);
  const [busy, setBusy] = useState(false);
  const [viewingAssessment, setViewingAssessment] = useState(false);

  React.useEffect(() => {
    if (resume?.appId && resume?.courseId) {
      getQuestionFile(resume.courseId)
        .then((qf) => setQuestionFileUrl(qf && qf.url ? qf.url : null))
        .catch(() => setQuestionFileUrl(null));
    }
  }, []);

  const startApply = async () => {
    if (!course.trim()) {
      Alert.alert("Enter a course", "Type the course code you want to tutor.");
      return;
    }
    setBusy(true);
    try {
      const code = course.trim().toUpperCase();
      const app = await applyTutor(code);
      setAppId(app.applicationId);
      try {
        const qf = await getQuestionFile(code);
        setQuestionFileUrl(qf && qf.url ? qf.url : null);
      } catch {
        setQuestionFileUrl(null);
      }
      setStage("upload");
    } catch (e) {
      Alert.alert("Could not apply", (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const viewAssessment = async () => {
    if (!questionFileUrl) return;
    setViewingAssessment(true);
    try {
      await Print.printAsync({ uri: `${BASE_URL}${questionFileUrl}` });
    } catch (e) {
      Alert.alert("Could not open assessment", (e as Error).message);
    } finally {
      setViewingAssessment(false);
    }
  };

  const addFile = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: "*/*", copyToCacheDirectory: true });
      if (!res.canceled && res.assets) {
        setFiles((prev) => [...prev, res.assets[0] as LocalFile]);
      }
    } catch {
      // ignore
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const submitDocs = async () => {
    if (!appId) return;
    if (files.length === 0) {
      Alert.alert("Add your documents", "Upload your solved assessment together with your CV, transcript, and any supporting documents.");
      return;
    }
    setBusy(true);
    try {
      for (const f of files) {
        await uploadDocument(appId, f);
      }
      await submitApplication(appId);
      setStage("done");
    } catch (e) {
      Alert.alert("Submission failed", (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SkyBackground>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.85}>
            <Ionicons name="chevron-back" size={26} color={colors.white} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.white }]}>Become a Tutor</Text>
        </View>

        {stage === "apply" && (
          <View style={[styles.card, { backgroundColor: colors.darkGray, borderColor: colors.cardBorder }]}>
            <Ionicons name="school" size={32} color={colors.blue} />
            <Text style={[styles.cardTitle, { color: colors.white }]}>Apply to tutor</Text>
            <Text style={[styles.cardSub, { color: colors.textMuted }]}>
              Choose the course you want to tutor. You'll download an assessment, solve it, and upload it with your
              supporting documents for admin review.
            </Text>
            <View style={[styles.inputRow, { backgroundColor: colors.surfaceHover, borderColor: colors.cardBorder }]}>
              <Ionicons name="book-outline" size={18} color={colors.textMuted} />
              <TextInput
                style={[styles.input, { color: colors.white }]}
                placeholder="Course code (e.g. PHY101)"
                placeholderTextColor={colors.textMuted}
                value={course}
                onChangeText={setCourse}
                autoCapitalize="characters"
              />
            </View>
            <TouchableOpacity style={[styles.button, { backgroundColor: colors.blue }]} onPress={startApply} disabled={busy} activeOpacity={0.85}>
              {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Start application</Text>}
            </TouchableOpacity>
          </View>
        )}

        {stage === "upload" && (
          <>
            <View style={[styles.card, { backgroundColor: colors.darkGray, borderColor: colors.cardBorder }]}>
              <Ionicons name="list-circle" size={32} color={colors.blue} />
              <Text style={[styles.cardTitle, { color: colors.white }]}>How to apply for {course}</Text>
              <View style={styles.steps}>
                <View style={styles.stepRow}>
                  <Text style={[styles.stepNum, { backgroundColor: colors.blue, color: "#FFFFFF" }]}>1</Text>
                  <Text style={[styles.stepText, { color: colors.white }]}>Download and read the assessment PDF for this subject.</Text>
                </View>
                <View style={styles.stepRow}>
                  <Text style={[styles.stepNum, { backgroundColor: colors.blue, color: "#FFFFFF" }]}>2</Text>
                  <Text style={[styles.stepText, { color: colors.white }]}>Solve the questions in the assessment.</Text>
                </View>
                <View style={styles.stepRow}>
                  <Text style={[styles.stepNum, { backgroundColor: colors.blue, color: "#FFFFFF" }]}>3</Text>
                  <Text style={[styles.stepText, { color: colors.white }]}>
                    Include your answers in the same file (or package) as your CV, transcript, and any other documents
                    that prove your qualifications.
                  </Text>
                </View>
                <View style={styles.stepRow}>
                  <Text style={[styles.stepNum, { backgroundColor: colors.blue, color: "#FFFFFF" }]}>4</Text>
                  <Text style={[styles.stepText, { color: colors.white }]}>Upload the completed file(s) below, then submit your application.</Text>
                </View>
              </View>
            </View>

            <View style={[styles.card, { backgroundColor: colors.darkGray, borderColor: colors.cardBorder }]}>
              <Text style={[styles.cardTitle, { color: colors.white }]}>Assessment questions</Text>
              {questionFileUrl ? (
                <>
                  <Text style={[styles.cardSub, { color: colors.textMuted }]}>Download the assessment, solve it, and include your answers with your documents.</Text>
                  <TouchableOpacity style={[styles.fileBtn, { backgroundColor: colors.surfaceHover, borderColor: colors.cardBorder }]} onPress={viewAssessment} disabled={viewingAssessment} activeOpacity={0.85}>
                    {viewingAssessment ? (
                      <ActivityIndicator color={colors.blue} />
                    ) : (
                      <>
                        <Ionicons name="eye-outline" size={18} color={colors.blue} />
                        <Text style={[styles.fileText, { color: colors.blue }]}>View Assessment PDF</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </>
              ) : (
                <Text style={[styles.cardSub, { color: colors.textMuted }]}>
                  No assessment has been published for this subject yet. You can still upload your CV, transcript, and
                  supporting documents for review.
                </Text>
              )}
            </View>

            <View style={[styles.card, { backgroundColor: colors.darkGray, borderColor: colors.cardBorder }]}>
              <Ionicons name="cloud-upload" size={32} color={colors.blue} />
              <Text style={[styles.cardTitle, { color: colors.white }]}>Upload your documents</Text>
              <Text style={[styles.cardSub, { color: colors.textMuted }]}>
                Add your solved assessment, CV/Resume, transcript, and any other supporting files.
              </Text>

              {files.map((f, i) => (
                <View key={i} style={[styles.fileItem, { backgroundColor: colors.surfaceHover }]}>
                  <Ionicons name="document-text-outline" size={18} color={colors.blue} />
                  <Text style={[styles.fileItemName, { color: colors.white }]} numberOfLines={1}>
                    {f.name || `Document ${i + 1}`}
                  </Text>
                  <TouchableOpacity onPress={() => removeFile(i)}>
                    <Ionicons name="close-circle" size={20} color={colors.red} />
                  </TouchableOpacity>
                </View>
              ))}

              <TouchableOpacity style={[styles.fileBtn, { backgroundColor: colors.surfaceHover, borderColor: colors.cardBorder }]} onPress={addFile} activeOpacity={0.85}>
                <Ionicons name="document-attach-outline" size={18} color={colors.blue} />
                <Text style={[styles.fileText, { color: colors.blue }]}>{files.length > 0 ? "Add another file" : "Choose a file"}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.button, { backgroundColor: colors.blue }]} onPress={submitDocs} disabled={busy} activeOpacity={0.85}>
                {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Submit Application</Text>}
              </TouchableOpacity>
            </View>
          </>
        )}

        {stage === "done" && (
          <View style={[styles.card, { backgroundColor: colors.darkGray, borderColor: colors.cardBorder }]}>
            <Ionicons name="checkmark-circle" size={44} color={colors.green} />
            <Text style={[styles.cardTitle, { color: colors.white }]}>Application submitted</Text>
            <Text style={[styles.cardSub, { color: colors.textMuted }]}>
              Your documents, including your assessment answers, are now under review by our team. You'll become a
              bookable tutor for this course once an admin approves your application.
            </Text>
            <TouchableOpacity style={[styles.button, { backgroundColor: colors.blue }]} onPress={() => navigation.goBack()} activeOpacity={0.85}>
              <Text style={styles.buttonText}>Back to profile</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SkyBackground>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 18 },
  title: { fontSize: 22, fontWeight: "700" },
  card: {
    borderRadius: 20,
    padding: 22,
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  cardTitle: { fontSize: 18, fontWeight: "700", marginTop: 4, textAlign: "center" },
  cardSub: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  steps: { alignSelf: "stretch", gap: 12, marginTop: 6 },
  stepRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  stepNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    textAlign: "center",
    lineHeight: 24,
    fontWeight: "700",
    fontSize: 13,
    overflow: "hidden",
  },
  stepText: { fontSize: 14, lineHeight: 20, flex: 1 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "stretch",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginTop: 8,
  },
  input: { flex: 1, fontSize: 14 },
  button: {
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 46,
    marginTop: 12,
    alignSelf: "stretch",
  },
  buttonText: { color: "#FFFFFF", fontWeight: "700", fontSize: 15 },
  fileBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    alignSelf: "stretch",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
    marginBottom: 4,
  },
  fileText: { fontWeight: "700", fontSize: 14 },
  fileItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    alignSelf: "stretch",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 8,
  },
  fileItemName: { fontSize: 14, flex: 1 },
});

