# SAFE-FUSE AI - Build Walkthrough

## What Was Built
Complete production-quality hackathon platform:
- FastAPI Backend: AI engine, WebSocket, REST APIs, MQTT bridge
- React Frontend: 7 pages with futuristic dark UI (glassmorphism + neon)
- ESP32 Firmware: Full Arduino .ino for real hardware
- AI Agents: Hazard scoring + agentic decision engine + SHAP

## How to Run

### Backend
cd 'D:\Personal Projects\CIH 2026\backend'
set PYTHONIOENCODING=utf-8
uvicorn main:app --reload --host 0.0.0.0 --port 8000

### Frontend
cd 'D:\Personal Projects\CIH 2026\frontend'
npm run dev

### URLs
Platform UI: http://localhost:5173
API Docs:    http://localhost:8000/docs
WebSocket:   ws://localhost:8000/ws

## Demo Login
admin@safefuse.ai / SafeFuse2026 (HSE Manager)
safety@safefuse.ai / Safety2026 (Safety Officer)
manager@safefuse.ai / Manager2026 (Plant Manager)

## AI Features
- 7-sensor weighted hazard score (0-100)
- SHAP feature contribution bars
- 6 compound risk rules (IGNITION, DUST_EXPLOSION, FIRE_TRIANGLE, etc.)
- 4-step agentic reasoning chain
- Autonomous relay mitigation
- Auto-incident generation when score >= 60%
- 7 factory zone individual scoring

## Verified Working
- Backend: Application startup complete
- Frontend: Vite dev server ready at http://localhost:5173
- WebSocket: Live Connected (2s broadcast)
- Dashboard + AI Brain pages confirmed via screenshots
