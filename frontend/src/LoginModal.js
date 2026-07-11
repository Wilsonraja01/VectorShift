import React, { useState, useEffect } from 'react';
import { useStore } from './store';
import SHA256 from 'crypto-js/sha256';
import { createPortal } from 'react-dom';

export const LoginModal = ({ initialMode = 'login', onClose }) => {
    const [mode, setMode] = useState(initialMode); // login, signup, forgot, reset
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [resetToken, setResetToken] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    const login = useStore(state => state.login);

    const validatePassword = (pwd) => {
        if (pwd.length < 8) return "Password must be at least 8 characters long.";
        if (!/[A-Z]/.test(pwd)) return "Password must contain at least one uppercase letter.";
        if (!/[a-z]/.test(pwd)) return "Password must contain at least one lowercase letter.";
        if (!/[0-9]/.test(pwd)) return "Password must contain at least one number.";
        if (!/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) return "Password must contain at least one special character.";
        return null;
    };

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('reset_token');
        
        if (token) {
            setMode('reset');
            setResetToken(token);
        }
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccessMessage(null);

        try {
            if (mode === 'login' || mode === 'signup') {
                if (!username || !password || (mode === 'signup' && !email)) {
                    throw new Error("Please fill out all required fields.");
                }
                
                if (mode === 'signup') {
                    const pwdError = validatePassword(password);
                    if (pwdError) throw new Error(pwdError);
                }

                const passwordHash = SHA256(password).toString();
                const response = await fetch(`https://vector-shift-backend.fly.dev/auth`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username,
                        password_hash: passwordHash,
                        email: mode === 'signup' ? email : undefined
                    })
                });
                const data = await response.json();
                if (response.ok && data.status === 'success') {
                    if (mode === 'signup') {
                        setSuccessMessage(data.message); // "User created. Please check your email..."
                        setMode('login'); // Switch to login view for when they come back
                    } else {
                        login(data.user, data.token);
                        if (onClose) onClose();
                    }
                } else {
                    throw new Error(data.detail || 'Authentication failed.');
                }
            } else if (mode === 'forgot') {
                if (!email) throw new Error("Please enter your email.");
                const response = await fetch(`https://vector-shift-backend.fly.dev/auth/reset-request`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email })
                });
                if (response.ok) {
                    setSuccessMessage("If an account exists, a reset link was sent (check terminal if mock mode).");
                } else {
                    throw new Error("Failed to request reset.");
                }
            } else if (mode === 'reset') {
                if (!password) throw new Error("Please enter a new password.");
                
                const pwdError = validatePassword(password);
                if (pwdError) throw new Error(pwdError);
                
                const passwordHash = SHA256(password).toString();
                const response = await fetch(`https://vector-shift-backend.fly.dev/auth/reset-password`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token: resetToken, new_password_hash: passwordHash })
                });
                const data = await response.json();
                if (response.ok) {
                    setSuccessMessage("Password reset successfully! You can now log in.");
                    setTimeout(() => {
                        window.location.href = '/'; // clear URL params
                    }, 2000);
                } else {
                    throw new Error(data.detail || 'Failed to reset password.');
                }
            }
        } catch (err) {
            setError(err.message || 'Network error occurred.');
        } finally {
            setLoading(false);
        }
    };

    return createPortal(
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'linear-gradient(135deg, rgba(15, 17, 26, 0.95), rgba(20, 20, 30, 0.95))',
            backdropFilter: 'blur(10px)', zIndex: 10000, overflowY: 'auto', display: 'flex', flexDirection: 'column',
            padding: '16px', boxSizing: 'border-box'
        }}>
            <div style={{
                margin: 'auto', background: 'var(--bg-card)', width: '100%', maxWidth: '400px', padding: '32px 24px',
                borderRadius: '16px', border: '1px solid var(--border-color)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.8), 0 0 40px rgba(59, 130, 246, 0.1)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative',
                boxSizing: 'border-box'
            }}>
                {onClose && (
                    <button type="button" onClick={onClose} style={{
                        position: 'absolute', top: '16px', right: '16px', background: 'transparent',
                        border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem'
                    }}>✕</button>
                )}
                <img 
                    src="/favicon.svg" 
                    alt="Vector Shift"
                    style={{ 
                        width: '72px', height: '72px', borderRadius: '16px', 
                        marginBottom: '24px',
                        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.6)'
                    }} 
                />
                
                <h2 style={{ margin: '0 0 8px 0', color: 'white', fontSize: '1.8rem', textAlign: 'center' }}>
                    {mode === 'login' ? 'Welcome Back' : mode === 'signup' ? 'Create Account' : mode === 'forgot' ? 'Reset Password' : 'Set New Password'}
                </h2>
                
                {mode === 'login' || mode === 'signup' ? (
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', background: 'rgba(0,0,0,0.3)', padding: '4px', borderRadius: '8px' }}>
                        <button onClick={() => {setMode('login'); setError(null); setSuccessMessage(null);}} style={{ padding: '8px 16px', borderRadius: '6px', background: mode === 'login' ? 'rgba(255,255,255,0.1)' : 'transparent', color: mode === 'login' ? 'white' : 'var(--text-dim)', border: 'none', cursor: 'pointer', transition: 'all 0.2s' }}>Login</button>
                        <button onClick={() => {setMode('signup'); setError(null); setSuccessMessage(null);}} style={{ padding: '8px 16px', borderRadius: '6px', background: mode === 'signup' ? 'rgba(255,255,255,0.1)' : 'transparent', color: mode === 'signup' ? 'white' : 'var(--text-dim)', border: 'none', cursor: 'pointer', transition: 'all 0.2s' }}>Sign Up</button>
                    </div>
                ) : <div style={{height: '16px'}}></div>}

                <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {(mode === 'login' || mode === 'signup') && (
                        <div>
                            <label style={{ display: 'block', color: 'var(--text-dim)', marginBottom: '8px', fontSize: '0.9rem' }}>Username</label>
                            <input 
                                type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                                style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'white', outline: 'none', fontSize: '1rem', boxSizing: 'border-box' }}
                                placeholder="Enter username"
                            />
                        </div>
                    )}
                    
                    {(mode === 'signup' || mode === 'forgot') && (
                        <div>
                            <label style={{ display: 'block', color: 'var(--text-dim)', marginBottom: '8px', fontSize: '0.9rem' }}>Email Address</label>
                            <input 
                                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                                style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'white', outline: 'none', fontSize: '1rem', boxSizing: 'border-box' }}
                                placeholder="name@example.com"
                            />
                        </div>
                    )}

                    {(mode === 'login' || mode === 'signup' || mode === 'reset') && (
                        <div>
                            <label style={{ display: 'block', color: 'var(--text-dim)', marginBottom: '8px', fontSize: '0.9rem' }}>
                                {mode === 'reset' ? 'New Password' : 'Password'}
                            </label>
                            <input 
                                type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                                style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'white', outline: 'none', fontSize: '1rem', boxSizing: 'border-box' }}
                                placeholder="••••••••"
                            />
                        </div>
                    )}

                    {error && <div style={{ color: '#ef4444', fontSize: '0.9rem', textAlign: 'center', marginTop: '8px' }}>{error}</div>}
                    {successMessage && <div style={{ color: '#10b981', fontSize: '0.9rem', textAlign: 'center', marginTop: '8px' }}>{successMessage}</div>}

                    <button 
                        type="submit" disabled={loading}
                        style={{ marginTop: '16px', width: '100%', padding: '14px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: 'white', fontSize: '1.1rem', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, boxShadow: '0 4px 15px rgba(59, 130, 246, 0.4)' }}
                    >
                        {loading ? 'Processing...' : (mode === 'login' ? 'Secure Login' : mode === 'signup' ? 'Create Account' : mode === 'forgot' ? 'Send Reset Link' : 'Set Password')}
                    </button>
                </form>

                {mode === 'login' && (
                    <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                        {!onClose && (
                            <button type="button" onClick={() => login({ id: 'demo', username: 'Demo User', avatar_url: null })} style={{ padding: '10px', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.3)', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s', width: '100%' }} onMouseEnter={(e) => {e.currentTarget.style.background='rgba(16, 185, 129, 0.2)'}} onMouseLeave={(e) => {e.currentTarget.style.background='rgba(16, 185, 129, 0.1)'}}>
                                Try Demo Version
                            </button>
                        )}
                        <button type="button" onClick={() => {setMode('forgot'); setError(null); setSuccessMessage(null);}} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: '0.9rem' }}>
                            Forgot your password?
                        </button>
                    </div>
                )}
                {(mode === 'forgot' || mode === 'reset') && (
                    <button type="button" onClick={() => {setMode('login'); setError(null); setSuccessMessage(null);}} style={{ marginTop: '16px', background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '0.9rem' }}>
                        Back to Login
                    </button>
                )}
                
                <div style={{ marginTop: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    &copy; 2026 Wilson Antony. All rights reserved.
                </div>
            </div>
        </div>,
        document.body
    );
};
