/**
 * Agent 调试日志工具
 * 通过环境变量 AGENT_LOG_LEVEL 控制日志级别 (DEBUG/INFO/WARN/ERROR)
 */

const LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
} as const;

type LogLevel = keyof typeof LOG_LEVELS;

// 默认级别为 INFO
const currentLevel = (process.env.AGENT_LOG_LEVEL as LogLevel) || "INFO";
const levelValue = LOG_LEVELS[currentLevel as keyof typeof LOG_LEVELS] ?? LOG_LEVELS.INFO;

function shouldLog(level: number): boolean {
    return level <= levelValue;
}

export function debug(...args: any[]): void {
    if (shouldLog(LOG_LEVELS.DEBUG)) {
        console.log("[AGENT-DEBUG]", ...args);
    }
}

export function info(...args: any[]): void {
    if (shouldLog(LOG_LEVELS.INFO)) {
        console.log("[AGENT]", ...args);
    }
}

export function warn(...args: any[]): void {
    if (shouldLog(LOG_LEVELS.WARN)) {
        console.warn("[AGENT-WARN]", ...args);
    }
}

export function error(...args: any[]): void {
    if (shouldLog(LOG_LEVELS.ERROR)) {
        console.error("[AGENT-ERROR]", ...args);
    }
}
