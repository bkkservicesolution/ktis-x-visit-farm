# Admin AI — Gemini + RAG (Heart4Rooms)

## Overview

Admin chat is **RAG only**: embed the user question, retrieve similar chunks from `heart4rooms_ai_chunks`, then ask Gemini to answer **only** from that context. There is no rule-based intent layer and no LLM-generated SQL.

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

This reads `heart4rooms_surveys`, fills `heart4rooms_ai_decoded_facts`, and re-embeds into `heart4rooms_ai_chunks`. Re-run after large survey imports.

## Removed legacy

Self-hosted **Ollama / llama.cpp**, **rule-based SQL chat**, **`heart4rooms_ai_readonly_sql_v1`** usage in the app, and RAG ingest from **`heart4rooms_ai_open_text_v1` / `heart4rooms_ai_core_v2`** were removed from the Node pipeline. Clean up **Vercel env**: delete `OLLAMA_*`, `LLAMA_CPP_*`, and `ADMIN_AI_BACKEND` if still present.
