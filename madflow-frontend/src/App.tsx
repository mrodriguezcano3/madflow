// src/App.tsx
import { useEffect, useState, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// ============================================
// CONFIGURACIÓN DE ICONOS DE LEAFLET
// ============================================
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

// ============================================
// INTERFACES
// ============================================
interface Parking {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  totalSpots: number;
}

interface MobilityAnalysis {
  parkingName: string;
  score: number;
  recommendation: string;
  details: {
    traffic: { congestionLevel: number };
    parking: { availableSpots: number };
    airQuality: { aqiIndex: number };
  };
}

interface ParkingsResponse {
  total: number;
  parkings: Parking[];
}

// ============================================
// CONSTANTES
// ============================================
const API_BASE_URL = 'http://localhost:3000/api';

// ============================================
// COMPONENTE PARA CENTRAR EL MAPA
// ============================================
const MapCenter: React.FC<{ center: [number, number] }> = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
};

// ============================================
// COMPONENTE PRINCIPAL
// ============================================
function App() {
  // Estados principales
  const [parkings, setParkings] = useState<Parking[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estados para análisis
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [analysisResults, setAnalysisResults] = useState<Map<string, MobilityAnalysis>>(new Map());
  const [selectedParkingId, setSelectedParkingId] = useState<string | null>(null);
  
  // Estados para ubicación del usuario
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([40.4168, -3.7038]);
  
  // Estado para filtro de radio
  const [filterRadius, setFilterRadius] = useState<number>(5);
  
  // Estado para debug
  const [debugInfo, setDebugInfo] = useState<string>('');

  // Referencia al mapa
  const mapRef = useRef<L.Map | null>(null);

  // ============================================
  // FUNCIONES DE CARGA DE DATOS
  // ============================================

  // Verificar conexión con el backend
  const checkBackendConnection = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Backend conectado:', data);
        setDebugInfo('Backend conectado ✅');
        return true;
      } else {
        console.error('❌ Backend respondió con error:', response.status);
        setDebugInfo(`Backend error: ${response.status}`);
        return false;
      }
    } catch (error) {
      console.error('❌ No se pudo conectar al backend:', error);
      setDebugInfo('No se pudo conectar al backend ❌');
      return false;
    }
  }, []);

  // Cargar parkings desde el backend
  const loadParkings = useCallback(async (lat?: number, lon?: number) => {
    setLoading(true);
    setError(null);
    
    try {
      // Primero verificar conexión
      const isConnected = await checkBackendConnection();
      if (!isConnected) {
        throw new Error('No se pudo conectar al backend en ' + API_BASE_URL);
      }

      let url = `${API_BASE_URL}/parkings`;
      
      // Si tenemos coordenadas, añadir filtro por radio
      if (lat !== undefined && lon !== undefined) {
        url += `?lat=${lat}&lon=${lon}&radius=${filterRadius}`;
      }
      
      console.log('📡 Fetching parkings desde:', url);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error response:', errorText);
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const data: ParkingsResponse = await response.json();
      console.log('📋 Datos recibidos:', data);
      
      // CORRECCIÓN IMPORTANTE: La API devuelve { total, parkings }
      if (data && data.parkings && Array.isArray(data.parkings) && data.parkings.length > 0) {
        setParkings(data.parkings);
        console.log(`✅ ${data.parkings.length} parkings cargados`);
        setDebugInfo(`${data.parkings.length} parkings cargados ✅`);
      } else {
        // Si no hay parkings, intentar cargar sin filtro
        if (lat !== undefined && lon !== undefined) {
          console.log('⚠️ No hay parkings en esta zona, cargando todos...');
          const allResponse = await fetch(`${API_BASE_URL}/parkings`);
          if (allResponse.ok) {
            const allData: ParkingsResponse = await allResponse.json();
            if (allData && allData.parkings && Array.isArray(allData.parkings)) {
              setParkings(allData.parkings);
              console.log(`✅ ${allData.parkings.length} parkings cargados (todos)`);
              setDebugInfo(`${allData.parkings.length} parkings cargados (sin filtro)`);
            } else {
              setParkings([]);
              setError('No se encontraron parkings en la base de datos');
            }
          } else {
            setParkings([]);
            setError('No se encontraron parkings en esta zona');
          }
        } else {
          setParkings([]);
          setError('No se encontraron parkings en la base de datos');
        }
      }
      
    } catch (err) {
      console.error('❌ Error al cargar parkings:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(`Error al conectar con el backend: ${errorMessage}`);
      setParkings([]);
      setDebugInfo(`Error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }, [filterRadius, checkBackendConnection]);

  // Obtener ubicación del usuario
  const getUserLocation = useCallback(() => {
    if (!navigator.geolocation) {
      console.warn('Geolocalización no soportada');
      loadParkings();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const location: [number, number] = [latitude, longitude];
        setUserLocation(location);
        setMapCenter(location);
        loadParkings(latitude, longitude);
        console.log(`📍 Ubicación obtenida: ${latitude}, ${longitude}`);
      },
      (error) => {
        console.warn('No se pudo obtener ubicación:', error.message);
        // Usar centro de Madrid por defecto
        loadParkings();
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  }, [loadParkings]);

  // ============================================
  // FUNCIONES DE ANÁLISIS
  // ============================================

  // Analizar un parking específico
  const analyzeParking = useCallback(async (parkingId: string) => {
    // Si ya tenemos el análisis, mostrarlo
    if (analysisResults.has(parkingId)) {
      setSelectedParkingId(parkingId);
      return;
    }

    setAnalyzingId(parkingId);
    setSelectedParkingId(parkingId);

    try {
      const response = await fetch(`${API_BASE_URL}/mobility/${parkingId}`);
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const data: MobilityAnalysis = await response.json();
      
      // Guardar en el mapa de resultados
      setAnalysisResults(prev => new Map(prev).set(parkingId, data));
      
      console.log(`✅ Análisis completado para parking ${parkingId}: Score ${data.score}`);
      
    } catch (error) {
      console.error('Error al analizar viabilidad:', error);
      alert('Error al calcular la viabilidad. Intenta de nuevo.');
    } finally {
      setAnalyzingId(null);
    }
  }, [analysisResults]);

  // Obtener el análisis de un parking (si existe)
  const getAnalysis = useCallback((parkingId: string): MobilityAnalysis | null => {
    return analysisResults.get(parkingId) || null;
  }, [analysisResults]);

  // ============================================
  // EFECTOS
  // ============================================

  // Cargar parkings al montar el componente
  useEffect(() => {
    checkBackendConnection().then((connected) => {
      if (connected) {
        getUserLocation();
      } else {
        setLoading(false);
        setError(`No se pudo conectar al backend en ${API_BASE_URL}`);
      }
    });
  }, [getUserLocation, checkBackendConnection]);

  // ============================================
  // RENDERIZADO DE ICONOS PERSONALIZADOS
  // ============================================

  const getMarkerIcon = useCallback((parkingId: string) => {
    const analysis = getAnalysis(parkingId);
    const score = analysis?.score;
    
    let color = '#6c757d'; // Gris por defecto
    let size = 28;
    
    if (score !== undefined && score !== null) {
      if (score >= 75) {
        color = '#28a745'; // Verde - Excelente
        size = 32;
      } else if (score >= 50) {
        color = '#ffc107'; // Amarillo - Regular
        size = 28;
      } else {
        color = '#dc3545'; // Rojo - Malo
        size = 24;
      }
    } else if (analyzingId === parkingId) {
      color = '#17a2b8'; // Azul - Cargando
    }
    
    return L.divIcon({
      className: 'custom-marker',
      html: `<div style="
        background-color: ${color};
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: ${size > 28 ? '13px' : '11px'};
        transition: all 0.3s ease;
        cursor: pointer;
      ">
        ${score !== undefined && score !== null ? score : analyzingId === parkingId ? '...' : '?'}
      </div>`,
      iconSize: [size, size],
      iconAnchor: [size/2, size/2],
    });
  }, [getAnalysis, analyzingId]);

  // ============================================
  // RENDERIZADO DEL POPUP
  // ============================================

  const renderPopupContent = useCallback((parking: Parking) => {
    const analysis = getAnalysis(parking.id);
    const isLoading = analyzingId === parking.id;

    const getScoreColor = (score: number) => {
      if (score >= 75) return '#28a745';
      if (score >= 50) return '#ffc107';
      return '#dc3545';
    };

    const getScoreLabel = (score: number) => {
      if (score >= 75) return '✅ Excelente';
      if (score >= 50) return '⚠️ Regular';
      return '❌ Desfavorable';
    };

    return (
      <div style={{ 
        fontFamily: 'Arial, sans-serif', 
        minWidth: '220px',
        maxWidth: '280px'
      }}>
        <h3 style={{ 
          margin: '0 0 8px 0', 
          fontSize: '15px',
          color: '#333',
          borderBottom: '2px solid #e0e0e0',
          paddingBottom: '6px'
        }}>
          {parking.name}
        </h3>
        
        <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
          <div>🅿️ {parking.totalSpots} plazas totales</div>
          <div style={{ fontSize: '11px', color: '#999' }}>ID: {parking.id}</div>
        </div>
        
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ 
              display: 'inline-block',
              width: '28px',
              height: '28px',
              border: '3px solid #e0e0e0',
              borderTop: '3px solid #007BFF',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite'
            }} />
            <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: '#666' }}>
              Calculando movilidad...
            </p>
          </div>
        ) : analysis ? (
          <div style={{ 
            backgroundColor: '#f8f9fa', 
            padding: '10px',
            borderRadius: '6px',
            marginTop: '6px'
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              marginBottom: '4px'
            }}>
              <span style={{ fontSize: '14px', fontWeight: 'bold' }}>Score:</span>
              <span style={{
                backgroundColor: getScoreColor(analysis.score),
                color: 'white',
                padding: '2px 12px',
                borderRadius: '12px',
                fontWeight: 'bold',
                fontSize: '20px'
              }}>
                {analysis.score}
              </span>
            </div>
            
            <div style={{ 
              fontSize: '13px', 
              fontWeight: '500',
              color: getScoreColor(analysis.score),
              marginBottom: '4px'
            }}>
              {getScoreLabel(analysis.score)}
            </div>
            
            <p style={{ 
              margin: '0 0 6px 0', 
              fontSize: '12px', 
              color: '#555',
              fontStyle: 'italic'
            }}>
              {analysis.recommendation}
            </p>
            
            <hr style={{ border: '0.5px solid #e0e0e0', margin: '6px 0' }} />
            
            <div style={{ fontSize: '11px', color: '#555' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>🚗 Tráfico:</span>
                <span>{analysis.details.traffic.congestionLevel}%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>🅿️ Plazas libres:</span>
                <span>{analysis.details.parking.availableSpots}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>🌫️ NO₂:</span>
                <span>{analysis.details.airQuality.aqiIndex} µg/m³</span>
              </div>
            </div>
          </div>
        ) : (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              analyzeParking(parking.id);
            }}
            style={{ 
              width: '100%',
              padding: '8px 12px',
              backgroundColor: '#007BFF',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              marginTop: '6px',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#0056b3';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#007BFF';
            }}
          >
            🔍 Analizar Viabilidad
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
  }, [getAnalysis, analyzingId, analyzeParking]);

  // ============================================
  // RENDERIZADO PRINCIPAL
  // ============================================

  if (loading) {
    return (
      <div style={{ 
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: '#f5f5f5',
        fontFamily: 'Arial, sans-serif'
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: '4px solid #e0e0e0',
          borderTop: '4px solid #007BFF',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <p style={{ marginTop: '16px', color: '#666', fontSize: '16px' }}>
          Cargando datos de movilidad de Madrid...
        </p>
        <p style={{ fontSize: '12px', color: '#999' }}>
          {debugInfo}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        padding: '20px',
        backgroundColor: '#f5f5f5',
        fontFamily: 'Arial, sans-serif'
      }}>
        <h2 style={{ color: '#dc3545' }}>❌ Error</h2>
        <p style={{ marginTop: '10px', color: '#666', textAlign: 'center', maxWidth: '500px' }}>
          {error}
        </p>
        <div style={{ 
          marginTop: '16px', 
          padding: '12px', 
          backgroundColor: '#fff', 
          borderRadius: '4px',
          border: '1px solid #ddd',
          fontSize: '12px',
          color: '#666',
          maxWidth: '500px',
          textAlign: 'left',
          wordBreak: 'break-all'
        }}>
          <strong>Debug:</strong> {debugInfo}
          <br />
          <strong>API URL:</strong> {API_BASE_URL}
          <br />
          <strong>Parkings cargados:</strong> {parkings.length}
        </div>
        <button
          onClick={() => window.location.reload()}
          style={{
            marginTop: '20px',
            padding: '10px 24px',
            backgroundColor: '#007BFF',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          🔄 Reintentar
        </button>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', height: '100vh', width: '100%' }}>
      {/* Controles superiores */}
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        backgroundColor: 'rgba(255,255,255,0.95)',
        padding: '10px 20px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        flexWrap: 'wrap',
        justifyContent: 'center',
        fontFamily: 'Arial, sans-serif',
        fontSize: '13px'
      }}>
        <span style={{ fontWeight: '500' }}>📍 Radio:</span>
        <input
          type="range"
          min="1"
          max="10"
          value={filterRadius}
          onChange={(e) => {
            const newRadius = parseInt(e.target.value);
            setFilterRadius(newRadius);
            if (userLocation) {
              loadParkings(userLocation[0], userLocation[1]);
            }
          }}
          style={{ width: '120px' }}
        />
        <span>{filterRadius} km</span>
        
        {userLocation && (
          <button
            onClick={getUserLocation}
            style={{
              padding: '4px 12px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            📍 Mi ubicación
          </button>
        )}
        
        <span style={{ fontSize: '12px', color: '#666' }}>
          🅿️ {parkings.length} parkings
        </span>
        
        <span style={{ fontSize: '12px', color: '#666' }}>
          📊 {analysisResults.size} analizados
        </span>
        
        <span style={{ fontSize: '11px', color: '#999' }}>
          {debugInfo}
        </span>
      </div>

      {/* Mapa */}
      <MapContainer
        center={mapCenter}
        zoom={14}
        style={{ height: '100%', width: '100%' }}
        ref={mapRef}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {userLocation && (
          <Marker 
            position={userLocation}
            icon={L.divIcon({
              className: 'user-marker',
              html: `<div style="
                background-color: #007BFF;
                width: 16px;
                height: 16px;
                border-radius: 50%;
                border: 3px solid white;
                box-shadow: 0 0 0 4px rgba(0, 123, 255, 0.3);
              "></div>`,
              iconSize: [16, 16],
              iconAnchor: [8, 8],
            })}
          >
            <Popup>
              <div style={{ textAlign: 'center' }}>
                <h4 style={{ margin: '0 0 4px 0' }}>📍 Tu ubicación</h4>
                <p style={{ margin: 0, fontSize: '11px', color: '#666' }}>
                  {userLocation[0].toFixed(4)}, {userLocation[1].toFixed(4)}
                </p>
              </div>
            </Popup>
          </Marker>
        )}
        
        {parkings.map((parking) => (
          <Marker
            key={parking.id}
            position={[parking.latitude, parking.longitude]}
            icon={getMarkerIcon(parking.id)}
          >
            <Popup>
              {renderPopupContent(parking)}
            </Popup>
          </Marker>
        ))}
        
        <MapCenter center={mapCenter} />
      </MapContainer>

      {/* Leyenda */}
      <div style={{
        position: 'absolute',
        bottom: '30px',
        right: '30px',
        zIndex: 1000,
        backgroundColor: 'rgba(255,255,255,0.95)',
        padding: '10px 14px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        fontFamily: 'Arial, sans-serif',
        fontSize: '11px',
        minWidth: '100px'
      }}>
        <h4 style={{ margin: '0 0 6px 0', fontSize: '12px', color: '#333' }}>
          📊 Puntuación
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{
              display: 'inline-block',
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              backgroundColor: '#28a745'
            }} />
            <span>Excelente (75-100)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{
              display: 'inline-block',
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              backgroundColor: '#ffc107'
            }} />
            <span>Regular (50-74)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{
              display: 'inline-block',
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              backgroundColor: '#dc3545'
            }} />
            <span>Desfavorable (0-49)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px', borderTop: '1px solid #e0e0e0', paddingTop: '4px' }}>
            <span style={{
              display: 'inline-block',
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              backgroundColor: '#6c757d'
            }} />
            <span>Sin analizar</span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .leaflet-popup-content-wrapper {
          border-radius: 8px;
        }
        .leaflet-popup-content {
          margin: 10px 12px;
        }
      `}</style>
    </div>
  );
}

export default App;