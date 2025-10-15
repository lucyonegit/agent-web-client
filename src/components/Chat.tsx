import React from 'react';
import type { Message } from '../types';
import { theme } from '../theme';

function Bubble({
  role,
  children
}: {
  role: 'user' | 'assistant' | 'system';
  children: React.ReactNode;
}) {
  const isUser = role === 'user';
  return (
    <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
      <div
        style={{
          maxWidth: '72%',
          background: isUser ? theme.color.primary : theme.color.card,
          color: isUser ? '#fff' : theme.color.text,
          padding: `${theme.space(2.5 as any)} ${theme.space(3)}`,
          borderRadius: theme.radius.lg,
          borderTopRightRadius: isUser ? 6 : theme.radius.lg,
          borderTopLeftRadius: isUser ? theme.radius.lg : 6,
          boxShadow: theme.shadow.sm,
          border: isUser ? 'none' : `1px solid ${theme.color.border}`,
          whiteSpace: 'pre-wrap',
          lineHeight: 1.6,
          fontSize: 14
        }}
      >
        {children}
      </div>
    </div>
  );
}

function DetailCard({
  title,
  children
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{
      marginTop: theme.space(2),
      border: `1px solid ${theme.color.border}`,
      borderRadius: theme.radius.md,
      padding: theme.space(2.5 as any),
      background: theme.color.card,
      boxShadow: theme.shadow.sm
    }}>
      <div style={{ fontWeight: 600, fontSize: 13, color: theme.color.text, marginBottom: theme.space(1.5 as any) }}>{title}</div>
      <div style={{ fontSize: 13, color: theme.color.subtext, whiteSpace: 'pre-wrap' }}>{children}</div>
    </div>
  );
}

export function ChatView({
  messages,
  showDetails,
  thoughts,
  actions,
  observations
}: {
  messages: Message[];
  showDetails: boolean;
  thoughts: string;
  actions: Array<{ toolName?: string; input?: any }>;
  observations: Array<{ toolName?: string; result?: any }>;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: theme.space(3) }}>
      {messages.map((m, i) => (
        <Bubble key={i} role={m.role}>
          {m.content || (m.role === 'assistant' ? '...' : '')}
          {m.role === 'assistant' && i === messages.length - 1 ? (
            <>
              {showDetails && (
                <>
                  {thoughts ? (
                    <DetailCard title="Thought（思考过程）">
                      {thoughts}
                    </DetailCard>
                  ) : null}
                  {actions.length ? (
                    <DetailCard title="Actions（动作）">
                      {actions.map((a, idx) => (
                        <div key={idx} style={{ marginBottom: theme.space(2) }}>
                          <div style={{ fontWeight: 600, color: theme.color.text }}>#{idx + 1} Tool: {a.toolName || '-'}</div>
                          <pre style={{ margin: 0, color: theme.color.subtext }}>{JSON.stringify(a.input, null, 2)}</pre>
                        </div>
                      ))}
                    </DetailCard>
                  ) : null}
                  {observations.length ? (
                    <DetailCard title="Observations（观察）">
                      {observations.map((o, idx) => (
                        <div key={idx} style={{ marginBottom: theme.space(2) }}>
                          <div style={{ fontWeight: 600, color: theme.color.text }}>#{idx + 1} Tool: {o.toolName || '-'}</div>
                          <pre style={{ margin: 0, color: theme.color.subtext }}>{JSON.stringify(o.result, null, 2)}</pre>
                        </div>
                      ))}
                    </DetailCard>
                  ) : null}
                </>
              )}
            </>
          ) : null}
        </Bubble>
      ))}
    </div>
  );
}