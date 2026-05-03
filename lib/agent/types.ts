export type CoachTrigger = "web_chat" | "morning_brief" | "post_run";

export type CoachResult = {
  traceId: string;
  trigger: CoachTrigger;
  message: string;
  proposals: Array<{
    kind: "memory_update" | "plan_change";
    text: string;
    requiresConfirmation: boolean;
  }>;
};
