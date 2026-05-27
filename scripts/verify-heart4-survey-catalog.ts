#!/usr/bin/env node
/**
 * Quick verification for Heart4 survey catalog + meta handler.
 * Run: npx --yes tsx scripts/verify-heart4-survey-catalog.ts
 */
import { verifyAdminAiDomainKnowledge } from "../src/lib/adminAiDomainKnowledge";
import { verifyHarvestStatsDataset } from "../src/lib/adminAiHarvestStats";
import { verifyHeart4SurveyCatalog } from "../src/lib/heart4SurveyCatalog";
import { verifySurveyMetaHandler } from "../src/lib/adminAiSurveyMeta";

function main(): void {
  const catalog = verifyHeart4SurveyCatalog();
  const meta = verifySurveyMetaHandler();
  const domain = verifyAdminAiDomainKnowledge();
  const harvest = verifyHarvestStatsDataset();
  const errors = [
    ...(catalog.ok ? [] : catalog.errors),
    ...(meta.ok ? [] : meta.errors),
    ...(domain.ok ? [] : domain.errors),
    ...(harvest.ok ? [] : harvest.errors),
  ];

  if (errors.length) {
    console.error("verify-heart4-survey-catalog FAILED:");
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }

  console.log("verify OK (survey catalog + meta + domain + harvest stats)");
}

main();
