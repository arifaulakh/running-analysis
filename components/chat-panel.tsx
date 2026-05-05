"use client";

import { Send } from "lucide-react";
import { FormEvent, useMemo, useRef, useState, useEffect } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

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
  const logRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = logRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages]);

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
        content:
          payload.message ?? "I could not answer that cleanly. Check traces for the failure."
      }
    ]);
    setPending(false);
  }

  return (
    <Card
      aria-label="Coach chat"
      className="flex h-fit flex-col gap-0 self-start lg:sticky lg:top-20"
    >
      <CardHeader className="border-b border-border">
        <CardTitle className="text-base font-semibold tracking-tight">
          Ask the Coach
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 p-6">
        <div
          ref={logRef}
          className="flex max-h-[420px] min-h-[260px] flex-col gap-3 overflow-y-auto pr-1"
        >
          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={cn(
                "flex w-full",
                message.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-lg px-3.5 py-2.5 text-sm leading-relaxed",
                  message.role === "assistant"
                    ? "bg-muted text-foreground"
                    : "bg-emerald-600 text-white"
                )}
              >
                {message.content}
              </div>
            </div>
          ))}
          {pending ? (
            <div className="flex justify-start">
              <div className="rounded-lg bg-muted px-3.5 py-2.5 text-sm text-muted-foreground">
                Thinking…
              </div>
            </div>
          ) : null}
        </div>
        <form onSubmit={submit} className="flex items-center gap-2">
          <Input
            aria-label="Message"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Can I add a 5K next Saturday?"
            disabled={pending}
          />
          <Button type="submit" disabled={pending || input.trim().length === 0} size="icon">
            <Send className="h-4 w-4" />
            <span className="sr-only">Send</span>
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
