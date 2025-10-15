import React from 'react';
import { theme } from '../theme';

export type TaskStatus = 'idle' | 'running' | 'done' | 'error';

export interface TaskItem {
  key: string;
  title: string;
  desc?: string;
  status: 'todo' | 'doing' | 'done' | 'error';
  meta?: string;
}

function StatusTag({ status }: { status: TaskItem['status'] }) {
  const map: Record<TaskItem['status'], { bg: string; color: string; text: string; border: string }> = {
    todo: { bg: '#f8fafc', color: '#475569', text: '待执行', border: theme.color.border },
    doing: { bg: '#eff6ff', color: theme.color.primary, text: '进行中', border: '#bfdbfe' },
    done: { bg: '#f0fdf4', color: theme.color.success, text: '已完成', border: '#bbf7d0' },
    error: { bg: '#fef2f2', color: theme.color.danger, text: '出错', border: '#fecaca' }
  };
  const s = map[status];
  return (
    <span style={{ background: s.bg, color: s.color, borderRadius: theme.radius.sm, padding: '2px 8px', fontSize: 12, border: `1px solid ${s.border}` }}>
      {s.text}
    </span>
  );
}

export default function TaskPanel({
  tasks,
  overall
}: {
  tasks: TaskItem[];
  overall: TaskStatus;
}) {
  return (
    <div style={{ padding: theme.space(3) }}>
      <div style={{ marginBottom: theme.space(3) }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: theme.color.text }}>任务推进</div>
        <div style={{ fontSize: 12, color: theme.color.muted, marginTop: theme.space(0.5 as any) }}>实时展示 ReAct 过程与进度</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: theme.space(2.5 as any) }}>
        {tasks.map((t) => (
          <div
            key={t.key}
            style={{
              border: `1px solid ${theme.color.border}`,
              borderRadius: theme.radius.md,
              padding: theme.space(2.5 as any),
              background: theme.color.card,
              boxShadow: theme.shadow.sm
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: theme.space(2) }}>
              <div style={{ fontWeight: 600, color: theme.color.text }}>{t.title}</div>
              <StatusTag status={t.status} />
            </div>
            {t.desc ? <div style={{ fontSize: 12, color: theme.color.muted, marginTop: theme.space(1) }}>{t.desc}</div> : null}
            {t.meta ? <div style={{ fontSize: 12, color: theme.color.subtext, marginTop: theme.space(1.5 as any), whiteSpace: 'pre-wrap' }}>{t.meta}</div> : null}
          </div>
        ))}
      </div>
      <div style={{ marginTop: theme.space(3), fontSize: 12, color: overall === 'error' ? theme.color.danger : theme.color.muted }}>
        总体状态：{overall}
      </div>
    </div>
  );
}