# 🚗 MadFlow - Movilidad en Madrid

Aplicación de movilidad local que rastrea la congestión del tráfico y la calidad del aire en Madrid, calculando un índice de viabilidad para parkings públicos.

## 📋 Requisitos Previos

- Node.js (v18 o superior)
- npm o yarn
- Docker Desktop (opcional)
- Git

## 🛠️ Tecnologías

### Backend
- Node.js + TypeScript
- Express.js
- Redis (caché)
- csv-parse, fast-xml-parser, jsonrepair

### Frontend
- React.js + TypeScript
- Vite
- Leaflet (mapas)
- React-Leaflet

## 🚀 Instalación y Ejecución

### Opción 1: Local (Recomendado para desarrollo)

```bash
# Instalar todas las dependencias
npm run install:all

# Iniciar ambos servicios en paralelo
npm run dev

# O iniciar por separado
npm run dev:backend  # Backend en http://localhost:3000
npm run dev:frontend # Frontend en http://localhost:5173# madflow