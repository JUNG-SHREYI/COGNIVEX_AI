import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import Navbar from './components/Navbar';
import CustomDomainModal from './components/CustomDomainModal';
import { clearChatHistory, getChatHistory, getDomains, getDomainDetails, promptCognivex } from './api';
import {
  ArrowUp, Bot, ChevronDown, History, Sparkles, Trash2, User,
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

export default function App() {
  const [domains, setDomains] = useState([]);
  const [currentTab, setCurrentTab] = useState('village');
  const [domainData, setDomainData] = useState(null);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [messages, setMessages] = useState([]);
  const [prompt, setPrompt] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isCustomDomainOpen, setIsCustomDomainOpen] = useState(false);
  const textareaRef = useRef(null);
  const [sessionId] = useState(() => {
    const stored = window.localStorage.getItem('cognivex-session-id');
    const next = stored || crypto.randomUUID();
    window.localStorage.setItem('cognivex-session-id', next);
    return next;
  });
  const messagesEndRef = useRef(null);

  // Initialize domains
  useEffect(() => {
    loadDomains();
    loadHistory();
  }, []);

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

  const loadDomains = async () => {
    try {
      const data = await getDomains();
      if (data && data.domains) setDomains(data.domains);
    } catch (err) {
      console.error('Failed to load domains:', err);
    }
  };

  const loadDomain = async (domainId) => {
    try {
      const data = await getDomainDetails(domainId);
      setDomainData(data);
      if (data.active_incidents?.length > 0) {
        setSelectedIncident(data.active_incidents[0]);
      }
    } catch (err) {
      console.error(`Failed to load domain ${domainId}:`, err);
    }
  };

  const loadHistory = async () => {
    try {
      const data = await getChatHistory(sessionId);
      setMessages((data.messages || []).map((m) => ({
        role: m.role,
        content: m.content,
        sources: m.sources || []
      })));
    } catch (err) {
      console.error('Failed to load chat history:', err);
    }
  };

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
        sources: res.sources || [],
        anomaly_score: res.anomaly_score,
        predicted_cause: res.predicted_cause
      }]);
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
      />

      <main className="chat-shell">
        {/* Toolbar */}
        <div className="chat-toolbar">
          <span><History size={16} /> Chat history</span>
          {messages.length > 0 && (
            <button className="clear-history-button" onClick={handleClearHistory} title="Clear chat history">
              <Trash2 size={15} /> Clear
            </button>
          )}
        </div>

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
