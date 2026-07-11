// draggableNode.js

export const DraggableNode = ({ type, label, color = '#8b5cf6', config = null, customNodeId = null }) => {
    const onDragStart = (event, nodeType) => {
      const appData = { nodeType, config, customNodeId }
      event.target.style.cursor = 'grabbing';
      event.dataTransfer.setData('application/reactflow', JSON.stringify(appData));
      event.dataTransfer.effectAllowed = 'move';
    };

    const handleClick = () => {
        if (window.addNodeFromToolbar) {
            window.addNodeFromToolbar(type, config, customNodeId);
        }
    };
  
    return (
      <div
        className={`draggable-node ${type}`}
        onDragStart={(event) => onDragStart(event, type)}
        onDragEnd={(event) => (event.target.style.cursor = 'grab')}
        onClick={handleClick}
        style={{ 
          cursor: 'grab', 
          display: 'flex', 
          flexShrink: 0,
          padding: '8px 16px',
          minWidth: '80px',
          alignItems: 'center', 
          justifyContent: 'center', 
          flexDirection: 'column',
          background: 'rgba(0, 0, 0, 0.2)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          boxShadow: `inset 4px 0 0 ${color}, 0 4px 10px rgba(0, 0, 0, 0.3)`,
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = `inset 4px 0 0 ${color}, 0 6px 15px ${color}30`;
            e.currentTarget.style.borderColor = color;
        }}
        onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = `inset 4px 0 0 ${color}, 0 4px 10px rgba(0, 0, 0, 0.3)`;
            e.currentTarget.style.borderColor = 'var(--border-color)';
        }}
        draggable
      >
          <span className="draggable-node-text" style={{ color: '#fff', fontWeight: 500, letterSpacing: '0.5px' }}>{label}</span>
      </div>
    );
};