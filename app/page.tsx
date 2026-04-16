'use client';

import { useState, useRef, useEffect, useCallback, Suspense } from 'react';
import { NodeInterface, LinkInterface, AutomatonMode } from '../interfaces/graph';
import { NFA } from '../interfaces/nfa';
import DFA from '../components/DFA';
import SidePanel from '../components/SidePanel';
import LegendPanel from '../components/LegendPanel';
import WelcomeModal from '../components/WelcomeModal';

import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { demoSelectedRegex } from '../constants/demo';

import { minimizeDFA } from '../utils/minimize';
import { simulateNFA } from '../utils/nfaSimulation';
import { nfaToDFA } from '../utils/subsetConstruction';
import { EPSILON_SYMBOL } from '../constants/nfa';

import Icon from '@mdi/react';
import {
    mdiRocketLaunchOutline,
    mdiExport,
    mdiCloseCircleOutline,
    mdiCheckCircleOutline,
    mdiSquare,
    mdiUndo,
    mdiRedo,
} from '@mdi/js';

const mobileScreen = 640;
const laptopScreen = 1280;

export default function Page() {
    const [nodes, setNodes] = useState<NodeInterface[]>([]);
    const [links, setLinks] = useState<LinkInterface[]>([]);
    const [showSidePanel, setShowSidePanel] = useState<boolean>(false);
    const [showLegendPanel, setShowLegendPanel] = useState<boolean>(false);
    const [regexHeader, setRegexHeader] = useState<string>('');
    const [stringInput, setStringInput] = useState<string>('');
    const [inputMessageIndex, setInputMessageIndex] = useState<number | null>(
        null
    );
    const [blinkSidePanel, setBlinkSidePanel] = useState<boolean>(false);
    const [isAnimating, setIsAnimating] = useState<boolean>(false);
    const [animationSpeed, setAnimationSpeed] = useState<number>(2);
    const [blinkAnimationButton, setBlinkAnimationButton] =
        useState<boolean>(false);

    const [isRunningDemo, setIsRunningDemo] = useState<boolean>(false);
    const [demoString, setDemoString] = useState<string>('');

    const sidePanelRef = useRef<HTMLDivElement>(null);
    const legendPanelRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const [animationLastIndex, setAnimationLastIndex] = useState<number>();

    const [showWelcomeModal, setShowWelcomeModal] = useState<boolean>(false);
    const [useQNotation, setUseQNotation] = useState<boolean>(false);
    const [useDoubleRing, setUseDoubleRing] = useState<boolean>(false);
    const [colorEdges, setColorEdges] = useState<boolean>(true);
    const [darkMode, setDarkMode] = useState<boolean>(false);
    const [alphabet, setAlphabet] = useState<string[]>(['a', 'b']);
    const [automatonMode, setAutomatonMode] = useState<AutomatonMode>('DFA');
    const [nfaData, setNfaData] = useState<NFA | null>(null);

    // Undo/Redo history stack
    interface HistoryEntry {
        nodes: NodeInterface[];
        links: LinkInterface[];
        regex: string;
    }
    const undoStack = useRef<HistoryEntry[]>([]);
    const redoStack = useRef<HistoryEntry[]>([]);

    const pushHistory = useCallback(() => {
        undoStack.current.push({
            nodes: JSON.parse(JSON.stringify(nodes)),
            links: JSON.parse(JSON.stringify(links)),
            regex: regexHeader,
        });
        redoStack.current = [];
    }, [nodes, links, regexHeader]);

    const handleUndo = useCallback(() => {
        if (undoStack.current.length === 0) return;
        redoStack.current.push({
            nodes: JSON.parse(JSON.stringify(nodes)),
            links: JSON.parse(JSON.stringify(links)),
            regex: regexHeader,
        });
        const prev = undoStack.current.pop()!;
        setNodes(prev.nodes);
        setLinks(prev.links);
        setRegexHeader(prev.regex);
    }, [nodes, links, regexHeader]);

    const handleRedo = useCallback(() => {
        if (redoStack.current.length === 0) return;
        undoStack.current.push({
            nodes: JSON.parse(JSON.stringify(nodes)),
            links: JSON.parse(JSON.stringify(links)),
            regex: regexHeader,
        });
        const next = redoStack.current.pop()!;
        setNodes(next.nodes);
        setLinks(next.links);
        setRegexHeader(next.regex);
    }, [nodes, links, regexHeader]);

    // Edge deletion dialog state
    const [deleteDialog, setDeleteDialog] = useState<{
        sourceId: number;
        targetId: number;
        transition: string;
    } | null>(null);

    // Node selection for adding arrows
    const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);

    // Add arrow dialog state
    const [addArrowDialog, setAddArrowDialog] = useState<{
        fromId: number;
        toId: number;
    } | null>(null);

    const handleEdgeClick = useCallback((sourceId: number, targetId: number, transition: string) => {
        if (isAnimating) return;
        setDeleteDialog({ sourceId, targetId, transition });
    }, [isAnimating]);

    const handleDeleteEdge = useCallback(() => {
        if (!deleteDialog) return;
        pushHistory();
        const { sourceId, targetId } = deleteDialog;
        setLinks((prev) =>
            prev.filter(
                (link) =>
                    !(link.source.id === sourceId && link.target.id === targetId)
            )
        );
        if (regexHeader && !regexHeader.endsWith(' (edited)')) {
            setRegexHeader(regexHeader + ' (edited)');
        }
        setDeleteDialog(null);
    }, [deleteDialog, pushHistory, regexHeader]);

    const handleNodeTap = useCallback((nodeId: number) => {
        if (isAnimating) return;
        if (selectedNodeId === null) {
            setSelectedNodeId(nodeId);
        } else {
            setAddArrowDialog({ fromId: selectedNodeId, toId: nodeId });
            setSelectedNodeId(null);
        }
    }, [isAnimating, selectedNodeId]);

    const handleAddArrow = useCallback((direction: 'forward' | 'reverse' | 'both', symbols: string[]) => {
        if (!addArrowDialog) return;
        pushHistory();
        const { fromId, toId } = addArrowDialog;
        const transition = symbols.join(',');

        const addLink = (src: number, tgt: number) => {
            const sourceNode = nodes.find((n) => n.id === src);
            const targetNode = nodes.find((n) => n.id === tgt);
            if (!sourceNode || !targetNode) return;

            const existing = links.find(
                (l) => l.source.id === src && l.target.id === tgt
            );
            if (existing) {
                // Merge transitions, deduplicating
                const allSyms = existing.transition.split(',').concat(symbols);
                const unique: Record<string, boolean> = {};
                allSyms.forEach((s) => { unique[s] = true; });
                const mergedTransition = Object.keys(unique).join(',');
                setLinks((prev) =>
                    prev.map((l) =>
                        l.source.id === src && l.target.id === tgt
                            ? { ...l, transition: mergedTransition }
                            : l
                    )
                );
            } else {
                setLinks((prev) => [
                    ...prev,
                    { source: sourceNode, target: targetNode, transition },
                ]);
            }
        };

        if (direction === 'forward' || direction === 'both') {
            addLink(fromId, toId);
        }
        if (direction === 'reverse' || direction === 'both') {
            addLink(toId, fromId);
        }

        if (regexHeader && !regexHeader.endsWith(' (edited)')) {
            setRegexHeader(regexHeader + ' (edited)');
        }
        setAddArrowDialog(null);
    }, [addArrowDialog, nodes, links, pushHistory, regexHeader]);

    const nodeDisplayName = (id: number): string => {
        if (id === -1) return 'Dead State';
        if (id === 1) return useQNotation ? 'q1' : `State ${id} (Start)`;
        return useQNotation ? `q${nodes.findIndex((n) => n.id === id) + 1}` : `State ${id}`;
    };

    const handleMinimize = useCallback(() => {
        if (nodes.length === 0) return;
        pushHistory();
        const result = minimizeDFA(nodes, links);
        setNodes(result.nodes);
        setLinks(result.links);
    }, [nodes, links, pushHistory]);

    const handleConvertToDFA = useCallback(() => {
        if (!nfaData) return;
        pushHistory();
        const result = nfaToDFA(nfaData);
        setNodes(result.nodes);
        setLinks(result.links);
        setAlphabet(result.alphabet);
        setAutomatonMode('DFA');
        setNfaData(null);
        if (regexHeader && !regexHeader.endsWith(' (DFA)')) {
            setRegexHeader(regexHeader + ' (DFA)');
        }
    }, [nfaData, pushHistory, regexHeader]);

    const handleExportJSON = useCallback(() => {
        if (nodes.length === 0) return;

        const stateLabel = (id: number) => {
            if (id === -1) return 'dead';
            const n = nodes.find((x) => x.id === id);
            if (!n) return `q${id}`;
            const i = nodes.indexOf(n);
            return `q${i + 1}`;
        };

        const stateNames = nodes.map((n) => stateLabel(n.id));
        const startNode = nodes.find((n) => n.id === 1);
        const startName = startNode ? stateLabel(startNode.id) : stateNames[0];
        const acceptNames = nodes
            .filter((n) => n.isFinalState)
            .map((n) => stateLabel(n.id));

        const isNFA = automatonMode === 'NFA';

        // Structured (importable) format
        const transitions: Record<string, Record<string, any>> = {};
        for (const n of nodes) {
            transitions[stateLabel(n.id)] = {};
        }
        for (const link of links) {
            const srcName = stateLabel(link.source.id);
            const tgtName = stateLabel(link.target.id);
            const syms = link.transition.split(',');
            for (const sym of syms) {
                if (isNFA) {
                    // Array of targets (may have multiple for same symbol)
                    if (!transitions[srcName][sym]) transitions[srcName][sym] = [];
                    if (!transitions[srcName][sym].includes(tgtName)) {
                        transitions[srcName][sym].push(tgtName);
                    }
                } else {
                    // Single target
                    transitions[srcName][sym] = tgtName;
                }
            }
        }

        // Human-readable transition descriptions (for documentation)
        const descriptions: Record<string, string[]> = {};
        for (const n of nodes) {
            const label = stateLabel(n.id);
            const typeParts: string[] = [];
            if (n.id === 1) typeParts.push('start');
            if (n.isFinalState) typeParts.push('accepting');
            if (n.id === -1) typeParts.push('dead');
            if (typeParts.length === 0) typeParts.push('normal');

            const outgoing = links.filter((l) => l.source.id === n.id);
            const lines: string[] = [`type: ${typeParts.join(', ')}`];
            for (const link of outgoing) {
                const tgtLabel = stateLabel(link.target.id);
                for (const sym of link.transition.split(',')) {
                    if (link.source.id === link.target.id) {
                        lines.push(`if ${sym}, self-loops`);
                    } else {
                        lines.push(`if ${sym}, goes to ${tgtLabel}`);
                    }
                }
            }
            descriptions[label] = lines;
        }

        const result: Record<string, any> = {
            regex: regexHeader,
            ...(isNFA ? { type: 'NFA' } : {}),
            alphabet: alphabet,
            states: stateNames,
            start: startName,
            accept: acceptNames,
            transitions: transitions,
            // Human-readable summary; ignored on import
            description: descriptions,
        };

        const json = JSON.stringify(result, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${isNFA ? 'nfa' : 'dfa'}-${regexHeader.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }, [nodes, links, regexHeader, alphabet, automatonMode]);

    const disableAnimateInput = regexHeader.length === 0;

    const inputMessage = [
        {
            message: 'Only alphabetic characters are allowed.',
            icon: mdiCloseCircleOutline,
            color: 'red',
        },
        {
            message: `String '${stringInput}' is valid for ${regexHeader}`,
            icon: mdiCheckCircleOutline,
            color: 'green',
        },
        {
            message: `String '${stringInput}' is not valid for ${regexHeader}`,
            icon: mdiCloseCircleOutline,
            color: 'yellow',
        },
        {
            message: `Only alphabet symbols (${alphabet.join(', ')}) and e are allowed.`,
            icon: mdiCloseCircleOutline,
            color: 'red',
        },
    ];

    const isValidStringInput = (input: string) => {
        const regex = /^[a-zA-Z\s]*$/;
        return regex.test(input);
    };

    const disableAnimationButton =
        stringInput.length === 0 || isValidStringInput(stringInput) === false;

    const isValidStringFromSigma = (stringInput: string): boolean => {
        // Allow alphabet symbols and 'e' (epsilon / empty string)
        const allowed = new Set([...alphabet, 'e']);
        return stringInput.split('').every((ch) => allowed.has(ch));
    };

    const isValidRegex = (inputString: string): boolean => {
        const finalNode = nodes.some(
            (node) =>
                node.isFinalState === true && node.id === animationLastIndex
        );

        if (finalNode) {
            return true;
        } else {
            return false;
        }
    };

    const pause = (ms: number) => new Promise((res) => setTimeout(res, ms));

    const handleAnimate = async () => {
        if (!isValidStringInput(stringInput)) return;

        if (stringInput === 'e') {
            setAnimationLastIndex(1);
            return;
        }

        setIsAnimating(true);
        const nodesCopy = [...nodes];
        const linksCopy = [...links];
        const delay = 1000 / animationSpeed;

        if (automatonMode === 'NFA' && nfaData) {
            // --- NFA animation: multiple active states ---
            const { steps } = simulateNFA(
                nfaData.startState,
                nfaData.acceptStates,
                nfaData.transitions,
                stringInput
            );

            // Build mapping: NFA state id → rendering node id
            const nfaToNodeId = new Map<number, number>();
            nodes.forEach((n) => {
                if (n.values && n.values.length > 0) {
                    nfaToNodeId.set(n.values[0], n.id);
                }
            });

            for (let i = 0; i < steps.length; i++) {
                const step = steps[i];
                const activeNodeIds = new Set(
                    step.activeStates
                        .map((s) => nfaToNodeId.get(s))
                        .filter((id) => id !== undefined)
                );

                // Highlight active nodes
                const tempNodes = nodes.map((node) => ({
                    ...node,
                    active: activeNodeIds.has(node.id),
                }));
                setNodes(tempNodes);

                // Highlight traversed transitions
                if (step.activeTransitions.length > 0) {
                    const travKeys = new Set(
                        step.activeTransitions.map(
                            (t) => `${nfaToNodeId.get(t.from)}->${nfaToNodeId.get(t.to)}`
                        )
                    );
                    const tempLinks = links.map((link) => ({
                        ...link,
                        active: travKeys.has(`${link.source.id}->${link.target.id}`),
                    }));
                    setLinks(tempLinks);
                }

                await pause(delay);
                setNodes([...nodesCopy]);
                setLinks([...linksCopy]);
            }

            // Final: check if any active state is accepting
            const lastStep = steps[steps.length - 1];
            const finalAccepting = lastStep.activeStates.some((s) =>
                nfaData.acceptStates.includes(s)
            );
            setAnimationLastIndex(finalAccepting ? 1 : -999);
        } else {
            // --- DFA animation: single active state ---
            let currNode = 1;

            for (let i = 0; i < stringInput.length; i++) {
                const tempNodes = nodes.map((node) => ({
                    ...node,
                    active: node.id === currNode,
                }));
                setNodes(tempNodes);
                await pause(delay);
                setNodes([...nodesCopy]);

                const char = stringInput[i];
                let nextNode = null;
                const tempLinks = links.map((link) => {
                    const transitionSymbols = link.transition.split(',');
                    if (
                        link.source.id === currNode &&
                        transitionSymbols.includes(char)
                    ) {
                        nextNode = link.target.id;
                        return { ...link, active: true };
                    }
                    return link;
                });
                setLinks(tempLinks);
                await pause(delay);
                setLinks([...linksCopy]);

                currNode = nextNode;
            }

            const tempNodes = nodes.map((node) => ({
                ...node,
                active: node.id === currNode,
            }));
            setAnimationLastIndex(currNode);
            setNodes(tempNodes);
            await pause(delay);
            setNodes([...nodesCopy]);
        }

        setIsAnimating(false);
    };

    const closeKeyboard = () => {
        inputRef.current.blur();
    };

    const setAnInput = (e) => {
        setAnimationLastIndex(0);
        setStringInput(e.target.value.toLowerCase());
        setInputMessageIndex(null);
    };

    // watchers
    useEffect(() => {
        setInputMessageIndex(null);
        if (stringInput.length === 0) {
            return;
        }
        if (!isValidStringInput(stringInput)) {
            setInputMessageIndex(0);
            return;
        }
        if (!isValidStringFromSigma(stringInput)) {
            setInputMessageIndex(3);
            return;
        }
        if (animationLastIndex && isValidRegex(stringInput)) {
            setInputMessageIndex(1);
            return;
        }
        if (animationLastIndex && !isValidRegex(stringInput)) {
            setInputMessageIndex(2);
            return;
        }
    }, [animationLastIndex, stringInput, regexHeader]);

    // Keyboard shortcuts for undo/redo
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                handleUndo();
            } else if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
                e.preventDefault();
                handleRedo();
            } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
                e.preventDefault();
                handleRedo();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [handleUndo, handleRedo]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (
                sidePanelRef.current &&
                !sidePanelRef.current.contains(e.target as Node) &&
                window.innerWidth < laptopScreen
            ) {
                setShowSidePanel(false);
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    useEffect(() => {
        // const handleResize = () => {
        //     console.log('sheldon gwapo');

        // };
        // handleResize();
        // window.addEventListener('resize', handleResize);
        // return () => window.removeEventListener('resize', handleResize);
        setBlinkSidePanel(
            regexHeader.length === 0 && window.innerWidth < laptopScreen
        );
        if (window.innerWidth >= laptopScreen) {
            setShowSidePanel(true);
            setShowLegendPanel(true);
        } else {
            setShowSidePanel(false);
            setShowLegendPanel(false);
        }
    }, []);

    const runDemo = () => {
        const steps = [
            {
                element: '#info-button',
                popover: {
                    title: 'Toggle Info Panel',
                    description: 'This button toggles the info panel',
                    onNextClick: () => {
                        if (!showLegendPanel) {
                            setShowLegendPanel(true);
                            setTimeout(() => {
                                driverObj.moveNext();
                            }, 300);
                        } else {
                            driverObj.moveNext();
                        }
                    },
                },
            },
            {
                element: '#info-panel',
                popover: {
                    title: 'Info Panel',
                    description:
                        'This panel contains the legend and guidelines',
                    onNextClick: () => {
                        if (window.innerWidth <= mobileScreen) {
                            setShowLegendPanel(false);
                            setTimeout(() => {
                                driverObj.moveNext();
                            }, 300);
                        } else {
                            driverObj.moveNext();
                        }
                    },
                    onPrevClick: () => {
                        if (window.innerWidth <= laptopScreen) {
                            setShowLegendPanel(false);
                            setTimeout(() => {
                                driverObj.movePrevious();
                            }, 300);
                        } else {
                            driverObj.movePrevious();
                        }
                    },
                },
            },
            {
                element: '#side-panel-button',
                popover: {
                    title: 'Toggle Side Panel',
                    description: 'This button toggles the side panel',
                    onPrevClick: () => {
                        if (!showLegendPanel) {
                            setShowLegendPanel(true);
                            setTimeout(() => {
                                driverObj.movePrevious();
                            }, 100);
                        } else {
                            driverObj.movePrevious();
                        }
                    },
                    onNextClick: () => {
                        if (!showSidePanel) {
                            setShowSidePanel(true);
                            setTimeout(() => {
                                driverObj.moveNext();
                            }, 300);
                        } else {
                            driverObj.moveNext();
                        }
                    },
                },
                onDeselected: () => {
                    setBlinkSidePanel(false);
                },
            },
            {
                element: '#side-panel',
                popover: {
                    title: 'Side Panel',
                    description:
                        'This panel contains all your regex input, and add more regex',
                    onPrevClick: () => {
                        if (window.innerWidth <= mobileScreen) {
                            setShowSidePanel(false);
                            setTimeout(() => {
                                driverObj.movePrevious();
                            }, 300);
                        } else {
                            driverObj.movePrevious();
                        }
                    },
                },
            },
            {
                element: '#side-panel',
                popover: {
                    title: 'Regex Input',
                    description: "Let's input a regex!",
                    onNextClick: () => {
                        if (window.innerWidth <= mobileScreen) {
                            setShowSidePanel(false);
                            setTimeout(() => {
                                driverObj.moveNext();
                            }, 300);
                        } else {
                            driverObj.moveNext();
                        }
                    },
                },
                onHighlightStarted: () => {
                    setDemoString(demoSelectedRegex.regex);
                },
            },
            {
                element: '#main-page',
                popover: {
                    title: 'DFA graph',
                    description: 'WOAH! Look at that DFA graph!',
                    onPrevClick: () => {
                        if (window.innerWidth <= mobileScreen) {
                            setShowSidePanel(true);
                            setTimeout(() => {
                                driverObj.movePrevious();
                            }, 300);
                        } else {
                            driverObj.movePrevious();
                        }
                    },
                },
                onHighlightStarted: () => {
                    setRegexHeader(demoSelectedRegex.regex);
                    setNodes(demoSelectedRegex.nodes);
                    setLinks(demoSelectedRegex.links);
                },
            },
            {
                element: '#animation-input',
                popover: {
                    title: 'Input string animation',
                    description: 'Let us animate the string input!',
                },
                onHighlightStarted: () => {
                    setStringInput('baaaaba');
                },
            },
        ];
        const driverObj = driver({
            steps,
            popoverClass: 'pop-over-style',
            disableActiveInteraction: true,
            nextBtnText: 'Next',
            prevBtnText: 'Back',
            doneBtnText: 'Close',
            onDestroyStarted: () => {
                setIsRunningDemo(false);
                setDemoString('');
                setStringInput('baaaaba');
                setNodes(demoSelectedRegex.nodes);
                setLinks(demoSelectedRegex.links);
                setRegexHeader(demoSelectedRegex.regex);
                setBlinkAnimationButton(true);
                setBlinkSidePanel(false);
                driverObj.destroy();
            },
        });
        setIsRunningDemo(true);
        driverObj.drive();
    };

    useEffect(() => {
        const key = 'show_welcome';
        const value = JSON.parse(localStorage.getItem(key) || 'true');
        if (value) {
            setShowWelcomeModal(true);
        }
    }, []);

    return (
        <div
            id="main-page"
            className="flex justify-center items-center h-full min-w-screen"
            style={{
                filter: darkMode ? 'invert(1) hue-rotate(180deg)' : 'none',
                backgroundColor: darkMode ? '#fff' : undefined,
                minHeight: '100dvh',
            }}
        >
            <div className="flex flex-col items-center w-full h-full">
                <div className="relative w-full flex justify-center">
                    <h1 className="absolute top-5 text-sky-500 text-3xl font-bold z-10">
                        {regexHeader}
                    </h1>
                    <div className="absolute top-14 z-10 flex flex-wrap justify-center gap-2 px-2">
                        <button
                            onClick={() => setUseQNotation(!useQNotation)}
                            className={`px-3 py-1 rounded-full text-xs font-medium transition duration-200 border ${
                                useQNotation
                                    ? 'bg-sky-500 text-white border-sky-500'
                                    : 'bg-gray-50 text-gray-500 border-gray-300 hover:border-sky-400'
                            }`}
                        >
                            q-notation
                        </button>
                        <button
                            onClick={() => setUseDoubleRing(!useDoubleRing)}
                            className={`px-3 py-1 rounded-full text-xs font-medium transition duration-200 border ${
                                useDoubleRing
                                    ? 'bg-sky-500 text-white border-sky-500'
                                    : 'bg-gray-50 text-gray-500 border-gray-300 hover:border-sky-400'
                            }`}
                        >
                            double ring
                        </button>
                        <button
                            onClick={() => setColorEdges(!colorEdges)}
                            className={`px-3 py-1 rounded-full text-xs font-medium transition duration-200 border ${
                                colorEdges
                                    ? 'bg-sky-500 text-white border-sky-500'
                                    : 'bg-gray-50 text-gray-500 border-gray-300 hover:border-sky-400'
                            }`}
                        >
                            color edges
                        </button>
                        <button
                            onClick={() => setDarkMode(!darkMode)}
                            className={`px-3 py-1 rounded-full text-xs font-medium transition duration-200 border ${
                                darkMode
                                    ? 'bg-sky-500 text-white border-sky-500'
                                    : 'bg-gray-50 text-gray-500 border-gray-300 hover:border-sky-400'
                            }`}
                        >
                            dark mode
                        </button>
                        {automatonMode === 'DFA' ? (
                            <button
                                onClick={handleMinimize}
                                disabled={nodes.length === 0}
                                className="px-3 py-1 rounded-full text-xs font-medium transition duration-200 border bg-gray-50 text-gray-500 border-gray-300 hover:border-sky-400 disabled:opacity-30 disabled:cursor-not-allowed"
                                title="Minimize DFA using Table-Filling Method"
                            >
                                minimize
                            </button>
                        ) : (
                            <button
                                onClick={handleConvertToDFA}
                                disabled={!nfaData}
                                className="px-3 py-1 rounded-full text-xs font-medium transition duration-200 border bg-amber-50 text-amber-600 border-amber-300 hover:border-amber-500 disabled:opacity-30 disabled:cursor-not-allowed"
                                title="Convert NFA to DFA via subset construction"
                            >
                                NFA → DFA
                            </button>
                        )}
                        <button
                            onClick={handleExportJSON}
                            disabled={nodes.length === 0}
                            className="px-2 py-1 rounded-full text-xs font-medium transition duration-200 border bg-gray-50 text-gray-500 border-gray-300 hover:border-sky-400 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
                            title="Export DFA as JSON"
                        >
                            <Icon path={mdiExport} size={0.6} />
                            export
                        </button>
                        <div className="flex gap-1 ml-2">
                            <button
                                onClick={handleUndo}
                                disabled={undoStack.current.length === 0}
                                className="p-1 rounded-full border bg-gray-50 text-gray-500 border-gray-300 hover:border-sky-400 transition duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
                                title="Undo (Ctrl+Z)"
                            >
                                <Icon path={mdiUndo} size={0.7} />
                            </button>
                            <button
                                onClick={handleRedo}
                                disabled={redoStack.current.length === 0}
                                className="p-1 rounded-full border bg-gray-50 text-gray-500 border-gray-300 hover:border-sky-400 transition duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
                                title="Redo (Ctrl+Shift+Z)"
                            >
                                <Icon path={mdiRedo} size={0.7} />
                            </button>
                        </div>
                    </div>
                </div>
                {nodes && links && (
                    <DFA
                        nodes={nodes}
                        links={links}
                        useQNotation={useQNotation}
                        useDoubleRing={useDoubleRing}
                        colorEdges={colorEdges}
                        alphabet={alphabet}
                        onEdgeClick={handleEdgeClick}
                        onNodeClick={handleNodeTap}
                    />
                )}
                <section className="fixed bottom-3 w-full flex justify-center">
                    <div className="flex flex-col gap-2 w-[90%] max-w-[750px]">
                        <div
                            id="animation-input"
                            className="grow h-[50px] border flex items-stretch gap-3 pl-5 pr-2 py-2 rounded-full bg-gray-50"
                        >
                            <input
                                ref={inputRef}
                                value={stringInput}
                                onChange={setAnInput}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        closeKeyboard();
                                        handleAnimate();
                                    }
                                }}
                                className="grow min-w-[10px] outline-none bg-gray-50"
                                placeholder={
                                    !disableAnimateInput
                                        ? 'Enter string here'
                                        : 'Please select a regex'
                                }
                                disabled={disableAnimateInput}
                                type="text"
                            />
                            {!isAnimating ? (
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => {
                                            if (blinkAnimationButton) {
                                                setBlinkAnimationButton(false);
                                            }
                                            closeKeyboard();
                                            handleAnimate();
                                        }}
                                        className={`flex items-center gap-1 bg-sky-500 text-white px-2 rounded-full ${disableAnimateInput || disableAnimationButton || !isValidStringFromSigma(stringInput) ? 'cursor-not-allowed' : ''}
                                            ${blinkAnimationButton ? 'blink' : ''}`}
                                        disabled={
                                            disableAnimateInput ||
                                            disableAnimationButton ||
                                            !isValidStringFromSigma(stringInput)
                                        }
                                    >
                                        <Icon
                                            path={mdiRocketLaunchOutline}
                                            size={1}
                                        />
                                        Animate
                                    </button>
                                    <button
                                        onClick={() => {
                                            const temp =
                                                (animationSpeed + 1) % 6;
                                            setAnimationSpeed(
                                                temp === 0 ? 1 : temp
                                            );
                                        }}
                                        className="text-xs w-[32px] flex items-center justify-center rounded-full border-2 bg-sky-50 border-sky-500 text-sky-500 px-3"
                                    >
                                        {animationSpeed}X
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => {
                                        window.location.reload();
                                    }}
                                    className={`flex items-center gap-1 bg-sky-500 text-white px-2 rounded-full`}
                                >
                                    <Icon path={mdiSquare} size={0.6} />
                                    Stop
                                </button>
                            )}
                        </div>
                        <div className="flex px-5 gap-1 h-3 text-yellow-500">
                            {inputMessageIndex !== null && (
                                <div
                                    className={`flex items-center gap-1 text-sm text-${inputMessage[inputMessageIndex].color}-500`}
                                >
                                    <Icon
                                        path={
                                            inputMessage[inputMessageIndex].icon
                                        }
                                        size={0.6}
                                    />
                                    <p>
                                        {
                                            inputMessage[inputMessageIndex]
                                                .message
                                        }
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </section>
                <section ref={sidePanelRef}>
                    <button
                        id="side-panel-button"
                        className={`text-gray-800 absolute z-20 ml-2 mt-2.5 top-0 left-0 p-1 rounded-md hover:bg-black/[.05] transition duration-200 ${blinkSidePanel ? 'blink' : ''}`}
                        onClick={() => {
                            if (isRunningDemo) return;
                            setShowSidePanel(!showSidePanel);
                            if (blinkSidePanel) {
                                setBlinkSidePanel(false);
                            }
                        }}
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#0ea5e9"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <path d="M9 3v18" />
                        </svg>
                    </button>
                    <Suspense>
                        <SidePanel
                            isAnimating={isAnimating}
                            show={showSidePanel}
                            setNodes={setNodes}
                            setLinks={setLinks}
                            setRegexHeader={setRegexHeader}
                            demoString={demoString}
                            alphabet={alphabet}
                            setAlphabet={setAlphabet}
                            setAutomatonMode={setAutomatonMode}
                            setNfaData={setNfaData}
                        />
                    </Suspense>
                </section>
                <section ref={legendPanelRef}>
                    {showLegendPanel ? (
                        <i
                            id="info-button"
                            className="bx bx-exit text-sky-500 absolute z-[100] top-3 right-3 text-3xl cursor-pointer"
                            onClick={() => setShowLegendPanel(false)}
                        ></i>
                    ) : (
                        <i
                            id="info-button"
                            className="bx bx-info-circle text-sky-500 absolute z-[100] right-2 top-3 text-3xl cursor-pointer"
                            onClick={() => setShowLegendPanel(true)}
                        ></i>
                    )}
                    <LegendPanel show={showLegendPanel} alphabet={alphabet} />
                </section>
            </div>
            {showWelcomeModal && (
                <WelcomeModal
                    close={() => setShowWelcomeModal(false)}
                    runDemo={() => {
                        setShowWelcomeModal(false);
                        runDemo();
                    }}
                />
            )}

            {/* Selected node indicator */}
            {selectedNodeId !== null && (
                <div className="fixed top-2 left-1/2 -translate-x-1/2 z-50 bg-sky-500 text-white px-4 py-2 rounded-full text-sm flex items-center gap-2">
                    <span>Selected {nodeDisplayName(selectedNodeId)}. Tap another node to add an arrow.</span>
                    <button
                        onClick={() => setSelectedNodeId(null)}
                        className="ml-1 bg-white/20 rounded-full px-2 py-0.5 text-xs hover:bg-white/30"
                    >
                        Cancel
                    </button>
                </div>
            )}

            {/* Delete edge confirmation dialog */}
            {deleteDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm mx-4">
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">Delete Transition?</h3>
                        <p className="text-gray-600 text-sm mb-4">
                            Remove the <strong>{deleteDialog.transition}</strong> transition
                            from <strong>{nodeDisplayName(deleteDialog.sourceId)}</strong> to <strong>{nodeDisplayName(deleteDialog.targetId)}</strong>?
                        </p>
                        <div className="flex gap-2 justify-end">
                            <button
                                onClick={() => setDeleteDialog(null)}
                                className="px-4 py-2 rounded-md border border-gray-300 text-gray-600 text-sm hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteEdge}
                                className="px-4 py-2 rounded-md bg-red-500 text-white text-sm hover:bg-red-600"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add arrow dialog */}
            {addArrowDialog && (
                <AddArrowDialog
                    fromId={addArrowDialog.fromId}
                    toId={addArrowDialog.toId}
                    alphabet={alphabet}
                    onConfirm={handleAddArrow}
                    onCancel={() => setAddArrowDialog(null)}
                    nodeDisplayName={nodeDisplayName}
                    isNFA={automatonMode === 'NFA'}
                />
            )}
        </div>
    );
}

function AddArrowDialog({
    fromId,
    toId,
    alphabet,
    onConfirm,
    onCancel,
    nodeDisplayName,
    isNFA = false,
}: {
    fromId: number;
    toId: number;
    alphabet: string[];
    onConfirm: (direction: 'forward' | 'reverse' | 'both', symbols: string[]) => void;
    onCancel: () => void;
    nodeDisplayName: (id: number) => string;
    isNFA?: boolean;
}) {
    const [direction, setDirection] = useState<'forward' | 'reverse' | 'both'>('forward');
    const [selectedSymbols, setSelectedSymbols] = useState<Record<string, boolean>>({});
    const isSelfLoop = fromId === toId;

    const fromName = nodeDisplayName(fromId);
    const toName = nodeDisplayName(toId);

    const toggleSymbol = (sym: string) => {
        setSelectedSymbols((prev) => ({ ...prev, [sym]: !prev[sym] }));
    };

    const allSymbols = isNFA ? [...alphabet, EPSILON_SYMBOL] : alphabet;
    const chosenSymbols = allSymbols.filter((s) => selectedSymbols[s]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm mx-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                    {isSelfLoop ? 'Add Self-Loop' : 'Add Transition'}
                </h3>
                <p className="text-gray-600 text-sm mb-4">
                    {isSelfLoop
                        ? `Add a self-loop on ${fromName}`
                        : `Add a transition between ${fromName} and ${toName}`}
                </p>

                {!isSelfLoop && (
                    <div className="mb-3">
                        <label className="text-xs text-gray-500 block mb-1">Direction</label>
                        <div className="flex gap-2">
                            {(['forward', 'reverse', 'both'] as const).map((dir) => (
                                <button
                                    key={dir}
                                    onClick={() => setDirection(dir)}
                                    className={`px-3 py-1 rounded-full text-xs border transition ${
                                        direction === dir
                                            ? 'bg-sky-500 text-white border-sky-500'
                                            : 'bg-gray-50 text-gray-500 border-gray-300'
                                    }`}
                                >
                                    {dir === 'forward'
                                        ? `${fromName} → ${toName}`
                                        : dir === 'reverse'
                                          ? `${toName} → ${fromName}`
                                          : 'Both'}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <div className="mb-4">
                    <label className="text-xs text-gray-500 block mb-1">Symbols</label>
                    <div className="flex gap-2">
                        {allSymbols.map((sym) => (
                            <button
                                key={sym}
                                onClick={() => toggleSymbol(sym)}
                                className={`px-3 py-1 rounded-full text-sm border transition ${
                                    selectedSymbols[sym]
                                        ? 'bg-sky-500 text-white border-sky-500'
                                        : 'bg-gray-50 text-gray-500 border-gray-300'
                                }`}
                            >
                                {sym}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex gap-2 justify-end">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 rounded-md border border-gray-300 text-gray-600 text-sm hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onConfirm(isSelfLoop ? 'forward' : direction, chosenSymbols)}
                        disabled={chosenSymbols.length === 0}
                        className="px-4 py-2 rounded-md bg-sky-500 text-white text-sm hover:bg-sky-600 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        Add
                    </button>
                </div>
            </div>
        </div>
    );
}
