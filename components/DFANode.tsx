import React from 'react';
import { Handle, NodeProps, Position } from 'reactflow';

function DFANode(props: NodeProps) {
    const { data, id } = props;
    const label = data.label;
    const active = data.active;
    const useQNotation = data.useQNotation || false;
    const useDoubleRing = data.useDoubleRing || false;
    const qIndex = data.qIndex;
    const isFinalState = data.isFinalState || false;
    const isStartState = data.isStartState || false;
    const isDeadState = data.isDeadState || false;

    const displayLabel = useQNotation ? `q${qIndex}` : label;

    const getBorderColor = () => {
        if (useDoubleRing) return '2px solid black';
        if (isFinalState) return '2px solid green';
        if (isStartState) return '2px solid blue';
        if (isDeadState) return '2px solid red';
        return '2px solid black';
    };

    const getBackgroundColor = () => {
        if (useDoubleRing) {
            if (active) return '#FFFFA7';
            return '#C5C6D0';
        }
        if (isFinalState) return '#99EDC3';
        if (isStartState) return '#6CA0DC';
        if (isDeadState) return '#BC544D';
        if (label === 'PTR') return '#FFFFA7';
        return '#C5C6D0';
    };

    const nodeSize = 75;
    const innerSize = nodeSize - 14;

    return (
        <div
            style={{
                width: nodeSize,
                height: nodeSize,
                border: getBorderColor(),
                borderRadius: '50%',
                backgroundColor: getBackgroundColor(),
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                boxShadow: active
                    ? '0 0 150px 7px #fff, 0 0 10px 5px #0ff, 0 0 25px 12px #0ff'
                    : 'none',
                position: 'relative',
            }}
        >
            {useDoubleRing && isFinalState && (
                <div
                    style={{
                        position: 'absolute',
                        width: innerSize,
                        height: innerSize,
                        border: '2px solid black',
                        borderRadius: '50%',
                        pointerEvents: 'none',
                    }}
                />
            )}
            <Handle
                id="bidirectionalBottomTarget"
                type="target"
                position={Position.Top}
            />
            <Handle
                id="bidirectionalBottomSource"
                type="source"
                position={Position.Top}
            />

            <Handle
                id="bidirectionalTopTarget"
                type="target"
                position={Position.Bottom}
            />
            <Handle
                id="bidirectionalTopSource"
                type="source"
                position={Position.Bottom}
            />

            <Handle
                id="selfConnectingTarget"
                type="target"
                position={Position.Right}
            />
            <Handle
                id="selfConnectingSource"
                type="source"
                position={Position.Left}
            />
            <div style={{
                zIndex: 1,
                fontSize: useQNotation ? '0.75rem' : undefined,
                fontWeight: useQNotation ? 'bold' : undefined,
            }}>
                {displayLabel}
            </div>
        </div>
    );
}

export default DFANode;
