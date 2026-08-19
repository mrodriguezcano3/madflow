// src/components/Map.tsx
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { api, Parking, MobilityScore } from '../services/api';
import ParkingPopup from './ParkingPopup';
import Legend from './Legend';
import LoadingSpinner from './LoadingSpinner';

// Configuración de íconos de Leaflet
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

// Íconos personalizados por nivel de score
const createCustomIcon = (score: number | null) => {
  let color = '#4CAF50'; // Verde por defecto
  let size = 25;
  
  if (score !== null) {
    if (score >= 75) {
      color = '#4CAF50'; // Verde - Excelente
      size = 28;
    } else if (score >= 50) {
      color = '#FFC107'; // Amarillo - Regular
      size = 25;
    } else {
      color = '#F44336'; // Rojo - Malo
      size = 22;
    }
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
      font-size: ${size > 25 ? '12px' : '10px'};
    ">${score !== null ? score : '?'}</div>`,
    iconSize: [size, size],
    iconAnchor: [size/2, size/2],
  });
};

// Componente para centrar el mapa en una ubicación
const MapCenter: React.FC<{ center: [number, number] }> = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
};

interface Props {
  onParkingSelect?: (parking: Parking, score: MobilityScore | null) => void;
}

const Map: React.FC<Props> = ({ onParkingSelect }) => {
  const [parkings, setParkings] = useState<Parking[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingScores, setLoadingScores] = useState<Set<string>>(new Set());
  const [scores, setScores] = useState<Map<string, MobilityScore>>(new Map());
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([40.4168, -3.7038]);
  const [selectedParking, setSelectedParking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filterRadius, setFilterRadius] = useState<number>(5);

  const mapRef = useRef<L.Map | null>(null);

  // Cargar parkings
  const loadParkings = useCallback(async (lat?: number, lon?: number) => {
    setLoading(true);
    setError(null);
    try {
      const parkingsData = await api.getParkings(
        lat && lon ? filterRadius : undefined,
        lat,
        lon
      );
      setParkings(parkingsData);
      
      if (parkingsData.length === 0) {
        setError('No se encontraron parkings en esta zona');
      }
    } catch (error) {
      console.error('Error cargando parkings:', error);
      setError('Error al cargar los parkings. Verifica que el backend esté corriendo.');
    } finally {
      setLoading(false);
    }
  }, [filterRadius]);

  // Obtener ubicación del usuario
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation([latitude, longitude]);
          setMapCenter([latitude, longitude]);
          loadParkings(latitude, longitude);
        },
        (error) => {
          console.warn('No se pudo obtener ubicación:', error);
          loadParkings(); // Cargar sin filtro
        }
      );
    } else {
      loadParkings();
    }
  }, [loadParkings]);

  // Cargar scores para todos los parkings visibles (opcional)
  const loadScoresForParkings = useCallback(async () => {
    if (parkings.length === 0) return;
    
    setLoadingScores(new Set(parkings.map(p => p.id)));
    
    try {
      const ids = parkings.map(p => p.id);
      const scoresMap = await api.getMultipleMobilityScores(ids);
      setScores(scoresMap);
    } catch (error) {
      console.error('Error cargando scores:', error);
    } finally {
      setLoadingScores(new Set());
    }
  }, [parkings]);

  // Cargar scores cuando se cargan los parkings
  useEffect(() => {
    if (parkings.length > 0) {
      loadScoresForParkings();
    }
  }, [parkings, loadScoresForParkings]);

  // Manejar clic en parking
  const handleParkingClick = async (parking: Parking) => {
    setSelectedParking(parking.id);
    
    // Si ya tenemos el score, notificar
    if (scores.has(parking.id)) {
      if (onParkingSelect) {
        onParkingSelect(parking, scores.get(parking.id) || null);
      }
      return;
    }

    // Si no, cargarlo
    try {
      const score = await api.getMobilityScore(parking.id);
      setScores(prev => new Map(prev).set(parking.id, score));
      if (onParkingSelect) {
        onParkingSelect(parking, score);
      }
    } catch (error) {
      console.error('Error obteniendo score:', error);
      if (onParkingSelect) {
        onParkingSelect(parking, null);
      }
    }
  };

  // Manejar cambio de radio de filtro
  const handleRadiusChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newRadius = parseInt(e.target.value);
    setFilterRadius(newRadius);
    if (userLocation) {
      loadParkings(userLocation[0], userLocation[1]);
    }
  };

  // Manejar actualización de ubicación
  const handleUpdateLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation([latitude, longitude]);
          setMapCenter([latitude, longitude]);
          loadParkings(latitude, longitude);
        },
        (error) => {
          console.warn('No se pudo obtener ubicación:', error);
        }
      );
    }
  };

  if (loading) {
    return <LoadingSpinner message="Cargando parkings en Madrid..." />;
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
        backgroundColor: '#f5f5f5'
      }}>
        <h2 style={{ color: '#d32f2f' }}>❌ {error}</h2>
        <p style={{ marginTop: '10px', color: '#666' }}>
          Asegúrate de que el backend esté corriendo en http://localhost:3000
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            marginTop: '20px',
            padding: '10px 20px',
            backgroundColor: '#1976D2',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', height: '100vh', width: '100%' }}>
      {/* Controles de filtro */}
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        backgroundColor: 'white',
        padding: '12px 20px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        flexWrap: 'wrap',
        justifyContent: 'center'
      }}>
        <span style={{ fontWeight: '500' }}>📍 Radio de búsqueda:</span>
        <input
          type="range"
          min="1"
          max="10"
          value={filterRadius}
          onChange={handleRadiusChange}
          style={{ width: '150px' }}
        />
        <span>{filterRadius} km</span>
        
        {userLocation && (
          <button
            onClick={handleUpdateLocation}
            style={{
              padding: '6px 12px',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            📍 Mi ubicación
          </button>
        )}
        
        <span style={{ fontSize: '14px', color: '#666' }}>
          {parkings.length} parkings encontrados
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
                background-color: #1976D2;
                width: 16px;
                height: 16px;
                border-radius: 50%;
                border: 3px solid white;
                box-shadow: 0 0 0 4px rgba(25, 118, 210, 0.3);
                animation: pulse 1.5s ease-in-out infinite;
              "></div>`,
              iconSize: [16, 16],
              iconAnchor: [8, 8],
            })}
          >
            <Popup>
              <div>
                <h4>📍 Tu ubicación</h4>
                <p style={{ fontSize: '12px', color: '#666' }}>
                  {userLocation[0].toFixed(4)}, {userLocation[1].toFixed(4)}
                </p>
              </div>
            </Popup>
          </Marker>
        )}
        
        {parkings.map((parking) => {
          const score = scores.get(parking.id);
          const icon = createCustomIcon(score ? score.score : null);
          const isLoading = loadingScores.has(parking.id);
          
          return (
            <Marker
              key={parking.id}
              position={[parking.latitude, parking.longitude]}
              icon={icon}
              eventHandlers={{
                click: () => handleParkingClick(parking),
              }}
            >
              <Popup>
                <ParkingPopup
                  parking={parking}
                  score={score || null}
                  isLoading={isLoading}
                  onRefresh={() => handleParkingClick(parking)}
                />
              </Popup>
            </Marker>
          );
        })}
        
        <MapCenter center={mapCenter} />
      </MapContainer>

      {/* Leyenda */}
      <Legend />
      
      {/* Animación de pulso para el marcador de usuario */}
      <style>{`
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.3);
          }
        }
      `}</style>
    </div>
  );
};

export default Map;