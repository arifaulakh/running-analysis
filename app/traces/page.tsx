import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import type { TraceEvent } from "@/lib/db/schema";
import { getTraceList } from "@/lib/repository";

export const dynamic = "force-dynamic";

function statusVariant(
  status: string
): "success" | "destructive" | "warning" | "secondary" {
  if (status === "ok" || status === "completed" || status === "success") return "success";
  if (status === "error" || status === "failed") return "destructive";
  if (status === "pending" || status === "running") return "warning";
  return "secondary";
}

export default async function TracesPage() {
  const traces = await getTraceList();

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Traces
        </span>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Agent Runs
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Every agent invocation, with its model, cost, and resulting message.
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Started</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Model</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead>Output</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {traces.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center text-sm text-muted-foreground"
                  >
                    No traces recorded yet.
                  </TableCell>
                </TableRow>
              ) : (
                traces.map((trace: TraceEvent) => (
                  <TableRow key={trace.id}>
                    <TableCell className="font-mono text-xs">
                      <Link
                        href={`/traces/${trace.id}`}
                        className="text-foreground underline-offset-4 hover:underline"
                      >
                        {trace.startedAt.toLocaleString()}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm">{trace.agent}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(trace.status)}>{trace.status}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {trace.model}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      ${trace.costUsd}
                    </TableCell>
                    <TableCell className="max-w-[420px] truncate text-sm text-muted-foreground">
                      {trace.outputText?.slice(0, 160)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
