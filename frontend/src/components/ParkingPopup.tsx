// src/components/ParkingPopup.tsx
import React from 'react';
import { Parking, MobilityScore } from '../services/api';

interface Props {
  parking: Parking;
  score: MobilityScore | null;
  isLoading: boolean;
  onRefresh: () => void;
}

const ParkingPopup: React.FC<Props> = ({ parking, score, isLoading, onRefresh }) => {
  const getScoreColor = (score: number) => {
    if (score >= 75) return '#4CAF50';
    if (score >= 50) return '#FFC107';
    return '#F44336';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 75) return '✅ Excelente';
    if (score >= 50) return '⚠️ Regular';
    return '❌ Desfavorable';
  };

  return (
    <div style={{ 
      fontFamily: 'sans-serif', 
      minWidth: '220px',
      maxWidth: '280px'
    }}>
      <h3 style={{ 
        margin: '0 0 10px 0', 
        fontSize: '16px',
        color: '#333',
        borderBottom: '2px solid #e0e0e0',
        paddingBottom: '8px'
      }}>
        {parking.name}
      </h3>
      
      <div style={{ fontSize: '13px', color: '#666', marginBottom: '10px' }}>
        <div>🅿️ {parking.totalSpots} plazas totales</div>
        <div>📍 {parking.latitude.toFixed(4)}, {parking.longitude.toFixed(4)}</div>
        <div>🆔 {parking.id}</div>
      </div>
      
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '12px 0' }}>
          <div style={{ 
            display: 'inline-block',
            width: '24px',
            height: '24px',
            border: '3px solid #e0e0e0',
            borderTop: '3px solid #1976D2',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite'
          }} />
          <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: '#666' }}>
            Analizando movilidad...
          </p>
        </div>
      ) : score ? (
        <div style={{ 
          backgroundColor: '#f8f9fa', 
          padding: '12px',
          borderRadius: '6px',
          marginTop: '8px'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            marginBottom: '8px'
          }}>
            <span style={{ fontWeight: 'bold' }}>Score:</span>
            <span style={{
              backgroundColor: getScoreColor(score.score),
              color: 'white',
              padding: '4px 12px',
              borderRadius: '12px',
              fontWeight: 'bold',
              fontSize: '18px'
            }}>
              {score.score}
            </span>
          </div>
          
          <div style={{ 
            fontSize: '14px', 
            fontWeight: '500',
            color: getScoreColor(score.score),
            marginBottom: '8px'
          }}>
            {getScoreLabel(score.score)}
          </div>
          
          <p style={{ 
            margin: '0 0 8px 0', 
            fontSize: '13px', 
            color: '#555',
            fontStyle: 'italic'
          }}>
            {score.recommendation}
          </p>
          
          <hr style={{ border: '0.5px solid #e0e0e0', margin: '8px 0' }} />
          
          <div style={{ fontSize: '12px', color: '#555' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>🚗 Tráfico:</span>
              <span>{score.details.traffic.congestionLevel}%</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>🅿️ Plazas libres:</span>
              <span>{score.details.parking.availableSpots}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>🌫️ NO₂:</span>
              <span>{score.details.airQuality.aqiIndex} µg/m³</span>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={onRefresh}
          style={{
            width: '100%',
            padding: '8px 12px',
            backgroundColor: '#1976D2',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            marginTop: '8px'
          }}
        >
          🔄 Calcular viabilidad
        </button>
      )}
      
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default ParkingPopup;