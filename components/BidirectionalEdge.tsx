import React from 'react';
import {
    BaseEdge,
    EdgeProps,
    EdgeLabelRenderer,
} from 'reactflow';

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

    // Compute perpendicular offset so the curve always bows to the side,
    // even when nodes are vertically or horizontally aligned.
    const dx = targetX - sourceX;
    const dy = targetY - sourceY;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const magnitude = Math.max(40, dist * 0.25);
    const sign = source < target ? 1 : -1;

    // Perpendicular unit vector (rotated 90 degrees from the edge direction)
    const perpX = (-dy / dist) * magnitude * sign;
    const perpY = (dx / dist) * magnitude * sign;

    const midX = (sourceX + targetX) / 2;
    const midY = (sourceY + targetY) / 2;

    // Control point offset perpendicular to the edge, not just in Y
    const ctrlX = midX + perpX;
    const ctrlY = midY + perpY;

    const path = `M ${sourceX} ${sourceY} Q ${ctrlX} ${ctrlY} ${targetX} ${targetY}`;

    // Label at the bezier quarter-point (closer to the curve apex)
    const labelX = (sourceX + 2 * ctrlX + targetX) / 4;
    const labelY = (sourceY + 2 * ctrlY + targetY) / 4;

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
