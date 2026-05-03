import Link from "next/link";
import { notFound } from "next/navigation";

import { getTraceDetail } from "@/lib/repository";

export default async function TraceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { trace, toolCalls } = await getTraceDetail(id);

  if (!trace) notFound();

  return (
    <div className="grid">
      <section className="panel panel-pad">
        <p className="kicker">Trace</p>
        <h1 className="headline">{trace.agent}</h1>
        <p className="subhead">
          {trace.startedAt.toLocaleString()} · {trace.status} · {trace.model}
        </p>
      </section>

      <section className="panel panel-pad">
        <h2 className="section-title">Output</h2>
        <p>{trace.outputText}</p>
      </section>

      <section className="panel panel-pad">
        <h2 className="section-title">Usage</h2>
        <div className="metric-row">
          <div className="metric">
            <strong>{trace.tokensIn}</strong>
            <span>Input tokens</span>
          </div>
          <div className="metric">
            <strong>{trace.tokensOut}</strong>
            <span>Output tokens</span>
          </div>
          <div className="metric">
            <strong>${trace.costUsd}</strong>
            <span>Cost</span>
          </div>
        </div>
      </section>

      <section className="panel panel-pad">
        <h2 className="section-title">Tool Calls</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Args</th>
              <th>Result</th>
              <th>Error</th>
            </tr>
          </thead>
          <tbody>
            {toolCalls.map((call) => (
              <tr key={call.id}>
                <td>{call.name}</td>
                <td>
                  <code>{JSON.stringify(call.argsJsonb)}</code>
                </td>
                <td>
                  <code>{JSON.stringify(call.resultJsonb)}</code>
                </td>
                <td>{call.error}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <Link className="button" href="/traces">
        Back
      </Link>
    </div>
  );
}
