import React, { useState, useEffect } from 'react';
import ReactFlow, { Background, Controls } from 'reactflow';
import 'reactflow/dist/style.css';
import { useStore } from './store';
import { nodeTypes } from './ui';

export const UserDashboard = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    
    const currentUser = useStore(state => state.currentUser);
    const token = useStore(state => state.token);
    const logout = useStore(state => state.logout);
    const updateUser = useStore(state => state.updateUser);
    const isDirty = useStore(state => state.isDirty);
    const savePipelineToServer = useStore(state => state.savePipelineToServer);
    const currentPipelineId = useStore(state => state.currentPipelineId);
    const currentPipelineName = useStore(state => state.currentPipelineName);
    
    const [savedPipelines, setSavedPipelines] = useState([]);
    const [deleteConfirmModal, setDeleteConfirmModal] = useState({ isOpen: false, id: null });
    const [unsavedModal, setUnsavedModal] = useState({ isOpen: false, pendingAction: null });
    const [previewModal, setPreviewModal] = useState({ isOpen: false, pipeline: null });
    const [deleteAccountModalOpen, setDeleteAccountModalOpen] = useState(false);

    useEffect(() => {
        if (isOpen && currentUser && currentUser.id !== 'demo' && token) {
            fetch(`https://vector-shift-backend.fly.dev/pipelines`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            .then(res => res.json())
            .then(data => {
                if (data.status === 'success') {
                    setSavedPipelines(data.pipelines);
                }
            })
            .catch(console.error);
        }
    }, [isOpen, currentUser, token]);

    const executeDelete = async (id) => {
        try {
            const res = await fetch(`https://vector-shift-backend.fly.dev/pipelines/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setSavedPipelines(prev => prev.filter(p => p.id !== id));
            }
        } catch (err) {
            console.error(err);
        }
    };

    const executeLogout = () => {
        logout();
        setIsOpen(false);
    };

    const executeDeleteAccount = async () => {
        try {
            const res = await fetch(`https://vector-shift-backend.fly.dev/users/me`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                logout();
                setIsOpen(false);
                setDeleteAccountModalOpen(false);
            } else {
                const data = await res.json();
                alert(data.detail || "Failed to delete account");
            }
        } catch (err) {
            console.error(err);
            alert("Failed to delete account");
        }
    };

    const handleLogoutClick = () => {
        if (isDirty && token) {
            setUnsavedModal({ isOpen: true, pendingAction: 'logout' });
        } else {
            executeLogout();
        }
    };

    const executeSwitch = (p) => {
        useStore.getState().loadPipeline(JSON.parse(p.nodes), JSON.parse(p.edges), p.id, p.name);
        setIsOpen(false);
    };

    const handleSwitchPipeline = (p) => {
        if (isDirty && token) {
            setUnsavedModal({ isOpen: true, pendingAction: { type: 'switch', payload: p } });
        } else {
            executeSwitch(p);
        }
    };

    const avatars = [
        '/avatars/guest_avatar_neon_cyberpunk_1783629556194.png',
        '/avatars/guest_avatar_abstract_geometry_1783629565589.png',
        '/avatars/guest_avatar_minimalist_gradient_1783629574158.png',
        '/avatars/guest_avatar_space_astronaut_1783629584342.png',
        '/avatars/guest_avatar_holographic_orb_1783629593222.png'
    ];

    return (
        <div className="user-dashboard">
            {/* Floating User Avatar Button */}
            <div 
                className="user-avatar-btn"
                onClick={() => setIsOpen(true)}
                style={{
                    flexShrink: 0,
                    pointerEvents: 'auto',
                    borderRadius: '50%',
                    background: currentUser?.avatar_url ? `url(${currentUser.avatar_url}) center/cover` : 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundImage: currentUser?.avatar_url ? `url(${currentUser.avatar_url})` : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 'bold',
                    boxShadow: '0 0 10px rgba(59, 130, 246, 0.3)',
                    cursor: 'pointer',
                    border: '2px solid rgba(255,255,255,0.2)',
                    zIndex: 100,
                    transition: 'transform 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
                {!currentUser?.avatar_url && (currentUser ? currentUser.username.substring(0, 2).toUpperCase() : "GU")}
            </div>

            {/* Dashboard Modal/Slide-out */}
            {isOpen && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    backdropFilter: 'blur(4px)',
                    zIndex: 3000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    pointerEvents: 'auto'
                }} onClick={() => setIsOpen(false)}>
                    
                    <div style={{
                        background: 'var(--bg-card)',
                        width: '90%',
                        maxWidth: '500px',
                        borderRadius: '16px',
                        border: '1px solid var(--border-color)',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.8)',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column'
                    }} onClick={(e) => e.stopPropagation()}>
                        
                        {/* Header */}
                        <div style={{
                            padding: '24px',
                            borderBottom: '1px solid rgba(255,255,255,0.05)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '16px'
                        }}>
                            <div style={{ position: 'relative' }}>
                                <div style={{ 
                                    width: '64px', height: '64px', borderRadius: '50%', 
                                    background: currentUser?.avatar_url ? `url(${currentUser.avatar_url}) center/cover` : 'linear-gradient(135deg, #3b82f6, #8b5cf6)', 
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: 'white', fontWeight: 'bold', fontSize: '2rem',
                                    backgroundImage: currentUser?.avatar_url ? `url(${currentUser.avatar_url})` : 'none',
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center',
                                    boxShadow: '0 0 15px rgba(139, 92, 246, 0.5)',
                                    border: '3px solid rgba(255,255,255,0.1)'
                                }}>
                                    {!currentUser?.avatar_url && (currentUser ? currentUser.username.substring(0, 2).toUpperCase() : "GU")}
                                </div>
                                {currentUser?.id !== 'demo' && (
                                    <button 
                                        onClick={() => setIsEditing(!isEditing)}
                                        style={{
                                            position: 'absolute', bottom: '-8px', left: '50%', transform: 'translateX(-50%)',
                                            background: 'var(--accent-color)', color: '#fff', border: 'none', borderRadius: '12px',
                                            padding: '2px 8px', fontSize: '0.7rem', cursor: 'pointer', fontWeight: 'bold',
                                            boxShadow: '0 2px 5px rgba(0,0,0,0.5)'
                                        }}
                                    >
                                        {isEditing ? 'Cancel' : 'Edit'}
                                    </button>
                                )}
                            </div>
                            <div>
                                <h2 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.4rem' }}>{currentUser ? currentUser.username : 'Guest User'}</h2>
                            </div>
                            <button onClick={() => setIsOpen(false)} style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: 'var(--text-dim)', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
                        </div>

                        {/* Content */}
                        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', flex: 1, overflowY: 'auto', maxHeight: '50vh' }}>
                            {isEditing ? (
                                <div>
                                    <h3 style={{ margin: '0 0 12px 0', color: 'var(--text-main)', fontSize: '1.1rem' }}>Choose an Avatar</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
                                        {avatars.map((avatar, i) => (
                                            <div 
                                                key={i} 
                                                style={{ 
                                                    width: '100%', 
                                                    aspectRatio: '1', 
                                                    borderRadius: '50%', 
                                                    cursor: 'pointer',
                                                    backgroundImage: `url(${avatar})`,
                                                    backgroundSize: 'cover',
                                                    backgroundPosition: 'center',
                                                    border: currentUser?.avatar_url === avatar ? '3px solid #10b981' : '3px solid transparent',
                                                    boxShadow: currentUser?.avatar_url === avatar ? '0 0 15px rgba(16, 185, 129, 0.4)' : 'none',
                                                    transition: 'all 0.2s ease',
                                                    opacity: currentUser?.avatar_url === avatar ? 1 : 0.6
                                                }}
                                                onMouseEnter={(e) => {
                                                    if (currentUser?.avatar_url !== avatar) e.currentTarget.style.opacity = 1;
                                                }}
                                                onMouseLeave={(e) => {
                                                    if (currentUser?.avatar_url !== avatar) e.currentTarget.style.opacity = 0.6;
                                                }}
                                                onClick={() => {
                                                    updateUser({ avatar_url: avatar });
                                                    setIsEditing(false);
                                                    if (currentUser?.id) {
                                                        fetch(`https://vector-shift-backend.fly.dev/users/${currentUser.id}/avatar`, {
                                                            method: 'POST',
                                                            headers: { 'Content-Type': 'application/json' },
                                                            body: JSON.stringify({ avatar_url: avatar })
                                                        }).catch(console.error);
                                                    }
                                                }}
                                            />
                                        ))}
                                    </div>
                                    <button onClick={() => { updateUser({ avatar_url: null }); setIsEditing(false); }} style={{ marginTop: '16px', background: 'transparent', color: 'var(--text-dim)', border: '1px solid var(--border-color)', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background='rgba(255,255,255,0.05)'} onMouseLeave={(e) => e.currentTarget.style.background='transparent'}>Reset to Default</button>
                                </div>
                            ) : (
                                <>
                                    {/* Saved Section */}
                                    <div>
                                        <h3 style={{ margin: '0 0 12px 0', color: 'var(--text-main)', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ color: '#10b981' }}>★</span> Saved Pipelines
                                        </h3>
                                        {currentUser?.id === 'demo' ? (
                                            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px', border: '1px dashed var(--border-color)', color: 'var(--text-dim)', textAlign: 'center' }}>
                                                Please login to enable saving.
                                            </div>
                                        ) : savedPipelines.length === 0 ? (
                                            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px', border: '1px dashed var(--border-color)', color: 'var(--text-dim)', textAlign: 'center' }}>
                                                No saved pipelines yet. Click "Save" to add one!
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto', paddingRight: '0px' }}>
                                                {savedPipelines.map(p => (
                                                    <div 
                                                        key={p.id}
                                                        onClick={() => handleSwitchPipeline(p)}
                                                        style={{
                                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                            background: 'rgba(255,255,255,0.05)', padding: '12px 16px', borderRadius: '8px',
                                                            cursor: 'pointer', border: '1px solid var(--border-color)', transition: 'all 0.2s ease'
                                                        }}
                                                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.borderColor = '#10b981'; }}
                                                        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
                                                    >
                                                        <div>
                                                            <div style={{ color: 'var(--text-main)', fontWeight: 500 }}>{p.name}</div>
                                                            <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>{new Date(p.created_at).toLocaleDateString()}</div>
                                                        </div>
                                                        <div style={{ display: 'flex', gap: '8px' }}>
                                                            <button 
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setPreviewModal({ isOpen: true, pipeline: p });
                                                                }}
                                                                style={{
                                                                    background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', color: '#3b82f6', cursor: 'pointer',
                                                                    padding: '6px 10px', borderRadius: '4px', opacity: 0.8, transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                                }}
                                                                onMouseEnter={(e) => { e.currentTarget.style.opacity = 1; e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)'; }}
                                                                onMouseLeave={(e) => { e.currentTarget.style.opacity = 0.8; e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)'; }}
                                                                title="Preview Pipeline"
                                                            >
                                                                👁️
                                                            </button>
                                                            <button 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setDeleteConfirmModal({ isOpen: true, id: p.id });
                                                            }}
                                                            style={{
                                                                background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer',
                                                                padding: '8px', borderRadius: '4px', opacity: 0.7, transition: 'opacity 0.2s'
                                                            }}
                                                            onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
                                                            onMouseLeave={(e) => e.currentTarget.style.opacity = 0.7}
                                                            title="Delete Pipeline"
                                                        >
                                                                ✕
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Sample Section */}
                                    <div>
                                        <h3 style={{ margin: '0 0 12px 0', color: 'var(--text-main)', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ color: '#f59e0b' }}>❖</span> Sample Templates
                                        </h3>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                            <div 
                                                onClick={() => {
                                                    import('./templates/simpleTemplate.json').then(template => {
                                                        useStore.getState().loadPipeline(template.nodes, template.edges);
                                                        setIsOpen(false);
                                                    });
                                                }}
                                                style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '12px', borderRadius: '8px', cursor: 'pointer', transition: 'background 0.2s' }}
                                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)'}
                                                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)'}
                                            >
                                                <div style={{ color: 'var(--text-main)', fontWeight: 500, marginBottom: '4px' }}>Simple Pipeline</div>
                                                <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>A very easy 3-node graph</div>
                                            </div>
                                            <div 
                                                onClick={() => {
                                                    import('./templates/complexTemplate.json').then(template => {
                                                        useStore.getState().loadPipeline(template.nodes, template.edges);
                                                        setIsOpen(false);
                                                    });
                                                }}
                                                style={{ background: 'rgba(236, 72, 153, 0.1)', border: '1px solid rgba(236, 72, 153, 0.3)', padding: '12px', borderRadius: '8px', cursor: 'pointer', transition: 'background 0.2s' }}
                                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(236, 72, 153, 0.2)'}
                                                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(236, 72, 153, 0.1)'}
                                            >
                                                <div style={{ color: 'var(--text-main)', fontWeight: 500, marginBottom: '4px' }}>Complex Pipeline</div>
                                                <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>An advanced 8-node workflow</div>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}

                        </div>

                        {/* Footer / Logout */}
                        <div style={{
                            padding: '16px 24px',
                            borderTop: '1px solid rgba(255,255,255,0.05)',
                            background: 'rgba(0,0,0,0.2)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: '5px'
                        }}>
                            <a 
                                href="https://wilsonraja01.github.io/personal-portfolio/" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                style={{
                                    color: 'var(--text-muted)',
                                    textDecoration: 'none',
                                    fontSize: '0.85rem',
                                    fontWeight: '500',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '6px 12px',
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '16px',
                                    transition: 'all 0.2s ease',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.color = '#3b82f6';
                                    e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.5)';
                                    e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.color = 'var(--text-muted)';
                                    e.currentTarget.style.borderColor = 'var(--border-color)';
                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                                }}
                            >
                                <span>✨</span> By Wilson
                            </a>
                            <div style={{ display: 'flex', gap: '5px' }}>
                                {currentUser?.id !== 'demo' && (
                                    <button 
                                        onClick={() => {
                                            const isGlobal = (() => { try { const c = localStorage.getItem('demo_config_cache'); return c ? JSON.parse(c).data.is_demo : false; } catch(e) { return false; } })();
                                            if (isGlobal) {
                                                alert("Account deletion is disabled in demo mode.");
                                                return;
                                            }
                                            setDeleteAccountModalOpen(true);
                                        }} 
                                        style={{
                                            background: 'transparent',
                                            color: '#ef4444',
                                            border: '1px solid rgba(239, 68, 68, 0.3)',
                                            padding: '8px 16px',
                                            borderRadius: '6px',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                    >
                                        Delete Account
                                    </button>
                                )}
                                <button 
                                disabled={currentUser?.id === 'demo' && (() => {
                                    try {
                                        const cached = localStorage.getItem('demo_config_cache');
                                        if (cached) return JSON.parse(cached).data.is_demo;
                                    } catch(e) {}
                                    return false;
                                })()}
                                onClick={() => { 
                                    setIsOpen(false); 
                                    if (currentUser?.id === 'demo') {
                                        window.dispatchEvent(new CustomEvent('open-login-modal'));
                                    } else {
                                        logout(); 
                                    }
                                }} style={{
                                    background: currentUser?.id === 'demo' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                    color: currentUser?.id === 'demo' ? '#3b82f6' : '#ef4444',
                                    border: currentUser?.id === 'demo' ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                                    padding: '8px 24px',
                                    borderRadius: '6px',
                                    fontWeight: 600,
                                    cursor: (currentUser?.id === 'demo' && (() => {
                                        try {
                                            const cached = localStorage.getItem('demo_config_cache');
                                            if (cached) return JSON.parse(cached).data.is_demo;
                                        } catch(e) {}
                                        return false;
                                    })()) ? 'not-allowed' : 'pointer',
                                    opacity: (currentUser?.id === 'demo' && (() => {
                                        try {
                                            const cached = localStorage.getItem('demo_config_cache');
                                            if (cached) return JSON.parse(cached).data.is_demo;
                                        } catch(e) {}
                                        return false;
                                    })()) ? 0.5 : 1,
                                    transition: 'all 0.2s ease'
                                }}
                                onMouseEnter={(e) => { 
                                    const isGlobal = (() => { try { const c = localStorage.getItem('demo_config_cache'); return c ? JSON.parse(c).data.is_demo : false; } catch(e) { return false; } })();
                                    if (currentUser?.id === 'demo' && isGlobal) return;
                                    e.currentTarget.style.background = currentUser?.id === 'demo' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(239, 68, 68, 0.2)'; 
                                }}
                                onMouseLeave={(e) => { 
                                    const isGlobal = (() => { try { const c = localStorage.getItem('demo_config_cache'); return c ? JSON.parse(c).data.is_demo : false; } catch(e) { return false; } })();
                                    if (currentUser?.id === 'demo' && isGlobal) return;
                                    e.currentTarget.style.background = currentUser?.id === 'demo' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(239, 68, 68, 0.1)'; 
                                }}
                                >
                                    {currentUser?.id === 'demo' ? 'Sign Up / Log In' : 'Log Out'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {deleteAccountModalOpen && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
                    zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'auto'
                }} onClick={() => setDeleteAccountModalOpen(false)}>
                    <div style={{
                        background: 'var(--bg-card)', padding: '24px', borderRadius: '12px',
                        border: '1px solid var(--border-color)', width: '360px',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.5)', textAlign: 'center'
                    }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>⚠️</div>
                        <h3 style={{ margin: '0 0 12px 0', color: 'var(--text-main)', fontSize: '1.2rem' }}>Delete Account?</h3>
                        <p style={{ color: 'var(--text-dim)', marginBottom: '24px', fontSize: '0.95rem' }}>
                            Are you sure you want to completely delete your account? All of your saved pipelines, custom nodes, and data will be permanently erased. This action cannot be undone.
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
                            <button onClick={() => setDeleteAccountModalOpen(false)} style={{
                                background: 'transparent', color: 'var(--text-dim)', border: '1px solid var(--border-color)',
                                padding: '10px 16px', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s',
                                fontWeight: 600, flex: 1
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >Cancel</button>
                            <button onClick={executeDeleteAccount} style={{
                                background: 'linear-gradient(135deg, #ef4444, #b91c1c)', color: 'white', border: 'none',
                                padding: '10px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold',
                                boxShadow: '0 4px 10px rgba(239, 68, 68, 0.3)', transition: 'all 0.2s', flex: 1
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                            >Delete Permanently</button>
                        </div>
                    </div>
                </div>
            )}

            {deleteConfirmModal.isOpen && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
                    zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'auto'
                }} onClick={() => setDeleteConfirmModal({ isOpen: false, id: null })}>
                    <div style={{
                        background: 'var(--bg-card)', padding: '24px', borderRadius: '12px',
                        border: '1px solid var(--border-color)', width: '320px',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.5)', textAlign: 'center'
                    }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>⚠️</div>
                        <h3 style={{ margin: '0 0 12px 0', color: 'var(--text-main)', fontSize: '1.2rem' }}>Delete Pipeline?</h3>
                        <p style={{ color: 'var(--text-dim)', marginBottom: '24px', fontSize: '0.95rem' }}>
                            Are you sure you want to delete this pipeline? This action cannot be undone.
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
                            <button onClick={() => setDeleteConfirmModal({ isOpen: false, id: null })} style={{
                                background: 'transparent', color: 'var(--text-dim)', border: '1px solid var(--border-color)',
                                padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s',
                                fontWeight: 600
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >Cancel</button>
                            <button onClick={() => {
                                                executeDelete(deleteConfirmModal.id);
                                                setDeleteConfirmModal({ isOpen: false, id: null });
                                            }} style={{
                                                background: 'linear-gradient(135deg, #ef4444, #b91c1c)', color: 'white', border: 'none',
                                                padding: '8px 24px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold',
                                                boxShadow: '0 4px 10px rgba(239, 68, 68, 0.3)', transition: 'all 0.2s'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
                                            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                                            >Delete</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Preview Modal Overlay */}
            {previewModal.isOpen && previewModal.pipeline && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(15, 17, 26, 0.9)', backdropFilter: 'blur(8px)',
                    zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    pointerEvents: 'auto'
                }} onClick={() => setPreviewModal({ isOpen: false, pipeline: null })}>
                    <div style={{
                        background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border-color)',
                        width: '95vw', height: '90vh', maxWidth: '1200px', display: 'flex', flexDirection: 'column',
                        overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
                    }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)' }}>
                            <div>
                                <h3 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.2rem' }}>Preview: {previewModal.pipeline.name}</h3>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '4px' }}>Saved on {new Date(previewModal.pipeline.created_at).toLocaleString()}</div>
                            </div>
                            <button onClick={() => setPreviewModal({ isOpen: false, pipeline: null })} style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
                        </div>
                        <div style={{ flex: 1, position: 'relative', background: '#0a0a0a' }}>
                            <ReactFlow
                                nodes={JSON.parse(previewModal.pipeline.nodes)}
                                edges={JSON.parse(previewModal.pipeline.edges)}
                                nodeTypes={nodeTypes}
                                fitView
                                fitViewOptions={{ padding: 0.2 }}
                                nodesDraggable={false}
                                nodesConnectable={false}
                                elementsSelectable={false}
                                minZoom={0.1}
                                maxZoom={3}
                                attributionPosition="bottom-right"
                            >
                                <Background color="#3b82f6" gap={20} size={1} />
                            </ReactFlow>
                        </div>
                        <div style={{ padding: '16px', borderTop: '1px solid var(--border-color)', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px', background: 'rgba(0,0,0,0.2)' }}>
                            <div style={{ color: 'var(--text-dim)', fontSize: '0.85rem', flex: '1 1 auto', minWidth: '150px' }}>Read-only preview. Pan/zoom enabled.</div>
                            <div style={{ display: 'flex', gap: '12px', flex: '1 1 auto' }}>
                                <button 
                                    onClick={() => setPreviewModal({ isOpen: false, pipeline: null })}
                                    style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', flex: 1, minWidth: '120px' }}
                                >
                                    Close Preview
                                </button>
                                <button 
                                    onClick={() => {
                                        handleSwitchPipeline(previewModal.pipeline);
                                        setPreviewModal({ isOpen: false, pipeline: null });
                                    }}
                                    style={{ background: '#10b981', border: 'none', color: '#fff', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', flex: 1, minWidth: '120px' }}
                                >
                                    Open Pipeline
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {unsavedModal.isOpen && (
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
                            You have unsaved changes. Do you want to save them before {unsavedModal.pendingAction === 'logout' ? 'logging out' : 'switching pipelines'}?
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <button onClick={async () => {
                                try {
                                    await savePipelineToServer(currentPipelineName || 'My Pipeline', !currentPipelineId);
                                    setUnsavedModal({ isOpen: false, pendingAction: null });
                                    if (unsavedModal.pendingAction === 'logout') executeLogout();
                                    else executeSwitch(unsavedModal.pendingAction.payload);
                                } catch (e) {
                                    console.error(e);
                                    alert("Failed to save pipeline.");
                                }
                            }} style={{
                                background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: 'white', border: 'none',
                                padding: '12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold'
                            }}>Save Pipeline</button>
                            
                            <button onClick={() => {
                                setUnsavedModal({ isOpen: false, pendingAction: null });
                                if (unsavedModal.pendingAction === 'logout') executeLogout();
                                else executeSwitch(unsavedModal.pendingAction.payload);
                            }} style={{
                                background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)',
                                padding: '12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold'
                            }}>Discard Changes</button>
                            
                            <button onClick={() => setUnsavedModal({ isOpen: false, pendingAction: null })} style={{
                                background: 'transparent', color: 'var(--text-dim)', border: '1px solid var(--border-color)',
                                padding: '12px', borderRadius: '6px', cursor: 'pointer'
                            }}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
