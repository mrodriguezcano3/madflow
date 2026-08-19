// src/services/api.ts

const API_BASE_URL = 'http://localhost:3000/api';

export interface Parking {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  totalSpots: number;
}

export interface TrafficData {
  zoneId: string;
  congestionLevel: number;
}

export interface ParkingData {
  zoneId: string;
  totalSpots: number;
  availableSpots: number;
}

export interface AirQualityData {
  zoneId: string;
  aqiIndex: number;
}

export interface MobilityScore {
  parkingName: string;
  score: number;
  recommendation: string;
  details: {
    traffic: TrafficData;
    parking: ParkingData;
    airQuality: AirQualityData;
  };
}

export interface ParkingsResponse {
  total: number;
  parkings: Parking[];
}

export interface DiagnosisResponse {
  timestamp: string;
  server: {
    nodeVersion: string;
    platform: string;
    uptime: number;
    memory: {
      rss: string;
      heapTotal: string;
      heapUsed: string;
    };
    overallStatus: string;
  };
  services: {
    redis: { status: string; connected: boolean };
    parking: { status: string; count: number };
    traffic: { status: string };
    airQuality: { status: string };
  };
}

class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async fetchWithError<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      let errorMessage = `Error ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch (e) {
        // Si no se puede parsear JSON, usar mensaje por defecto
      }
      throw new Error(errorMessage);
    }

    // Si la respuesta es 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  // Obtener todos los parkings
  async getParkings(radius?: number, lat?: number, lon?: number): Promise<Parking[]> {
    let url = '/parkings';
    
    const params = new URLSearchParams();
    if (radius !== undefined && lat !== undefined && lon !== undefined) {
      params.append('lat', lat.toString());
      params.append('lon', lon.toString());
      params.append('radius', radius.toString());
    }
    
    const queryString = params.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
    
    const response = await this.fetchWithError<ParkingsResponse>(url);
    return response.parkings || [];
  }

  // Obtener parking por ID
  async getParkingById(id: string): Promise<Parking | null> {
    try {
      return await this.fetchWithError<Parking>(`/parkings/${id}`);
    } catch (error) {
      if ((error as Error).message.includes('404')) {
        return null;
      }
      throw error;
    }
  }

  // Obtener score de movilidad por ID de parking
  async getMobilityScore(parkingId: string): Promise<MobilityScore> {
    return this.fetchWithError<MobilityScore>(`/mobility/${parkingId}`);
  }

  // Obtener múltiples scores en paralelo
  async getMultipleMobilityScores(parkingIds: string[]): Promise<Map<string, MobilityScore>> {
    const results = new Map<string, MobilityScore>();
    
    // Procesar en lotes para no sobrecargar el servidor
    const batchSize = 10;
    for (let i = 0; i < parkingIds.length; i += batchSize) {
      const batch = parkingIds.slice(i, i + batchSize);
      const promises = batch.map(async (id) => {
        try {
          const score = await this.getMobilityScore(id);
          results.set(id, score);
        } catch (error) {
          console.error(`Error obteniendo score para parking ${id}:`, error);
        }
      });
      await Promise.all(promises);
    }
    
    return results;
  }

  // Health check
  async healthCheck(): Promise<any> {
    return this.fetchWithError('/health');
  }

  // Obtener diagnóstico
  async getDiagnosis(): Promise<DiagnosisResponse> {
    return this.fetchWithError('/health/diagnosis');
  }

  // Obtener estado de caché
  async getCacheStatus(): Promise<any> {
    return this.fetchWithError('/health/cache');
  }
}

// Exportar instancia única
export const api = new ApiService();
export default api;