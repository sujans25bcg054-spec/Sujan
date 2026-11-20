/*
# Grant service_role access for AI edge function

1. Purpose
- The new `ai-chat` edge function uses the service role key to look up ticket context
  (ticket + conversation messages) when drafting replies or summaries.
- Service role bypasses RLS, so it still needs explicit table grants to reach the data.

2. Security changes
- Grant SELECT on tickets, ticket_messages, and knowledge_articles to service_role.
- Grant UPDATE on tickets so AI summary/suggested-response fields can be persisted later.
- No policy changes. RLS remains enabled. Service role bypasses RLS by design and is only
  used server-side inside the edge function; the anon/authenticated roles are unaffected.
*/

GRANT SELECT ON public.tickets TO service_role;
GRANT UPDATE ON public.tickets TO service_role;
GRANT SELECT ON public.ticket_messages TO service_role;
GRANT SELECT ON public.knowledge_articles TO service_role;
