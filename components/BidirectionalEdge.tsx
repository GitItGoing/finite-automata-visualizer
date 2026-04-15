import React from 'react';
import {
    BaseEdge,
    EdgeProps,
    EdgeLabelRenderer,
} from 'reactflow';

export type GetSpecialPathParams = {
    sourceX: number;
    sourceY: number;
    targetX: number;
    targetY: number;
};

export const getSpecialPath = (
    { sourceX, sourceY, targetX, targetY }: GetSpecialPathParams,
    offset: number
) => {
    const centerX = (sourceX + targetX) / 2;
    const centerY = (sourceY + targetY) / 2;

    return `M ${sourceX} ${sourceY} Q ${centerX} ${centerY + offset} ${targetX} ${targetY}`;
};

export default function BiDirectionalEdge({
    source,
    target,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    markerEnd,
    label,
    data,
    style,
}: EdgeProps) {
    const active = data?.active || false;
    const color = (style as any)?.stroke || data?.color || '#4a5568';

    const edgePathParams = {
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
    };

    // Compute a curve offset perpendicular to the edge direction.
    // For the two edges of a bidirectional pair, the offset alternates sign
    // so the two arcs bow outward in opposite directions.
    const dx = targetX - sourceX;
    const dy = targetY - sourceY;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const magnitude = Math.max(40, dist * 0.25);
    // Alternate offset sign based on source/target ordering so the paired
    // edges do not overlap.
    const sign = source < target ? 1 : -1;
    const offset = sign * magnitude;

    const path = getSpecialPath(edgePathParams, offset);

    // Place label near the control point
    const labelX = (sourceX + targetX) / 2;
    const labelY = (sourceY + targetY) / 2 + offset / 2;

    return (
        <>
            <BaseEdge path={path} markerEnd={markerEnd} style={{ strokeWidth: 1.5, stroke: color }} />
            <EdgeLabelRenderer>
                <p
                    style={{
                        position: 'absolute',
                        transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                        backgroundColor: color,
                        color: '#fff',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        padding: '2px 10px',
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
