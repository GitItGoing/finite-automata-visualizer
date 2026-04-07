import { NodeInterface, LinkInterface } from '../interfaces/graph';

/**
 * Minimize a DFA using the Table-Filling Method.
 * Returns new minimized nodes and links arrays.
 */
export function minimizeDFA(
    nodes: NodeInterface[],
    links: LinkInterface[]
): { nodes: NodeInterface[]; links: LinkInterface[] } {
    // Filter out dead state for the algorithm, we'll add it back if needed
    const stateNodes = nodes.filter((n) => n.id !== -1);

    if (stateNodes.length <= 1) {
        return { nodes, links };
    }

    // Build transition function: stateId -> symbol -> targetStateId
    const delta: Record<number, Record<string, number>> = {};
    const allSymbols = new Set<string>();

    for (const link of links) {
        const srcId = link.source.id;
        if (!delta[srcId]) delta[srcId] = {};
        const symbols = link.transition.split(',');
        for (const sym of symbols) {
            delta[srcId][sym] = link.target.id;
            allSymbols.add(sym);
        }
    }

    const alphabet = Array.from(allSymbols).sort();
    const stateIds = stateNodes.map((n) => n.id);

    // Table: key is "min,max" of two state ids
    const pairKey = (a: number, b: number) => {
        const lo = Math.min(a, b);
        const hi = Math.max(a, b);
        return `${lo},${hi}`;
    };

    const marked = new Set<string>();

    // Step 1: Mark pairs where one is final and the other is not
    for (let i = 0; i < stateIds.length; i++) {
        for (let j = i + 1; j < stateIds.length; j++) {
            const ni = stateNodes.find((n) => n.id === stateIds[i])!;
            const nj = stateNodes.find((n) => n.id === stateIds[j])!;
            if (ni.isFinalState !== nj.isFinalState) {
                marked.add(pairKey(stateIds[i], stateIds[j]));
            }
        }
    }

    // Step 2: Iterate until no more changes
    let changed = true;
    while (changed) {
        changed = false;
        for (let i = 0; i < stateIds.length; i++) {
            for (let j = i + 1; j < stateIds.length; j++) {
                const key = pairKey(stateIds[i], stateIds[j]);
                if (marked.has(key)) continue;

                for (const sym of alphabet) {
                    const ti = delta[stateIds[i]]?.[sym] ?? -1;
                    const tj = delta[stateIds[j]]?.[sym] ?? -1;
                    if (ti === tj) continue;
                    if (marked.has(pairKey(ti, tj))) {
                        marked.add(key);
                        changed = true;
                        break;
                    }
                }
            }
        }
    }

    // Step 3: Collect equivalent classes (union-find style)
    const parent: Record<number, number> = {};
    for (const id of stateIds) {
        parent[id] = id;
    }

    const find = (x: number): number => {
        while (parent[x] !== x) {
            parent[x] = parent[parent[x]];
            x = parent[x];
        }
        return x;
    };

    const union = (a: number, b: number) => {
        const ra = find(a);
        const rb = find(b);
        if (ra !== rb) {
            // Keep the smaller id as representative (keeps start state id=1)
            if (ra < rb) {
                parent[rb] = ra;
            } else {
                parent[ra] = rb;
            }
        }
    };

    for (let i = 0; i < stateIds.length; i++) {
        for (let j = i + 1; j < stateIds.length; j++) {
            if (!marked.has(pairKey(stateIds[i], stateIds[j]))) {
                union(stateIds[i], stateIds[j]);
            }
        }
    }

    // Build mapping from old state id to representative id
    const representative: Record<number, number> = {};
    for (const id of stateIds) {
        representative[id] = find(id);
    }
    // Dead state maps to itself
    representative[-1] = -1;

    // Build new nodes (one per unique representative)
    const repSet = new Set<number>();
    stateIds.forEach((id) => repSet.add(representative[id]));

    const newNodes: NodeInterface[] = [];
    let newIdCounter = 1;
    const repToNewId: Record<number, number> = {};

    // Ensure start state representative gets id=1
    const startRep = representative[1];
    repToNewId[startRep] = 1;
    newIdCounter = 2;

    repSet.forEach((rep) => {
        if (rep === startRep) return;
        repToNewId[rep] = newIdCounter++;
    });

    repSet.forEach((rep) => {
        const originalNode = stateNodes.find((n) => n.id === rep)!;
        // A merged node is final if any of its constituent states is final
        const isFinal = stateIds
            .filter((id) => representative[id] === rep)
            .some((id) => stateNodes.find((n) => n.id === id)?.isFinalState);

        newNodes.push({
            id: repToNewId[rep],
            values: originalNode.values,
            group: originalNode.group,
            isFinalState: isFinal,
        });
    });

    // Check if we need a dead state
    let needDeadState = false;

    // Build new links
    const linkMap = new Map<string, LinkInterface>();

    for (const link of links) {
        const srcRep = representative[link.source.id];
        const tgtRep = representative[link.target.id];

        if (srcRep === undefined || tgtRep === undefined) continue;

        const newSrcId = repToNewId[srcRep];
        const newTgtId = tgtRep === -1 ? -1 : repToNewId[tgtRep];

        if (newTgtId === -1) needDeadState = true;

        const lKey = `${newSrcId}->${newTgtId}`;

        if (linkMap.has(lKey)) {
            const existing = linkMap.get(lKey)!;
            const existingSyms = existing.transition.split(',');
            const newSyms = link.transition.split(',');
            const allSymsSet: Record<string, boolean> = {};
            existingSyms.forEach((s) => { allSymsSet[s] = true; });
            newSyms.forEach((s) => { allSymsSet[s] = true; });
            existing.transition = Object.keys(allSymsSet).join(',');
        } else {
            const srcNode = newNodes.find((n) => n.id === newSrcId);
            const tgtNode = newTgtId === -1 ? null : newNodes.find((n) => n.id === newTgtId);

            if (srcNode && (tgtNode || newTgtId === -1)) {
                linkMap.set(lKey, {
                    source: srcNode,
                    target: tgtNode!, // placeholder, fix dead state below
                    transition: link.transition,
                });
            }
        }
    }

    // Add dead state if needed
    if (needDeadState) {
        const deadNode: NodeInterface = {
            id: -1,
            values: [],
            group: 1,
            isFinalState: false,
        };
        newNodes.push(deadNode);

        // Fix dead state references and add self-loop
        linkMap.forEach((link, key) => {
            if (key.endsWith('->-1')) {
                link.target = deadNode;
            }
        });

        // Dead state self-loop with all symbols
        linkMap.set('-1->-1', {
            source: deadNode,
            target: deadNode,
            transition: alphabet.join(','),
        });
    }

    const newLinks = Array.from(linkMap.values());

    return { nodes: newNodes, links: newLinks };
}
