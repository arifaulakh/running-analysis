import {
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex
} from "drizzle-orm/pg-core";

export const activityType = pgEnum("activity_type", ["Run", "Ride", "Workout", "Other"]);
export const confidenceLevel = pgEnum("confidence_level", ["low", "med", "high"]);
export const memorySource = pgEnum("memory_source", ["run", "web", "observer", "system"]);
export const ruleSource = pgEnum("rule_source", ["user", "agent", "system"]);
export const triggerKind = pgEnum("trigger_kind", [
  "strava_webhook",
  "cron_morning",
  "web_chat"
]);
export const triggerStatus = pgEnum("trigger_status", ["pending", "done", "failed"]);
export const agentName = pgEnum("agent_name", ["coach", "observer", "planner"]);
export const messageRole = pgEnum("message_role", ["user", "assistant", "system"]);
export const conversationChannel = pgEnum("conversation_channel", ["web"]);
export const traceStatus = pgEnum("trace_status", ["running", "done", "failed"]);
export const planPhase = pgEnum("plan_phase", ["base", "build", "peak", "taper", "race"]);

export const activities = pgTable("activities", {
  id: text("id").primaryKey(),
  startTime: timestamp("start_time", { withTimezone: true }).notNull(),
  type: activityType("type").notNull().default("Run"),
  distanceM: real("distance_m").notNull(),
  movingTimeS: integer("moving_time_s").notNull(),
  totalElevationGainM: real("total_elevation_gain_m"),
  averageHr: real("average_hr"),
  maxHr: real("max_hr"),
  averageCadence: real("average_cadence"),
  averageSpeedMps: real("average_speed_mps"),
  name: text("name").notNull(),
  mapPolyline: text("map_polyline"),
  splitsJsonb: jsonb("splits_jsonb").$type<unknown[]>(),
  rawJsonb: jsonb("raw_jsonb").$type<Record<string, unknown>>(),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow()
});

export const streams = pgTable("streams", {
  activityId: text("activity_id")
    .primaryKey()
    .references(() => activities.id, { onDelete: "cascade" }),
  dataJsonb: jsonb("data_jsonb").$type<Record<string, unknown>>().notNull(),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow()
});

export const planDays = pgTable("plan_days", {
  date: text("date").primaryKey(),
  weekNum: integer("week_num").notNull(),
  phase: planPhase("phase").notNull(),
  dayType: text("day_type").notNull(),
  prescribedDistanceKm: real("prescribed_distance_km"),
  prescribedDurationMin: integer("prescribed_duration_min"),
  prescribedPace: text("prescribed_pace"),
  notes: text("notes")
});

export const episodicMemory = pgTable(
  "episodic_memory",
  {
    id: text("id").primaryKey(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    source: memorySource("source").notNull(),
    refId: text("ref_id"),
    payloadJsonb: jsonb("payload_jsonb").$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    occurredAtIdx: index("episodic_memory_occurred_at_idx").on(table.occurredAt)
  })
);

export const semanticMemory = pgTable("semantic_memory", {
  id: text("id").primaryKey(),
  claimText: text("claim_text").notNull(),
  evidenceRefsJsonb: jsonb("evidence_refs_jsonb").$type<string[]>().notNull(),
  confidence: confidenceLevel("confidence").notNull(),
  promotedFromEpisodicIds: text("promoted_from_episodic_ids").array().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastReinforcedAt: timestamp("last_reinforced_at", { withTimezone: true }),
  supersededById: text("superseded_by_id"),
  retiredAt: timestamp("retired_at", { withTimezone: true })
});

export const proceduralMemory = pgTable("procedural_memory", {
  id: text("id").primaryKey(),
  ruleText: text("rule_text").notNull(),
  source: ruleSource("source").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  retiredAt: timestamp("retired_at", { withTimezone: true })
});

export const conversations = pgTable("conversations", {
  id: text("id").primaryKey(),
  channel: conversationChannel("channel").notNull().default("web"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow()
});

export const messages = pgTable(
  "messages",
  {
    id: text("id").primaryKey(),
    conversationId: text("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    role: messageRole("role").notNull(),
    content: text("content").notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
    traceId: text("trace_id")
  },
  (table) => ({
    conversationIdx: index("messages_conversation_id_idx").on(table.conversationId)
  })
);

export const triggerEvents = pgTable(
  "trigger_events",
  {
    id: text("id").primaryKey(),
    kind: triggerKind("kind").notNull(),
    externalId: text("external_id").notNull(),
    payloadJsonb: jsonb("payload_jsonb").$type<Record<string, unknown>>().notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    status: triggerStatus("status").notNull().default("pending"),
    error: text("error")
  },
  (table) => ({
    externalIdx: uniqueIndex("trigger_events_kind_external_id_idx").on(
      table.kind,
      table.externalId
    )
  })
);

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: text("id").primaryKey(),
  endpoint: text("endpoint").notNull().unique(),
  p256dhKey: text("p256dh_key").notNull(),
  authKey: text("auth_key").notNull(),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true })
});

export const traceEvents = pgTable(
  "trace_events",
  {
    id: text("id").primaryKey(),
    triggerEventId: text("trigger_event_id").references(() => triggerEvents.id),
    agent: agentName("agent").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    tokensIn: integer("tokens_in").notNull().default(0),
    tokensOut: integer("tokens_out").notNull().default(0),
    cacheReadTokens: integer("cache_read_tokens").notNull().default(0),
    cacheCreationTokens: integer("cache_creation_tokens").notNull().default(0),
    costUsd: numeric("cost_usd", { precision: 10, scale: 6 }).notNull().default("0"),
    model: text("model").notNull(),
    status: traceStatus("status").notNull().default("running"),
    outputText: text("output_text")
  },
  (table) => ({
    startedAtIdx: index("trace_events_started_at_idx").on(table.startedAt)
  })
);

export const toolCalls = pgTable("tool_calls", {
  id: text("id").primaryKey(),
  traceId: text("trace_id")
    .notNull()
    .references(() => traceEvents.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  argsJsonb: jsonb("args_jsonb").$type<Record<string, unknown>>().notNull(),
  resultJsonb: jsonb("result_jsonb").$type<Record<string, unknown>>(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  error: text("error")
});

export const profile = pgTable("profile", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export const schema = {
  activities,
  streams,
  planDays,
  episodicMemory,
  semanticMemory,
  proceduralMemory,
  conversations,
  messages,
  triggerEvents,
  pushSubscriptions,
  traceEvents,
  toolCalls,
  profile
};

export type PlanDay = typeof planDays.$inferSelect;
export type Activity = typeof activities.$inferSelect;
export type SemanticMemory = typeof semanticMemory.$inferSelect;
export type ProceduralMemory = typeof proceduralMemory.$inferSelect;
export type TraceEvent = typeof traceEvents.$inferSelect;
export type ToolCall = typeof toolCalls.$inferSelect;
