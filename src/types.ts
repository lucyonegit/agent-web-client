// ============= 新的对话结构类型定义 =============

// 事件类型
export type EventType = 'normal_event' | 'task_plan_event' | 'tool_call_event';

// 任务状态
export type TaskStatus = 'pending' | 'doing' | 'done';

// 任务步骤
export interface TaskStep {
  id: string;
  title: string;
  status: TaskStatus;
  note?: string;
}

// Normal Event 数据
export interface NormalEventData {
  id: string;
  role: 'user' | 'assistant';
  type: 'normal_event';
  content: string;
  stream?: boolean;
  done?: boolean;
}

// Task Plan Event 数据
export interface TaskPlanEventData {
  id: string;
  role: 'assistant';
  type: 'task_plan_event';
  data: {
    step: TaskStep[];
  };
}

// Tool Call Event 数据
export interface ToolCallEventData {
  id: string;
  role: 'assistant';
  type: 'tool_call_event';
  data: {
    id?: string;
    status?: 'start' | 'end';
    tool_name: string;
    args: any;
    result?: {
      success: boolean;
      result?: any;
      error?: string;
    };
    success?: boolean;
    startedAt?: number;
    finishedAt?: number;
    durationMs?: number;
    iteration?: number;
  };
}

// Waiting Input Event 数据 - 等待用户输入
export interface WaitingInputEventData {
  id: string;
  role: 'assistant';
  type: 'waiting_input_event';
  data: {
    message: string;  // 提示用户输入的消息
    reason?: string;  // 为什么需要用户输入
  };
}

// 事件联合类型
export type ConversationEvent = NormalEventData | TaskPlanEventData | ToolCallEventData | WaitingInputEventData;

// Conversation 结构
export interface Conversation {
  conversationId: string;
  events: ConversationEvent[];
}

// Session 结构
export interface Session {
  sessionId: string;
  conversations: Conversation[];
}

// 流式事件接口
export interface StreamEvent {
  sessionId: string;
  conversationId: string;
  event: ConversationEvent;
  timestamp: number;
}

// ============= 兼容旧的类型定义 =============

// 工具卡片数据类型
export interface ToolCardData {
  id: string;
  toolName: string;
  status: 'start' | 'end';
  input: any;
  result?: {
    success: boolean;
    result?: any;
    error?: string;
  };
  success?: boolean;
  startedAt: number;
  finishedAt?: number;
  durationMs?: number;
  iteration: number;
}

// Message 类型
export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}