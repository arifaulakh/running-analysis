import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { getTraceDetail } from "@/lib/repository";

function statusVariant(
  status: string
): "success" | "destructive" | "warning" | "secondary" {
  if (status === "ok" || status === "completed" || status === "success") return "success";
  if (status === "error" || status === "failed") return "destructive";
  if (status === "pending" || status === "running") return "warning";
  return "secondary";
}

export default async function TraceDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { trace, toolCalls } = await getTraceDetail(id);

  if (!trace) notFound();

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <Link
          href="/traces"
          className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          All traces
        </Link>
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Trace
          </span>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              {trace.agent}
            </h1>
            <Badge variant={statusVariant(trace.status)}>{trace.status}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {trace.startedAt.toLocaleString()}
            <span className="mx-2 text-border">·</span>
            <span className="font-mono text-xs">{trace.model}</span>
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold tracking-tight">Output</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
            {trace.outputText}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold tracking-tight">Usage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Input tokens
              </span>
              <span className="font-mono text-2xl font-semibold tracking-tight">
                {trace.tokensIn}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Output tokens
              </span>
              <span className="font-mono text-2xl font-semibold tracking-tight">
                {trace.tokensOut}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Cost
              </span>
              <span className="font-mono text-2xl font-semibold tracking-tight">
                ${trace.costUsd}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold tracking-tight">Tool Calls</CardTitle>
          <CardDescription>
            {toolCalls.length === 0
              ? "No tool calls were issued."
              : `${toolCalls.length} call${toolCalls.length === 1 ? "" : "s"}.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Args</TableHead>
                <TableHead>Result</TableHead>
                <TableHead>Error</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {toolCalls.map((call) => (
                <TableRow key={call.id}>
                  <TableCell className="text-sm font-medium">{call.name}</TableCell>
                  <TableCell className="max-w-[280px]">
                    <code className="block truncate rounded bg-muted px-2 py-1 font-mono text-xs text-muted-foreground">
                      {JSON.stringify(call.argsJsonb)}
                    </code>
                  </TableCell>
                  <TableCell className="max-w-[320px]">
                    <code className="block truncate rounded bg-muted px-2 py-1 font-mono text-xs text-muted-foreground">
                      {JSON.stringify(call.resultJsonb)}
                    </code>
                  </TableCell>
                  <TableCell className="text-sm text-destructive">
                    {call.error}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div>
        <Button asChild variant="outline">
          <Link href="/traces">
            <ArrowLeft className="h-4 w-4" />
            Back to traces
          </Link>
        </Button>
      </div>
    </div>
  );
}
