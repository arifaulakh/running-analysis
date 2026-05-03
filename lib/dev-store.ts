import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type {
  Activity,
  ProceduralMemory,
  SemanticMemory,
  TraceEvent,
  ToolCall
} from "@/lib/db/schema";
import {
  seedActivities,
  seedProceduralMemory,
  seedSemanticMemory,
  seedToolCalls,
  seedTraces
} from "@/lib/db/seed";

type JsonActivity = Omit<Activity, "startTime" | "fetchedAt"> & {
  startTime: string;
  fetchedAt: string;
};

type JsonSemanticMemory = Omit<
  SemanticMemory,
  "createdAt" | "lastReinforcedAt" | "retiredAt"
> & {
  createdAt: string;
  lastReinforcedAt: string | null;
  retiredAt: string | null;
};

type JsonProceduralMemory = Omit<ProceduralMemory, "createdAt" | "retiredAt"> & {
  createdAt: string;
  retiredAt: string | null;
};

type JsonTraceEvent = Omit<TraceEvent, "startedAt" | "endedAt"> & {
  startedAt: string;
  endedAt: string | null;
};

type JsonToolCall = Omit<ToolCall, "startedAt" | "endedAt"> & {
  startedAt: string;
  endedAt: string | null;
};

export type DevStore = {
  activities: Activity[];
  semanticMemory: SemanticMemory[];
  proceduralMemory: ProceduralMemory[];
  traces: TraceEvent[];
  toolCalls: ToolCall[];
  memoryMarkdown?: string;
};

type JsonDevStore = {
  activities: JsonActivity[];
  semanticMemory: JsonSemanticMemory[];
  proceduralMemory: JsonProceduralMemory[];
  traces: JsonTraceEvent[];
  toolCalls: JsonToolCall[];
  memoryMarkdown?: string;
};

const storePath = path.join(process.cwd(), ".context/dev-data/coach.json");

function toJsonDate(date: Date | null): string | null {
  return date ? date.toISOString() : null;
}

function activityToJson(activity: Activity): JsonActivity {
  return {
    ...activity,
    startTime: activity.startTime.toISOString(),
    fetchedAt: activity.fetchedAt.toISOString()
  };
}

function activityFromJson(activity: JsonActivity): Activity {
  return {
    ...activity,
    startTime: new Date(activity.startTime),
    fetchedAt: new Date(activity.fetchedAt)
  };
}

function semanticToJson(memory: SemanticMemory): JsonSemanticMemory {
  return {
    ...memory,
    createdAt: memory.createdAt.toISOString(),
    lastReinforcedAt: toJsonDate(memory.lastReinforcedAt),
    retiredAt: toJsonDate(memory.retiredAt)
  };
}

function semanticFromJson(memory: JsonSemanticMemory): SemanticMemory {
  return {
    ...memory,
    createdAt: new Date(memory.createdAt),
    lastReinforcedAt: memory.lastReinforcedAt ? new Date(memory.lastReinforcedAt) : null,
    retiredAt: memory.retiredAt ? new Date(memory.retiredAt) : null
  };
}

function proceduralToJson(memory: ProceduralMemory): JsonProceduralMemory {
  return {
    ...memory,
    createdAt: memory.createdAt.toISOString(),
    retiredAt: toJsonDate(memory.retiredAt)
  };
}

function proceduralFromJson(memory: JsonProceduralMemory): ProceduralMemory {
  return {
    ...memory,
    createdAt: new Date(memory.createdAt),
    retiredAt: memory.retiredAt ? new Date(memory.retiredAt) : null
  };
}

function traceToJson(trace: TraceEvent): JsonTraceEvent {
  return {
    ...trace,
    startedAt: trace.startedAt.toISOString(),
    endedAt: toJsonDate(trace.endedAt)
  };
}

function traceFromJson(trace: JsonTraceEvent): TraceEvent {
  return {
    ...trace,
    startedAt: new Date(trace.startedAt),
    endedAt: trace.endedAt ? new Date(trace.endedAt) : null
  };
}

function toolCallToJson(call: ToolCall): JsonToolCall {
  return {
    ...call,
    startedAt: call.startedAt.toISOString(),
    endedAt: toJsonDate(call.endedAt)
  };
}

function toolCallFromJson(call: JsonToolCall): ToolCall {
  return {
    ...call,
    startedAt: new Date(call.startedAt),
    endedAt: call.endedAt ? new Date(call.endedAt) : null
  };
}

function seededStore(): DevStore {
  return {
    activities: seedActivities,
    semanticMemory: seedSemanticMemory,
    proceduralMemory: seedProceduralMemory,
    traces: seedTraces,
    toolCalls: seedToolCalls
  };
}

function toJson(store: DevStore): JsonDevStore {
  return {
    activities: store.activities.map(activityToJson),
    semanticMemory: store.semanticMemory.map(semanticToJson),
    proceduralMemory: store.proceduralMemory.map(proceduralToJson),
    traces: store.traces.map(traceToJson),
    toolCalls: store.toolCalls.map(toolCallToJson),
    memoryMarkdown: store.memoryMarkdown
  };
}

function fromJson(store: JsonDevStore): DevStore {
  return {
    activities: store.activities.map(activityFromJson),
    semanticMemory: store.semanticMemory.map(semanticFromJson),
    proceduralMemory: store.proceduralMemory.map(proceduralFromJson),
    traces: store.traces.map(traceFromJson),
    toolCalls: store.toolCalls.map(toolCallFromJson),
    memoryMarkdown: store.memoryMarkdown
  };
}

export async function readDevStore(): Promise<DevStore> {
  try {
    const raw = await readFile(storePath, "utf8");
    return fromJson(JSON.parse(raw) as JsonDevStore);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }

    const store = seededStore();
    await writeDevStore(store);
    return store;
  }
}

export async function writeDevStore(store: DevStore): Promise<void> {
  await mkdir(path.dirname(storePath), { recursive: true });
  await writeFile(storePath, `${JSON.stringify(toJson(store), null, 2)}\n`);
}

export async function updateDevStore(mutator: (store: DevStore) => void): Promise<DevStore> {
  const store = await readDevStore();
  mutator(store);
  await writeDevStore(store);
  return store;
}
