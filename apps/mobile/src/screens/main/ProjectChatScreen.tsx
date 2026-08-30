import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { getMobileSocket } from '../../services/socket';
import type { Socket } from 'socket.io-client';

interface ChatMessage {
  id: string;
  content: string;
  projectId: string;
  senderId: string;
  createdAt: string;
  sender?: {
    id: string;
    name: string;
    email: string;
  };
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

export default function ProjectChatScreen({
  route,
  navigation,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  route: { params?: { projectId?: string; projectName?: string } };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  navigation: any;
}) {
  const projectId = route?.params?.projectId || '';
  const projectName = route?.params?.projectName || 'Project Chat';

  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  const socketRef = useRef<Socket | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    navigation.setOptions({ title: projectName });
  }, [navigation, projectName]);

  // 1. Fetch message history
  const loadMessages = useCallback(async () => {
    if (!projectId) return;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = (await api.getMessages(projectId, 1)) as any;
      const fetched: ChatMessage[] = res?.messages || res || [];
      setMessages(fetched);
    } catch {
      Alert.alert('Error', 'Failed to load messages');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // 2. Setup Socket.IO connection
  useEffect(() => {
    if (!projectId) return;
    let activeSocket: Socket;

    getMobileSocket().then((s) => {
      activeSocket = s;
      socketRef.current = s;

      if (!s.connected) {
        s.connect();
      }

      s.on('connect', () => {
        setIsConnected(true);
        s.emit('project:join', { projectId });
      });

      s.on('disconnect', () => {
        setIsConnected(false);
      });

      s.on('message:new', (msg: ChatMessage) => {
        if (msg.projectId === projectId) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        }
      });

      s.on('message:received', (msg: ChatMessage) => {
        if (msg.projectId === projectId) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        }
      });

      s.on(
        'typing:update',
        (data: { projectId: string; userId: string; userName?: string; isTyping: boolean }) => {
          if (data.projectId === projectId && data.userId !== user?.id) {
            const name = data.userName || 'Someone';
            setTypingUsers((prev) => {
              if (data.isTyping) {
                return prev.includes(name) ? prev : [...prev, name];
              } else {
                return prev.filter((n) => n !== name);
              }
            });
          }
        },
      );

      if (s.connected) {
        setIsConnected(true);
        s.emit('project:join', { projectId });
      }
    });

    return () => {
      if (activeSocket) {
        activeSocket.emit('project:leave', { projectId });
        activeSocket.off('connect');
        activeSocket.off('disconnect');
        activeSocket.off('message:new');
        activeSocket.off('message:received');
        activeSocket.off('typing:update');
      }
    };
  }, [projectId, user?.id]);

  // 3. Handle typing
  const handleTextChange = (text: string) => {
    setInputText(text);

    if (socketRef.current?.connected) {
      socketRef.current.emit('typing:start', { projectId });

      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => {
        socketRef.current?.emit('typing:stop', { projectId });
      }, 2000);
    }
  };

  // 4. Send message
  const handleSend = () => {
    const trimmed = inputText.trim();
    if (!trimmed) return;

    if (!socketRef.current?.connected) {
      Alert.alert('Disconnected', 'Connecting to chat server...');
      return;
    }

    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    socketRef.current.emit('typing:stop', { projectId });

    socketRef.current.emit('message:send', {
      projectId,
      content: trimmed,
    });

    setInputText('');
  };

  const renderMessageItem = ({ item }: { item: ChatMessage }) => {
    const isSelf = item.senderId === user?.id;
    const senderName = item.sender?.name || item.user?.name || 'Team Member';

    return (
      <View style={[styles.messageRow, isSelf ? styles.messageRowSelf : styles.messageRowOther]}>
        {!isSelf && (
          <View style={styles.senderAvatar}>
            <Text style={styles.avatarText}>{senderName.charAt(0).toUpperCase()}</Text>
          </View>
        )}

        <View style={styles.bubbleContainer}>
          {!isSelf && <Text style={styles.senderName}>{senderName}</Text>}
          <View style={[styles.bubble, isSelf ? styles.bubbleSelf : styles.bubbleOther]}>
            <Text style={[styles.messageText, isSelf ? styles.messageTextSelf : styles.messageTextOther]}>
              {item.content}
            </Text>
          </View>
          <Text style={[styles.timeText, isSelf ? styles.timeTextSelf : styles.timeTextOther]}>
            {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Connection banner */}
      {!isConnected && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineBannerText}>Connecting to real-time chat...</Text>
        </View>
      )}

      {/* Messages list */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessageItem}
        contentContainerStyle={styles.listContent}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No messages yet</Text>
            <Text style={styles.emptySubtitle}>Say hello to your project team!</Text>
          </View>
        }
      />

      {/* Typing indicator */}
      {typingUsers.length > 0 && (
        <View style={styles.typingBar}>
          <Text style={styles.typingText}>
            {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
          </Text>
        </View>
      )}

      {/* Input bar */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={handleTextChange}
          placeholder="Type a message..."
          placeholderTextColor="#9ca3af"
          multiline
        />
        <TouchableOpacity
          style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!inputText.trim()}
        >
          <Text style={styles.sendBtnText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  offlineBanner: {
    backgroundColor: '#fef3c7',
    paddingVertical: 6,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  offlineBannerText: {
    color: '#92400e',
    fontSize: 12,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  messageRowSelf: {
    justifyContent: 'flex-end',
  },
  messageRowOther: {
    justifyContent: 'flex-start',
  },
  senderAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  avatarText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  bubbleContainer: {
    maxWidth: '78%',
  },
  senderName: {
    fontSize: 11,
    color: '#6b7280',
    marginBottom: 2,
    marginLeft: 4,
    fontWeight: '600',
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  bubbleSelf: {
    backgroundColor: '#6366f1',
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  messageTextSelf: {
    color: '#fff',
  },
  messageTextOther: {
    color: '#111827',
  },
  timeText: {
    fontSize: 10,
    color: '#9ca3af',
    marginTop: 2,
  },
  timeTextSelf: {
    textAlign: 'right',
    marginRight: 4,
  },
  timeTextOther: {
    marginLeft: 4,
  },
  typingBar: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  typingText: {
    fontSize: 12,
    color: '#6366f1',
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sendBtn: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
  sendBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
});
