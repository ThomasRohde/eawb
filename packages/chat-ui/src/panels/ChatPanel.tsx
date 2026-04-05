import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  makeStyles,
  tokens,
  Text,
  Button,
  Input,
  Spinner,
  Select,
  Popover,
  PopoverTrigger,
  PopoverSurface,
  Tooltip,
  Caption1,
} from '@fluentui/react-components';
import {
  Send24Regular,
  Add24Regular,
  DocumentEdit24Regular,
  Settings20Regular,
  Dismiss16Regular,
} from '@fluentui/react-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { PlanView } from '../components/PlanView.js';
import { UsageBar } from '../components/UsageBar.js';
import { PermissionDialog } from '../components/PermissionDialog.js';

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    minHeight: 0,
    overflow: 'hidden',
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  sessionBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 8px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground2,
    flexWrap: 'wrap',
    minHeight: '32px',
  },
  sessionBarSep: {
    width: '1px',
    height: '16px',
    backgroundColor: tokens.colorNeutralStroke2,
    marginLeft: '4px',
    marginRight: '4px',
  },
  messages: {
    flex: '1',
    overflowY: 'auto',
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  userMsg: {
    alignSelf: 'flex-end',
    maxWidth: '80%',
    padding: '8px 12px',
    borderRadius: '12px 12px 2px 12px',
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundOnBrand,
    fontSize: '14px',
    whiteSpace: 'pre-wrap',
  },
  assistantMsg: {
    alignSelf: 'flex-start',
    maxWidth: '80%',
    padding: '8px 12px',
    borderRadius: '12px 12px 12px 2px',
    backgroundColor: tokens.colorNeutralBackground3,
    fontSize: '14px',
    lineHeight: '1.5',
    '& p': { marginTop: '0', marginBottom: '0.5em' },
    '& p:last-child': { marginBottom: '0' },
    '& pre': {
      backgroundColor: tokens.colorNeutralBackground1,
      padding: '8px',
      borderRadius: '4px',
      overflowX: 'auto',
      fontSize: '13px',
    },
    '& code': {
      fontFamily: 'Consolas, Monaco, "Courier New", monospace',
      fontSize: '13px',
    },
    '& :not(pre) > code': {
      backgroundColor: tokens.colorNeutralBackground1,
      padding: '1px 4px',
      borderRadius: '3px',
    },
    '& ul, & ol': { marginTop: '0', marginBottom: '0.5em', paddingLeft: '1.5em' },
    '& blockquote': {
      borderLeft: `3px solid ${tokens.colorNeutralStroke1}`,
      margin: '0.5em 0',
      paddingLeft: '8px',
      color: tokens.colorNeutralForeground3,
    },
    '& table': { borderCollapse: 'collapse', marginBottom: '0.5em' },
    '& th, & td': {
      border: `1px solid ${tokens.colorNeutralStroke2}`,
      padding: '4px 8px',
      fontSize: '13px',
    },
    '& h1, & h2, & h3, & h4': { marginTop: '0.5em', marginBottom: '0.25em' },
  },
  inputRow: {
    display: 'flex',
    gap: '8px',
    padding: '12px',
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground1,
    position: 'relative',
  },
  input: {
    flex: '1',
  },
  assistantActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginTop: '4px',
  },
  empty: {
    flex: '1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: tokens.colorNeutralForeground3,
    flexDirection: 'column',
    gap: '12px',
  },
  // Slash command autocomplete
  slashPopover: {
    position: 'absolute',
    bottom: '100%',
    left: '12px',
    right: '60px',
    maxHeight: '200px',
    overflowY: 'auto',
    backgroundColor: tokens.colorNeutralBackground1,
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    borderRadius: '6px',
    boxShadow: tokens.shadow8,
    zIndex: 100,
    marginBottom: '4px',
  },
  slashItem: {
    display: 'flex',
    flexDirection: 'column',
    padding: '6px 10px',
    cursor: 'pointer',
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },
  slashItemActive: {
    backgroundColor: tokens.colorNeutralBackground1Hover,
  },
  slashName: {
    fontWeight: '600',
    fontSize: '13px',
  },
  slashDesc: {
    fontSize: '12px',
    color: tokens.colorNeutralForeground3,
  },
  configSurface: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '4px',
    minWidth: '220px',
  },
  configRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
  },
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ConversationSummary {
  id: string;
  title: string;
  messageCount: number;
  updatedAt: string;
  acpSessionId?: string | null;
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

interface ConversationDetail {
  id: string;
  title: string;
  messages: Message[];
  acpSessionId?: string | null;
}

interface ACPCapabilities {
  modes: boolean;
  models: boolean;
  configOptions: boolean;
  cancel: boolean;
  listSessions: boolean;
  loadSession: boolean;
}

interface ACPSessionInfo {
  sessionId: string;
  title?: string | null;
  updatedAt?: string | null;
  cwd: string;
}

interface ACPCommand {
  name: string;
  description: string;
  inputHint?: string | null;
}

interface ACPConfigOption {
  id: string;
  name: string;
  description?: string | null;
  category?: string | null;
  type: 'select' | 'boolean';
  currentValue: string | boolean;
  options?: Array<{ id: string; name: string }>;
}

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

const BASE = '/api/tools/acp-chat';
const AI_BASE = '/api/ai';

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error);
  return data.data;
}

async function aiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${AI_BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error);
  return data.data;
}

// ---------------------------------------------------------------------------
// WebSocket hook
// ---------------------------------------------------------------------------

interface WsCallbacks {
  onChunk: (text: string) => void;
  onDone: () => void;
  onPlan?: (entries: any[]) => void;
  onUsage?: (usage: { used: number; size: number; cost?: any }) => void;
  onPermission?: (req: {
    sessionId: string;
    requestId: string;
    title: string;
    description?: string | null;
    options: Array<{ id: string; label: string }>;
  }) => void;
  onConfigUpdate?: () => void;
  onCommandsUpdate?: () => void;
}

function useWebSocket(
  conversationId: string | null,
  acpSessionId: string | null,
  cbs: WsCallbacks,
) {
  const ref = useRef(cbs);
  ref.current = cbs;
  const sessionRef = useRef(acpSessionId);
  sessionRef.current = acpSessionId;

  useEffect(() => {
    if (!conversationId) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        // Chat events are scoped by conversationId — always safe
        if (data.type === 'chat:chunk' && data.conversationId === conversationId) {
          ref.current.onChunk(data.text);
        } else if (data.type === 'chat:done' && data.conversationId === conversationId) {
          ref.current.onDone();
        }
        // AI events require a known session — never latch to an unknown session
        if (!sessionRef.current || data.sessionId !== sessionRef.current) return;
        if (data.type === 'ai:plan') {
          ref.current.onPlan?.(data.entries);
        } else if (data.type === 'ai:usage') {
          ref.current.onUsage?.({ used: data.used, size: data.size, cost: data.cost });
        } else if (data.type === 'ai:permission') {
          ref.current.onPermission?.(data);
        } else if (data.type === 'ai:config') {
          ref.current.onConfigUpdate?.();
        } else if (data.type === 'ai:commands') {
          ref.current.onCommandsUpdate?.();
        }
      } catch {
        // ignore non-JSON messages
      }
    };

    return () => {
      ws.close();
    };
  }, [conversationId]);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ChatPanel() {
  const styles = useStyles();
  const qc = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [activeConvoId, setActiveConvoId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [slashIdx, setSlashIdx] = useState(-1); // index of active slash item
  const [planEntries, setPlanEntries] = useState<any[]>([]);
  const [usage, setUsage] = useState<{ used: number; size: number; cost?: any } | null>(null);
  const [permissionReq, setPermissionReq] = useState<{
    sessionId: string;
    requestId: string;
    title: string;
    description?: string | null;
    options: Array<{ id: string; label: string }>;
  } | null>(null);

  // --- Data queries ---

  const { data: convos } = useQuery({
    queryKey: ['chat', 'conversations'],
    queryFn: () => apiFetch<ConversationSummary[]>('/conversations'),
  });

  const { data: activeConvo } = useQuery({
    queryKey: ['chat', 'conversation', activeConvoId],
    queryFn: () => apiFetch<ConversationDetail>(`/conversations/${activeConvoId}`),
    enabled: !!activeConvoId,
    refetchInterval: activeConvoId && !sending ? 2000 : false,
  });

  const acpSessionId = activeConvo?.acpSessionId ?? null;

  // Eagerly create an ACP session when a conversation has none yet
  const ensureSessionMut = useMutation({
    mutationFn: (conversationId: string) =>
      aiFetch<{ sessionId: string }>('/sessions', { method: 'POST', body: '{}' }).then(
        async (res) => {
          // Link the session to the conversation by sending a dummy-free request
          await apiFetch(`/conversations/${conversationId}/acp-session`, {
            method: 'PUT',
            body: JSON.stringify({ sessionId: res.sessionId }),
          });
          return res.sessionId;
        },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chat', 'conversation', activeConvoId] });
    },
  });

  useEffect(() => {
    if (activeConvoId && activeConvo && !activeConvo.acpSessionId && !ensureSessionMut.isPending) {
      ensureSessionMut.mutate(activeConvoId);
    }
  }, [activeConvoId, activeConvo?.acpSessionId]);

  const { data: capabilities } = useQuery({
    queryKey: ['ai', 'capabilities'],
    queryFn: () => aiFetch<ACPCapabilities>('/capabilities'),
    staleTime: 30_000,
  });

  const { data: commands } = useQuery({
    queryKey: ['ai', 'session', acpSessionId, 'commands'],
    queryFn: () => aiFetch<ACPCommand[]>(`/sessions/${acpSessionId}/commands`),
    enabled: !!acpSessionId,
    staleTime: 5_000,
  });

  const { data: configOptions } = useQuery({
    queryKey: ['ai', 'session', acpSessionId, 'config'],
    queryFn: () => aiFetch<ACPConfigOption[]>(`/sessions/${acpSessionId}/config`),
    enabled: !!acpSessionId && !!capabilities?.configOptions,
    staleTime: 10_000,
  });

  // --- Past ACP sessions ---

  const { data: pastSessions } = useQuery({
    queryKey: ['ai', 'past-sessions'],
    queryFn: () =>
      aiFetch<{ sessions: ACPSessionInfo[]; nextCursor?: string | null }>('/sessions/history'),
    enabled: !!capabilities?.listSessions,
    staleTime: 30_000,
  });

  const loadSessionMut = useMutation({
    mutationFn: async (acpSessionId: string) => {
      // 1. Load the ACP session — returns replayed messages
      const { localSessionId, messages } = await aiFetch<{
        localSessionId: string;
        messages: Array<{ role: 'user' | 'assistant'; content: string }>;
      }>('/sessions/load', {
        method: 'POST',
        body: JSON.stringify({ sessionId: acpSessionId }),
      });
      // 2. Create a local conversation and link it
      const session = pastSessions?.sessions.find((s) => s.sessionId === acpSessionId);
      const convo = await apiFetch<ConversationDetail>('/conversations', {
        method: 'POST',
        body: JSON.stringify({ title: session?.title ?? 'Restored session' }),
      });
      await apiFetch(`/conversations/${convo.id}/acp-session`, {
        method: 'PUT',
        body: JSON.stringify({ sessionId: localSessionId }),
      });
      // 3. Store replayed messages into the conversation
      for (const msg of messages) {
        await apiFetch(`/conversations/${convo.id}/messages/import`, {
          method: 'POST',
          body: JSON.stringify({ role: msg.role, content: msg.content }),
        });
      }
      return convo.id;
    },
    onSuccess: (convoId) => {
      setActiveConvoId(convoId);
      qc.invalidateQueries({ queryKey: ['chat', 'conversations'] });
    },
  });

  // Auto-select the most recent conversation on startup
  const autoLoaded = useRef(false);
  useEffect(() => {
    if (autoLoaded.current || activeConvoId || loadSessionMut.isPending) return;
    // Prefer an existing local conversation
    if (convos && convos.length > 0) {
      autoLoaded.current = true;
      setActiveConvoId(convos[0].id);
      return;
    }
    // Fall back to the latest past Copilot session
    if (pastSessions && pastSessions.sessions.length > 0) {
      autoLoaded.current = true;
      loadSessionMut.mutate(pastSessions.sessions[0].sessionId);
    }
  }, [convos, pastSessions]);

  // --- Mutations ---

  const createConvo = useMutation({
    mutationFn: () =>
      apiFetch<ConversationDetail>('/conversations', { method: 'POST', body: '{}' }),
    onSuccess: (data) => {
      setActiveConvoId(data.id);
      qc.invalidateQueries({ queryKey: ['chat', 'conversations'] });
    },
  });

  const setConfigMut = useMutation({
    mutationFn: ({ optionId, value }: { optionId: string; value: unknown }) =>
      aiFetch(`/sessions/${acpSessionId}/config`, {
        method: 'PUT',
        body: JSON.stringify({ optionId, value }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ai', 'session', acpSessionId, 'config'] }),
  });

  // --- Slash command logic ---

  const slashQuery = useMemo(() => {
    if (!input.startsWith('/')) return null;
    const spaceIdx = input.indexOf(' ');
    if (spaceIdx !== -1) return null; // already past the command
    return input.slice(1).toLowerCase();
  }, [input]);

  const filteredCommands = useMemo(() => {
    if (slashQuery === null || !commands?.length) return [];
    return commands.filter(
      (c) =>
        c.name.toLowerCase().includes(slashQuery) ||
        c.description.toLowerCase().includes(slashQuery),
    );
  }, [slashQuery, commands]);

  const showSlash = slashQuery !== null && filteredCommands.length > 0;

  // Reset slash index when list changes
  useEffect(() => {
    setSlashIdx(0);
  }, [filteredCommands.length]);

  const selectSlashCommand = useCallback((cmd: ACPCommand) => {
    setInput(`/${cmd.name} `);
    setSlashIdx(-1);
  }, []);

  // --- WebSocket streaming ---

  useWebSocket(activeConvoId, acpSessionId, {
    onChunk: useCallback((text: string) => {
      setStreamingText((prev) => prev + text);
    }, []),
    onDone: useCallback(() => {
      // chat:done — the POST will complete shortly and refresh the conversation
    }, []),
    onPlan: useCallback((entries: any[]) => {
      setPlanEntries(entries);
    }, []),
    onUsage: useCallback((u: { used: number; size: number; cost?: any }) => {
      setUsage(u);
    }, []),
    onPermission: useCallback((req: any) => {
      setPermissionReq(req);
    }, []),
    onConfigUpdate: useCallback(() => {
      qc.invalidateQueries({ queryKey: ['ai', 'session', acpSessionId, 'config'] });
    }, [acpSessionId]),
    onCommandsUpdate: useCallback(() => {
      qc.invalidateQueries({ queryKey: ['ai', 'session', acpSessionId, 'commands'] });
    }, [acpSessionId]),
  });

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(scrollToBottom, [activeConvo?.messages.length, streamingText]);

  // --- Send handler ---

  const handleSend = async () => {
    if (!input.trim() || !activeConvoId) return;
    const msg = input.trim();
    setInput('');
    setSending(true);
    setStreamingText('');

    try {
      await apiFetch(`/conversations/${activeConvoId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content: msg }),
      });
      qc.invalidateQueries({ queryKey: ['chat', 'conversation', activeConvoId] });
      qc.invalidateQueries({ queryKey: ['chat', 'conversations'] });
      // Refresh session-related queries since session may have been created
      qc.invalidateQueries({ queryKey: ['ai', 'session'] });
    } catch (err) {
      console.error('Send failed:', err);
    } finally {
      setSending(false);
      setStreamingText('');
    }
  };

  const openInEditor = useCallback(async (content: string) => {
    try {
      const res = await fetch('/api/tools/markdown-editor/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `AI Response — ${new Date().toLocaleString()}`,
          content,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        window.dispatchEvent(
          new CustomEvent('eawb:open-document', { detail: { docId: json.data.id } }),
        );
      }
    } catch (err) {
      console.error('Failed to open in editor:', err);
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showSlash) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSlashIdx((i) => Math.min(i + 1, filteredCommands.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSlashIdx((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === 'Tab' || (e.key === 'Enter' && !e.shiftKey)) {
        if (slashIdx >= 0 && slashIdx < filteredCommands.length) {
          e.preventDefault();
          selectSlashCommand(filteredCommands[slashIdx]);
          return;
        }
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setInput('');
        return;
      }
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // --- Permission resolve ---

  const handlePermissionResolve = useCallback(
    async (requestId: string, optionId: string | null) => {
      const sessionId = permissionReq?.sessionId;
      setPermissionReq(null);
      try {
        await aiFetch(`/permissions/${requestId}/resolve`, {
          method: 'POST',
          body: JSON.stringify({ sessionId, optionId }),
        });
      } catch (err) {
        console.error('Failed to resolve permission:', err);
      }
    },
    [permissionReq?.sessionId],
  );

  // --- Session bar visibility ---

  const hasConfig = (configOptions?.length ?? 0) > 0;
  const hasUsage = usage !== null && usage.size > 0;
  const showSessionBar = acpSessionId && (hasConfig || hasUsage);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className={styles.root}>
      {/* Primary toolbar: conversation selector */}
      <div className={styles.toolbar}>
        <Select
          value={activeConvoId ?? ''}
          onChange={(_, d) => {
            const val = d.value;
            if (val.startsWith('acp:')) {
              loadSessionMut.mutate(val.slice(4));
            } else {
              setActiveConvoId(val || null);
            }
          }}
          disabled={loadSessionMut.isPending}
          style={{ flex: 1 }}
        >
          <option value="">Select conversation...</option>
          {(convos ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.title} ({c.messageCount})
            </option>
          ))}
          {(pastSessions?.sessions?.length ?? 0) > 0 && (
            <optgroup label="Past Copilot Sessions">
              {pastSessions!.sessions.map((s) => (
                <option key={s.sessionId} value={`acp:${s.sessionId}`}>
                  {s.title || s.sessionId.slice(0, 8)}
                  {s.updatedAt ? ` — ${new Date(s.updatedAt).toLocaleDateString()}` : ''}
                </option>
              ))}
            </optgroup>
          )}
        </Select>
        <Button
          icon={<Add24Regular />}
          size="small"
          title="New conversation"
          onClick={() => createConvo.mutate()}
        />
      </div>

      {/* Secondary toolbar: ACP session controls */}
      {showSessionBar && (
        <div className={styles.sessionBar}>
          {/* Config options popover (includes mode & model) */}
          {hasConfig && (
            <Popover>
              <PopoverTrigger disableButtonEnhancement>
                <Tooltip content="Session settings" relationship="label">
                  <Button appearance="subtle" size="small" icon={<Settings20Regular />} />
                </Tooltip>
              </PopoverTrigger>
              <PopoverSurface>
                <div className={styles.configSurface}>
                  <Text weight="semibold" size={200}>
                    Session Settings
                  </Text>
                  {configOptions!.map((opt) => (
                    <div key={opt.id} className={styles.configRow}>
                      <Tooltip content={opt.description ?? ''} relationship="description">
                        <Caption1>{opt.name}</Caption1>
                      </Tooltip>
                      {opt.type === 'select' && opt.options ? (
                        <Select
                          size="small"
                          value={String(opt.currentValue)}
                          onChange={(_, d) =>
                            setConfigMut.mutate({ optionId: opt.id, value: d.value })
                          }
                          style={{ minWidth: '120px' }}
                        >
                          {opt.options.map((o) => (
                            <option key={o.id} value={o.id}>
                              {o.name}
                            </option>
                          ))}
                        </Select>
                      ) : (
                        <Button
                          size="small"
                          appearance={opt.currentValue ? 'primary' : 'secondary'}
                          onClick={() =>
                            setConfigMut.mutate({ optionId: opt.id, value: !opt.currentValue })
                          }
                        >
                          {opt.currentValue ? 'On' : 'Off'}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </PopoverSurface>
            </Popover>
          )}

          {/* Usage bar */}
          {hasUsage && (
            <>
              <div className={styles.sessionBarSep} />
              <UsageBar used={usage!.used} size={usage!.size} cost={usage!.cost} />
            </>
          )}
        </div>
      )}

      {loadSessionMut.isPending ? (
        <div className={styles.empty}>
          <Spinner size="small" />
          <Text size={200}>Restoring session...</Text>
        </div>
      ) : !activeConvoId ? (
        <div className={styles.empty}>
          <Text size={400}>AI Chat</Text>
          <Text size={200}>Start a new conversation to chat with the AI assistant.</Text>
          <Button appearance="primary" icon={<Add24Regular />} onClick={() => createConvo.mutate()}>
            New Conversation
          </Button>
        </div>
      ) : (
        <>
          <div className={styles.messages}>
            {activeConvo &&
              activeConvo.messages.length === 0 &&
              activeConvo.acpSessionId &&
              !sending && (
                <div style={{ textAlign: 'center', padding: '24px 12px' }}>
                  <Text size={200} style={{ color: 'var(--colorNeutralForeground3)' }}>
                    Session restored from Copilot. Previous messages are on the server.
                    <br />
                    Continue the conversation below.
                  </Text>
                </div>
              )}
            {(activeConvo?.messages ?? []).map((msg) => (
              <div
                key={msg.id}
                className={msg.role === 'user' ? styles.userMsg : styles.assistantMsg}
              >
                {msg.role === 'user' ? (
                  msg.content
                ) : (
                  <>
                    <Markdown remarkPlugins={[remarkGfm]}>{msg.content}</Markdown>
                    <div className={styles.assistantActions}>
                      <Button
                        size="small"
                        appearance="subtle"
                        icon={<DocumentEdit24Regular />}
                        title="Open in editor"
                        onClick={() => openInEditor(msg.content)}
                      />
                    </div>
                  </>
                )}
              </div>
            ))}
            {/* Plan view (shown during active prompt) */}
            {sending && planEntries.length > 0 && <PlanView entries={planEntries} />}
            {sending && (
              <div className={styles.assistantMsg}>
                {streamingText ? (
                  <Markdown remarkPlugins={[remarkGfm]}>{streamingText}</Markdown>
                ) : (
                  <Spinner size="tiny" />
                )}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Permission dialog overlay */}
          {permissionReq && (
            <PermissionDialog
              requestId={permissionReq.requestId}
              title={permissionReq.title}
              description={permissionReq.description}
              options={permissionReq.options}
              onResolve={handlePermissionResolve}
            />
          )}

          <div className={styles.inputRow}>
            {/* Slash command autocomplete */}
            {showSlash && (
              <div className={styles.slashPopover}>
                {filteredCommands.map((cmd, i) => (
                  <div
                    key={cmd.name}
                    className={`${styles.slashItem} ${i === slashIdx ? styles.slashItemActive : ''}`}
                    onMouseDown={(e) => {
                      e.preventDefault(); // keep focus on input
                      selectSlashCommand(cmd);
                    }}
                    onMouseEnter={() => setSlashIdx(i)}
                  >
                    <span className={styles.slashName}>/{cmd.name}</span>
                    <span className={styles.slashDesc}>{cmd.description}</span>
                  </div>
                ))}
              </div>
            )}
            <Input
              className={styles.input}
              value={input}
              onChange={(_, d) => setInput(d.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                commands?.length ? 'Type a message or / for commands...' : 'Type a message...'
              }
              disabled={sending}
            />
            <Button
              icon={<Send24Regular />}
              appearance="primary"
              onClick={handleSend}
              disabled={!input.trim() || sending}
            />
          </div>
        </>
      )}
    </div>
  );
}
