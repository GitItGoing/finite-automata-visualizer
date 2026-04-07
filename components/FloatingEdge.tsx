'use client';

import { useCallback } from 'react';
import {
    useStore,
    EdgeProps,
    EdgeLabelRenderer,
    BaseEdge,
} from 'reactflow';
import { getEdgeParams } from '../utils/reactflow';

function FloatingEdge(props: EdgeProps) {
    const { id, source, target, markerEnd, label, data } = props;
    const active = data?.active || false;

    const sourceNode = useStore(
        useCallback((store) => store.nodeInternals.get(source), [source])
    );
    const targetNode = useStore(
        useCallback((store) => store.nodeInternals.get(target), [target])
    );

    if (!sourceNode || !targetNode) {
        return null;
    }

    const { sx, sy, tx, ty, sourcePos, targetPos } = getEdgeParams(
        sourceNode,
        targetNode
    );

    const isStartEdge = !label || (typeof label === 'string' && label.length === 0);

    let edgePath: string;
    let labelX: number;
    let labelY: number;

    if (isStartEdge) {
        // Straight arrow for the start indicator
        edgePath = `M ${sx} ${sy} L ${tx} ${ty}`;
        labelX = (sx + tx) / 2;
        labelY = (sy + ty) / 2;
    } else {
        // Add curvature offset so edges arc like in textbook diagrams
        const dx = tx - sx;
        const dy = ty - sy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const curvatureOffset = Math.max(30, dist * 0.25);
        // Perpendicular offset for the control point
        const mx = (sx + tx) / 2 + (-dy / dist) * curvatureOffset;
        const my = (sy + ty) / 2 + (dx / dist) * curvatureOffset;

        edgePath = `M ${sx} ${sy} Q ${mx} ${my} ${tx} ${ty}`;
        labelX = (sx + 2 * mx + tx) / 4;
        labelY = (sy + 2 * my + ty) / 4;
    }

    const isTransitionMoreThanOne = () => {
        if (data.label.length > 1) {
            return true;
        }

        return false;
    };

    return (
        <>
            <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} />
            <EdgeLabelRenderer>
                <p
                    style={{
                        position: 'absolute',
                        transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                        backgroundColor: '#8f94a1',
                        padding: isTransitionMoreThanOne()
                            ? '5px 6px'
                            : '1px 9px',
                        borderRadius: '50%',
                        boxShadow: active
                            ? '0 0 150px 7px #fff, 0 0 10px 5px #0ff, 0 0 25px 12px #0ff'
                            : 'none',
                    }}
                    className="nodrag nopan"
                >
                    {label}
                </p>
            </EdgeLabelRenderer>
        </>
    );
}

export default FloatingEdge;
