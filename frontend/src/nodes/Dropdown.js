import React, { useState, useRef, useEffect } from 'react';

export const Dropdown = ({ options, value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} style={{ position: 'relative', width: '100%' }}>
      <div 
        className="custom-dropdown-header"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: 'rgba(0, 0, 0, 0.2)',
          border: `1px solid ${isOpen ? 'var(--accent-color)' : 'var(--border-color)'}`,
          borderRadius: '6px',
          padding: '8px 12px',
          color: 'var(--text-main)',
          fontSize: '0.9rem',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          transition: 'all 0.2s ease',
        }}
      >
        <span>{options.find(opt => opt.value === value)?.label || value}</span>
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </div>
      
      {isOpen && (
        <div 
          className="custom-dropdown-list nodrag"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '4px',
            background: '#1a1c28', // Darker background for the list
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            overflow: 'hidden',
            zIndex: 1000,
            boxShadow: '0 8px 16px rgba(0,0,0,0.6)',
          }}
        >
          {options.map((option) => (
            <div
              key={option.value}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(59, 130, 246, 0.3)'; // Primary blue hover
                e.target.style.color = '#ffffff';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'transparent';
                e.target.style.color = 'var(--text-main)';
              }}
              style={{
                padding: '10px 12px',
                color: 'var(--text-main)',
                fontSize: '0.9rem',
                cursor: 'pointer',
                transition: 'background 0.1s'
              }}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
