import { NodeInterface, LinkInterface } from '../interfaces/graph';
import { NFA } from '../interfaces/nfa';
import { epsilonClosure } from './nfaSimulation';

/**
 * Subset Construction: convert an NFA to an equivalent DFA.
 *
 * Each DFA state corresponds to a set of NFA states. The DFA's `values`
 * field stores the original NFA state IDs that each DFA state represents,
 * which is pedagogically useful (students can see the mapping).
 *
 * Returns nodes, links, and alphabet for the resulting DFA.
 */
export function nfaToDFA(nfa: NFA): {
    nodes: NodeInterface[];
    links: LinkInterface[];
    alphabet: string[];
} {
    const MAX_STATES = 500; // guard against exponential blowup
    const acceptSet = new Set(nfa.acceptStates);

    // Key function: sorted comma-separated NFA state IDs
    const setKey = (states: number[]) =>
        states
            .slice()
            .sort((a, b) => a - b)
            .join(',');

    // Start: epsilon closure of the NFA start state
    const startSet = epsilonClosure([nfa.startState], nfa.transitions);
    const startKey = setKey(startSet);

    // DFA state tracking
    const dfaStateMap = new Map<string, number>(); // setKey → DFA node id
    const dfaStateSets = new Map<string, number[]>(); // setKey → NFA state set
    let nextDfaId = 1;

    dfaStateMap.set(startKey, nextDfaId);
    dfaStateSets.set(startKey, startSet);
    nextDfaId++;

    const queue: string[] = [startKey];
    const nodes: NodeInterface[] = [];
    const linkEntries: {
        sourceKey: string;
        targetKey: string;
        symbol: string;
    }[] = [];

    while (queue.length > 0) {
        const currentKey = queue.shift()!;
        const currentSet = dfaStateSets.get(currentKey)!;

        for (const sym of nfa.alphabet) {
            // Compute the set of NFA states reachable on this symbol
            const reachable: number[] = [];
            for (const stateId of currentSet) {
                for (const t of nfa.transitions) {
                    if (t.from === stateId && t.symbol === sym) {
                        reachable.push(t.to);
                    }
                }
            }

            // Epsilon closure of the reachable set
            const unique = Array.from(new Set(reachable));
            const targetSet = epsilonClosure(unique, nfa.transitions);

            if (targetSet.length === 0) {
                // Goes to empty set (dead state) — we'll add it later
                linkEntries.push({
                    sourceKey: currentKey,
                    targetKey: '__dead__',
                    symbol: sym,
                });
                continue;
            }

            const targetKey = setKey(targetSet);

            if (!dfaStateMap.has(targetKey)) {
                if (dfaStateMap.size >= MAX_STATES) {
                    console.warn(
                        'Subset construction: state limit reached, stopping.'
                    );
                    break;
                }
                dfaStateMap.set(targetKey, nextDfaId);
                dfaStateSets.set(targetKey, targetSet);
                nextDfaId++;
                queue.push(targetKey);
            }

            linkEntries.push({
                sourceKey: currentKey,
                targetKey,
                symbol: sym,
            });
        }
    }

    // Build DFA nodes
    const needsDead = linkEntries.some((e) => e.targetKey === '__dead__');

    dfaStateMap.forEach((id, key) => {
        const nfaStates = dfaStateSets.get(key)!;
        const isFinal = nfaStates.some((s) => acceptSet.has(s));
        nodes.push({
            id,
            values: nfaStates,
            group: 1,
            isFinalState: isFinal,
            isStartState: key === startKey,
        });
    });

    if (needsDead) {
        nodes.push({
            id: -1,
            values: [],
            group: 1,
            isFinalState: false,
        });
    }

    // Build DFA links, grouping by (source, target) and merging symbols
    const linkMap = new Map<
        string,
        { source: NodeInterface; target: NodeInterface; symbols: string[] }
    >();

    for (const entry of linkEntries) {
        const srcId = dfaStateMap.get(entry.sourceKey)!;
        const tgtId =
            entry.targetKey === '__dead__'
                ? -1
                : dfaStateMap.get(entry.targetKey)!;
        const lKey = `${srcId}->${tgtId}`;

        if (linkMap.has(lKey)) {
            linkMap.get(lKey)!.symbols.push(entry.symbol);
        } else {
            const srcNode = nodes.find((n) => n.id === srcId)!;
            const tgtNode = nodes.find((n) => n.id === tgtId)!;
            linkMap.set(lKey, {
                source: srcNode,
                target: tgtNode,
                symbols: [entry.symbol],
            });
        }
    }

    // Dead state self-loop
    if (needsDead) {
        const deadNode = nodes.find((n) => n.id === -1)!;
        linkMap.set('-1->-1', {
            source: deadNode,
            target: deadNode,
            symbols: [...nfa.alphabet],
        });
    }

    const links: LinkInterface[] = [];
    linkMap.forEach((entry) => {
        links.push({
            source: entry.source,
            target: entry.target,
            transition: entry.symbols.join(','),
        });
    });

    return { nodes, links, alphabet: nfa.alphabet };
}
