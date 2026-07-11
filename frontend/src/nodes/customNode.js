import { BaseNode } from './baseNode';
import { Position, useUpdateNodeInternals, Handle } from 'reactflow';
import { useStore } from '../store';
import { shallow } from 'zustand/shallow';
import { Dropdown } from './Dropdown';
import { NodeTextarea } from './NodeTextarea';
import { useEffect } from 'react';

const selector = (state) => ({
    updateNodeField: state.updateNodeField,
});

export const CustomNode = ({ id, data }) => {
    const { updateNodeField } = useStore(selector, shallow);
    const updateNodeInternals = useUpdateNodeInternals();
    
    const config = data?.config ? (typeof data.config === 'string' ? JSON.parse(data.config) : data.config) : {};
    const name = config.name || "Custom Node";
    const color = config.color || "#94a3b8";
    const inputs = config.inputs || [];
    const outputs = config.outputs || [];
    const fields = config.fields || [];

    useEffect(() => {
        updateNodeInternals(id);
        const timer = setTimeout(() => updateNodeInternals(id), 50);
        return () => clearTimeout(timer);
    }, [JSON.stringify(config), id, updateNodeInternals]);

    const handles = [];
    
    inputs.forEach((inputName, i) => {
        const safeName = inputName.replace(/\s+/g, '_');
        handles.push({
            id: `${id}-input-${safeName}`,
            type: 'target',
            position: Position.Left,
            style: { top: `${(i + 1) * 100 / (inputs.length + 1)}%` }
        });
    });

    outputs.forEach((outputName, i) => {
        const safeName = outputName.replace(/\s+/g, '_');
        handles.push({
            id: `${id}-output-${safeName}`,
            type: 'source',
            position: Position.Right,
            style: { top: `${(i + 1) * 100 / (outputs.length + 1)}%` }
        });
    });

    const handleFieldChange = (fieldName, value) => {
        updateNodeField(id, fieldName, value);
    };

    return (
        <BaseNode id={id} title={name} handles={handles} style={{ border: `1px solid ${color}` }} minHeight={100} minWidth={200}>
            <div className="node-content" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {fields.map((field) => {
                    const value = data[field.name] || '';
                    if (field.type === 'text') {
                        return (
                            <label key={field.name} className="node-label">
                                {field.label}:
                                <input 
                                    type="text" 
                                    value={value} 
                                    onChange={(e) => handleFieldChange(field.name, e.target.value)}
                                    className="node-input"
                                />
                            </label>
                        );
                    } else if (field.type === 'textarea') {
                        return (
                            <label key={field.name} className="node-label">
                                {field.label}:
                                <div style={{ 
                                    background: 'rgba(0, 0, 0, 0.2)', 
                                    border: '1px solid var(--border-color)', 
                                    borderRadius: '6px',
                                    padding: '0 8px 8px 8px',
                                    transition: 'border-color 0.2s',
                                    width: '100%',
                                    boxSizing: 'border-box'
                                }}>
                                    <NodeTextarea
                                        nodeId={id}
                                        value={value}
                                        onChange={(e) => handleFieldChange(field.name, e.target.value)}
                                        autoResizeNode={false}
                                        placeholder="Type here..."
                                        minHeight="40px"
                                        flex="none"
                                    />
                                </div>
                            </label>
                        );
                    } else if (field.type === 'dropdown') {
                        return (
                            <label key={field.name} className="node-label">
                                {field.label}:
                                <Dropdown 
                                    value={value} 
                                    onChange={(val) => handleFieldChange(field.name, val)}
                                    options={[{ value: '', label: 'Select...' }, ...(field.options?.map(opt => ({ value: opt, label: opt })) || [])]}
                                />
                            </label>
                        );
                    }
                    return null;
                })}
            </div>
        </BaseNode>
    );
};
