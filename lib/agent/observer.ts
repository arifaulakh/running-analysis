export type ObserverPromotion = {
  claimText: string;
  confidence: "low" | "med" | "high";
  evidenceRefs: string[];
};

export type ObserverResult = {
  promotions: ObserverPromotion[];
  reinforcements: Array<{ semanticMemoryId: string; evidenceRef: string }>;
  supersessions: Array<{ oldSemanticMemoryId: string; newClaimText: string }>;
};

export async function runObserver(): Promise<ObserverResult> {
  return {
    promotions: [],
    reinforcements: [],
    supersessions: []
  };
}
