"use client";

import type { ReactNode } from "react";
import { ChartEmpty } from "./chartTheme";
import { useClientReady } from "./useClientReady";

export function ClientChartFrame({
  children,
  empty,
  emptyLabel
}: {
  children: ReactNode;
  empty: boolean;
  emptyLabel: string;
}) {
  const ready = useClientReady();

  if (!ready) {
    return <div className="h-full rounded-lg bg-field/50" />;
  }

  if (empty) {
    return <ChartEmpty label={emptyLabel} />;
  }

  return children;
}
