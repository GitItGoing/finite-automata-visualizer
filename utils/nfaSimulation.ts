import { NFATransition } from '../interfaces/nfa';

/**
 * Compute the epsilon closure of a set of NFA states.
 * Returns all states reachable from the given set via zero or more
 * epsilon (null-symbol) transitions.
 */
export function epsilonClosure(
    stateSet: number[],
    transitions: NFATransition[]
): number[] {
    const visited = new Set<number>(stateSet);
    const queue = [...stateSet];

    while (queue.length > 0) {
        const current = queue.shift()!;
        for (const t of transitions) {
            if (t.from === current && t.symbol === null && !visited.has(t.to)) {
                visited.add(t.to);
                queue.push(t.to);
            }
        }
    }

    return Array.from(visited).sort((a, b) => a - b);
}

/**
 * One step of NFA simulation: given the current active NFA state set and
 * an input symbol, return the new active state set (after epsilon closure).
 */
export function nfaStep(
    currentStates: number[],
    symbol: string,
    transitions: NFATransition[]
): number[] {
    const reachable: number[] = [];

    for (const stateId of currentStates) {
        for (const t of transitions) {
            if (t.from === stateId && t.symbol === symbol) {
                reachable.push(t.to);
            }
        }
    }

    // Deduplicate before epsilon closure
    const unique = Array.from(new Set(reachable));

    return epsilonClosure(unique, transitions);
}

export interface NFASimulationStep {
    activeStates: number[]; // NFA states active at this point
    activeTransitions: { from: number; to: number }[]; // transitions just traversed
    symbol: string | null; // the symbol that caused this step (null for initial)
}

/**
 * Simulate the full NFA execution on an input string.
 * Returns the list of steps (for animation) and whether the string is accepted.
 */
export function simulateNFA(
    startState: number,
    acceptStates: number[],
    transitions: NFATransition[],
    input: string
): { accepted: boolean; steps: NFASimulationStep[] } {
    const acceptSet = new Set(acceptStates);
    const steps: NFASimulationStep[] = [];

    // Initial: epsilon closure of {startState}
    let current = epsilonClosure([startState], transitions);
    steps.push({
        activeStates: [...current],
        activeTransitions: [],
        symbol: null,
    });

    for (const ch of input) {
        // Find transitions on this symbol from any current state
        const traversed: { from: number; to: number }[] = [];
        const reachable: number[] = [];

        for (const stateId of current) {
            for (const t of transitions) {
                if (t.from === stateId && t.symbol === ch) {
                    traversed.push({ from: t.from, to: t.to });
                    reachable.push(t.to);
                }
            }
        }

        const unique = Array.from(new Set(reachable));
        current = epsilonClosure(unique, transitions);

        steps.push({
            activeStates: [...current],
            activeTransitions: traversed,
            symbol: ch,
        });
    }

    const accepted = current.some((s) => acceptSet.has(s));

    return { accepted, steps };
}
