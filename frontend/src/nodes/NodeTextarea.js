import React, { useRef, useEffect } from 'react';
import { useStore } from '../store';
import { useUpdateNodeInternals } from 'reactflow';

export const NodeTextarea = ({ 
  nodeId,
  value, 
  onChange, 
  placeholder = "Type here...", 
  maxLength = 500, 
  textColor = 'var(--text-main)',
  fontFamily = 'inherit',
  spellCheck = true,
  autoResizeNode = true,
  minHeight = '100px',
  flex = 1
}) => {
  const textAreaRef = useRef(null);
  const updateNodeStyle = useStore((state) => state.updateNodeStyle);
  const updateNodeInternals = useUpdateNodeInternals();

  useEffect(() => {
    if (textAreaRef.current) {
      const oldFlex = textAreaRef.current.style.flex;
      textAreaRef.current.style.flex = 'none';
      textAreaRef.current.style.height = '0px';
      const newHeight = textAreaRef.current.scrollHeight;
      textAreaRef.current.style.flex = oldFlex;
      textAreaRef.current.style.height = `${newHeight + 15}px`;
      
      if (nodeId) {
        if (autoResizeNode) {
          updateNodeStyle(nodeId, { height: newHeight + 85 });
        }
        setTimeout(() => updateNodeInternals(nodeId), 0);
      }
    }
  }, [value, nodeId, autoResizeNode, updateNodeStyle, updateNodeInternals]);

  return (
    <>
      <textarea
        id={`textarea-${nodeId}`}
        ref={textAreaRef}
        value={value}
        onChange={onChange}
        maxLength={maxLength}
        className="nodrag nowheel export-textarea"
        spellCheck={spellCheck}
        placeholder={placeholder}
        style={{ 
          flex: flex,
          minHeight: minHeight, 
          resize: 'none', 
          overflow: 'auto',
          width: '100%',
          boxSizing: 'border-box',
          background: 'transparent',
          border: 'none',
          padding: '12px 0 12px 0',
          color: textColor,
          fontFamily: fontFamily,
          fontSize: '0.9rem',
          outline: 'none',
          lineHeight: '1.4'
        }}
      />
      <div style={{ 
        textAlign: 'right', 
        fontSize: '0.75rem', 
        color: value?.length >= maxLength ? '#ef4444' : 'var(--text-dim)',
        marginTop: '4px',
        marginRight: '4px',
        pointerEvents: 'none'
      }}>
        {value?.length || 0} / {maxLength}
      </div>
    </>
  );
};
