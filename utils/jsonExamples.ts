import Parser from '../classes/Parser';
import ThompsonParser from '../classes/ThompsonParser';
import { generateNodesAndLinks } from './graph';
import { nfaToGraph } from './nfaGraph';
import { NodeInterface, LinkInterface } from '../interfaces/graph';
import { NFA } from '../interfaces/nfa';
import { EPSILON_SYMBOL } from '../constants/nfa';

/** Infer the alphabet from a regex string (same logic as SidePanel). */
function inferAlphabet(regex: string): string[] {
    const operators = new Set(['.', '*', '|', '(', ')', ' ']);
    const seen: Record<string, boolean> = {};
    for (const ch of regex) {
        if (operators.has(ch) || ch === 'e') continue;
        seen[ch] = true;
    }
    return Object.keys(seen).sort();
}

/** Auto-insert concatenation dots (same as SidePanel). */
function autoInsertConcat(regex: string, alphabet: string[]): string {
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

/**
 * Convert a DFA (nodes/links) into the JSON string format
 * used by the JSON import/export tab.
 */
export function dfaToJSONString(
    nodes: NodeInterface[],
    links: LinkInterface[],
    alphabet: string[]
): string {
    // Map node ids to friendly names. Start state = q1, dead = dead, others = q<index+1>
    const idToName: Record<number, string> = {};
    nodes.forEach((n, i) => {
        if (n.id === -1) idToName[-1] = 'dead';
        else idToName[n.id] = `q${i + 1}`;
    });

    const stateNames = nodes.map((n) => idToName[n.id]);
    const startNode = nodes.find((n) => n.id === 1) || nodes[0];
    const acceptNames = nodes
        .filter((n) => n.isFinalState)
        .map((n) => idToName[n.id]);

    // Build transitions: for each source state, map symbol -> single target
    const transitions: Record<string, Record<string, string>> = {};
    for (const node of nodes) {
        transitions[idToName[node.id]] = {};
    }
    for (const link of links) {
        const srcName = idToName[link.source.id];
        const tgtName = idToName[link.target.id];
        const syms = link.transition.split(',');
        for (const sym of syms) {
            transitions[srcName][sym] = tgtName;
        }
    }

    const obj = {
        alphabet,
        states: stateNames,
        start: idToName[startNode.id],
        accept: acceptNames,
        transitions,
    };

    return JSON.stringify(obj, null, 2);
}

/**
 * Convert an NFA into the JSON string format.
 * Uses array-valued transitions and `"ε"` for epsilon transitions.
 */
export function nfaToJSONString(nfa: NFA): string {
    // Map NFA state ids → friendly names (q0, q1, ...) but ensure start is q0
    const idToName: Record<number, string> = {};
    const sorted = [...nfa.states].sort((a, b) => {
        if (a.id === nfa.startState) return -1;
        if (b.id === nfa.startState) return 1;
        return a.id - b.id;
    });
    sorted.forEach((s, i) => {
        idToName[s.id] = `q${i}`;
    });

    const stateNames = sorted.map((s) => idToName[s.id]);
    const startName = idToName[nfa.startState];
    const acceptNames = nfa.acceptStates.map((id) => idToName[id]);

    // Build transitions: for each source, map symbol -> array of targets
    const transitions: Record<string, Record<string, string[]>> = {};
    for (const s of sorted) {
        transitions[idToName[s.id]] = {};
    }
    for (const t of nfa.transitions) {
        const srcName = idToName[t.from];
        const tgtName = idToName[t.to];
        if (srcName === undefined || tgtName === undefined) continue;
        const sym = t.symbol === null ? EPSILON_SYMBOL : t.symbol;
        if (!transitions[srcName][sym]) {
            transitions[srcName][sym] = [];
        }
        if (!transitions[srcName][sym].includes(tgtName)) {
            transitions[srcName][sym].push(tgtName);
        }
    }

    const obj = {
        type: 'NFA',
        alphabet: nfa.alphabet,
        states: stateNames,
        start: startName,
        accept: acceptNames,
        transitions,
    };

    return JSON.stringify(obj, null, 2);
}

/** Generate DFA JSON from a regex (runs Brzozowski's algorithm). */
export function regexToDFAJSON(regex: string): string {
    const alphabet = inferAlphabet(regex);
    if (alphabet.length === 0) return '// Regex has no alphabet symbols';
    const processed = autoInsertConcat(regex, alphabet);
    const parser = new Parser(processed, alphabet);
    const { nodes, links } = generateNodesAndLinks(
        parser.firstPos,
        parser.followPos
    );
    return dfaToJSONString(nodes, links, alphabet);
}

/** Generate NFA JSON from a regex (runs Thompson's construction). */
export function regexToNFAJSON(regex: string): string {
    const thompson = new ThompsonParser(regex);
    return nfaToJSONString(thompson.nfa);
}
