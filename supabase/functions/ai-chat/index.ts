import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import { openai } from 'npm:@ai-sdk/openai@1.3.22';
import { streamText, type CoreMessage } from 'npm:ai@4.3.16';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const SYSTEM_PROMPT = `You are BizAssist AI, a support copilot for customer-service agents.
You help agents triage tickets, summarize long conversations, and draft friendly replies.

Guidelines:
- Keep answers short and practical.
- When asked to draft a reply, write a ready-to-send message addressed to the customer, in a warm professional tone.
- When asked to summarize, produce 2-3 bullet points.
- Never invent ticket data the agent hasn't provided.`;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const authHeader = req.headers.get('Authorization') ?? '';

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const messages = (body.messages ?? []) as CoreMessage[];
    const ticketId: string | null = body.ticketId ?? null;
    const mode: 'chat' | 'draft' | 'summary' = body.mode ?? 'chat';

    let systemMessage: CoreMessage = { role: 'system', content: SYSTEM_PROMPT };

    if (ticketId) {
      const { data: ticket } = await supabase
        .from('tickets')
        .select('subject, description, category, priority, customer_name, customer_email')
        .eq('id', ticketId)
        .maybeSingle();

      const { data: history } = await supabase
        .from('ticket_messages')
        .select('sender_name, sender_type, message, created_at')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      const context = ticket
        ? `Ticket context:
Subject: ${ticket.subject}
Category: ${ticket.category} | Priority: ${ticket.priority}
Customer: ${ticket.customer_name} <${ticket.customer_email}>
Original request: ${ticket.description}

Conversation so far:
${(history ?? [])
  .map((m) => `${m.sender_type === 'agent' ? 'Agent' : 'Customer'} (${m.sender_name}): ${m.message}`)
  .join('\n')}`
        : '';

      if (mode === 'summary') {
        systemMessage = {
          role: 'system',
          content: `${SYSTEM_PROMPT}\n\n${context}\n\nSummarize this ticket in 2-3 concise bullet points.`,
        };
      } else if (mode === 'draft') {
        systemMessage = {
          role: 'system',
          content: `${SYSTEM_PROMPT}\n\n${context}\n\nDraft a warm, professional reply to the customer that addresses their request. Output only the reply text.`,
        };
      } else {
        systemMessage = { role: 'system', content: `${SYSTEM_PROMPT}\n\n${context}` };
      }
    }

    const result = streamText({
      model: openai('gpt-4o-mini'),
      messages: [systemMessage, ...messages],
    });

    if (mode === 'draft' || mode === 'summary') {
      return result.toTextStreamResponse({ headers: corsHeaders });
    }
    return result.toDataStreamResponse({ headers: corsHeaders });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'AI request failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
