"use client";

import * as React from "react";
import { Brain, Send, Trash2, Loader2, User, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface AiAnalysisClientProps {
  translations: {
    title: string;
    subtitle: string;
    placeholder: string;
    send: string;
    thinking: string;
    exampleQueries: string;
    query1: string;
    query2: string;
    query3: string;
    query4: string;
    query5: string;
    placeholderResponse: string;
    clearChat: string;
  };
}

export function AiAnalysisClient({ translations: t }: AiAnalysisClientProps) {
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [input, setInput] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const exampleQueries = [t.query1, t.query2, t.query3, t.query4, t.query5];

  // Scroll to bottom when new messages arrive
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  async function handleSend(text?: string) {
    const messageText = text || input.trim();
    if (!messageText || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: messageText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Simulate AI thinking delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const aiMessage: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: t.placeholderResponse,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, aiMessage]);
    setIsLoading(false);
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleClearChat() {
    setMessages([]);
    setInput("");
  }

  const isEmpty = messages.length === 0;

  return (
    <div className="flex h-[calc(100vh-10rem)] flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Brain className="h-6 w-6" />
            {t.title}
          </h1>
          <p className="text-sm text-muted-foreground">{t.subtitle}</p>
        </div>
        {!isEmpty && (
          <Button variant="outline" size="sm" onClick={handleClearChat}>
            <Trash2 className="mr-1 h-4 w-4" />
            {t.clearChat}
          </Button>
        )}
      </div>

      {/* Chat Area */}
      <Card className="flex flex-1 flex-col overflow-hidden">
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          {isEmpty ? (
            /* Example queries when chat is empty */
            <div className="flex h-full flex-col items-center justify-center gap-6 py-12">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Brain className="h-8 w-8 text-primary" />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold">{t.exampleQueries}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {t.subtitle}
                </p>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 max-w-3xl">
                {exampleQueries.map((query, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    className="h-auto whitespace-normal py-3 px-4 text-left text-sm"
                    onClick={() => handleSend(query)}
                  >
                    {query}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            /* Messages */
            <div className="space-y-4 pb-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-3",
                    message.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {message.role === "assistant" && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                      <Bot className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[75%] rounded-lg px-4 py-2.5 text-sm",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    )}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    <p
                      className={cn(
                        "mt-1 text-xs",
                        message.role === "user"
                          ? "text-primary-foreground/70"
                          : "text-muted-foreground"
                      )}
                    >
                      {message.timestamp.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  {message.role === "user" && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary">
                      <User className="h-4 w-4 text-primary-foreground" />
                    </div>
                  )}
                </div>
              ))}

              {/* Loading indicator */}
              {isLoading && (
                <div className="flex gap-3 justify-start">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                    <Bot className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="rounded-lg bg-muted px-4 py-2.5 text-sm">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-muted-foreground">
                        {t.thinking}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Input Area */}
        <div className="border-t p-4">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t.placeholder}
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              size="icon"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
