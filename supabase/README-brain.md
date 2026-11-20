# NOBIT Brain setup

The browser app does not contain the OpenAI secret. The AI request goes through the Supabase Edge Function at `supabase/functions/nobit-brain/index.ts`.

## Required setup

1. Create or open the Supabase project used by NOBIT.
2. Deploy the Edge Function named `nobit-brain` from this folder using the Supabase CLI:
   `supabase functions deploy nobit-brain`
3. In Supabase project secrets, add `OPENAI_API_KEY` with an API key from the OpenAI API platform.
4. Optional: set `OPENAI_MODEL` to a model enabled for your API project. The default is `gpt-6.2-astra`, which the current OpenAI web-search guide documents for Responses API web search.
5. Open NOBIT Settings and enter the Supabase project URL and the public anon JWT key.

## Security notes

- Never put `OPENAI_API_KEY` or a Supabase `service_role` key in HTML, JavaScript, GitHub Pages, or the browser settings.
- The browser stores only the public Supabase key and project URL in local storage.
- Keep Supabase Edge Function JWT verification enabled. The client sends the public anon key as the bearer token; use the legacy anon JWT key for this prototype; a publishable key alone is not a JWT bearer token.
- This prototype does not yet implement per-user Supabase Auth, persistent cloud lesson sync, abuse quotas, or admin permissions. Do not treat the current endpoint as a private developer-only teaching console.
- Live web search is enabled through the OpenAI Responses API web_search tool. The function returns source URLs when the API supplies citations.
- The AI may propose lessons only when it interprets a message as explicit teaching/correction. The user must confirm before the lesson is saved locally.

## Current learning behavior

The model receives the latest conversation turns and up to 35 locally stored lessons as context. The personal local memory store is not sent. Lessons are not model training or fine-tuning; they are retrieved context supplied to the model for each request.
