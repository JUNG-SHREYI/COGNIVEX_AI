import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import Navbar from './components/Navbar';
import CustomDomainModal from './components/CustomDomainModal';
import AuthPage from './components/AuthPage';
import AdminPage from './components/AdminPage';
import { supabase } from './supabaseClient';
import { clearChatHistory, getAdminOverview, getChatHistory, getDomains, getDomainDetails, getIntegrationsStatus, promptCognivex } from './api';
import {
  AlertCircle, ArrowUp, Bot, CheckCircle2, ChevronDown, Copy, Database, ExternalLink,
  History, Sparkles, Trash2, User,
  Wheat, GraduationCap, Factory, HeartPulse, Building2, Zap,
  Brain, Shield, Layers
} from 'lucide-react';

// ─── Suggested prompt cards for the welcome screen ───────────────────────────
const SUGGESTIONS = [
  {
    icon: <Wheat size={18} />,
    color: '#10b981',
    label: 'Village Intelligence',
    prompt: 'What is the borewell drawdown status and what should we do about it?',
    domain: 'village'
  },
  {
    icon: <GraduationCap size={18} />,
    color: '#6366f1',
    label: 'College Intelligence',
    prompt: 'Which students are at dropout risk this semester and why?',
    domain: 'college'
  },
  {
    icon: <Factory size={18} />,
    color: '#06b6d4',
    label: 'Industry Intelligence',
    prompt: 'Diagnose the CNC Mill spindle bearing vibration and predict failure timeline.',
    domain: 'industry'
  },
  {
    icon: <HeartPulse size={18} />,
    color: '#ec4899',
    label: 'Healthcare Intelligence',
    prompt: 'Is ICU Patient Bed 08 showing sepsis onset signs? What should we do immediately?',
    domain: 'healthcare'
  },
  {
    icon: <Building2 size={18} />,
    color: '#f59e0b',
    label: 'Smart City Intelligence',
    prompt: 'What is the power grid substation load status and is there a cascade risk?',
    domain: 'smart_city'
  },
  {
    icon: <Brain size={18} />,
    color: '#a855f7',
    label: 'About Cognivex AI',
    prompt: 'Explain how Cognivex AI works and what makes it different from a regular chatbot.',
    domain: null
  }
];

function normalizeSources(sources) {
  if (Array.isArray(sources)) return sources;
  if (typeof sources !== 'string') return [];
  try {
    const parsed = JSON.parse(sources);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function App() {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [adminOverview, setAdminOverview] = useState(null);
  const [adminError, setAdminError] = useState('');
  const [domains, setDomains] = useState([]);
  const [currentTab, setCurrentTab] = useState('village');
  const [domainData, setDomainData] = useState(null);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [messages, setMessages] = useState([]);
  const [prompt, setPrompt] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isCustomDomainOpen, setIsCustomDomainOpen] = useState(false);
  const [integrationsStatus, setIntegrationsStatus] = useState(null);
  const [showSqlBanner, setShowSqlBanner] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const textareaRef = useRef(null);
  const sessionId = user?.id || 'anonymous';
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return undefined;
    }
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user || null);
      setAccessToken(data.session?.access_token || null);
      setAuthLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      setAccessToken(session?.access_token || null);
      setAuthLoading(false);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  // Initialize domains and integration status
  useEffect(() => {
    loadDomains();
    checkIntegrations();
  }, []);

  async function checkIntegrations() {
    try {
      const data = await getIntegrationsStatus();
      setIntegrationsStatus(data);
      if (data?.supabase?.status === 'schema_incomplete') {
        setShowSqlBanner(true);
      }
    } catch (err) {
      console.error('Failed to load integrations status:', err);
    }
  }

  useEffect(() => {
    if (user) loadHistory();
  }, [user]);

  // When tab changes, load domain data
  useEffect(() => {
    loadDomain(currentTab);
  }, [currentTab]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [prompt]);

  if (authLoading) return <div className="auth-loading">Loading Cognivex...</div>;
  if (!user) return <AuthPage onAuthenticated={setUser} />;

  const openAdmin = async () => {
    try {
      setAdminError('');
      setAdminOverview(await getAdminOverview(accessToken));
    } catch (error) {
      setAdminError(error.message);
    }
  };

  if (adminOverview) return <AdminPage overview={adminOverview} onBack={() => setAdminOverview(null)} />;

  async function loadDomains() {
    try {
      const data = await getDomains();
      if (data && data.domains) setDomains(data.domains);
    } catch (err) {
      console.error('Failed to load domains:', err);
    }
  }

  async function loadDomain(domainId) {
    try {
      const data = await getDomainDetails(domainId);
      setDomainData(data);
      if (data.active_incidents?.length > 0) {
        setSelectedIncident(data.active_incidents[0]);
      }
    } catch (err) {
      console.error(`Failed to load domain ${domainId}:`, err);
    }
  }

  async function loadHistory() {
    try {
      const data = await getChatHistory(sessionId);
      setMessages((data.messages || []).map((m) => ({
        role: m.role,
        content: m.content,
        sources: normalizeSources(m.sources)
      })));
    } catch (err) {
      console.error('Failed to load chat history:', err);
    }
  }

  const sendMessage = async (value = prompt) => {
    const text = value.trim();
    if (!text || isSending) return;

    // Build context prefix for the AI so it knows the domain
    const domainName = domainData?.name || '';
    const incidentHeadline = selectedIncident?.headline || '';
    const contextLines = [
      domainName ? `Domain: ${domainName}` : '',
      incidentHeadline ? `Active Scenario: ${incidentHeadline}` : ''
    ].filter(Boolean);
    const request = contextLines.length
      ? `${contextLines.join('\n')}\n\nUser: ${text}`
      : text;

    setMessages((cur) => [...cur, { role: 'user', content: text }]);
    setPrompt('');
    setIsSending(true);

    try {
      const res = await promptCognivex(request, 200, sessionId);
      const response =
        res.generated_text ||
        res.response ||
        res.predicted_action ||
        'I could not generate a response for that request.';
      setMessages((cur) => [...cur, {
        role: 'assistant',
        content: response,
        sources: normalizeSources(res.sources),
        anomaly_score: res.anomaly_score,
        predicted_cause: res.predicted_cause,
        provider_used: res.provider_used,
        provider_status: res.provider_status,
        provider_model: res.provider_model,
        provider_notice: res.provider_notice
      }]);
      // Refresh integration status
      checkIntegrations();
    } catch {
      setMessages((cur) => [...cur, {
        role: 'assistant',
        content: 'I am unable to connect right now. Please check that the Cognivex API server is running on port 8000 and try again.'
      }]);
    } finally {
      setIsSending(false);
    }
  };

  const handleSuggestion = (sugg) => {
    if (sugg.domain) {
      const d = domains.find(d => d.id === sugg.domain);
      if (d) setCurrentTab(sugg.domain);
    }
    sendMessage(sugg.prompt);
  };

  const handleClearHistory = async () => {
    await clearChatHistory(sessionId);
    setMessages([]);
  };

  const handleSignOut = async () => {
    await supabase?.auth.signOut();
    setMessages([]);
  };

  const handleDomainCreated = (newDomain) => {
    setDomains((prev) => [...prev, {
      id: newDomain.id,
      name: newDomain.name,
      icon: newDomain.icon,
      tagline: newDomain.tagline,
      theme_color: newDomain.theme_color,
      sensors_count: newDomain.sensors.length,
      incidents_count: newDomain.active_incidents.length
    }]);
    setCurrentTab(newDomain.id);
  };

  return (
    <div className="chat-app">
      <Navbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        domains={domains}
        onOpenCustomModal={() => setIsCustomDomainOpen(true)}
        userEmail={user.email}
        onSignOut={handleSignOut}
        onOpenAdmin={openAdmin}
        adminError={adminError}
      />

      <main className="chat-shell">
        {/* Toolbar with Integration Status */}
        <div className="chat-toolbar">
          <div className="integration-pills">
            <span><History size={15} /> Chat history</span>

            {/* Supabase Status */}
            {integrationsStatus?.supabase && (
              integrationsStatus.supabase.status === 'connected' ? (
                <span className="status-pill online" title="Supabase Chat_History connected">
                  <span className="dot" /> Supabase DB Connected
                </span>
              ) : (
                <button
                  className="status-pill warning"
                  onClick={() => setShowSqlBanner((prev) => !prev)}
                  title={integrationsStatus.supabase.message}
                >
                  <span className="dot" /> Supabase: Table Setup Needed
                </button>
              )
            )}

            {/* OpenAI Status */}
            {integrationsStatus?.openai && (
              integrationsStatus.openai.status === 'online' ? (
                <span className="status-pill online" title={`Connected to OpenAI ${integrationsStatus.openai.model}`}>
                  <span className="dot" /> OpenAI ({integrationsStatus.openai.model})
                </span>
              ) : integrationsStatus.openai.status === 'quota_exhausted' ? (
                <a
                  href="https://platform.openai.com/usage"
                  target="_blank"
                  rel="noreferrer"
                  className="status-pill warning"
                  title="OpenAI quota exhausted. Click to check usage and billing."
                >
                  <span className="dot" /> OpenAI: Quota Reached (Check Usage)
                  <ExternalLink size={11} />
                </a>
              ) : (
                <a
                  href="https://platform.openai.com/usage"
                  target="_blank"
                  rel="noreferrer"
                  className="status-pill error"
                  title={integrationsStatus.openai.message}
                >
                  <span className="dot" /> OpenAI: {integrationsStatus.openai.status}
                </a>
              )
            )}
          </div>

          {messages.length > 0 && (
            <button className="clear-history-button" onClick={handleClearHistory} title="Clear chat history">
              <Trash2 size={15} /> Clear
            </button>
          )}
        </div>

        {/* Supabase SQL Schema Setup Banner */}
        {showSqlBanner && integrationsStatus?.supabase?.status === 'schema_incomplete' && (
          <div className="sql-banner">
            <h3><AlertCircle size={17} /> Supabase Database Setup Required</h3>
            <p>
              Your Supabase <code>Chat_History</code> table needs the required columns to save chat messages.
              Copy and execute this query in your{' '}
              <a
                href="https://supabase.com/dashboard/project/tgqjilgdnyzktppkybmu/sql/new"
                target="_blank"
                rel="noreferrer"
                style={{ color: '#38bdf8', textDecoration: 'underline' }}
              >
                Supabase Dashboard &rarr; SQL Editor
              </a>:
            </p>
            <pre>{integrationsStatus.supabase.sql_repair}</pre>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '6px' }}>
              <button
                className="sql-copy-btn"
                onClick={() => {
                  navigator.clipboard.writeText(integrationsStatus.supabase.sql_repair);
                  setCopiedSql(true);
                  setTimeout(() => setCopiedSql(false), 2500);
                }}
              >
                {copiedSql ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                {copiedSql ? 'Copied SQL!' : 'Copy SQL to Clipboard'}
              </button>
              <button
                className="clear-history-button"
                style={{ fontSize: '0.76rem' }}
                onClick={() => setShowSqlBanner(false)}
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Message list or Welcome screen */}
        <section className="chat-content" aria-label="Cognivex conversation">
          {messages.length === 0 ? (
            <div className="chat-welcome">
              {/* Cognivex logo mark */}
              <div className="welcome-mark">
                <Sparkles size={26} />
              </div>
              <h2>How can I help you today?</h2>
              <p>
                Ask Cognivex about any domain — agriculture, education, manufacturing, healthcare, or smart cities.
                It answers with <strong>what happened, why, what next, and what to do</strong>.
              </p>

              {/* Suggestion grid */}
              <div className="suggestion-grid">
                {SUGGESTIONS.map((s, i) => (
                  <button
                    key={i}
                    id={`suggestion-${i}`}
                    className="suggestion-card"
                    onClick={() => handleSuggestion(s)}
                    style={{ '--accent': s.color }}
                  >
                    <span className="suggestion-icon" style={{ background: `${s.color}22`, color: s.color }}>
                      {s.icon}
                    </span>
                    <div className="suggestion-text">
                      <span className="suggestion-label" style={{ color: s.color }}>{s.label}</span>
                      <span className="suggestion-prompt">{s.prompt}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="message-list">
              {messages.map((message, index) => (
                <article className={`chat-message ${message.role}`} key={`${message.role}-${index}`}>
                  <div className="message-icon">
                    {message.role === 'user' ? <User size={15} /> : <Bot size={16} />}
                  </div>
                  <div className="message-copy">
                    {/* Provider badge */}
                    {message.role === 'assistant' && (
                      <div className={`provider-badge ${message.provider_used === 'openai' ? 'openai' : ''}`}>
                        {message.provider_used === 'openai'
                          ? `🤖 OpenAI ${message.provider_model || 'gpt-4o-mini'}`
                          : '🧠 Cognivex Causal Engine'}
                      </div>
                    )}

                    {message.role === 'assistant' ? (
                      <ReactMarkdown
                        components={{
                          // Style inline code
                          code: ({ node, inline, children, ...props }) => (
                            inline
                              ? <code style={{ background: 'rgba(255,255,255,0.08)', padding: '1px 6px', borderRadius: '4px', fontSize: '0.85em', fontFamily: 'JetBrains Mono, monospace' }} {...props}>{children}</code>
                              : <pre style={{ background: 'rgba(0,0,0,0.4)', padding: '12px', borderRadius: '8px', overflowX: 'auto', marginTop: '8px' }}><code style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.82em' }} {...props}>{children}</code></pre>
                          ),
                          // Bold
                          strong: ({ children }) => <strong style={{ color: '#f8fafc', fontWeight: 700 }}>{children}</strong>,
                          // Horizontal rule
                          hr: () => <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)', margin: '12px 0' }} />,
                          // Ordered list
                          ol: ({ children }) => <ol style={{ paddingLeft: '20px', marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>{children}</ol>,
                          // Unordered list
                          ul: ({ children }) => <ul style={{ paddingLeft: '18px', marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '4px', listStyle: 'disc' }}>{children}</ul>,
                          li: ({ children }) => <li style={{ color: '#cbd5e1', lineHeight: '1.55' }}>{children}</li>,
                          p: ({ children }) => <p style={{ marginBottom: '6px', lineHeight: '1.65' }}>{children}</p>,
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    ) : (
                      message.content
                    )}

                    {/* Provider notice banner (e.g. OpenAI quota exhausted) */}
                    {message.role === 'assistant' && message.provider_notice && (
                      <div className="provider-notice-banner">
                        <div className="provider-notice-header">
                          <Zap size={14} />
                          <span>
                            {message.provider_notice.type === 'quota_exhausted'
                              ? 'OpenAI Quota Limit Notice'
                              : 'OpenAI Provider Notice'}
                          </span>
                        </div>
                        <p>{message.provider_notice.message}</p>
                        {message.provider_notice.usage_url && (
                          <a
                            href={message.provider_notice.usage_url}
                            target="_blank"
                            rel="noreferrer"
                            className="provider-notice-link"
                          >
                            Check OpenAI Usage & Billing Limits ({message.provider_notice.usage_url}) &rarr;
                          </a>
                        )}
                      </div>
                    )}

                    {/* Source links */}
                    {message.role === 'assistant' && message.sources?.length > 0 && (
                      <div className="source-list">
                        <span>Sources</span>
                        {message.sources.map((source) => (
                          <a href={source.url} target="_blank" rel="noreferrer" key={source.url}>
                            {source.title}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </article>
              ))}

              {/* Typing indicator */}
              {isSending && (
                <div className="typing-indicator">
                  <div className="message-icon" style={{ background: 'rgba(132,204,22,0.12)', color: '#a3e635' }}>
                    <Bot size={16} />
                  </div>
                  <span /><span /><span />
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </section>

        {/* Composer area */}
        <section className="composer-area">
          {/* Context chips */}
          {domainData?.active_incidents?.length > 0 && (
            <div className="context-row">
              <span className="context-label">Context</span>
              <button className="context-select">
                {domainData.name || 'Domain'} <ChevronDown size={13} />
              </button>
              {domainData.active_incidents.map((incident) => (
                <button
                  className={`context-chip ${selectedIncident?.id === incident.id ? 'selected' : ''}`}
                  key={incident.id}
                  onClick={() => setSelectedIncident(incident)}
                  title={incident.headline}
                >
                  {incident.headline.length > 52
                    ? incident.headline.slice(0, 50) + '…'
                    : incident.headline}
                </button>
              ))}
            </div>
          )}

          {/* Composer form */}
          <form
            className="chat-composer"
            onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
          >
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
              }}
              placeholder="Message Cognivex AI… (Shift+Enter for new line)"
              rows={1}
              aria-label="Message Cognivex"
            />
            <button
              className="send-button"
              type="submit"
              disabled={!prompt.trim() || isSending}
              aria-label="Send message"
              title="Send (Enter)"
            >
              <ArrowUp size={18} />
            </button>
          </form>
          <p className="composer-note">
            Cognivex AI • Causal Transformer v2.0 • {domains.length} domains active
          </p>
        </section>
      </main>

      <CustomDomainModal
        isOpen={isCustomDomainOpen}
        onClose={() => setIsCustomDomainOpen(false)}
        onDomainCreated={handleDomainCreated}
      />
    </div>
  );
}
