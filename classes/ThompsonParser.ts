import { Token, TokenType } from '../interfaces/lexer';
import { NFA, NFATransition } from '../interfaces/nfa';
import { tokenize } from '../utils/lexer';

/**
 * Thompson's Construction: converts a regex into an NFA.
 *
 * Unlike the existing Brzozowski direct construction (Parser.ts) which
 * produces a DFA, this produces an NFA with epsilon transitions —
 * exactly one start state and one accept state per sub-expression.
 */

interface Fragment {
    start: number;
    accept: number;
    transitions: NFATransition[];
}

export default class ThompsonParser {
    private tokens: Token[] = [];
    private stateCounter = 0;
    public nfa: NFA;

    constructor(regex: string, alphabet?: string[]) {
        // Auto-insert concatenation dots
        const effectiveAlphabet = alphabet || this.inferAlphabet(regex);
        const processed = this.autoInsertConcat(regex, effectiveAlphabet);

        // Tokenize WITHOUT the augmented (#) end marker
        this.tokens = tokenize(processed, effectiveAlphabet);

        // Parse and build NFA
        const fragment = this.parseExpr();

        // Collect all state IDs
        const stateIds = new Set<number>();
        stateIds.add(fragment.start);
        stateIds.add(fragment.accept);
        for (const t of fragment.transitions) {
            stateIds.add(t.from);
            stateIds.add(t.to);
        }

        this.nfa = {
            states: Array.from(stateIds)
                .sort((a, b) => a - b)
                .map((id) => ({
                    id,
                    isFinal: id === fragment.accept,
                })),
            startState: fragment.start,
            acceptStates: [fragment.accept],
            transitions: fragment.transitions,
            alphabet: effectiveAlphabet,
        };
    }

    private inferAlphabet(regex: string): string[] {
        const operators = new Set(['.', '*', '|', '(', ')', ' ']);
        const seen: Record<string, boolean> = {};
        for (const ch of regex) {
            if (operators.has(ch) || ch === 'e') continue;
            seen[ch] = true;
        }
        return Object.keys(seen).sort();
    }

    private autoInsertConcat(regex: string, alphabet: string[]): string {
        const symbolOrEpsilon = new Set([...alphabet, 'e']);
        const isValue = (ch: string) =>
            symbolOrEpsilon.has(ch) || ch === ')' || ch === '*';
        const isOpener = (ch: string) =>
            symbolOrEpsilon.has(ch) || ch === '(';
        let result = '';
        for (let i = 0; i < regex.length; i++) {
            result += regex[i];
            if (
                i < regex.length - 1 &&
                isValue(regex[i]) &&
                isOpener(regex[i + 1])
            ) {
                result += '.';
            }
        }
        return result;
    }

    private newState(): number {
        return this.stateCounter++;
    }

    // ---- Recursive descent parser (same precedence as Parser.ts) ----

    private at(): Token | undefined {
        return this.tokens[0];
    }

    private eat(): Token {
        return this.tokens.shift()!;
    }

    private parseExpr(): Fragment {
        return this.parseOrExpr();
    }

    private parseOrExpr(): Fragment {
        let left = this.parseConcatExpr();

        while (this.at() && this.at()!.value === '|') {
            this.eat(); // consume '|'
            const right = this.parseConcatExpr();

            // New start → ε → both left.start and right.start
            // Both left.accept and right.accept → ε → new accept
            const start = this.newState();
            const accept = this.newState();

            const transitions: NFATransition[] = [
                ...left.transitions,
                ...right.transitions,
                { from: start, to: left.start, symbol: null },
                { from: start, to: right.start, symbol: null },
                { from: left.accept, to: accept, symbol: null },
                { from: right.accept, to: accept, symbol: null },
            ];

            left = { start, accept, transitions };
        }

        return left;
    }

    private parseConcatExpr(): Fragment {
        let left = this.parseKleeneExpr();

        while (this.at() && this.at()!.value === '.') {
            this.eat(); // consume '.'
            const right = this.parseKleeneExpr();

            // Merge left.accept into right.start via epsilon
            const transitions: NFATransition[] = [
                ...left.transitions,
                ...right.transitions,
                { from: left.accept, to: right.start, symbol: null },
            ];

            left = { start: left.start, accept: right.accept, transitions };
        }

        return left;
    }

    private parseKleeneExpr(): Fragment {
        let body = this.parsePrimary();

        while (this.at() && this.at()!.value === '*') {
            this.eat(); // consume '*'

            const start = this.newState();
            const accept = this.newState();

            const transitions: NFATransition[] = [
                ...body.transitions,
                { from: start, to: body.start, symbol: null },
                { from: start, to: accept, symbol: null },
                { from: body.accept, to: body.start, symbol: null },
                { from: body.accept, to: accept, symbol: null },
            ];

            body = { start, accept, transitions };
        }

        return body;
    }

    private parsePrimary(): Fragment {
        const tk = this.at();
        if (!tk) {
            // Empty: produce epsilon fragment
            const s = this.newState();
            const a = this.newState();
            return { start: s, accept: a, transitions: [{ from: s, to: a, symbol: null }] };
        }

        switch (tk.type) {
            case TokenType.Symbol: {
                const sym = this.eat().value;
                const s = this.newState();
                const a = this.newState();
                return {
                    start: s,
                    accept: a,
                    transitions: [{ from: s, to: a, symbol: sym }],
                };
            }
            case TokenType.Epsilon: {
                this.eat();
                const s = this.newState();
                const a = this.newState();
                return {
                    start: s,
                    accept: a,
                    transitions: [{ from: s, to: a, symbol: null }],
                };
            }
            case TokenType.OpenParen: {
                this.eat(); // consume '('
                const inner = this.parseExpr();
                if (this.at() && this.at()!.type === TokenType.CloseParen) {
                    this.eat(); // consume ')'
                }
                return inner;
            }
            default: {
                // Fallback: treat as symbol
                const sym = this.eat().value;
                const s = this.newState();
                const a = this.newState();
                return {
                    start: s,
                    accept: a,
                    transitions: [{ from: s, to: a, symbol: sym }],
                };
            }
        }
    }
}
