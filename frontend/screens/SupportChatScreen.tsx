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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Client } from "@stomp/stompjs";
import SkyBackground from "./SkyBackground";
import { useTheme } from "../ThemeContext";
import { session, groupMessages, WS_URL } from "../api";
import type { ChatMessage, StackProps, User } from "../types";

export default function SupportChatScreen({ route, navigation }: StackProps<"SupportChat">) {
  const insets = useSafeAreaInsets();
  const { colors, isDarkMode } = useTheme();
  const { recipientId, recipientName, roomKey } = route.params;
  const me = (session.user ?? ({} as User)) as User;
  const isAdmin = me?.userType === "ADMIN";

  const channel = roomKey;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
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
  }, [channel, addMessage]);

  const send = () => {
    const body = text.trim();
    if (!body || !clientRef.current || !connected) return;
    clientRef.current.publish({
      destination: "/app/group/" + channel,
      body: JSON.stringify({ senderId: me.userId, senderName: me.username, body }),
    });
    setText("");
  };

  const renderItem = ({ item }: { item: ChatMessage }) => {
    const mine = item.senderId === me.userId;
    return (
      <View style={[styles.row, mine ? styles.rowMine : styles.rowOther]}>
        {!mine && (
          <View style={[styles.avatarCircle, { backgroundColor: colors.surfaceHover }]}>
            <Ionicons name={isAdmin ? "person" : "headset"} size={14} color={colors.blue} />
          </View>
        )}
        <View
          style={[
            styles.bubble,
            mine
              ? { backgroundColor: colors.blue, borderBottomRightRadius: 4 }
              : { backgroundColor: colors.darkGray, borderColor: colors.cardBorder, borderWidth: 1, borderBottomLeftRadius: 4 },
          ]}
        >
          {!mine && <Text style={[styles.sender, { color: colors.blue }]}>{item.senderName || item.senderId}</Text>}
          <Text style={{ color: mine ? "#FFFFFF" : colors.white, fontSize: 15, lineHeight: 20 }}>{item.body}</Text>
          {item.sentAt && (
            <Text style={[styles.timestamp, { color: mine ? "rgba(255,255,255,0.7)" : colors.textMuted }]}>
              {new Date(item.sentAt as string).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </Text>
          )}
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
          <View style={[styles.headerAvatar, { backgroundColor: colors.surfaceHover }]}>
            <Ionicons name={isAdmin ? "person" : "headset"} size={18} color={colors.blue} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.white }]}>{recipientName || "Support Agent"}</Text>
            <Text style={[styles.status, { color: connected ? colors.green : colors.textMuted }]}>
              {connected
                ? isAdmin
                  ? "User Online"
                  : "Support Online"
                : "Connecting..."}
            </Text>
          </View>
          {connected && <View style={[styles.onlineDot, { backgroundColor: colors.green }]} />}
        </View>

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
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="chatbubbles-outline" size={40} color={colors.textMuted} />
                <Text style={[styles.empty, { color: colors.textMuted }]}>
                  {isAdmin
                    ? "No messages from this user yet."
                    : "Ask us anything! We're happy to help."}
                </Text>
              </View>
            }
          />
        )}

        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={8}>
          <View style={[styles.inputBar, { backgroundColor: colors.darkGray, borderColor: colors.cardBorder, borderTopWidth: 1, paddingBottom: insets.bottom + 8 }]}>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surfaceHover, borderColor: colors.cardBorder, color: colors.white }]}
              placeholder={isAdmin ? "Reply to user..." : "Type your message..."}
              placeholderTextColor={colors.textMuted}
              value={text}
              onChangeText={setText}
              multiline
            />
            <TouchableOpacity
              style={[styles.sendBtn, { backgroundColor: colors.blue }, (!text.trim() || !connected) && { opacity: 0.5 }]}
              onPress={send}
              activeOpacity={0.85}
              disabled={!text.trim() || !connected}
            >
              <Ionicons name="send" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </SkyBackground>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  onlineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 4,
  },
  title: { fontSize: 17, fontWeight: "700" },
  status: { fontSize: 12, marginTop: 1 },
  row: { marginVertical: 4, flexDirection: "row", alignItems: "flex-end", gap: 6 },
  rowMine: { justifyContent: "flex-end" },
  rowOther: { justifyContent: "flex-start" },
  avatarCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  bubble: { maxWidth: "78%", borderRadius: 18, paddingHorizontal: 14, paddingVertical: 9 },
  sender: { fontSize: 11, fontWeight: "700", marginBottom: 3 },
  timestamp: { fontSize: 10, marginTop: 4, alignSelf: "flex-end" },
  emptyContainer: { alignItems: "center", marginTop: 60, gap: 12 },
  empty: { textAlign: "center", fontSize: 14, paddingHorizontal: 30 },
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
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  sendBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },
});

