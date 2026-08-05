import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Linking,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Client } from "@stomp/stompjs";
import SkyBackground from "./SkyBackground";
import { useTheme } from "../ThemeContext";
import { session, groupMessages, getBooking, WS_URL, listUsers, userName } from "../api";
import type { ChatMessage, StackProps, User } from "../types";

export default function SessionChatScreen({ route, navigation }: StackProps<"SessionChat">) {
  const insets = useSafeAreaInsets();
  const { colors, isDarkMode } = useTheme();
  const { bookingId, title } = route.params;
  const channel = "booking." + bookingId;
  const me = (session.user ?? ({} as User)) as User;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [zoomLink, setZoomLink] = useState<string | null>(null);
  const [peerName, setPeerName] = useState<string | null>(null);
  const clientRef = useRef<Client | null>(null);
  const listRef = useRef<FlatList<ChatMessage> | null>(null);

  const addMessage = useCallback((m: ChatMessage) => {
    setMessages((prev) => {
      if (m.messageId && prev.some((x) => x.messageId === m.messageId)) return prev;
      return [...prev, m];
    });
  }, []);

  useEffect(() => {
    let active = true;
    groupMessages(channel)
      .then((d) => {
        if (active) setMessages(Array.isArray(d) ? d : []);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    getBooking(bookingId)
      .then((b) => {
        if (!active || !b) return;
        setZoomLink(b.zoomLink);
        const tutorId = b.tutorId as string | undefined;
        const studentId = b.studentId as string | undefined;
        const peerId = me.userId === tutorId ? studentId : tutorId;
        if (peerId) {
          listUsers()
            .then((users) => {
              if (!active) return;
              const map: Record<string, any> = {};
              (Array.isArray(users) ? users : []).forEach((u: any) => {
                if (u && u.userId) map[u.userId] = u;
              });
              setPeerName(userName(map[peerId]) || null);
            })
            .catch(() => {});
        }
      })
      .catch(() => {});

    const client = new Client({
      brokerURL: WS_URL,
      webSocketFactory: () => new WebSocket(WS_URL),
      forceBinaryWSFrames: true,
      appendMissingNULLonIncoming: true,
      reconnectDelay: 3000,
      onConnect: () => {
        setConnected(true);
        client.subscribe("/topic/group." + channel, (frame) => {
          try {
            addMessage(JSON.parse(frame.body));
          } catch (e) {
            // ignore
          }
        });
      },
      onDisconnect: () => setConnected(false),
      onStompError: () => setConnected(false),
      onWebSocketError: () => setConnected(false),
    });
    client.activate();
    clientRef.current = client;
    return () => {
      active = false;
      try {
        client.deactivate();
      } catch (e) {
        // ignore
      }
    };
  }, [bookingId, channel, addMessage]);

  const send = () => {
    const body = text.trim();
    if (!body || !clientRef.current || !connected) return;
    clientRef.current.publish({
      destination: "/app/group/" + channel,
      body: JSON.stringify({ senderId: me.userId, senderName: me.username, body }),
    });
    setText("");
  };

  const openZoom = async () => {
    if (!zoomLink) return;
    try {
      const ok = await Linking.canOpenURL(zoomLink);
      if (ok) Linking.openURL(zoomLink);
      else Alert.alert("Cannot open link", zoomLink);
    } catch (e) {
      Alert.alert("Cannot open link", zoomLink);
    }
  };

  const renderItem = ({ item }: { item: ChatMessage }) => {
    const mine = item.senderId === me.userId;
    return (
      <View style={[styles.row, mine ? styles.rowMine : styles.rowOther]}>
        <View
          style={[
            styles.bubble,
            mine
              ? { backgroundColor: colors.blue, borderBottomRightRadius: 4 }
              : { backgroundColor: colors.darkGray, borderColor: colors.cardBorder, borderWidth: 1, borderBottomLeftRadius: 4 },
          ]}
        >
          {!mine && <Text style={[styles.sender, { color: colors.blue }]}>{item.senderName || item.senderId}</Text>}
          <Text style={{ color: mine ? "#FFFFFF" : colors.white, fontSize: 15 }}>{item.body}</Text>
        </View>
      </View>
    );
  };

  return (
    <SkyBackground>
      <View style={{ flex: 1, paddingTop: insets.top + 8 }}>
        <View style={[styles.header, { borderBottomColor: colors.cardBorder, borderBottomWidth: 1, paddingBottom: 10 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.85}>
            <Ionicons name="chevron-back" size={26} color={colors.white} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.white }]}>{peerName || title || "Session"}</Text>
            <Text style={[styles.status, { color: connected ? colors.green : colors.textMuted }]}>
              {connected ? "online" : "connecting..."}
            </Text>
          </View>
        </View>

        {zoomLink ? (
          <TouchableOpacity style={[styles.pinned, { backgroundColor: colors.darkGray, borderColor: colors.cardBorder, borderWidth: 1 }]} onPress={openZoom} activeOpacity={0.85}>
            <Ionicons name="videocam" size={20} color={colors.blue} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.pinnedLabel, { color: colors.blue }]}>Zoom meeting</Text>
              <Text style={[styles.pinnedLink, { color: colors.white }]} numberOfLines={1}>
                {zoomLink}
              </Text>
            </View>
            <Text style={[styles.joinText, { color: colors.blue }]}>Join</Text>
          </TouchableOpacity>
        ) : (
          <View style={[styles.noPin, { backgroundColor: colors.darkGray, borderColor: colors.cardBorder }]}>
            <Ionicons name="videocam-outline" size={16} color={colors.textMuted} />
            <Text style={[styles.noPinText, { color: colors.textMuted }]}>No Zoom link posted yet</Text>
          </View>
        )}

        {loading ? (
          <ActivityIndicator color={colors.white} style={{ marginTop: 20 }} />
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m, i) => m.messageId || String(i)}
            renderItem={renderItem}
            contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 10, paddingTop: 6 }}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
            ListEmptyComponent={<Text style={[styles.empty, { color: colors.textMuted }]}>No messages yet.</Text>}
          />
        )}

        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={8}>
          <View style={[styles.inputBar, { backgroundColor: colors.darkGray, borderColor: colors.cardBorder, borderTopWidth: 1, paddingBottom: insets.bottom + 8 }]}>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surfaceHover, borderColor: colors.cardBorder, color: colors.white }]}
              placeholder="Message"
              placeholderTextColor={colors.textMuted}
              value={text}
              onChangeText={setText}
              multiline
            />
            <TouchableOpacity style={[styles.sendBtn, { backgroundColor: colors.blue }]} onPress={send} activeOpacity={0.85}>
              <Ionicons name="send" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </SkyBackground>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, marginBottom: 8 },
  title: { fontSize: 18, fontWeight: "700" },
  status: { fontSize: 12 },
  pinned: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 14,
    marginBottom: 8,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  pinnedLabel: { fontSize: 11, fontWeight: "700" },
  pinnedLink: { fontSize: 12, marginTop: 1 },
  joinText: { fontWeight: "700", fontSize: 14 },
  noPin: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginHorizontal: 14,
    marginBottom: 8,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  noPinText: { fontSize: 12 },
  row: { marginVertical: 4, flexDirection: "row" },
  rowMine: { justifyContent: "flex-end" },
  rowOther: { justifyContent: "flex-start" },
  bubble: { maxWidth: "78%", borderRadius: 16, paddingHorizontal: 13, paddingVertical: 9 },
  sender: { fontSize: 11, fontWeight: "700", marginBottom: 3 },
  empty: { textAlign: "center", marginTop: 30 },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    maxHeight: 110,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
});

