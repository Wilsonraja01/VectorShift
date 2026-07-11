// baseNode.js
import { Handle, Position } from 'reactflow';
import { NodeResizeControl } from 'reactflow';
import { useStore } from '../store';
import { shallow } from 'zustand/shallow';

const ResizeIconGrip = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="resize-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="21" y1="9" x2="9" y2="21"></line>
    <line x1="21" y1="15" x2="15" y2="21"></line>
  </svg>
);

const selector = (state) => ({
  removeNode: state.removeNode,
});

export const BaseNode = ({ id, title, children, handles = [], style = {}, minWidth = 250, minHeight = 150, resizable = true, resizeAxes = 'horizontal' }) => {
  const { removeNode } = useStore(selector, shallow);
  
  return (
    <>
      <div className="base-node" style={{...style, position: 'relative', width: '100%', minWidth: '100%', minHeight: '100%', boxSizing: 'border-box', overflow: 'visible', pointerEvents: 'all'}}>
        {handles.map((handle) => (
          <Handle
            key={handle.id}
            type={handle.type}
            position={handle.position}
            id={handle.id}
            style={{ zIndex: 1000, pointerEvents: 'all', ...(handle.style || {}) }}
          />
        ))}
        {resizable && resizeAxes === 'both' && (
          <NodeResizeControl position="bottom-right" minWidth={minWidth} minHeight={minHeight} style={{ background: 'transparent', border: 'none', width: 24, height: 24, right: 4, bottom: 4, display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', cursor: 'se-resize', zIndex: 100 }}>
            <ResizeIconGrip />
          </NodeResizeControl>
        )}

        {resizable && resizeAxes === 'horizontal' && (
          <>
            <NodeResizeControl position="left" minWidth={minWidth} style={{ background: 'transparent', border: 'none', width: 8, height: '100%', left: 0, zIndex: 10, cursor: 'ew-resize' }}>
              <div style={{ width: '100%', height: '100%' }} />
            </NodeResizeControl>
            <NodeResizeControl position="right" minWidth={minWidth} style={{ background: 'transparent', border: 'none', width: 8, height: '100%', right: 0, zIndex: 10, cursor: 'ew-resize' }}>
              <div style={{ width: '100%', height: '100%' }} />
            </NodeResizeControl>
          </>
        )}
        <div className="node-header custom-drag-handle" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0 12px 0', cursor: 'grab' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-dim)', opacity: 0.7 }}>
              <circle cx="9" cy="5" r="1"></circle><circle cx="9" cy="12" r="1"></circle><circle cx="9" cy="19" r="1"></circle>
              <circle cx="15" cy="5" r="1"></circle><circle cx="15" cy="12" r="1"></circle><circle cx="15" cy="19" r="1"></circle>
            </svg>
            <span style={{ userSelect: 'none' }}>{title}</span>
          </div>
          <button 
            onClick={(e) => { e.stopPropagation(); removeNode(id); }}
            style={{ 
              background: 'transparent', 
              border: 'none', 
              color: 'var(--text-dim)', 
              cursor: 'pointer',
              fontSize: '1.2rem',
              lineHeight: '1',
              padding: '0 4px',
              transition: 'color 0.2s ease',
              outline: 'none'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-dim)'}
            title="Delete node"
          >×</button>
        </div>
        <div className="node-content" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {children}
        </div>
      </div>
    </>
  );
};
