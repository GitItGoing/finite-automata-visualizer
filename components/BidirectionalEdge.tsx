import React from 'react';
import {
    getBezierPath,
    BaseEdge,
    useStore,
    EdgeProps,
    ReactFlowState,
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
}: EdgeProps) {
    const isBiDirectionEdge = useStore((s: ReactFlowState) => {
        const edgeExists = s.edges.some(
            (e) =>
                (e.source === target && e.target === source) ||
                (e.target === source && e.source === target)
        );
        return edgeExists;
    });

    const active = data?.active || false;

    const edgePathParams = {
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
    };

    let path = '';

    const calculateOffset = () => {
        if (sourceX < targetX) {
            return 40;
        }
        return -40;
    };

    if (isBiDirectionEdge) {
        path = getSpecialPath(edgePathParams, calculateOffset());
    } else {
        [path] = getBezierPath(edgePathParams);
    }

    return (
        <>
            <BaseEdge path={path} markerEnd={markerEnd} style={{ strokeWidth: 1.5 }} />
            <EdgeLabelRenderer>
                <p
                    style={{
                        position: 'absolute',
                        transform: `translate(-50%, -50%) translate(${(sourceX + targetX) / 2}px,${(sourceY + targetY + calculateOffset()) / 2}px)`,
                        backgroundColor: '#4a5568',
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
