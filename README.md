# 🚗 MadFlow - Smart Mobility for Madrid

## 🎯 Objetivo del Proyecto

MadFlow es una aplicación de movilidad urbana diseñada para ayudar a los conductores en Madrid a encontrar el mejor parking en función de tres factores clave: **tráfico en tiempo real**, **disponibilidad de plazas** y **calidad del aire**. El sistema calcula un índice de viabilidad (ZoneMobilityScore) que evalúa la idoneidad de desplazarse en coche a diferentes zonas de la ciudad.

El proyecto se ha desarrollado aplicando **Clean Architecture** para demostrar buenas prácticas de desarrollo, separación de responsabilidades y escalabilidad, integrando datos abiertos del Ayuntamiento de Madrid mediante un sistema robusto con múltiples capas de fallback que garantizan su disponibilidad.

---

##  Stack Tecnológico

### Backend
| Tecnología | Propósito |
|------------|-----------|
| **Node.js + TypeScript** | Runtime y tipado estricto |
| **Express.js** | Framework HTTP para la API REST |
| **Redis** | Sistema de caché para optimizar rendimiento |
| **Clean Architecture** | Arquitectura hexagonal con separación de capas |
| **fast-xml-parser** | Parseo de datos de tráfico en XML |
| **csv-parse** | Parseo de datos de calidad del aire en CSV |
| **jsonrepair** | Reparación de respuestas JSON mal formadas |
| **Docker** | Contenerización del servicio |

### Frontend
| Tecnología | Propósito |
|------------|-----------|
| **React 18 + TypeScript** | Interfaz de usuario y lógica de componentes |
| **Vite** | Bundler ultrarrápido para desarrollo |
| **Leaflet + react-leaflet** | Visualización de mapas interactivos |
| **OpenStreetMap** | Capas de mapas gratuitas |

### DevOps
| Tecnología | Propósito |
|------------|-----------|
| **Docker Compose** | Orquestación de contenedores (backend + Redis) |
| **Git** | Control de versiones |

---

##  Instalación y Uso

### Requisitos Previos
- Node.js ≥ 18
- Docker Desktop (opcional, para Redis)
- npm

### Instalación Local (Recomendada)

# Clonar el repositorio
git clone https://github.com/tu-usuario/madflow.git
cd madflow

# Instalar todas las dependencias
npm run install:all

# Iniciar backend y frontend simultáneamente
npm run dev

# Una vez iniciado, accede a:

Frontend: http://localhost:5173

Backend API: http://localhost:3000

---

## Uso de la Aplicación
Al abrir la aplicación, el mapa mostrará todos los parkings públicos de Madrid

El sistema solicitará permisos para usar tu ubicación (opcional)

Haz clic en cualquier marcador del mapa para ver información del parking

Pulsa el botón "Analizar Viabilidad" para calcular:

Puntuación (0-100)

Recomendación (Excelente/Regular/Desfavorable)

Detalles de tráfico, plazas libres y calidad del aire

Los marcadores cambian de color según la puntuación obtenida

---

## Endpoints Principales

GET /api/health	 -->  Verificar estado del backend
GET /api/parkings	 -->  Obtener lista de parkings
GET /api/mobility/:id	 -->  Obtener score de movilidad de un parking
