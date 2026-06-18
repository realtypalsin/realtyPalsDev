'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import { ChatMessage } from '@/types/property';
import type { ProjectCard as ProjectCardType } from '@/types/project';
import Image from 'next/image';
import Toast from '@/components/Toast';
import { API_BASE } from '@/lib/env'
import { track } from '@/lib/analytics';
import { streamChat as streamChatBackend } from '@/lib/backend-api'
import { authHeaders } from '@/lib/authedFetch'
import StatusSteps from '@/components/chat/StatusSteps'
import Header from '@/components/Header';
import { PlaceholdersAndVanishInput } from '@/components/ui/placeholders-and-vanish-input';
import MessageBubble from '@/components/chat/MessageBubble';
import type { Chip, ChipPickerState } from '@/components/chat/types';
import {
  MessageSquare, AlertTriangle, Mic, Plus,
} from 'lucide-react';

// ── Dynamic imports — heavy components excluded from initial bundle ─────────
const SiteVisitScheduler = dynamic(() => import('@/components/SiteVisitScheduler'), { ssr: false })
const CalculatorPanel = dynamic(() => import('@/components/CalculatorPanel'), { ssr: false })
const ProjectDetailPanel = dynamic(() => import('@/components/ProjectDetailPanel'), { ssr: false })
const VisualGuide = dynamic(() => import('./VisualGuide'), { ssr: false })
const LeadSuccessModal = dynamic(() => import('@/components/LeadSuccessModal'), { ssr: false })
const ThemeToggle = dynamic(() => import('@/components/ThemeToggle'), { ssr: false })
const ReEngagementBanner = dynamic(() => import('@/components/chat/ReEngagementBanner'), { ssr: false })

// ── Follow-up chip generator — contextual per phase ───────────────────────
function getFollowUpChips(
  phase: 'DISCOVERY' | 'ADVISOR',
  shortlist: ProjectCardType[],
  turnCount: number,
): Chip[] {
  if (phase === 'ADVISOR' && shortlist.length > 0) {
    const hasUnderConstruction = shortlist.some(
      (p) => p.status === 'under_construction' || p.status === 'new_launch',
    )
    const hasRTM = shortlist.some((p) => p.status === 'ready_to_move')
    const topProject = shortlist[0]

    return [
      { emoji: '📅', label: 'Book Site Visit', picker: 'single', pickerAction: 'site_visit', pickerModal: true },
      { emoji: '📞', label: 'Get Callback', picker: 'single', pickerAction: 'callback', pickerModal: true },
      { emoji: '📊', label: 'Calculate EMI', picker: 'single', pickerAction: 'emi' },
      ...(shortlist.length >= 2
        ? [{ emoji: '⚖️', label: 'Compare', picker: 'multi' as const, pickerAction: 'compare' }]
        : []),
      ...(hasUnderConstruction
        ? [{ emoji: '🏗️', label: 'Builder delivery risk?', picker: 'single' as const, pickerAction: 'risks' }]
        : []),
      ...(hasRTM
        ? [{ emoji: '🔑', label: 'Why still available?', msg: `Why is ${topProject.name} still available as ready-to-move? Is there a catch I should know about?` }]
        : []),
      { emoji: '🏗️', label: 'Builder track record', picker: 'single', pickerAction: 'builder' },
      { emoji: '📍', label: 'Area overview', picker: 'single', pickerAction: 'area' },
    ]
  }
  if (phase === 'DISCOVERY' && turnCount >= 2) {
    return [
      { emoji: '🏠', label: 'Show properties', msg: 'Show me available 3BHK properties in Noida Sector 150' },
      { emoji: '📊', label: 'EMI calculator', msg: 'How do I calculate EMI for a 1.5 Cr flat?' },
      { emoji: '🏆', label: 'Best sectors', msg: 'Which sectors in Noida have the best appreciation right now?' },
      { emoji: '📋', label: 'RERA explained', msg: 'What is RERA and how does it protect home buyers?' },
    ]
  }
  return []
}

const SUGGESTION_POOL = [
  'Show me 3BHK under 1.5 Cr in Noida',
  'Best sectors for families',
  'Compare Sector 150 vs Sector 137',
  'Builder track records in Noida',
  'Calculate EMI for 1.2 Cr',
  'RERA registered projects',
  'Ready to move under 2 Cr',
  'Metro-connected properties',
  'New launches 2024-25',
  'Properties near good schools',
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
  guestToken?: string | null;
  onSessionChange?: (sessionId: string | null) => void;
}

export default function DiscoveryContent({ userId, guestToken, onSessionChange }: DiscoveryContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [chatInput, setChatInput] = useState(() => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('realtypals_draft') ?? '';
  });
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [toast, setToast] = useState<{ message: string } | null>(null);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [restoreError, setRestoreError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitLockRef = useRef(false);
  const [rateLimitUntil, setRateLimitUntil] = useState<number | null>(null);
  const [chatTurnCount, setChatTurnCount] = useState(0);
  const [hasShownLengthWarning, setHasShownLengthWarning] = useState(false);
  const [showContextWarning, setShowContextWarning] = useState(false);
  const [chatPhase, setChatPhase] = useState<'DISCOVERY' | 'ADVISOR'>('DISCOVERY');
  const [sessionId, setSessionId] = useState<string | null>(null);
  // Tracks which ?session= URL param was last fully restored — prevents re-init loops
  const lastRestoredSessionParamRef = useRef<string | null>(null)

  // Notify parent of session changes for sidebar highlighting
  useEffect(() => { onSessionChange?.(sessionId) }, [sessionId, onSessionChange])

  // Draft persistence — save input to localStorage, clear on submit
  useEffect(() => {
    if (chatInput) {
      localStorage.setItem('realtypals_draft', chatInput);
    } else {
      localStorage.removeItem('realtypals_draft');
    }
  }, [chatInput]);
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
  const [callbackError, setCallbackError] = useState<string | null>(null);
  const [shareSheetOpen, setShareSheetOpen] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [isInputMinimized, setIsInputMinimized] = useState(false);
  const [regeneratingIdx, setRegeneratingIdx] = useState<number | null>(null);
  const [quickActionPicker, setQuickActionPicker] = useState<{ action: string, genericText: string, mode: 'single' | 'multi', selected: string[] } | null>(null);
  const [statusPhase, setStatusPhase] = useState<'extracting' | 'searching' | 'generating' | null>(null)
  const [currentIntent, setCurrentIntent] = useState<Record<string, unknown> | null>(null)
  const [resultCount, setResultCount] = useState<number | null>(null)
  const [showReEngagement, setShowReEngagement] = useState(true)
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
          headers: await authHeaders(),
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
    if ((!userId && !guestToken) || isInitialized || searchParams.get('new') === '1') return;

    // Guest users skip session restore — show welcome immediately
    if (!userId && guestToken) {
      setChatHistory([{
        id: crypto.randomUUID(),
        type: 'ai',
        content: "Hi! I'm RealtyPal — your AI advisor for Noida real estate. What are you looking for?",
        timestamp: new Date().toISOString(),
      }]);
      setIsInitialized(true);
      return;
    }

    (async () => {
      try {
        const sessionFromUrl = searchParams.get('session')
        const sessionUrl = sessionFromUrl
          ? `${API_BASE}/chat/session?id=${sessionFromUrl}`
          : `${API_BASE}/chat/session`
        const res = await fetch(sessionUrl, {
          headers: await authHeaders(),
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

  const streamChat = useCallback((userText: string): void => {
    if ((!userId && !guestToken) || isSubmitting || submitLockRef.current) return;
    submitLockRef.current = true;
    setIsSubmitting(true);
    setStatusPhase('extracting');
    userScrolledUp.current = false;
    setChipPicker(null);

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

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    let localProjects: ProjectCardType[] = [];

    streamChatBackend(userText, {
      sessionId: sessionId ?? undefined,
      userId: userId ?? undefined,
      guestToken: guestToken ?? undefined,
      intent: currentIntent ?? undefined,
      signal: controller.signal,
      onEvent: (event) => {
        if (event.type === 'intent') {
          setCurrentIntent(event.intent);
          setStatusPhase('searching');
        } else if (event.type === 'properties') {
          const exact = event.exactResults as unknown as ProjectCardType[];
          const nearby = event.nearbyResults as unknown as ProjectCardType[];
          const expansion = event.expansion;
          const shortlist = exact.length > 0 ? exact : nearby;
          localProjects = shortlist;
          setStatusPhase('generating');
          setResultCount(shortlist.length);
          setChatHistory(prev => prev.map(m =>
            m.id === streamId
              ? {
                  ...m,
                  isSearching: false,
                  exactResults: exact,
                  nearbyResults: nearby,
                  expansion,
                  properties: shortlist,
                }
              : m
          ));
          setLastShortlist(shortlist);
          setShowRecommendations(shortlist.length > 0);
          track('recommendation_generated', { count: shortlist.length, session_id: sessionId });
        } else if (event.type === 'token') {
          setChatHistory(prev => prev.map(m =>
            m.id === streamId
              ? { ...m, content: m.content + event.token, isSearching: false }
              : m
          ));
        } else if (event.type === 'error') {
          setStatusPhase(null);
          setResultCount(null);
          setChatHistory(prev => prev.map(m =>
            m.id === streamId
              ? { ...m, content: event.message || 'Something went wrong. Please try again.', isSearching: false }
              : m
          ));
        } else if (event.type === 'done') {
          const newSessionId = event.sessionId ?? sessionId
          if (event.sessionId) setSessionId(event.sessionId);
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

          // Auto-generate smart title on first turn
          if (chatTurnCount === 0 && userId && newSessionId && event.intent) {
            const intent = event.intent as Record<string, unknown>
            const parts: string[] = []
            if (Array.isArray(intent.bhk) && intent.bhk.length > 0) parts.push(`${(intent.bhk as number[]).join('/')} BHK`)
            if (intent.sector) parts.push(String(intent.sector))
            if (intent.budgetMax) parts.push(`Under ₹${intent.budgetMax}Cr`)
            else if (intent.budgetMin) parts.push(`From ₹${intent.budgetMin}Cr`)
            const smartTitle = parts.length > 0 ? parts.join(' · ') : userText.slice(0, 60)
            authHeaders({ 'Content-Type': 'application/json' }).then((headers) =>
              fetch(`${API_BASE}/chat/session/${newSessionId}`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify({ title: smartTitle }),
              })
            ).then(() => {
              window.dispatchEvent(new CustomEvent('realtypals:session-updated'))
            }).catch(() => {})
          }
        }
      },
      onDone: () => {
        setStatusPhase(null);
        setResultCount(null);
        streamingMsgIdRef.current = null;
        setIsSubmitting(false);
        submitLockRef.current = false;
        if (!hasShownLengthWarning && chatTurnCount + 1 >= 12) {
          setHasShownLengthWarning(true);
          setShowContextWarning(true);
        }
      },
    });
  }, [userId, guestToken, isSubmitting, sessionId, chatTurnCount, hasShownLengthWarning, currentIntent]);

  const handleChatSubmit = useCallback((e: React.FormEvent, textOverride?: string) => {
    e.preventDefault();
    const text = (textOverride ?? chatInput).trim();
    if (!text) return;
    streamChat(text);
  }, [chatInput, streamChat]);

  // ── Regenerate: re-send the last user message ──
  const handleRegenerate = useCallback((aiMsgIndex: number) => {
    let userMsg = '';
    for (let i = aiMsgIndex - 1; i >= 0; i--) {
      if (chatHistory[i].type === 'user') { userMsg = chatHistory[i].content; break; }
    }
    if (userMsg) streamChat(userMsg);
  }, [chatHistory, streamChat]);

  const handleQuickReply = useCallback((field: string, value: string) => {
    let message = value;
    if (field === 'bhk') message = `${parseInt(value)} BHK`;
    streamChat(message);
  }, [streamChat]);

  const handleQuickActionTrigger = useCallback((action: string, genericText: string, mode: 'single' | 'multi') => {
    if (lastShortlist.length > 0) {
      if (mode === 'multi' && lastShortlist.length < 2) {
        handleQuickReply('quick', genericText);
      } else {
        setQuickActionPicker({ action, genericText, mode, selected: [] });
      }
    } else {
      handleQuickReply('quick', genericText);
    }
  }, [lastShortlist, handleQuickReply]);

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
    () => getFollowUpChips(chatPhase, lastShortlist, chatTurnCount),
    [chatPhase, lastShortlist, chatTurnCount],
  );

  const suggestionChips = useMemo(() => {
    const offset = sessionId ? (sessionId.charCodeAt(0) % 7) : 0;
    const chips: string[] = [];
    for (let i = 0; i < 4; i++) {
      chips.push(SUGGESTION_POOL[(offset + i) % SUGGESTION_POOL.length]);
    }
    return chips;
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

  // ── Floating Chat Input Bar (LobeHub Style) ──
  const chatInputForm = (
    <div className={`relative w-full transition-all duration-300 ${isInputMinimized ? 'translate-y-full opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'}`}>
      <div className="relative w-full">
          <StatusSteps phase={statusPhase} intent={currentIntent} resultCount={resultCount} />
          {rateLimitUntil && (
            <RateLimitBanner until={rateLimitUntil} onExpire={() => setRateLimitUntil(null)} />
          )}
          {isSubmitting && (
            <div className="flex items-center justify-between mb-4 px-2">
              <div className="flex items-center gap-4">
                 {/* The AI Orb */}
                 <div className="relative w-5 h-5">
                    <div className="absolute -inset-2 rounded-full bg-blue-500/40 blur-md animate-pulse" style={{ animationDuration: '2s' }} />
                    <div className="absolute -inset-1 rounded-full bg-blue-400/60 blur-sm animate-ping" style={{ animationDuration: '3s' }} />
                    <div className="absolute inset-0 rounded-full bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.8)]" />
                    <div className="absolute inset-1 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,1)]" />
                 </div>
                 {/* Thought Stream */}
                 <span className="text-[11px] font-mono font-medium text-blue-600 dark:text-blue-400 tracking-wider uppercase animate-pulse">
                   &gt; {statusPhase ? statusPhase.toLowerCase() + '...' : 'processing request...'}
                 </span>
              </div>
              <button
                type="button"
                onClick={() => abortControllerRef.current?.abort()}
                className="flex items-center gap-2 px-4 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 border border-gray-300 dark:border-gray-600 rounded-full transition-all shadow-sm"
              >
                <div className="w-2 h-2 bg-current rounded-sm" />
                Stop
              </button>
            </div>
          )}
          
          <div className="relative flex items-center gap-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md p-2 rounded-[2rem] border border-gray-200/60 dark:border-gray-700/60 shadow-sm transition-all hover:shadow-md hover:border-blue-200/60 dark:hover:border-blue-900/60">
            {/* Reset / New Chat Button */}
            <div id="new-chat-guide">
              <button
                onClick={performReset}
                className="w-12 h-12 rounded-full bg-gray-50/50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 hover:text-blue-600 dark:hover:text-blue-400 transition-all active:scale-95 group flex items-center justify-center border border-transparent hover:border-gray-200 dark:hover:border-gray-600"
                title="New Chat"
              >
                <Plus size={22} className="group-hover:rotate-90 transition-transform duration-300" />
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
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 touch-target-min border ${isListening
                ? 'text-red-500 animate-pulse scale-105 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900/50 shadow-[0_0_15px_rgba(239,68,68,0.3)]'
                : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/20 border-transparent shadow-sm'
                }`}
              title="Voice Input"
            >
              {isListening ? (
                <div className="relative flex items-center justify-center">
                  <div className="absolute inset-0 -m-1 rounded-full bg-red-100 dark:bg-red-900/30 animate-ping opacity-50" />
                  <Mic size={20} className="relative text-red-500 fill-current" />
                </div>
              ) : (
                <Mic size={20} className="text-white" />
              )}
            </button>
          </div>
          
          {/* Quick Action Pills */}
          <div className="flex items-center justify-center gap-2 mt-4 overflow-x-auto pb-1 scrollbar-hide snap-x">
            <button
              type="button"
              onClick={() => handleQuickActionTrigger('emi', 'Calculate EMI for a property', 'single')}
              className="flex-shrink-0 snap-start px-3 py-1.5 text-[11px] font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-700"
            >
              📱 EMI Calculator
            </button>
            <button
              type="button"
              onClick={() => handleQuickActionTrigger('compare', 'Compare top 2 properties', 'multi')}
              className="flex-shrink-0 snap-start px-3 py-1.5 text-[11px] font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-700"
            >
              ⚖️ Compare
            </button>
            <button
              type="button"
              onClick={() => handleQuickReply('quick', 'What is the home buying process?')}
              className="flex-shrink-0 snap-start px-3 py-1.5 text-[11px] font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-700"
            >
              📖 Buying Process
            </button>
          </div>

          <div className="text-center mt-2 mb-1">
            <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wide">
              AI can make mistakes. Verify important information.
            </span>
          </div>
        </div>
    </div>
  );

  return (
    <div
      className="flex-1 flex flex-col min-h-0 bg-transparent dark:bg-gray-900 overflow-hidden"
      style={isMobile ? { height: viewportHeight } : undefined}
    >
      <Header title="RealtyPals Intelligence Engine™" onToast={(msg: string) => setToast({ message: msg })} />

      {/* Main: centered input when no chat, scrollable messages + bottom input when chat started */}
      <div className={`flex-1 flex flex-col min-h-0 overflow-hidden relative z-10 ${!hasUserReplied ? 'justify-center' : ''}`}>

        {/* Animated Orbs Overlay Background */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[10%] left-[20%] w-[500px] h-[500px] bg-blue-400/20 dark:bg-blue-600/10 blur-[150px] rounded-full mix-blend-multiply dark:mix-blend-screen opacity-50 animate-blob" />
          <div className="absolute top-[40%] right-[10%] w-[600px] h-[600px] bg-purple-400/20 dark:bg-purple-600/10 blur-[150px] rounded-full mix-blend-multiply dark:mix-blend-screen opacity-50 animate-blob" style={{ animationDelay: "2s" }} />
          <div className="absolute bottom-[-10%] left-[40%] w-[400px] h-[400px] bg-teal-400/10 dark:bg-teal-600/10 blur-[150px] rounded-full mix-blend-multiply dark:mix-blend-screen opacity-50 animate-blob" style={{ animationDelay: "4s" }} />
        </div>

        {!hasUserReplied ? (
          /* Welcome screen */
          <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 relative z-10">
            <div className="text-center mb-8 max-w-lg">
              <div className="w-16 h-16 mx-auto mb-5 rounded-2xl glass-surface border border-white/50 dark:border-white/10 flex items-center justify-center shadow-xl overflow-hidden">
                <Image src="/images/logo/realtypals.png" alt="RealtyPal" width={44} height={44} />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-3 tracking-tight">
                Your AI property advisor
              </h1>
              <p className="text-gray-500 dark:text-gray-400 text-base leading-relaxed">
                Describe what you&apos;re looking for in plain language — budget, area, BHK, lifestyle. I&apos;ll find the best matches and explain the trade-offs.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-2xl w-full mb-8">
              {[
                { icon: '🏠', title: 'Find properties', desc: '3BHK under 1.5 Cr in Sector 150', color: 'hover:border-blue-200 hover:bg-blue-50/50 dark:hover:border-blue-800 dark:hover:bg-blue-900/20' },
                { icon: '📊', title: 'Compare projects', desc: 'Compare Sector 150 vs Sector 137', color: 'hover:border-indigo-200 hover:bg-indigo-50/50 dark:hover:border-indigo-800 dark:hover:bg-indigo-900/20' },
                { icon: '🏗️', title: 'Builder research', desc: 'Which builders have the best track record?', color: 'hover:border-emerald-200 hover:bg-emerald-50/50 dark:hover:border-emerald-800 dark:hover:bg-emerald-900/20' },
                { icon: '🧮', title: 'Calculate costs', desc: 'EMI for ₹1.5 Cr at 8.5% for 20 years', color: 'hover:border-violet-200 hover:bg-violet-50/50 dark:hover:border-violet-800 dark:hover:bg-violet-900/20' },
              ].map((card) => (
                <button
                  key={card.title}
                  type="button"
                  onClick={() => submitMessage(card.desc)}
                  className={`group flex items-start gap-3.5 px-4 py-3.5 bg-white/80 dark:bg-gray-800/70 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-2xl transition-all duration-200 text-left shadow-sm hover:shadow-md ${card.color} active:scale-[0.98]`}
                >
                  <span className="text-2xl mt-0.5 flex-shrink-0">{card.icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-0.5">{card.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-snug">{card.desc}</p>
                  </div>
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
              role="log"
              aria-live="polite"
              aria-relevant="additions text"
              aria-label="Conversation with RealtyPal advisor"
              className="flex-1 h-full min-h-0 overflow-y-auto px-4 md:px-8 pt-6 pb-56 relative z-10"
              onScroll={(e) => {
                const el = e.currentTarget;
                userScrolledUp.current = (el.scrollHeight - el.scrollTop - el.clientHeight) > 100;
              }}
            >
              <div className="max-w-4xl mx-auto space-y-6">
                {showReEngagement && (
                  <ReEngagementBanner
                    userId={userId ?? undefined}
                    guestToken={guestToken ?? undefined}
                    onResume={(sid) => {
                      setShowReEngagement(false);
                      router.push(`/discover?session=${sid}`);
                    }}
                    onDismiss={() => setShowReEngagement(false)}
                  />
                )}
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

      {/* ── Quick Action Picker modal ── */}
      <AnimatePresence>
        {quickActionPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4"
            onClick={(e) => { if (e.target === e.currentTarget) setQuickActionPicker(null) }}
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
                <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide">
                  {quickActionPicker.mode === 'multi' ? 'Select properties to compare' : 'Which property?'}
                </h3>
                <button onClick={() => setQuickActionPicker(null)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg leading-none">×</button>
              </div>
              <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto pr-1">
                {lastShortlist.map((p) => {
                  const isSelected = quickActionPicker.selected.includes(p.slug)
                  return (
                    <button
                      key={p.slug}
                      onClick={() => {
                        if (quickActionPicker.mode === 'single') {
                          setQuickActionPicker(null)
                          const prompt = quickActionPicker.action === 'emi' ? `What would be the monthly EMI for ${p.name}? Show a breakdown at 8.5% for 20 years.` :
                            quickActionPicker.action === 'gst' ? `What is the GST applicable on ${p.name}?` :
                            `${quickActionPicker.genericText} ${p.name}`
                          handleQuickReply('quick', prompt)
                        } else {
                          setQuickActionPicker({
                            ...quickActionPicker,
                            selected: isSelected
                              ? quickActionPicker.selected.filter(s => s !== p.slug)
                              : quickActionPicker.selected.length < 3 ? [...quickActionPicker.selected, p.slug] : quickActionPicker.selected,
                          })
                        }
                      }}
                      className={`flex items-center justify-between px-3 py-3 rounded-xl text-sm transition-all border ${
                        isSelected
                          ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-600 text-blue-800 dark:text-blue-200'
                          : 'border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {quickActionPicker.mode === 'multi' && (
                          <div className={`w-4 h-4 rounded flex-shrink-0 flex items-center justify-center border ${
                            isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300 dark:border-gray-600'
                          }`}>
                            {isSelected && <span className="text-white text-[10px]">✓</span>}
                          </div>
                        )}
                        <div className="min-w-0 text-left">
                          <div className="font-semibold text-sm truncate">{p.name}</div>
                          <div className="text-xs text-gray-400 dark:text-gray-500">{p.price_range_label} · {p.sector}</div>
                        </div>
                      </div>
                      {quickActionPicker.mode === 'single' && (
                        <span className="text-gray-300 dark:text-gray-600 text-xs ml-2 flex-shrink-0">→</span>
                      )}
                    </button>
                  )
                })}
              </div>
              {quickActionPicker.mode === 'multi' && quickActionPicker.selected.length >= 2 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                  <button
                    onClick={() => {
                      const selected = lastShortlist.filter(p => quickActionPicker.selected.includes(p.slug))
                      const names = selected.map(p => p.name)
                      setQuickActionPicker(null)
                      const prompt = names.length === 2
                        ? `Compare ${names[0]} vs ${names[1]} in detail — price, amenities, builder, location, trade-offs.`
                        : `Compare ${names.slice(0, -1).join(', ')} and ${names[names.length - 1]} in detail.`
                      handleQuickReply('quick', prompt)
                    }}
                    className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl transition-all shadow-md"
                  >
                    Compare {quickActionPicker.selected.length} properties →
                  </button>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
                  setCallbackError(null)
                  try {
                    const res = await fetch(`${API_BASE}/callback`, {
                      method: 'POST',
                      headers: await authHeaders({ 'Content-Type': 'application/json' }),
                      body: JSON.stringify({
                        name: callbackForm.name.trim(),
                        phone: callbackForm.phone.trim(),
                        project_id: callbackProject.id,
                        project_slug: callbackProject.slug,
                        project_name: callbackProject.name,
                      }),
                    })
                    if (!res.ok) throw new Error('callback request failed')
                    track('callback_requested', { project_slug: callbackProject.slug, project_name: callbackProject.name })
                    track('lead_created', { type: 'callback', project_slug: callbackProject.slug })
                    setCallbackDone(true)
                  } catch {
                    // Never show a fake success — surface the failure so the lead isn't silently lost.
                    setCallbackError('Could not send your request. Please check your number and try again.')
                  } finally {
                    setCallbackSubmitting(false)
                  }
                }}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-200 disabled:text-gray-400 dark:disabled:bg-gray-700 dark:disabled:text-gray-500 text-white font-bold rounded-xl transition-all text-sm"
              >
                {callbackSubmitting ? 'Sending...' : '📞 Request Callback'}
              </button>
              {callbackError && (
                <p className="text-[12px] text-red-500 text-center mt-2" role="alert">{callbackError}</p>
              )}
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
