import { useEffect, useState, useRef } from 'react';
import { CSSTransition } from 'react-transition-group';
import { useSearchParams } from 'next/navigation';

import Icon from '@mdi/react';
import { mdiResistorNodes, mdiCheckAll, mdiRocketLaunchOutline } from '@mdi/js';

import Parser from '../classes/Parser';
import ThompsonParser from '../classes/ThompsonParser';
import { generateNodesAndLinks } from '../utils/graph';
import { nfaToGraph } from '../utils/nfaGraph';
import { EPSILON_SYMBOL } from '../constants/nfa';
import { parseAndBuildDFA, validateConstraint } from '../utils/constraint';
import { useDfaStore } from '../store/dfaStore';
import { testLog } from '../tests/log';
import { DFAStoreData } from '../interfaces/store';
import { NodeInterface, LinkInterface } from '../interfaces/graph';
import SidePanelItem from './SidePanelItem';
import { demoManyRegex } from '../constants/demo';

const apps = {
    0: {
        title: 'Regex to DFA',
        placeholder: 'Add regex',
        icon: mdiResistorNodes,
    },
    1: {
        title: 'String Checker',
        placeholder: 'Enter string',
        icon: mdiCheckAll,
    },
};

interface PropsInterface {
    isAnimating: boolean;
    show: boolean;
    setLinks: Function;
    setNodes: Function;
    setRegexHeader: Function;
    demoString: string;
    alphabet: string[];
    setAlphabet: Function;
    setAutomatonMode: Function;
    setNfaData: Function;
}

function SidePanel(props: PropsInterface) {
    const { fetchDfaFromIdb, addDfaToIdb, getDfaFromIdb, deleteAllDfaFromIdb } =
        useDfaStore();
    const {
        show,
        setNodes,
        setLinks,
        setRegexHeader,
        demoString,
        isAnimating,
        alphabet,
        setAlphabet,
        setAutomatonMode,
        setNfaData,
    } = props;
    const searchParams = useSearchParams();
    const paramsRegex = searchParams.get('regex');

    const [inputs, setInputs] = useState<DFAStoreData[]>([]);
    const [isFetching, setIsFetching] = useState(false);
    const [showAppsDropdown, setShowAppsDropdown] = useState(false);
    const [selectedApp, setSelectedApp] = useState(0);
    const [selectedInput, setSelectedInput] = useState(null);
    const [inputString, setInputString] = useState('');
    const [isInputValid, setIsInputValid] = useState(true);
    const [selectedRegex, setSelectedRegex] = useState(null);
    const [stringChecker, setStringChecker] = useState<boolean | null>(null);
    const [regexError, setRegexError] = useState('');
    const [alphabetInput, setAlphabetInput] = useState(alphabet.join(','));
    const [inputMode, setInputMode] = useState<'regex' | 'constraint' | 'json' | 'nfa'>('regex');

    const dropRef = useRef(null);
    const dropBtnRef = useRef(null);

    const inputsToday = inputs.filter((input) => {
        const inputDate = new Date(input.when);
        const today = new Date();
        return inputDate.getDate() === today.getDate();
    });

    useEffect(() => {
        setInputString(demoString);
        if (demoString) {
            setInputs(demoManyRegex);
        } else {
            initialize();
        }
    }, [demoString]);

    const inputsSevenDays = inputs.filter((input) => {
        const inputDate = new Date(input.when);
        const today = new Date();
        return (
            inputDate.getDate() >= today.getDate() - 7 &&
            inputDate.getDate() < today.getDate()
        );
    });

    const oldInputs = inputs.filter((input) => {
        const inputDate = new Date(input.when);
        const today = new Date();
        return inputDate.getDate() < today.getDate() - 7;
    });

    const categorizedInputs = [
        {
            title: 'Today',
            inputs: inputsToday,
        },
        {
            title: 'Previous 7 days',
            inputs: inputsSevenDays,
        },
        {
            title: 'Older',
            inputs: oldInputs,
        },
    ];

    const disableInputButton =
        inputString.trim().length === 0 ||
        (selectedApp === 1 && (!inputString || !isInputValid)) ||
        (selectedApp === 0 &&
            (!inputString || !isInputValid || !!regexError)) ||
        isAnimating;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (disableInputButton) {
            if (selectedApp === 1 && !selectedInput) {
                alert('Please select an input to check');
            }
            return;
        }
        if (selectedApp === 0) {
            if (inputMode === 'json') {
                generateFromJSON(inputString.trim());
            } else if (inputMode === 'constraint') {
                generateFromConstraint(inputString.trim());
            } else if (inputMode === 'nfa') {
                generateNFA(inputString.trim());
            } else {
                generateDFA(inputString.trim());
            }
        } else if (selectedApp === 1) {
            setStringChecker(null);
            const stringChecker = isValidRegex(inputString.trim());
            setStringChecker(stringChecker);
        }
    };

    /** Extract alphabet automatically from a regex by finding all non-operator, non-epsilon characters. */
    const inferAlphabet = (regex: string): string[] => {
        const operators = new Set(['.', '*', '|', '(', ')', ' ']);
        const seen: Record<string, boolean> = {};
        for (const ch of regex) {
            // Skip operators and the epsilon symbol
            if (operators.has(ch) || ch === 'e') continue;
            seen[ch] = true;
        }
        return Object.keys(seen).sort();
    };

    /** Auto-insert concatenation dots between adjacent tokens where implied.
     *  e.g. "ab*|ba" → "a.b*|b.a", "(a)(b)" → "(a).(b)", "a(b)" → "a.(b)" */
    const autoInsertConcat = (regex: string, effectiveAlphabet: string[]): string => {
        const symbolOrEpsilon = new Set([...effectiveAlphabet, 'e']);
        const isValue = (ch: string) => symbolOrEpsilon.has(ch) || ch === ')' || ch === '*';
        const isOpener = (ch: string) => symbolOrEpsilon.has(ch) || ch === '(';

        let result = '';
        for (let i = 0; i < regex.length; i++) {
            result += regex[i];
            if (i < regex.length - 1 && isValue(regex[i]) && isOpener(regex[i + 1])) {
                result += '.';
            }
        }
        return result;
    };

    const validateRegex = (regex) => {
        if (!regex) {
            return '';
        }

        // Check if the input starts with "|" or "*"
        if (/^[*|]/.test(regex)) {
            return 'Invalid regex pattern: Cannot start with "|" or "*"';
        }

        // Since alphabet is auto-inferred, allow any single-char symbol.
        // Reject only whitespace and obvious invalid characters here.
        const operators = new Set(['.', '*', '|', '(', ')']);
        for (const ch of regex) {
            if (ch === ' ') continue;
            if (operators.has(ch)) continue;
            if (!/[a-zA-Z0-9]/.test(ch)) {
                return `Invalid character "${ch}". Use letters, digits, or operators (., |, *, (, )).`;
            }
        }

        // Check for balanced parentheses
        let depth = 0;
        for (const ch of regex) {
            if (ch === '(') depth++;
            else if (ch === ')') depth--;
            if (depth < 0) return 'Unbalanced parentheses';
        }
        if (depth !== 0) return 'Unbalanced parentheses';

        // Must have at least one non-epsilon symbol
        const inferredCheck = inferAlphabet(regex);
        if (inferredCheck.length === 0) {
            return 'Regex must contain at least one alphabet symbol';
        }

        return '';
    };

    const isValidRegex = (inputString: string): boolean => {
        if (!selectedRegex) {
            return false;
        }
        const regexPattern = selectedRegex
            .replace(/\./g, '+')
            .replace(/e/g, '')
            .replace(/ /g, '\\s*');
        const inputStringProcessed = inputString.replace(/e/g, '');
        const regex = new RegExp(`^${regexPattern}$`);
        return regex.test(inputStringProcessed);
    };

    const isValidStringInput = (input) => {
        const regex = /^[a-zA-Z\s]*$/; // Only allows alphabetic characters and spaces
        return regex.test(input);
    };

    const handleInputChange = (e) => {
        const input = inputMode === 'json' || inputMode === 'constraint'
            ? e.target.value
            : e.target.value.toLowerCase(); // regex & nfa modes get lowercased
        if (selectedApp === 0) {
            if (inputMode === 'json') {
                setIsInputValid(true);
                setRegexError('');
            } else {
                const error = inputMode === 'constraint'
                    ? validateConstraint(input)
                    : validateRegex(input);
                if (error) {
                    setIsInputValid(false);
                    setRegexError(error);
                } else {
                    setIsInputValid(true);
                    setRegexError('');
                }
            }
        } else if (selectedApp === 1 && !isValidStringInput(input)) {
            setIsInputValid(false);
        } else {
            setIsInputValid(true);
        }
        setInputString(input);
        setStringChecker(null);
    };

    const generateDFA = async (inputString: string) => {
        // Auto-infer alphabet from the regex itself
        const inferredAlphabet = inferAlphabet(inputString);
        const effectiveAlphabet = inferredAlphabet.length > 0 ? inferredAlphabet : alphabet;
        // Propagate inferred alphabet to the rest of the app
        if (inferredAlphabet.length > 0) {
            setAlphabet(inferredAlphabet);
            setAlphabetInput(inferredAlphabet.join(','));
        }

        const processedInput = autoInsertConcat(inputString, effectiveAlphabet);
        const alphaKey = effectiveAlphabet.slice().sort().join(',');
        const existingRegex = inputs.filter((data) => {
            const dataAlphaKey = (data.alphabet || ['a', 'b']).slice().sort().join(',');
            return data.regex === inputString && dataAlphaKey === alphaKey;
        });
        if (existingRegex.length > 0) {
            setInputString('');
            setSelectedInput(existingRegex[0].id);
            setNodes(existingRegex[0].nodes);
            setLinks(existingRegex[0].links);
            return;
        }
        const parser = new Parser(processedInput, effectiveAlphabet);
        const firstPos = parser.firstPos;
        const followPos = parser.followPos;
        const { nodes, links } = generateNodesAndLinks(firstPos, followPos);
        setNodes(nodes);
        setLinks(links);
        testLog(nodes, links, followPos);
        setInputString('');

        const data = {
            regex: inputString,
            nodes: nodes,
            links: links,
            alphabet: effectiveAlphabet,
        };
        setIsFetching(true);
        const dfaData = await addDfaToIdb(data);
        await getInputsFromIdb();
        setSelectedInput(dfaData.id);
        setRegexHeader(inputString);
        setIsFetching(false);
    };

    const generateFromConstraint = async (constraintStr: string) => {
        const result = parseAndBuildDFA(constraintStr, alphabet);
        if ('error' in result) {
            setRegexError(result.error);
            setIsInputValid(false);
            return;
        }
        setNodes(result.nodes);
        setLinks(result.links);
        setInputString('');

        const data = {
            regex: constraintStr,
            nodes: result.nodes,
            links: result.links,
            alphabet: alphabet,
        };
        setIsFetching(true);
        const dfaData = await addDfaToIdb(data);
        await getInputsFromIdb();
        setSelectedInput(dfaData.id);
        setRegexHeader(constraintStr);
        setIsFetching(false);
    };

    const generateNFA = async (regexStr: string) => {
        try {
            const thompson = new ThompsonParser(regexStr);
            const nfa = thompson.nfa;
            const { nodes, links } = nfaToGraph(nfa);
            setNodes(nodes);
            setLinks(links);
            setAutomatonMode('NFA');
            setNfaData(nfa);
            setInputString('');
            setAlphabet(nfa.alphabet);
            setAlphabetInput(nfa.alphabet.join(','));

            const data = {
                regex: regexStr + ' (NFA)',
                nodes: nodes,
                links: links,
                alphabet: nfa.alphabet,
            };
            setIsFetching(true);
            const dfaData = await addDfaToIdb(data);
            await getInputsFromIdb();
            setSelectedInput(dfaData.id);
            setRegexHeader(regexStr + ' (NFA)');
            setIsFetching(false);
        } catch (e) {
            setRegexError('Error building NFA: ' + (e as Error).message);
            setIsInputValid(false);
        }
    };

    const generateFromJSON = async (jsonStr: string) => {
        let parsed: any;
        try {
            parsed = JSON.parse(jsonStr);
        } catch (e) {
            setRegexError('Invalid JSON');
            setIsInputValid(false);
            return;
        }

        // DFA format: transitions value is a string (single target)
        //   { "q1": { "a": "q2", "b": "q1" } }
        // NFA format: type: "NFA", transitions value is an array (multiple targets)
        //   { "type": "NFA", "transitions": { "q1": { "a": ["q1", "q2"], "ε": ["q3"] } } }
        const { states: stateNames, start, accept, transitions } = parsed;
        const jsonAlphabet = parsed.alphabet;
        const isNFA = parsed.type === 'NFA';

        if (!stateNames || !start || !accept || !transitions) {
            setRegexError('JSON must have: states, start, accept, transitions');
            setIsInputValid(false);
            return;
        }

        if (jsonAlphabet) {
            setAlphabet(jsonAlphabet);
            setAlphabetInput(jsonAlphabet.join(','));
        }

        // Map state names to numeric IDs
        const nameToId: Record<string, number> = {};
        const acceptSet = new Set(accept as string[]);

        // Start state gets id 1
        nameToId[start] = 1;
        let nextId = 2;
        (stateNames as string[]).forEach((name) => {
            if (name === start) return;
            nameToId[name] = nextId++;
        });

        const importedNodes: NodeInterface[] = (stateNames as string[]).map((name) => ({
            id: nameToId[name],
            values: [nameToId[name]],
            group: 1,
            isFinalState: acceptSet.has(name),
            isStartState: name === start,
        }));

        const importedLinks: LinkInterface[] = [];
        const linkMap: Record<string, { source: NodeInterface; target: NodeInterface; symbols: string[] }> = {};

        // Helper: add a single edge
        const addEdge = (srcNode: NodeInterface, tgtNode: NodeInterface, sym: string) => {
            const key = `${srcNode.id}->${tgtNode.id}`;
            if (linkMap[key]) {
                if (!linkMap[key].symbols.includes(sym)) {
                    linkMap[key].symbols.push(sym);
                }
            } else {
                linkMap[key] = { source: srcNode, target: tgtNode, symbols: [sym] };
            }
        };

        for (const [srcName, trans] of Object.entries(transitions as Record<string, any>)) {
            const srcId = nameToId[srcName];
            const srcNode = importedNodes.find((n) => n.id === srcId);
            if (!srcNode) continue;

            for (const [sym, targets] of Object.entries(trans)) {
                // Normalize targets: DFA is single string, NFA is array
                const targetList: string[] = Array.isArray(targets) ? targets as string[] : [targets as string];
                for (const tgtName of targetList) {
                    const tgtId = nameToId[tgtName];
                    const tgtNode = importedNodes.find((n) => n.id === tgtId);
                    if (!tgtNode) continue;
                    addEdge(srcNode, tgtNode, sym);
                }
            }
        }

        for (const entry of Object.values(linkMap)) {
            importedLinks.push({
                source: entry.source,
                target: entry.target,
                transition: entry.symbols.join(','),
            });
        }

        setNodes(importedNodes);
        setLinks(importedLinks);
        setInputString('');

        // If NFA, also populate the NFA data structure for simulation + conversion
        if (isNFA) {
            const nfaStates = (stateNames as string[]).map((name) => ({
                id: nameToId[name],
                isFinal: acceptSet.has(name),
            }));
            const nfaTransitions: { from: number; to: number; symbol: string | null }[] = [];
            for (const [srcName, trans] of Object.entries(transitions as Record<string, any>)) {
                const srcId = nameToId[srcName];
                for (const [sym, targets] of Object.entries(trans)) {
                    const targetList: string[] = Array.isArray(targets) ? targets as string[] : [targets as string];
                    for (const tgtName of targetList) {
                        const tgtId = nameToId[tgtName];
                        if (tgtId === undefined) continue;
                        // Use null symbol for epsilon (symbol 'ε' in JSON)
                        const internalSym = sym === EPSILON_SYMBOL || sym === 'ε' || sym === 'epsilon'
                            ? null
                            : sym;
                        nfaTransitions.push({ from: srcId, to: tgtId, symbol: internalSym });
                    }
                }
            }
            setNfaData({
                states: nfaStates,
                startState: nameToId[start],
                acceptStates: (accept as string[]).map((a) => nameToId[a]),
                transitions: nfaTransitions,
                alphabet: jsonAlphabet || alphabet,
            });
            setAutomatonMode('NFA');
        } else {
            setNfaData(null);
            setAutomatonMode('DFA');
        }

        const headerLabel = isNFA
            ? `JSON NFA (${(stateNames as string[]).length} states)`
            : `JSON (${(stateNames as string[]).length} states)`;

        const data = {
            regex: headerLabel,
            nodes: importedNodes,
            links: importedLinks,
            alphabet: jsonAlphabet || alphabet,
        };
        setIsFetching(true);
        const dfaData = await addDfaToIdb(data);
        await getInputsFromIdb();
        setSelectedInput(dfaData.id);
        setRegexHeader(headerLabel);
        setIsFetching(false);
    };

    const getInputsFromIdb = async () => {
        setIsFetching(true);
        const all = await fetchDfaFromIdb();
        setInputs(all);
        setIsFetching(false);
    };

    const handleRegexClick = async (id: number, regex: string) => {
        setStringChecker(null);
        setSelectedInput(id);
        const dfaData = await getDfaFromIdb(id);
        setNodes(dfaData?.nodes || []);
        setLinks(dfaData?.links || []);
        setRegexHeader(dfaData ? regex : '');
        if (dfaData?.alphabet) {
            setAlphabet(dfaData.alphabet);
            setAlphabetInput(dfaData.alphabet.join(','));
        }
    };

    const initialize = async () => {
        await getInputsFromIdb();
        if (paramsRegex && validateRegex(paramsRegex) === '') {
            const inferredFromParams = inferAlphabet(paramsRegex);
            const paramsAlphabet = inferredFromParams.length > 0 ? inferredFromParams : alphabet;
            if (inferredFromParams.length > 0) {
                setAlphabet(inferredFromParams);
                setAlphabetInput(inferredFromParams.join(','));
            }
            const parser = new Parser(autoInsertConcat(paramsRegex, paramsAlphabet), paramsAlphabet);
            const firstPos = parser.firstPos;
            const followPos = parser.followPos;
            const { nodes, links } = generateNodesAndLinks(firstPos, followPos);
            setNodes(nodes);
            setLinks(links);
            testLog(nodes, links, followPos);
            setRegexHeader(paramsRegex);
        }
    };

    useEffect(() => {
        const key = 'version_1';
        if (!localStorage.getItem(key)) {
            localStorage.setItem(key, 'true');
            deleteAllDfaFromIdb();
        }
        if (selectedInput?.regex) {
            setSelectedRegex(selectedInput.regex);
            setRegexHeader(selectedInput.regex);
        }
    }, [selectedInput]);

    useEffect(() => {
        initialize();
    }, []);

    // Re-validate the input whenever the alphabet changes, so a stale error
    // from a previous alphabet state doesn't keep the submit button disabled.
    useEffect(() => {
        if (!inputString || inputMode === 'json' || inputMode === 'nfa') return;
        const error =
            inputMode === 'constraint'
                ? validateConstraint(inputString)
                : validateRegex(inputString);
        if (error) {
            setIsInputValid(false);
            setRegexError(error);
        } else {
            setIsInputValid(true);
            setRegexError('');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [alphabet]);

    useEffect(() => {
        const handleClick = (e) => {
            if (
                dropRef.current &&
                !dropRef.current.contains(e.target) &&
                dropBtnRef.current &&
                !dropBtnRef.current.contains(e.target)
            ) {
                setShowAppsDropdown(false);
            }
        };

        document.addEventListener('click', handleClick);

        return () => {
            document.removeEventListener('click', handleClick);
        };
    }, []);

    return (
        <div className="side-panel">
            <CSSTransition
                in={show}
                timeout={300}
                classNames="slide"
                unmountOnExit
            >
                <div
                    id="side-panel"
                    className="flex flex-col gap-3 absolute top-0 left-0 py-2 px-3 w-[210px] h-full bg-gray-50 z-10"
                >
                    <div className="flex flex-col w-full text-sky-500 mt-10">
                        <h1 className="flex items-center justify-between text-md font-bold px-2 mt-5">
                            <div className="flex items-center gap-2">
                                <img
                                    src="/favicon.svg"
                                    alt="favicon"
                                    className="w-6 h-6"
                                />
                                <span>Regex to DFA</span>
                            </div>
                            {/* <button
                                ref={dropBtnRef}
                                onClick={() =>
                                    setShowAppsDropdown(!showAppsDropdown)
                                }
                                className="rounded-full hover:bg-black/[.05] transition duration-200"
                            >
                                <Icon path={mdiChevronDown} size={1} />
                            </button> */}
                        </h1>
                    </div>
                    {selectedApp === 0 && (
                        <div className="">
                            <div className="mb-2">
                                <label className="text-xs text-gray-400 mb-1 block">
                                    Alphabet {inputMode === 'regex' ? '(auto-inferred)' : '(comma-separated)'}
                                </label>
                                <input
                                    value={alphabetInput}
                                    type="text"
                                    placeholder="a,b"
                                    className="rounded-md w-full p-2 text-sm border border-gray-200 focus:outline-none focus:border-sky-500"
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setAlphabetInput(val);
                                        const parsed = val
                                            .split(',')
                                            .map((s) => s.trim())
                                            .filter((s) => s.length === 1);
                                        if (parsed.length >= 1) {
                                            setAlphabet(parsed);
                                        }
                                    }}
                                />
                            </div>
                            <div className="mb-2 flex gap-1">
                                <button
                                    id="regex-mode-button"
                                    type="button"
                                    onClick={() => { setInputMode('regex'); setInputString(''); setRegexError(''); setIsInputValid(true); }}
                                    className={`flex-1 py-1 text-xs rounded-md border transition ${
                                        inputMode === 'regex'
                                            ? 'bg-sky-500 text-white border-sky-500'
                                            : 'bg-white text-gray-500 border-gray-200 hover:border-sky-400'
                                    }`}
                                >
                                    Regex
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setInputMode('constraint'); setInputString(''); setRegexError(''); setIsInputValid(true); }}
                                    className={`flex-1 py-1 text-xs rounded-md border transition ${
                                        inputMode === 'constraint'
                                            ? 'bg-sky-500 text-white border-sky-500'
                                            : 'bg-white text-gray-500 border-gray-200 hover:border-sky-400'
                                    }`}
                                >
                                    Constraint
                                </button>
                                <button
                                    id="json-mode-button"
                                    type="button"
                                    onClick={() => { setInputMode('json'); setInputString(''); setRegexError(''); setIsInputValid(true); }}
                                    className={`flex-1 py-1 text-xs rounded-md border transition ${
                                        inputMode === 'json'
                                            ? 'bg-sky-500 text-white border-sky-500'
                                            : 'bg-white text-gray-500 border-gray-200 hover:border-sky-400'
                                    }`}
                                >
                                    JSON
                                </button>
                                <button
                                    id="nfa-mode-button"
                                    type="button"
                                    onClick={() => { setInputMode('nfa'); setInputString(''); setRegexError(''); setIsInputValid(true); }}
                                    className={`flex-1 py-1 text-xs rounded-md border transition ${
                                        inputMode === 'nfa'
                                            ? 'bg-amber-500 text-white border-amber-500'
                                            : 'bg-white text-gray-500 border-gray-200 hover:border-amber-400'
                                    }`}
                                >
                                    NFA
                                </button>
                            </div>
                            {inputMode === 'json' ? (
                                <div className="flex flex-col gap-2">
                                    <textarea
                                        id="json-input"
                                        value={inputString}
                                        placeholder={'{\n  "alphabet": ["a","b"],\n  "states": ["q1","q2"],\n  "start": "q1",\n  "accept": ["q2"],\n  "transitions": {\n    "q1": {"a":"q2","b":"q1"},\n    "q2": {"a":"q1","b":"q2"}\n  }\n}'}
                                        className="rounded-md w-full p-2 text-xs border border-gray-200 focus:outline-none focus:border-sky-500 font-mono"
                                        rows={8}
                                        onChange={handleInputChange}
                                    />
                                    <button
                                        type="button"
                                        onClick={handleSubmit}
                                        className={`rounded-md p-2 bg-sky-500 text-white hover:bg-sky-600 transition duration-200 text-sm
                                                ${disableInputButton && 'cursor-no-drop'}`}
                                        disabled={disableInputButton}
                                    >
                                        Import JSON
                                    </button>
                                    <label className="text-xs text-gray-400 cursor-pointer hover:text-sky-500 transition text-center">
                                        or upload a .json file
                                        <input
                                            type="file"
                                            accept=".json"
                                            className="hidden"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (!file) return;
                                                const reader = new FileReader();
                                                reader.onload = (ev) => {
                                                    setInputString(ev.target?.result as string || '');
                                                };
                                                reader.readAsText(file);
                                            }}
                                        />
                                    </label>
                                </div>
                            ) : (
                            <form
                                onSubmit={handleSubmit}
                                className="flex items-stretch"
                            >
                                <input
                                    id="regex-input"
                                    value={inputString}
                                    type="text"
                                    placeholder={inputMode === 'constraint' ? '!contains(bb) && endsWith(a)' : inputMode === 'nfa' ? 'ab*|ba (builds NFA)' : apps[selectedApp].placeholder}
                                    className="rounded-l-md w-full p-2 border border-gray-200 focus:outline-none focus:border-sky-500"
                                    onChange={handleInputChange}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            handleSubmit(e);
                                        }
                                    }}
                                />
                                <button
                                    type="submit"
                                    className={`rounded-r-md p-2 bg-sky-500 text-white hover:bg-sky-600 transition duration-200
                                            ${disableInputButton && 'cursor-no-drop'}`}
                                    disabled={disableInputButton}
                                >
                                    <Icon
                                        path={mdiRocketLaunchOutline}
                                        size={1}
                                    />
                                </button>
                            </form>
                            )}
                            {selectedApp === 0 && !isInputValid && (
                                <p className="text-red-500 text-xs px-2 pt-2">
                                    {regexError}
                                </p>
                            )}
                            {/* {selectedApp === 1 && (
                                <div className="p-1 h-[35px]">
                                    {!selectedRegex ? (
                                        <p className="text-sky-500 text-xs">
                                            Please select a regex to check the
                                            string.
                                        </p>
                                    ) : !isInputValid ? (
                                        <p className="text-red-500 text-xs">
                                            Only alphabetic characters are
                                            allowed.
                                        </p>
                                    ) : stringChecker === null ? (
                                        <p className="text-sky-500 text-xs">
                                            {inputString.trim() === '' &&
                                                'Please enter a string for validation'}
                                        </p>
                                    ) : stringChecker === true ? (
                                        <p className="text-green-500 text-xs flex gap-1">
                                            <Icon
                                                path={mdiCheckCircleOutline}
                                                size={0.8}
                                            />
                                            {`The provided string is valid for ${selectedRegex}`}
                                        </p>
                                    ) : (
                                        <p className="text-red-500 text-xs flex gap-1">
                                            <Icon
                                                path={mdiCloseCircleOutline}
                                                size={0.8}
                                            />
                                            {`The provided string is not valid for ${selectedRegex}`}
                                        </p>
                                    )}
                                </div>
                            )} */}
                        </div>
                    )}

                    <div className="grow flex flex-col gap-3 w-full mt-[1rem] [2rem] text-gray-500 overflow-y-auto">
                        {categorizedInputs.map(
                            (item, index) =>
                                item.inputs.length > 0 && (
                                    <div
                                        className="flex flex-col gap-1 w-full"
                                        key={`${index}-${item.title}`}
                                    >
                                        <h1 className="text-xs text-sky-500">
                                            {item.title}
                                        </h1>
                                        {item.inputs.map((input) => (
                                            <SidePanelItem
                                                isAnimating={isAnimating}
                                                key={input.id}
                                                input={input}
                                                handleRegexClick={
                                                    handleRegexClick
                                                }
                                                selectedInput={selectedInput}
                                                getInputsFromIdb={
                                                    getInputsFromIdb
                                                }
                                            />
                                        ))}
                                    </div>
                                )
                        )}
                        {inputs.length === 0 && (
                            <h1 className="text-sky-500 text-sm grow flex items-center justify-center">
                                No inputs yet
                            </h1>
                        )}
                    </div>
                </div>
            </CSSTransition>
        </div>
    );
}

export default SidePanel;
