# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Nuxt.js 3 + TypeScript chat application with LLM agent capabilities. Built on Nitro server framework with an agent-based architecture for tool-driven conversations.

## Tech Stack

- **Framework**: Nuxt.js 3 + Nitro
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **State Management**: Pinia
- **LLM Client**: OpenAI SDK compatible (supports Aliyun Bailian/Qwen models via dashscope)
- **Tools**: Gaode Map API (weather, district), Serper API (web search)

## Commands

```bash
pnpm dev       # Start development server
pnpm build     # Build for production
pnpm preview   # Preview production build
```

## Architecture

### Core Components

```
server/
├── api/chat/[id].ts          # Chat endpoint - 支持 GET(获取消息) / POST(发送消息)
├── api/chat/create.ts        # 创建新对话
├── api/chat/messages.ts      # 获取历史消息
├── db/chat.ts                # In-memory DB: chatsDB, messagesDB, toolCallsDB
├── db/services.ts            # Database service layer
├── llm/
│   ├── llmClient.ts          # LLM client wrapper (OpenAI API compatible)
│   └── agent/
│       ├── index.ts          # Agent module export
│       ├── core/
│       │   ├── agent.ts      # Main Agent class - orchestrates think-act loop
│       │   ├── orchestrator.ts # Executes plans (parallel/serial)
│       │   └── types.ts      # Type definitions
│       ├── nodes/
│       │   ├── planning.ts   # PlanningNode - generates execution plans
│       │   ├── acting.ts     # ActingNode - executes tools
│       │   ├── think.ts      # ThinkNode - decides next action
│       │   └── toolManager.ts # Tool registration and execution manager
│       └── tools/
│           ├── gaodeWeather.ts      # Weather query tool
│           ├── gaodeDistrict.ts     # District info query tool
│           └── webSearch.ts         # Web search via Serper API
├── types/                     # TypeScript type definitions
└── utils/index.ts            # messageToOpenaiMessage() conversion utility
```

### Frontend Structure

```
pages/
├── index.vue                 # 新建对话页 - 纯输入框
└── chat/[id].vue             # 聊天主页面 - 侧边栏 + 消息区 + 输入框 + 右侧详情面板
components/
├── ChatInput.vue             # 统一输入组件
├── AssistantMessageCard.vue  # 助理消息卡片（推理/计划/工具调用/回答）
└── PlanItem.vue              # 执行计划详情组件
utils/
└── state.ts                  # 跨页面共享状态管理
```

## Frontend Flow

1. **Create Chat** (`/` → `/chat/{id}`)
   - User inputs message → POST `/api/chat/create` → Get `chatId`
   - Store in `sharedState.initialMessage` → Router push to chat page

2. **Load Chat Page** (`/chat/{id}` onMounted)
   - Get `chatId` from route params
   - GET `/api/chat/messages?chatId={id}` → Load history
   - If `sharedState.initialMessage` exists → Append user msg + Auto-send
   - Clear shared state

3. **Send Message**
   - Push user message locally → POST `/api/chat/{id}` → Append assistant response

4. **Switch Chat**
   - Click sidebar item → Router push → New page loads fresh history

## API Endpoints

| Method | Path | Body | Description |
|--------|------|------|-------------|
| GET | `/api/chat` | - | Get chat list |
| POST | `/api/chat/create` | `{ input?: string }` | Create new chat |
| POST | `/api/chat/{id}` | `{ input: string }` | Send message to chat |
| POST | `/api/chat/messages` | `{ chatId: string }` | Get message history |

### Key Design Patterns

**Agent Configuration Pattern:**
```typescript
const agent = new Agent({
    systemPrompt: '...',
    tools: [gaodeWeatherTool, gaodeDistrictTool],
    llmClient,
    getHistoryMessages: async () => messages, // External history getter
    onLoopEvent: (e) => { /* Real-time event handler */ }
})
```

**Dual-Table Message Storage:**
- `messagesDB`: Stores user/assistant content (including reasoning_content)
- `toolCallsDB`: Stores tool invocation results
- Unified via `messageToOpenaiMessage()` which interleaves by timestamp

**Tool Schema System:**
```typescript
{ name, description, schema[], execute }
// schema: [{ name, type, description, required?, optional? }]
```

## Agent Execution Flow (Internal)

1. User message arrives → `addUserMessage()` stored in messagesDB
2. `PlanningNode` analyzes input via LLM
3. Route to **Plan** or **ReAct**:
   - **Plan mode**: Create execution plan → Orchestrator executes steps
   - **ReAct mode**: Direct think-act loop
4. For each tool call:
   - `ThinkNode`: Decide which tool to use
   - `ActingNode`: Execute via `ToolManager`
   - Result fed back into history
5. Final result → `setAssistantResult()` → Response sent

## Environment Variables

Required in `.env`:
- `OPENAI_API_KEY` - API key for LLM provider
- `OPENAI_BASE_URL` - API endpoint (supports Aliyun dashscope)
- `MODEL_NAME` - Model identifier (e.g., `qwen3.5-plus`)
- `GAODE_API_KEY` - Amap Map API key for weather/district tools
- `SERPER_API_KEY` - Serper API key for web search tool (optional)

Development:
- `AGENT_LOG_LEVEL` - Log level control (DEBUG/INFO/WARN/ERROR/OFF), default: INFO

## Development Notes

- Agent uses JSON output format with `response_format: { type: "json_object" }`
- Tools return `{ success: true/false, ...data, error?: string }` pattern
- Max 3 iterations per think-act cycle before throwing error
- Plans support `mode: "parallel" | "serial"` for tool execution
- System prompt template is constructed dynamically based on available tools
- LLM outputs may be wrapped in Markdown code blocks (```json)，需使用 `parseJSON()` 工具解析
- Available log levels: DEBUG, INFO, WARN, ERROR, OFF (controlled by `AGENT_LOG_LEVEL`)

## Current Limitations

- In-memory storage only (no persistent database)
- Stream mode partially implemented (TODO in chat API)
