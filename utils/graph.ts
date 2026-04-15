import { NodeInterface, LinkInterface } from '../interfaces/graph';
import { FollowPosInterface } from '../interfaces/ast';

export const findNodeByTargetValues = (
    target: number[],
    nodes: NodeInterface[]
): NodeInterface => {
    for (const node of nodes) {
        if (node.values.length !== target.length) continue;
        const nodeSet = new Set(node.values);
        if (target.every((val) => nodeSet.has(val))) {
            return node;
        }
    }

    return null;
};

/** Extract the alphabet (unique symbols) from followpos, excluding '#' */
export const getAlphabet = (followpos: FollowPosInterface[]): string[] => {
    const seen: { [key: string]: boolean } = {};
    followpos.forEach((fp) => {
        if (fp.symbol !== '#') {
            seen[fp.symbol] = true;
        }
    });
    return Object.keys(seen).sort();
};

/**
 * For a given node, compute the followpos-union for each symbol in the alphabet.
 * Returns a map: symbol -> sorted array of position numbers.
 */
export const getNewNodesBySymbol = (
    currentNode: NodeInterface,
    followpos: FollowPosInterface[]
): Map<string, number[]> => {
    const result = new Map<string, number[]>();

    currentNode.values.forEach((value) => {
        const fp = followpos[value - 1];
        if (fp.symbol === '#') return;

        const existing = result.get(fp.symbol) || [];
        existing.push(...fp.followpos);
        // deduplicate
        result.set(fp.symbol, existing.filter((v, i, a) => a.indexOf(v) === i));
    });

    // sort each array
    result.forEach((arr, key) => {
        result.set(key, arr.sort((a, b) => a - b));
    });

    return result;
};

export const isArrayPresent = (
    target: number[],
    base: NodeInterface[]
): boolean => {
    const stringifiedTarget = JSON.stringify(target.sort());
    return base.some((node) => {
        const stringifiedValues = JSON.stringify(node.values.sort());
        return stringifiedValues === stringifiedTarget;
    });
};

export const generateLink = (
    source: NodeInterface,
    target: NodeInterface,
    transition: string
) => {
    return { source, target, transition };
};

export const generateNode = (
    id: number,
    values: number[],
    group: number,
    finalState: number
) => {
    return { id, values, group, isFinalState: values.includes(finalState) };
};

export const getNewValues = (
    potentialList: number[],
    followpos: FollowPosInterface[]
) => {
    let newValues = [];

    potentialList.forEach((id) => {
        const matchedFollowPos = followpos.find((value) => {
            return id === value.number;
        });

        if (matchedFollowPos) {
            newValues.push(...matchedFollowPos.followpos);
        }
    });

    return newValues.filter((item, index) => {
        return newValues.indexOf(item) === index;
    });
};

const checkDuplicateLink = (
    links: LinkInterface[],
    source: NodeInterface,
    target: NodeInterface
) => {
    const sourceId = source.id;
    const targetId = target.id;

    const duplicates = links.map((link, index) => {
        const existingSourceId = link.source.id;
        const existingTargetId = link.target.id;
        if (sourceId === existingSourceId && targetId === existingTargetId) {
            return index;
        } else {
            return;
        }
    });

    const filteredDuplicates = duplicates.filter(
        (element) => element !== undefined
    );

    if (filteredDuplicates.length === 0) {
        return null;
    } else {
        return filteredDuplicates;
    }
};

export const generateNodesAndLinks = (
    firstpos: number[],
    followpos: FollowPosInterface[]
) => {
    const finalState = followpos.find((data) => {
        return data.symbol === '#';
    }).number;

    const alphabet = getAlphabet(followpos);
    const allSymbolsLabel = alphabet.join(',');

    let nodes: NodeInterface[] = [
        { id: 1, values: firstpos, group: 1, isFinalState: false },
    ];

    if (nodes[0].values.includes(finalState)) {
        nodes[0].isFinalState = true;
    }

    let links: LinkInterface[] = [];
    let queue: NodeInterface[] = [...nodes];

    let deadState = null;

    let nodeCount = 2;

    const generateDeadState = () => {
        const deadStateId = -1;
        const newDeadState = generateNode(deadStateId, [], 1, finalState);
        deadState = newDeadState;
        nodes.push(deadState);
        const dead = generateLink(deadState, deadState, allSymbolsLabel);
        links.push(dead);
    };

    while (queue.length > 0) {
        const currentNode = queue.shift();

        const currentSymbol = followpos[currentNode.id - 1]?.symbol;

        const symbolMap = getNewNodesBySymbol(currentNode, followpos);

        const potentialNewNodes = [];

        for (const sym of alphabet) {
            const positions = symbolMap.get(sym);
            if (positions && positions.length > 0) {
                potentialNewNodes.push({
                    transition: sym,
                    list: positions,
                });
            } else if (currentSymbol !== '#') {
                if (deadState === null) {
                    generateDeadState();
                }
                const newLink = generateLink(currentNode, deadState, sym);
                links.push(newLink);
            }
        }

        potentialNewNodes.forEach((potential) => {
            if (isArrayPresent(potential.list, nodes)) {
                const targetNode = findNodeByTargetValues(
                    potential.list,
                    nodes
                );

                const duplicates = checkDuplicateLink(
                    links,
                    currentNode,
                    targetNode
                );

                if (duplicates !== null) {
                    duplicates.forEach((duplicateIndex) => {
                        const newTransition = `${potential.transition},${links[duplicateIndex].transition}`;
                        links[duplicateIndex].transition = newTransition;
                    });
                } else {
                    const newLink = generateLink(
                        currentNode,
                        targetNode,
                        potential.transition
                    );
                    links.push(newLink);
                }
            } else {
                const newNode = generateNode(
                    nodeCount,
                    potential.list,
                    1,
                    finalState
                );

                nodeCount += 1;
                nodes.push(newNode);
                queue.push(newNode);

                const duplicates = checkDuplicateLink(
                    links,
                    currentNode,
                    newNode
                );

                if (duplicates !== null) {
                    duplicates.forEach((duplicateIndex) => {
                        const newTransition = `${potential.transition},${links[duplicateIndex].transition}`;
                        links[duplicateIndex].transition = newTransition;
                    });
                } else {
                    const newLink = generateLink(
                        currentNode,
                        newNode,
                        potential.transition
                    );
                    links.push(newLink);
                }
            }
        });
    }

    // Ensure all final states have transitions for every symbol (completeness)
    const finalStateNodes = nodes.filter((node) => node.isFinalState);

    for (const finalStateNode of finalStateNodes) {
        const existingSymbols = new Set<string>();

        links.forEach((link) => {
            if (link.source === finalStateNode) {
                // Parse comma-separated transitions
                link.transition.split(',').forEach((s) => existingSymbols.add(s));
            }
        });

        const missingSymbols = alphabet.filter((s) => !existingSymbols.has(s));

        if (missingSymbols.length > 0) {
            if (deadState === null) {
                generateDeadState();
            }
            const newLink = generateLink(
                finalStateNode,
                deadState,
                missingSymbols.join(',')
            );
            links.push(newLink);
        }
    }

    return { nodes, links, alphabet };
};
