import React, { useState, useEffect } from 'react';
import { Joyride } from 'react-joyride';
import { useStore } from './store';
import { shallow } from 'zustand/shallow';

const selector = (state) => ({
    addCustomNode: state.addCustomNode,
    updateCustomNode: state.updateCustomNode
});

export const CustomNodeModal = ({ onClose, initialNode }) => {
    const { addCustomNode, updateCustomNode } = useStore(selector, shallow);
    
    // Parse initial config if editing
    const initConfig = initialNode ? (typeof initialNode.config === 'string' ? JSON.parse(initialNode.config) : initialNode.config) : null;
    
    const [name, setName] = useState(initialNode ? initialNode.name : 'New Node');
    const [color, setColor] = useState(initConfig ? initConfig.color : '#8b5cf6');
    const [inputs, setInputs] = useState(initConfig ? initConfig.inputs : []);
    const [outputs, setOutputs] = useState(initConfig ? initConfig.outputs : []);
    const [fields, setFields] = useState(initConfig ? initConfig.fields : []);
    
    const [loading, setLoading] = useState(false);
    
    // Tutorial state
    const [runTour, setRunTour] = useState(false);
    const tourSteps = [
        {
            target: '.custom-node-name',
            title: 'Node Name (1/5)',
            content: 'Give your custom node a unique, descriptive name.',
            placement: 'bottom'
        },
        {
            target: '.custom-node-color',
            title: 'Theme Color (2/5)',
            content: 'Pick a color theme for your node to help distinguish it on the canvas.',
            placement: 'bottom'
        },
        {
            target: '.custom-node-handles',
            title: 'Input & Output Handles (3/5)',
            content: 'Add inputs (left handles) and outputs (right handles) to connect data in your pipeline.',
            placement: 'top'
        },
        {
            target: '.custom-node-fields',
            title: 'UI Fields (4/5)',
            content: 'Add custom UI controls (Text, Textarea, or Dropdown) so users can configure this node directly from the canvas.',
            placement: 'top'
        },
        {
            target: '.custom-node-save',
            title: 'Save Node (5/5)',
            content: 'Once you are happy with your configuration, save your node to add it to your Node Palette!',
            placement: 'top'
        }
    ];
    
    // Add custom styling for the modal inputs directly
    const inputStyle = {
        width: '100%',
        background: 'rgba(0, 0, 0, 0.2)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        color: '#fff',
        padding: '12px 14px',
        borderRadius: '8px',
        fontFamily: 'inherit',
        fontSize: '14px',
        outline: 'none',
        transition: 'border-color 0.2s',
        boxSizing: 'border-box'
    };

    const labelStyle = {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        fontSize: '14px',
        fontWeight: '500',
        color: 'var(--text-main)',
        textAlign: 'left'
    };

    const secondaryBtnStyle = {
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        color: 'var(--text-main)',
        padding: '6px 12px',
        fontSize: '12px',
        borderRadius: '6px',
        cursor: 'pointer',
        transition: 'all 0.2s',
        minWidth: 'auto',
        outline: 'none'
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const nodeConfig = { name, color, inputs, outputs, fields };
            if (initialNode) {
                await updateCustomNode(initialNode.id, name, nodeConfig);
            } else {
                await addCustomNode(name, nodeConfig);
            }
            onClose();
        } catch (e) {
            console.error(e);
            alert("Failed to save custom node");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 3000, padding: '20px' }}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ 
                maxWidth: '500px', 
                maxHeight: '90vh', 
                overflowY: 'auto',
                padding: window.innerWidth <= 768 ? '20px 15px' : '30px',
                textAlign: 'left',
                position: 'relative'
            }}>
                <button 
                    onClick={onClose}
                    style={{ position: 'absolute', top: '24px', right: '30px', background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '24px', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10, transition: 'color 0.2s', padding: 0 }}
                    title="Close"
                    onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                >
                    &times;
                </button>
                <h2 style={{ textAlign: 'center', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                    {initialNode ? 'Edit Custom Node' : 'Create Custom Node'}
                </h2>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <label style={labelStyle} className="custom-node-name">
                        Node Name:
                        <input type="text" value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
                    </label>
                    
                    <label style={labelStyle} className="custom-node-color">
                        Theme Color:
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                            {['#ef4444', '#f59e0b', '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#94a3b8'].map(c => (
                                <div 
                                    key={c}
                                    onClick={() => setColor(c)}
                                    style={{
                                        width: '30px', height: '30px', borderRadius: '50%', background: c, cursor: 'pointer',
                                        border: color === c ? '3px solid white' : '2px solid transparent',
                                        boxShadow: color === c ? `0 0 10px ${c}` : 'none'
                                    }}
                                />
                            ))}
                            <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.2)', margin: '0 5px' }} />
                            <input 
                                type="color" 
                                value={color} 
                                onChange={e => setColor(e.target.value)} 
                                style={{ width: '34px', height: '34px', padding: '0', border: 'none', borderRadius: '4px', cursor: 'pointer', background: 'transparent' }}
                                title="Custom Color"
                            />
                        </div>
                    </label>
                    
                    <div className="custom-node-handles" style={{ background: 'rgba(0,0,0,0.1)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <h4 style={{ margin: 0 }}>Inputs (Left Handles)</h4>
                            <button onClick={() => setInputs([...inputs, `Input ${inputs.length + 1}`])} style={secondaryBtnStyle} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}>+ Add</button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {inputs.map((inp, i) => (
                                <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <input type="text" value={inp} onChange={e => {
                                        const newInp = [...inputs];
                                        newInp[i] = e.target.value;
                                        setInputs(newInp);
                                    }} style={{...inputStyle, padding: '8px 12px'}} />
                                    <button onClick={() => setInputs(inputs.filter((_, idx) => idx !== i))} style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', cursor: 'pointer', width: '32px', height: '32px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>×</button>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    <div className="custom-node-handles" style={{ background: 'rgba(0,0,0,0.1)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <h4 style={{ margin: 0 }}>Outputs (Right Handles)</h4>
                            <button onClick={() => setOutputs([...outputs, `Output ${outputs.length + 1}`])} style={secondaryBtnStyle} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}>+ Add</button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {outputs.map((out, i) => (
                                <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <input type="text" value={out} onChange={e => {
                                        const newOut = [...outputs];
                                        newOut[i] = e.target.value;
                                        setOutputs(newOut);
                                    }} style={{...inputStyle, padding: '8px 12px'}} />
                                    <button onClick={() => setOutputs(outputs.filter((_, idx) => idx !== i))} style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', cursor: 'pointer', width: '32px', height: '32px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>×</button>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    <div className="custom-node-fields" style={{ background: 'rgba(0,0,0,0.1)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h4 style={{ margin: 0 }}>UI Fields</h4>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button onClick={() => setFields([...fields, { type: 'text', name: `field_${fields.length}`, label: `Field ${fields.length + 1}` }])} style={secondaryBtnStyle} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}>+ Text</button>
                                <button onClick={() => setFields([...fields, { type: 'textarea', name: `field_${fields.length}`, label: `Field ${fields.length + 1}` }])} style={secondaryBtnStyle} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}>+ Area</button>
                                <button onClick={() => setFields([...fields, { type: 'dropdown', name: `field_${fields.length}`, label: `Field ${fields.length + 1}`, options: ['Option 1', 'Option 2'] }])} style={secondaryBtnStyle} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}>+ Dropdown</button>
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {fields.map((field, i) => (
                                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--accent-color)' }}>{field.type.toUpperCase()}</span>
                                        <button onClick={() => setFields(fields.filter((_, idx) => idx !== i))} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '16px' }}>×</button>
                                    </div>
                                    <input type="text" placeholder="Label (e.g. Prompt)" value={field.label} onChange={e => {
                                        const newFields = [...fields];
                                        newFields[i].label = e.target.value;
                                        setFields(newFields);
                                    }} style={{...inputStyle, padding: '8px 12px'}} />
                                    <input type="text" placeholder="Internal Name (no spaces)" value={field.name} onChange={e => {
                                        const newFields = [...fields];
                                        newFields[i].name = e.target.value.replace(/\s+/g, '_');
                                        setFields(newFields);
                                    }} style={{...inputStyle, padding: '8px 12px'}} />
                                     {field.type === 'dropdown' && (
                                         <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                             {field.options.map((opt, optIdx) => (
                                                 <div key={optIdx} style={{ display: 'flex', gap: '8px' }}>
                                                     <input type="text" placeholder={`Option ${optIdx + 1}`} value={opt} onChange={e => {
                                                         const newFields = [...fields];
                                                         newFields[i].options[optIdx] = e.target.value;
                                                         setFields(newFields);
                                                     }} style={{...inputStyle, padding: '8px 12px'}} />
                                                     <button onClick={() => {
                                                         const newFields = [...fields];
                                                         newFields[i].options = newFields[i].options.filter((_, idx) => idx !== optIdx);
                                                         setFields(newFields);
                                                     }} style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', cursor: 'pointer', width: '32px', height: '32px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>×</button>
                                                 </div>
                                             ))}
                                             <button onClick={() => {
                                                 const newFields = [...fields];
                                                 newFields[i].options.push(`Option ${newFields[i].options.length + 1}`);
                                                 setFields(newFields);
                                             }} style={secondaryBtnStyle} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}>+ Add Option</button>
                                         </div>
                                     )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '30px' }}>
                    <button onClick={onClose} style={{ ...secondaryBtnStyle, padding: '10px 20px', fontSize: '14px', borderRadius: '8px' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}>Cancel</button>
                    <button onClick={handleSave} disabled={loading} className="demo-upgrade-btn custom-node-save" style={{ minWidth: '120px', borderRadius: '8px', padding: '10px 20px', fontSize: '14px', cursor: 'pointer' }}>
                        {loading ? 'Saving...' : (initialNode ? 'Update Node' : 'Save Node')}
                    </button>
                </div>
            </div>
        </div>
    );
};
