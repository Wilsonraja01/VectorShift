import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { Dropdown } from './Dropdown';
import { NodeTextarea } from './NodeTextarea';

export const NodeInput = ({ id, fieldName, label, defaultValue = '', ...props }) => {
    const updateNodeField = useStore((state) => state.updateNodeField);
    const storeValue = useStore((state) => {
        const node = state.nodes.find(n => n.id === id);
        return node?.data?.[fieldName];
    });

    const [value, setValue] = useState(storeValue ?? defaultValue);

    useEffect(() => {
        if (storeValue !== undefined && storeValue !== value) {
            setValue(storeValue);
        }
    }, [storeValue]);

    const handleChange = (e) => {
        const newVal = e.target.value;
        setValue(newVal);
        updateNodeField(id, fieldName, newVal);
    };

    return (
        <label>
            {label}
            <input type="text" value={value} onChange={handleChange} {...props} />
        </label>
    );
};

export const NodeDropdown = ({ id, fieldName, label, defaultValue = '', options, ...props }) => {
    const updateNodeField = useStore((state) => state.updateNodeField);
    const storeValue = useStore((state) => {
        const node = state.nodes.find(n => n.id === id);
        return node?.data?.[fieldName];
    });

    const [value, setValue] = useState(storeValue ?? defaultValue);

    useEffect(() => {
        if (storeValue !== undefined && storeValue !== value) {
            setValue(storeValue);
        }
    }, [storeValue]);

    const handleChange = (val) => {
        setValue(val);
        updateNodeField(id, fieldName, val);
    };

    return (
        <label>
            {label}
            <Dropdown value={value} onChange={handleChange} options={options} {...props} />
        </label>
    );
};

export const NodeTextareaField = ({ id, fieldName, defaultValue = '', ...props }) => {
    const updateNodeField = useStore((state) => state.updateNodeField);
    const storeValue = useStore((state) => {
        const node = state.nodes.find(n => n.id === id);
        return node?.data?.[fieldName];
    });

    const [value, setValue] = useState(storeValue ?? defaultValue);

    useEffect(() => {
        if (storeValue !== undefined && storeValue !== value) {
            setValue(storeValue);
        }
    }, [storeValue]);

    const handleChange = (e) => {
        const newVal = e.target.value;
        setValue(newVal);
        updateNodeField(id, fieldName, newVal);
    };

    return (
        <NodeTextarea
            nodeId={id}
            value={value}
            onChange={handleChange}
            {...props}
        />
    );
};
