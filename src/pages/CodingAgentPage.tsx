import React, { useState, useEffect, useRef } from 'react';
import { theme } from '../theme';
import { ToolCard } from '../components/ToolCard';
import { Layout } from '../components/Layout';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

// --- Types ---

interface PlanStep {
    id: string;
    title: string;
    description?: string;
    status: 'pending' | 'doing' | 'done';
}

interface ProjectFile {
    path: string;
    content: string;
}

interface Project {
    files: ProjectFile[];
    summary?: string;
}

type MessageType = 'user' | 'text' | 'plan' | 'bdd' | 'rag' | 'rag_used' | 'rag_doc' | 'tool' | 'project';

interface ChatMessage {
    id: string;
    type: MessageType;
    content?: string;
    data?: any; // For structured data like Plan, BDD, Project
    timestamp: number;
}

// --- Components ---

const ChatBubble: React.FC<{ role: 'user' | 'assistant' | 'system'; children: React.ReactNode }> = ({ role, children }) => {
    const isUser = role === 'user';
    return (
        <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
            <div
                style={{
                    maxWidth: '72%',
                    background: isUser ? '#2563eb' : theme.color.card,
                    color: isUser ? '#fff' : theme.color.text,
                    padding: `${theme.space(2)} ${theme.space(2.5 as any)}`,
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
};

const PlanCard: React.FC<{ steps: PlanStep[] }> = ({ steps }) => (
    <div style={{ marginBottom: theme.space(2), background: theme.color.card, border: `1px solid ${theme.color.border}`, borderRadius: theme.radius.md }}>
        <div style={{ padding: theme.space(2) }}>
            <div style={{ fontWeight: 600, marginBottom: theme.space(1), fontSize: 16 }}>📋 Implementation Plan</div>
            {steps.map((step, index) => {
                const statusMap = {
                    pending: { bg: '#f9fafb', color: '#6b7280', text: '待执行', icon: '⏳' },
                    doing: { bg: '#e0f2fe', color: '#0284c7', text: '进行中', icon: '🔄' },
                    done: { bg: '#dcfce7', color: '#16a34a', text: '已完成', icon: '✅' }
                } as const;
                const s = statusMap[step.status];
                return (
                    <div key={step.id} style={{ marginBottom: theme.space(1.5 as any), padding: theme.space(1.5 as any), borderRadius: theme.radius.sm, background: s.bg }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: theme.space(1) }}>
                                <span>{index + 1}.</span>
                                <span>{step.title}</span>
                            </div>
                            <div style={{ color: s.color, fontWeight: 600, fontSize: 12 }}>{s.icon} {s.text}</div>
                        </div>
                        {step.description && (
                            <div style={{ fontSize: 12, color: theme.color.subtext, marginTop: theme.space(0.5 as any) }}>{step.description}</div>
                        )}
                    </div>
                );
            })}
        </div>
    </div>
);

const BDDCard: React.FC<{ scenarios: Array<{ id: string; title: string; given: string[]; when: string[]; then: string[] }>; project?: Project; serverMatches?: Record<string, string[]> }> = ({ scenarios, project, serverMatches }) => {
    const [openIds, setOpenIds] = useState<Set<string>>(new Set());
    const [selectedIdx, setSelectedIdx] = useState<Record<string, number>>({});

    const matchFiles = (s: { id: string; title: string; given: string[]; when: string[]; then: string[] }): ProjectFile[] => {
        if (!project) return [];
        if (serverMatches && serverMatches[s.id] && serverMatches[s.id].length > 0) {
            const paths = serverMatches[s.id];
            const files = project.files.filter(f => paths.includes(f.path));
            if (files.length > 0) return files.slice(0, 3);
        }
        const terms = [s.title, ...s.given, ...s.when, ...s.then]
            .join(' ')
            .toLowerCase()
            .split(/[^a-zA-Z0-9_\u4e00-\u9fa5]+/)
            .filter(Boolean);
        const score = (f: ProjectFile) => {
            const p = f.path.toLowerCase();
            const c = f.content.toLowerCase();
            let sc = 0;
            for (const t of terms) {
                if (!t) continue;
                if (p.includes(t)) sc += 3;
                if (c.includes(t)) sc += 1;
            }
            return sc;
        };
        const ranked = [...project.files]
            .map(f => ({ f, s: score(f) }))
            .filter(x => x.s > 0)
            .sort((a, b) => b.s - a.s)
            .slice(0, 3)
            .map(x => x.f);
        return ranked;
    };

    return (
        <div style={{ marginBottom: theme.space(2), background: theme.color.infoLight, border: 'none', boxShadow: theme.shadow.xs, borderRadius: theme.radius.md }}>
            <div style={{ padding: theme.space(2) }}>
                <div style={{ fontWeight: 600, marginBottom: theme.space(1), fontSize: 16 }}>✅ BDD Scenarios</div>
                {scenarios.map((s) => {
                    const files = matchFiles(s);
                    const isOpen = openIds.has(s.id);
                    const sel = selectedIdx[s.id] || 0;
                    return (
                        <div key={s.id} style={{ marginBottom: theme.space(1.5 as any), padding: theme.space(1.5 as any), background: theme.color.card, borderRadius: theme.radius.md, border: `1px solid ${theme.color.border}` }}>
                            <div
                                onClick={() => setOpenIds(prev => {
                                    const next = new Set(Array.from(prev));
                                    if (next.has(s.id)) next.delete(s.id); else next.add(s.id);
                                    return next;
                                })}
                                style={{ cursor: 'pointer' }}
                            >
                                <div style={{ fontWeight: 600, fontSize: 14 }}>{s.title}</div>
                                <div style={{ fontSize: 12, color: theme.color.subtext, marginTop: theme.space(0.5 as any) }}>Given: {s.given.join('; ')}</div>
                                <div style={{ fontSize: 12, color: theme.color.subtext, marginTop: theme.space(0.5 as any) }}>When: {s.when.join('; ')}</div>
                                <div style={{ fontSize: 12, color: theme.color.subtext, marginTop: theme.space(0.5 as any) }}>Then: {s.then.join('; ')}</div>
                                {files.length > 0 && (
                                    <div style={{ fontSize: 12, color: theme.color.info, marginTop: theme.space(0.75 as any) }}>预览 {files.length} 个相关文件</div>
                                )}
                            </div>
                            {isOpen && files.length > 0 && (
                                <div style={{ marginTop: theme.space(1.5 as any), border: `1px solid ${theme.color.border}`, borderRadius: theme.radius.md }}>
                                    <div style={{ display: 'flex', gap: theme.space(1), padding: theme.space(1), background: theme.color.bgSecondary, borderBottom: `1px solid ${theme.color.border}`, flexWrap: 'wrap' }}>
                                        {files.map((f, idx) => (
                                            <span
                                                key={`${s.id}_${idx}`}
                                                onClick={() => setSelectedIdx(prev => ({ ...prev, [s.id]: idx }))}
                                                style={{
                                                    fontSize: 12,
                                                    padding: `${theme.space(0.5 as any)} ${theme.space(1.5 as any)}`,
                                                    borderRadius: theme.radius.full,
                                                    border: `1px solid ${sel === idx ? theme.color.primary : theme.color.border}`,
                                                    background: sel === idx ? theme.color.primaryLight : theme.color.card,
                                                    color: sel === idx ? theme.color.primary : theme.color.text,
                                                    cursor: 'pointer'
                                                }}
                                            >{f.path}</span>
                                        ))}
                                    </div>
                                    <div style={{ background: '#0b0f14', maxHeight: 280, overflow: 'auto' }}>
                                        <SyntaxHighlighter
                                            language={files[sel].path.endsWith('.tsx') ? 'tsx' : 'typescript'}
                                            style={vscDarkPlus}
                                            customStyle={{ margin: 0, fontSize: 13 }}
                                            showLineNumbers
                                            wrapLongLines
                                        >
                                            {files[sel].content}
                                        </SyntaxHighlighter>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const FeaturesCard: React.FC<{ features: Array<{ feature_id: string; feature_title: string; description?: string; scenarios: Array<{ id: string; title: string; given: string[]; when: string[]; then: string[] }> }>; project?: Project; serverMatches?: Record<string, string[]> }> = ({ features, project, serverMatches }) => {
    const [open, setOpen] = useState<Set<string>>(new Set());
    return (
        <div style={{ marginBottom: theme.space(2), background: theme.color.card, border: 'none', boxShadow: theme.shadow.xs, borderRadius: theme.radius.md }}>
            <div style={{ padding: theme.space(2) }}>
                <div style={{ fontWeight: 600, marginBottom: theme.space(1), fontSize: 16 }}>🧩 BDD Features</div>
                {features.map((f) => {
                    const isOpen = open.has(f.feature_id);
                    return (
                        <div key={f.feature_id} style={{ marginBottom: theme.space(2), padding: theme.space(1.5 as any), background: theme.color.primaryLight, borderRadius: theme.radius.md, border: 'none', boxShadow: theme.shadow.sm }}>
                            <div onClick={() => setOpen(prev => { const next = new Set(Array.from(prev)); if (next.has(f.feature_id)) next.delete(f.feature_id); else next.add(f.feature_id); return next; })} style={{ cursor: 'pointer' }}>
                                <div style={{ fontWeight: 700, fontSize: 14 }}>{f.feature_title}</div>
                                {f.description && (
                                    <div style={{ fontSize: 12, color: theme.color.subtext, marginTop: theme.space(0.5 as any) }}>{f.description}</div>
                                )}
                                <div style={{ fontSize: 12, color: theme.color.info, marginTop: theme.space(0.75 as any) }}>{isOpen ? '收起' : '展开'} 场景（{f.scenarios.length}）</div>
                            </div>
                            {isOpen && (
                                <div style={{ marginTop: theme.space(1.5 as any) }}>
                                    <BDDCard scenarios={f.scenarios} project={project} serverMatches={serverMatches} />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const RAGCard: React.FC<{ sources: Array<{ content: string; metadata: Record<string, any> }> }> = ({ sources }) => (
    <div style={{ marginBottom: theme.space(2), background: theme.color.card, border: `1px solid ${theme.color.border}`, borderRadius: theme.radius.md }}>
        <div style={{ padding: theme.space(2) }}>
            <div style={{ fontWeight: 600, marginBottom: theme.space(1), fontSize: 16 }}>📚 Internal Components (RAG)</div>
            {sources.map((s, idx) => (
                <div key={idx} style={{ marginBottom: theme.space(1.5 as any), padding: theme.space(1.5 as any), border: `1px solid ${theme.color.border}`, borderRadius: theme.radius.sm, background: theme.color.card }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: theme.space(1), marginBottom: theme.space(1) }}>
                        <span style={{ fontSize: 12, padding: `${theme.space(0.5 as any)} ${theme.space(1.5 as any)}`, borderRadius: theme.radius.full, background: theme.color.bgSecondary, border: `1px solid ${theme.color.border}` }}>{s.metadata?.component_name || s.metadata?.title || 'Component'}</span>
                        {s.metadata?.section && (
                            <span style={{ fontSize: 12, padding: `${theme.space(0.5 as any)} ${theme.space(1.5 as any)}`, borderRadius: theme.radius.full, background: theme.color.primaryLight, border: `1px solid ${theme.color.primary}`, color: theme.color.primary }}>{s.metadata.section}</span>
                        )}
                    </div>
                    <div style={{ fontSize: 12, color: theme.color.subtext, whiteSpace: 'pre-wrap' }}>
                        {s.content.length > 300 ? `${s.content.slice(0, 300)}...` : s.content}
                    </div>
                </div>
            ))}
        </div>
    </div>
);

const RagComponentDocsCard: React.FC<{ docs: Array<{ component: string; section: string; content: string }> }> = ({ docs }) => {
    const grouped = docs.reduce<Record<string, { api?: string; example?: string }>>((acc, d) => {
        const key = d.component;
        const cur = acc[key] || {};
        if (d.section.toLowerCase().includes('api')) cur.api = d.content;
        if (d.section.toLowerCase().includes('usage') || d.section.toLowerCase().includes('示例')) cur.example = d.content;
        acc[key] = cur;
        return acc;
    }, {});
    const entries = Object.entries(grouped);
    if (entries.length === 0) return null;
    return (
        <div style={{ marginBottom: theme.space(2), background: theme.color.card, border: `1px solid ${theme.color.border}`, borderRadius: theme.radius.md }}>
            <div style={{ padding: theme.space(2) }}>
                <div style={{ fontWeight: 600, marginBottom: theme.space(1), fontSize: 16 }}>📘 组件文档详情</div>
                {entries.map(([comp, sec], idx) => (
                    <div key={`${comp}_${idx}`} style={{ marginBottom: theme.space(2), padding: theme.space(1.5 as any), border: `1px solid ${theme.color.border}`, borderRadius: theme.radius.sm }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{comp}</div>
                        {sec.api && (
                            <div style={{ marginTop: theme.space(1) }}>
                                <div style={{ fontSize: 12, color: theme.color.subtext }}>API / Props</div>
                                <div style={{ fontSize: 14, color: theme.color.subtext, whiteSpace: 'pre-wrap', marginTop: theme.space(0.5 as any) }}>{sec.api}</div>
                            </div>
                        )}
                        {sec.example && (
                            <div style={{ marginTop: theme.space(1) }}>
                                <div style={{ fontSize: 12, color: theme.color.subtext }}>Usage Example</div>
                                <div style={{ background: '#0b0f14' }}>
                                    <SyntaxHighlighter language={'tsx'} style={vscDarkPlus} customStyle={{ margin: 0, fontSize: 13 }} showLineNumbers wrapLongLines>
                                        {sec.example}
                                    </SyntaxHighlighter>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

const ProjectCard: React.FC<{ project: Project }> = ({ project }) => {
    const [selectedFile, setSelectedFile] = useState<ProjectFile | null>(project.files[0] || null);
    const [expanded, setExpanded] = useState<Set<string>>(new Set());
    const [fontSize, setFontSize] = useState(14);
    const [wrap, setWrap] = useState(true);

    type Node = { name: string; path: string; isDir: boolean; children?: Node[]; file?: ProjectFile };

    const buildTree = (files: ProjectFile[]): Node => {
        const root: Node = { name: '', path: '', isDir: true, children: [] };
        for (const f of files) {
            const parts = f.path.split('/');
            let cursor = root;
            let currentPath = '';
            for (let i = 0; i < parts.length; i++) {
                const part = parts[i];
                currentPath = currentPath ? `${currentPath}/${part}` : part;
                const isLast = i === parts.length - 1;
                if (isLast) {
                    cursor.children = cursor.children || [];
                    cursor.children.push({ name: part, path: currentPath, isDir: false, file: f });
                } else {
                    cursor.children = cursor.children || [];
                    let next = cursor.children.find(n => n.isDir && n.name === part);
                    if (!next) {
                        next = { name: part, path: currentPath, isDir: true, children: [] };
                        cursor.children.push(next);
                    }
                    cursor = next;
                }
            }
        }
        return root;
    };

    const tree = buildTree(project.files);

    const toggle = (path: string) => {
        setExpanded(prev => {
            const next = new Set(Array.from(prev));
            if (next.has(path)) next.delete(path); else next.add(path);
            return next;
        });
    };

    const renderNode = (node: Node, depth = 0) => {
        if (!node.isDir) {
            return (
                <div
                    key={node.path}
                    onClick={() => setSelectedFile(node.file!)}
                    style={{
                        paddingLeft: `${(depth) * 6}px`,
                        paddingTop: '4px',
                        paddingBottom: '4px',
                        cursor: 'pointer',
                        background: selectedFile?.path === node.path ? '#e3f2fd' : 'transparent',
                        fontSize: '0.9rem'
                    }}
                >
                    📄 {node.name}
                </div>
            );
        }
        const isRoot = node.path === '';
        const isOpen = expanded.has(node.path) || isRoot;
        return (
            <div key={node.path} style={{ paddingLeft: isRoot ? 0 : `${depth * 6}px` }}>
                {!isRoot && (
                    <div
                        onClick={() => toggle(node.path)}
                        style={{ paddingTop: '4px', paddingBottom: '4px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600 }}
                    >
                        {isOpen ? '📂' : '📁'} {node.name}
                    </div>
                )}
                {isOpen && node.children && (
                    <div>
                        {node.children.map(child => renderNode(child, depth + (isRoot ? 0 : 1)))}
                    </div>
                )}
            </div>
        );
    };

    const detectLang = (p: string) => {
        if (p.endsWith('.tsx')) return 'tsx';
        if (p.endsWith('.ts')) return 'typescript';
        if (p.endsWith('.js')) return 'javascript';
        if (p.endsWith('.json')) return 'json';
        if (p.endsWith('.md')) return 'markdown';
        if (p.endsWith('.css')) return 'css';
        return 'tsx';
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.space(1) }}>
                <div style={{ fontWeight: 600 }}>✨ Generated Project</div>
                <div style={{ fontSize: 12, color: theme.color.subtext }}>{project.files.length} files</div>
            </div>
            <div style={{ display: 'flex', gap: theme.space(2), flex: 1, minHeight: 0 }}>
                <div style={{ width: '30%', height: '100%', overflow: 'auto', borderRight: `1px solid ${theme.color.border}`, background: theme.color.card }}>
                    {renderNode(tree)}
                </div>
                <div style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', background: '#0b0f14' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: `${theme.space(1)} ${theme.space(1.5 as any)}`, background: '#0f1622', borderBottom: '1px solid #1f2a37' }}>
                        <div style={{ fontSize: 12, color: '#e6e8f0' }}>{selectedFile?.path || 'Select a file'}</div>
                        <div style={{ display: 'flex', gap: theme.space(1) }}>
                            <button style={{ padding: `${theme.space(1)} ${theme.space(2)}`, borderRadius: theme.radius.md, border: '1px solid #1f2a37', background: 'transparent', color: '#e6e8f0', cursor: 'pointer' }} onClick={() => setWrap(v => !v)}>
                                {wrap ? 'Wrap: On' : 'Wrap: Off'}
                            </button>
                            <button style={{ padding: `${theme.space(1)} ${theme.space(2)}`, borderRadius: theme.radius.md, border: '1px solid #1f2a37', background: 'transparent', color: '#e6e8f0', cursor: 'pointer' }} onClick={() => setFontSize(s => Math.max(11, s - 1))}>
                                -A
                            </button>
                            <button style={{ padding: `${theme.space(1)} ${theme.space(2)}`, borderRadius: theme.radius.md, border: '1px solid #1f2a37', background: 'transparent', color: '#e6e8f0', cursor: 'pointer' }} onClick={() => setFontSize(s => Math.min(18, s + 1))}>
                                +A
                            </button>
                            <button style={{ padding: `${theme.space(1)} ${theme.space(2)}`, borderRadius: theme.radius.md, border: 'none', background: theme.color.primary, color: '#fff', cursor: 'pointer' }} onClick={() => { if (selectedFile) navigator.clipboard.writeText(selectedFile.content); }}>
                                Copy
                            </button>
                        </div>
                    </div>
                    <div style={{ flex: 1, overflow: 'auto' }}>
                        {selectedFile ? (
                            <SyntaxHighlighter
                                language={detectLang(selectedFile.path)}
                                style={vscDarkPlus}
                                customStyle={{ margin: 0, minHeight: '100%', fontSize, lineHeight: 1.6 }}
                                showLineNumbers
                                wrapLongLines={wrap}
                            >
                                {selectedFile.content}
                            </SyntaxHighlighter>
                        ) : (
                            <div style={{ padding: theme.space(2), color: 'white' }}>Select a file</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Main Page ---

export const CodingAgentPage: React.FC = () => {
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const streamingContentRef = useRef<Map<string, string>>(new Map());
    const [codeMaximized, setCodeMaximized] = useState(false);
    const [midTab, setMidTab] = useState<'bdd' | 'arch' | 'rag' | 'docs'>('bdd');

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const addMessage = (msg: ChatMessage) => {
        setMessages(prev => [...prev, msg]);
    };

    const handleClear = () => {
        setMessages([]);
        setInput('');
        setCodeMaximized(false);
    };

    const handleSubmit = async () => {
        if (!input.trim()) return;

        const userMsg: ChatMessage = {
            id: Date.now().toString(),
            type: 'user',
            content: input,
            timestamp: Date.now()
        };
        addMessage(userMsg);
        setLoading(true);
        setInput('');

        const eventSource = new EventSource(`http://localhost:3333/api/coding-agent/stream?prompt=${encodeURIComponent(input)}`);

eventSource.addEventListener('stream_event', (evt) => {
            try {
                const payload = JSON.parse((evt as MessageEvent).data);
                const streamEvent = payload as { sessionId: string; conversationId: string; event: any; timestamp: number };
                const e = streamEvent.event;

                if (!e || !e.type) return;

                if (e.type === 'normal_event') {
                    if (e.stream) {
                        setMessages(prev => {
                            const list = [...prev];
                            const idx = list.findIndex(m => m.id === e.id && m.type === 'text');
                            if (idx >= 0) {
                                const cur = list[idx];
                                list[idx] = { ...cur, content: (cur.content || '') + (e.content || '') };
                            } else {
                                list.push({ id: e.id, type: 'text', content: e.content || '', timestamp: Date.now() });
                            }
                            return list;
                        });
                    } else {
                        setMessages(prev => ([...prev, { id: e.id || Date.now().toString(), type: 'text', content: e.content, timestamp: Date.now() }]));
                    }
                } else if (e.type === 'task_plan_event') {
                    const steps = e.data.step.map((s: any) => ({ id: s.id, title: s.title, description: s.note || '', status: s.status || 'pending' }));
                    setMessages(prev => {
                        const list = [...prev];
                        const idx = list.findIndex(m => m.type === 'plan');
                        if (idx >= 0) {
                            list[idx] = { ...list[idx], data: { steps } };
                        } else {
                            list.push({ id: e.id, type: 'plan', data: { steps }, timestamp: Date.now() });
                        }
                        return list;
                    });
                } else if (e.type === 'bdd_event') {
                    addMessage({ id: e.id, type: 'bdd', data: { features: e.data.features || [], scenarios: e.data.scenarios || [] }, timestamp: Date.now() });
                } else if (e.type === 'rag_event') {
                    addMessage({ id: e.id, type: 'rag', data: { sources: e.data.sources || [] }, timestamp: Date.now() });
                } else if (e.type === 'rag_used_event') {
                    addMessage({ id: e.id, type: 'rag_used', data: { term: e.data.term, components: e.data.components || [] }, timestamp: Date.now() });
                } else if (e.type === 'rag_doc_event') {
                    addMessage({ id: e.id, type: 'rag_doc', data: { component: e.data.component, section: e.data.section, content: e.data.content }, timestamp: Date.now() });
                } else if (e.type === 'architect_event') {
                    addMessage({ id: e.id, type: 'text', content: e.data.message, timestamp: Date.now() });
                } else if (e.type === 'architecture_event') {
                    addMessage({ id: e.id, type: 'architecture', data: { architecture: e.data.architecture }, timestamp: Date.now() });
                } else if (e.type === 'tool_call_event') {
                    const d = e.data;
                    const toolData = {
                        id: e.id,
                        toolName: d.tool_name,
                        status: d.status,
                        input: d.args,
                        result: d.result,
                        success: d.success,
                        startedAt: d.startedAt,
                        finishedAt: d.finishedAt,
                        durationMs: d.durationMs,
                        iteration: d.iteration || 1
                    };
                    setMessages(prev => {
                        const list = [...prev];
                        const idx = list.findIndex(m => m.id === e.id && m.type === 'tool');
                        if (idx >= 0) {
                            list[idx] = { ...list[idx], data: toolData };
                        } else {
                            list.push({ id: e.id, type: 'tool', data: toolData, timestamp: Date.now() });
                        }
                        return list;
                    });
                } else if (e.type === 'scenario_match_event') {
                    addMessage({ id: e.id, type: 'scenario_match', data: { matches: e.data.matches || [] }, timestamp: Date.now() });
                }
            } catch (error) {
                // ignore parse error
            }
        });

        eventSource.addEventListener('done', (event: any) => {
            const data = JSON.parse(event.data);
            if (data.ok && data.result) {
                addMessage({
                    id: 'project_done',
                    type: 'project',
                    data: { project: data.result },
                    timestamp: Date.now()
                });
            }
            setLoading(false);
            eventSource.close();
        });

        eventSource.onerror = () => {
            setLoading(false);
            eventSource.close();
        };
    };

    const leftMessagesRaw = messages.filter(m => m.type === 'user' || m.type === 'text' || m.type === 'plan' || m.type === 'tool');
    const toolLastIndex = new Map<string, number>();
    leftMessagesRaw.forEach((m, idx) => { if (m.type === 'tool') toolLastIndex.set(m.id, idx); });
    const leftMessages = leftMessagesRaw.filter((m, idx) => m.type !== 'tool' || toolLastIndex.get(m.id) === idx);
    const bddMsg = messages.find(m => m.type === 'bdd');
    const scenarioMatchMsg = messages.find(m => m.type === 'scenario_match');
    const serverMatches: Record<string, string[]> | undefined = scenarioMatchMsg ? (scenarioMatchMsg.data.matches || []).reduce((acc: Record<string, string[]>, cur: any) => { acc[cur.scenarioId] = cur.paths || []; return acc; }, {}) : undefined;
    const projectMsg = messages.find(m => m.type === 'project');
    const architectureMsg = messages.find(m => m.type === 'architecture');

    return (
        <Layout
            title="🤖 Coding Agent Workspace"
            right={(
                <>
                    <button
                        onClick={handleClear}
                        style={{ padding: `${theme.space(1)} ${theme.space(2)}`, border: `1px solid ${theme.color.border}`, background: theme.color.card, borderRadius: theme.radius.md, cursor: 'pointer' }}
                    >
                        清空
                    </button>
                    <button
                        onClick={() => setCodeMaximized(v => !v)}
                        style={{ padding: `${theme.space(1)} ${theme.space(2)}`, border: `1px solid ${theme.color.primary}`, background: codeMaximized ? theme.color.primary : theme.color.card, color: codeMaximized ? '#fff' : theme.color.primary, borderRadius: theme.radius.md, cursor: 'pointer' }}
                    >
                        {codeMaximized ? '退出全屏' : '全屏代码'}
                    </button>
                </>
            )}
        >
            <div style={{ display: 'flex', gap: theme.space(2), height: '100%' }}>
                {/* 左侧：对话与计划、工具调用 */}
                <div style={{ padding: theme.space(2), background: theme.color.card, border: `1px solid ${theme.color.border}`, display: codeMaximized ? 'none' : 'block', borderRadius: theme.radius.md, display: 'flex', flexDirection: 'column', flex: '0 0 25%', minHeight: 0 }}>
                    <div style={{ flex: 1, overflow: 'auto' }}>
                        {leftMessages.length === 0 && (
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: theme.color.subtext }}>
                                <div>Start by describing what you want to build...</div>
                            </div>
                        )}
                        {leftMessages.map((msg) => (
                            <div key={msg.id} style={{ marginBottom: theme.space(2) }}>
                                {msg.type === 'user' && (
                                    <ChatBubble role="user">
                                        {msg.content}
                                    </ChatBubble>
                                )}
                                {msg.type === 'text' && (
                                    <ChatBubble role="assistant">
                                        {msg.content}
                                    </ChatBubble>
                                )}
                                {msg.type === 'plan' && <PlanCard steps={msg.data.steps} />}
                                {msg.type === 'tool' && (
                                    <ToolCard
                                        data={{
                                            id: msg.data.id,
                                            toolName: msg.data.toolName,
                                            status: msg.data.status,
                                            input: msg.data.input,
                                            result: msg.data.result,
                                            success: msg.data.success,
                                            startedAt: msg.data.startedAt,
                                            finishedAt: msg.data.finishedAt,
                                            durationMs: msg.data.durationMs,
                                            iteration: msg.data.iteration
                                        }}
                                    />
                                )}
                            </div>
                        ))}
                        <div ref={messagesEndRef as any} />
                    </div>
                    {/* 输入区域 */}
                    <div style={{ marginTop: theme.space(2), display: 'flex', gap: theme.space(1), padding: theme.space(1), background: theme.color.bgSecondary, border: `1px solid ${theme.color.border}`, borderRadius: theme.radius.md, flexShrink: 0 }}>
                        <input
                            placeholder="Describe your requirement (e.g., 'Create a login page with email validation')..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            disabled={loading}
                            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                            style={{ flex: 1, padding: theme.space(2), border: `1px solid ${theme.color.border}`, borderRadius: theme.radius.md }}
                        />
                        <button onClick={handleSubmit} disabled={loading} style={{ padding: `${theme.space(2)} ${theme.space(3)}`, borderRadius: theme.radius.md, border: 'none', background: theme.color.primary, color: '#fff', cursor: 'pointer', opacity: loading ? 0.7 : 1 }}>
                            {loading ? '...' : 'Send'}
                        </button>
                    </div>
                </div>

                {/* 中间：BDD 列表 + RAG 使用组件 */}
                <div style={{ padding: theme.space(2), background: theme.color.card, border: `1px solid ${theme.color.border}`, display: codeMaximized ? 'none' : 'block', borderRadius: theme.radius.md, display: 'flex', flexDirection: 'column', flex: '0 0 22.5%', minHeight: 0, height: '100%' }}>
                    <div style={{ padding:'6px 0', marginBottom: theme.space(1) }}>
                        <div style={{ display: 'inline-flex', borderRadius: theme.radius.full, background: theme.color.bgSecondary, overflow: 'hidden' }}>
                            {['bdd','arch','rag','docs'].map((key, idx, arr) => (
                                <button
                                    key={key}
                                    onClick={() => setMidTab(key as any)}
                                    style={{
                                        padding: '6px 12px',
                                        fontSize: 12,
                                        border: 'none',
                                        background: midTab === (key as any) ? theme.color.primary : 'transparent',
                                        color: midTab === (key as any) ? '#fff' : theme.color.text,
                                        cursor: 'pointer',
                                        outline: 'none',
                                        borderLeft: idx === 0 ? 'none' : `1px solid ${theme.color.border}`
                                    }}
                                >
                                    {key === 'bdd' ? 'BDD' : key === 'arch' ? '架构' : key === 'rag' ? 'RAG' : '文档'}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div style={{ flex: 1, overflow: 'auto' }}>
                    {midTab === 'bdd' ? (
                        bddMsg && Array.isArray(bddMsg.data.features) && bddMsg.data.features.length > 0 ? (
                            <FeaturesCard features={bddMsg.data.features} project={projectMsg?.data.project} serverMatches={serverMatches} />
                        ) : bddMsg && Array.isArray(bddMsg.data.scenarios) && bddMsg.data.scenarios.length > 0 ? (
                            <BDDCard scenarios={bddMsg.data.scenarios} project={projectMsg?.data.project} serverMatches={serverMatches} />
                        ) : (
                            <div style={{ fontSize: 14, color: theme.color.subtext }}>等待 BDD 场景生成...</div>
                        )
                    ) : midTab === 'arch' ? (
                        architectureMsg ? (
                            <ArchitectureCard architecture={architectureMsg.data.architecture} />
                        ) : (
                            <div style={{ fontSize: 14, color: theme.color.subtext }}>暂无架构数据</div>
                        )
                    ) : midTab === 'rag' ? (
                        messages.find(m => m.type === 'rag') ? (
                            <RAGCard sources={messages.find(m => m.type === 'rag')!.data.sources} />
                        ) : (
                            <div style={{ fontSize: 14, color: theme.color.subtext }}>暂无 RAG 来源</div>
                        )
                    ) : (
                        messages.filter(m => m.type === 'rag_doc').length > 0 ? (
                            <RagComponentDocsCard docs={messages.filter(m => m.type === 'rag_doc').map(m => ({ component: m.data.component, section: m.data.section, content: m.data.content }))} />
                        ) : (
                            <div style={{ fontSize: 14, color: theme.color.subtext }}>暂无组件文档</div>
                        )
                    )}
                    </div>
                </div>

                {/* 右侧：最终代码目录预览 */}
                <div style={{ padding: theme.space(2), background: theme.color.card, border: `1px solid ${theme.color.border}`, borderRadius: theme.radius.md, flex: codeMaximized ? '1 1 auto' : '0 0 52.5%', height: '100%', overflow: 'auto' }}>
                    {projectMsg ? (
                        <ProjectCard project={projectMsg.data.project} />
                    ) : (
                        <div style={{ color: theme.color.subtext, fontSize: 14 }}>等待项目结构生成...</div>
                    )}
                </div>
            </div>
        </Layout>
    );
};
const ArchitectureCard: React.FC<{ architecture: string }> = ({ architecture }) => {
    let pretty = architecture;
    try { pretty = JSON.stringify(JSON.parse(architecture), null, 2); } catch {}
    return (
        <div style={{ marginBottom: theme.space(2), background: theme.color.card, border: `1px solid ${theme.color.border}`, borderRadius: theme.radius.md }}>
            <div style={{ padding: theme.space(2) }}>
                <div style={{ fontWeight: 600, marginBottom: theme.space(1), fontSize: 16 }}>🏗️ 基础项目架构</div>
                <div style={{ background: '#0b0f14' }}>
                    <SyntaxHighlighter language={'json'} style={vscDarkPlus} customStyle={{ margin: 0, fontSize: 13 }} showLineNumbers wrapLongLines>
                        {pretty}
                    </SyntaxHighlighter>
                </div>
            </div>
        </div>
    );
};
