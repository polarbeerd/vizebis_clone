"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  MessageCircle,
  X,
  Send,
  Users,
  MessageSquare,
  Circle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface ChatMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

interface TeamMember {
  id: string;
  full_name: string | null;
  email: string | null;
  last_seen: string | null;
}

function isOnline(lastSeen: string | null): boolean {
  if (!lastSeen) return false;
  const diff = Date.now() - new Date(lastSeen).getTime();
  return diff < 5 * 60 * 1000; // 5 minutes
}

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatMessageTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function ChatWidget() {
  const t = useTranslations("chat");
  const [isOpen, setIsOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<"users" | "chat">("users");
  const [selectedUser, setSelectedUser] = React.useState<TeamMember | null>(
    null
  );
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [teamMembers, setTeamMembers] = React.useState<TeamMember[]>([]);
  const [messageInput, setMessageInput] = React.useState("");
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [currentUserId, setCurrentUserId] = React.useState<string | null>(null);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Get current user and team members
  React.useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);

      // Fetch team members
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email, last_seen")
        .neq("id", user.id);

      if (profiles) {
        setTeamMembers(profiles as TeamMember[]);
      }

      // Fetch unread count
      const { count } = await supabase
        .from("chat_messages")
        .select("*", { count: "exact", head: true })
        .eq("receiver_id", user.id)
        .eq("is_read", false);

      setUnreadCount(count ?? 0);
    }

    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update last_seen periodically
  React.useEffect(() => {
    if (!currentUserId) return;

    const interval = setInterval(async () => {
      await supabase
        .from("profiles")
        .update({ last_seen: new Date().toISOString() })
        .eq("id", currentUserId);
    }, 60000); // every 60s

    // Update immediately
    supabase
      .from("profiles")
      .update({ last_seen: new Date().toISOString() })
      .eq("id", currentUserId);

    return () => clearInterval(interval);
  }, [currentUserId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Subscribe to realtime messages
  React.useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel("chat_messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
        },
        (payload) => {
          const newMsg = payload.new as ChatMessage;
          // If message is for or from current conversation
          if (
            selectedUser &&
            ((newMsg.sender_id === currentUserId &&
              newMsg.receiver_id === selectedUser.id) ||
              (newMsg.sender_id === selectedUser.id &&
                newMsg.receiver_id === currentUserId))
          ) {
            setMessages((prev) => [...prev, newMsg]);
          }
          // If received, increment unread
          if (
            newMsg.receiver_id === currentUserId &&
            newMsg.sender_id !== selectedUser?.id
          ) {
            setUnreadCount((prev) => prev + 1);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, selectedUser]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch messages when selecting a user
  React.useEffect(() => {
    if (!selectedUser || !currentUserId) return;

    async function fetchMessages() {
      const { data } = await supabase
        .from("chat_messages")
        .select("*")
        .or(
          `and(sender_id.eq.${currentUserId},receiver_id.eq.${selectedUser!.id}),and(sender_id.eq.${selectedUser!.id},receiver_id.eq.${currentUserId})`
        )
        .order("created_at", { ascending: true })
        .limit(100);

      if (data) {
        setMessages(data as ChatMessage[]);
      }

      // Mark as read
      await supabase
        .from("chat_messages")
        .update({ is_read: true })
        .eq("sender_id", selectedUser!.id)
        .eq("receiver_id", currentUserId!)
        .eq("is_read", false);

      // Refresh unread count
      const { count } = await supabase
        .from("chat_messages")
        .select("*", { count: "exact", head: true })
        .eq("receiver_id", currentUserId!)
        .eq("is_read", false);
      setUnreadCount(count ?? 0);
    }

    fetchMessages();
  }, [selectedUser, currentUserId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll to bottom on new messages
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSendMessage() {
    if (!messageInput.trim() || !selectedUser || !currentUserId) return;

    const { error } = await supabase.from("chat_messages").insert({
      sender_id: currentUserId,
      receiver_id: selectedUser.id,
      message: messageInput.trim(),
    });

    if (!error) {
      setMessageInput("");
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }

  function selectUser(member: TeamMember) {
    setSelectedUser(member);
    setActiveTab("chat");
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Chat Panel */}
      {isOpen && (
        <div className="mb-4 w-[350px] h-[500px] rounded-2xl border bg-background shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between bg-primary px-4 py-3 text-primary-foreground">
            <h3 className="text-sm font-semibold">{t("title")}</h3>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-primary-foreground hover:bg-primary-foreground/20"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Tabs */}
          <div className="flex border-b">
            <button
              className={cn(
                "flex-1 py-2 text-xs font-medium text-center transition-colors",
                activeTab === "users"
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setActiveTab("users")}
            >
              <Users className="inline h-3.5 w-3.5 mr-1" />
              {t("teamMembers")}
            </button>
            <button
              className={cn(
                "flex-1 py-2 text-xs font-medium text-center transition-colors",
                activeTab === "chat"
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setActiveTab("chat")}
            >
              <MessageSquare className="inline h-3.5 w-3.5 mr-1" />
              {t("messages")}
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            {activeTab === "users" ? (
              <ScrollArea className="h-full">
                <div className="p-2 space-y-1">
                  {teamMembers.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      {t("noTeamMembers")}
                    </p>
                  ) : (
                    teamMembers.map((member) => (
                      <button
                        key={member.id}
                        className="flex items-center gap-3 w-full rounded-lg p-2 hover:bg-muted/50 transition-colors text-left"
                        onClick={() => selectUser(member)}
                      >
                        <div className="relative">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className="text-xs">
                              {getInitials(member.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <Circle
                            className={cn(
                              "absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-background",
                              isOnline(member.last_seen)
                                ? "fill-green-500 text-green-500"
                                : "fill-gray-400 text-gray-400"
                            )}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">
                            {member.full_name || member.email}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {isOnline(member.last_seen)
                              ? t("online")
                              : t("offline")}
                          </p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </ScrollArea>
            ) : selectedUser ? (
              <div className="flex flex-col h-full">
                {/* Chat header */}
                <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/30">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="text-xs">
                      {getInitials(selectedUser.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">
                      {selectedUser.full_name || selectedUser.email}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {isOnline(selectedUser.last_seen)
                        ? t("online")
                        : t("offline")}
                    </p>
                  </div>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 px-3 py-2">
                  <div className="space-y-2">
                    {messages.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-8">
                        {t("noMessages")}
                      </p>
                    )}
                    {messages.map((msg) => {
                      const isMine = msg.sender_id === currentUserId;
                      return (
                        <div
                          key={msg.id}
                          className={cn(
                            "flex",
                            isMine ? "justify-end" : "justify-start"
                          )}
                        >
                          <div
                            className={cn(
                              "max-w-[80%] rounded-2xl px-3 py-2 text-xs",
                              isMine
                                ? "bg-primary text-primary-foreground rounded-br-sm"
                                : "bg-muted rounded-bl-sm"
                            )}
                          >
                            <p>{msg.message}</p>
                            <p
                              className={cn(
                                "text-[10px] mt-1",
                                isMine
                                  ? "text-primary-foreground/70"
                                  : "text-muted-foreground"
                              )}
                            >
                              {formatMessageTime(msg.created_at)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* Input */}
                <div className="flex items-center gap-2 border-t p-2">
                  <Input
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={t("messagePlaceholder")}
                    className="h-8 text-xs"
                  />
                  <Button
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={handleSendMessage}
                    disabled={!messageInput.trim()}
                  >
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <MessageSquare className="h-10 w-10 text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">
                  {t("selectUser")}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all hover:scale-105"
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <MessageCircle className="h-6 w-6" />
        )}
        {!isOpen && unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-5 min-w-[20px] rounded-full px-1 text-[10px] flex items-center justify-center"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </Badge>
        )}
      </button>
    </div>
  );
}
