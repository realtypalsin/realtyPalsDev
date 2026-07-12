'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import { ChatMessage } from '@/types/property';
import type { ProjectCard as ProjectCardType } from '@/types/project';
import ProjectDetailPanel from '@/components/ProjectDetailPanel';
import VisualGuide from './VisualGuide';
import Image from 'next/image';
import Toast from '@/components/Toast';
import { API_BASE } from '@/lib/env'
import { track } from '@/lib/analytics';
import Header from '@/components/Header';
import { PlaceholdersAndVanishInput } from '@/components/ui/placeholders-and-vanish-input';
import LeadSuccessModal from '@/components/LeadSuccessModal';
import MessageBubble from '@/components/chat/MessageBubble';
import type { Chip, ChipPickerState } from '@/components/chat/types';
import {
  MessageSquare, AlertTriangle, Mic, Plus,
} from 'lucide-react';

// ── Dynamic imports — modal-gated, excluded from initial bundle ────────────
const SiteVisitScheduler = dynamic(() => import('@/components/SiteVisitScheduler'), { ssr: false })
const CalculatorPanel = dynamic(() => import('@/components/CalculatorPanel'), { ssr: false })

// ── Progressive chip disclosure — driven by server missingDimension ────────
function getFollowUpChips(missingDimension: 'budget' | 'bhk' | 'location' | null): Chip[] {
  if (!missingDimension) return [] // All dimensions filled, no more chips

  const chips: Record<'budget' | 'bhk' | 'location', Chip[]> = {
    budget: [
      { emoji: '💰', label: 'Under 1 Cr', msg: 'I want properties under 1 Cr' },
      { emoji: '💰', label: '1–2 Cr', msg: 'My budget is 1 to 2 Cr' },
      { emoji: '💰', label: '2–3 Cr', msg: 'I can spend 2 to 3 Cr' },
      { emoji: '💰', label: 'Above 3 Cr', msg: 'My budget is above 3 Cr' },
    ],
    bhk: [
      { emoji: '🏠', label: '1 BHK', msg: 'I need a 1 BHK' },
      { emoji: '🏠', label: '2 BHK', msg: 'Looking for a 2 BHK' },
      { emoji: '🏠', label: '3 BHK', msg: 'I want a 3 BHK' },
      { emoji: '🏠', label: '3+ BHK', msg: 'I need 3 or more bedrooms' },
    ],
    location: [
      { emoji: '📍', label: 'Sector 150', msg: 'Show me properties in Sector 150' },
      { emoji: '📍', label: 'Sector 137', msg: 'I prefer Sector 137' },
      { emoji: '📍', label: 'Central Noida', msg: 'Looking in Central Noida' },
      { emoji: '📍', label: 'Other sectors', msg: 'Show me other sectors nearby' },
    ],
  }

  return chips[missingDimension].slice(0, 5) // Cap at 5 chips
}

// Welcome screen starter chips — show one from each dimension
const WELCOME_CHIPS = [
  { emoji: '💰', label: 'Budget 1–2 Cr', msg: 'My budget is 1 to 2 Cr' },
  { emoji: '🏠', label: '3 BHK', msg: 'I want a 3 BHK' },
  { emoji: '📍', label: 'Sector 150', msg: 'Show me properties in Sector 150' },
  { emoji: '🏠', label: 'Ready to move', msg: 'I want a property ready to move' },
];

function RateLimitBanner({ until, onExpire }: { until: number; onExpire: () => void }) {
  const [secsLeft, setSecsLeft] = useState(Math.ceil((until - Date.now()) / 1000));
  useEffect(() => {
    if (secsLeft <= 0) { onExpire(); return; }
    const t = setTimeout(() => setSecsLeft(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secsLeft, onExpire]);
  return (
    <div className="mx-4 mb-2 px-4 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 flex items-center gap-3">
      <span className="text-amber-600 dark:text-amber-400 text-sm font-medium">
        Sending too fast — wait {secsLeft}s
      </span>
      <div className="ml-auto h-1.5 w-16 bg-amber-200 dark:bg-amber-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-amber-500 rounded-full transition-all duration-1000"
          style={{ width: `${(secsLeft / 60) * 100}%` }}
        />
      </div>
    </div>
  );
}

interface DiscoveryContentProps {
  userId: string | null;
}

export default function DiscoveryContent({ userId }: DiscoveryContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [toast, setToast] = useState<{ message: string } | null>(null);
  const [, setShowRecommendations] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [restoreError, setRestoreError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitLockRef = useRef(false);
  const [rateLimitUntil, setRateLimitUntil] = useState<number | null>(null);
  const [chatTurnCount, setChatTurnCount] = useState(0);
  const [hasShownLengthWarning, setHasShownLengthWarning] = useState(false);
  const [showContextWarning, setShowContextWarning] = useState(false);
  const [chatPhase, setChatPhase] = useState<'DISCOVERY' | 'ADVISOR'>('DISCOVERY');
  const [missingDimension, setMissingDimension] = useState<'budget' | 'bhk' | 'location' | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  // Tracks which ?session= URL param was last fully restored — prevents re-init loops
  const lastRestoredSessionParamRef = useRef<string | null>(null)
  const [detailProject, setDetailProject] = useState<ProjectCardType | null>(null);
  const openDetailProject = useCallback((project: ProjectCardType | null) => {
    setDetailProject(project)
    if (project) track('property_viewed', { project_slug: project.slug, project_name: project.name })
  }, []);
  const [lastShortlist, setLastShortlist] = useState<ProjectCardType[]>([]);
  const [expandedShortlists, setExpandedShortlists] = useState<Set<string>>(new Set());
  const [showMap, setShowMap] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [chipPicker, setChipPicker] = useState<ChipPickerState | null>(null);
  const [siteVisitProject, setSiteVisitProject] = useState<ProjectCardType | null>(null);
  const [callbackProject, setCallbackProject] = useState<ProjectCardType | null>(null);
  const [callbackForm, setCallbackForm] = useState({ name: '', phone: '' });
  const [callbackSubmitting, setCallbackSubmitting] = useState(false);
  const [callbackDone, setCallbackDone] = useState(false);
  const [shareSheetOpen, setShareSheetOpen] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [isInputMinimized, setIsInputMinimized] = useState(false);
  const [regeneratingIdx] = useState<number | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const streamingMsgIdRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const userScrolledUp = useRef(false);

  // ── Image carousel state for in-chat galleries ──
  const [carouselIndexes, setCarouselIndexes] = useState<Record<number, number>>({});

  // ── Mobile detection state ──
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile screen
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);


  // ── Voice input (Web Speech API) ──
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Initialize speech recognition once
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = navigator.language || 'en-IN';

        recognition.onresult = (event: any) => {
          const transcript = Array.from(event.results)
            .map((result: any) => result[0].transcript)
            .join('');
          setChatInput(transcript);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
          if (event.error === 'not-allowed') {
            setToast({ message: 'Microphone access denied. Please allow microphone in browser settings.' });
          }
        };

        recognitionRef.current = recognition;
      }
    }
  }, []);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const toggleVoiceInput = async () => {
    // Primary: browser SpeechRecognition (real-time, best UX)
    if (recognitionRef.current) {
      if (isListening) {
        recognitionRef.current.stop();
        setIsListening(false);
      } else {
        setChatInput('');
        recognitionRef.current.start();
        setIsListening(true);
      }
      return;
    }

    // Fallback: MediaRecorder → Whisper (when SpeechRecognition unavailable)
    if (isListening) {
      mediaRecorderRef.current?.stop();
      setIsListening(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const fd = new FormData();
        fd.append('audio', blob, 'recording.webm');
        try {
          const res = await fetch('/api/v1/transcribe', { method: 'POST', body: fd });
          const data = await res.json();
          if (data.text) setChatInput(data.text);
        } catch { /* silent */ }
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsListening(true);
    } catch {
      setToast({ message: 'Microphone access denied. Please allow microphone in browser settings.' });
    }
  };

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior, block: 'end' });
    }
  }, []);

  useEffect(() => {
    if (chatHistory.length > 0 && !userScrolledUp.current) scrollToBottom();
  }, [chatHistory.length, isSubmitting, scrollToBottom]);

  // ── Mobile keyboard handling via Visual Viewport API ──
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [viewportHeight, setViewportHeight] = useState('100vh');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const vv = window.visualViewport;
    const onResize = () => {
      if (!vv) return;
      const isOpen = vv.height < window.innerHeight * 0.75;
      setKeyboardOpen(isOpen);
      setViewportHeight(`${vv.height}px`);

      if (isOpen) {
        setTimeout(scrollToBottom, 50);
      }
    };

    if (vv) {
      vv.addEventListener('resize', onResize);
      vv.addEventListener('scroll', onResize);
      return () => {
        vv.removeEventListener('resize', onResize);
        vv.removeEventListener('scroll', onResize);
      };
    }
  }, [scrollToBottom]);

  // Track scroll position to show/hide scroll-to-bottom button
  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      setShowScrollBtn(distanceFromBottom > 150);

      // Minimize input if scrolled up significantly (on mobile)
      if (window.innerWidth < 768) {
        if (distanceFromBottom > 200) {
          setIsInputMinimized(true);
        } else if (distanceFromBottom < 50) {
          setIsInputMinimized(false);
        }
      } else {
        // Desktop behavior - maybe just keep it visible or a less aggressive minimize
        setIsInputMinimized(false);
      }
    };
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // ── Ctrl+K keyboard shortcut to focus chat input ──
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        chatInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ── "Ask AI" button on PropertyCard injects text via CustomEvent ──
  useEffect(() => {
    const handler = (e: Event) => {
      const { text } = (e as CustomEvent<{ text: string }>).detail;
      setChatInput(text);
      setTimeout(() => chatInputRef.current?.focus(), 50);
    };
    window.addEventListener('realtypals:ask-ai', handler);
    return () => window.removeEventListener('realtypals:ask-ai', handler);
  }, []);

  const performReset = async () => {
    setChatHistory([]);
    setChatInput('');
    setShowRecommendations(false);
    setIsInitialized(false);
    setChatPhase('DISCOVERY');
    setChatTurnCount(0);
    setHasShownLengthWarning(false);
    setShowContextWarning(false);
    setIsSubmitting(false);
    setCarouselIndexes({});
    if (userId) {
      try {
        const res = await fetch(`${API_BASE}/chat/intent`, {
          method: 'DELETE',
          headers: { 'X-User-Id': userId },
        });
        const data = await res.json();
        if (data.session_id) setSessionId(data.session_id);
      } catch (e) {
        console.error('Failed to reset intent:', e);
      }
    }
    const welcomeMessage: ChatMessage = {
      id: crypto.randomUUID(),
      type: 'ai',
      content: "Hi! I'm RealtyPal — your AI advisor for Noida real estate. What are you looking for?",
      timestamp: new Date().toISOString(),
    };
    setChatHistory([welcomeMessage]);
    setIsInitialized(true);
  };

  // Handle ?new=1
  useEffect(() => {
    if (searchParams.get('new') !== '1' || !userId) return;
    (async () => {
      await performReset();
      router.replace('/discover');
    })();
  }, [searchParams, userId]);

  // Initialize: fetch session from server and restore history
  useEffect(() => {
    if (!userId || isInitialized || searchParams.get('new') === '1') return;

    (async () => {
      try {
        const sessionFromUrl = searchParams.get('session')
        const sessionUrl = sessionFromUrl
          ? `${API_BASE}/chat/session?id=${sessionFromUrl}`
          : `${API_BASE}/chat/session`
        const res = await fetch(sessionUrl, {
          headers: { 'X-User-Id': userId },
        });
        if (!res.ok) throw new Error('session fetch failed');
        const data = await res.json();

        setSessionId(data.session_id);
        // Clean up ?session= from URL without triggering a navigation
        const urlSession = searchParams.get('session')
        if (urlSession) {
          lastRestoredSessionParamRef.current = urlSession
          router.replace('/discover', { scroll: false });
        }

        // Restore chat phase
        if (data.chat_phase === 'ADVISOR') {
          setChatPhase('ADVISOR');
        }

        // Restore last property shortlist (re-surfaces cards after page reload / session resume)
        if (Array.isArray(data.last_projects) && data.last_projects.length > 0) {
          setLastShortlist(data.last_projects);
          setShowRecommendations(true);
        }

        if (data.messages && data.messages.length > 0) {
          const restored: ChatMessage[] = data.messages.map((m: { id: string; role: string; content: string; created_at: string }) => ({
            id: m.id,
            type: m.role === 'user' ? 'user' : 'ai',
            content: m.content,
            timestamp: m.created_at,
          }));
          setChatHistory(restored);
          setTimeout(() => scrollToBottom('instant'), 50);
        } else {
          setChatHistory([{
            id: crypto.randomUUID(),
            type: 'ai',
            content: "Hi! I'm RealtyPal — your AI advisor for Noida real estate. What are you looking for?",
            timestamp: new Date().toISOString(),
          }]);
        }
      } catch (err) {
        console.error('[session-restore] failed:', err);
        const sessionFromUrl = searchParams.get('session');
        if (sessionFromUrl) {
          setRestoreError(true);
        } else {
          setChatHistory([{
            id: crypto.randomUUID(),
            type: 'ai',
            content: "Hi! I'm RealtyPal — your AI advisor for Noida real estate. What are you looking for?",
            timestamp: new Date().toISOString(),
          }]);
        }
      } finally {
        setIsInitialized(true);
      }
    })();
  }, [userId, isInitialized, searchParams]);

  // When user clicks a different session from sidebar while already initialized
  useEffect(() => {
    const urlSession = searchParams.get('session')
    if (!userId || !isInitialized) return
    if (!urlSession) return
    if (urlSession === lastRestoredSessionParamRef.current) return
    // Different session requested — reset state and trigger re-initialization
    setChatHistory([])
    setLastShortlist([])
    setShowRecommendations(false)
    setChatPhase('DISCOVERY')
    setChatTurnCount(0)
    setExpandedShortlists(new Set())
    setIsInitialized(false)
  }, [userId, isInitialized, searchParams])

  // Pick up prefill query from compare page (sessionStorage)
  useEffect(() => {
    if (!isInitialized) return;
    const prefill = sessionStorage.getItem('rp_prefill_chat');
    if (prefill) {
      sessionStorage.removeItem('rp_prefill_chat');
      setTimeout(() => submitMessage(prefill), 200);
    }
  }, [isInitialized]);

  // Expose reset function for Sidebar "New Chat"
  useEffect(() => {
    (window as any).__resetDiscoveryChat = async () => {
      await performReset();
    };
    return () => {
      delete (window as any).__resetDiscoveryChat;
    };
  }, [userId]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const streamChat = useCallback(async (userText: string): Promise<void> => {
    if (!userId || isSubmitting || submitLockRef.current) return;
    submitLockRef.current = true;
    setIsSubmitting(true);
    userScrolledUp.current = false;
    setChipPicker(null); // close any open picker

    // Add user message
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      type: 'user',
      content: userText,
      timestamp: new Date().toISOString(),
    };
    setChatHistory(prev => [...prev, userMsg]);
    setChatTurnCount(c => c + 1);
    if (chatTurnCount === 0) track('chat_started', { session_id: sessionId })
    setChatInput('');

    // Add streaming placeholder AI message
    const streamId = crypto.randomUUID();
    streamingMsgIdRef.current = streamId;
    setChatHistory(prev => [...prev, {
      id: streamId,
      type: 'ai',
      content: '',
      isSearching: false,
      userQuery: userText,
      timestamp: new Date().toISOString(),
    }]);

    try {
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      const response = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': userId },
        body: JSON.stringify({ message: userText, session_id: sessionId }),
        signal: controller.signal,
      });

      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') ?? '60', 10)
        setRateLimitUntil(Date.now() + retryAfter * 1000)
        setChatHistory(prev => prev.filter(m => m.id !== streamId))
        return
      }
      if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let localProjects: ProjectCardType[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let payload: any;
          try { payload = JSON.parse(line.slice(6)); } catch { continue; }

          if (payload.type === 'text') {
            setChatHistory(prev => prev.map(m =>
              m.id === streamId
                ? { ...m, content: m.content + payload.delta, isSearching: false }
                : m
            ));
          } else if (payload.type === 'searching') {
            setChatHistory(prev => prev.map(m =>
              m.id === streamId ? { ...m, isSearching: true, searchingTool: payload.tool ?? undefined, content: '' } : m
            ));
          } else if (payload.type === 'properties') {
            // Cards arrive immediately after DB query — render before Groq writes text
            const props = payload.data as ProjectCardType[];
            localProjects = props;
            setChatHistory(prev => prev.map(m =>
              m.id === streamId
                ? { ...m, isSearching: false, properties: props }
                : m
            ));
            setLastShortlist(props);
            setShowRecommendations(true);
            track('recommendation_generated', { count: props.length, session_id: sessionId });
          } else if (payload.type === 'error') {
            setChatHistory(prev => prev.map(m =>
              m.id === streamId
                ? { ...m, content: payload.message || 'Something went wrong. Please try again.', isSearching: false }
                : m
            ));
          } else if (payload.type === 'done') {
            const d = payload.data;
            if (d.session_id) setSessionId(d.session_id);
            if (d.chatPhase) setChatPhase(d.chatPhase);
            if (d.missingDimension !== undefined) setMissingDimension(d.missingDimension);
            // Use localProjects (not stale closure) to correctly detect comparison intent
            setChatHistory(prev => prev.map(m =>
              m.id === streamId
                ? {
                    ...m,
                    isSearching: false,
                    showComparisonTable: (
                      userText.toLowerCase().includes('compare') && localProjects.length >= 2
                    ),
                  }
                : m
            ));
            setExpandedShortlists(new Set());
          }
        }
      }

      // Length warning
      if (!hasShownLengthWarning && chatTurnCount + 1 >= 12) {
        setHasShownLengthWarning(true);
        setShowContextWarning(true);
      }

    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      const errorMsg = err instanceof Error ? err.message : '';
      setChatHistory(prev => prev.map(m =>
        m.id === streamId
          ? { ...m, content: `Sorry, something went wrong. ${errorMsg ? `(${errorMsg})` : ''} Please try again.`, isSearching: false }
          : m
      ));
    } finally {
      streamingMsgIdRef.current = null;
      setIsSubmitting(false);
      submitLockRef.current = false;
    }
  }, [userId, isSubmitting, sessionId, chatTurnCount, hasShownLengthWarning]);

  const handleChatSubmit = useCallback(async (e: React.FormEvent, textOverride?: string) => {
    e.preventDefault();
    const text = (textOverride ?? chatInput).trim();
    if (!text) return;
    await streamChat(text);
  }, [chatInput, streamChat]);

  // ── Regenerate: re-send the last user message ──
  const handleRegenerate = useCallback(async (aiMsgIndex: number) => {
    let userMsg = '';
    for (let i = aiMsgIndex - 1; i >= 0; i--) {
      if (chatHistory[i].type === 'user') { userMsg = chatHistory[i].content; break; }
    }
    if (userMsg) await streamChat(userMsg);
  }, [chatHistory, streamChat]);

  const stripMarkdown = (text: string): string => {
    return text
      .replace(/```[\s\S]*?```/g, '[code]')
      .replace(/`[^`]+`/g, '[code]')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  };

  const handleCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(stripMarkdown(text))
      .then(() => setToast({ message: 'Copied!' }))
      .catch(() => {})
  }, []);

  const hasUserReplied = chatHistory.some((m) => m.type === 'user');

  // Index of the last chat message that has property cards — only that one shows full grid
  const lastPropertiesIndex = useMemo(() =>
    chatHistory.reduce((last, msg, i) =>
      (msg.properties && msg.properties.length > 0 ? i : last), -1
    ), [chatHistory]);

  // ── Submit a message programmatically (used by suggestion chips and advisor chips) ──
  const submitMessage = useCallback((text: string) => {
    streamChat(text);
  }, [streamChat]);

  const followUpChips = useMemo(
    () => getFollowUpChips(missingDimension),
    [missingDimension],
  );

  const suggestionChips = useMemo(() => {
    const offset = sessionId ? (sessionId.charCodeAt(0) % WELCOME_CHIPS.length) : 0;
    return WELCOME_CHIPS.slice(offset, Math.min(offset + 4, WELCOME_CHIPS.length));
  }, [sessionId]);

  // ── Stable MessageBubble callbacks ──────────────────────────────────────────
  const handleToggleExpanded = useCallback((id: string) => {
    setExpandedShortlists(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }, [])

  const handleToggleMap = useCallback(() => setShowMap(v => !v), [])

  const handleSetCarouselIndex = useCallback((msgIdx: number, imgIdx: number) => {
    setCarouselIndexes(prev => ({ ...prev, [msgIdx]: imgIdx }))
  }, [])

  const handleToast = useCallback((msg: string) => setToast({ message: msg }), [])
  const handleOpenCalculator = useCallback(() => setShowCalculator(true), [])
  const handleOpenShareSheet = useCallback(() => setShareSheetOpen(true), [])

  // ── Chat input form ──
  const chatInputForm = (
    <div className="w-full">
      {rateLimitUntil && (
        <RateLimitBanner until={rateLimitUntil} onExpire={() => setRateLimitUntil(null)} />
      )}
      {isSubmitting && (
        <div className="flex justify-end mb-2">
          <button
            type="button"
            onClick={() => abortControllerRef.current?.abort()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-red-500 border border-gray-300 dark:border-gray-600 rounded-full transition-colors"
          >
            <span className="w-2 h-2 bg-current rounded-sm" />
            Stop generating
          </button>
        </div>
      )}
      <div className="relative flex items-center gap-2">
        {/* Reset / New Chat Button */}
        <div id="new-chat-guide">
          <button
            onClick={performReset}
            className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all active:scale-95 group flex items-center justify-center"
            title="Reset conversation"
          >
            <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
          </button>
        </div>

        <div id="chat-input-guide" className="relative flex-1 group">
          <PlaceholdersAndVanishInput
            placeholders={
              chatPhase === 'ADVISOR'
                ? ['Ask anything about these properties...', 'Any risks associated?', 'Compare prices...']
                : ["Tell me what you're looking for...", "Find me a 3 BHK in Sector 150...", "Show me properties under 2 Crores..."]
            }
            onChange={(e) => setChatInput(e.target.value)}
            onSubmit={handleChatSubmit}
            value={chatInput}
          />
        </div>

        {/* Voice Input Button */}
        <button
          type="button"
          onClick={toggleVoiceInput}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 touch-target-min ${isListening
            ? 'text-red-500 animate-pulse scale-105 bg-red-100 dark:bg-red-900/40'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          title="Voice Input"
        >
          {isListening ? (
            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 -m-1 rounded-full bg-red-100 dark:bg-red-900/30 animate-ping opacity-50" />
              <Mic size={18} className="relative text-red-500 fill-current" />
            </div>
          ) : (
            <Mic size={18} className="text-gray-500 dark:text-gray-400" />
          )}
        </button>

        {/* Help / Guide Button */}
        <div id="help-guide">
          <VisualGuide />
        </div>
      </div>
      {isListening && (
        <div className="flex items-center justify-center gap-2 mt-3">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <span className="text-xs text-red-500 font-medium">Listening... Speak now</span>
        </div>
      )}
      <p className="text-xs text-gray-500 mt-2 text-center">
        AI can make mistakes. Verify Critical property details.
      </p>
    </div>
  );

  return (
    <div
      className="flex-1 flex flex-col min-h-0 bg-transparent dark:bg-gray-900 overflow-hidden"
      style={isMobile ? { height: viewportHeight } : undefined}
    >
      <Header title="RealtyPal Intelligence Engine™" onToast={(msg: string) => setToast({ message: msg })} />

      {/* Main: centered input when no chat, scrollable messages + bottom input when chat started */}
      <div className={`flex-1 flex flex-col min-h-0 overflow-hidden relative z-10 ${!hasUserReplied ? 'justify-center' : ''}`}>

        {/* Static gradient background — no animation = no repaints */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[5%] left-[15%] w-[500px] h-[500px] bg-blue-400/15 dark:bg-blue-600/8 blur-[160px] rounded-full" />
          <div className="absolute top-[45%] right-[5%] w-[550px] h-[550px] bg-indigo-400/10 dark:bg-purple-600/8 blur-[180px] rounded-full" />
          <div className="absolute bottom-[0%] left-[35%] w-[400px] h-[400px] bg-teal-400/8 dark:bg-teal-600/8 blur-[140px] rounded-full" />
        </div>

        {!hasUserReplied ? (
          /* Welcome screen */
          <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 relative z-10">
            <div className="text-center mb-10 max-w-lg">
              <div className="w-16 h-16 mx-auto mb-5 rounded-2xl glass-surface border border-white/50 dark:border-white/10 flex items-center justify-center shadow-lg overflow-hidden">
                <Image src="/images/logo/realtypals.png" alt="RealtyPal" width={44} height={44} />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">
                Find your perfect property
              </h1>
              <p className="text-gray-500 dark:text-gray-400 text-base">
                Ask me anything about real estate across India — or pick a suggestion to start.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md w-full mb-10">
              {suggestionChips.map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => submitMessage(chip.msg)}
                  className="px-4 py-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-violet-50 dark:hover:bg-violet-900/20 hover:border-violet-200 dark:hover:border-violet-700 hover:text-violet-700 dark:hover:text-violet-400 transition-all text-left shadow-sm font-medium"
                >
                  {chip.emoji} {chip.label}
                </button>
              ))}
            </div>

            <div className="w-full max-w-2xl">
              {chatInputForm}
            </div>
          </div>
        ) : (
          /* Feed layout */
          <>
            <div
              ref={chatContainerRef}
              className="flex-1 h-full min-h-0 overflow-y-auto px-4 md:px-8 pt-6 pb-36 relative z-10"
              onScroll={(e) => {
                const el = e.currentTarget;
                userScrolledUp.current = (el.scrollHeight - el.scrollTop - el.clientHeight) > 100;
              }}
            >
              <div className="max-w-4xl mx-auto space-y-6">
                {restoreError && (
                  <div className="flex flex-col items-center justify-center flex-1 gap-4 p-8 text-center">
                    <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                      <AlertTriangle size={24} className="text-red-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800 dark:text-gray-200 mb-1">Could not load chat</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">This session may have expired or been deleted.</p>
                    </div>
                    <button
                      onClick={() => {
                        setRestoreError(false);
                        setIsInitialized(false);
                      }}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      Start new chat
                    </button>
                  </div>
                )}
                {showContextWarning && (
                  <div className="mx-auto max-w-lg px-4 py-2 my-2 text-xs text-center text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                    Long conversation detected. Start a new chat for the best AI responses.
                  </div>
                )}
                {chatHistory.map((message, index) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    index={index}
                    isLast={index === chatHistory.length - 1}
                    isSubmitting={isSubmitting}
                    chatPhase={chatPhase}
                    isLastProperties={index === lastPropertiesIndex}
                    isExpanded={expandedShortlists.has(message.id)}
                    carouselIndex={carouselIndexes[index] ?? 0}
                    lastShortlist={lastShortlist}
                    showMap={showMap}
                    userId={userId}
                    regeneratingIdx={regeneratingIdx}
                    chipPicker={chipPicker}
                    followUpChips={followUpChips}
                    onCopy={handleCopy}
                    onDetailOpen={openDetailProject}
                    onCallback={setCallbackProject}
                    onRegenerate={handleRegenerate}
                    onSubmitMessage={submitMessage}
                    onToggleExpanded={handleToggleExpanded}
                    onToggleMap={handleToggleMap}
                    onSetChipPicker={setChipPicker}
                    onSetCarouselIndex={handleSetCarouselIndex}
                    onSetSiteVisit={setSiteVisitProject}
                    onOpenCalculator={handleOpenCalculator}
                    onOpenShareSheet={handleOpenShareSheet}
                    onToast={handleToast}
                  />
                ))}

                <div ref={chatEndRef} />
              </div>

              {/* Floating FAB for minimized mobile input */}
              <AnimatePresence>
                {isInputMinimized && !isSubmitting && (
                  <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.8 }}
                    className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 md:hidden"
                  >
                    <button
                      onClick={() => {
                        setIsInputMinimized(false);
                        scrollToBottom();
                        setTimeout(() => chatInputRef.current?.focus(), 300);
                      }}
                      className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-full shadow-2xl hover:bg-blue-700 transition-all font-semibold border border-blue-400"
                    >
                      <MessageSquare size={18} />
                      <span>Send Message</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {showScrollBtn && (
                <button
                  onClick={() => scrollToBottom()}
                  className="absolute bottom-4 right-6 w-9 h-9 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-600 transition-all z-10"
                  aria-label="Scroll to bottom"
                >
                  <svg className="w-4 h-4 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </button>
              )}
            </div>

            {/* Frosted glass input bar — absolute so it sits flush at the container bottom */}
            <AnimatePresence initial={false}>
              {!isInputMinimized && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  className={`absolute bottom-0 left-0 right-0 w-full z-10 bg-gradient-to-t from-white via-white/95 to-transparent dark:from-gray-900 dark:via-gray-900/95 dark:to-transparent pt-10 pb-4 ${keyboardOpen ? 'pb-safe' : ''}`}
                  style={keyboardOpen ? { paddingBottom: 'env(safe-area-inset-bottom, 8px)' } : undefined}
                >
                  <div className="px-4 md:px-8 max-w-4xl mx-auto flex flex-col justify-center w-full">
                    {chatInputForm}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>

      {/* Toast */}
      {toast && <Toast message={toast.message} onClose={() => setToast(null)} />}

      {/* Project detail slide-over */}
      <ProjectDetailPanel project={detailProject} onClose={() => setDetailProject(null)} />

      {/* Calculator panel */}
      {showCalculator && (
        <CalculatorPanel
          onClose={() => setShowCalculator(false)}
          defaultPriceCr={lastShortlist[0]?.price_min_cr ?? 1.5}
        />
      )}

      {/* ── Site Visit Scheduler modal ── */}
      <AnimatePresence>
        {siteVisitProject && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4"
            onClick={(e) => { if (e.target === e.currentTarget) setSiteVisitProject(null) }}
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="w-full sm:max-w-lg max-h-[92dvh] overflow-y-auto rounded-t-3xl sm:rounded-2xl bg-white dark:bg-gray-900 shadow-2xl"
            >
              <SiteVisitScheduler
                projectId={siteVisitProject.id}
                projectSlug={siteVisitProject.slug}
                projectName={siteVisitProject.name}
                onClose={() => setSiteVisitProject(null)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Callback request modal ── */}
      <AnimatePresence>
        {callbackProject && !callbackDone && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4"
            onClick={(e) => { if (e.target === e.currentTarget) { setCallbackProject(null); setCallbackDone(false) } }}
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl bg-white dark:bg-gray-900 shadow-2xl p-6 pb-safe"
            >
              {/* Drag handle */}
              <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-5 sm:hidden" />

              <div className="flex items-start justify-between mb-5">
                <div>
                  <h3 className="text-[16px] font-bold text-gray-900 dark:text-white">Request Callback</h3>
                  <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-0.5">{callbackProject.name} · {callbackProject.price_range_label}</p>
                </div>
                <button onClick={() => setCallbackProject(null)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg leading-none transition-colors">×</button>
              </div>

              <div className="space-y-3 mb-5">
                <div>
                  <label className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-1.5">Your Name</label>
                  <input
                    type="text"
                    placeholder="Rahul Sharma"
                    value={callbackForm.name}
                    onChange={(e) => setCallbackForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 transition-all"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-1.5">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={callbackForm.phone}
                    onChange={(e) => setCallbackForm(f => ({ ...f, phone: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 transition-all"
                  />
                </div>
              </div>

              <button
                disabled={!callbackForm.name.trim() || callbackForm.phone.trim().length < 10 || callbackSubmitting}
                onClick={async () => {
                  setCallbackSubmitting(true)
                  try {
                    await fetch(`${API_BASE}/callback`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        name: callbackForm.name.trim(),
                        phone: callbackForm.phone.trim(),
                        project_id: callbackProject.id,
                        project_slug: callbackProject.slug,
                        project_name: callbackProject.name,
                      }),
                    })
                    setCallbackDone(true)
                  } catch { /* silent */ } finally {
                    setCallbackSubmitting(false)
                  }
                }}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-200 disabled:text-gray-400 dark:disabled:bg-gray-700 dark:disabled:text-gray-500 text-white font-bold rounded-xl transition-all text-sm"
              >
                {callbackSubmitting ? 'Sending...' : '📞 Request Callback'}
              </button>
              <p className="text-[11px] text-gray-400 text-center mt-2">We&apos;ll call within 2 hours · Business hours only</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {callbackDone && callbackProject && (
        <LeadSuccessModal
          type="callback"
          projectName={callbackProject.name}
          name={callbackForm.name}
          onClose={() => { setCallbackProject(null); setCallbackDone(false) }}
        />
      )}

      {/* ── Share shortlist sheet ── */}
      <AnimatePresence>
        {shareSheetOpen && lastShortlist.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4"
            onClick={(e) => { if (e.target === e.currentTarget) { setShareSheetOpen(false); setShareCopied(false) } }}
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl bg-white dark:bg-gray-900 shadow-2xl p-6 pb-safe"
            >
              <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-5 sm:hidden" />
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[16px] font-bold text-gray-900 dark:text-white">Share Shortlist</h3>
                <button onClick={() => { setShareSheetOpen(false); setShareCopied(false) }} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg leading-none transition-colors">×</button>
              </div>

              {/* Preview */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 mb-4 border border-gray-100 dark:border-gray-700 text-[12px] text-gray-600 dark:text-gray-300 font-mono leading-relaxed">
                <div className="font-bold text-gray-800 dark:text-gray-100 mb-1">🏠 My RealtyPals Shortlist</div>
                {lastShortlist.map((p, i) => (
                  <div key={p.id}>{i + 1}. {p.name} — {p.price_range_label} ({p.sector})</div>
                ))}
                <div className="mt-2 text-gray-400 text-[11px]">Researched with RealtyPal AI</div>
              </div>

              <div className="flex flex-col gap-2">
                {process.env.NEXT_PUBLIC_WHATSAPP_NUMBER && (
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(
                      `🏠 My RealtyPals Shortlist\n\n` +
                      lastShortlist.map((p, i) => `${i + 1}. ${p.name} — ${p.price_range_label} (${p.sector})`).join('\n') +
                      `\n\nResearched with RealtyPal AI`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 py-3.5 bg-[#25D366] hover:bg-[#1da851] text-white font-bold rounded-xl text-sm transition-colors"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    Share on WhatsApp
                  </a>
                )}
                <button
                  onClick={() => {
                    const text = `🏠 My RealtyPals Shortlist\n\n` +
                      lastShortlist.map((p, i) => `${i + 1}. ${p.name} — ${p.price_range_label} (${p.sector})`).join('\n') +
                      `\n\nResearched with RealtyPal AI`
                    navigator.clipboard.writeText(text).then(() => { setShareCopied(true); setTimeout(() => setShareCopied(false), 2000) })
                  }}
                  className="flex items-center justify-center gap-2 py-3.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl text-sm transition-colors border border-gray-200 dark:border-gray-700"
                >
                  {shareCopied ? '✅ Copied!' : '📋 Copy to Clipboard'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
