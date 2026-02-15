"use client";

import { useState, useEffect } from "react";
import { getVariant, type Variant } from "@/lib/ab-testing";

/**
 * React hook to get the assigned variant for an experiment.
 * Returns null during SSR, then the variant after hydration.
 */
export function useExperiment(experimentId: string): Variant | null {
  const [variant, setVariant] = useState<Variant | null>(null);

  useEffect(() => {
    setVariant(getVariant(experimentId));
  }, [experimentId]);

  return variant;
}
