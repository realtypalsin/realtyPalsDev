'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import { ChatMessage, NearbyExpansion } from '@/types/property';
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
import ContextRibbon from '@/components/chat/ContextRibbon';
import type { ChipPickerState } from '@/components/chat/types';
import {
  MessageSquare, AlertTriangle, Mic, Plus, ArrowUp,
  Search, Building2, Scale, Calculator
} from 'lucide-react';
import { LOCAL_SESSION_CACHE } from '@/lib/sessionCache';

// ── Dynamic imports — heavy components excluded from initial bundle ─────────
const SiteVisitScheduler = dynamic(() => import('@/components/SiteVisitScheduler'), { ssr: false })
const CalculatorPanel = dynamic(() => import('@/components/CalculatorPanel'), { ssr: false })
const ProjectDetailPanel = dynamic(() => import('@/components/ProjectDetailPanel'), { ssr: false })
const VisualGuide = dynamic(() => import('./VisualGuide'), { ssr: false })
const LeadSuccessModal = dynamic(() => import('@/components/LeadSuccessModal'), { ssr: false })
const ThemeToggle = dynamic(() => import('@/components/ThemeToggle'), { ssr: false })
const ReEngagementBanner = dynamic(() => import('@/components/chat/ReEngagementBanner'), { ssr: false })


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
  initialSessionId?: string | null;
}

export default function DiscoveryContent({ userId, guestToken, onSessionChange, initialSessionId }: DiscoveryContentProps) {
  const router = useRouter();
  const [chatInput, setChatInput] = useState(() => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('realtypals_draft') ?? '';
  });
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [visibleCount, setVisibleCount] = useState(15);
  const [toast, setToast] = useState<{ message: string } | null>(null);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [restoreError, setRestoreError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitLockRef = useRef(false);
  const [rateLimitUntil, setRateLimitUntil] = useState<number | null>(null);
  const [sessionTitle, setSessionTitle] = useState<string | null>(null);
  const [chatTurnCount, setChatTurnCount] = useState(0);
  const [hasShownLengthWarning, setHasShownLengthWarning] = useState(false);
  const [showContextWarning, setShowContextWarning] = useState(false);
  const [chatPhase, setChatPhase] = useState<'DISCOVERY' | 'ADVISOR'>('DISCOVERY');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [lastShortlist, setLastShortlist] = useState<ProjectCardType[]>([]);
  const [currentIntent, setCurrentIntent] = useState<Record<string, unknown> | null>(null);
  const [conversationState, setConversationState] = useState<import('@/components/chat/types').ConversationState | null>(null);

  // Notify parent of session changes for sidebar highlighting
  useEffect(() => { onSessionChange?.(sessionId) }, [sessionId, onSessionChange])

  // Sync state to local session cache so switching chats is seamless
  useEffect(() => {
    if (!sessionId || chatHistory.length === 0) return;
    const cached = LOCAL_SESSION_CACHE.get(sessionId) || {};
    LOCAL_SESSION_CACHE.set(sessionId, {
      ...cached,
      session_id: sessionId,
      title: sessionTitle,
      chat_phase: chatPhase,
      last_intent: currentIntent,
      last_projects: lastShortlist,
      restored: chatHistory
    });
  }, [chatHistory, sessionId, sessionTitle, chatPhase, currentIntent, lastShortlist]);

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
  const [statusPhase, setStatusPhase] = useState<'extracting' | 'searching' | 'generating' | null>(null)
  const [resultCount, setResultCount] = useState<number | null>(null)
  const [showReEngagement, setShowReEngagement] = useState(true)
  const chatEndRef = useRef<HTMLDivElement>(null);
  const streamingMsgIdRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const userScrolledUp = useRef(false);
  const performResetRef = useRef<() => void>(() => {});
  // [TIMING] holds in-progress restore stage timestamps; cleared after summary printed
  const navTimingsRef = useRef<{ restoreStart: number; authMs: number; fetchMs: number; mapperMs: number; setHistoryAt: number } | null>(null);

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

  // [TIMING] DiscoveryContent mount — distinct from page-mount (page has auth init first)
  useEffect(() => {
    const nt = (window as any).__navTimings
    if (nt && !nt.contentMounted) {
      nt.contentMounted = performance.now()
      console.log(`[NAV] 3b. content-mount  +${(nt.contentMounted - nt.t0).toFixed(1)}ms`)
    }

    // [TIMING] LCP observer — measures when the largest element paints
    if (typeof PerformanceObserver !== 'undefined') {
      let lcpEntry: PerformanceEntry | null = null
      const lcpObs = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) lcpEntry = entry
      })
      try {
        lcpObs.observe({ type: 'largest-contentful-paint', buffered: true })
      } catch (_) { /* unsupported */ }

      return () => {
        lcpObs.disconnect()
        if (lcpEntry && nt) {
          const lcpMs = (lcpEntry as any).startTime
          console.log(`[NAV] 10. LCP            +${(lcpMs - nt.t0).toFixed(1)}ms (absolute ${lcpMs.toFixed(0)}ms)`)
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
          const res = await fetch(`${API_BASE}/transcribe`, { method: 'POST', body: fd });
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

  // ── Sidebar "New Chat" button triggers reset via CustomEvent ──
  useEffect(() => {
    const handler = () => performResetRef.current();
    window.addEventListener('realtypals:new-chat', handler);
    return () => window.removeEventListener('realtypals:new-chat', handler);
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
    setCurrentIntent(null);
    setLastShortlist([]);
    setSessionTitle(null);
    setStatusPhase(null);
    setResultCount(null);
    setDetailProject(null);
    setExpandedShortlists(new Set());
    setRateLimitUntil(null);
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
      content: "Hi, I'm RealtyPal. Research properties, compare options, and decide confidently.",
      timestamp: new Date().toISOString(),
    };
    setChatHistory([welcomeMessage]);
    setIsInitialized(true);
    window.history.replaceState({}, '', '/discover');
  };
  performResetRef.current = performReset;

  // Initialize: restore session from prop or show welcome
  useEffect(() => {
    if ((!userId && !guestToken) || isInitialized) return;

    // userId/guestToken can change again (guest → authenticated) while this
    // effect's own fetch is still in flight, re-triggering it before
    // `isInitialized` flips true. Without this guard, a stale invocation
    // resolving after a newer one wins and overwrites a correctly restored
    // conversation with a blank welcome message.
    let cancelled = false;

    // No session to restore — new chat
    // (Guests with a specific initialSessionId fall through to the restore
    // fetch below, same as authenticated users — the backend supports
    // guest_token ownership on GET /chat/session.)
    if (!initialSessionId) {
      setChatHistory([{
        id: crypto.randomUUID(),
        type: 'ai',
        content: "Hi, I'm RealtyPal. Research properties, compare options, and decide confidently.",
        timestamp: new Date().toISOString(),
      }]);
      setIsInitialized(true);
      return;
    }

    // Restore specific session
    (async () => {
      try {
        const cached = LOCAL_SESSION_CACHE.get(initialSessionId);
        if (cached) {
          setSessionId(cached.session_id);
          if (cached.title) setSessionTitle(cached.title);
          if (cached.chat_phase) setChatPhase(cached.chat_phase);
          if (cached.last_intent) setCurrentIntent(cached.last_intent);
          if (cached.ui_state) setConversationState(cached.ui_state);
          if (cached.last_projects && cached.last_projects.length > 0) {
            setLastShortlist(cached.last_projects);
            setShowRecommendations(true);
          }
          setChatHistory(cached.restored);
          setIsInitialized(true);
          setTimeout(() => scrollToBottom('instant'), 50);
          return;
        }

        // [TIMING]
        const nt = (window as any).__navTimings
        const restoreStart = performance.now()
        if (nt) console.log(`[NAV] 4. restore-start    +${(restoreStart - nt.t0).toFixed(1)}ms`)

        const authT0 = performance.now()
        const headers = await authHeaders()
        const authMs = performance.now() - authT0
        if (nt) console.log(`[NAV] 5. authHeaders       +${(performance.now() - nt.t0).toFixed(1)}ms  (took ${authMs.toFixed(1)}ms)`)

        const fetchT0 = performance.now()
        if (nt) console.log(`[NAV] 6. fetch-start       +${(fetchT0 - nt.t0).toFixed(1)}ms`)
        const sessionUrl = `${API_BASE}/chat/session?id=${initialSessionId}` + (guestToken && !userId ? `&guestToken=${guestToken}` : '')
        const res = await fetch(sessionUrl, {
          headers,
          signal: AbortSignal.timeout(8000),
        });
        const fetchMs = performance.now() - fetchT0
        if (nt) console.log(`[NAV] 7. fetch-end         +${(performance.now() - nt.t0).toFixed(1)}ms  (took ${fetchMs.toFixed(1)}ms)`)

        if (!res.ok) throw new Error('session fetch failed');
        const data = await res.json();
        if (cancelled) return;

        setSessionId(data.session_id);
        if (data.title) setSessionTitle(data.title);

        if (data.chat_phase === 'ADVISOR') setChatPhase('ADVISOR');

        if (data.last_intent && typeof data.last_intent === 'object') {
          setCurrentIntent(data.last_intent as Record<string, unknown>);
        }

        if (data.ui_state) setConversationState(data.ui_state);

        if (Array.isArray(data.last_projects) && data.last_projects.length > 0) {
          setLastShortlist(data.last_projects);
          setShowRecommendations(true);
        }

        if (data.messages && data.messages.length > 0) {
          type RawMessage = {
            id: string
            role: string
            content: string
            created_at: string
            artifacts?: Array<{ type: string; [key: string]: unknown }>
          }
          const mapperT0 = performance.now()
          const restored: ChatMessage[] = data.messages.map((m: RawMessage) => {
            const base: ChatMessage = {
              id: m.id,
              type: m.role === 'user' ? 'user' : 'ai',
              content: m.content,
              timestamp: m.created_at,
            }
            for (const artifact of (m.artifacts ?? [])) {
              if (artifact.type === 'property_results') {
                base.exactResults = artifact.exactResults as ProjectCardType[]
                base.nearbyResults = artifact.nearbyResults as ProjectCardType[]
                base.expansion = artifact.expansion as NearbyExpansion | null
                base.responseMode = 'search'
              }
              if (artifact.type === 'comparison') {
                base.showComparisonTable = true
                base.responseMode = 'comparison'
                if (Array.isArray(artifact.projects) && artifact.projects.length >= 2) {
                  // Current format: projects array
                  base.comparisonProjects = (artifact.projects as ProjectCardType[]).slice(0, 4)
                } else if (artifact.left && artifact.right) {
                  // Legacy format: left/right — convert to array, no data loss
                  base.comparisonProjects = [artifact.left as ProjectCardType, artifact.right as ProjectCardType]
                }
              }
            }
            return base
          })
          const mapperMs = performance.now() - mapperT0
          if (nt) console.log(`[NAV] 8. mapper            +${(performance.now() - nt.t0).toFixed(1)}ms  (took ${mapperMs.toFixed(1)}ms, ${data.messages.length} msgs)`)

          // [TIMING] store for render-complete detection
          navTimingsRef.current = { restoreStart, authMs, fetchMs, mapperMs, setHistoryAt: performance.now() }
          
          LOCAL_SESSION_CACHE.set(initialSessionId, {
            session_id: data.session_id,
            title: data.title,
            chat_phase: data.chat_phase,
            last_intent: data.last_intent,
            last_projects: data.last_projects,
            ui_state: data.ui_state,
            restored
          });

          setChatHistory(restored);
          setTimeout(() => scrollToBottom('instant'), 50);
        } else {
          setChatHistory([{
            id: crypto.randomUUID(),
            type: 'ai',
            content: "Hi, I'm RealtyPal. Research properties, compare options, and decide confidently.",
            timestamp: new Date().toISOString(),
          }]);
        }
      } catch (err) {
        if (cancelled) return;
        console.error('[session-restore] failed:', err);
        setRestoreError(true);
      } finally {
        if (!cancelled) setIsInitialized(true);
      }
    })();

    return () => { cancelled = true; };
  }, [userId, guestToken, isInitialized, initialSessionId]);

  // [TIMING] detect when setChatHistory from restore has been committed to DOM
  useEffect(() => {
    const t = navTimingsRef.current
    if (!t || chatHistory.length === 0) return
    const renderMs = performance.now() - t.setHistoryAt
    const nt = (window as any).__navTimings
    if (nt) {
      console.log(`[NAV] 9. render-complete   +${(performance.now() - nt.t0).toFixed(1)}ms  (took ${renderMs.toFixed(1)}ms)`)
      const totalMs = performance.now() - nt.t0
      const rscMs   = nt.rscEnd     != null ? nt.rscEnd     - nt.t0 : null
      const mountMs = nt.pageMounted != null ? nt.pageMounted - nt.t0 : null
      const stages = [
        { name: 'rsc+compile',  ms: rscMs   ?? 0 },
        { name: 'authHeaders',  ms: t.authMs },
        { name: 'fetch',        ms: t.fetchMs },
        { name: 'mapper',       ms: t.mapperMs },
        { name: 'render',       ms: renderMs },
      ].filter(s => s.ms > 0)
      const slowest = stages.reduce((a, b) => a.ms > b.ms ? a : b)
      console.log(
        `[NAV] ━━━ TOTAL ${totalMs.toFixed(0)}ms` +
        (rscMs   != null ? ` | rsc+compile ${rscMs.toFixed(0)}ms`   : '') +
        (mountMs != null ? ` | page-mount ${mountMs.toFixed(0)}ms`  : '') +
        ` | authHeaders ${t.authMs.toFixed(0)}ms` +
        ` | fetch ${t.fetchMs.toFixed(0)}ms` +
        ` | mapper ${t.mapperMs.toFixed(0)}ms` +
        ` | render ${renderMs.toFixed(0)}ms` +
        ` | ⚠️ BOTTLENECK: ${slowest.name} (${slowest.ms.toFixed(0)}ms)`
      )
    }
    navTimingsRef.current = null // reset so streaming turns don't re-trigger
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatHistory.length])

  // [TIMING] property cards first visible — fires once when any message has property results
  useEffect(() => {
    const nt = (window as any).__navTimings
    if (!nt || nt.propertyCardsLogged) return
    const hasCards = chatHistory.some(
      (m) => (m.exactResults && m.exactResults.length > 0) || (m.nearbyResults && m.nearbyResults.length > 0)
    )
    if (hasCards) {
      nt.propertyCardsLogged = true
      nt.propertyCards = performance.now()
      console.log(`[NAV] 9b. property-cards +${(nt.propertyCards - nt.t0).toFixed(1)}ms`)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatHistory])


  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const dispatchAction = useCallback((action: import('@/components/chat/types').ConversationAction): void => {
    if ((!userId && !guestToken) || isSubmitting || submitLockRef.current) return;
    submitLockRef.current = true;
    setIsSubmitting(true);
    setStatusPhase('extracting');
    userScrolledUp.current = false;
    setChipPicker(null);

    const isText = action.type === 'TEXT_MESSAGE';
    const userText = isText ? (action.payload.text as string) : String(action.payload.label ?? action.type);

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      type: 'user',
      content: userText,
      timestamp: new Date().toISOString(),
    };
    
    // Only add a user message bubble if it's an explicit text message or a selected chip that isn't a silent patch
    if (isText || action.type === 'INTENT_PATCH' || action.type === 'REMOVE_FILTER') {
      setChatHistory(prev => [...prev, userMsg]);
    }
    
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
      streamingPhase: 'extracting',
      streamingIntent: null,
      streamingResultCount: null,
    }]);

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    let localProjects: ProjectCardType[] = [];

    streamChatBackend(action, {
      sessionId: sessionId ?? undefined,
      userId: userId ?? undefined,
      guestToken: guestToken ?? undefined,
      intent: currentIntent ?? undefined,
      signal: controller.signal,
      onEvent: (event) => {
        if (event.type === 'intent') {
          setCurrentIntent(event.intent);
          // Only enter 'searching' when the backend confirmed a property search will
          // happen. All other intent states (COLD, GATHERING, ADVISORY, unknown) keep
          // the UI in 'extracting' until tokens arrive.
          const isSearchState =
            event.intentState === 'READY_TO_SEARCH' || event.intentState === 'SHORTLISTED'
          if (isSearchState) setStatusPhase('searching')
          setChatHistory(prev => prev.map(m =>
            m.id === streamId ? {
              ...m,
              streamingPhase: isSearchState ? 'searching' : 'extracting',
              streamingIntent: event.intent,
              streamingIntentState: event.intentState,
            } : m
          ));
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
                  streamingPhase: 'generating',
                  streamingResultCount: shortlist.length,
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
        } else if (event.type === 'ui_state') {
          // New conversation engine backend state
          setConversationState({
            stage: event.stage,
            thinking: event.thinking,
            chips: event.chips,
            missingFields: event.missingFields,
            confidence: event.confidence
          });
        } else if (event.type === 'error') {
          setStatusPhase(null);
          setResultCount(null);
          if (event.message?.includes('sending messages a bit fast') || event.message?.includes('Too many messages')) {
            // Rate limit: show countdown banner, remove the AI placeholder
            setRateLimitUntil(Date.now() + 10_000);
            setChatHistory(prev => prev.filter(m => m.id !== streamId));
          } else {
            setChatHistory(prev => prev.map(m =>
              m.id === streamId
                ? { ...m, content: event.message || 'Something went wrong. Please try again.', isSearching: false }
                : m
            ));
          }
        } else if (event.type === 'done') {
          const newSessionId = event.sessionId ?? sessionId
          if (event.sessionId) {
            setSessionId(event.sessionId);
            // Canonicalize URL on first session creation (new chat → /discover/sessionId)
            // Uses replaceState to avoid triggering a React navigation/remount
            if (!initialSessionId && !sessionId) {
              window.history.replaceState({}, '', `/discover/${event.sessionId}`);
            }
          }
          // Backend owns responseMode — no inference on the frontend.
          // Falls back to derived value only for old sessions that predate this change.
          const responseMode: 'search' | 'comparison' | 'chat' =
            event.responseMode ??
            (localProjects.length > 0 ? 'search' : 'chat')
          const isComparison = responseMode === 'comparison'
          setChatHistory(prev => prev.map(m =>
            m.id === streamId
              ? {
                  ...m,
                  isSearching: false,
                  responseMode,
                  showComparisonTable: isComparison,
                  ...(isComparison ? {
                    comparisonProjects: localProjects.slice(0, 4),
                  } : {}),
                }
              : m
          ));
          setExpandedShortlists(new Set());
          setChatHistory(prev => prev.map(m =>
            m.id === streamId
              ? { ...m, streamingPhase: null, streamingIntent: null, streamingResultCount: null }
              : m
          ));

          // Auto-generate smart title on first turn only
          if (chatTurnCount === 0 && userId && newSessionId) {
            const smartTitle = userText.length > 30 ? userText.slice(0, 30) + '...' : userText;
            setSessionTitle(smartTitle);
            // Single sidebar refresh after PATCH — fires whether PATCH succeeds or fails.
            authHeaders({ 'Content-Type': 'application/json' }).then((headers) =>
              fetch(`${API_BASE}/chat/session/${newSessionId}`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify({ title: smartTitle }),
              })
            ).finally(() => {
              window.dispatchEvent(new CustomEvent('realtypals:session-updated'))
            }).catch(() => {})
          } else {
            // All other turns: refresh immediately (no PATCH follows).
            window.dispatchEvent(new CustomEvent('realtypals:session-updated'));
          }
        }
      },
      onDone: () => {
        setStatusPhase(null);
        setResultCount(null);
        streamingMsgIdRef.current = null;
        setIsSubmitting(false);
        submitLockRef.current = false;
        if (controller.signal.aborted) {
          console.log('[CHAT:ABORT] stream aborted by user')
          setChatHistory(prev => {
            const next = prev.filter(m => m.id !== streamId)
            console.log('[CHAT:ABORT_CLEANUP] removed AI placeholder', streamId, 'history length', prev.length, '→', next.length)
            return next
          })
          return
        }
        if (!hasShownLengthWarning && chatTurnCount + 1 >= 12) {
          setHasShownLengthWarning(true);
          setShowContextWarning(true);
        }
      },
    });
  }, [userId, guestToken, isSubmitting, sessionId, chatTurnCount, hasShownLengthWarning, currentIntent]);

  // Pick up prefill query from compare page (sessionStorage)
  useEffect(() => {
    if (!isInitialized) return;
    const prefill = sessionStorage.getItem('rp_prefill_chat');
    if (prefill) {
      sessionStorage.removeItem('rp_prefill_chat');
      setTimeout(() => dispatchAction({ type: 'TEXT_MESSAGE', payload: { text: prefill } }), 200);
    }
  }, [isInitialized, dispatchAction]);

  const handleChatSubmit = useCallback((e: React.FormEvent, textOverride?: string) => {
    e.preventDefault();
    const text = (textOverride ?? chatInput).trim();
    if (!text) return;
    dispatchAction({ type: 'TEXT_MESSAGE', payload: { text } });
  }, [chatInput, dispatchAction]);

  // ── Regenerate: re-send the last user message ──
  const handleRegenerate = useCallback((aiMsgIndex: number) => {
    let userMsg = '';
    for (let i = aiMsgIndex - 1; i >= 0; i--) {
      if (chatHistory[i].type === 'user') { userMsg = chatHistory[i].content; break; }
    }
    if (userMsg) dispatchAction({ type: 'TEXT_MESSAGE', payload: { text: userMsg } });
  }, [chatHistory, dispatchAction]);

  // ── Unified Chip Action Handler ──
  const handleChipAction = useCallback((action: import('@/components/chat/types').ChipAction) => {
    if (action.actionType === 'OPEN_TOOL') {
      const tool = action.payload.tool as string;
      if (tool === 'calculator') setShowCalculator(true);
      if (tool === 'map') setShowMap(true);
      if (tool === 'share') setShareSheetOpen(true);
      return;
    }
    
    if (action.actionType === 'COMPARE_PROPERTIES') {
      if (action.payload.mode === 'direct') {
        const selectedIds = action.payload.selected as string[];
        const selected = lastShortlist.filter(p => selectedIds.includes(p.slug));
        if (selected.length >= 2) {
          const names = selected.map(p => p.name).join(' and ');
          dispatchAction({ type: 'TEXT_MESSAGE', payload: { text: `Compare ${names}` } });
          return;
        }
      }
      
      if (action.payload.mode === 'multi') {
        if (lastShortlist.length < 2) {
          dispatchAction({ type: 'TEXT_MESSAGE', payload: { text: 'Compare projects' } });
        } else {
          setChipPicker({
            mode: 'multi',
            action: 'compare',
            label: 'Compare',
            isModal: false,
            selected: []
          });
        }
        return;
      }
    }

    if (action.actionType === 'CALCULATE_EMI' && action.payload.mode === 'single') {
       setChipPicker({
         mode: 'single',
         action: 'emi',
         label: 'Calculate EMI',
         isModal: false,
         selected: []
       });
       return;
    }

    if (action.actionType === 'BOOK_VISIT' && action.payload.mode === 'single') {
       setChipPicker({
         mode: 'single',
         action: 'visit',
         label: 'Book Visit',
         isModal: false,
         selected: []
       });
       return;
    }

    // For INTENT_PATCH, TEXT_MESSAGE, REMOVE_FILTER, just dispatch to backend
    dispatchAction({
      type: action.actionType,
      payload: action.payload
    });
  }, [dispatchAction, lastShortlist.length]);



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
  const headerTitle = sessionTitle ?? (hasUserReplied ? 'RealtyPals' : 'New conversation');

  // Index of the last chat message that has property cards — only that one shows full grid
  const lastPropertiesIndex = useMemo(() =>
    chatHistory.reduce((last, msg, i) =>
      ((msg.exactResults?.length ?? 0) > 0 || (msg.nearbyResults?.length ?? 0) > 0 || (msg.properties?.length ?? 0) > 0 ? i : last), -1
    ), [chatHistory]);




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
          {rateLimitUntil && (
            <RateLimitBanner until={rateLimitUntil} onExpire={() => setRateLimitUntil(null)} />
          )}
          {isSubmitting && (
            <div className="flex items-center justify-end mb-4 px-2">
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
          
          <div className="relative flex items-center gap-1.5 bg-white/80 dark:bg-gray-900/80 backdrop-blur-2xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.2)] border border-gray-200/50 dark:border-white/10 p-2 pl-3 rounded-full transition-all duration-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_8px_30px_rgba(0,0,0,0.4)] hover:bg-white dark:hover:bg-gray-900 mx-auto w-full group">
            <div id="chat-input-guide" className="relative flex-1 group">
              <PlaceholdersAndVanishInput
                placeholders={
                  chatPhase === 'ADVISOR'
                    ? [
                        'What are the risks with this property?',
                        'Compare Godrej Woods vs ATS Pristine...',
                        'Calculate EMI for 1.5Cr at 8.5%...',
                        'How far is the nearest metro station?',
                      ]
                    : [
                        'Find a 3 BHK in Sector 150...',
                        'Which are the best RERA-approved projects?',
                        'Show me luxury apartments on Noida Expressway...',
                        'Properties with possession by 2025...',
                      ]
                }
                onChange={(e) => setChatInput(e.target.value)}
                onSubmit={handleChatSubmit}
                value={chatInput}
                disabled={isSubmitting}
              />
            </div>

            {/* Send button when text present, Voice button when empty */}
            {chatInput.trim() ? (
              <button
                type="button"
                onClick={() => dispatchAction({ type: 'TEXT_MESSAGE', payload: { text: chatInput.trim() } })}
                className="w-[44px] h-[44px] shrink-0 rounded-full flex items-center justify-center transition-all duration-200 bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md hover:shadow-lg active:scale-95"
                title="Send"
              >
                <ArrowUp size={20} className="text-white" />
              </button>
            ) : (
              <button
                type="button"
                onClick={toggleVoiceInput}
                className={`w-[44px] h-[44px] shrink-0 rounded-full flex items-center justify-center transition-all duration-300 ${isListening
                  ? 'text-red-500 animate-pulse scale-105 bg-red-50 border border-red-200 shadow-[0_0_15px_rgba(239,68,68,0.3)]'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                title="Voice Input"
              >
                {isListening ? (
                  <div className="relative flex items-center justify-center">
                    <div className="absolute inset-0 -m-1 rounded-full bg-red-100 animate-ping opacity-50" />
                    <Mic size={20} className="relative text-red-500 fill-current" />
                  </div>
                ) : (
                  <Mic size={20} />
                )}
              </button>
            )}
          </div>
          
          {/* Quick Action Pills Removed */}

          {hasUserReplied && (
            <div className="text-center mt-2 mb-1">
              <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                AI can make mistakes. Verify important information.
              </span>
            </div>
          )}
        </div>
    </div>
  );

  return (
    <div
      className="flex-1 flex flex-col min-h-0 bg-slate-50/50 dark:bg-gray-900 overflow-hidden"
      style={isMobile ? { height: viewportHeight } : undefined}
    >
      <Header title={headerTitle} onToast={(msg: string) => setToast({ message: msg })} />

      {/* Main: centered input when no chat, scrollable messages + bottom input when chat started */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative z-10">

        {/* Animated Orbs Overlay Background */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[10%] left-[20%] w-[500px] h-[500px] bg-blue-400/20 dark:bg-blue-600/10 blur-[150px] rounded-full mix-blend-multiply dark:mix-blend-screen opacity-50 animate-blob" />
          <div className="absolute top-[40%] right-[10%] w-[600px] h-[600px] bg-purple-400/20 dark:bg-purple-600/10 blur-[150px] rounded-full mix-blend-multiply dark:mix-blend-screen opacity-50 animate-blob" style={{ animationDelay: "2s" }} />
          <div className="absolute bottom-[-10%] left-[40%] w-[400px] h-[400px] bg-teal-400/10 dark:bg-teal-600/10 blur-[150px] rounded-full mix-blend-multiply dark:mix-blend-screen opacity-50 animate-blob" style={{ animationDelay: "4s" }} />
        </div>

        <ContextRibbon 
          intent={currentIntent} 
          onRemove={(field) => dispatchAction({ type: 'REMOVE_FILTER', payload: { field } })} 
        />

        {(!isInitialized && !!initialSessionId) ? (
          <div className="flex flex-col items-center justify-center flex-1 gap-3 relative z-10">
            <div className="w-9 h-9 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
            <p className="text-sm text-gray-400 dark:text-gray-500">Loading conversation…</p>
          </div>
        ) : restoreError ? (
          <div className="flex flex-col items-center justify-center flex-1 gap-4 p-8 text-center relative z-10">
            <div className="w-14 h-14 rounded-full bg-red-50 dark:bg-red-900/30 flex items-center justify-center">
              <AlertTriangle size={28} className="text-red-400" />
            </div>
            <div>
              <p className="font-semibold text-gray-800 dark:text-gray-200 mb-1">Could not load this conversation</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">This session may have expired or been deleted. Start a new chat below.</p>
            </div>
            <button
              onClick={() => {
                window.history.replaceState({}, '', '/discover');
                setRestoreError(false);
                setIsInitialized(false);
              }}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              Start new chat
            </button>
          </div>
        ) : !hasUserReplied ? (
          /* Welcome screen */
          <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 relative z-10 overflow-y-auto">
            <div className="text-center mb-10 max-w-3xl">
              <h1 className="text-[4rem] md:text-[5.5rem] font-bold text-gray-900 dark:text-white mb-2 tracking-tight italic leading-none drop-shadow-sm font-[family-name:var(--font-afacad)]">
                RealtyPals
              </h1>
              <h2 className="text-lg md:text-xl font-normal text-gray-600 dark:text-gray-400 mb-6 tracking-tight font-[family-name:var(--font-afacad)]">
                Your AI Property Advisor
              </h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm md:text-[15px] leading-relaxed max-w-2xl mx-auto px-4">
                Compare projects, verify builder reputation, explore RERA-approved properties, estimate EMIs and discover the best properties, all through a single AI-powered search.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 w-full max-w-2xl mb-12">
              {[
                { label: 'Best 3 BHK in Noida', icon: '🏠', prompt: 'Show me the best 3 BHK apartments in Noida' },
                { label: 'Luxury on Expressway', icon: '✨', prompt: 'Show luxury apartments on Noida Expressway' },
                { label: 'Top investment', icon: '📈', prompt: 'Best areas for property investment in Noida right now' },
                { label: 'Ready to move', icon: '🔑', prompt: 'Ready to move properties under 2 Cr in Noida' },
              ].map(chip => (
                <button
                  key={chip.label}
                  onClick={() => dispatchAction({ type: 'TEXT_MESSAGE', payload: { text: chip.prompt } })}
                  className="flex items-center gap-2 px-5 py-2.5 bg-white/60 dark:bg-gray-800/60 backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-white dark:hover:bg-gray-800 hover:shadow-sm text-[13px] text-gray-700 dark:text-gray-300 font-medium rounded-full shadow-sm transition-all duration-300 hover:-translate-y-0.5"
                >
                  <span className="text-base">{chip.icon}</span>
                  <span>{chip.label}</span>
                </button>
              ))}
            </div>

            <div className="w-full max-w-3xl">
              {chatInputForm}
            </div>
          </div>
        ) : (
          /* Feed layout */
          /* Feed layout */
          <div className="flex flex-col w-full h-full">
            <div
              ref={chatContainerRef}
              role="log"
              aria-live="polite"
              aria-relevant="additions text"
              aria-label="Conversation with RealtyPal advisor"
              className="flex-1 min-h-0 overflow-y-auto px-4 md:px-8 pt-6 pb-4 relative z-10"
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
                      router.push(`/discover/${sid}`);
                    }}
                    onDismiss={() => setShowReEngagement(false)}
                  />
                )}
                {showContextWarning && (
                  <div className="mx-auto max-w-lg px-4 py-2 my-2 text-xs text-center text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                    Long conversation detected. Start a new chat for the best AI responses.
                  </div>
                )}
                
                {chatHistory.length > visibleCount && (
                  <div className="text-center py-2">
                    <button 
                      onClick={() => setVisibleCount(v => v + 15)}
                      className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-4 py-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors font-medium border border-gray-200 dark:border-gray-700 shadow-sm"
                    >
                      Load older messages
                    </button>
                  </div>
                )}

                {chatHistory.slice(-visibleCount).map((message, index) => {
                  const actualIndex = Math.max(0, chatHistory.length - visibleCount) + index;
                  return (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    index={actualIndex}
                    isLast={actualIndex === chatHistory.length - 1}
                    isSubmitting={isSubmitting}
                    chatPhase={chatPhase}
                    isLastProperties={actualIndex === lastPropertiesIndex}
                    isExpanded={expandedShortlists.has(message.id)}
                    carouselIndex={carouselIndexes[actualIndex] ?? 0}
                    lastShortlist={lastShortlist}
                    showMap={showMap}
                    userId={userId}
                    regeneratingIdx={regeneratingIdx}
                    chipPicker={chipPicker}
                    chips={conversationState?.chips ?? []}
                    onCopy={handleCopy}
                    onDetailOpen={openDetailProject}
                    onCallback={setCallbackProject}
                    onRegenerate={handleRegenerate}
                    onAction={handleChipAction}
                    onToggleExpanded={handleToggleExpanded}
                    onToggleMap={handleToggleMap}
                    onSetChipPicker={setChipPicker}
                    onSetCarouselIndex={handleSetCarouselIndex}
                    onSetSiteVisit={setSiteVisitProject}
                    onOpenCalculator={handleOpenCalculator}
                    onOpenShareSheet={handleOpenShareSheet}
                    onToast={handleToast}
                  />
                  );
                })}

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

            {/* Stable flex-bottom input island */}
            <AnimatePresence initial={false}>
              {!isInputMinimized && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  className={`flex-none w-full z-30 flex justify-center pb-6 md:pb-8 pt-2 ${keyboardOpen ? 'pb-safe' : ''}`}
                  style={keyboardOpen ? { paddingBottom: 'env(safe-area-inset-bottom, 8px)' } : undefined}
                >
                  <div className="px-4 w-full max-w-3xl flex flex-col justify-center">
                    {chatInputForm}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
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
      <AnimatePresence mode="wait">
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
      <AnimatePresence mode="wait">
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
                    const res = await fetch(`${API_BASE}/leads/callback`, {
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
      <AnimatePresence mode="wait">
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
