"use client";

import { FormEvent, useMemo, useState } from "react";

type ChatMessage = {
  role: "assistant" | "user";
  content: string;
};

export function ChatPanel({ initialMessage }: { initialMessage: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: initialMessage }
  ]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const conversationId = useMemo(() => `conversation-${crypto.randomUUID()}`, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = input.trim();
    if (!message || pending) return;

    setInput("");
    setPending(true);
    setMessages((current) => [...current, { role: "user", content: message }]);

    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message, conversationId })
    });
    const payload = (await response.json()) as { message?: string; error?: unknown };

    setMessages((current) => [
      ...current,
      {
        role: "assistant",
        content: payload.message ?? "I could not answer that cleanly. Check traces for the failure."
      }
    ]);
    setPending(false);
  }

  return (
    <section className="panel panel-pad chat" aria-label="Coach chat">
      <h2 className="section-title">Ask The Coach</h2>
      <div className="chat-log">
        {messages.map((message, index) => (
          <div className={`bubble ${message.role}`} key={`${message.role}-${index}`}>
            {message.content}
          </div>
        ))}
      </div>
      <form className="composer" onSubmit={submit}>
        <input
          aria-label="Message"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Can I add a 5K next Saturday?"
        />
        <button className="button" disabled={pending} type="submit">
          Send
        </button>
      </form>
    </section>
  );
}
