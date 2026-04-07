'use client';

import React, { useEffect } from 'react';
import ReactFlow, {
    Background,
    useNodesState,
    Edge,
    Node,
    MarkerType,
    ConnectionMode,
    EdgeTypes,
    NodeTypes,
    Handle,
    Position,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { NodeInterface, LinkInterface } from '../interfaces/graph';
import SelfConnectingEdge from './SelfConnectingEdge';
import FloatingEdge from './FloatingEdge';
import DFANode from './DFANode';
import BiDirectionalEdge from './BidirectionalEdge';
import { StateTypes } from '../constants/state';

interface PropsInterface {
    nodes: NodeInterface[];
    links: LinkInterface[];
    useQNotation?: boolean;
    useDoubleRing?: boolean;
    onEdgeClick?: (sourceId: number, targetId: number, transition: string) => void;
    onNodeClick?: (nodeId: number) => void;
}

function StartPointNode() {
    return (
        <div style={{ width: 1, height: 1 }}>
            <Handle
                id="startSource"
                type="source"
                position={Position.Right}
                style={{ background: 'transparent', border: 'none' }}
            />
        </div>
    );
}

const nodeTypes: NodeTypes = {
    dfa: DFANode,
    startPoint: StartPointNode,
};

const edgeTypes: EdgeTypes = {
    selfconnecting: SelfConnectingEdge,
    floating: FloatingEdge,
    bidirectional: BiDirectionalEdge,
};

const DFA = (props: PropsInterface) => {
    const { nodes, links, useQNotation = false, useDoubleRing = false, onEdgeClick, onNodeClick } = props;

    let bidirectionals = [];

    const checkNodeBidirectionality = (node: NodeInterface) => {
        const sources = links.filter((link) => {
            return link.source.id === node.id;
        });

        const targets = links.filter((link) => {
            return link.target.id === node.id;
        });

        if (sources.length === 0 || targets.length === 0) {
            return null;
        }

        let isBirectional = false;

        sources.forEach((sourceLink) => {
            targets.forEach((targetLink) => {
                if (
                    sourceLink.source.id === targetLink.target.id &&
                    sourceLink.target.id === targetLink.source.id &&
                    sourceLink.source.id !== targetLink.source.id &&
                    sourceLink.target.id !== targetLink.target.id
                ) {
                    if (!bidirectionals.includes(sourceLink)) {
                        bidirectionals.push(sourceLink);
                    }
                    if (!bidirectionals.includes(targetLink)) {
                        bidirectionals.push(targetLink);
                    }
                    isBirectional = true;
                }
            });
        });

        return isBirectional;
    };

    const checkLinkBidirectionality = (link: LinkInterface) => {
        if (bidirectionals.includes(link)) {
            return true;
        } else {
            return false;
        }
    };

    const nodeIndexMap = new Map<number, number>();
    nodes.forEach((node, index) => {
        nodeIndexMap.set(node.id, index);
    });

    const isBottomNode = (id: number) => {
        const index = nodeIndexMap.get(id) ?? 0;
        return Math.floor(index / 2) % 2 === 1;
    };

    const diagramNodes = nodes.map((node, index) => {
        const isBidirectional = checkNodeBidirectionality(node);

        const isFinalState = node.isFinalState;
        const isStartState = node.id === 1;
        const isDeadState = node.id === -1;

        const label = isFinalState
            ? StateTypes.FINAL
            : isStartState
              ? StateTypes.START
              : isDeadState
                ? StateTypes.DEAD
                : node.id.toString();

        const active = node?.active || false;

        return {
            id: node.id.toString(),
            data: {
                label,
                active,
                isBidirectional,
                useQNotation,
                useDoubleRing,
                qIndex: index + 1,
                isFinalState,
                isStartState,
                isDeadState,
            },
            position: {
                x: (index % 2) * 200,
                y: Math.floor(index / 2) * 200,
            },
            type: 'dfa',
        } as Node;
    });

    const diagramEdges = links.map((link) => {
        const targetNodeId = link.target.id;
        const sourceNodeId = link.source.id;

        const edgeId = `${link.transition}-(${sourceNodeId})-(${targetNodeId})`;

        const isSourceBottom = isBottomNode(sourceNodeId);
        const isTargetBottom = isBottomNode(targetNodeId);

        const isLoop = sourceNodeId === targetNodeId;
        const isBidirectional = checkLinkBidirectionality(link);

        const active = link?.active || false;

        const edgeType = isLoop
            ? 'selfconnecting'
            : isBidirectional
              ? 'bidirectional'
              : 'floating';

        const sourceHandle = isLoop
            ? 'selfConnectingSource'
            : isBidirectional
              ? !isSourceBottom
                  ? 'bidirectionalBottomSource'
                  : 'bidirectionalTopSource'
              : null;

        const targetHandle = isLoop
            ? 'selfConnectingTarget'
            : isBidirectional
              ? !isTargetBottom
                  ? 'bidirectionalBottomTarget'
                  : 'bidirectionalTopTarget'
              : null;

        return {
            id: edgeId,
            source: sourceNodeId.toString(),
            target: targetNodeId.toString(),
            sourceHandle,
            targetHandle,
            label: link.transition,
            type: edgeType,
            markerEnd: {
                type: MarkerType.ArrowClosed,
                width: 25,
                height: 25,
            },
            data: {
                active,
                isBidirectional,
                label: link.transition,
            },
            interactionWidth: 20,
        } as Edge;
    });

    // Add invisible start point node and arrow to the start state
    const startNode = nodes.find((n) => n.id === 1);
    const startNodeDiagram = diagramNodes.find((n) => n.id === '1');
    if (startNodeDiagram) {
        const startPointNode: Node = {
            id: '__start__',
            data: {},
            position: {
                x: startNodeDiagram.position.x - 60,
                y: startNodeDiagram.position.y + 37,
            },
            type: 'startPoint',
            draggable: false,
            selectable: false,
        };
        diagramNodes.unshift(startPointNode);

        const startEdge: Edge = {
            id: '__start_edge__',
            source: '__start__',
            target: '1',
            sourceHandle: 'startSource',
            type: 'floating',
            markerEnd: { type: MarkerType.ArrowClosed, width: 25, height: 25 },
            data: { active: false, label: '' },
        };
        diagramEdges.unshift(startEdge);
    }

    const [nodeState, setNodeState, onNodesChange] =
        useNodesState(diagramNodes);

    useEffect(() => {
        setNodeState(diagramNodes);
    }, [nodes, links, useQNotation, useDoubleRing]);

    const handleEdgeClick = (_event: React.MouseEvent, edge: Edge) => {
        if (edge.id === '__start_edge__' || !onEdgeClick) return;
        const sourceId = parseInt(edge.source);
        const targetId = parseInt(edge.target);
        onEdgeClick(sourceId, targetId, edge.data?.label || edge.label as string || '');
    };

    const handleNodeClick = (_event: React.MouseEvent, node: Node) => {
        if (node.id === '__start__' || !onNodeClick) return;
        onNodeClick(parseInt(node.id));
    };

    return (
        <div className="h-dvh w-full">
            <ReactFlow
                nodes={nodeState}
                nodeTypes={nodeTypes}
                onNodesChange={onNodesChange}
                edges={diagramEdges}
                edgeTypes={edgeTypes}
                connectionMode={ConnectionMode.Loose}
                onEdgeClick={handleEdgeClick}
                onNodeClick={handleNodeClick}
                fitView
            >
                <Background />
            </ReactFlow>
        </div>
    );
};

export default DFA;
