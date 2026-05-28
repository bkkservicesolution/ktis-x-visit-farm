#!/usr/bin/env node
/**
 * Build data/heart4rooms-survey-aggregates.json from snapshot.
 * Admins can also use POST /api/admin/ai/rag/aggregates or the button on /admin/ai/rag.
 */
import { buildAndSaveSurveyAggregatesFromSnapshot } from "../src/lib/heart4SurveyAggregatesStore";

async function main(): Promise<void> {
  const result = await buildAndSaveSurveyAggregatesFromSnapshot();
  if (!result.ok) {
    console.error(result.error, result.detail ?? "");
    process.exit(1);
  }
  console.log(`Wrote aggregates — surveyCount=${result.surveyCount} cutoff=${result.snapshotCutoff ?? "—"}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
