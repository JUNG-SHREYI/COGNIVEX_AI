import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import CustomDomainModal from './components/CustomDomainModal';
import AuthPage from './components/AuthPage';
import LandingPage from './components/LandingPage';
import AdminPage from './components/AdminPage';
import PasswordSettings from './components/PasswordSettings';
import { supabase } from './supabaseClient';
import {
  createChatSession,
  deleteAllChatSessions,
  deleteChatSession,
  getAdminOverview,
  getChatHistory,
  getChatSessions,
  getDomains,
  getDomainDetails,
  getIntegrationsStatus,
  promptCognivex,
  promptDsaTutor
} from './api';
import {
  ArrowUp, Bot, ChevronDown, LogOut, MessageSquare,
  MessageSquarePlus, Settings, ShieldCheck, Sparkles, Trash2, User, X,
  Wheat, GraduationCap, Factory, HeartPulse, Building2, Zap, PanelLeftClose, PanelLeftOpen,
  Brain, Shield, Layers, Palette, ImagePlus
} from 'lucide-react';

const APP_THEMES = [
  { id: 'midnight', label: 'Midnight', color: '#151d33' },
  { id: 'ocean', label: 'Ocean', color: '#123047' },
  { id: 'forest', label: 'Forest', color: '#183b28' },
  { id: 'violet', label: 'Violet', color: '#292044' },
  { id: 'ember', label: 'Ember', color: '#3b251a' }
];

const GEMINI_MODELS = [
  { id: 'gemini-4-argon', label: 'Gemini 4 Argon - Flagship' },
  { id: 'gemini-3.8-flash', label: 'Gemini 3.8 Flash' },
  { id: 'gemini-3.6-flash', label: 'Gemini 3.6 Flash' },
  { id: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash-Lite' },
  { id: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash-Lite' }
];

const THEME_STORAGE_KEY = 'cognivex.appTheme';
const BACKGROUND_STORAGE_KEY = 'cognivex.customBackground';
const GEMINI_MODEL_STORAGE_KEY = 'cognivex.geminiModel';
const SIDEBAR_WIDTH_STORAGE_KEY = 'cognivex.sidebarWidth';
const SIDEBAR_COLLAPSED_STORAGE_KEY = 'cognivex.sidebarCollapsed';
const MIN_SIDEBAR_WIDTH = 152;
const MAX_SIDEBAR_WIDTH = 400;
const DEFAULT_SIDEBAR_WIDTH = 248;
const ADMIN_EMAIL = 'bitrashreyi97@gmail.com';

function getMaxSidebarWidth() {
  return Math.max(
    MIN_SIDEBAR_WIDTH,
    Math.min(MAX_SIDEBAR_WIDTH, window.innerWidth - (window.innerWidth <= 720 ? 180 : 360) - 6)
  );
}

function clampSidebarWidth(width) {
  return Math.min(getMaxSidebarWidth(), Math.max(MIN_SIDEBAR_WIDTH, Math.round(width)));
}

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
  },
  {
    icon: <GraduationCap size={18} />,
    color: '#f97316',
    label: 'DSA AI Tutor',
    prompt: 'Explain what a stack is with a simple example.',
    assistant: 'dsa-tutor'
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

function getDomainIcon(iconName) {
  switch (iconName) {
    case 'Wheat': return <Wheat size={16} />;
    case 'GraduationCap': return <GraduationCap size={16} />;
    case 'Factory': return <Factory size={16} />;
    case 'HeartPulse': return <HeartPulse size={16} />;
    case 'Building2': return <Building2 size={16} />;
    default: return <Layers size={16} />;
  }
}

export default function App() {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [publicPage, setPublicPage] = useState('landing');
  const [adminOverview, setAdminOverview] = useState(null);
  const [adminError, setAdminError] = useState('');
  const [domains, setDomains] = useState([]);
  const [currentTab, setCurrentTab] = useState('village');
  const [assistantMode, setAssistantMode] = useState('cognivex');
  const [selectedGeminiModel, setSelectedGeminiModel] = useState(() => {
    const savedModel = window.localStorage.getItem(GEMINI_MODEL_STORAGE_KEY);
    return GEMINI_MODELS.some((model) => model.id === savedModel)
      ? savedModel
      : 'gemini-3.1-flash-lite';
  });
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const savedWidth = Number(window.localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY));
    return Number.isFinite(savedWidth) && savedWidth >= MIN_SIDEBAR_WIDTH && savedWidth <= MAX_SIDEBAR_WIDTH
      ? clampSidebarWidth(savedWidth)
      : clampSidebarWidth(DEFAULT_SIDEBAR_WIDTH);
  });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
    () => window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === 'true'
  );
  const [domainData, setDomainData] = useState(null);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [messages, setMessages] = useState([]);
  const [chatSessions, setChatSessions] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [chatSessionsLoading, setChatSessionsLoading] = useState(true);
  const [chatSessionError, setChatSessionError] = useState('');
  const [deletingChatIds, setDeletingChatIds] = useState([]);
  const [isDeletingAllChats, setIsDeletingAllChats] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isCustomDomainOpen, setIsCustomDomainOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const [appTheme, setAppTheme] = useState(() => {
    const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    return APP_THEMES.some((theme) => theme.id === savedTheme) ? savedTheme : 'midnight';
  });
  const [customBackground, setCustomBackground] = useState(
    () => window.localStorage.getItem(BACKGROUND_STORAGE_KEY) || ''
  );
  const [cropSourceUrl, setCropSourceUrl] = useState('');
  const [cropImage, setCropImage] = useState(null);
  const [cropWidth, setCropWidth] = useState('1920');
  const [cropHeight, setCropHeight] = useState('1080');
  const [cropZoom, setCropZoom] = useState(1);
  const [cropCenter, setCropCenter] = useState({ x: 0.5, y: 0.5 });
  const [backgroundError, setBackgroundError] = useState('');
  const [isSavingBackground, setIsSavingBackground] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(
    () => window.localStorage.getItem('cognivex.reduceMotion') === 'true'
  );
  const [integrationsStatus, setIntegrationsStatus] = useState(null);
  const textareaRef = useRef(null);
  const cropCanvasRef = useRef(null);
  const cropDragRef = useRef(null);
  const sidebarResizeRef = useRef(false);
  const sessionId = user?.id || '';
  const messagesEndRef = useRef(null);
  const skipHistoryLoadForChatRef = useRef(null);

  useEffect(() => {
    document.documentElement.dataset.appTheme = appTheme;
  }, [appTheme]);

  useEffect(() => {
    const handleResize = () => setSidebarWidth((width) => clampSidebarWidth(width));
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    return () => {
      if (cropSourceUrl) URL.revokeObjectURL(cropSourceUrl);
    };
  }, [cropSourceUrl]);

  useEffect(() => {
    if (!cropImage || !cropCanvasRef.current) return;
    const canvas = cropCanvasRef.current;
    const outputWidth = Number(cropWidth);
    const outputHeight = Number(cropHeight);
    if (!outputWidth || !outputHeight) return;
    const aspectRatio = outputWidth / outputHeight;
    canvas.width = 900;
    canvas.height = Math.max(1, Math.round(canvas.width / aspectRatio));
    const context = canvas.getContext('2d');
    if (!context) {
      setBackgroundError('Your browser could not preview this image.');
      return;
    }

    const imageRatio = cropImage.naturalWidth / cropImage.naturalHeight;
    const baseWidth = imageRatio > aspectRatio
      ? cropImage.naturalHeight * aspectRatio
      : cropImage.naturalWidth;
    const baseHeight = baseWidth / aspectRatio;
    const sourceWidth = baseWidth / cropZoom;
    const sourceHeight = baseHeight / cropZoom;
    const centerX = Math.min(
      cropImage.naturalWidth - sourceWidth / 2,
      Math.max(sourceWidth / 2, cropCenter.x * cropImage.naturalWidth)
    );
    const centerY = Math.min(
      cropImage.naturalHeight - sourceHeight / 2,
      Math.max(sourceHeight / 2, cropCenter.y * cropImage.naturalHeight)
    );

    context.drawImage(
      cropImage,
      centerX - sourceWidth / 2,
      centerY - sourceHeight / 2,
      sourceWidth,
      sourceHeight,
      0,
      0,
      canvas.width,
      canvas.height
    );
  }, [cropImage, cropWidth, cropHeight, cropZoom, cropCenter]);

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
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
      setAccessToken(session?.access_token || null);
      if (event === 'PASSWORD_RECOVERY') setIsPasswordRecovery(true);
      if (event === 'SIGNED_OUT') setIsPasswordRecovery(false);
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
    } catch (err) {
      console.error('Failed to load integrations status:', err);
    }
  }

  useEffect(() => {
    if (!user || !accessToken) return undefined;
    let active = true;
    getChatSessions(sessionId, accessToken)
      .then((data) => {
        const chats = data.chats || [];
        if (active) {
          setChatSessions((current) => [
            ...current.filter((chat) => chat.id.startsWith('draft-')),
            ...chats
          ]);
          setChatSessionError('');
          setActiveChatId((current) => (
            current?.startsWith('draft-') || chats.some((chat) => chat.id === current)
              ? current
              : chats[0]?.id || null
          ));
          setChatSessionsLoading(false);
        }
      })
      .catch((error) => {
        if (active) {
          console.error('Failed to load chat sessions:', error);
          setChatSessionError('Saved chats are unavailable right now.');
          setChatSessionsLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [user, accessToken, sessionId]);

  useEffect(() => {
    if (!activeChatId || activeChatId.startsWith('draft-') || !user || !accessToken) {
      return undefined;
    }
    if (skipHistoryLoadForChatRef.current === activeChatId) {
      skipHistoryLoadForChatRef.current = null;
      return undefined;
    }
    let active = true;
    setHistoryLoading(true);
    getChatHistory(sessionId, activeChatId, accessToken)
      .then((data) => {
        if (active) {
          setMessages((data.messages || []).map((message) => ({
            role: message.role,
            content: message.content,
            provider_used: message.provider,
            sources: normalizeSources(message.sources)
          })));
        }
      })
      .catch((error) => {
        if (active) console.error('Failed to load chat history:', error);
      })
      .finally(() => {
        if (active) setHistoryLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user, accessToken, sessionId, activeChatId]);

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
  if (!user) {
    if (publicPage === 'landing') {
      return (
        <LandingPage
          onSignIn={() => setPublicPage('signin')}
          onSignUp={() => setPublicPage('signup')}
        />
      );
    }

    return (
      <AuthPage
        key={publicPage}
        initialMode={publicPage}
        onBack={() => setPublicPage('landing')}
        onAuthenticated={(authenticatedUser, token) => {
          setUser(authenticatedUser);
          setAccessToken(token || null);
        }}
      />
    );
  }

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

  const sendMessage = async (value = prompt, mode = assistantMode) => {
    const text = value.trim();
    if (!text || isSending || chatSessionsLoading || historyLoading) return;
    let chatId = activeChatId;
    if (!chatId || chatId.startsWith('draft-')) {
      try {
        const created = await createChatSession(sessionId, accessToken);
        const draftId = chatId;
        chatId = created.chat.id;
        skipHistoryLoadForChatRef.current = chatId;
        setChatSessions((current) => [
          created.chat,
          ...current.filter((chat) => chat.id !== draftId)
        ]);
        setActiveChatId(chatId);
      } catch (error) {
        setChatSessionError(error.message || 'This chat could not be saved.');
        return;
      }
    }

    // Build context prefix for the AI so it knows the domain
    const domainName = domainData?.name || '';
    const incidentHeadline = selectedIncident?.headline || '';
    const contextLines = mode === 'dsa-tutor' ? [] : [
      domainName ? `Domain: ${domainName}` : '',
      incidentHeadline ? `Active Scenario: ${incidentHeadline}` : ''
    ].filter(Boolean);
    const request = contextLines.length
      ? `${contextLines.join('\n')}\n\nUser: ${text}`
      : text;

    const userMessage = { role: 'user', content: text };
    setMessages((cur) => [...cur, userMessage]);
    setPrompt('');
    setIsSending(true);
    const chatTitle = messages.length === 0 ? text.slice(0, 80) : undefined;

    try {
      const res = mode === 'dsa-tutor'
        ? await promptDsaTutor(text, sessionId, accessToken, chatId, chatTitle, selectedGeminiModel)
        : await promptCognivex(request, 200, sessionId, accessToken, chatId, chatTitle, selectedGeminiModel);
      const response =
        res.generated_text ||
        res.response ||
        res.predicted_action ||
        'I could not generate a response for that request.';

      const assistantMessage = {
        role: 'assistant',
        content: response,
        sources: normalizeSources(res.sources),
        anomaly_score: res.anomaly_score,
        predicted_cause: res.predicted_cause,
        provider_used: res.provider_used,
        provider_status: res.provider_status,
        provider_model: res.provider_model,
        usage_metadata: res.usage_metadata,
        provider_notice: res.provider_notice,
        isTyping: false
      };

      setMessages((cur) => [...cur, assistantMessage]);
      setChatSessions((current) => {
        const now = new Date().toISOString();
        return current
          .map((chat) => chat.id === chatId
            ? { ...chat, title: chatTitle || chat.title, updated_at: now }
            : chat)
          .sort((left, right) => (right.updated_at || '').localeCompare(left.updated_at || ''));
      });

      checkIntegrations();
    } catch (error) {
      setMessages((cur) => [...cur, {
        role: 'assistant',
        content: error.message || 'I am unable to connect right now. Please check that the API server is running on port 8000 and try again.'
      }]);
    } finally {
      setIsSending(false);
    }
  };

  const handleSuggestion = (sugg) => {
    const mode = sugg.assistant || 'cognivex';
    setAssistantMode(mode);
    if (sugg.domain) {
      const d = domains.find(d => d.id === sugg.domain);
      if (d) setCurrentTab(sugg.domain);
    }
    sendMessage(sugg.prompt, mode);
  };

  const handleDeleteChat = async (chat) => {
    if (isSending || isDeletingAllChats || deletingChatIds.includes(chat.id)) return;
    if (!window.confirm(`Delete "${chat.title || 'New chat'}"? This cannot be undone.`)) return;

    setDeletingChatIds((current) => [...current, chat.id]);
    setChatSessionError('');
    try {
      if (!chat.id.startsWith('draft-')) {
        await deleteChatSession(sessionId, chat.id, accessToken);
      }

      const remainingChats = chatSessions.filter((item) => item.id !== chat.id);
      setChatSessions(remainingChats);
      if (activeChatId === chat.id) {
        setMessages([]);
        setPrompt('');
        const nextChat = remainingChats[0];
        if (nextChat) {
          setActiveChatId(nextChat.id);
          setHistoryLoading(!nextChat.id.startsWith('draft-'));
        } else {
          handleNewChat();
        }
      }
    } catch (error) {
      console.error('Failed to delete chat:', error);
      setChatSessionError(error.message || 'Chat could not be deleted.');
    } finally {
      setDeletingChatIds((current) => current.filter((id) => id !== chat.id));
    }
  };

  const handleDeleteAllChats = async () => {
    if (isSending || isDeletingAllChats || chatSessions.length === 0) return;
    if (!window.confirm('Delete all chat history? This cannot be undone.')) return;

    setIsDeletingAllChats(true);
    setChatSessionError('');
    try {
      if (chatSessions.some((chat) => !chat.id.startsWith('draft-'))) {
        await deleteAllChatSessions(sessionId, accessToken);
      }
      setChatSessions([]);
      setMessages([]);
      setPrompt('');
      setActiveChatId(null);
      handleNewChat();
    } catch (error) {
      console.error('Failed to delete all chat history:', error);
      setChatSessionError(error.message || 'Chat history could not be deleted.');
    } finally {
      setIsDeletingAllChats(false);
    }
  };

  const handleNewChat = () => {
    if (isSending || isDeletingAllChats) return;
    const draftId = `draft-${window.crypto.randomUUID()}`;
    setChatSessionError('');
    setChatSessions((current) => [
      { id: draftId, title: 'New chat', updated_at: new Date().toISOString() },
      ...current
    ]);
    setActiveChatId(draftId);
    setMessages([]);
    setHistoryLoading(false);
    setPrompt('');
  };

  const handleReduceMotionChange = (event) => {
    const enabled = event.target.checked;
    setReduceMotion(enabled);
    window.localStorage.setItem('cognivex.reduceMotion', String(enabled));
  };

  const handleThemeChange = (themeId) => {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, themeId);
      setAppTheme(themeId);
    } catch (error) {
      console.error('Failed to save app theme:', error);
    }
  };

  const handleSidebarWidthChange = (width) => {
    const nextWidth = clampSidebarWidth(width);
    setSidebarWidth(nextWidth);
    try {
      window.localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, String(nextWidth));
    } catch (error) {
      console.error('Failed to save sidebar width preference:', error);
    }
  };

  const handleSidebarResizePointerDown = (event) => {
    sidebarResizeRef.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleSidebarResizePointerMove = (event) => {
    if (!sidebarResizeRef.current) return;
    handleSidebarWidthChange(event.clientX);
  };

  const handleSidebarResizePointerUp = () => {
    sidebarResizeRef.current = false;
  };

  const handleSidebarResizeKeyDown = (event) => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      handleSidebarWidthChange(sidebarWidth + (event.key === 'ArrowRight' ? 16 : -16));
    } else if (event.key === 'Home') {
      event.preventDefault();
      handleSidebarWidthChange(MIN_SIDEBAR_WIDTH);
    } else if (event.key === 'End') {
      event.preventDefault();
      handleSidebarWidthChange(MAX_SIDEBAR_WIDTH);
    }
  };

  const handleSidebarCollapse = (collapsed) => {
    setIsSidebarCollapsed(collapsed);
    try {
      window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(collapsed));
    } catch (error) {
      console.error('Failed to save sidebar visibility preference:', error);
    }
  };

  const handleGeminiModelChange = (event) => {
    const model = event.target.value;
    if (!GEMINI_MODELS.some((item) => item.id === model)) return;
    window.localStorage.setItem(GEMINI_MODEL_STORAGE_KEY, model);
    setSelectedGeminiModel(model);
  };

  const handleBackgroundUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setBackgroundError('Choose an image file to set as your background.');
      return;
    }

    setBackgroundError('');
    const sourceUrl = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = sourceUrl;
      await image.decode();
      setCropImage(image);
      setCropSourceUrl(sourceUrl);
      setCropWidth('1920');
      setCropHeight('1080');
      setCropZoom(1);
      setCropCenter({ x: 0.5, y: 0.5 });
    } catch (error) {
      URL.revokeObjectURL(sourceUrl);
      console.error('Failed to load custom background image:', error);
      setBackgroundError('The selected image could not be opened. Please choose another image.');
    }
  };

  const closeBackgroundCropper = () => {
    setCropSourceUrl('');
    setCropImage(null);
    cropDragRef.current = null;
  };

  const handleSaveBackground = () => {
    if (!cropImage || !cropCanvasRef.current) return;
    const outputWidth = Number(cropWidth);
    const outputHeight = Number(cropHeight);
    if (
      !Number.isInteger(outputWidth) || !Number.isInteger(outputHeight)
      || outputWidth < 320 || outputWidth > 4096
      || outputHeight < 320 || outputHeight > 4096
    ) {
      setBackgroundError('Width and height must each be between 320 and 4096 pixels.');
      return;
    }

    setIsSavingBackground(true);
    setBackgroundError('');
    try {
      const canvas = document.createElement('canvas');
      canvas.width = outputWidth;
      canvas.height = outputHeight;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Your browser could not save the selected crop.');
      const aspectRatio = outputWidth / outputHeight;
      const imageRatio = cropImage.naturalWidth / cropImage.naturalHeight;
      const baseWidth = imageRatio > aspectRatio
        ? cropImage.naturalHeight * aspectRatio
        : cropImage.naturalWidth;
      const sourceWidth = baseWidth / cropZoom;
      const sourceHeight = (baseWidth / aspectRatio) / cropZoom;
      const centerX = Math.min(
        cropImage.naturalWidth - sourceWidth / 2,
        Math.max(sourceWidth / 2, cropCenter.x * cropImage.naturalWidth)
      );
      const centerY = Math.min(
        cropImage.naturalHeight - sourceHeight / 2,
        Math.max(sourceHeight / 2, cropCenter.y * cropImage.naturalHeight)
      );
      context.drawImage(
        cropImage,
        centerX - sourceWidth / 2,
        centerY - sourceHeight / 2,
        sourceWidth,
        sourceHeight,
        0,
        0,
        outputWidth,
        outputHeight
      );
      const image = canvas.toDataURL('image/jpeg', 0.84);
      if (image.length > 2_500_000) {
        throw new Error('This crop is too large to save in browser storage. Try smaller dimensions.');
      }
      window.localStorage.setItem(BACKGROUND_STORAGE_KEY, image);
      setCustomBackground(image);
      closeBackgroundCropper();
    } catch (error) {
      console.error('Failed to save custom background:', error);
      setBackgroundError(
        error.name === 'QuotaExceededError'
          ? 'There is not enough browser storage for this image. Remove the current background or choose smaller dimensions.'
          : error.message || 'The selected image could not be saved.'
      );
    } finally {
      setIsSavingBackground(false);
    }
  };

  const handleCropPointerDown = (event) => {
    if (!cropImage || !cropCanvasRef.current) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    cropDragRef.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      center: cropCenter
    };
  };

  const handleCropPointerMove = (event) => {
    const drag = cropDragRef.current;
    const canvas = cropCanvasRef.current;
    if (!drag || !canvas || !cropImage) return;
    const outputWidth = Number(cropWidth);
    const outputHeight = Number(cropHeight);
    if (!outputWidth || !outputHeight) return;
    const rect = canvas.getBoundingClientRect();
    const aspectRatio = outputWidth / outputHeight;
    const imageRatio = cropImage.naturalWidth / cropImage.naturalHeight;
    const baseWidth = imageRatio > aspectRatio
      ? cropImage.naturalHeight * aspectRatio
      : cropImage.naturalWidth;
    const sourceWidth = baseWidth / cropZoom;
    const sourceHeight = (baseWidth / aspectRatio) / cropZoom;
    const x = drag.center.x - ((event.clientX - drag.pointerX) / rect.width) * sourceWidth / cropImage.naturalWidth;
    const y = drag.center.y - ((event.clientY - drag.pointerY) / rect.height) * sourceHeight / cropImage.naturalHeight;
    setCropCenter({
      x: Math.min(1, Math.max(0, x)),
      y: Math.min(1, Math.max(0, y))
    });
  };

  const handleCropPointerUp = () => {
    cropDragRef.current = null;
  };

  const handleCropDimensionChange = (dimension, value) => {
    if (dimension === 'width') setCropWidth(value);
    else setCropHeight(value);
    setCropCenter({ x: 0.5, y: 0.5 });
  };

  const handleCropDimensionBlur = (dimension) => {
    const value = Number(dimension === 'width' ? cropWidth : cropHeight);
    const nextValue = String(Math.min(4096, Math.max(320, Math.round(value || 320))));
    if (dimension === 'width') setCropWidth(nextValue);
    else setCropHeight(nextValue);
  };

  const handleRemoveBackground = () => {
    try {
      window.localStorage.removeItem(BACKGROUND_STORAGE_KEY);
      setCustomBackground('');
      setBackgroundError('');
    } catch (error) {
      console.error('Failed to remove custom background:', error);
      setBackgroundError('The saved background could not be removed from browser storage.');
    }
  };

  const handleSelectChat = (chatId) => {
    if (chatId === activeChatId) return;
    setActiveChatId(chatId);
    setMessages([]);
    setHistoryLoading(!chatId.startsWith('draft-'));
    setPrompt('');
  };

  const handleSignOut = async () => {
    await supabase?.auth.signOut();
    setUser(null);
    setAccessToken(null);
    setMessages([]);
    setChatSessions([]);
    setActiveChatId(null);
    setChatSessionsLoading(true);
    setChatSessionError('');
    setHistoryLoading(false);
    setIsProfileMenuOpen(false);
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

  const llmStatus = integrationsStatus?.llm || integrationsStatus?.openai;
  const modelOptions = integrationsStatus?.gemini_models?.length
    ? integrationsStatus.gemini_models
    : GEMINI_MODELS;
  const modelLabel = modelOptions.find((model) => model.id === selectedGeminiModel)?.label
    || selectedGeminiModel;

  return (
    <div
      className={`chat-workspace${reduceMotion ? ' reduce-motion' : ''}${customBackground ? ' has-custom-background' : ''}${isSidebarCollapsed ? ' sidebar-collapsed' : ''}`}
      style={{
        '--custom-sidebar-width': `${sidebarWidth}px`,
        ...(customBackground ? { '--custom-app-background': `url("${customBackground}")` } : {})
      }}
    >
      {isSidebarCollapsed && (
        <button
          type="button"
          className="sidebar-expand-button"
          onClick={() => handleSidebarCollapse(false)}
          aria-label="Expand sidebar"
          aria-expanded="false"
          aria-controls="conversation-sidebar"
          title="Expand sidebar"
        >
          <PanelLeftOpen size={18} />
        </button>
      )}
      <aside id="conversation-sidebar" className="conversation-sidebar" aria-label="Chat history sidebar">
        <div className="sidebar-domains">
          <div className="sidebar-brand">
            <img className="sidebar-brand-mark" src="/cognivex-logo.png" alt="" />
            <strong>Cognivex AI</strong>
            <button
              type="button"
              className="sidebar-collapse-button"
              onClick={() => handleSidebarCollapse(true)}
              aria-label="Collapse sidebar"
              aria-expanded="true"
              aria-controls="conversation-sidebar"
              title="Collapse sidebar"
            >
              <PanelLeftClose size={17} />
            </button>
          </div>
          <div className="sidebar-section-label">Domains</div>
          <nav className="sidebar-domain-list" aria-label="Domain navigation">
            {domains.map((domain) => {
              const isSelected = currentTab === domain.id;
              return (
                <button
                  key={domain.id}
                  id={`tab-${domain.id}`}
                  className={`sidebar-domain-item${isSelected ? ' active' : ''}`}
                  onClick={() => setCurrentTab(domain.id)}
                  title={domain.name}
                >
                  {getDomainIcon(domain.icon)}
                  <span>{domain.name.replace(' Intelligence', '')}</span>
                </button>
              );
            })}
            <button
              id="btn-create-domain"
              className="sidebar-domain-item sidebar-custom-domain"
              onClick={() => setIsCustomDomainOpen(true)}
            >
              <Layers size={16} />
              <span>Custom domain</span>
              <span className="sidebar-domain-add">+</span>
            </button>
          </nav>
        </div>
        <section className="sidebar-history" aria-label="Conversation history">
          <button
            className="new-chat-button"
            onClick={handleNewChat}
            disabled={isSending || isDeletingAllChats}
          >
            <MessageSquarePlus size={16} />
            <span>New chat</span>
          </button>
          <div className="sidebar-history-heading">
            <div className="sidebar-section-label">Recent</div>
            <button
              type="button"
              className="delete-all-chats-button"
              onClick={handleDeleteAllChats}
              disabled={chatSessions.length === 0 || isSending || isDeletingAllChats}
              title="Delete all chat history"
              aria-label="Delete all chat history"
            >
              <Trash2 size={14} />
            </button>
          </div>
          <div className="chat-session-list">
            {chatSessions.map((chat) => (
              <div
                key={chat.id}
                className={`chat-session-row${chat.id === activeChatId ? ' active' : ''}`}
              >
                <button
                  type="button"
                  className={`chat-session-item${chat.id === activeChatId ? ' active' : ''}`}
                  onClick={() => handleSelectChat(chat.id)}
                  title={chat.title || 'New chat'}
                >
                  <MessageSquare size={15} />
                  <span>{chat.title || 'New chat'}</span>
                </button>
                <button
                  type="button"
                  className="chat-session-delete"
                  onClick={() => handleDeleteChat(chat)}
                  disabled={isSending || isDeletingAllChats || deletingChatIds.includes(chat.id)}
                  title={`Delete ${chat.title || 'New chat'}`}
                  aria-label={`Delete ${chat.title || 'New chat'}`}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {!chatSessionsLoading && chatSessions.length === 0 && !chatSessionError && (
              <p className="chat-session-empty">
                Your conversations will appear here.
              </p>
            )}
            {chatSessionError && (
              <p className="chat-session-empty error">{chatSessionError}</p>
            )}
          </div>
          <div className="sidebar-profile-wrap">
            {isProfileMenuOpen && (
              <div className="sidebar-profile-menu" role="menu" aria-label="Profile options">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    setIsSettingsOpen(true);
                  }}
                >
                  <Settings size={15} />
                  <span>Settings</span>
                </button>
                {user.email?.trim().toLowerCase() === ADMIN_EMAIL && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      openAdmin();
                    }}
                  >
                    <ShieldCheck size={15} />
                    <span>Admin</span>
                  </button>
                )}
                {adminError && <p className="sidebar-profile-error">{adminError}</p>}
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleSignOut}
                >
                  <LogOut size={15} />
                  <span>Log out</span>
                </button>
              </div>
            )}
            <button
              type="button"
              className="sidebar-account"
              onClick={() => setIsProfileMenuOpen((open) => !open)}
              aria-haspopup="menu"
              aria-expanded={isProfileMenuOpen}
              aria-label={`Profile menu for ${user.email || 'Account'}`}
            >
              <span className="sidebar-avatar">{(user.email || 'G').slice(0, 1).toUpperCase()}</span>
              <span className="sidebar-account-email" title={user.email}>{user.email || 'Account'}</span>
              <ChevronDown size={14} />
            </button>
          </div>
        </section>
      </aside>
      {!isSidebarCollapsed && (
        <div
          className="sidebar-resize-handle"
          role="separator"
          aria-label="Resize sidebar and chat area"
          aria-orientation="vertical"
          aria-valuemin={MIN_SIDEBAR_WIDTH}
          aria-valuenow={sidebarWidth}
          tabIndex={0}
          onPointerDown={handleSidebarResizePointerDown}
          onPointerMove={handleSidebarResizePointerMove}
          onPointerUp={handleSidebarResizePointerUp}
          onPointerCancel={handleSidebarResizePointerUp}
          onKeyDown={handleSidebarResizeKeyDown}
          aria-valuemax={getMaxSidebarWidth()}
        />
      )}

      <div className="chat-app">
      <main className="chat-shell">
        {/* Message list or Welcome screen */}
        <section className="chat-content" aria-label="Cognivex conversation">
          {historyLoading ? (
            <div className="chat-welcome"><p>Loading conversation…</p></div>
          ) : messages.length === 0 ? (
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
                        {message.provider_used === 'gemini-dsa-tutor'
                          ? `✨ Gemini DSA Tutor${message.provider_model ? ` ${message.provider_model}` : ''}`
                          : message.provider_used === 'gemini'
                            ? `✨ Gemini ${message.provider_model || ''}`
                          : message.provider_used === 'openai'
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

                    {message.role === 'assistant' && message.usage_metadata && (
                      <div style={{ marginTop: '8px', color: '#94a3b8', fontSize: '0.72rem' }}>
                        API usage · Input {message.usage_metadata.promptTokenCount ?? '—'} tokens
                        {' · '}Output {message.usage_metadata.candidatesTokenCount ?? '—'} tokens
                        {' · '}Total {message.usage_metadata.totalTokenCount ?? '—'} tokens
                      </div>
                    )}

                    {/* Provider notice banner */}
                    {message.role === 'assistant' && message.provider_notice && (
                      <div className="provider-notice-banner">
                        <div className="provider-notice-header">
                          <Zap size={14} />
                          <span>
                            {message.provider_notice.type === 'quota_exhausted'
                              ? `${message.provider_used || 'AI'} quota limit notice`
                              : `${message.provider_used || 'AI'} provider notice`}
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
                            Check provider usage and API settings ({message.provider_notice.usage_url}) &rarr;
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
          <div className="context-row" aria-label="Choose an assistant">
            <span className="context-label">Assistant</span>
            <button
              type="button"
              className={`context-chip ${assistantMode === 'cognivex' ? 'selected' : ''}`}
              onClick={() => setAssistantMode('cognivex')}
              aria-pressed={assistantMode === 'cognivex'}
            >
              Cognivex
            </button>
            <button
              type="button"
              className={`context-chip ${assistantMode === 'dsa-tutor' ? 'selected' : ''}`}
              onClick={() => setAssistantMode('dsa-tutor')}
              aria-pressed={assistantMode === 'dsa-tutor'}
            >
              DSA AI Tutor
            </button>
            <label className="gemini-model-control">
              <span>Gemini model</span>
              <select
                value={selectedGeminiModel}
                onChange={handleGeminiModelChange}
                aria-label="Gemini model"
              >
                {modelOptions.map((model) => (
                  <option key={model.id} value={model.id}>{model.label}</option>
                ))}
              </select>
            </label>
          </div>

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
              placeholder={`Message ${assistantMode === 'dsa-tutor' ? 'DSA AI Tutor' : 'Cognivex AI'}… (Shift+Enter for new line)`}
              rows={1}
              aria-label="Message Cognivex"
            />
            <button
              className="send-button"
              type="submit"
              onClick={(event) => {
                event.preventDefault();
                sendMessage();
              }}
              disabled={!prompt.trim() || isSending || chatSessionsLoading || historyLoading}
              aria-label="Send message"
              title="Send (Enter)"
            >
              <ArrowUp size={18} />
            </button>
          </form>
          <p className="composer-note" title={llmStatus?.message || undefined}>
            {assistantMode === 'dsa-tutor'
              ? `Gemini DSA AI Tutor • ${modelLabel}`
              : `Cognivex AI • ${modelLabel} • ${domains.length} domains active`}
          </p>
        </section>
      </main>

      <CustomDomainModal
        isOpen={isCustomDomainOpen}
        onClose={() => setIsCustomDomainOpen(false)}
        onDomainCreated={handleDomainCreated}
      />
      {(isSettingsOpen || isPasswordRecovery) && (
        <div
          className="settings-backdrop"
          onMouseDown={(event) => {
            if (!isPasswordRecovery && event.target === event.currentTarget) setIsSettingsOpen(false);
          }}
        >
          <section
            className="settings-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-title"
          >
            <header className="settings-heading">
              <div>
                <span className="settings-kicker">{isPasswordRecovery ? 'Account security' : 'Preferences'}</span>
                <h2 id="settings-title">{isPasswordRecovery ? 'Reset password' : 'Settings'}</h2>
              </div>
              {!isPasswordRecovery && (
                <button
                  type="button"
                  className="settings-close"
                  onClick={() => setIsSettingsOpen(false)}
                  aria-label="Close settings"
                >
                  <X size={18} />
                </button>
              )}
            </header>
            {isPasswordRecovery ? (
              <PasswordSettings
                user={user}
                recovery
                onPasswordUpdated={() => {
                  setIsPasswordRecovery(false);
                  setIsSettingsOpen(false);
                }}
              />
            ) : (
            <>
            <PasswordSettings user={user} />
            <div className="settings-section">
              <h3>Appearance</h3>
              <label className="settings-sidebar-width">
                <span>
                  <strong>Sidebar width</strong>
                  <span>Drag the divider or adjust it here. The chat area fills the remaining space.</span>
                </span>
                <input
                  type="range"
                  min={MIN_SIDEBAR_WIDTH}
                  max={getMaxSidebarWidth()}
                  step="4"
                  value={sidebarWidth}
                  onChange={(event) => handleSidebarWidthChange(Number(event.target.value))}
                  aria-label="Sidebar width"
                  aria-valuetext={`${sidebarWidth} pixels`}
                />
                <output>{sidebarWidth}px</output>
              </label>
              <div className="settings-theme-grid" role="group" aria-label="App color theme">
                {APP_THEMES.map((theme) => (
                  <button
                    key={theme.id}
                    type="button"
                    className={`settings-theme-choice${appTheme === theme.id ? ' active' : ''}`}
                    onClick={() => handleThemeChange(theme.id)}
                    aria-pressed={appTheme === theme.id}
                  >
                    <span className="settings-theme-swatch" style={{ backgroundColor: theme.color }}>
                      {appTheme === theme.id && <Palette size={15} />}
                    </span>
                    <span>{theme.label}</span>
                  </button>
                ))}
              </div>
              <div className="settings-option settings-background-option">
                <div>
                  <strong>Custom background</strong>
                  <p>Choose an image, adjust its crop and dimensions, then save it across the app.</p>
                </div>
                <label className="settings-upload-button">
                  <ImagePlus size={16} />
                  <span>{customBackground ? 'Change' : 'Choose image'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleBackgroundUpload}
                    disabled={isSavingBackground}
                    aria-label="Choose a custom background image"
                  />
                </label>
              </div>
              {cropImage && (
                <div className="background-cropper" role="group" aria-label="Crop custom background">
                  <div className="background-cropper-heading">
                    <strong>Adjust your background</strong>
                    <span>Drag the image to position it.</span>
                  </div>
                  <canvas
                    ref={cropCanvasRef}
                    className="background-crop-preview"
                    onPointerDown={handleCropPointerDown}
                    onPointerMove={handleCropPointerMove}
                    onPointerUp={handleCropPointerUp}
                    onPointerCancel={handleCropPointerUp}
                    aria-label="Drag to position the background crop"
                  />
                  <div className="background-crop-controls">
                    <label>
                      Width
                      <input
                        type="number"
                        min="320"
                        max="4096"
                        value={cropWidth}
                        onChange={(event) => handleCropDimensionChange('width', event.target.value)}
                        onBlur={() => handleCropDimensionBlur('width')}
                      />
                      <span>px</span>
                    </label>
                    <label>
                      Height
                      <input
                        type="number"
                        min="320"
                        max="4096"
                        value={cropHeight}
                        onChange={(event) => handleCropDimensionChange('height', event.target.value)}
                        onBlur={() => handleCropDimensionBlur('height')}
                      />
                      <span>px</span>
                    </label>
                  </div>
                  <label className="background-crop-zoom">
                    <span>Zoom</span>
                    <input
                      type="range"
                      min="1"
                      max="4"
                      step="0.01"
                      value={cropZoom}
                      onChange={(event) => setCropZoom(Number(event.target.value))}
                    />
                    <span>{cropZoom.toFixed(1)}×</span>
                  </label>
                  <div className="background-crop-actions">
                    <button type="button" onClick={closeBackgroundCropper} disabled={isSavingBackground}>
                      Cancel
                    </button>
                    <button type="button" onClick={handleSaveBackground} disabled={isSavingBackground}>
                      {isSavingBackground ? 'Saving…' : 'Save as background'}
                    </button>
                  </div>
                </div>
              )}
              {customBackground && (
                <div className="settings-background-preview">
                  <img src={customBackground} alt="Custom app background preview" />
                  <button type="button" onClick={handleRemoveBackground}>
                    <Trash2 size={14} />
                    Remove background
                  </button>
                </div>
              )}
              {backgroundError && <p className="settings-error" role="alert">{backgroundError}</p>}
              <div className="settings-option">
                <div>
                  <strong>Reduce motion</strong>
                  <p>Minimize animations and transitions across the page.</p>
                </div>
                <input
                  type="checkbox"
                  checked={reduceMotion}
                  onChange={handleReduceMotionChange}
                  aria-label="Reduce motion"
                />
              </div>
            </div>
            </>
            )}
          </section>
        </div>
      )}
      </div>
    </div>
  );
}
