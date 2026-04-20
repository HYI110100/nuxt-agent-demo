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
├── api/chat/[id].ts          # Chat endpoint - initializes Agent and handles requests
├── db/chat.ts                # In-memory DB: chatsDB, messagesDB, toolCallsDB (dual-table structure)
├── db/services.ts            # Database service layer for chat operations
├── llm/
│   ├── llmClient.ts          # LLM client wrapper (OpenAI API compatible)
│   └── agent/
│       ├── index.ts          # Agent module export
│       ├── core/
│       │   ├── agent.ts      # Main Agent class - orchestrates think-act loop
│       │   ├── orchestrator.ts # Executes plans (parallel/serial execution)
│       │   └── types.ts      # Type definitions (ChatMessage, LLMClient, etc.)
│       ├── nodes/
│       │   ├── planning.ts   # PlanningNode - generates execution plans
│       │   ├── acting.ts     # ActingNode - executes tools
│       │   ├── think.ts      # ThinkNode - decides next action
│       │   └── toolManager.ts # Tool registration and execution manager
│       ├── utils/
│       │   ├── logger.ts     # Logging utility with AGENT_LOG_LEVEL control
│       │   └── jsonUtils.ts  # JSON parsing with Markdown code block handling
│       └── tools/
│           ├── gaodeWeather.ts      # Weather query tool
│           ├── gaodeDistrict.ts     # District info query tool
│           └── webSearch.ts         # Web search via Serper API
├── types/                     # TypeScript type definitions
├── utils/index.ts            # messageToOpenaiMessage() conversion utility
```

### Frontend Structure

```
pages/
└── index.vue                 # Main page placeholder
components/
└── ChatMarkdown.vue          # Markdown renderer with KaTeX support
composables/
└── useLocalStorage.ts        # Local storage composables
utils/
└── markdown-it-katex.ts      # Math rendering plugin
```

### Data Flow

1. **Request**: Frontend calls `/api/chat/:id` with user input
2. **Session Setup**: Creates/loads chat session, initializes messages and tool call tables
3. **Agent Initialization**: 
   - `PlanningNode` analyzes input and creates execution plan
   - If direct response needed → returns immediately
   - If multi-step → creates parallel/serial tool execution plan
4. **Orchestration**: `Orchestrator.run()` executes plan steps
5. **Think-Act Loop**: For each tool step:
   - `ThinkNode`: Decides whether to call tool or respond
   - `ActingNode`: Executes tool via `ToolManager`
   - Results fed back into history for next iteration
6. **Storage**: Messages and tool calls stored in dual-table DB structure

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
- Simple index.vue page (chat UI needs implementation)
