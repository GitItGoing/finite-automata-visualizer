import { NodeInterface, LinkInterface } from '../interfaces/graph';
import { NFA } from '../interfaces/nfa';
import { EPSILON_SYMBOL } from '../constants/nfa';

/**
 * Convert an NFA to NodeInterface[]/LinkInterface[] for ReactFlow rendering.
 * Remaps states so the start state gets id=1 (matching existing conventions).
 * Groups transitions by (from, to) pair with comma-separated symbol labels.
 * Does NOT add dead states — NFAs don't require completeness.
 */
export function nfaToGraph(nfa: NFA): {
    nodes: NodeInterface[];
    links: LinkInterface[];
} {
    const acceptSet = new Set(nfa.acceptStates);

    // Remap: start state → id 1, others sequential
    const idMap = new Map<number, number>();
    idMap.set(nfa.startState, 1);
    let nextId = 2;
    for (const s of nfa.states) {
        if (!idMap.has(s.id)) {
            idMap.set(s.id, nextId++);
        }
    }

    const nodes: NodeInterface[] = nfa.states.map((s) => ({
        id: idMap.get(s.id)!,
        values: [s.id], // original NFA state id for reference
        group: 1,
        isFinalState: acceptSet.has(s.id),
        isStartState: s.id === nfa.startState,
    }));

    // Group transitions by (source, target) pair
    const linkMap = new Map<
        string,
        { source: NodeInterface; target: NodeInterface; symbols: string[] }
    >();

    for (const t of nfa.transitions) {
        const srcId = idMap.get(t.from)!;
        const tgtId = idMap.get(t.to)!;
        const key = `${srcId}->${tgtId}`;
        const sym = t.symbol === null ? EPSILON_SYMBOL : t.symbol;

        if (linkMap.has(key)) {
            const entry = linkMap.get(key)!;
            if (!entry.symbols.includes(sym)) {
                entry.symbols.push(sym);
            }
        } else {
            const srcNode = nodes.find((n) => n.id === srcId)!;
            const tgtNode = nodes.find((n) => n.id === tgtId)!;
            linkMap.set(key, {
                source: srcNode,
                target: tgtNode,
                symbols: [sym],
            });
        }
    }

    const links: LinkInterface[] = [];
    linkMap.forEach((entry) => {
        links.push({
            source: entry.source,
            target: entry.target,
            transition: entry.symbols.join(','),
        });
    });

    return { nodes, links };
}
