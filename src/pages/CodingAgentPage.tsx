import React, { useState, useEffect, useRef } from 'react';
import { Box, Container, Typography, TextField, Button, Paper, CircularProgress, Card, CardContent, Chip } from '@mui/material';
import { ToolCard } from '../components/ToolCard';
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

const PlanCard: React.FC<{ steps: PlanStep[] }> = ({ steps }) => (
    <Card sx={{ mb: 2, bgcolor: '#ffffff', border: '1px solid #e5e7eb' }}>
        <CardContent>
            <Typography variant="h6" gutterBottom>📋 Implementation Plan</Typography>
            {steps.map((step, index) => {
                const statusMap = {
                    pending: { bg: '#f9fafb', color: '#6b7280', text: '待执行', icon: '⏳' },
                    doing: { bg: '#e0f2fe', color: '#0284c7', text: '进行中', icon: '🔄' },
                    done: { bg: '#dcfce7', color: '#16a34a', text: '已完成', icon: '✅' }
                } as const;
                const s = statusMap[step.status];
                return (
                    <Box key={step.id} sx={{ mb: 1.5, p: 1.5, borderRadius: 1, background: s.bg }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <span>{index + 1}.</span>
                                <span>{step.title}</span>
                            </Typography>
                            <Typography variant="caption" sx={{ color: s.color, fontWeight: 600 }}>{s.icon} {s.text}</Typography>
                        </Box>
                        {step.description && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>{step.description}</Typography>
                        )}
                    </Box>
                );
            })}
        </CardContent>
    </Card>
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
        <Card sx={{ mb: 2, bgcolor: '#ffffff', border: '1px solid #e5e7eb' }}>
            <CardContent>
                <Typography variant="h6" gutterBottom>✅ BDD Scenarios</Typography>
                {scenarios.map((s) => {
                    const files = matchFiles(s);
                    const isOpen = openIds.has(s.id);
                    const sel = selectedIdx[s.id] || 0;
                    return (
                        <Box key={s.id} sx={{ mb: 1.5, p: 1.5, borderLeft: '3px solid #2563eb', bgcolor: '#ffffff', borderRadius: 1 }}>
                            <Box
                                onClick={() => setOpenIds(prev => {
                                    const next = new Set(Array.from(prev));
                                    if (next.has(s.id)) next.delete(s.id); else next.add(s.id);
                                    return next;
                                })}
                                sx={{ cursor: 'pointer' }}
                            >
                                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{s.title}</Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>Given: {s.given.join('; ')}</Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>When: {s.when.join('; ')}</Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>Then: {s.then.join('; ')}</Typography>
                                {files.length > 0 && (
                                    <Typography variant="caption" color="primary" sx={{ display: 'block', mt: 0.75 }}>预览 {files.length} 个相关文件</Typography>
                                )}
                            </Box>
                            {isOpen && files.length > 0 && (
                                <Box sx={{ mt: 1.5, border: '1px solid #e5e7eb', borderRadius: 1 }}>
                                    <Box sx={{ display: 'flex', gap: 1, p: 1, bgcolor: '#f9fafb', borderBottom: '1px solid #e5e7eb', flexWrap: 'wrap' }}>
                                        {files.map((f, idx) => (
                                            <Chip
                                                key={`${s.id}_${idx}`}
                                                size="small"
                                                color={sel === idx ? 'primary' : 'default'}
                                                variant={sel === idx ? 'filled' : 'outlined'}
                                                label={f.path}
                                                onClick={() => setSelectedIdx(prev => ({ ...prev, [s.id]: idx }))}
                                            />
                                        ))}
                                    </Box>
                                    <Box sx={{ bgcolor: '#0b0f14', maxHeight: 280, overflow: 'auto' }}>
                                        <SyntaxHighlighter
                                            language={files[sel].path.endsWith('.tsx') ? 'tsx' : 'typescript'}
                                            style={vscDarkPlus}
                                            customStyle={{ margin: 0, fontSize: 13 }}
                                            showLineNumbers
                                            wrapLongLines
                                        >
                                            {files[sel].content}
                                        </SyntaxHighlighter>
                                    </Box>
                                </Box>
                            )}
                        </Box>
                    );
                })}
            </CardContent>
        </Card>
    );
};

const RAGCard: React.FC<{ sources: Array<{ content: string; metadata: Record<string, any> }> }> = ({ sources }) => (
    <Card sx={{ mb: 2, bgcolor: '#ffffff', border: '1px solid #e5e7eb' }}>
        <CardContent>
            <Typography variant="h6" gutterBottom>📚 Internal Components (RAG)</Typography>
            {sources.map((s, idx) => (
                <Box key={idx} sx={{ mb: 1.5, p: 1.5, border: '1px solid #e5e7eb', borderRadius: 1, bgcolor: '#ffffff' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Chip size="small" label={s.metadata?.component_name || s.metadata?.title || 'Component'} />
                        {s.metadata?.section && (
                            <Chip size="small" color="primary" variant="outlined" label={s.metadata.section} />
                        )}
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', whiteSpace: 'pre-wrap' }}>
                        {s.content.length > 300 ? `${s.content.slice(0, 300)}...` : s.content}
                    </Typography>
                </Box>
            ))}
        </CardContent>
    </Card>
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
        <Card sx={{ mb: 2, bgcolor: '#ffffff', border: '1px solid #e5e7eb' }}>
            <CardContent>
                <Typography variant="h6" gutterBottom>📘 组件文档详情</Typography>
                {entries.map(([comp, sec], idx) => (
                    <Box key={`${comp}_${idx}`} sx={{ mb: 2, p: 1.5, border: '1px solid #e5e7eb', borderRadius: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{comp}</Typography>
                        {sec.api && (
                            <Box sx={{ mt: 1 }}>
                                <Typography variant="caption" color="text.secondary">API / Props</Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap', mt: 0.5 }}>{sec.api}</Typography>
                            </Box>
                        )}
                        {sec.example && (
                            <Box sx={{ mt: 1 }}>
                                <Typography variant="caption" color="text.secondary">Usage Example</Typography>
                                <Box sx={{ bgcolor: '#0b0f14' }}>
                                    <SyntaxHighlighter language={'tsx'} style={vscDarkPlus} customStyle={{ margin: 0, fontSize: 13 }} showLineNumbers wrapLongLines>
                                        {sec.example}
                                    </SyntaxHighlighter>
                                </Box>
                            </Box>
                        )}
                    </Box>
                ))}
            </CardContent>
        </Card>
    );
};

const ProjectCard: React.FC<{ project: Project }> = ({ project }) => {
    const [selectedFile, setSelectedFile] = useState<ProjectFile | null>(project.files[0] || null);
    const [expanded, setExpanded] = useState<Set<string>>(new Set());

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
                <Box
                    key={node.path}
                    onClick={() => setSelectedFile(node.file!)}
                    sx={{
                        pl: depth * 1.5,
                        py: 0.5,
                        cursor: 'pointer',
                        bgcolor: selectedFile?.path === node.path ? '#e3f2fd' : 'transparent',
                        '&:hover': { bgcolor: '#f5f5f5' },
                        fontSize: '0.9rem'
                    }}
                >
                    📄 {node.name}
                </Box>
            );
        }
        const isRoot = node.path === '';
        const isOpen = expanded.has(node.path) || isRoot;
        return (
            <Box key={node.path} sx={{ pl: isRoot ? 0 : depth * 1.5 }}>
                {!isRoot && (
                    <Box
                        onClick={() => toggle(node.path)}
                        sx={{ py: 0.5, cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600 }}
                    >
                        {isOpen ? '📂' : '📁'} {node.name}
                    </Box>
                )}
                {isOpen && node.children && (
                    <Box>
                        {node.children.map(child => renderNode(child, depth + (isRoot ? 0 : 1)))}
                    </Box>
                )}
            </Box>
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
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>✨ Generated Project</Typography>
                <Typography variant="caption" color="text.secondary">
                    {project.files.length} files
                </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 2, flex: 1, minHeight: 0 }}>
                <Box sx={{ width: '32%', height: '100%', overflow: 'auto', borderRight: '1px solid #e5e7eb', bgcolor: '#ffffff' }}>
                    {renderNode(tree)}
                </Box>
                <Box sx={{ flex: 1, height: '100%', overflow: 'auto', bgcolor: '#0b0f14' }}>
                    {selectedFile ? (
                        <SyntaxHighlighter
                            language={detectLang(selectedFile.path)}
                            style={vscDarkPlus}
                            customStyle={{ margin: 0, height: '100%', fontSize: 14, lineHeight: 1.6 }}
                            showLineNumbers
                            wrapLongLines
                        >
                            {selectedFile.content}
                        </SyntaxHighlighter>
                    ) : (
                        <Box sx={{ p: 2, color: 'white' }}>Select a file</Box>
                    )}
                </Box>
            </Box>
        </Box>
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

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const addMessage = (msg: ChatMessage) => {
        setMessages(prev => [...prev, msg]);
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

        const eventSource = new EventSource(`http://localhost:8000/api/coding-agent/stream?prompt=${encodeURIComponent(input)}`);

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
                    addMessage({ id: e.id, type: 'bdd', data: { scenarios: e.data.scenarios || [] }, timestamp: Date.now() });
                } else if (e.type === 'rag_event') {
                    addMessage({ id: e.id, type: 'rag', data: { sources: e.data.sources || [] }, timestamp: Date.now() });
                } else if (e.type === 'rag_used_event') {
                    addMessage({ id: e.id, type: 'rag_used', data: { term: e.data.term, components: e.data.components || [] }, timestamp: Date.now() });
                } else if (e.type === 'rag_doc_event') {
                    addMessage({ id: e.id, type: 'rag_doc', data: { component: e.data.component, section: e.data.section, content: e.data.content }, timestamp: Date.now() });
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

    return (
        <Container maxWidth={false} sx={{ height: '100vh', py: 2, px: 2, bgcolor: '#f5f7fb' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    🤖 Coding Agent Workspace
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                        variant={codeMaximized ? 'contained' : 'outlined'}
                        color="primary"
                        size="small"
                        onClick={() => setCodeMaximized(v => !v)}
                    >
                        {codeMaximized ? '退出全屏' : '全屏代码'}
                    </Button>
                </Box>
            </Box>
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: codeMaximized ? '0fr 0fr 1fr' : '1fr 0.9fr 2.1fr',
                    gap: 2,
                    height: 'calc(100vh - 96px)'
                }}
            >
                {/* 左侧：对话与计划、工具调用 */}
                <Paper elevation={0} sx={{ p: 2, overflow: 'auto', bgcolor: '#ffffff', border: '1px solid #e5e7eb', display: codeMaximized ? 'none' : 'block' }}>
                    {leftMessages.length === 0 && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'text.secondary' }}>
                            <Typography>Start by describing what you want to build...</Typography>
                        </Box>
                    )}
                    {leftMessages.map((msg) => (
                        <Box key={msg.id} sx={{ mb: 2 }}>
                            {msg.type === 'user' && (
                                <Paper elevation={0} sx={{ p: 1.5, bgcolor: '#2563eb', color: 'white', borderRadius: 2 }}>
                                    <Typography>{msg.content}</Typography>
                                </Paper>
                            )}
                            {msg.type === 'text' && (
                                <Typography variant="body2" sx={{ color: 'text.secondary', fontFamily: 'monospace', bgcolor: '#f9fafb', p: 1, borderRadius: 1, border: '1px solid #e5e7eb' }}>
                                    {msg.content}
                                </Typography>
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
                        </Box>
                    ))}
                    <Box ref={messagesEndRef} />
                    {/* 输入区域 */}
                    <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                        <TextField
                            fullWidth
                            variant="outlined"
                            placeholder="Describe your requirement (e.g., 'Create a login page with email validation')..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            disabled={loading}
                            onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
                            size="small"
                        />
                        <Button variant="contained" onClick={handleSubmit} disabled={loading}>
                            {loading ? <CircularProgress size={20} color="inherit" /> : 'Send'}
                        </Button>
                    </Box>
                </Paper>

                {/* 中间：BDD 列表 + RAG 使用组件 */}
                <Paper elevation={0} sx={{ p: 2, overflow: 'auto', bgcolor: '#ffffff', border: '1px solid #e5e7eb', display: codeMaximized ? 'none' : 'block' }}>
                    {bddMsg && Array.isArray(bddMsg.data.scenarios) && bddMsg.data.scenarios.length > 0 ? (
                        <BDDCard scenarios={bddMsg.data.scenarios} project={projectMsg?.data.project} serverMatches={serverMatches} />
                    ) : (
                        <Typography variant="body2" color="text.secondary">等待 BDD 场景生成...</Typography>
                    )}
                    {/* RAG 来源也可放在中间作为辅助 */}
                    {messages.find(m => m.type === 'rag') && (
                        <RAGCard sources={messages.find(m => m.type === 'rag')!.data.sources} />
                    )}
                    {/* 组件文档分卡 */}
                    {messages.filter(m => m.type === 'rag_doc').length > 0 && (
                        <RagComponentDocsCard docs={messages.filter(m => m.type === 'rag_doc').map(m => ({ component: m.data.component, section: m.data.section, content: m.data.content }))} />
                    )}
                    {/* RAG 使用的组件 chips 列表 */}
                    {/* {messages.filter(m => m.type === 'rag_used').map((m) => (
                        <Box key={m.id} sx={{ mt: 1.5 }}>
                            <Typography variant="caption" color="text.secondary">Queried: {m.data.term}</Typography>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 0.5 }}>
                                {m.data.components.map((c: string, idx: number) => (
                                    <Chip key={`${m.id}_${idx}`} size="small" label={c} />
                                ))}
                            </Box>
                        </Box>
                    ))} */}
                </Paper>

                {/* 右侧：最终代码目录预览 */}
                <Paper elevation={0} sx={{ p: 2, overflow: 'hidden', bgcolor: '#ffffff', border: '1px solid #e5e7eb' }}>
                    {projectMsg ? (
                        <ProjectCard project={projectMsg.data.project} />
                    ) : (
                        <Typography variant="body2" color="text.secondary">等待项目结构生成...</Typography>
                    )}
                </Paper>
            </Box>
        </Container>
    );
};
