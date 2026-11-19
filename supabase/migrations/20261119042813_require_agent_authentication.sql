/*
# Require agent authentication for the support workspace

1. Purpose
- The BizAssist workspace now requires agents to sign in with Supabase email/password authentication before accessing support operations.
- Support tickets remain shared across the workspace so authenticated agents can collaborate on the same queue.

2. Modified tables
- `tickets`: anonymous Data API access removed; authenticated agents retain CRUD access.
- `ticket_messages`: anonymous Data API access removed; authenticated agents retain CRUD access.
- `knowledge_articles`: anonymous Data API access removed; authenticated agents retain CRUD access.
- `ticket_history`: anonymous Data API access removed; authenticated agents retain CRUD access.

3. Security changes
- Revoke all table privileges from the `anon` role.
- Grant only the required CRUD privileges to the `authenticated` role.
- Replace shared anonymous policies with authenticated-agent policies.
- Row-level security remains enabled on every table.

4. Important notes
- Authentication uses Supabase's built-in `auth.users` system; no custom password table is created.
- Email confirmation remains controlled by the existing Supabase project authentication settings.
- Existing support records are preserved and remain visible to signed-in agents.
*/

REVOKE ALL ON TABLE public.tickets FROM anon;
REVOKE ALL ON TABLE public.ticket_messages FROM anon;
REVOKE ALL ON TABLE public.knowledge_articles FROM anon;
REVOKE ALL ON TABLE public.ticket_history FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.tickets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ticket_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.knowledge_articles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ticket_history TO authenticated;

DROP POLICY IF EXISTS "Workspace can read tickets" ON public.tickets;
CREATE POLICY "Authenticated agents can read tickets" ON public.tickets FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Workspace can create tickets" ON public.tickets;
CREATE POLICY "Authenticated agents can create tickets" ON public.tickets FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Workspace can update tickets" ON public.tickets;
CREATE POLICY "Authenticated agents can update tickets" ON public.tickets FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Workspace can delete tickets" ON public.tickets;
CREATE POLICY "Authenticated agents can delete tickets" ON public.tickets FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Workspace can read ticket messages" ON public.ticket_messages;
CREATE POLICY "Authenticated agents can read ticket messages" ON public.ticket_messages FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Workspace can create ticket messages" ON public.ticket_messages;
CREATE POLICY "Authenticated agents can create ticket messages" ON public.ticket_messages FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Workspace can update ticket messages" ON public.ticket_messages;
CREATE POLICY "Authenticated agents can update ticket messages" ON public.ticket_messages FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Workspace can delete ticket messages" ON public.ticket_messages;
CREATE POLICY "Authenticated agents can delete ticket messages" ON public.ticket_messages FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Workspace can read knowledge articles" ON public.knowledge_articles;
CREATE POLICY "Authenticated agents can read knowledge articles" ON public.knowledge_articles FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Workspace can create knowledge articles" ON public.knowledge_articles;
CREATE POLICY "Authenticated agents can create knowledge articles" ON public.knowledge_articles FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Workspace can update knowledge articles" ON public.knowledge_articles;
CREATE POLICY "Authenticated agents can update knowledge articles" ON public.knowledge_articles FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Workspace can delete knowledge articles" ON public.knowledge_articles;
CREATE POLICY "Authenticated agents can delete knowledge articles" ON public.knowledge_articles FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "Workspace can read ticket history" ON public.ticket_history;
CREATE POLICY "Authenticated agents can read ticket history" ON public.ticket_history FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Workspace can create ticket history" ON public.ticket_history;
CREATE POLICY "Authenticated agents can create ticket history" ON public.ticket_history FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Workspace can update ticket history" ON public.ticket_history;
CREATE POLICY "Authenticated agents can update ticket history" ON public.ticket_history FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Workspace can delete ticket history" ON public.ticket_history;
CREATE POLICY "Authenticated agents can delete ticket history" ON public.ticket_history FOR DELETE TO authenticated USING (true);
