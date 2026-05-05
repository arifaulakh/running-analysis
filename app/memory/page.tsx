import { MemoryEditor } from "@/components/memory-editor";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Memory
        </span>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Readable State
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          The coach&apos;s long-running notes and rules. Edit freely; saves persist as a
          markdown override.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold tracking-tight">
            Notebook
          </CardTitle>
          <CardDescription>
            Markdown is rendered as-is. Headings group sections.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MemoryEditor markdown={markdown} />
        </CardContent>
      </Card>
    </div>
  );
}
