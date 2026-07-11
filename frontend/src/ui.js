// ui.js
// Displays the drag-and-drop UI
// --------------------------------------------------

import { useState, useRef, useCallback, useEffect } from 'react';
import ReactFlow, { Controls, Background, MiniMap } from 'reactflow';
import { useStore } from './store';
import { shallow } from 'zustand/shallow';
import { 
  InputNode, 
  LLMNode, 
  OutputNode, 
  TextNode, 
  ApiNode, 
  DatabaseNode, 
  TransformNode, 
  ConditionNode, 
  SlackNode 
} from './nodes/standardNodes';
import { CustomNode } from './nodes/customNode';

import 'reactflow/dist/style.css';

// Custom hook to detect mobile
function useIsMobile() {
    const [isMobile, setIsMobile] = useState(
        window.innerWidth <= 1100 || 
        (/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) ||
        (window.matchMedia && window.matchMedia("(pointer: coarse)").matches)
    );
    useEffect(() => {
        const handleResize = () => {
            setIsMobile(
                window.innerWidth <= 1100 || 
                (/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) ||
                (window.matchMedia && window.matchMedia("(pointer: coarse)").matches)
            );
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    return isMobile;
}

const gridSize = 20;
const proOptions = { hideAttribution: true };
export const nodeTypes = {
  customInput: InputNode,
  llm: LLMNode,
  customOutput: OutputNode,
  text: TextNode,
  api: ApiNode,
  database: DatabaseNode,
  transform: TransformNode,
  condition: ConditionNode,
  slack: SlackNode,
  customNode: CustomNode,
};

const selector = (state) => ({
  nodes: state.nodes,
  edges: state.edges,
  getNodeID: state.getNodeID,
  addNode: state.addNode,
  onNodesChange: state.onNodesChange,
  onEdgesChange: state.onEdgesChange,
  onConnect: state.onConnect,
});

export const PipelineUI = () => {
    const reactFlowWrapper = useRef(null);
    const [reactFlowInstance, setReactFlowInstance] = useState(null);
    const [confirmDialog, setConfirmDialog] = useState(null); // { message, onConfirm }
    const {
      nodes,
      edges,
      getNodeID,
      addNode,
      onNodesChange,
      onEdgesChange,
      onConnect
    } = useStore(selector, shallow);

    const isMobile = useIsMobile();

    const getInitNodeData = (nodeID, type, config, customNodeId) => {
      let nodeData = { id: nodeID, nodeType: `${type}` };
      if (config) {
          nodeData.config = config;
      }
      if (customNodeId) {
          nodeData.customNodeId = customNodeId;
      }
      return nodeData;
    }

    useEffect(() => {
        window.addNodeFromToolbar = (type, config, customNodeId) => {
            if (!reactFlowInstance || !reactFlowWrapper.current) return;
            
            // Calculate center of the current viewport and project it to React Flow coordinates
            const bounds = reactFlowWrapper.current.getBoundingClientRect();
            const center = reactFlowInstance.project({
                x: bounds.width / 2,
                y: bounds.height / 2,
            });

            const nodeID = getNodeID(type);
            
            // Calculate a cascading offset so nodes don't spawn perfectly hidden under each other
            const currentNodesCount = useStore.getState().nodes.length;
            const cascadeOffset = (currentNodesCount % 10) * 30;
            
            const newNode = {
              id: nodeID,
              type,
              // Offset slightly so it spawns near the middle, with a cascading shift
              position: { x: center.x - 150 + cascadeOffset, y: center.y - 100 + cascadeOffset },
              data: getInitNodeData(nodeID, type, config, customNodeId),
            };
            addNode(newNode);
        };
    }, [reactFlowInstance, getNodeID, addNode]);

    const lastTouchRef = useRef(null);

    const handleMiniMapTouchMove = (e) => {
        if (!reactFlowInstance || e.touches.length !== 1) return;
        
        // Prevent default to stop scrolling
        if (e.cancelable) e.preventDefault();
        
        const touch = e.touches[0];
        if (lastTouchRef.current) {
            const dx = touch.clientX - lastTouchRef.current.x;
            const dy = touch.clientY - lastTouchRef.current.y;
            
            const currentViewport = reactFlowInstance.getViewport();
            
            // Multiplier approximates the scale difference between minimap and canvas
            const multiplier = 8; 
            
            reactFlowInstance.setViewport({
                x: currentViewport.x - (dx * multiplier),
                y: currentViewport.y - (dy * multiplier),
                zoom: currentViewport.zoom
            });
        }
        lastTouchRef.current = { x: touch.clientX, y: touch.clientY };
    };

    const handleMiniMapTouchEnd = () => {
        lastTouchRef.current = null;
    };

    const onDrop = useCallback(
        (event) => {
          event.preventDefault();
    
          const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
          if (event?.dataTransfer?.getData('application/reactflow')) {
            const appData = JSON.parse(event.dataTransfer.getData('application/reactflow'));
            const type = appData?.nodeType;
            const config = appData?.config;
            const customNodeId = appData?.customNodeId;
      
            // check if the dropped element is valid
            if (typeof type === 'undefined' || !type) {
              return;
            }
      
            const position = reactFlowInstance.project({
              x: event.clientX - reactFlowBounds.left,
              y: event.clientY - reactFlowBounds.top,
            });

            const nodeID = getNodeID(type);
            const newNode = {
              id: nodeID,
              type,
              position,
              data: getInitNodeData(nodeID, type, config, customNodeId),
            };
      
            addNode(newNode);
          }
        },
        [reactFlowInstance]
    );

    const onDragOver = useCallback((event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const getNodeColor = (node) => {
        switch (node.type) {
            case 'customInput': return '#10b981'; // Emerald
            case 'customOutput': return '#ef4444'; // Red
            case 'llm': return '#8b5cf6'; // Purple
            case 'text': return '#94a3b8'; // Slate
            case 'api': return '#f59e0b'; // Amber
            case 'database': return '#3b82f6'; // Blue
            case 'transform': return '#fcd34d'; // Yellow
            case 'condition': return '#ec4899'; // Pink
            case 'slack': return '#06b6d4'; // Cyan
            default: return '#8b5cf6';
        }
    };

    const getNodeBorderRadius = (node) => {
        switch (node.type) {
            case 'customInput':
            case 'customOutput': return 16;
            case 'database': return 100; // Circle
            default: return 6; // Rounded square
        }
    };

    return (
        <>
        <div className="react-flow-wrapper" ref={reactFlowWrapper} style={{width: '100%', flex: 1}}>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeDoubleClick={(event, node) => {
                    if (isMobile) {
                        setConfirmDialog({
                            message: `Delete the ${node.type} node?`,
                            onConfirm: () => {
                                onNodesChange([{ type: 'remove', id: node.id }]);
                                setConfirmDialog(null);
                            }
                        });
                    }
                }}
                onEdgeClick={(event, edge) => {
                    setConfirmDialog({
                        message: "Delete this connection?",
                        onConfirm: () => {
                            onEdgesChange([{ type: 'remove', id: edge.id }]);
                            setConfirmDialog(null);
                        }
                    });
                }}
                onDrop={onDrop}
                onDragOver={onDragOver}
                onInit={(instance) => {
                    setReactFlowInstance(instance);
                    window.reactFlowInstance = instance;
                }}
                nodeTypes={nodeTypes}
                proOptions={proOptions}
                snapGrid={[gridSize, gridSize]}
                connectionLineType='smoothstep'
                connectionRadius={40}
            >
                <Background color="#3b82f6" gap={gridSize} size={1} />
                <Controls className="custom-controls" style={isMobile ? { transform: 'translateY(-80px)' } : {}} />
                <div className="minimap-container" style={isMobile ? { transform: 'scale(0.6) translateY(-50px)', transformOrigin: 'bottom right', right: '10px', bottom: '80px' } : {}}>
                    <MiniMap 
                        nodeColor={getNodeColor}
                        nodeBorderRadius={getNodeBorderRadius}
                        nodeStrokeWidth={2}
                        nodeStrokeColor="rgba(255,255,255,0.1)"
                        maskColor="rgba(15, 17, 26, 0.7)"
                        className="custom-minimap"
                        pannable={false}
                        zoomable={false}
                        ariaLabel="Mini Map"
                        title="Mini Map"
                        style={{ position: 'relative', bottom: 'auto', right: 'auto', cursor: 'pointer' }}
                        onNodeClick={(event, node) => {
                            if (reactFlowInstance) {
                                // Instantly fly to the node that was tapped in the minimap
                                reactFlowInstance.fitView({ 
                                    nodes: [{ id: node.id }], 
                                    duration: 800,
                                    maxZoom: 1
                                });
                            }
                        }}
                    />
                </div>
            </ReactFlow>
        </div>
        
        {confirmDialog && (
            <div className="modal-overlay" onClick={() => setConfirmDialog(null)} style={{ zIndex: 5000, backdropFilter: 'blur(5px)' }}>
                <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '350px', textAlign: 'center', padding: '30px' }}>
                    <h3 style={{ margin: '0 0 20px 0', fontSize: '1.2rem', color: 'white' }}>{confirmDialog.message}</h3>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '10px' }}>
                        <button onClick={() => setConfirmDialog(null)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'white', padding: '8px 20px', borderRadius: '8px', cursor: 'pointer', flex: 1 }}>Cancel</button>
                        <button onClick={confirmDialog.onConfirm} style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.5)', color: '#ef4444', padding: '8px 20px', borderRadius: '8px', cursor: 'pointer', flex: 1, fontWeight: 'bold' }}>Delete</button>
                    </div>
                </div>
            </div>
        )}
        </>
    )
}
