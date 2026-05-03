import { MemoryEditor } from "@/components/memory-editor";
import { getActiveMemory, getMemoryMarkdownOverride } from "@/lib/repository";

export const dynamic = "force-dynamic";

function memoryMarkdown(memory: Awaited<ReturnType<typeof getActiveMemory>>) {
  const semantic = memory.semantic
    .map((item) => `- [${item.id}] ${item.claimText} (${item.confidence})`)
    .join("\n");
  const procedural = memory.procedural.map((item) => `- [${item.id}] ${item.ruleText}`).join("\n");

  return [
    "# What I'm Watching",
    semantic || "- Nothing promoted yet.",
    "",
    "# Rules You've Set",
    procedural || "- No rules yet."
  ].join("\n");
}

export default async function MemoryPage() {
  const memory = await getActiveMemory();
  const markdown = (await getMemoryMarkdownOverride()) ?? memoryMarkdown(memory);

  return (
    <div className="grid">
      <section className="panel panel-pad">
        <p className="kicker">Memory</p>
        <h1 className="headline">Readable State</h1>
      </section>

      <section className="panel panel-pad">
        <MemoryEditor markdown={markdown} />
      </section>
    </div>
  );
}
