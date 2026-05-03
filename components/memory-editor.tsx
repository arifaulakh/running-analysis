"use client";

import { FormEvent, useState } from "react";

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
    <form className="grid" onSubmit={submit}>
      <textarea
        aria-label="Memory markdown"
        className="memory-editor"
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          setStatus("idle");
        }}
      />
      <div className="row">
        <span className="muted">{status === "saved" ? "Saved locally" : " "}</span>
        <button className="button" type="submit" disabled={status === "saving"}>
          Save
        </button>
      </div>
    </form>
  );
}
