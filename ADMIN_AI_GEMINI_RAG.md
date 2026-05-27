# Admin AI — Gemini + RAG (Heart4Rooms)

## Overview

Admin chat is **RAG + fixed domain knowledge**: embed the user question, retrieve similar chunks from `heart4rooms_ai_chunks`, then ask Gemini with KTIS / Smart Farmer / หัวใจ 4 ห้อง context (`src/lib/adminAiDomainKnowledge.ts`). Survey structure questions and common domain definitions are answered deterministically without RAG.

## Environment

| Variable | Purpose |
|----------|---------|
| `GEMINI_API_KEY` | Required for embeddings + answer |
| `GEMINI_MODEL` | e.g. `gemini-3.1-flash-lite` |
| `GEMINI_EMBEDDING_MODEL` | default `gemini-embedding-001` (768-dim; must match `vector(768)` in RAG SQL) |

(Legacy `ADMIN_AI_BACKEND` is ignored; chat always uses RAG.)

## Supabase

1. Enable extension **`vector`** (Dashboard → Database → Extensions).
2. Run `supabase/heart4rooms_ai_rag_v1.sql` (chunks + indexes + match RPC + initial truncate function).
3. Run `supabase/heart4rooms_ai_decoded_facts_v1.sql` so `heart4rooms_ai_decoded_facts` exists and **`heart4rooms_ai_rag_truncate_v1`** truncates **both** `heart4rooms_ai_chunks` and `heart4rooms_ai_decoded_facts` (replaces the truncate body from step 2).

Optional: `supabase/heart4rooms_surveys_readonly_v1.sql` for a read-only projection of surveys (reporting); ingest still uses `heart4rooms_surveys`.

## First-time index

After deploy, as **admin** (session cookie):

```http
POST /api/admin/ai/rag/reindex
```

This embeds **survey schema** (38 chunks), **domain knowledge** (~6 chunks), then reads `heart4rooms_surveys`, fills `heart4rooms_ai_decoded_facts`, and re-embeds farmer answers. Re-run after large survey imports or when updating `adminAiDomainKnowledge.ts`.

**Domain knowledge works without full reindex** for definition questions (e.g. “หัวใจ 4 ห้อง คืออะไร”) via the built-in handler + Gemini system prompt. Full reindex adds domain chunks to RAG for mixed questions.

## Harvest stats Excel (2568-2569)

Company-level harvest data (area, cane, burned %, CCS, trucks) is stored in the repo — **no Supabase table required**:

| File | Role |
|------|------|
| `data/harvest-stats-2568-2569.xlsx` | Source spreadsheet (replace when updated) |
| `data/harvest-stats-2568-2569.json` | Parsed numbers used by the app |

After replacing the `.xlsx`:

```bash
npx tsx scripts/import-harvest-stats-xlsx.ts
```

Then deploy (JSON is bundled). Optional: reindex to refresh ~4 `harvest_stats` RAG chunks.

Questions like “พื้นที่เก็บเกี่ยวปี 2568-2569” or “อ้อยไฟไหม้ KTIS” are answered from JSON immediately without reindex.

## Removed legacy

Self-hosted **Ollama / llama.cpp**, **rule-based SQL chat**, **`heart4rooms_ai_readonly_sql_v1`** usage in the app, and RAG ingest from **`heart4rooms_ai_open_text_v1` / `heart4rooms_ai_core_v2`** were removed from the Node pipeline. Clean up **Vercel env**: delete `OLLAMA_*`, `LLAMA_CPP_*`, and `ADMIN_AI_BACKEND` if still present.
