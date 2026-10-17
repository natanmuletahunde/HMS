"use client";

import { useState, useRef, useEffect } from "react";
import { Bot, X, Send } from "lucide-react";
import { apiFetch } from "@/lib/api";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const QUICK_CHIPS = [
  "Today occupancy?",
  "Revenue this month?",
  "Open complaints?",
  "Low stock items?",
  "Active reservations?",
];

export default function AiAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  async function sendMessage(text: string) {
    if (!text.trim()) return;
    const userMsg: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const [statsData, invData, csData] = await Promise.all([
        apiFetch<any>("/dashboard/stats").catch(() => ({})),
        apiFetch<any>("/inventory/dashboard").catch(() => ({})),
        apiFetch<any>("/customer-service/dashboard").catch(() => ({})),
      ]);

      const lower = text.toLowerCase();
      let response = "";

      if (lower.includes("occupancy")) {
        response = `Current occupancy: ${statsData.occupancyRate ?? 0}% (${statsData.occupiedRooms ?? 0}/${statsData.totalRooms ?? 0} rooms)`;
      } else if (lower.includes("revenue")) {
        response = `Today revenue: $${Number(statsData.revenueToday ?? 0).toFixed(2)}`;
      } else if (lower.includes("complaint")) {
        response = `Open complaints: ${csData.newCount ?? 0} new, ${csData.inProgress ?? 0} in progress`;
      } else if (lower.includes("stock") || lower.includes("inventory")) {
        response = `Inventory: ${invData.lowStock ?? 0} low stock, ${invData.outOfStock ?? 0} out of stock`;
      } else if (lower.includes("reservation") || lower.includes("booking")) {
        response = `Active reservations: ${statsData.activeReservations ?? statsData.occupiedRooms ?? "N/A"}`;
      } else if (lower.includes("guest")) {
        response = `Total guests: ${statsData.totalGuests ?? "N/A"}`;
      } else {
        response = `Summary: Occupancy ${statsData.occupancyRate ?? 0}%, Rooms ${statsData.occupiedRooms ?? 0}/${statsData.totalRooms ?? 0}, Complaints ${csData.newCount ?? 0} new`;
      }

      setMessages((prev) => [...prev, { role: "assistant", content: response }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, I couldn't retrieve that information right now." }]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors"
          aria-label="Open AI Assistant"
        >
          <Bot className="h-6 w-6" />
        </button>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed right-0 bottom-0 z-50 w-96 h-[580px] flex flex-col bg-background border-l border-t border-border shadow-2xl rounded-tl-xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              <span className="font-semibold text-sm">HMS Assistant</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="p-1 rounded hover:bg-muted transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Chat Area */}
          <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="space-y-3">
                <p className="text-xs text-text-muted text-center">Ask me anything about the hotel</p>
                <div className="flex flex-wrap gap-2">
                  {QUICK_CHIPS.map((chip) => (
                    <button
                      key={chip}
                      onClick={() => sendMessage(chip)}
                      className="border border-border rounded-full px-3 py-1 text-xs cursor-pointer hover:bg-muted transition-colors"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-xs rounded-lg p-3 text-sm ${
                    msg.role === "user"
                      ? "bg-primary/10 ml-auto"
                      : "bg-muted mr-auto"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg p-3 text-sm mr-auto">
                  <span className="inline-flex gap-1">
                    <span className="w-1.5 h-1.5 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="border-t border-border p-3 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
              placeholder="Ask about occupancy, revenue..."
              className="flex-1 rounded-md border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              disabled={isLoading}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isLoading}
              className="p-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
