import { NodeInterface, LinkInterface } from '../interfaces/graph';

/**
 * Constraint Language DFA Generator
 *
 * Supports:
 *   contains(x)    / !contains(x)
 *   equals(x)      / !equals(x)
 *   startsWith(x)  / !startsWith(x)
 *   endsWith(x)    / !endsWith(x)
 *
 * Combinators:
 *   &&  (intersection)
 *   ||  (union)
 *
 * Example: "!contains(bb) && endsWith(a)"
 */

interface MiniDFA {
    states: number[];
    start: number;
    accept: number[];
    transitions: { from: number; symbol: string; to: number }[];
}

// ---- Individual constraint DFA builders ----

function buildContainsDFA(substring: string, alphabet: string[]): MiniDFA {
    // KMP-style DFA for substring matching
    const m = substring.length;
    // States 0..m, state m is the accepting "found" state
    const states: number[] = [];
    for (let i = 0; i <= m; i++) states.push(i);

    const transitions: MiniDFA['transitions'] = [];

    // Build failure function
    const fail = new Array(m + 1).fill(0);
    for (let i = 1; i < m; i++) {
        let j = fail[i - 1];
        while (j > 0 && substring[j] !== substring[i]) j = fail[j - 1];
        if (substring[j] === substring[i]) j++;
        fail[i] = j;
    }

    // Build transitions for states 0..m-1
    for (let state = 0; state < m; state++) {
        for (const sym of alphabet) {
            if (sym === substring[state]) {
                transitions.push({ from: state, symbol: sym, to: state + 1 });
            } else {
                // Follow failure links
                let j = state;
                while (j > 0 && substring[j] !== sym) j = fail[j - 1];
                if (substring[j] === sym) j++;
                transitions.push({ from: state, symbol: sym, to: j });
            }
        }
    }

    // State m (accepting) self-loops on everything
    for (const sym of alphabet) {
        transitions.push({ from: m, symbol: sym, to: m });
    }

    return { states, start: 0, accept: [m], transitions };
}

function buildEqualsDFA(target: string, alphabet: string[]): MiniDFA {
    const n = target.length;
    // States: 0..n (matching progress), n+1 (dead/reject)
    const dead = n + 1;
    const states: number[] = [];
    for (let i = 0; i <= dead; i++) states.push(i);

    const transitions: MiniDFA['transitions'] = [];

    for (let state = 0; state < n; state++) {
        for (const sym of alphabet) {
            if (sym === target[state]) {
                transitions.push({ from: state, symbol: sym, to: state + 1 });
            } else {
                transitions.push({ from: state, symbol: sym, to: dead });
            }
        }
    }

    // State n: exact match reached, any further input goes to dead
    for (const sym of alphabet) {
        transitions.push({ from: n, symbol: sym, to: dead });
    }

    // Dead state self-loops
    for (const sym of alphabet) {
        transitions.push({ from: dead, symbol: sym, to: dead });
    }

    // Accept empty string if target is empty
    return { states, start: 0, accept: [n], transitions };
}

function buildStartsWithDFA(prefix: string, alphabet: string[]): MiniDFA {
    const n = prefix.length;
    // States: 0..n (matching progress), n+1 (dead)
    const dead = n + 1;
    const states: number[] = [];
    for (let i = 0; i <= dead; i++) states.push(i);

    const transitions: MiniDFA['transitions'] = [];

    for (let state = 0; state < n; state++) {
        for (const sym of alphabet) {
            if (sym === prefix[state]) {
                transitions.push({ from: state, symbol: sym, to: state + 1 });
            } else {
                transitions.push({ from: state, symbol: sym, to: dead });
            }
        }
    }

    // State n: prefix matched, accept everything after
    for (const sym of alphabet) {
        transitions.push({ from: n, symbol: sym, to: n });
    }

    // Dead state
    for (const sym of alphabet) {
        transitions.push({ from: dead, symbol: sym, to: dead });
    }

    return { states, start: 0, accept: [n], transitions };
}

function buildEndsWithDFA(suffix: string, alphabet: string[]): MiniDFA {
    // Similar to contains but only accept at states that have matched
    // the full suffix AND the input has ended there.
    // Use KMP-style construction; accept = state m
    // But unlike contains, we DON'T stay in accepting state — we track
    // whether the current position ends with the suffix.
    const m = suffix.length;
    const states: number[] = [];
    for (let i = 0; i <= m; i++) states.push(i);

    const transitions: MiniDFA['transitions'] = [];

    // Build failure function
    const fail = new Array(m + 1).fill(0);
    for (let i = 1; i < m; i++) {
        let j = fail[i - 1];
        while (j > 0 && suffix[j] !== suffix[i]) j = fail[j - 1];
        if (suffix[j] === suffix[i]) j++;
        fail[i] = j;
    }

    // Build transitions for all states including m
    for (let state = 0; state <= m; state++) {
        for (const sym of alphabet) {
            if (state < m && sym === suffix[state]) {
                transitions.push({ from: state, symbol: sym, to: state + 1 });
            } else {
                let j = state;
                if (j === m) j = fail[m - 1];
                while (j > 0 && suffix[j] !== sym) j = fail[j - 1];
                if (suffix[j] === sym) j++;
                transitions.push({ from: state, symbol: sym, to: j });
            }
        }
    }

    return { states, start: 0, accept: [m], transitions };
}

function complementDFA(dfa: MiniDFA): MiniDFA {
    const acceptSet = new Set(dfa.accept);
    return {
        ...dfa,
        accept: dfa.states.filter((s) => !acceptSet.has(s)),
    };
}

// ---- Product construction for && and || ----

function productDFA(dfa1: MiniDFA, dfa2: MiniDFA, mode: 'and' | 'or', alphabet: string[]): MiniDFA {
    const accept1 = new Set(dfa1.accept);
    const accept2 = new Set(dfa2.accept);

    // Build transition maps
    const trans1: Record<string, number> = {};
    for (const t of dfa1.transitions) {
        trans1[`${t.from},${t.symbol}`] = t.to;
    }
    const trans2: Record<string, number> = {};
    for (const t of dfa2.transitions) {
        trans2[`${t.from},${t.symbol}`] = t.to;
    }

    // BFS through product states
    const pairId = (a: number, b: number) => `${a},${b}`;
    const stateMap = new Map<string, number>();
    const queue: [number, number][] = [];
    let nextId = 0;

    const startKey = pairId(dfa1.start, dfa2.start);
    stateMap.set(startKey, nextId++);
    queue.push([dfa1.start, dfa2.start]);

    const transitions: MiniDFA['transitions'] = [];

    while (queue.length > 0) {
        const [s1, s2] = queue.shift()!;
        const fromId = stateMap.get(pairId(s1, s2))!;

        for (const sym of alphabet) {
            const t1 = trans1[`${s1},${sym}`];
            const t2 = trans2[`${s2},${sym}`];
            if (t1 === undefined || t2 === undefined) continue;

            const key = pairId(t1, t2);
            if (!stateMap.has(key)) {
                stateMap.set(key, nextId++);
                queue.push([t1, t2]);
            }
            transitions.push({ from: fromId, symbol: sym, to: stateMap.get(key)! });
        }
    }

    const states: number[] = [];
    const accept: number[] = [];

    stateMap.forEach((id, key) => {
        states.push(id);
        const parts = key.split(',');
        const s1 = parseInt(parts[0]);
        const s2 = parseInt(parts[1]);
        const a1 = accept1.has(s1);
        const a2 = accept2.has(s2);
        if (mode === 'and' ? (a1 && a2) : (a1 || a2)) {
            accept.push(id);
        }
    });

    return { states, start: 0, accept, transitions };
}

// ---- Constraint parser ----

interface Constraint {
    negated: boolean;
    type: 'contains' | 'equals' | 'startsWith' | 'endsWith';
    arg: string;
}

interface SingleConstraintExpr {
    kind: 'single';
    constraint: Constraint;
}

interface BinaryConstraintExpr {
    kind: 'binary';
    op: '&&' | '||';
    left: ConstraintExpr;
    right: ConstraintExpr;
}

type ConstraintExpr = SingleConstraintExpr | BinaryConstraintExpr;

function tokenizeConstraint(input: string): string[] {
    const tokens: string[] = [];
    let i = 0;
    while (i < input.length) {
        // Skip whitespace
        if (input[i] === ' ' || input[i] === '\t') { i++; continue; }

        // Operators
        if (input[i] === '&' && input[i + 1] === '&') {
            tokens.push('&&'); i += 2; continue;
        }
        if (input[i] === '|' && input[i + 1] === '|') {
            tokens.push('||'); i += 2; continue;
        }
        if (input[i] === '(') { tokens.push('('); i++; continue; }
        if (input[i] === ')') { tokens.push(')'); i++; continue; }
        if (input[i] === '!') { tokens.push('!'); i++; continue; }

        // Identifiers and function calls
        let word = '';
        while (i < input.length && /[a-zA-Z0-9]/.test(input[i])) {
            word += input[i]; i++;
        }
        if (word) { tokens.push(word); continue; }

        i++; // skip unknown
    }
    return tokens;
}

function parseConstraintExpr(tokens: string[], pos: { i: number }): ConstraintExpr | null {
    let left = parseConstraintAtom(tokens, pos);
    if (!left) return null;

    while (pos.i < tokens.length && (tokens[pos.i] === '&&' || tokens[pos.i] === '||')) {
        const op = tokens[pos.i] as '&&' | '||';
        pos.i++;
        const right = parseConstraintAtom(tokens, pos);
        if (!right) return null;
        left = { kind: 'binary', op, left, right };
    }

    return left;
}

function parseConstraintAtom(tokens: string[], pos: { i: number }): ConstraintExpr | null {
    if (pos.i >= tokens.length) return null;

    // Handle parenthesized expressions
    if (tokens[pos.i] === '(') {
        pos.i++;
        const expr = parseConstraintExpr(tokens, pos);
        if (pos.i < tokens.length && tokens[pos.i] === ')') pos.i++;
        return expr;
    }

    let negated = false;
    if (tokens[pos.i] === '!') {
        negated = true;
        pos.i++;
    }

    const funcName = tokens[pos.i];
    pos.i++;

    if (pos.i < tokens.length && tokens[pos.i] === '(') {
        pos.i++; // skip (
        let arg = '';
        while (pos.i < tokens.length && tokens[pos.i] !== ')') {
            arg += tokens[pos.i];
            pos.i++;
        }
        if (pos.i < tokens.length) pos.i++; // skip )

        const typeLower = funcName.toLowerCase();
        const typeMap: Record<string, Constraint['type']> = {
            'contains': 'contains',
            'equals': 'equals',
            'startswith': 'startsWith',
            'endswith': 'endsWith',
        };
        const mappedType = typeMap[typeLower];
        if (mappedType) {
            return {
                kind: 'single',
                constraint: { negated, type: mappedType, arg },
            };
        }
    }

    return null;
}

function constraintToDFA(constraint: Constraint, alphabet: string[]): MiniDFA {
    let dfa: MiniDFA;
    switch (constraint.type) {
        case 'contains':
            dfa = buildContainsDFA(constraint.arg, alphabet);
            break;
        case 'equals':
            dfa = buildEqualsDFA(constraint.arg, alphabet);
            break;
        case 'startsWith':
            dfa = buildStartsWithDFA(constraint.arg, alphabet);
            break;
        case 'endsWith':
            dfa = buildEndsWithDFA(constraint.arg, alphabet);
            break;
        default:
            throw new Error(`Unknown constraint type: ${constraint.type}`);
    }
    return constraint.negated ? complementDFA(dfa) : dfa;
}

function exprToDFA(expr: ConstraintExpr, alphabet: string[]): MiniDFA {
    if (expr.kind === 'single') {
        return constraintToDFA(expr.constraint, alphabet);
    } else {
        const left = exprToDFA(expr.left, alphabet);
        const right = exprToDFA(expr.right, alphabet);
        return productDFA(left, right, expr.op === '&&' ? 'and' : 'or', alphabet);
    }
}

// ---- Convert MiniDFA to NodeInterface/LinkInterface ----

function miniDFAToGraph(dfa: MiniDFA, alphabet: string[]): { nodes: NodeInterface[]; links: LinkInterface[] } {
    const acceptSet = new Set(dfa.accept);

    // Remap state ids to 1-based (start state = 1)
    const idMap = new Map<number, number>();
    // Start state gets id 1
    idMap.set(dfa.start, 1);
    let nextId = 2;
    for (const s of dfa.states) {
        if (!idMap.has(s)) {
            idMap.set(s, nextId++);
        }
    }

    const nodes: NodeInterface[] = dfa.states.map((s) => ({
        id: idMap.get(s)!,
        values: [s],
        group: 1,
        isFinalState: acceptSet.has(s),
    }));

    // Group transitions by (source, target) pair
    const linkMap = new Map<string, { source: NodeInterface; target: NodeInterface; symbols: string[] }>();

    for (const t of dfa.transitions) {
        const srcId = idMap.get(t.from)!;
        const tgtId = idMap.get(t.to)!;
        const key = `${srcId}->${tgtId}`;

        if (linkMap.has(key)) {
            linkMap.get(key)!.symbols.push(t.symbol);
        } else {
            const srcNode = nodes.find((n) => n.id === srcId)!;
            const tgtNode = nodes.find((n) => n.id === tgtId)!;
            linkMap.set(key, { source: srcNode, target: tgtNode, symbols: [t.symbol] });
        }
    }

    const links: LinkInterface[] = [];
    linkMap.forEach((entry) => {
        // Deduplicate symbols
        const uniqueSyms: Record<string, boolean> = {};
        entry.symbols.forEach((s) => { uniqueSyms[s] = true; });
        links.push({
            source: entry.source,
            target: entry.target,
            transition: Object.keys(uniqueSyms).join(','),
        });
    });

    return { nodes, links };
}

// ---- Public API ----

export function parseAndBuildDFA(
    input: string,
    alphabet: string[]
): { nodes: NodeInterface[]; links: LinkInterface[] } | { error: string } {
    const tokens = tokenizeConstraint(input);
    if (tokens.length === 0) {
        return { error: 'Empty constraint expression' };
    }

    const pos = { i: 0 };
    const expr = parseConstraintExpr(tokens, pos);
    if (!expr) {
        return { error: 'Could not parse constraint. Use: contains(x), equals(x), startsWith(x), endsWith(x) with && or ||' };
    }

    try {
        const dfa = exprToDFA(expr, alphabet);
        return miniDFAToGraph(dfa, alphabet);
    } catch (e) {
        return { error: `Error building DFA: ${e.message}` };
    }
}

export function validateConstraint(input: string): string {
    if (!input.trim()) return '';

    const tokens = tokenizeConstraint(input);
    if (tokens.length === 0) return 'Empty constraint';

    const pos = { i: 0 };
    const expr = parseConstraintExpr(tokens, pos);
    if (!expr) {
        return 'Invalid syntax. Use: contains(x), !contains(x), equals(x), startsWith(x), endsWith(x) combined with && or ||';
    }

    return '';
}
