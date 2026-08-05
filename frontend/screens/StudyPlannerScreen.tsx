import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import DateTimePicker from "@react-native-community/datetimepicker";
import SkyBackground from "./SkyBackground";
import { useTheme } from "../ThemeContext";
import { getStudyTasks, createStudyTask, toggleStudyTask, deleteStudyTask } from "../api";
import type { StackProps, StudyTask } from "../types";

export default function StudyPlannerScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { colors, isDarkMode } = useTheme();
  const [tasks, setTasks] = useState<StudyTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [deadline, setDeadline] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getStudyTasks();
      setTasks(Array.isArray(data) ? data : []);
    } catch (e) {
      Alert.alert("Could not load tasks", (e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleAdd = async () => {
    if (!title.trim()) {
      Alert.alert("Missing info", "Please enter a task title.");
      return;
    }
    setSaving(true);
    try {
      await createStudyTask(title.trim(), subject.trim(), deadline ? deadline.toISOString() : null);
      setTitle("");
      setSubject("");
      setDeadline(null);
      setShowAdd(false);
      await load();
    } catch (e) {
      Alert.alert("Could not add task", (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await toggleStudyTask(id);
      await load();
    } catch (e) {
      Alert.alert("Could not update task", (e as Error).message);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert("Delete Task?", "Are you sure you want to delete this task?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteStudyTask(id);
            await load();
          } catch (e) {
            Alert.alert("Could not delete", (e as Error).message);
          }
        },
      },
    ]);
  };

  const onDateChange = (_event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
      if (_event.type === "set" && selectedDate) {
        setDeadline(selectedDate);
      }
    } else {
      if (selectedDate) {
        setDeadline(selectedDate);
      }
    }
  };

  return (
    <SkyBackground>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 90 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.title, { color: colors.white }]}>Study Planner</Text>
            <Text style={[styles.subTitle, { color: colors.textMuted }]}>Organize your study goals & deadlines</Text>
          </View>
          <TouchableOpacity onPress={() => setShowAdd(true)} style={styles.addBtn} activeOpacity={0.8}>
            <Ionicons name="add-circle" size={32} color={colors.blue} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.white} style={{ marginTop: 24 }} />
        ) : tasks.length === 0 ? (
          <View style={[styles.empty, { backgroundColor: colors.darkGray, borderColor: colors.cardBorder }]}>
            <Ionicons name="calendar-outline" size={32} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              No study tasks yet. Tap the + button to add one!
            </Text>
          </View>
        ) : (
          tasks.map((t) => (
            <View
              key={t.taskId}
              style={[
                styles.taskCard,
                { backgroundColor: colors.darkGray, borderColor: colors.cardBorder },
                t.isCompleted && { opacity: 0.75 },
              ]}
            >
              <TouchableOpacity style={styles.taskLeft} onPress={() => handleToggle(t.taskId)}>
                <Ionicons
                  name={t.isCompleted ? "checkmark-circle" : "ellipse-outline"}
                  size={24}
                  color={t.isCompleted ? colors.green : colors.textMuted}
                />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.taskTitle,
                    { color: colors.white },
                    t.isCompleted && { textDecorationLine: "line-through", color: colors.textMuted },
                  ]}
                >
                  {t.title}
                </Text>
                <View style={styles.taskMeta}>
                  {t.subject && (
                    <View style={[styles.subjectPill, { backgroundColor: colors.surfaceHover }]}>
                      <Text style={[styles.subjectText, { color: colors.blue }]}>{t.subject}</Text>
                    </View>
                  )}
                  {t.deadline && (
                    <Text style={[styles.deadlineText, { color: colors.textMuted }]}>
                      Due: {new Date(t.deadline).toLocaleDateString()}
                    </Text>
                  )}
                </View>
              </View>
              <TouchableOpacity onPress={() => handleDelete(t.taskId)}>
                <Ionicons name="trash-outline" size={20} color={colors.red} />
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      {/* Add Task Modal */}
      <Modal visible={showAdd} transparent animationType="slide" onRequestClose={() => setShowAdd(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.darkGray, borderColor: colors.cardBorder }]}>
            <Text style={[styles.modalTitle, { color: colors.white }]}>Add New Task</Text>

            <TextInput
              style={[styles.input, { backgroundColor: colors.surfaceHover, borderColor: colors.cardBorder, color: colors.white }]}
              placeholder="Task title (e.g. Finish Calculus Homework)"
              placeholderTextColor={colors.textMuted}
              value={title}
              onChangeText={setTitle}
            />
            <TextInput
              style={[styles.input, { backgroundColor: colors.surfaceHover, borderColor: colors.cardBorder, color: colors.white }]}
              placeholder="Subject (e.g. Math)"
              placeholderTextColor={colors.textMuted}
              value={subject}
              onChangeText={setSubject}
            />

            <TouchableOpacity
              style={[styles.input, { backgroundColor: colors.surfaceHover, borderColor: colors.cardBorder, justifyContent: "center" }]}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={{ color: deadline ? colors.white : colors.textMuted, fontSize: 14 }}>
                {deadline ? `Due: ${deadline.toLocaleDateString()}` : "Select Deadline (Optional)"}
              </Text>
            </TouchableOpacity>

            {showDatePicker && (
              <View style={[styles.datePickerContainer, { backgroundColor: colors.surfaceHover }]}>
                {Platform.OS === "ios" && (
                  <View style={styles.datePickerHeader}>
                    <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                      <Text style={[styles.doneBtnText, { color: colors.blue }]}>Done</Text>
                    </TouchableOpacity>
                  </View>
                )}
                <DateTimePicker
                  value={deadline || new Date()}
                  mode="date"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={onDateChange}
                  textColor={isDarkMode ? "#FFFFFF" : "#000000"}
                  style={{ width: "100%" }}
                />
              </View>
            )}

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.surfaceHover, borderColor: colors.cardBorder, borderWidth: 1 }]}
                onPress={() => {
                  setShowAdd(false);
                  setDeadline(null);
                  setShowDatePicker(false);
                }}
                disabled={saving}
              >
                <Text style={[styles.modalBtnText, { color: colors.white }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.blue }]}
                onPress={handleAdd}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={[styles.modalBtnText, { color: "#FFFFFF" }]}>Add Task</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SkyBackground>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  title: { fontSize: 24, fontWeight: "700" },
  subTitle: { fontSize: 13, marginTop: 2 },
  addBtn: { padding: 4 },
  empty: {
    borderRadius: 16,
    padding: 28,
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
  },
  emptyText: { fontSize: 14, textAlign: "center" },
  taskCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  taskLeft: { padding: 4 },
  taskTitle: { fontSize: 15, fontWeight: "600" },
  taskMeta: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 },
  subjectPill: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  subjectText: { fontSize: 11, fontWeight: "700" },
  deadlineText: { fontSize: 11 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", padding: 24 },
  modalCard: {
    width: "100%",
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
  },
  modalTitle: { fontSize: 20, fontWeight: "700", marginBottom: 20, textAlign: "center" },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    marginBottom: 12,
  },
  datePickerContainer: { borderRadius: 12, marginBottom: 12, paddingBottom: 10 },
  datePickerHeader: { alignItems: "flex-end", padding: 10 },
  doneBtnText: { fontSize: 16, fontWeight: "700" },
  modalBtnRow: { flexDirection: "row", gap: 10, marginTop: 8 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  modalBtnText: { fontWeight: "700", fontSize: 14 },
});

