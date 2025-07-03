// src/pages/AiChatPage.jsx
import { useEffect, useRef, useState } from "react";

const AiChatPage = () => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showRefreshModal, setShowRefreshModal] = useState(false);

  const messagesEndRef = useRef(null);
  const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
  const STORAGE_KEY = "ai-chat-messages";
  const STORAGE_TIME_KEY = "ai-chat-timestamp";
  const MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes

  useEffect(() => {
    const savedMessages = localStorage.getItem(STORAGE_KEY);
    const timestamp = localStorage.getItem(STORAGE_TIME_KEY);
    const now = Date.now();

    if (savedMessages && timestamp && now - Number(timestamp) < MAX_AGE_MS) {
      setMessages(JSON.parse(savedMessages));
    }
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
      localStorage.setItem(STORAGE_TIME_KEY, Date.now().toString());
    }
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      const last = localStorage.getItem(STORAGE_TIME_KEY);
      const now = Date.now();
      if (last && now - Number(last) < MAX_AGE_MS) {
        e.preventDefault();
        e.returnValue = "";
        setShowRefreshModal(true);
        return "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const userMessage = {
      id: Date.now(),
      text: inputValue,
      user: { id: "user", name: "You" },
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsTyping(true);

    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "anthropic/claude-3-haiku",
          messages: [
            {
              role: "system",
              content: `You're an AI assistant inside a MERN-stack language exchange app called Connectify.

Speak casually like an online friend 😊. Here's what you should know:

- Users register and choose native/learning languages
- They can browse users and send friend requests
- Once connected, they can chat (reply, image share, pin/unpin, mark unread)
- They can video call each other
- There are 5 static language communities + ability to create/delete their own
- There’s also this AI chat (you!) for help or fun

Tech: MERN, Tailwind, DaisyUI, TanStack, Zustand

If a user needs help using Connectify, explain it clearly and casually. Be helpful, fun, and always friendly 😄`,
            },
            ...messages.map((m) => ({
              role: m.user.id === "user" ? "user" : "assistant",
              content: m.text,
            })),
            {
              role: "user",
              content: inputValue,
            },
          ],
        }),
      });

      const data = await response.json();
      const aiText = data?.choices?.[0]?.message?.content || "Oops! I didn't get that.";

      const aiMessage = {
        id: `ai-${Date.now()}`,
        text: aiText,
        user: { id: "ai", name: "AI Buddy 🤖" },
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error("AI Error:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          text: "⚠️ Something went wrong. Please try again.",
          user: { id: "ai", name: "AI Buddy 🤖" },
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const confirmRefresh = () => {
    setShowRefreshModal(false);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_TIME_KEY);
    window.location.reload();
  };

  return (
    <div className="flex flex-col h-screen bg-base-100 text-base-content">
      <header className="navbar bg-base-200 shadow-md px-4">
        <div className="text-xl font-bold">💬 AI Buddy</div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`chat ${msg.user.id === "user" ? "chat-end" : "chat-start"}`}>
            <div className="chat-header text-sm opacity-70 mb-1">{msg.user.name}</div>
            <div
              className={`chat-bubble whitespace-pre-wrap max-w-[85%] ${
                msg.user.id === "user"
                  ? "bg-primary text-primary-content"
                  : "bg-base-300 text-base-content"
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="chat chat-start">
            <div className="chat-header text-sm opacity-70 mb-1">AI Buddy 🤖</div>
            <div className="chat-bubble bg-base-300 text-base-content">
              <span className="loading loading-dots loading-sm" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </main>

      <footer className="p-4 bg-base-200 border-t flex gap-2 items-center">
        <input
          type="text"
          className="input input-bordered input-primary flex-1"
          placeholder="Type your message..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
        />
        <button className="btn btn-primary" onClick={handleSend}>
          Send
        </button>
      </footer>

      {showRefreshModal && (
        <dialog open className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">⚠️ Refresh Warning</h3>
            <p className="py-3">
              You’re about to refresh the page. This will <strong>delete the current chat</strong>.
            </p>
            <div className="modal-action">
              <button className="btn btn-error" onClick={confirmRefresh}>
                Refresh Anyway
              </button>
              <button className="btn btn-outline" onClick={() => setShowRefreshModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </dialog>
      )}
    </div>
  );
};

export default AiChatPage;
