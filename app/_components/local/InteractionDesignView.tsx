'use client';

import React, { DragEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Bot, History, Loader2, PanelTop, Paperclip, Plus, Send, X } from 'lucide-react';

import { OpenFMVAgentInfo, OpenFMVAiConfig, OpenFMVChatMessage } from '@/app/_types';
import { detectOpenFMVAiAgents, getDefaultOpenFMVAiConfig, getOpenFMVAiConfig, openfmvAgentDefinitions, sendOpenFMVChatMessage } from '@/app/_utils/aiSettings';
import AgentIcon from './AgentIcon';

interface ChatThread {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: OpenFMVChatMessage[];
}

interface ReferenceFile {
  id: string;
  name: string;
  type: string;
  size: number;
}

interface InteractionDesignViewProps {
  variant?: 'page' | 'panel';
  floating?: boolean;
  onToggleFloating?: () => void;
  onClose?: () => void;
}

const createId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const createThread = (title: string): ChatThread => {
  const now = new Date().toISOString();
  return {
    id: createId(),
    title,
    createdAt: now,
    updatedAt: now,
    messages: [],
  };
};

const createTitle = (content: string, fallbackTitle: string) => {
  const normalized = content.replace(/\s+/g, ' ').trim();
  if (!normalized) return fallbackTitle;
  return normalized.length > 18 ? `${normalized.slice(0, 18)}...` : normalized;
};

const formatTime = (value: string, locale: string, justNow: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return justNow;
  return new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(date);
};

const formatFileSize = (size: number) => {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
};

export default function InteractionDesignView({ variant = 'page', floating = false, onToggleFloating, onClose }: InteractionDesignViewProps) {
  const t = useTranslations('chat');
  const settingsT = useTranslations('settings');
  const locale = useLocale();
  const isPanel = variant === 'panel';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [threads, setThreads] = useState<ChatThread[]>(() => [createThread(t('creativeAssistant'))]);
  const [activeThreadId, setActiveThreadId] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [input, setInput] = useState('');
  const [references, setReferences] = useState<ReferenceFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [config, setConfig] = useState<OpenFMVAiConfig>(() => getDefaultOpenFMVAiConfig());
  const [agents, setAgents] = useState<OpenFMVAgentInfo[]>([]);

  const activeThread = threads.find((thread) => thread.id === activeThreadId) || threads[0];
  const selectedAgent = agents.find((agent) => agent.id === config.selectedCliAgentId) || openfmvAgentDefinitions.find((agent) => agent.id === config.selectedCliAgentId);
  const selectedModel = config.cliSelections.find((selection) => selection.agentId === config.selectedCliAgentId)?.model || selectedAgent?.models[0] || '';
  const sortedThreads = useMemo(() => [...threads].sort((first, second) => new Date(second.updatedAt).getTime() - new Date(first.updatedAt).getTime()), [threads]);
  const suggestions = useMemo(() => ['suggestionClarify', 'suggestionBranch', 'suggestionCapabilities'].map((key) => t(key)), [t]);

  useEffect(() => {
    setActiveThreadId((current) => current || threads[0]?.id || '');
  }, [threads]);

  useEffect(() => {
    let mounted = true;
    const loadAiState = async () => {
      const [loadedConfig, detectedAgents] = await Promise.all([getOpenFMVAiConfig(), detectOpenFMVAiAgents()]);
      if (!mounted) return;
      setConfig(loadedConfig);
      setAgents(detectedAgents);
    };
    const handleSettingsChanged = () => {
      void loadAiState();
    };
    void loadAiState();
    window.addEventListener('openfmv-ai-settings-changed', handleSettingsChanged);
    return () => {
      mounted = false;
      window.removeEventListener('openfmv-ai-settings-changed', handleSettingsChanged);
    };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [activeThread?.messages.length, isSending]);

  const updateActiveThread = (updater: (thread: ChatThread) => ChatThread) => {
    setThreads((current) => current.map((thread) => thread.id === activeThread.id ? updater(thread) : thread));
  };

  const startThread = () => {
    const thread = createThread(t('newChat'));
    setThreads((current) => [thread, ...current]);
    setActiveThreadId(thread.id);
    setShowHistory(false);
    setInput('');
    setReferences([]);
  };

  const selectThread = (threadId: string) => {
    setActiveThreadId(threadId);
    setShowHistory(false);
  };

  const addFiles = (files: FileList | File[]) => {
    const nextFiles = Array.from(files).map((file) => ({
      id: createId(),
      name: file.name,
      type: file.type || t('file'),
      size: file.size,
    }));
    setReferences((current) => [...current, ...nextFiles]);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (event.dataTransfer.files.length > 0) addFiles(event.dataTransfer.files);
  };

  const sendMessage = async () => {
    const content = input.trim();
    if (!content || isSending) return;

    const contextText = references.length ? `\n\n${t('attachmentContext', { names: references.map((file) => file.name).join(', ') })}` : '';
    const userMessage: OpenFMVChatMessage = { role: 'user', content: `${content}${contextText}` };
    const nextMessages = [...activeThread.messages, userMessage];
    const now = new Date().toISOString();

    updateActiveThread((thread) => ({
      ...thread,
      title: thread.messages.length ? thread.title : createTitle(content, t('newChat')),
      updatedAt: now,
      messages: nextMessages,
    }));
    setInput('');
    setReferences([]);
    setIsSending(true);

    try {
      const response = await sendOpenFMVChatMessage({ messages: nextMessages });
      const assistantMessage: OpenFMVChatMessage = {
        role: 'assistant',
        content: response.ok ? response.content : response.error || t('emptyAiResponse'),
      };
      updateActiveThread((thread) => ({
        ...thread,
        updatedAt: new Date().toISOString(),
        messages: [...thread.messages, assistantMessage],
      }));
      setConfig(await getOpenFMVAiConfig());
    } catch (error) {
      console.error('聊天失败:', error);
      updateActiveThread((thread) => ({
        ...thread,
        updatedAt: new Date().toISOString(),
        messages: [...thread.messages, { role: 'assistant', content: t('chatFailed') }],
      }));
    } finally {
      setIsSending(false);
    }
  };

  const historyList = (
    <aside className={isPanel ? 'absolute right-12 top-12 z-30 max-h-[420px] w-[280px] overflow-hidden rounded-[14px] border border-white/10 bg-[#181818] shadow-[0_18px_70px_rgba(0,0,0,0.45)]' : 'flex w-[300px] shrink-0 flex-col border-r border-white/8 bg-[#202020]'}>
      <div className="flex h-12 items-center justify-between border-b border-white/8 px-4">
        <div className="text-sm font-semibold text-white">{t('history')}</div>
        <button type="button" onClick={startThread} className="grid h-8 w-8 place-items-center rounded-[10px] text-openfmv-sub transition hover:bg-white/[0.08] hover:text-white" title={t('newChat')}>
          <Plus size={18} />
        </button>
      </div>
      <div className={isPanel ? 'max-h-[368px] overflow-y-auto p-2' : 'min-h-0 flex-1 overflow-y-auto p-3'}>
        {sortedThreads.map((thread) => {
          const isActive = thread.id === activeThread.id;
          const lastMessage = thread.messages.at(-1)?.content || t('noMessages');
          return (
            <button key={thread.id} type="button" onClick={() => selectThread(thread.id)} className={`mb-2 block w-full rounded-[12px] border p-3 text-left transition ${isActive ? 'border-orange-300/35 bg-orange-400/[0.10]' : 'border-white/8 bg-white/[0.035] hover:bg-white/[0.06]'}`}>
              <div className="flex items-center justify-between gap-3">
                <span className="truncate text-sm font-semibold text-white">{thread.title}</span>
                <span className="shrink-0 text-xs text-openfmv-muted">{formatTime(thread.updatedAt, locale, t('justNow'))}</span>
              </div>
              <div className="mt-1 line-clamp-2 text-xs leading-5 text-openfmv-muted">{lastMessage}</div>
            </button>
          );
        })}
      </div>
      {!isPanel && (
        <div className="border-t border-white/8 p-3">
          <div className="flex items-center gap-3 rounded-[12px] border border-white/10 bg-white/[0.045] p-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-white/[0.08]">
              {selectedAgent?.id ? <AgentIcon id={selectedAgent.id} size={22} /> : <Bot size={19} />}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-white">{selectedAgent?.name || t('localAi')}</span>
              <span className="mt-0.5 block truncate text-xs text-openfmv-muted">{selectedModel || t('noModelSelected')}</span>
            </span>
          </div>
        </div>
      )}
    </aside>
  );

  return (
    <div className={isPanel ? 'relative flex h-full w-full overflow-hidden bg-[#111] text-white' : 'mx-auto flex h-[calc(100dvh-9rem)] max-w-[1500px] overflow-hidden rounded-[14px] border border-white/8 bg-[#1b1b1b] text-white shadow-[0_28px_100px_rgba(0,0,0,0.2)]'}>
      <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(event) => event.target.files && addFiles(event.target.files)} />

      {!isPanel && historyList}
      {isPanel && showHistory ? historyList : null}

      <section className={`flex min-w-0 flex-1 flex-col ${isPanel ? 'bg-[#111]' : 'bg-[#181818]'}`}>
        <header data-chat-drag-handle={isPanel ? true : undefined} className={`flex h-14 shrink-0 items-center justify-between ${isPanel ? 'cursor-move px-4' : 'border-b border-white/8 px-6'}`}>
          {isPanel ? (
            <div className="flex flex-1 justify-end gap-1">
              <button type="button" onClick={() => setShowHistory((current) => !current)} className={`grid h-8 w-8 place-items-center rounded-[9px] transition hover:bg-white/[0.08] hover:text-white ${showHistory ? 'bg-white/[0.08] text-white' : 'text-white/65'}`} title={t('history')}>
                <History size={18} />
              </button>
              <button type="button" onClick={onToggleFloating} className={`grid h-8 w-8 place-items-center rounded-[9px] transition hover:bg-white/[0.08] hover:text-white ${floating ? 'bg-white/[0.08] text-white' : 'text-white/65'}`} title={floating ? t('dockWindow') : t('floatWindow')}>
                <PanelTop size={18} />
              </button>
              <button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-[9px] text-white/65 transition hover:bg-white/[0.08] hover:text-white" title={settingsT('close')}>
                <X size={18} />
              </button>
            </div>
          ) : (
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-white">{activeThread.title}</div>
              <div className="mt-0.5 truncate text-xs text-openfmv-muted">{t('chattingWith', { agent: selectedAgent?.name || t('localAi'), model: selectedModel || t('defaultModel') })}</div>
            </div>
          )}
        </header>

        <div ref={scrollRef} onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={handleDrop} className={`min-h-0 flex-1 overflow-y-auto ${isPanel ? 'px-6 py-4' : 'px-6 py-6'} ${isDragging ? 'outline outline-2 outline-orange-300/70' : ''}`}>
          {activeThread.messages.length ? (
            <div className={isPanel ? 'flex w-full flex-col gap-4' : 'mx-auto flex max-w-4xl flex-col gap-5'}>
              {activeThread.messages.map((message, index) => {
                const isUser = message.role === 'user';
                return (
                  <div key={`${message.role}-${index}`} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                    <div className={`${isPanel ? 'max-w-[86%]' : 'max-w-[78%]'} rounded-[16px] px-4 py-3 text-sm leading-7 shadow-[0_12px_40px_rgba(0,0,0,0.18)] ${isUser ? 'bg-openfmv-accent text-white' : 'border border-white/10 bg-white/[0.06] text-white/88'}`}>
                      <div className="whitespace-pre-wrap break-words">{message.content}</div>
                    </div>
                  </div>
                );
              })}
              {isSending ? (
                <div className="flex justify-start">
                  <div className="inline-flex items-center gap-2 rounded-[16px] border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-openfmv-sub">
                    <Loader2 size={15} className="animate-spin" />
                    {t('aiReplying')}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className={isPanel ? 'flex h-full items-end pb-40' : 'grid h-full place-items-center'}>
              <div className={isPanel ? 'w-full text-left' : 'text-center'}>
                {!isPanel && (
                  <div className="mx-auto grid h-14 w-14 place-items-center rounded-[16px] border border-white/10 bg-white/[0.06] text-openfmv-sub">
                    <Bot size={24} />
                  </div>
                )}
                {isPanel ? (
                  <>
                    <div className="text-[28px] font-bold leading-tight text-[#b8d3ff]">{t('hello')}</div>
                    <div className="mt-1 text-[24px] font-bold leading-tight text-white/82">{t('prompt')}</div>
                    <div className="mt-8 flex flex-col items-start gap-3">
                      {suggestions.map((item) => (
                        <button key={item} type="button" onClick={() => setInput(item)} className="rounded-full bg-white/[0.045] px-4 py-2 text-left text-sm font-semibold text-white/42 transition hover:bg-white/[0.08] hover:text-white/75">
                          {item}
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="mt-4 text-lg font-semibold text-white">{t('startChat')}</div>
                    <div className="mt-2 text-sm text-openfmv-muted">{t('startChatDescription')}</div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        <div className={`shrink-0 ${isPanel ? 'bg-[#111] p-3' : 'border-t border-white/8 bg-[#1d1d1d] p-4'}`}>
          <div className={isPanel ? 'w-full' : 'mx-auto max-w-4xl'}>
            {references.length ? (
              <div className="mb-3 flex flex-wrap gap-2">
                {references.map((file) => (
                  <span key={file.id} className="inline-flex max-w-[260px] items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs text-openfmv-sub">
                    <span className="truncate">{file.name}</span>
                    <span className="shrink-0 text-openfmv-muted">{formatFileSize(file.size)}</span>
                    <button type="button" onClick={() => setReferences((current) => current.filter((item) => item.id !== file.id))} className="text-openfmv-muted transition hover:text-white" title={t('removeAttachment')}>
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            ) : null}

            <div className="flex items-end gap-3 rounded-[16px] border border-white/10 bg-white/[0.055] p-3">
              <button type="button" onClick={() => fileInputRef.current?.click()} className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] text-openfmv-sub transition hover:bg-white/[0.08] hover:text-white" title={t('addAttachment')}>
                <Paperclip size={18} />
              </button>
              <textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') void sendMessage(); }} className="max-h-40 min-h-10 flex-1 resize-none bg-transparent py-2 text-sm leading-6 text-white outline-none placeholder:text-openfmv-muted" placeholder={t('inputPlaceholder')} />
              <button type="button" onClick={() => void sendMessage()} disabled={!input.trim() || isSending} className={`${isPanel ? 'grid h-10 w-10 place-items-center px-0' : 'inline-flex h-10 items-center gap-2 px-4'} shrink-0 rounded-[12px] bg-openfmv-accent text-sm font-semibold text-white transition hover:bg-openfmv-accent-hover disabled:cursor-not-allowed disabled:opacity-45`}>
                {isSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                {!isPanel && t('send')}
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
