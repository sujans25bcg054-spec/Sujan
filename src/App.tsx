import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useChat } from '@ai-sdk/react';
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
  Mic,
  MicOff,
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

type SpeechRecognitionResultEvent = {
  resultIndex: number;
  results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }>;
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionResultEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

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
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState<'sign-in' | 'sign-up' | 'forgot'>('sign-in');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authNotice, setAuthNotice] = useState('');
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
  const [speechSupported, setSpeechSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const assistantRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const aiApi = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;
  const chat = useChat({
    api: aiApi,
    body: { ticketId: selectedTicket?.id ?? null, mode: 'chat' },
    headers: { Authorization: `Bearer ${session?.access_token ?? ''}` },
  });
  const [newTicket, setNewTicket] = useState<NewTicket>({
    customer_name: '',
    customer_email: '',
    subject: '',
    description: '',
    category: 'General Inquiry',
    priority: 'Medium',
  });

  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (active) {
        setSession(data.session);
        setAuthLoading(false);
      }
    });
    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      setAuthLoading(false);
      if (event === 'PASSWORD_RECOVERY') setShowResetPassword(true);
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const handleAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthError('');
    setAuthNotice('');
    const result = authMode === 'sign-in'
      ? await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword })
      : authMode === 'forgot'
        ? await supabase.auth.resetPasswordForEmail(authEmail, { redirectTo: window.location.origin })
        : await supabase.auth.signUp({ email: authEmail, password: authPassword });
    if (result.error) {
      setAuthError(result.error.message.includes('Invalid login credentials') ? 'That email or password is not correct.' : result.error.message);
      return;
    }
    if (authMode === 'forgot') {
      setAuthNotice('If an account exists for that email, we sent a secure reset link.');
      return;
    }
    if (authMode === 'sign-up' && 'session' in result.data && !result.data.session) {
      setAuthNotice('Your account was created. Check your email to confirm it, then sign in.');
      setAuthMode('sign-in');
      setAuthPassword('');
    }
  };

  const updatePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthError('');
    setAuthNotice('');
    if (newPassword !== confirmPassword) {
      setAuthError('Your passwords do not match.');
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setAuthError('We could not update your password. Please request a new reset link.');
      return;
    }
    setNewPassword('');
    setConfirmPassword('');
    setShowResetPassword(false);
    setAuthNotice('Password updated. Your workspace is ready.');
  };

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
    if (!session) {
      setLoading(false);
      return;
    }
    void loadTickets();
  }, [session]);

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
    if (!message || chat.status === 'streaming' || chat.status === 'submitted') return;
    void chat.sendMessage({ text: message });
    setAssistantInput('');
  };

  useEffect(() => {
    const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Recognition) return;
    setSpeechSupported(true);
    const recognition = new Recognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognition.onresult = (event) => {
      const transcript = event.results[event.resultIndex]?.[0]?.transcript?.trim();
      if (transcript) setAssistantInput((current) => current ? `${current} ${transcript}` : transcript);
    };
    recognition.onerror = () => {
      setIsListening(false);
      setNotice('Voice input could not start. Please check your microphone permission.');
      window.setTimeout(() => setNotice(''), 3000);
    };
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    return () => {
      recognition.stop();
      recognitionRef.current = null;
    };
  }, []);

  const toggleSpeechInput = () => {
    if (!speechSupported || !recognitionRef.current) {
      setNotice('Voice input is not supported in this browser.');
      window.setTimeout(() => setNotice(''), 3000);
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      return;
    }
    recognitionRef.current.start();
    setIsListening(true);
  };

  const [aiLoading, setAiLoading] = useState<'draft' | 'summary' | null>(null);

  const runTicketAction = async (mode: 'draft' | 'summary') => {
    if (!selectedTicket) return;
    setAiLoading(mode);
    try {
      const response = await fetch(aiApi, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token ?? ''}`,
        },
        body: JSON.stringify({ ticketId: selectedTicket.id, mode, messages: [] }),
      });
      if (!response.ok || !response.body) throw new Error('failed');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let text = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
      }
      if (mode === 'summary') {
        await updateTicket(selectedTicket.id, { ai_summary: text.trim() });
      } else {
        await supabase
          .from('ticket_messages')
          .insert({ ticket_id: selectedTicket.id, sender_name: 'BizAssist AI', sender_type: 'ai', message: text.trim() });
        const { data: refreshed } = await supabase
          .from('ticket_messages')
          .select('id, sender_name, sender_type, message, created_at')
          .eq('ticket_id', selectedTicket.id)
          .order('created_at', { ascending: true });
        if (refreshed) setMessages(refreshed);
      }
    } catch {
      setNotice('The AI service could not complete that request. Please try again.');
      window.setTimeout(() => setNotice(''), 3000);
    } finally {
      setAiLoading(null);
    }
  };

  if (authLoading) {
    return <div className="auth-loading"><div className="brand-mark"><Sparkles size={17} /></div><span>Loading secure workspace...</span></div>;
  }

  if (session && showResetPassword) {
    return (
      <div className="auth-shell auth-reset-shell">
        <div className="auth-visual"><div className="auth-orbit orbit-one" /><div className="auth-orbit orbit-two" /><div className="auth-visual-content"><div className="brand-row auth-brand"><div className="brand-mark"><Sparkles size={17} /></div><div><strong>BizAssist</strong><span>Customer operations</span></div></div><div className="auth-quote"><span className="eyebrow accent">Secure recovery</span><h1>A fresh start for your workspace.</h1><p>Choose a new password to get back to the support queue with confidence.</p><div className="auth-proof"><div className="proof-icon"><Check size={16} /></div><span>Your reset link is time-limited and protected</span></div></div></div></div>
        <main className="auth-panel"><div className="auth-panel-inner"><div className="auth-mobile-brand"><div className="brand-mark"><Sparkles size={17} /></div><strong>BizAssist</strong></div><div className="auth-heading"><span className="eyebrow accent">Password recovery</span><h2>Set a new password</h2><p>Use at least 6 characters and keep it unique to this workspace.</p></div>{authError && <div className="auth-message error"><CircleHelp size={16} />{authError}</div>}<form className="auth-form" onSubmit={updatePassword}><label>New password<div className="auth-input"><span className="password-dot">•••</span><input required type="password" minLength={6} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="At least 6 characters" autoComplete="new-password" /></div></label><label>Confirm new password<div className="auth-input"><span className="password-dot">•••</span><input required type="password" minLength={6} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Repeat your new password" autoComplete="new-password" /></div></label><button className="primary-button auth-submit" type="submit">Update password <Check size={16} /></button></form><p className="auth-privacy"><Check size={13} /> Password recovery is protected by Supabase.</p></div></main>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="auth-shell">
        <div className="auth-visual"><div className="auth-orbit orbit-one" /><div className="auth-orbit orbit-two" /><div className="auth-visual-content"><div className="brand-row auth-brand"><div className="brand-mark"><Sparkles size={17} /></div><div><strong>BizAssist</strong><span>Customer operations</span></div></div><div className="auth-quote"><span className="eyebrow accent">Support workspace</span><h1>Make every customer feel heard.</h1><p>Bring your team's conversations, context, and next best actions into one focused workspace.</p><div className="auth-proof"><div className="proof-icon"><Check size={16} /></div><span>Secure agent access powered by Supabase</span></div><div className="auth-proof"><div className="proof-icon"><Sparkles size={16} /></div><span>AI-assisted workflows with human approval</span></div></div></div></div>
        <main className="auth-panel"><div className="auth-panel-inner"><div className="auth-mobile-brand"><div className="brand-mark"><Sparkles size={17} /></div><strong>BizAssist</strong></div><div className="auth-heading"><span className="eyebrow accent">Agent portal</span><h2>{authMode === 'sign-in' ? 'Welcome back' : authMode === 'forgot' ? 'Reset your password' : 'Create your agent account'}</h2><p>{authMode === 'sign-in' ? 'Sign in to manage your support queue.' : authMode === 'forgot' ? 'Enter your work email and we will send a secure recovery link.' : 'Join your support workspace with your work email.'}</p></div>{authError && <div className="auth-message error"><CircleHelp size={16} />{authError}</div>}{authNotice && <div className="auth-message success"><Check size={16} />{authNotice}</div>}<form className="auth-form" onSubmit={handleAuth}><label>Email address<div className="auth-input"><UserRound size={16} /><input required type="email" value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} placeholder="you@company.com" autoComplete="email" /></div></label>{authMode !== 'forgot' && <label>Password<div className="auth-input"><span className="password-dot">•••</span><input required type="password" minLength={6} value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} placeholder="At least 6 characters" autoComplete={authMode === 'sign-in' ? 'current-password' : 'new-password'} /></div></label>}<button className="primary-button auth-submit" type="submit">{authMode === 'sign-in' ? 'Sign in to workspace' : authMode === 'forgot' ? 'Send reset link' : 'Create account'}{authMode === 'forgot' ? <Send size={16} /> : <ArrowUpRight size={16} />}</button></form>{authMode === 'sign-in' && <button className="forgot-link" onClick={() => { setAuthMode('forgot'); setAuthError(''); setAuthNotice(''); }}>Forgot your password?</button>}<div className="auth-switch">{authMode === 'sign-in' ? <><span>New to BizAssist?</span><button onClick={() => { setAuthMode('sign-up'); setAuthError(''); setAuthNotice(''); }}>Create an account</button></> : <><span>{authMode === 'forgot' ? 'Remember your password?' : 'Already have an account?'}</span><button onClick={() => { setAuthMode('sign-in'); setAuthError(''); setAuthNotice(''); }}>Sign in instead</button></>}</div><p className="auth-privacy"><Check size={13} /> Your workspace is protected with Supabase authentication.</p></div></main>
      </div>
    );
  }

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
        <div className="sidebar-bottom"><div className="upgrade-card"><div className="upgrade-icon"><Bot size={18} /></div><strong>AI copilot is active</strong><p>Use assistive suggestions to resolve tickets faster.</p><button>View capabilities <ArrowUpRight size={14} /></button></div><div className="profile-row"><div className="profile-avatar">{session.user.email?.slice(0, 2).toUpperCase() ?? 'AG'}</div><div><strong>{session.user.email?.split('@')[0] ?? 'Agent'}</strong><span>Authenticated agent</span></div><button className="icon-button" onClick={() => void supabase.auth.signOut()} aria-label="Sign out"><MoreHorizontal size={18} /></button></div></div>
      </aside>

      <main className="main-content">
        <header className="topbar"><div className="topbar-left"><button className="icon-button menu-trigger" onClick={() => setShowMobileNav(true)} aria-label="Open menu"><Menu size={21} /></button><div><p className="eyebrow">Tuesday, November 18, 2026</p><h1>Good morning, Jordan <span>—</span></h1></div></div><div className="topbar-actions"><button className="icon-button" aria-label="Help"><CircleHelp size={19} /></button><button className="icon-button notification" aria-label="Notifications"><Bell size={19} /><i /></button><button className="top-avatar" onClick={() => void supabase.auth.signOut()} aria-label="Sign out">{session.user.email?.slice(0, 2).toUpperCase() ?? 'AG'}</button></div></header>

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

            <aside className="assistant-card"><div className="assistant-header"><div className="assistant-title"><div className="bot-avatar"><Sparkles size={16} /></div><div><strong>BizAssist AI</strong><span><i /> {chat.status === 'streaming' || chat.status === 'submitted' ? 'Thinking...' : 'Online'}</span></div></div><button className="icon-button"><MoreHorizontal size={18} /></button></div><div className="assistant-intro"><span className="assistant-kicker">AI copilot</span><h3>How can I help today?</h3><p>Ask about a ticket, draft a response, or find the right help article.</p></div><div className="assistant-messages" ref={assistantRef}>{chat.messages.length === 0 ? <div className="assistant-message bot">Hi there. I can help you find a ticket, article, or next best action.</div> : chat.messages.map((message) => <div className={`assistant-message ${message.role === 'user' ? 'user' : 'bot'}`} key={message.id}>{message.parts.map((part, index) => part.type === 'text' ? <span key={index}>{part.text}</span> : null)}</div>)}</div><div className="suggested-prompts"><span>Try asking</span><button onClick={() => setAssistantInput('What should I do with high priority tickets?')}>High priority tickets</button><button onClick={() => setAssistantInput('Draft a reply for the selected ticket')}>Draft a reply</button></div><form className="assistant-input" onSubmit={sendAssistantMessage}><input value={assistantInput} onChange={(event) => setAssistantInput(event.target.value)} placeholder={isListening ? 'Listening...' : 'Ask BizAssist...'} /><button type="button" className={`assistant-mic ${isListening ? 'listening' : ''}`} onClick={toggleSpeechInput} aria-label={isListening ? 'Stop voice input' : 'Start voice input'} title={speechSupported ? 'Dictate a message' : 'Voice input is not supported in this browser'}><>{isListening ? <MicOff size={16} /> : <Mic size={16} />}</></button><button type="submit" aria-label="Send message" disabled={chat.status === 'streaming' || chat.status === 'submitted'}><Send size={16} /></button></form><p className="assistant-footnote"><Sparkles size={13} /> AI suggestions are reviewed by your team before sending.</p></aside>
          </section>
        </div>
      </main>

      {selectedTicket && <div className="drawer-backdrop" onClick={() => setSelectedTicket(null)}><aside className="ticket-drawer" onClick={(event) => event.stopPropagation()}><div className="drawer-top"><div><span className="eyebrow accent">{selectedTicket.ticket_number}</span><h2>{selectedTicket.subject}</h2></div><button className="icon-button" onClick={() => setSelectedTicket(null)} aria-label="Close ticket"><X size={19} /></button></div><div className="drawer-meta"><span className={`status ${statusClass(selectedTicket.status)}`}>{selectedTicket.status}</span><span className={`priority ${selectedTicket.priority.toLowerCase()}`}><i />{selectedTicket.priority} priority</span><span>{selectedTicket.category}</span></div><div className="drawer-actions"><label>Assigned to<select value={selectedTicket.assigned_to ?? ''} onChange={(event) => void updateTicket(selectedTicket.id, { assigned_to: event.target.value })}><option value="">Unassigned</option>{agents.map((agent) => <option key={agent}>{agent}</option>)}</select></label><label>Status<select value={selectedTicket.status} onChange={(event) => void updateTicket(selectedTicket.id, { status: event.target.value })}><option>Open</option><option>In Progress</option><option>Waiting</option><option>Resolved</option></select></label></div><div className="ai-action-row"><button className="secondary-button" onClick={() => void runTicketAction('summary')} disabled={aiLoading !== null}>{aiLoading === 'summary' ? 'Summarizing...' : 'Summarize'} <Sparkles size={14} /></button><button className="secondary-button" onClick={() => void runTicketAction('draft')} disabled={aiLoading !== null}>{aiLoading === 'draft' ? 'Drafting...' : 'Draft reply'} <Sparkles size={14} /></button></div><div className="drawer-section"><span className="drawer-label">Customer message</span><div className="customer-message"><div className="customer-cell"><div className="mini-avatar large">{selectedTicket.customer_name.split(' ').map((name) => name[0]).join('').slice(0, 2)}</div><strong>{selectedTicket.customer_name}</strong><small>{selectedTicket.customer_email}</small></div><p>{selectedTicket.description}</p></div></div><div className="drawer-section"><span className="drawer-label">Conversation</span><div className="conversation">{messages.length ? messages.map((message) => <div className={`conversation-message ${message.sender_type}`} key={message.id}><strong>{message.sender_name}</strong><span>{message.message}</span><small>{formatTime(message.created_at)}</small></div>) : <p className="muted-cell">No messages yet.</p>}</div></div>{selectedTicket.ai_summary && <div className="ai-insight"><div><Sparkles size={16} /><strong>AI summary</strong></div><p>{selectedTicket.ai_summary}</p></div>}{selectedTicket.ai_suggested_response && <div className="ai-insight"><div><Sparkles size={16} /><strong>Suggested reply</strong></div><p>{selectedTicket.ai_suggested_response}</p></div>}</aside></div>}

      {showNewTicket && <div className="modal-backdrop" onClick={() => setShowNewTicket(false)}><form className="new-ticket-modal" onSubmit={createTicket} onClick={(event) => event.stopPropagation()}><div className="modal-header"><div><span className="eyebrow accent">New request</span><h2>Create a support ticket</h2></div><button type="button" className="icon-button" onClick={() => setShowNewTicket(false)} aria-label="Close form"><X size={19} /></button></div><div className="form-grid"><label>Customer name<input required value={newTicket.customer_name} onChange={(event) => setNewTicket({ ...newTicket, customer_name: event.target.value })} placeholder="e.g. Alex Morgan" /></label><label>Email address<input required type="email" value={newTicket.customer_email} onChange={(event) => setNewTicket({ ...newTicket, customer_email: event.target.value })} placeholder="alex@example.com" /></label><label>Subject<input required value={newTicket.subject} onChange={(event) => setNewTicket({ ...newTicket, subject: event.target.value })} placeholder="What does the customer need?" /></label><label>Category<select value={newTicket.category} onChange={(event) => setNewTicket({ ...newTicket, category: event.target.value })}><option>General Inquiry</option><option>Billing</option><option>Account</option><option>Technical</option><option>Orders</option></select></label><label>Priority<select value={newTicket.priority} onChange={(event) => setNewTicket({ ...newTicket, priority: event.target.value })}><option>Low</option><option>Medium</option><option>High</option></select></label><label className="full-field">Description<textarea required rows={4} value={newTicket.description} onChange={(event) => setNewTicket({ ...newTicket, description: event.target.value })} placeholder="Describe the customer's request..." /></label></div><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setShowNewTicket(false)}>Cancel</button><button type="submit" className="primary-button"><Plus size={17} /> Create ticket</button></div></form></div>}
    </div>
  );
}

export default App;
