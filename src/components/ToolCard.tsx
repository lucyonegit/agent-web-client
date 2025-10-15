import React, { useState } from 'react';
import type { ToolCardData } from '../types';
import { theme } from '../theme';

export function ToolCard({ data }: { data: ToolCardData }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const loading = data.status === 'start' || data.finishedAt == null;
  
  // 状态配置
  const statusConfig = loading 
    ? { color: theme.color.info, bg: theme.color.infoLight, text: '运行中', icon: '⏳' }
    : data.success 
    ? { color: theme.color.success, bg: theme.color.successLight, text: '成功', icon: '✅' }
    : { color: theme.color.danger, bg: theme.color.dangerLight, text: '失败', icon: '❌' };

  return (
    <div style={{
      border: `1px solid ${theme.color.borderLight}`,
      borderRadius: theme.radius.lg,
      overflow: 'hidden',
      background: theme.color.card,
      boxShadow: theme.shadow.sm,
      transition: `all ${theme.transition.base}`
    }}>
      {/* 可点击的头部区域 */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        style={{ 
          cursor: 'pointer',
          userSelect: 'none',
          padding: `${theme.space(3)} ${theme.space(3.5 as any)}`,
          background: theme.color.bgSecondary,
          borderBottom: isExpanded ? `1px solid ${theme.color.borderLight}` : 'none',
          transition: `background ${theme.transition.fast}`
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = theme.color.bg}
        onMouseLeave={(e) => e.currentTarget.style.background = theme.color.bgSecondary}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: theme.space(2.5 as any) }}>
            {/* 折叠箭头图标 */}
            <span style={{ 
              fontSize: 10, 
              color: theme.color.muted,
              transition: `transform ${theme.transition.base}`,
              transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
              display: 'inline-block'
            }}>
              ▶
            </span>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: theme.space(1.5 as any) 
            }}>
              <span style={{ fontSize: 16 }}>🔧</span>
              <span style={{ 
                fontWeight: 600, 
                color: theme.color.text,
                fontSize: 14
              }}>
                {data.toolName}
              </span>
            </div>
          </div>
          
          {/* 状态徽章 */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: theme.space(1),
            padding: `${theme.space(1)} ${theme.space(2)}`,
            borderRadius: theme.radius.full,
            background: statusConfig.bg,
            color: statusConfig.color,
            fontSize: 12,
            fontWeight: 600
          }}>
            <span>{statusConfig.icon}</span>
            <span>{statusConfig.text}</span>
          </div>
        </div>
        
        {/* 元数据 */}
        <div style={{ 
          fontSize: 11, 
          color: theme.color.muted,
          marginTop: theme.space(1.5 as any),
          paddingLeft: theme.space(4),
          fontFamily: theme.font.mono
        }}>
          <span>迭代 #{data.iteration}</span>
          <span style={{ margin: `0 ${theme.space(1)}` }}>·</span>
          <span>{data.durationMs ? `${data.durationMs}ms` : '—'}</span>
          <span style={{ margin: `0 ${theme.space(1)}` }}>·</span>
          <span>{new Date(data.startedAt).toLocaleTimeString()}</span>
        </div>
      </div>
      
      {/* 可折叠的详细内容 */}
      {isExpanded && (
        <div style={{ 
          padding: `${theme.space(3)} ${theme.space(3.5 as any)}`,
          background: theme.color.card
        }}>
          <div style={{ marginBottom: theme.space(3) }}>
            <div style={{ 
              fontWeight: 600, 
              marginBottom: theme.space(2),
              color: theme.color.subtext,
              fontSize: 12,
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              📥 输入参数
            </div>
            <code style={{ 
              display: 'block',
              background: theme.color.bgSecondary,
              padding: theme.space(2.5 as any),
              borderRadius: theme.radius.md,
              overflow: 'auto',
              maxHeight: '200px',
              fontSize: 12,
              fontFamily: theme.font.mono,
              color: theme.color.text,
              lineHeight: 1.6,
              border: `1px solid ${theme.color.borderLight}`
            }}>
              {JSON.stringify(data.input, null, 2)}
            </code>
          </div>
          
          {!loading && (
            <div>
              <div style={{ 
                fontWeight: 600, 
                marginBottom: theme.space(2),
                color: theme.color.subtext,
                fontSize: 12,
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                📤 执行结果
              </div>
              <code style={{ 
                display: 'block',
                background: theme.color.bgSecondary,
                padding: theme.space(2.5 as any),
                borderRadius: theme.radius.md,
                overflow: 'auto',
                maxHeight: '200px',
                fontSize: 12,
                fontFamily: theme.font.mono,
                color: theme.color.text,
                lineHeight: 1.6,
                border: `1px solid ${theme.color.borderLight}`
              }}>
                {JSON.stringify(data.result, null, 2)}
              </code>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ToolCard;