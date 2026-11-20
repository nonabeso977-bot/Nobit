# NOBIT Independent Knowledge Engine

NOBIT uses its own retrieval-based knowledge engine. It does not call OpenAI or another paid language-model API.

## Architecture

- Browser client: `ai.js` sends the question and locally taught lessons to the project's Supabase Edge Function.
- Edge Function: `supabase/functions/nobit-brain/index.ts` searches public knowledge sources.
- Wikipedia: Arabic search first, then English if Arabic has no results; retrieves article introductions.
- Wikidata: retrieves structured entity labels and descriptions.
- Local learning: `learning.js` stores developer-taught lessons in this browser. Matching lessons are preferred before external search.

## Deploy from the Supabase Dashboard

1. Open the project's Edge Functions section.
2. Open the `nobit-brain` function.
3. Open the Code editor.
4. Replace `index.ts` with the current version from this repository:
   `supabase/functions/nobit-brain/index.ts`
5. Click **Deploy updates**.
6. Keep JWT verification enabled. The browser client uses the legacy public anon JWT key.

No `OPENAI_API_KEY`, provider secret, or paid model account is required.

## Configure the browser app

In NOBIT Settings, enter the Supabase Project URL and the public legacy anon JWT key. The key is stored in this browser's local storage.

Never put a Supabase `service_role` key or any secret key in the browser or GitHub.

## Important limitations

This is an independent retrieval engine, not a generative language model. It can retrieve and display sourced excerpts and developer-taught lessons, but it does not yet perform deep semantic understanding, multi-step reasoning, or natural-language synthesis. Search results depend on Wikipedia and Wikidata availability and coverage.

The current prototype has no user authentication, per-user quotas, or private developer teaching permissions. Do not submit sensitive personal information.
