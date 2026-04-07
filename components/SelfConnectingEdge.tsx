import React from 'react';
import { BaseEdge, EdgeLabelRenderer, EdgeProps } from 'reactflow';
import FloatingEdge from './FloatingEdge';

export default function SelfConnecting(props: EdgeProps) {
    if (props.source !== props.target) {
        return <FloatingEdge {...props} />;
    }

    const { sourceX, sourceY, targetX, targetY, id, markerEnd, label, data } =
        props;
    const active = data?.active || false;
    const radiusX = (sourceX - targetX) * 0.6;
    const radiusY = 50;
    const edgePath = `M ${sourceX} ${sourceY} A ${radiusX} ${radiusY} 0 1 0 ${targetX} ${targetY}`;

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
                        transform: `translate(-50%, -50%) translate(${(sourceX + targetX) / 2}px,${sourceY + 75}px)`,
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
