# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI Chat Application built with Nuxt 3, featuring real-time streaming conversations and an experimental Agent system with tool calling capabilities.

## Development Commands

```bash
# Install dependencies
pnpm install

# Run development server
pnpm run dev

# Build for production
pnpm run build

# Preview production build
pnpm run preview
```

## Architecture

### Frontend Structure
- `pages/index.vue` - Main page component (chat UI)
- `components/ChatMarkdown.vue` - Markdown renderer with syntax highlighting and KaTeX math support

### Backend API Structure (`server/api/`)
- `chat/index.ts` - SSE endpoint for chat requests
- `platforms.get.ts` - Platform configuration retrieval

### LLM Platform System (`server/utils/llm/`) **REQUIRES RECONSTRUCTION**

The agent system depends on a missing LLM platform abstraction layer:

```
server/utils/llm/
├── base-platform.ts       # Abstract BasePlatform interface
├── platforms/
│   └── aliyun.ts          # Aliyun implementation
├── message-builder.ts     # Message formatting utilities
└── index.ts               # Platform exports
```

**Critical**: This entire directory was deleted but is still referenced by the Agent system. It needs to be recreated.

### Agent System (`server/utils/agent/`)

An autonomous agent framework with a think-act loop architecture:

```
server/utils/agent/
├── core/
│   ├── agent.ts           # Agent class - orchestrates LLM client, tools, context
│   └── orchestrator.ts    # Manages iteration loop (think → act → respond)
├── nodes/
│   ├── think.ts           # Decision node - decides when to respond or call tools
│   ├── act.ts             # Action node - executes tool calls
│   ├── input.ts           # Input handling node
│   └── tool.ts            # ToolRegistry for managing available tools
└── utils/
    └── createTool.ts      # Tool creation helper
```

**Key Design Patterns:**
- **Orchestrator Pattern**: Coordinates the think-act cycle
- **Node-Based Architecture**: Each node handles a specific responsibility
- **Tool Registry**: Dynamic tool registration and discovery
- **Context Management**: Message history management with configurable limits

## Key Technical Details

1. **SSE Streaming**: Handled via `server/utils/sse.ts` with proper response headers
2. **Markdown Rendering**: Uses markdown-it with custom plugins for highlight.js and katex
3. **TypeScript Strict Mode**: Enabled in `nuxt.config.ts`
4. **Tailwind CSS**: Used for styling via `@nuxtjs/tailwindcss` module

## Known Issues

1. The `server/utils/llm/` directory is missing but required by the Agent system
2. Current backend endpoints return empty/handlers are stubbed out
3. `pages/index.vue` contains placeholder content rather than functional chat UI

## Files to Reference

When working on:
- **LLM integration**: Need to recreate `server/utils/llm/` with BasePlatform interface
- **Agent functionality**: `server/utils/agent/core/agent.ts` and `orchestrator.ts`
- **UI components**: `pages/index.vue`, `components/ChatMarkdown.vue`
- **Streaming responses**: `server/utils/sse.ts`
