import React, { useCallback, useRef, useState } from 'react';
import type { StreamEvent, Conversation, ConversationEvent, NormalEventData, ToolCallEventData, WaitingInputEventData } from './types';
import { theme } from './theme';
import { ToolCard } from './components/ToolCard';

const SSE_URL = (prompt: string, sessionId?: string | null, conversationId?: string | null, pauseMode?: boolean) => {
  let url = `http://localhost:8000/api/agent/stream?prompt=${encodeURIComponent(prompt)}&language=chinese`;
  if (sessionId) url += `&sessionId=${sessionId}`;
  if (conversationId) url += `&conversationId=${conversationId}`;
  if (pauseMode) url += `&pauseAfterEachStep=true`;
  return url;
};

function Toolbar({
  onSend,
  loading,
  pauseMode,
  onPauseModeChange
}: {
  onSend: (text: string) => void;
  loading: boolean;
  pauseMode: boolean;
  onPauseModeChange: (enabled: boolean) => void;
}) {
  const [text, setText] = useState('比较 iPhone 15 和 Samsung Galaxy S24 的电池容量，并指出哪个更大。写一个 md 报告');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: theme.space(2.5 as any) }}>
      {/* 人机协作模式开关 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: theme.space(2) }}>
        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: theme.space(1.5 as any),
          cursor: 'pointer',
          fontSize: 13,
          color: theme.color.subtext,
          fontWeight: 500
        }}>
          <input
            type="checkbox"
            checked={pauseMode}
            onChange={(e) => onPauseModeChange(e.target.checked)}
            disabled={loading}
            style={{
              cursor: loading ? 'not-allowed' : 'pointer',
              width: 16,
              height: 16,
              accentColor: theme.color.primary
            }}
          />
          <span>🤝 人机协作模式</span>
        </label>
        {pauseMode && (
          <span style={{
            fontSize: 11,
            color: theme.color.primary,
            background: theme.color.primaryLight,
            padding: `${theme.space(0.75 as any)} ${theme.space(2)}`,
            borderRadius: theme.radius.full,
            fontWeight: 600
          }}>
            已启用
          </span>
        )}
      </div>

      {/* 输入框和发送按钮 */}
      <div style={{ display: 'flex', gap: theme.space(2) }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="请输入问题..."
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !loading && text.trim()) onSend(text);
          }}
          style={{
            flex: 1,
            padding: `${theme.space(3)} ${theme.space(4)}`,
            border: `1px solid ${theme.color.border}`,
            borderRadius: theme.radius.lg,
            fontSize: 14,
            outline: 'none',
            boxShadow: 'none',
            background: '#fff',
            color: theme.color.text,
            fontFamily: theme.font.base,
            transition: `border-color ${theme.transition.fast}`
          }}
          onFocus={(e) => e.currentTarget.style.borderColor = theme.color.primary}
          onBlur={(e) => e.currentTarget.style.borderColor = theme.color.border}
        />
        <button
          onClick={() => onSend(text)}
          disabled={loading || !text.trim()}
          style={{
            padding: `${theme.space(3)} ${theme.space(5)}`,
            borderRadius: theme.radius.lg,
            border: 'none',
            background: loading ? theme.color.muted : theme.color.primary,
            color: 'white',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: 600,
            fontSize: 14,
            boxShadow: loading ? 'none' : theme.shadow.sm,
            transition: `all ${theme.transition.fast}`
          }}
          onMouseEnter={(e) => {
            if (!loading && text.trim()) {
              e.currentTarget.style.background = theme.color.primaryDark;
              e.currentTarget.style.boxShadow = theme.shadow.md;
            }
          }}
          onMouseLeave={(e) => {
            if (!loading && text.trim()) {
              e.currentTarget.style.background = theme.color.primary;
              e.currentTarget.style.boxShadow = theme.shadow.sm;
            }
          }}
        >
          {loading ? '🧠 思考中...' : '🚀 发送'}
        </button>
      </div>
    </div>
  );
}

import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { CodingAgentPage } from './pages/CodingAgentPage';

// ... (Existing imports and helper functions: SSE_URL, Toolbar)

function GeneralAgentPage() {
  const esRef = useRef<EventSource | null>(null);
  const [loading, setLoading] = useState(false);

  // 会话与对话管理
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const currentConversationIdRef = useRef<string | null>(null);

  // 用于合并流式文本的临时存储
  const streamingContentRef = useRef<Map<string, string>>(new Map());

  // 人机协作模式
  const [pauseMode, setPauseMode] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [pausedConversationId, setPausedConversationId] = useState<string | null>(null);

  const handleSend = useCallback((text: string) => {
    if (!text.trim()) return;

    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }

    setLoading(true);
    streamingContentRef.current.clear();

    // 如果是恢复暂停的对话，使用原有的 conversationId
    const resumingConversationId = isPaused ? pausedConversationId : null;
    if (!resumingConversationId) {
      currentConversationIdRef.current = null;
    }

    const es = new EventSource(SSE_URL(text, sessionId, resumingConversationId, pauseMode));
    esRef.current = es;

    es.addEventListener('stream_event', (evt) => {
      try {
        const payload = JSON.parse((evt as MessageEvent).data);
        console.log('收到原始事件:', JSON.stringify(payload, null, 2)); // 详细的调试日志

        // 兼容多种可能的事件格式
        let streamEvent: StreamEvent;

        // 格式1: 直接是 StreamEvent 格式 { sessionId, conversationId, event, timestamp }
        if (payload.sessionId && payload.conversationId && payload.event) {
          streamEvent = payload as StreamEvent;
          console.log('✅ 格式1: 标准 StreamEvent');
        }
        // 格式2: 包装在 data 中 { type: 'xxx', data: { sessionId, conversationId, event } }
        else if (payload.type && payload.data?.event) {
          streamEvent = {
            sessionId: payload.data.sessionId || 'default',
            conversationId: payload.data.conversationId || 'default',
            event: payload.data.event,
            timestamp: Date.now()
          };
          console.log('✅ 格式2: 包装格式');
        }
        // 格式3: 旧格式，跳过处理
        else {
          console.warn('⚠️ 未知的事件格式，完整payload:', payload);
          return;
        }

        const { sessionId: sid, conversationId, event } = streamEvent;

        // 验证 event 对象
        if (!event || !event.type || !event.id) {
          console.warn('⚠️ 事件格式不完整:', { event, hasType: !!event?.type, hasId: !!event?.id });
          return;
        }

        console.log('✅ 处理事件:', { type: event.type, id: event.id, conversationId });

        // 设置 sessionId（首次）
        if (sid && !sessionId) {
          setSessionId(sid);
        }

        // 设置当前 conversationId（首次）
        if (!currentConversationIdRef.current) {
          currentConversationIdRef.current = conversationId;

          // 创建新的 conversation，添加用户问题
          const userEvent: NormalEventData = {
            id: `user_${Date.now()}`,
            role: 'user',
            type: 'normal_event',
            content: text
          };

          setConversations(prev => [
            ...prev,
            {
              conversationId,
              events: [userEvent]
            }
          ]);
        }

        // 处理事件
        setConversations(prev => {
          const list = [...prev];
          const convIndex = list.findIndex(c => c.conversationId === conversationId);

          if (convIndex === -1) return prev;

          // 深拷贝 conversation 以确保 React 检测到变化
          const conv = { ...list[convIndex], events: [...list[convIndex].events] };

          // 处理流式 normal_event：合并相同 id 的内容
          if (event.type === 'normal_event' && event.stream) {
            const existingEventIndex = conv.events.findIndex(e => e.id === event.id);

            if (existingEventIndex >= 0) {
              // 更新现有事件的内容（创建新对象）
              const existingEvent = conv.events[existingEventIndex] as NormalEventData;
              conv.events[existingEventIndex] = {
                ...existingEvent,
                content: existingEvent.content + event.content,
                done: event.done
              };
            } else {
              // 添加新的流式事件
              conv.events.push(event);
            }
          }
          // 处理 tool_call_event：更新同一个卡片
          else if (event.type === 'tool_call_event') {
            const existingEventIndex = conv.events.findIndex(e => e.id === event.id);

            if (existingEventIndex >= 0) {
              // 更新现有的工具调用事件（从 start 更新到 end）
              const existingEvent = conv.events[existingEventIndex] as ToolCallEventData;
              conv.events[existingEventIndex] = {
                ...existingEvent,
                data: {
                  ...existingEvent.data,
                  ...event.data,  // 合并 data，end 事件会覆盖 start 事件的字段
                }
              };
            } else {
              // 添加新的工具调用事件（start）
              conv.events.push(event);
            }
          }
          else {
            // 非流式事件或其他事件类型：直接添加
            // 避免重复添加相同 id 的事件
            const exists = conv.events.some(e => e.id === event.id);
            if (!exists) {
              conv.events.push(event);
            }
          }

          // 更新 conversation
          list[convIndex] = conv;
          return list;
        });
      } catch (error) {
        console.error('Failed to parse stream event:', error);
      }
    });

    es.addEventListener('done', (evt) => {
      const data = JSON.parse((evt as MessageEvent).data);

      // 检查是否处于暂停状态
      if (data.isPaused) {
        setIsPaused(true);
        setPausedConversationId(data.conversationId);
        console.log('⏸️ 对话已暂停，等待用户输入:', data.conversationId);
      } else {
        setIsPaused(false);
        setPausedConversationId(null);
      }

      setLoading(false);
      es.close();
      esRef.current = null;
    });

    es.onerror = () => {
      setLoading(false);
      es.close();
      esRef.current = null;
    };
  }, [sessionId, pauseMode, isPaused, pausedConversationId]);

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: theme.font.base,
      background: theme.color.bg
    }}>
      <main style={{ flex: 1, overflow: 'hidden' }}>
        <div style={{ height: '100%', overflow: 'auto' }}>
          <div style={{ maxWidth: 960, margin: '0 auto', padding: `${theme.space(6)} ${theme.space(4)}` }}>
            {conversations.length === 0 && (
              <div style={{
                textAlign: 'center',
                color: theme.color.muted,
                padding: theme.space(12),
                fontSize: 14
              }}>
                <div style={{ fontSize: 48, marginBottom: theme.space(3) }}>💬</div>
                <div>开始您的第一次对话</div>
              </div>
            )}

            {/* 按 Conversation 渲染 */}
            {conversations.map((conversation) => (
              <div key={conversation.conversationId} style={{
                marginBottom: theme.space(6),
                padding: theme.space(4),
                border: `1px solid ${theme.color.borderLight}`,
                borderRadius: theme.radius.xl,
                background: theme.color.card,
                boxShadow: theme.shadow.sm
              }}>
                {/* Conversation 标题 */}
                <div style={{
                  fontSize: 10,
                  color: theme.color.muted,
                  marginBottom: theme.space(3),
                  fontFamily: theme.font.mono,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  📝 Conversation: {conversation.conversationId.slice(-8)}
                </div>

                {/* 渲染所有事件 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: theme.space(3) }}>
                  {conversation.events.map((event, eventIndex) => {
                    // 安全检查
                    if (!event || !event.type) {
                      return null;
                    }

                    // Normal Event - 文本消息
                    if (event.type === 'normal_event') {
                      const isUser = event.role === 'user';
                      return (
                        <div key={event.id} style={{
                          display: 'flex',
                          justifyContent: isUser ? 'flex-end' : 'flex-start'
                        }}>
                          <div style={{
                            maxWidth: '80%',
                            padding: `${theme.space(3)} ${theme.space(3.5 as any)}`,
                            borderRadius: theme.radius.lg,
                            background: isUser
                              ? `linear-gradient(135deg, ${theme.color.primary} 0%, ${theme.color.primaryDark} 100%)`
                              : theme.color.bgSecondary,
                            color: isUser ? '#ffffff' : theme.color.text,
                            border: isUser ? 'none' : `1px solid ${theme.color.borderLight}`,
                            whiteSpace: 'pre-wrap',
                            lineHeight: 1.7,
                            fontSize: 14,
                            boxShadow: isUser ? theme.shadow.sm : 'none'
                          }}>
                            {event.content}
                            {event.stream && !event.done && (
                              <span style={{
                                opacity: 0.6,
                                marginLeft: 4,
                                animation: 'blink 1s infinite'
                              }}>▊</span>
                            )}
                          </div>
                        </div>
                      );
                    }

                    // Task Plan Event - 任务规划卡片
                    if (event.type === 'task_plan_event') {
                      const steps = event.data?.step || [];
                      return (
                        <div key={event.id} style={{
                          border: `1px solid ${theme.color.borderLight}`,
                          borderRadius: theme.radius.lg,
                          background: theme.color.card,
                          overflow: 'hidden',
                          boxShadow: theme.shadow.xs
                        }}>
                          <div style={{
                            padding: `${theme.space(2.5 as any)} ${theme.space(3)}`,
                            borderBottom: `1px solid ${theme.color.borderLight}`,
                            fontWeight: 600,
                            color: theme.color.text,
                            background: theme.color.primaryLight,
                            fontSize: 13,
                            display: 'flex',
                            alignItems: 'center',
                            gap: theme.space(1.5 as any)
                          }}>
                            <span>📋</span>
                            <span>任务规划</span>
                          </div>
                          <div style={{ padding: theme.space(2.5 as any) }}>
                            {steps.map((step) => {
                              const statusMap = {
                                pending: { bg: theme.color.bgSecondary, color: theme.color.muted, text: '待执行', icon: '⏳' },
                                doing: { bg: theme.color.infoLight, color: theme.color.info, text: '进行中', icon: '🔄' },
                                done: { bg: theme.color.successLight, color: theme.color.success, text: '已完成', icon: '✅' }
                              };
                              const s = statusMap[step.status] || statusMap.pending;

                              return (
                                <div key={step.id} style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  padding: `${theme.space(2.5 as any)} ${theme.space(3)}`,
                                  marginBottom: theme.space(1.5 as any),
                                  borderRadius: theme.radius.md,
                                  background: s.bg,
                                  border: `1px solid ${theme.color.borderLight}`,
                                  transition: `all ${theme.transition.base}`
                                }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: theme.space(2) }}>
                                    <span style={{ fontSize: 14 }}>{s.icon}</span>
                                    <span style={{ color: theme.color.text, fontSize: 13 }}>{step.title}</span>
                                  </div>
                                  <span style={{
                                    fontSize: 11,
                                    color: s.color,
                                    fontWeight: 600,
                                    padding: `${theme.space(0.5 as any)} ${theme.space(1.5 as any)}`,
                                    borderRadius: theme.radius.full,
                                    background: 'rgba(255, 255, 255, 0.5)'
                                  }}>
                                    {s.text}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    }

                    // Tool Call Event - 工具调用卡片
                    if (event.type === 'tool_call_event') {
                      const d = event.data;
                      if (!d || !d.tool_name) return null;

                      return (
                        <ToolCard
                          key={event.id}
                          data={{
                            id: event.id,
                            toolName: d.tool_name,
                            status: d.status || 'start',
                            input: d.args,
                            result: d.result,
                            success: d.success,
                            startedAt: d.startedAt || Date.now(),
                            finishedAt: d.finishedAt,
                            durationMs: d.durationMs,
                            iteration: d.iteration || 1
                          }}
                        />
                      );
                    }

                    // Waiting Input Event - 等待用户输入卡片
                    if (event.type === 'waiting_input_event') {
                      return (
                        <div key={event.id} style={{
                          border: `2px solid ${theme.color.primary}`,
                          borderRadius: theme.radius.lg,
                          padding: theme.space(4),
                          background: theme.color.primaryLight,
                          boxShadow: theme.shadow.md
                        }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: theme.space(2.5 as any),
                            marginBottom: theme.space(2)
                          }}>
                            <span style={{ fontSize: 24 }}>⏸️</span>
                            <div style={{ fontSize: 15, fontWeight: 600, color: theme.color.primary }}>
                              等待您的输入
                            </div>
                          </div>
                          <div style={{
                            fontSize: 14,
                            color: theme.color.text,
                            marginBottom: theme.space(1.5 as any),
                            lineHeight: 1.6
                          }}>
                            {event.data.message}
                          </div>
                          {event.data.reason && (
                            <div style={{
                              fontSize: 12,
                              color: theme.color.subtext,
                              padding: theme.space(2),
                              background: 'rgba(255, 255, 255, 0.7)',
                              borderRadius: theme.radius.md,
                              marginTop: theme.space(2),
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: theme.space(1.5 as any)
                            }}>
                              <span>💡</span>
                              <span>{event.data.reason}</span>
                            </div>
                          )}
                        </div>
                      );
                    }

                    return null;
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer style={{
        padding: `${theme.space(4)} ${theme.space(6)}`,
        borderTop: `1px solid ${theme.color.borderLight}`,
        background: theme.color.card,
        boxShadow: `0 -2px 8px rgba(26, 31, 54, 0.04)`
      }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <Toolbar
            onSend={handleSend}
            loading={loading}
            pauseMode={pauseMode}
            onPauseModeChange={setPauseMode}
          />
        </div>
      </footer>
    </div>
  );
}

function NavBar() {
  const location = useLocation();

  return (
    <header style={{
      padding: `${theme.space(4)} ${theme.space(6)}`,
      borderBottom: `1px solid ${theme.color.borderLight}`,
      display: 'flex',
      alignItems: 'center',
      gap: theme.space(3),
      background: theme.color.card,
      position: 'sticky',
      top: 0,
      zIndex: 10,
      boxShadow: theme.shadow.xs
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: theme.space(2), flex: 1 }}>
        <div style={{
          width: 32,
          height: 32,
          borderRadius: theme.radius.md,
          background: `linear-gradient(135deg, ${theme.color.primary} 0%, ${theme.color.primaryDark} 100%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 16
        }}>
          🤖
        </div>
        <h1 style={{
          fontSize: 16,
          fontWeight: 600,
          margin: 0,
          color: theme.color.text,
          letterSpacing: '-0.01em'
        }}>
          AI Agent Workspace
        </h1>

        <nav style={{ marginLeft: theme.space(4), display: 'flex', gap: theme.space(2) }}>
          <Link
            to="/"
            style={{
              textDecoration: 'none',
              color: location.pathname === '/' ? theme.color.primary : theme.color.text,
              fontWeight: location.pathname === '/' ? 600 : 400
            }}
          >
            General Agent
          </Link>
          <Link
            to="/coding"
            style={{
              textDecoration: 'none',
              color: location.pathname === '/coding' ? theme.color.primary : theme.color.text,
              fontWeight: location.pathname === '/coding' ? 600 : 400
            }}
          >
            Coding Agent
          </Link>
        </nav>
      </div>
    </header>
  );
}

export default function App() {
  return (
    <Router>
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
        <NavBar />
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <Routes>
            <Route path="/" element={<GeneralAgentPage />} />
            <Route path="/coding" element={<CodingAgentPage />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}