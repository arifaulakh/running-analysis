"use client";

import { Check } from "lucide-react";
import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function MemoryEditor({ markdown }: { markdown: string }) {
  const [value, setValue] = useState(markdown);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("saving");
    await fetch("/api/memory", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ markdown: value })
    });
    setStatus("saved");
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Textarea
        aria-label="Memory markdown"
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          setStatus("idle");
        }}
        className="min-h-[320px] resize-vertical font-mono text-sm leading-relaxed"
      />
      <div className="flex items-center justify-between">
        <span
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground"
          aria-live="polite"
        >
          {status === "saved" ? (
            <>
              <Check className="h-4 w-4 text-emerald-600" />
              Saved
            </>
          ) : status === "saving" ? (
            "Saving…"
          ) : (
            ""
          )}
        </span>
        <Button type="submit" disabled={status === "saving"}>
          Save
        </Button>
      </div>
    </form>
  );
}
