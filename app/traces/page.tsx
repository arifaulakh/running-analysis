import Link from "next/link";

import type { TraceEvent } from "@/lib/db/schema";
import { getTraceList } from "@/lib/repository";

export const dynamic = "force-dynamic";

export default async function TracesPage() {
  const traces = await getTraceList();

  return (
    <div className="grid">
      <section className="panel panel-pad">
        <p className="kicker">Traces</p>
        <h1 className="headline">Agent Runs</h1>
      </section>

      <section className="panel panel-pad">
        <table className="table">
          <thead>
            <tr>
              <th>Started</th>
              <th>Agent</th>
              <th>Status</th>
              <th>Model</th>
              <th>Cost</th>
              <th>Output</th>
            </tr>
          </thead>
          <tbody>
            {traces.map((trace: TraceEvent) => (
              <tr key={trace.id}>
                <td>
                  <Link href={`/traces/${trace.id}`}>{trace.startedAt.toLocaleString()}</Link>
                </td>
                <td>{trace.agent}</td>
                <td>{trace.status}</td>
                <td>{trace.model}</td>
                <td>${trace.costUsd}</td>
                <td>{trace.outputText?.slice(0, 120)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
