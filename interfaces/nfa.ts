export interface NFAState {
    id: number;
    isFinal: boolean;
}

export interface NFATransition {
    from: number;
    to: number;
    symbol: string | null; // null = epsilon
}

export interface NFA {
    states: NFAState[];
    startState: number;
    acceptStates: number[];
    transitions: NFATransition[];
    alphabet: string[];
}
