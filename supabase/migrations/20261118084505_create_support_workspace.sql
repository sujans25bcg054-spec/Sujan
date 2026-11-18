/*
# Create BizAssist support workspace

1. New tables
- `tickets`: customer support requests with category, priority, status, assignment, and AI triage fields.
- `ticket_messages`: the conversation thread for each ticket.
- `knowledge_articles`: approved help content used by the assistant.
- `ticket_history`: status and assignment audit events.

2. Data model
- Tickets have many messages and history events.
- Ticket status is tracked as open, in_progress, waiting, or resolved.
- The schema intentionally stays single-tenant because this prototype has no sign-in screen.

3. Security
- Row-level security is enabled on every new table.
- Anonymous and authenticated roles receive only the CRUD access required by the app.
- Policies allow access to this shared prototype workspace without exposing any privileged service role.

4. Seed data
- Adds representative ticket, conversation, history, and knowledge article records for the first dashboard view.
*/

CREATE TABLE IF NOT EXISTS public.tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number text UNIQUE NOT NULL,
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  subject text NOT NULL,
  description text NOT NULL,
  category text NOT NULL DEFAULT 'General Inquiry',
  priority text NOT NULL DEFAULT 'Medium',
  status text NOT NULL DEFAULT 'Open',
  assigned_to text,
  ai_summary text,
  ai_suggested_response text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  sender_name text NOT NULL,
  sender_type text NOT NULL DEFAULT 'customer',
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.knowledge_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category text NOT NULL,
  content text NOT NULL,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ticket_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  event_value text NOT NULL,
  actor_name text NOT NULL DEFAULT 'System',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_history ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tickets TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ticket_messages TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.knowledge_articles TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ticket_history TO anon, authenticated;

DROP POLICY IF EXISTS "Workspace can read tickets" ON public.tickets;
CREATE POLICY "Workspace can read tickets" ON public.tickets FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Workspace can create tickets" ON public.tickets;
CREATE POLICY "Workspace can create tickets" ON public.tickets FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Workspace can update tickets" ON public.tickets;
CREATE POLICY "Workspace can update tickets" ON public.tickets FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Workspace can delete tickets" ON public.tickets;
CREATE POLICY "Workspace can delete tickets" ON public.tickets FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Workspace can read ticket messages" ON public.ticket_messages;
CREATE POLICY "Workspace can read ticket messages" ON public.ticket_messages FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Workspace can create ticket messages" ON public.ticket_messages;
CREATE POLICY "Workspace can create ticket messages" ON public.ticket_messages FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Workspace can update ticket messages" ON public.ticket_messages;
CREATE POLICY "Workspace can update ticket messages" ON public.ticket_messages FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Workspace can delete ticket messages" ON public.ticket_messages;
CREATE POLICY "Workspace can delete ticket messages" ON public.ticket_messages FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Workspace can read knowledge articles" ON public.knowledge_articles;
CREATE POLICY "Workspace can read knowledge articles" ON public.knowledge_articles FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Workspace can create knowledge articles" ON public.knowledge_articles;
CREATE POLICY "Workspace can create knowledge articles" ON public.knowledge_articles FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Workspace can update knowledge articles" ON public.knowledge_articles;
CREATE POLICY "Workspace can update knowledge articles" ON public.knowledge_articles FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Workspace can delete knowledge articles" ON public.knowledge_articles;
CREATE POLICY "Workspace can delete knowledge articles" ON public.knowledge_articles FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Workspace can read ticket history" ON public.ticket_history;
CREATE POLICY "Workspace can read ticket history" ON public.ticket_history FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Workspace can create ticket history" ON public.ticket_history;
CREATE POLICY "Workspace can create ticket history" ON public.ticket_history FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Workspace can update ticket history" ON public.ticket_history;
CREATE POLICY "Workspace can update ticket history" ON public.ticket_history FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Workspace can delete ticket history" ON public.ticket_history;
CREATE POLICY "Workspace can delete ticket history" ON public.ticket_history FOR DELETE TO anon, authenticated USING (true);

INSERT INTO public.tickets (ticket_number, customer_name, customer_email, subject, description, category, priority, status, assigned_to, ai_summary, ai_suggested_response, created_at, updated_at)
VALUES
  ('BAI-0001', 'Morgan Lee', 'morgan.lee@example.com', 'Payment deducted twice', 'I paid for my order but my bank account was charged twice. I need help getting the duplicate payment refunded.', 'Billing', 'High', 'In Progress', 'Priya Shah', 'Customer reports duplicate charge and requests a refund.', 'Hi Morgan, I’m sorry about the duplicate charge. I’ve flagged this for our billing team to review and will update you as soon as the extra payment is reversed.', now() - interval '2 hours', now() - interval '18 minutes'),
  ('BAI-0002', 'Jordan Kim', 'jordan.kim@example.com', 'Unable to log in', 'The password reset link keeps sending me back to the login page.', 'Account', 'Medium', 'Open', 'Noah Williams', 'Customer cannot complete the password reset flow.', 'Hi Jordan, please request a fresh reset link and open it in a private browser window. If it still loops, we can verify your account manually.', now() - interval '5 hours', now() - interval '42 minutes'),
  ('BAI-0003', 'Avery Brown', 'avery.brown@example.com', 'Where is my order?', 'I received a shipping notification last week, but the tracking page has not changed.', 'General Inquiry', 'Low', 'Waiting', 'Mina Patel', 'Customer is asking for an order tracking update.', 'Hi Avery, I’m checking the latest carrier scan now. I’ll share an updated delivery estimate as soon as I have it.', now() - interval '1 day', now() - interval '3 hours'),
  ('BAI-0004', 'Taylor Singh', 'taylor.singh@example.com', 'Cancel my subscription', 'Please cancel my plan before the next renewal date.', 'Account', 'Medium', 'Resolved', 'Noah Williams', 'Customer requested subscription cancellation before renewal.', 'Your subscription has been cancelled and no further renewal will be charged.', now() - interval '2 days', now() - interval '1 day')
ON CONFLICT (ticket_number) DO NOTHING;

INSERT INTO public.ticket_messages (ticket_id, sender_name, sender_type, message)
SELECT id, 'Morgan Lee', 'customer', 'I paid for my order but my bank account was charged twice. I need help getting the duplicate payment refunded.' FROM public.tickets WHERE ticket_number = 'BAI-0001'
AND NOT EXISTS (SELECT 1 FROM public.ticket_messages WHERE ticket_id = public.tickets.id);

INSERT INTO public.knowledge_articles (title, category, content)
SELECT 'Password reset troubleshooting', 'Account', 'Request a fresh link, open it in a private browser window, and confirm the link has not expired.' WHERE NOT EXISTS (SELECT 1 FROM public.knowledge_articles WHERE title = 'Password reset troubleshooting');
INSERT INTO public.knowledge_articles (title, category, content)
SELECT 'Duplicate payment review', 'Billing', 'Confirm the customer email, check for a matching authorization, and escalate duplicate captures to Billing Support.' WHERE NOT EXISTS (SELECT 1 FROM public.knowledge_articles WHERE title = 'Duplicate payment review');
INSERT INTO public.knowledge_articles (title, category, content)
SELECT 'Shipping status updates', 'Orders', 'Check the latest carrier scan and provide the customer with the next available delivery estimate.' WHERE NOT EXISTS (SELECT 1 FROM public.knowledge_articles WHERE title = 'Shipping status updates');