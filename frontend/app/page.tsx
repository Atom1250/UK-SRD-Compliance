"use client";

import { useEffect, useState } from "react";

type Message = {
  id: string;
  author: "system" | "client";
  text: string;
};

type SessionResponse = {
  session: {
    id: string;
    stage: string;
  };
  messages: string[];
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:4000";

export default function HomePage() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [stage, setStage] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const createSession = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE}/sessions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" }
        });

        if (!response.ok) {
          throw new Error(`Failed to create session: ${response.statusText}`);
        }

        const data: SessionResponse = await response.json();
        setSessionId(data.session.id);
        setStage(data.session.stage);
        setMessages((prev) => [
          ...prev,
          ...data.messages.map((text) => ({
            id: crypto.randomUUID(),
            author: "system" as const,
            text
          }))
        ]);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "An unknown error occurred"
        );
      } finally {
        setLoading(false);
      }
    };

    if (!sessionId) {
      createSession();
    }
  }, [sessionId]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!sessionId || !input.trim()) {
      return;
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      author: "client",
      text: input.trim()
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/sessions/${sessionId}/advance`, {
        method: "POST"
      });

      if (!response.ok) {
        throw new Error("Unable to progress the conversation");
      }

      const data: SessionResponse & { completed: boolean } = await response.json();
      setStage(data.session.stage);
      setMessages((prev) => [
        ...prev,
        ...data.messages.map((text) => ({
          id: crypto.randomUUID(),
          author: "system" as const,
          text
        }))
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="chat">
      <div className="panel status">
        <div>
          <h2>Conversation state</h2>
          <p>Session ID: {sessionId ?? "initialising..."}</p>
        </div>
        <span>{stage ?? "Loading"}</span>
      </div>

      <div className="chat-wrapper">
        <ul className="messages">
          {messages.map((message) => (
            <li
              key={message.id}
              className={`message message--${message.author}`}
            >
              <small>{message.author === "system" ? "Assistant" : "You"}</small>
              <span>{message.text}</span>
            </li>
          ))}
        </ul>

        <form onSubmit={handleSubmit} className="composer">
          <label htmlFor="chat-input">
            Respond to continue the prototype conversation
          </label>
          <textarea
            id="chat-input"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Type your response here..."
          />
          <button type="submit" disabled={loading}>
            {loading ? "Processing..." : "Send"}
          </button>
          {error && <p className="error">{error}</p>}
        </form>
      </div>
    </section>
  );
}
