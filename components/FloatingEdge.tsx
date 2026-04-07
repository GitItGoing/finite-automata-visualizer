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

    // Compute centroid of all nodes to determine "outward" direction
    const centroid = useStore(
        useCallback((store) => {
            let cx = 0, cy = 0, count = 0;
            store.nodeInternals.forEach((node) => {
                if (node.positionAbsolute) {
                    cx += node.positionAbsolute.x + (node.width || 0) / 2;
                    cy += node.positionAbsolute.y + (node.height || 0) / 2;
                    count++;
                }
            });
            return count > 0 ? { x: cx / count, y: cy / count } : { x: 0, y: 0 };
        }, [])
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

        // Perpendicular direction vectors (two options: left or right of the edge)
        const perpX = -dy / dist;
        const perpY = dx / dist;

        // Edge midpoint
        const edgeMidX = (sx + tx) / 2;
        const edgeMidY = (sy + ty) / 2;

        // Pick the perpendicular direction that points away from the graph centroid
        const candidateX = edgeMidX + perpX * curvatureOffset;
        const candidateY = edgeMidY + perpY * curvatureOffset;
        const altX = edgeMidX - perpX * curvatureOffset;
        const altY = edgeMidY - perpY * curvatureOffset;

        const distCandidate = (candidateX - centroid.x) ** 2 + (candidateY - centroid.y) ** 2;
        const distAlt = (altX - centroid.x) ** 2 + (altY - centroid.y) ** 2;

        // Choose the control point farther from centroid (curves outward)
        const mx = distCandidate >= distAlt ? candidateX : altX;
        const my = distCandidate >= distAlt ? candidateY : altY;

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
            <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={{ strokeWidth: 1.5 }} />
            <EdgeLabelRenderer>
                <p
                    style={{
                        position: 'absolute',
                        transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                        backgroundColor: '#4a5568',
                        color: '#fff',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        padding: isTransitionMoreThanOne()
                            ? '4px 8px'
                            : '2px 10px',
                        borderRadius: '12px',
                        boxShadow: active
                            ? '0 0 150px 7px #fff, 0 0 10px 5px #0ff, 0 0 25px 12px #0ff'
                            : '0 1px 3px rgba(0,0,0,0.2)',
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
