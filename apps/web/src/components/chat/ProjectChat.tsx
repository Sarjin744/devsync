'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getSocket } from '@/lib/socket';
import apiClient from '@/lib/api';
import { getInitials } from '@/lib/utils';
import {
  Send,
  Loader2,
  MessageSquare,
  Wifi,
  WifiOff,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface MessageSender {
  id: string;
  name: string;
  email: string;
  profileImage: string | null;
  bio: string | null;
}

interface ChatMessage {
  id: string;
  content: string;
  projectId: string;
  senderId: string;
  createdAt: string;
  updatedAt: string;
  sender: MessageSender;
}

interface ProjectMemberItem {
  id: string;
  userId: string;
  role: string;
  user: {
    id: string;
    name: string;
    email: string;
    profileImage: string | null;
  };
}

export function ProjectChat({
  projectId,
  members = [],
}: {
  projectId: string;
  members: ProjectMemberItem[];
}) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map());
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Fetch initial message history
  const fetchMessages = useCallback(async (targetPage = 1) => {
    try {
      if (targetPage > 1) setIsLoadingMore(true);
      const res = await apiClient.get(`/api/projects/${projectId}/messages?page=${targetPage}&limit=40`);
      const payload = res.data.data;
      const fetched: ChatMessage[] = payload?.messages || payload || [];
      const pagination = payload?.pagination || res.data?.pagination;

      if (targetPage === 1) {
        setMessages(fetched);
      } else {
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const newItems = fetched.filter((m) => !existingIds.has(m.id));
          return [...newItems, ...prev];
        });
      }

      if (pagination) {
        setHasMore(targetPage < pagination.totalPages);
      }
    } catch {
      toast.error('Failed to load message history');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchMessages(1);
  }, [fetchMessages]);

  // 2. Connect to Socket.IO and register listeners
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '';
    const socket = getSocket(token);

    if (!socket.connected) {
      socket.connect();
    }

    const onConnect = () => {
      setIsConnected(true);
      socket.emit('project:join', { projectId });
    };

    const onDisconnect = () => {
      setIsConnected(false);
    };

    const onNewMessage = (msg: ChatMessage) => {
      if (msg.projectId === projectId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
    };

    const onTypingUpdate = (data: { projectId: string; userId: string; userName?: string; isTyping: boolean }) => {
      if (data.projectId === projectId && data.userId !== user?.id) {
        setTypingUsers((prev) => {
          const next = new Map(prev);
          if (data.isTyping) {
            const member = members.find((m) => m.userId === data.userId);
            const name = data.userName || member?.user.name || 'A team member';
            next.set(data.userId, name);
          } else {
            next.delete(data.userId);
          }
          return next;
        });
      }
    };

    const onPresenceSync = (data: { projectId: string; onlineUserIds: string[] }) => {
      if (data.projectId === projectId) {
        setOnlineUserIds(new Set(data.onlineUserIds));
      }
    };

    const onPresenceOnline = (data: { projectId: string; userId: string }) => {
      if (data.projectId === projectId) {
        setOnlineUserIds((prev) => new Set([...prev, data.userId]));
      }
    };

    const onPresenceOffline = (data: { projectId: string; userId: string }) => {
      if (data.projectId === projectId) {
        setOnlineUserIds((prev) => {
          const next = new Set(prev);
          next.delete(data.userId);
          return next;
        });
      }
    };

    const onError = (err: { code?: string; message?: string }) => {
      if (err.message) toast.error(err.message);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('message:new', onNewMessage);
    socket.on('message:received', onNewMessage);
    socket.on('typing:update', onTypingUpdate);
    socket.on('presence:sync', onPresenceSync);
    socket.on('presence:online', onPresenceOnline);
    socket.on('presence:offline', onPresenceOffline);
    socket.on('error', onError);

    if (socket.connected) {
      onConnect();
    }

    return () => {
      socket.emit('project:leave', { projectId });
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('message:new', onNewMessage);
      socket.off('message:received', onNewMessage);
      socket.off('typing:update', onTypingUpdate);
      socket.off('presence:sync', onPresenceSync);
      socket.off('presence:online', onPresenceOnline);
      socket.off('presence:offline', onPresenceOffline);
      socket.off('error', onError);
    };
  }, [projectId, user?.id, members]);

  // 3. Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  // 4. Handle text change & typing indicator
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '';
    const socket = getSocket(token);

    if (socket && socket.connected) {
      socket.emit('typing:start', { projectId });

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing:stop', { projectId });
      }, 2000);
    }
  };

  // 5. Send message handler
  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed) return;

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '';
    const socket = getSocket(token);

    if (!socket || !socket.connected) {
      toast.error('Chat is disconnected. Reconnecting...');
      return;
    }

    // Stop typing state immediately
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    socket.emit('typing:stop', { projectId });

    // Emit message to server
    socket.emit('message:send', {
      projectId,
      content: trimmed,
    });

    setInputText('');
  };

  const typingNames = Array.from(typingUsers.values());

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col h-[650px] overflow-hidden">
      {/* Chat Header */}
      <div className="p-4 px-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <MessageSquare size={20} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-sm">Project Discussion</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                  isConnected ? 'text-emerald-600' : 'text-amber-600'
                }`}
              >
                {isConnected ? <Wifi size={11} /> : <WifiOff size={11} />}
                {isConnected ? 'Live Connected' : 'Connecting...'}
              </span>
              <span className="text-gray-300">•</span>
              <span className="text-[11px] text-gray-500 font-medium">
                {onlineUserIds.size} online
              </span>
            </div>
          </div>
        </div>

        {/* Member presence pills */}
        <div className="hidden sm:flex items-center gap-1.5 overflow-x-auto max-w-xs">
          {members.slice(0, 5).map((m) => {
            const isOnline = onlineUserIds.has(m.userId);
            return (
              <div
                key={m.userId}
                className="relative group cursor-pointer"
                title={`${m.user.name} (${isOnline ? 'Online' : 'Offline'})`}
              >
                <div className="w-7 h-7 rounded-full bg-gray-200 text-gray-700 text-xs font-bold flex items-center justify-center">
                  {getInitials(m.user.name)}
                </div>
                <span
                  className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${
                    isOnline ? 'bg-emerald-500' : 'bg-gray-300'
                  }`}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Message List */}
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-6 space-y-4">
        {hasMore && (
          <div className="text-center pb-2">
            <button
              onClick={() => {
                const nextPage = page + 1;
                setPage(nextPage);
                fetchMessages(nextPage);
              }}
              disabled={isLoadingMore}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-xl transition"
            >
              {isLoadingMore ? 'Loading older messages...' : 'Load older messages'}
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <Loader2 className="animate-spin text-indigo-600" size={28} />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
              <MessageSquare size={22} />
            </div>
            <h4 className="font-semibold text-gray-800 text-sm">No messages yet</h4>
            <p className="text-xs text-gray-400 mt-1 max-w-xs">
              Start the conversation with your team by sending a message below.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isSelf = msg.senderId === user?.id;
            const senderName = msg.sender?.name || 'DevSync User';

            return (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-[80%] ${isSelf ? 'ml-auto flex-row-reverse' : ''}`}
              >
                {!isSelf && (
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center flex-shrink-0 mt-1">
                    {getInitials(senderName)}
                  </div>
                )}

                <div className={`space-y-1 ${isSelf ? 'items-end' : 'items-start'}`}>
                  {!isSelf && (
                    <span className="text-[11px] font-semibold text-gray-600 ml-1">
                      {senderName}
                    </span>
                  )}

                  <div
                    className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      isSelf
                        ? 'bg-indigo-600 text-white rounded-br-xs'
                        : 'bg-gray-100 text-gray-900 rounded-bl-xs'
                    }`}
                  >
                    {msg.content}
                  </div>

                  <span
                    className={`block text-[10px] text-gray-400 ${
                      isSelf ? 'text-right pr-1' : 'pl-1'
                    }`}
                  >
                    {new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing Indicator Bar */}
      {typingNames.length > 0 && (
        <div className="px-6 py-1.5 bg-gray-50/50 border-t border-gray-100 text-xs text-gray-500 italic flex items-center gap-1.5">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
          {typingNames.length === 1
            ? `${typingNames[0]} is typing...`
            : `${typingNames.join(', ')} are typing...`}
        </div>
      )}

      {/* Message Input Form */}
      <form
        onSubmit={handleSendMessage}
        className="p-4 border-t border-gray-100 bg-white flex items-center gap-3"
      >
        <input
          type="text"
          value={inputText}
          onChange={handleInputChange}
          placeholder={isConnected ? 'Type your message...' : 'Connecting to chat...'}
          disabled={!isConnected}
          className="flex-1 text-sm px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50"
        />
        <button
          type="submit"
          disabled={!inputText.trim() || !isConnected}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white p-2.5 rounded-xl transition shadow-sm flex items-center justify-center flex-shrink-0"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
