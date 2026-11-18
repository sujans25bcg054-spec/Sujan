import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  Archive,
  ArrowUpRight,
  Bell,
  BookOpen,
  Bot,
  Check,
  ChevronDown,
  CircleHelp,
  Clock3,
  LayoutDashboard,
  Menu,
  MessageSquare,
  MoreHorizontal,
  Plus,
  Search,
  Send,
  Settings,
  Sparkles,
  Ticket,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

type TicketRecord = {
  id: string;
  ticket_number: string;
  customer_name: string;
  customer_email: string;
  subject: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  assigned_to: string | null;
  ai_summary: string | null;
  ai_suggested_response: string | null;
  created_at: string;
  updated_at: string;
};

type MessageRecord = {
  id: string;
  sender_name: string;
  sender_type: string;
  message: string;
  created_at: string;
};

type NewTicket = {
  customer_name: string;
  customer_email: string;
  subject: string;
  description: string;
  category: string;
  priority: string;
};

const navItems = [
  { label: 'Overview', icon: LayoutDashboard },
  { label: 'Tickets', icon: Ticket, count: 24 },
  { label: 'Customers', icon: Users },
  { label: 'Knowledge base', icon: BookOpen },
];

const agents = ['Priya Shah', 'Noah Williams', 'Mina Patel', 'You'];

function formatTime(value: string) {
  const date = new Date(value);
  const diff = Math.max(1, Math.round((Date.now() - date.getTime()) / 60000));
  if (diff < 60) return `${diff}m ago`;
  if (diff < 1440) return `${Math.round(diff / 60)}h ago`;
  return `${Math.round(diff / 1440)}d ago`;
}

function statusClass(status: string) {
  return status.toLowerCase().replace(/ /g, '-');
}

function App() {
  const [tickets, setTickets] = useState<TicketRecord[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<TicketRecord | null>(null);
  const [messages, setMessages] = useState<MessageRecord[]>([]);
  const [activeNav, setActiveNav] = useState('Overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [showMobileNav, setShowMobileNav] = useState(false);
  const [assistantInput, setAssistantInput] = useState('');
  const [assistantMessages, setAssistantMessages] = useState([
    { from: 'bot', text: 'Hi there. I can help you find a ticket, article, or next best action.' },
  ]);
  const [newTicket, setNewTicket] = useState<NewTicket>({
    customer_name: '',
    customer_email: '',
    subject: '',
    description: '',
    category: 'General Inquiry',
    priority: 'Medium',
  });

  const loadTickets = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('tickets').select('*').order('updated_at', { ascending: false });
    if (error) {
      setNotice('We could not load tickets right now. Please refresh and try again.');
    } else {
      setTickets(data ?? []);
      setNotice('');
    }
    setLoading(false);
  };

  useEffect(() => {
    void loadTickets();
  }, []);

  useEffect(() => {
    const loadMessages = async () => {
      if (!selectedTicket) {
        setMessages([]);
        return;
      }
      const { data, error } = await supabase
        .from('ticket_messages')
        .select('id, sender_name, sender_type, message, created_at')
        .eq('ticket_id', selectedTicket.id)
        .order('created_at', { ascending: true });
      if (!error) setMessages(data ?? []);
    };
    void loadMessages();
  }, [selectedTicket]);

  const filteredTickets = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return tickets;
    return tickets.filter((ticket) =>
      [ticket.ticket_number, ticket.customer_name, ticket.subject, ticket.category, ticket.status]
        .join(' ')
        .toLowerCase()
        .includes(query),
    );
  }, [searchTerm, tickets]);

  const openCount = tickets.filter((ticket) => ticket.status === 'Open').length;
  const progressCount = tickets.filter((ticket) => ticket.status === 'In Progress').length;
  const resolvedCount = tickets.filter((ticket) => ticket.status === 'Resolved').length;
  const highPriorityCount = tickets.filter((ticket) => ticket.priority === 'High').length;

  const updateTicket = async (id: string, changes: Partial<TicketRecord>) => {
    const { data, error } = await supabase.from('tickets').update({ ...changes, updated_at: new Date().toISOString() }).eq('id', id).select().maybeSingle();
    if (error || !data) {
      setNotice('That update did not save. Please try again.');
      return;
    }
    setTickets((current) => current.map((ticket) => (ticket.id === id ? data : ticket)));
    setSelectedTicket(data);
    setNotice('Ticket updated');
    window.setTimeout(() => setNotice(''), 2200);
  };

  const createTicket = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const ticketNumber = `BAI-${String(tickets.length + 1).padStart(4, '0')}`;
    const { data, error } = await supabase
      .from('tickets')
      .insert({ ...newTicket, ticket_number: ticketNumber, status: 'Open' })
      .select()
      .maybeSingle();
    if (error || !data) {
      setNotice('We could not create that ticket. Please check the details and try again.');
      return;
    }
    setTickets((current) => [data, ...current]);
    setSelectedTicket(data);
    setShowNewTicket(false);
    setNewTicket({ customer_name: '', customer_email: '', subject: '', description: '', category: 'General Inquiry', priority: 'Medium' });
    setNotice('New ticket created');
    window.setTimeout(() => setNotice(''), 2200);
  };

  const sendAssistantMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const message = assistantInput.trim();
    if (!message) return;
    setAssistantMessages((current) => [...current, { from: 'user', text: message }, { from: 'bot', text: 'I found the relevant workflow: check the ticket category, confirm priority, then send an editable reply for agent approval.' }]);
    setAssistantInput('');
  };

  return (
    <div className="app-shell">
      <aside className={`sidebar ${showMobileNav ? 'sidebar-open' : ''}`}>
        <div className="brand-row">
          <div className="brand-mark"><Sparkles size={17} /></div>
          <div><strong>BizAssist</strong><span>Customer operations</span></div>
          <button className="icon-button mobile-close" onClick={() => setShowMobileNav(false)} aria-label="Close menu"><X size={18} /></button>
        </div>
        <div className="workspace-switcher"><div className="workspace-avatar">BA</div><div><span>Workspace</span><strong>Acme Support</strong></div><ChevronDown size={15} /></div>
        <nav className="main-nav" aria-label="Main navigation">
          <p className="nav-label">Workspace</p>
          {navItems.map(({ label, icon: Icon, count }) => (
            <button key={label} className={`nav-item ${activeNav === label ? 'active' : ''}`} onClick={() => { setActiveNav(label); setShowMobileNav(false); }}><Icon size={18} /><span>{label}</span>{count && <b>{count}</b>}</button>
          ))}
          <p className="nav-label nav-spacer">Manage</p>
          <button className="nav-item"><Archive size={18} /><span>Reports</span></button>
          <button className="nav-item"><Settings size={18} /><span>Settings</span></button>
        </nav>
        <div className="sidebar-bottom"><div className="upgrade-card"><div className="upgrade-icon"><Bot size={18} /></div><strong>AI copilot is active</strong><p>Use assistive suggestions to resolve tickets faster.</p><button>View capabilities <ArrowUpRight size={14} /></button></div><div className="profile-row"><div className="profile-avatar">JD</div><div><strong>Jordan Davis</strong><span>Administrator</span></div><MoreHorizontal size={18} /></div></div>
      </aside>

      <main className="main-content">
        <header className="topbar"><div className="topbar-left"><button className="icon-button menu-trigger" onClick={() => setShowMobileNav(true)} aria-label="Open menu"><Menu size={21} /></button><div><p className="eyebrow">Tuesday, November 18, 2026</p><h1>Good morning, Jordan <span>—</span></h1></div></div><div className="topbar-actions"><button className="icon-button" aria-label="Help"><CircleHelp size={19} /></button><button className="icon-button notification" aria-label="Notifications"><Bell size={19} /><i /></button><div className="top-avatar">JD</div></div></header>

        <div className="page-wrap">
          {notice && <div className="notice"><Check size={16} />{notice}</div>}
          <section className="hero-row"><div><p className="eyebrow accent">Overview</p><h2>Support, without the busywork.</h2><p className="subcopy">One calm place to triage every conversation, give agents context, and keep customers moving.</p></div><button className="primary-button" onClick={() => setShowNewTicket(true)}><Plus size={17} /> New ticket</button></section>

          <section className="metric-grid" aria-label="Support metrics">
            <div className="metric-card"><div className="metric-icon blue"><Ticket size={17} /></div><span>Total tickets</span><strong>{tickets.length || 128}</strong><small className="positive">+12.5% <em>vs last week</em></small></div>
            <div className="metric-card"><div className="metric-icon amber"><Clock3 size={17} /></div><span>Open tickets</span><strong>{openCount || 24}</strong><small className="neutral">Needs attention</small></div>
            <div className="metric-card"><div className="metric-icon violet"><MessageSquare size={17} /></div><span>In progress</span><strong>{progressCount || 18}</strong><small className="positive">+4.2% <em>resolved today</em></small></div>
            <div className="metric-card"><div className="metric-icon green"><Check size={17} /></div><span>Resolved</span><strong>{resolvedCount || 86}</strong><small className="positive">{highPriorityCount} high priority</small></div>
          </section>

          <section className="content-grid">
            <div className="primary-column">
              <div className="section-heading"><div><h3>Recent tickets</h3><p>Keep the queue moving with clear ownership.</p></div><button className="secondary-button" onClick={() => setActiveNav('Tickets')}>View all <ArrowUpRight size={15} /></button></div>
              <div className="ticket-card"><div className="table-toolbar"><div className="search-box"><Search size={16} /><input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search tickets..." /></div><button className="filter-button"><span className="filter-dot" /> All tickets <ChevronDown size={15} /></button></div>
                <div className="ticket-table-wrap"><table className="ticket-table"><thead><tr><th>Ticket</th><th>Customer</th><th>Category</th><th>Priority</th><th>Status</th><th>Updated</th></tr></thead><tbody>{loading ? <tr><td colSpan={6} className="empty-state">Loading your workspace...</td></tr> : filteredTickets.length === 0 ? <tr><td colSpan={6} className="empty-state">No tickets match your search.</td></tr> : filteredTickets.map((ticket) => <tr key={ticket.id} onClick={() => setSelectedTicket(ticket)} className={selectedTicket?.id === ticket.id ? 'selected-row' : ''}><td><strong>{ticket.ticket_number}</strong><span>{ticket.subject}</span></td><td><div className="customer-cell"><div className="mini-avatar">{ticket.customer_name.split(' ').map((name) => name[0]).join('').slice(0, 2)}</div>{ticket.customer_name}</div></td><td>{ticket.category}</td><td><span className={`priority ${ticket.priority.toLowerCase()}`}><i />{ticket.priority}</span></td><td><span className={`status ${statusClass(ticket.status)}`}>{ticket.status}</span></td><td className="muted-cell">{formatTime(ticket.updated_at)}</td></tr>)}</tbody></table></div>
              </div>
              <div className="section-heading lower-heading"><div><h3>Team pulse</h3><p>Activity across your support workspace.</p></div><span className="live-label"><i /> Live</span></div>
              <div className="pulse-card"><div className="chart-area"><div className="chart-title"><strong>Ticket volume</strong><span>Last 7 days</span></div><div className="bars">{[42, 64, 48, 76, 58, 86, 68].map((height, index) => <div className="bar-col" key={index}><div className={`bar ${index === 5 ? 'highlight' : ''}`} style={{ height: `${height}%` }} /><span>{['M', 'T', 'W', 'T', 'F', 'S', 'S'][index]}</span></div>)}</div></div><div className="pulse-divider" /><div className="category-list"><div className="chart-title"><strong>Ticket categories</strong><span>128 total</span></div>{[['Technical', 35], ['Billing', 25], ['Account', 20], ['Other', 20]].map(([label, value]) => <div className="category-row" key={String(label)}><span>{label}</span><div><i style={{ width: `${value}%` }} /></div><b>{value}%</b></div>)}</div></div>
            </div>

            <aside className="assistant-card"><div className="assistant-header"><div className="assistant-title"><div className="bot-avatar"><Sparkles size={16} /></div><div><strong>BizAssist AI</strong><span><i /> Online</span></div></div><button className="icon-button"><MoreHorizontal size={18} /></button></div><div className="assistant-intro"><span className="assistant-kicker">AI copilot</span><h3>How can I help today?</h3><p>Ask about a ticket, draft a response, or find the right help article.</p></div><div className="assistant-messages">{assistantMessages.map((message, index) => <div className={`assistant-message ${message.from}`} key={`${message.text}-${index}`}>{message.text}</div>)}</div><div className="suggested-prompts"><span>Try asking</span><button onClick={() => setAssistantInput('What should I do with high priority tickets?')}>High priority tickets</button><button onClick={() => setAssistantInput('Draft a reply for the selected ticket')}>Draft a reply</button></div><form className="assistant-input" onSubmit={sendAssistantMessage}><input value={assistantInput} onChange={(event) => setAssistantInput(event.target.value)} placeholder="Ask BizAssist..." /><button type="submit" aria-label="Send message"><Send size={16} /></button></form><p className="assistant-footnote"><Sparkles size={13} /> AI suggestions are reviewed by your team before sending.</p></aside>
          </section>
        </div>
      </main>

      {selectedTicket && <div className="drawer-backdrop" onClick={() => setSelectedTicket(null)}><aside className="ticket-drawer" onClick={(event) => event.stopPropagation()}><div className="drawer-top"><div><span className="eyebrow accent">{selectedTicket.ticket_number}</span><h2>{selectedTicket.subject}</h2></div><button className="icon-button" onClick={() => setSelectedTicket(null)} aria-label="Close ticket"><X size={19} /></button></div><div className="drawer-meta"><span className={`status ${statusClass(selectedTicket.status)}`}>{selectedTicket.status}</span><span className={`priority ${selectedTicket.priority.toLowerCase()}`}><i />{selectedTicket.priority} priority</span><span>{selectedTicket.category}</span></div><div className="drawer-actions"><label>Assigned to<select value={selectedTicket.assigned_to ?? ''} onChange={(event) => void updateTicket(selectedTicket.id, { assigned_to: event.target.value })}><option value="">Unassigned</option>{agents.map((agent) => <option key={agent}>{agent}</option>)}</select></label><label>Status<select value={selectedTicket.status} onChange={(event) => void updateTicket(selectedTicket.id, { status: event.target.value })}><option>Open</option><option>In Progress</option><option>Waiting</option><option>Resolved</option></select></label></div><div className="drawer-section"><span className="drawer-label">Customer message</span><div className="customer-message"><div className="customer-cell"><div className="mini-avatar large">{selectedTicket.customer_name.split(' ').map((name) => name[0]).join('').slice(0, 2)}</div><strong>{selectedTicket.customer_name}</strong><small>{selectedTicket.customer_email}</small></div><p>{selectedTicket.description}</p></div></div><div className="drawer-section"><span className="drawer-label">Conversation</span><div className="conversation">{messages.length ? messages.map((message) => <div className={`conversation-message ${message.sender_type}`} key={message.id}><strong>{message.sender_name}</strong><span>{message.message}</span><small>{formatTime(message.created_at)}</small></div>) : <p className="muted-cell">No messages yet.</p>}</div></div>{selectedTicket.ai_summary && <div className="ai-insight"><div><Sparkles size={16} /><strong>AI summary</strong></div><p>{selectedTicket.ai_summary}</p><button onClick={() => setAssistantInput('Draft a reply for this ticket')}>Use AI draft <ArrowUpRight size={14} /></button></div>}</aside></div>}

      {showNewTicket && <div className="modal-backdrop" onClick={() => setShowNewTicket(false)}><form className="new-ticket-modal" onSubmit={createTicket} onClick={(event) => event.stopPropagation()}><div className="modal-header"><div><span className="eyebrow accent">New request</span><h2>Create a support ticket</h2></div><button type="button" className="icon-button" onClick={() => setShowNewTicket(false)} aria-label="Close form"><X size={19} /></button></div><div className="form-grid"><label>Customer name<input required value={newTicket.customer_name} onChange={(event) => setNewTicket({ ...newTicket, customer_name: event.target.value })} placeholder="e.g. Alex Morgan" /></label><label>Email address<input required type="email" value={newTicket.customer_email} onChange={(event) => setNewTicket({ ...newTicket, customer_email: event.target.value })} placeholder="alex@example.com" /></label><label>Subject<input required value={newTicket.subject} onChange={(event) => setNewTicket({ ...newTicket, subject: event.target.value })} placeholder="What does the customer need?" /></label><label>Category<select value={newTicket.category} onChange={(event) => setNewTicket({ ...newTicket, category: event.target.value })}><option>General Inquiry</option><option>Billing</option><option>Account</option><option>Technical</option><option>Orders</option></select></label><label>Priority<select value={newTicket.priority} onChange={(event) => setNewTicket({ ...newTicket, priority: event.target.value })}><option>Low</option><option>Medium</option><option>High</option></select></label><label className="full-field">Description<textarea required rows={4} value={newTicket.description} onChange={(event) => setNewTicket({ ...newTicket, description: event.target.value })} placeholder="Describe the customer's request..." /></label></div><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setShowNewTicket(false)}>Cancel</button><button type="submit" className="primary-button"><Plus size={17} /> Create ticket</button></div></form></div>}
    </div>
  );
}

export default App;
