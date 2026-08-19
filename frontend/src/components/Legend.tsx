// src/components/Legend.tsx
import React from 'react';

const Legend: React.FC = () => {
  return (
    <div style={{
      position: 'absolute',
      bottom: '30px',
      right: '30px',
      zIndex: 1000,
      backgroundColor: 'white',
      padding: '12px 16px',
      borderRadius: '8px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      fontFamily: 'sans-serif',
      fontSize: '12px',
      minWidth: '120px'
    }}>
      <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#333' }}>
        📊 Puntuación
      </h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            display: 'inline-block',
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            backgroundColor: '#4CAF50'
          }} />
          <span>Excelente (75-100)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            display: 'inline-block',
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            backgroundColor: '#FFC107'
          }} />
          <span>Regular (50-74)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            display: 'inline-block',
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            backgroundColor: '#F44336'
          }} />
          <span>Desfavorable (0-49)</span>
        </div>
      </div>
    </div>
  );
};

export default Legend;