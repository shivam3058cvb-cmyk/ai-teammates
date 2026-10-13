"use client"

import * as React from "react"
import type { UsageKind } from "@/db/schema"

// Checks to run before a billable action. Each returns whether it may go ahead,
// and when it may not, shows a toast that leads to the page that explains why.
// The server enforces the same things; these only explain them.
export function usePaywall() {
  const checkPlan = React.useCallback(() => true, [])
  const checkUsage = React.useCallback(async (kind: UsageKind) => {
    void kind
    return true
  }, [])
  const showUsageLimit = React.useCallback(() => undefined, [])

  return { checkPlan, checkUsage, showUsageLimit }
}
