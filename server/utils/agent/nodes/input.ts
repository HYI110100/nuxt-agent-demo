
import { MessageNode } from './message';
export class InputNode {
    process(rawInput: string | Error) {
        if (typeof rawInput === 'string') {
            return new MessageNode({ role: 'user', content: { type: 'text', content: rawInput } });
        }

        if (rawInput instanceof Error) {
            return new MessageNode({
                role: 'user',
                content: { type: 'error', message: rawInput.message, error: rawInput.name },
            });
        }

        return new MessageNode({ role: 'system', content: String(rawInput) });
    }
}