// submit.js
import { useState, useEffect } from 'react';
import { useStore } from './store';
import { shallow } from 'zustand/shallow';
import { toPng } from 'html-to-image';
import { getRectOfNodes, getTransformForBounds } from 'reactflow';
import { LoginModal } from './LoginModal';
import { createPortal } from 'react-dom';

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

const selector = (state) => ({
    nodes: state.nodes,
    edges: state.edges,
    token: state.token,
    currentPipelineId: state.currentPipelineId,
    currentPipelineName: state.currentPipelineName,
    savePipelineToServer: state.savePipelineToServer,
    clearPipeline: state.clearPipeline,
    isDirty: state.isDirty
});

export const SubmitButton = () => {
    const { nodes, edges, token, currentPipelineId, currentPipelineName, savePipelineToServer, clearPipeline, isDirty } = useStore(selector, shallow);
    const [modalData, setModalData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [promptModal, setPromptModal] = useState({ isOpen: false, isNew: false, name: '', onSuccess: null });
    const [clearModalOpen, setClearModalOpen] = useState(false);
    const [newModalOpen, setNewModalOpen] = useState(false);
    const [demoUpgradeModalOpen, setDemoUpgradeModalOpen] = useState(false);
    const [showSignupModal, setShowSignupModal] = useState({ isOpen: false, mode: 'signup' });
    const [saveMenuOpen, setSaveMenuOpen] = useState(false);
    const [toastMessage, setToastMessage] = useState(null);
    const isMobile = useIsMobile();
    
    const isGlobalDemo = (() => { try { const c = localStorage.getItem('demo_config_cache'); return c ? JSON.parse(c).data.is_demo : false; } catch(e) { return false; } })();
    const isDemo = useStore.getState().currentUser?.id === 'demo' || isGlobalDemo;

    const showToast = (type, text) => {
        setToastMessage({ type, text });
        setTimeout(() => setToastMessage(null), 3000);
    };

    useEffect(() => {
        const handleToast = (e) => showToast(e.detail.type, e.detail.text);
        window.addEventListener('show-toast', handleToast);
        return () => window.removeEventListener('show-toast', handleToast);
    }, []);

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('pipeline', JSON.stringify({ nodes, edges }));
            
            const response = await fetch(`https://vector-shift-backend.fly.dev/pipelines/parse`, {
                method: 'POST',
                body: formData,
            });
            const data = await response.json();
            
            setModalData(data);
        } catch (error) {
            console.error('Error parsing pipeline:', error);
            setModalData({ error: 'Failed to connect to the backend server.' });
        } finally {
            setLoading(false);
        }
    };

    const executeSave = async (isNew, nameToSave, onSuccess = null) => {
        setLoading(true);
        try {
            await savePipelineToServer(nameToSave, isNew);
            showToast('success', "Pipeline saved successfully!");
            if (onSuccess) onSuccess();
        } catch (e) {
            console.error(e);
            showToast('error', e.message || "Failed to save pipeline");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (saveMenuOpen && !e.target.closest('.save-dropdown-container')) {
                setSaveMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [saveMenuOpen]);

    const handleExport = () => {
        if (nodes.length === 0) {
            showToast('error', "Nothing to export! The pipeline is empty.");
            return;
        }

        const nodesBounds = getRectOfNodes(nodes);
        const imageWidth = nodesBounds.width + 400; // adding generous padding
        const imageHeight = nodesBounds.height + 400;
        const transform = getTransformForBounds(nodesBounds, imageWidth, imageHeight, 0.5, 2);

        const viewport = document.querySelector('.react-flow__viewport');
        if (!viewport) return;

        // Apply mathematical transform for perfectly cropped snapshot
        const originalWidth = viewport.style.width;
        const originalHeight = viewport.style.height;
        const originalTransform = viewport.style.transform;

        // html-to-image ignores dynamic global stylesheets, so we MUST inline the overrides directly on the edge elements.
        // It also has a fatal bug rendering SVG paths with marker-end if the <defs> are outside the capture area.
        const edgePaths = document.querySelectorAll('.react-flow__edge-path');
        const originalEdgeState = new Map();
        edgePaths.forEach(path => {
            originalEdgeState.set(path, {
                animation: path.style.animation,
                strokeDasharray: path.style.strokeDasharray,
                stroke: path.style.stroke,
                markerEnd: path.getAttribute('marker-end')
            });
            path.style.setProperty('animation', 'none', 'important');
            path.style.setProperty('stroke-dasharray', '0', 'important');
            path.style.setProperty('stroke', '#3b82f6', 'important');
            path.removeAttribute('marker-end');
        });

        // Allow DOM to update before snapshotting
        setTimeout(() => {
            toPng(viewport, { 
                backgroundColor: '#0f111a',
                width: imageWidth,
                height: imageHeight,
                style: {
                    width: imageWidth,
                    height: imageHeight,
                    transform: `translate(${transform[0]}px, ${transform[1]}px) scale(${transform[2]})`
                }
            })
            .then((dataUrl) => {
                viewport.style.width = originalWidth;
                viewport.style.height = originalHeight;
                viewport.style.transform = originalTransform;

                // Restore original styles
                edgePaths.forEach(path => {
                    const state = originalEdgeState.get(path);
                    if (state) {
                        path.style.animation = state.animation;
                        path.style.strokeDasharray = state.strokeDasharray;
                        path.style.stroke = state.stroke;
                        if (state.markerEnd) {
                            path.setAttribute('marker-end', state.markerEnd);
                        }
                    }
                });
                
                const downloadAnchorNode = document.createElement('a');
                downloadAnchorNode.setAttribute("href", dataUrl);
                downloadAnchorNode.setAttribute("download", "pipeline_export.png");
                document.body.appendChild(downloadAnchorNode);
                downloadAnchorNode.click();
                downloadAnchorNode.remove();
                showToast('success', "Image exported successfully!");
            })
            .catch((err) => {
                viewport.style.width = originalWidth;
                viewport.style.height = originalHeight;
                viewport.style.transform = originalTransform;

                edgePaths.forEach(path => {
                    const state = originalEdgeState.get(path);
                    if (state) {
                        path.style.animation = state.animation;
                        path.style.strokeDasharray = state.strokeDasharray;
                        path.style.stroke = state.stroke;
                        if (state.markerEnd) {
                            path.setAttribute('marker-end', state.markerEnd);
                        }
                    }
                });
                
                console.error('Failed to export image:', err);
                showToast('error', "Failed to export image.");
            });
        }, 500);
    };

    return (
        <>
            <div className="submit-dock">
                <button type="button" onClick={() => {
                    if (isDirty) {
                        setNewModalOpen(true);
                    } else {
                        clearPipeline();
                        showToast('success', "Started new pipeline.");
                    }
                }} className="dock-btn dock-btn-new" style={{
                    background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', color: '#3b82f6',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                    <span className="dock-icon">✨</span> {!isMobile && <span className="dock-text">New</span>}
                </button>
                
                <button type="button" onClick={handleExport} className="dock-btn export-btn" style={{
                    background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-color)', color: 'var(--text-main)',
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.borderColor = 'var(--border-color)';
                }}
                >
                    <span className="dock-icon">📸</span> {!isMobile && <span className="dock-text">Export</span>}
                </button>
                
                <button type="button" onClick={() => {
                    if (isDirty) {
                        setClearModalOpen(true);
                    } else {
                        clearPipeline();
                        showToast('success', "Pipeline cleared.");
                    }
                }} className="dock-btn dock-btn-clear" style={{
                    background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                    <span className="dock-icon">🗑️</span> {!isMobile && <span className="dock-text">Clear</span>}
                </button>
                
                <div className="save-dropdown-container" style={{ position: 'relative', display: 'flex' }}>
                    <div style={{
                        display: 'flex', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', 
                        borderRadius: isMobile ? '16px' : '12px', overflow: 'hidden'
                    }}>
                        <button type="button" onClick={() => {
                            if (isDemo) {
                                setDemoUpgradeModalOpen(true);
                                return;
                            }
                            if (!token) { 
                                showToast('error', "You must be logged in to save pipelines.");
                                return; 
                            }
                            if (currentPipelineId) {
                                executeSave(false, currentPipelineName);
                            } else {
                                setPromptModal({ isOpen: true, isNew: false, name: currentPipelineName || 'My Pipeline' });
                            }
                        }} className="dock-btn" style={{
                            background: 'transparent', border: 'none', color: '#10b981', margin: 0, borderRadius: 0,
                            borderRight: isDemo ? 'none' : '1px solid rgba(16, 185, 129, 0.2)'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(16, 185, 129, 0.2)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                        >
                            <span className="dock-icon">💾</span> {!isMobile && <span className="dock-text">Save</span>}
                        </button>
                        
                        {!isDemo && (
                        <button type="button" onClick={() => setSaveMenuOpen(!saveMenuOpen)} className="dock-btn" style={{
                            background: 'transparent', border: 'none', color: '#10b981', margin: 0, borderRadius: 0,
                            padding: isMobile ? '12px 10px' : '0 10px', display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(16, 185, 129, 0.2)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                        >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>
                        </button>
                        )}
                    </div>
                    
                    {!isDemo && saveMenuOpen && (
                        <div style={{
                            position: 'absolute', bottom: 'calc(100% + 8px)', right: 0, background: 'var(--bg-card)',
                            border: '1px solid var(--border-color)', borderRadius: '8px', padding: '4px',
                            boxShadow: '0 10px 25px rgba(0,0,0,0.5)', zIndex: 1000, minWidth: '150px'
                        }}>
                            <button onClick={() => {
                                setSaveMenuOpen(false);
                                const isGlobal = (() => { try { const c = localStorage.getItem('demo_config_cache'); return c ? JSON.parse(c).data.is_demo : false; } catch(e) { return false; } })();
                                if (useStore.getState().currentUser?.id === 'demo' || isGlobal) {
                                    setDemoUpgradeModalOpen(true);
                                    return;
                                }
                                if (!token) { showToast('error', "You must be logged in to save pipelines."); return; }
                                setPromptModal({ isOpen: true, isNew: true, name: currentPipelineName ? `${currentPipelineName} (Copy)` : 'My Pipeline' });
                            }} style={{
                                width: '100%', padding: '10px 16px', background: 'transparent', border: 'none',
                                color: 'var(--text-main)', textAlign: 'left', cursor: 'pointer', borderRadius: '4px',
                                display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                            >
                                <span>📑</span> Save As Copy
                            </button>
                        </div>
                    )}
                </div>
                
                <button type="button" onClick={handleSubmit} className="dock-btn submit-btn" disabled={loading} style={{
                    background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: 'white', border: 'none'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 25px rgba(59, 130, 246, 0.4)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.2)'; }}
                >
                    {loading ? (
                        <>
                            <span style={{ display: 'inline-block', width: '20px', height: '20px', border: '3px solid rgba(255,255,255,0.3)', borderTop: '3px solid white', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                            {!isMobile && <span className="dock-text">Running...</span>}
                        </>
                    ) : (
                        <>
                            <span className="dock-icon">🚀</span> {!isMobile && <span className="dock-text">Submit</span>}
                        </>
                    )}
                </button>
            </div>

            {modalData && createPortal(
                <div className="modal-overlay" onClick={() => setModalData(null)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h2>Analysis Complete</h2>
                        
                        {modalData.error ? (
                            <p style={{color: '#ef4444'}}>{modalData.error}</p>
                        ) : (
                            <div className="modal-stats">
                                <div className="stat-card">
                                    <span className="stat-value">{modalData.num_nodes}</span>
                                    <span className="stat-label">Nodes</span>
                                </div>
                                <div className="stat-card">
                                    <span className="stat-value">{modalData.num_edges}</span>
                                    <span className="stat-label">Edges</span>
                                </div>
                                <div className={`stat-card ${modalData.is_dag ? 'success' : 'danger'}`}>
                                    <span className="stat-value">{modalData.is_dag ? 'Yes' : 'No'}</span>
                                    <span className="stat-label">Is DAG</span>
                                </div>
                            </div>
                        )}
                        
                        <button className="modal-close-btn" onClick={() => setModalData(null)}>Awesome!</button>
                    </div>
                </div>,
                document.body
            )}

            {clearModalOpen && createPortal(
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
                    zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    pointerEvents: 'auto'
                }} onClick={() => setClearModalOpen(false)}>
                    <div style={{
                        background: 'var(--bg-card)', padding: '24px', borderRadius: '12px',
                        border: '1px solid var(--border-color)', width: '320px',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.5)', textAlign: 'center'
                    }} onClick={(e) => e.stopPropagation()}>
                        <h3 style={{ margin: '0 0 16px 0', color: 'var(--text-main)', fontSize: '1.2rem' }}>Clear Pipeline?</h3>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>You have unsaved changes. Are you sure you want to clear everything?</p>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                            <button 
                                onClick={() => setClearModalOpen(false)}
                                style={{ flex: 1, padding: '10px', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)', cursor: 'pointer' }}
                            >Cancel</button>
                            <button 
                                onClick={() => {
                                    setClearModalOpen(false);
                                    clearPipeline();
                                    showToast('success', "Pipeline cleared.");
                                }}
                                style={{ flex: 1, padding: '10px', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.5)', borderRadius: '8px', color: '#ef4444', cursor: 'pointer' }}
                            >Clear</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {promptModal.isOpen && createPortal(
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
                    zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    pointerEvents: 'auto'
                }}>
                    <div style={{
                        background: 'var(--bg-card)', padding: '24px', borderRadius: '12px',
                        border: '1px solid var(--border-color)', width: '320px',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column'
                    }}>
                        <h3 style={{ margin: '0 0 16px 0', color: 'var(--text-main)', fontSize: '1.2rem' }}>Name Pipeline</h3>
                        <input 
                            autoFocus
                            type="text" 
                            placeholder="Enter pipeline name..." 
                            value={promptModal.name}
                            onChange={(e) => setPromptModal({ ...promptModal, name: e.target.value })}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    setPromptModal({ ...promptModal, isOpen: false });
                                    executeSave(promptModal.isNew, promptModal.name, promptModal.onSuccess);
                                }
                            }}
                            style={{ 
                                padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-color)',
                                background: 'rgba(0,0,0,0.2)', color: 'var(--text-main)', marginBottom: '24px',
                                outline: 'none', width: '100%', boxSizing: 'border-box'
                            }} 
                        />
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setPromptModal({ ...promptModal, isOpen: false })} style={{
                                padding: '8px 16px', background: 'transparent', border: '1px solid var(--border-color)', 
                                borderRadius: '6px', color: 'var(--text-main)', cursor: 'pointer'
                            }}>Cancel</button>
                            <button onClick={() => {
                                setPromptModal({ ...promptModal, isOpen: false });
                                executeSave(promptModal.isNew, promptModal.name, promptModal.onSuccess);
                            }} style={{
                                padding: '8px 24px', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', 
                                borderRadius: '6px', color: 'white', cursor: 'pointer', fontWeight: 'bold'
                            }}>Save</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {newModalOpen && createPortal(
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
                    zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'auto'
                }}>
                    <div style={{
                        background: 'var(--bg-card)', padding: '24px', borderRadius: '12px',
                        border: '1px solid var(--border-color)', width: '380px',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.5)', textAlign: 'center'
                    }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>💾</div>
                        <h3 style={{ margin: '0 0 12px 0', color: 'var(--text-main)', fontSize: '1.2rem' }}>Unsaved Changes</h3>
                        <p style={{ color: 'var(--text-dim)', marginBottom: '24px', fontSize: '0.95rem' }}>
                            {isGlobalDemo ? "You have unsaved changes. Since saving is disabled in demo mode, they will be lost." : "You have unsaved changes. Do you want to save them before starting a new pipeline?"}
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {!isGlobalDemo && (
                                <button onClick={async () => {
                                    const isGlobal = (() => { try { const c = localStorage.getItem('demo_config_cache'); return c ? JSON.parse(c).data.is_demo : false; } catch(e) { return false; } })();
                                    if (useStore.getState().currentUser?.id === 'demo' || isGlobal) {
                                        setNewModalOpen(false);
                                        setDemoUpgradeModalOpen(true);
                                        return;
                                    }
                                    if (!token) { showToast('error', "You must be logged in to save."); return; }
                                    
                                    const handleSuccess = () => {
                                        clearPipeline();
                                        showToast('success', "Started new pipeline.");
                                    };

                                    if (!currentPipelineId) {
                                        setNewModalOpen(false);
                                        setPromptModal({ isOpen: true, isNew: true, name: 'My Pipeline', onSuccess: handleSuccess });
                                    } else {
                                        try {
                                            setNewModalOpen(false);
                                            await savePipelineToServer(currentPipelineName, false);
                                            handleSuccess();
                                        } catch (e) {
                                            showToast('error', "Failed to save pipeline.");
                                        }
                                    }
                                }} style={{
                                    background: '#10b981', color: 'white', border: 'none', padding: '10px',
                                    borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = '#059669'}
                                onMouseLeave={(e) => e.currentTarget.style.background = '#10b981'}
                                >Save Pipeline</button>
                            )}
                            
                            <button onClick={() => {
                                setNewModalOpen(false);
                                clearPipeline();
                                showToast('success', "Started new pipeline.");
                            }} style={{
                                background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)',
                                padding: '10px', borderRadius: '8px', cursor: 'pointer'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.3)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
                            >Discard Changes</button>
                            
                            <button onClick={() => setNewModalOpen(false)} style={{
                                background: 'transparent', color: 'var(--text-dim)', border: '1px solid var(--border-color)',
                                padding: '10px', borderRadius: '8px', cursor: 'pointer'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >Cancel</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {demoUpgradeModalOpen && createPortal(
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
                    zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'auto'
                }}>
                    <div style={{
                        background: 'var(--bg-card)', padding: '24px', borderRadius: '12px',
                        border: '1px solid var(--border-color)', width: '380px',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.5)', textAlign: 'center'
                    }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>🚀</div>
                        <h3 style={{ margin: '0 0 12px 0', color: 'var(--text-main)', fontSize: '1.2rem' }}>Create an Account</h3>
                        <p style={{ color: 'var(--text-dim)', marginBottom: '24px', fontSize: '0.95rem' }}>
                            {isGlobalDemo ? "Saving pipelines is disabled in demo mode." : "You are currently exploring the demo version. Create an account to save your pipelines and unlock all features!"}
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {!isGlobalDemo && (
                                <button onClick={() => {
                                    setDemoUpgradeModalOpen(false);
                                    setShowSignupModal({ isOpen: true, mode: 'signup' });
                                }} style={{
                                    background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', border: 'none', padding: '10px',
                                    borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold'
                                }}>Login / Sign Up</button>
                            )}
                            
                            <button onClick={() => setDemoUpgradeModalOpen(false)} style={{
                                background: 'transparent', color: 'var(--text-dim)', border: '1px solid var(--border-color)',
                                padding: '10px', borderRadius: '8px', cursor: 'pointer'
                            }}>{isGlobalDemo ? 'Close' : 'Continue in Demo'}</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {showSignupModal.isOpen && (
                <LoginModal initialMode={showSignupModal.mode} onClose={() => setShowSignupModal({ isOpen: false, mode: 'signup' })} />
            )}

            {toastMessage && createPortal(
                <div style={{
                    position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
                    background: toastMessage.type === 'success' ? 'rgba(16, 185, 129, 0.9)' : 'rgba(239, 68, 68, 0.9)',
                    color: 'white', padding: '12px 24px', borderRadius: '8px', zIndex: 10000,
                    boxShadow: '0 10px 30px rgba(0,0,0,0.5)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px',
                    backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.2)'
                }}>
                    {toastMessage.type === 'success' ? '✅' : '❌'} {toastMessage.text}
                </div>,
                document.body
            )}
        </>
    );
};
