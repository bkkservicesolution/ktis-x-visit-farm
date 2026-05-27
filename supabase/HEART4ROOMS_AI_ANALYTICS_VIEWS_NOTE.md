# Heart4Rooms analytics views — purpose

These objects **normalize** `heart4rooms_surveys.answers` (JSON) into query-friendly rows. They are useful for **SQL / dashboards / ad-hoc reporting** in Supabase.

**Admin AI (Gemini RAG)** no longer reads them for reindex: the app decodes `answers` in TypeScript, writes `heart4rooms_ai_decoded_facts`, and embeds chunks into `heart4rooms_ai_chunks`.

They were **not** created specifically for Ollama or llama.cpp. You may keep or drop them depending on whether other reports still query these views.

Optional cleanup in Supabase (only if you **fully remove** admin AI and reporting that depends on these views):

- `drop function if exists public.heart4rooms_ai_readonly_sql_v1(text, integer);`
- `drop view if exists public.heart4rooms_ai_open_text_v1 cascade;`
- `drop view if exists public.heart4rooms_ai_core_v2 cascade;`

Run the above **only** if you intend to delete the feature end-to-end.
