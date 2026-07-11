// toolbar.js

import { DraggableNode } from './draggableNode';
import { useStore } from './store';
import { shallow } from 'zustand/shallow';
import { useState, useEffect } from 'react';
import { CustomNodeModal } from './CustomNodeModal';

const selector = (state) => ({
    customNodes: state.customNodes,
    fetchCustomNodes: state.fetchCustomNodes,
    deleteCustomNode: state.deleteCustomNode,
    token: state.token,
    currentUser: state.currentUser
});

export const PipelineToolbar = () => {
    const { customNodes, fetchCustomNodes, deleteCustomNode, token, currentUser } = useStore(selector, shallow);
    const [showNodeModal, setShowNodeModal] = useState(false);
    const [nodeToEdit, setNodeToEdit] = useState(null);
    const setTourRun = useStore(state => state.setTourRun);

    useEffect(() => {
        fetchCustomNodes();
    }, [fetchCustomNodes, token, currentUser]);

    return (
        <>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flex: 1, minWidth: 0, justifyContent: 'flex-start' }}>
                <div 
                    className="toolbar" 
                    style={{ 
                        display: 'flex', flexWrap: 'nowrap', gap: '10px', flex: '0 1 auto', minWidth: 0,
                        background: 'rgba(30, 32, 45, 0.7)', backdropFilter: 'blur(10px)',
                        padding: '10px 16px', borderRadius: '12px', border: '1px solid var(--border-color)',
                        pointerEvents: 'auto', 
                        overflowX: 'auto',
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none',
                        alignItems: 'center',
                        maxWidth: '100%'
                    }}
                >
                    <DraggableNode type='customInput' label='Input' color='#10b981' />
                    <DraggableNode type='llm' label='LLM' color='#8b5cf6' />
                    <DraggableNode type='customOutput' label='Output' color='#ef4444' />
                    <DraggableNode type='text' label='Text' color='#94a3b8' />
                    <DraggableNode type='api' label='API' color='#f59e0b' />
                    <DraggableNode type='database' label='Database' color='#3b82f6' />
                    <DraggableNode type='transform' label='Transform' color='#fcd34d' />
                    <DraggableNode type='condition' label='Condition' color='#ec4899' />
                    <DraggableNode type='slack' label='Slack' color='#06b6d4' />
                    
                    {customNodes?.map(node => (
                        <div key={node.id} style={{ position: 'relative' }}>
                            <DraggableNode 
                                type='customNode' 
                                label={node.name} 
                                color={(() => { try { return JSON.parse(node.config).color || '#8b5cf6'; } catch(e) { return '#8b5cf6'; } })()} 
                                config={node.config} 
                            />
                            <button 
                                onClick={(e) => { e.stopPropagation(); setNodeToEdit(node); setShowNodeModal(true); }}
                                style={{
                                    position: 'absolute', top: -5, right: 18,
                                    background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                                    color: '#3b82f6', borderRadius: '50%', width: '16px', height: '16px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '10px', cursor: 'pointer', zIndex: 10
                                }}
                            >✎</button>
                            <button 
                                onClick={(e) => { e.stopPropagation(); deleteCustomNode(node.id); }}
                                style={{
                                    position: 'absolute', top: -5, right: 0,
                                    background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                                    color: '#ef4444', borderRadius: '50%', width: '16px', height: '16px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '10px', cursor: 'pointer', zIndex: 10
                                }}
                            >×</button>
                        </div>
                    ))}
                    
                    <button 
                        className="add-custom-node-btn"
                        onClick={() => { setNodeToEdit(null); setShowNodeModal(true); }}
                        style={{
                            minWidth: '40px', height: '40px', borderRadius: '8px',
                            background: 'rgba(255,255,255,0.05)', border: '1px dashed rgba(255,255,255,0.2)',
                            color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', pointerEvents: 'auto', flexShrink: 0
                        }}
                        title="Create Custom Node"
                    >+</button>
                </div>
                <button 
                    className="tutorial-btn"
                    onClick={(e) => {
                        e.preventDefault();
                        setTourRun(false);
                        setTimeout(() => setTourRun(true), 50);
                    }}
                    style={{ 
                        flexShrink: 0,
                        width: '36px', height: '36px', 
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        borderRadius: '8px', cursor: 'pointer',
                        background: 'rgba(255, 255, 255, 0.1)', 
                        color: '#fff', 
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        pointerEvents: 'auto',
                        transition: 'all 0.2s',
                        backdropFilter: 'blur(10px)'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                    }}
                    title="Start Tutorial"
                >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="16" x2="12" y2="12"></line>
                        <line x1="12" y1="8" x2="12.01" y2="8"></line>
                    </svg>
                </button>
            </div>
            
            {showNodeModal && <CustomNodeModal initialNode={nodeToEdit} onClose={() => { setShowNodeModal(false); setNodeToEdit(null); }} />}
        </>
    );
};
