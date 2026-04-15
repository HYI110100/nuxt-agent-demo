export const chatsDB: Map<string, { id: string, title: string }> = new Map()
export const messagesDB: Map<string, { role: 'user' | 'assistant' | 'system', content: string, timestamp: number }[]> = new Map()
