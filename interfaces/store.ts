import { NodeInterface, LinkInterface, AutomatonMode } from './graph';
import { NFA } from './nfa';

export interface DFAStoreData {
    id: number;
    when: string;
    nodes: NodeInterface[];
    links: LinkInterface[];
    regex: string;
    alphabet?: string[];
    mode?: AutomatonMode;
    nfa?: NFA | null;
}

export interface DFAStoreState {
    fetchDfaFromIdb: () => Promise<DFAStoreData[]>;
    addDfaToIdb: (
        data: Omit<DFAStoreData, 'id' | 'when'>
    ) => Promise<DFAStoreData>;
    getDfaFromIdb: (
        id: DFAStoreData['id']
    ) => Promise<DFAStoreData | undefined>;
    deleteDfaFromIdb: (id: DFAStoreData['id']) => Promise<void>;
    deleteAllDfaFromIdb: () => Promise<void>;
}
