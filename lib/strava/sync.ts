export async function syncActivity(activityId: string): Promise<{ activityId: string; synced: boolean }> {
  // Real Strava fetch/persist lands in Phase 1. This keeps the webhook path shaped now.
  return { activityId, synced: false };
}
