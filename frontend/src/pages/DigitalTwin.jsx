import { useRef, useEffect, useState, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Box, Sphere } from '@react-three/drei';
import { useApp } from '../context/AppContext';
import { motion } from 'framer-motion';
import { Eye, EyeOff, RotateCcw, Maximize2 } from 'lucide-react';
import * as THREE from 'three';

// ─── Zone definitions (position, label) ───────────────────────────────────
const ZONES = [
  { id: 0, name: 'Raw Material',    pos: [-5,  0, -4], size: [3, 1.5, 3]  },
  { id: 1, name: 'Mixing Room',     pos: [-1,  0, -4], size: [3, 1.8, 3]  },
  { id: 2, name: 'Drying Chamber',  pos: [ 3,  0, -4], size: [3, 2.0, 3]  },
  { id: 3, name: 'Packing Area',    pos: [-5,  0,  0], size: [3, 1.2, 3]  },
  { id: 4, name: 'Storage Vault',   pos: [-1,  0,  0], size: [3, 2.5, 3]  },
  { id: 5, name: 'Electrical Room', pos: [ 3,  0,  0], size: [2.5, 2.2, 3]},
  { id: 6, name: 'Loading Bay',     pos: [ 0,  0,  4], size: [8, 1.0, 3]  },
];

// Risk level → color
function riskToColor(level) {
  if (level === 'critical') return '#EF4444';
  if (level === 'high')     return '#F97316';
  if (level === 'medium')   return '#EAB308';
  return '#22C55E';
}

// ─── 3D Zone Building ──────────────────────────────────────────────────────
function ZoneBuilding({ zone, zoneScore, showLabels }) {
  const meshRef = useRef();
  const [hovered, setHovered] = useState(false);

  const score   = zoneScore?.hazard_score || 0;
  const level   = zoneScore?.risk_level   || 'low';
  const color   = riskToColor(level);
  const isAnomaly = level === 'critical' || level === 'high';
  const [w, h, d] = zone.size;

  // Pulse animation on high risk
  useFrame(({ clock }) => {
    if (meshRef.current && isAnomaly) {
      const pulse = Math.sin(clock.elapsedTime * 3) * 0.04 + 1;
      meshRef.current.scale.setScalar(hovered ? 1.08 : pulse);
    }
  });

  return (
    <group position={zone.pos}>
      {/* Floor base */}
      <mesh position={[0, -h / 2 - 0.05, 0]} receiveShadow>
        <boxGeometry args={[w + 0.1, 0.08, d + 0.1]} />
        <meshStandardMaterial color={color} transparent opacity={0.2} />
      </mesh>

      {/* Main building */}
      <mesh ref={meshRef} castShadow
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={hovered ? 0.5 : 0.25}
          emissive={color}
          emissiveIntensity={isAnomaly ? 0.3 : 0.05}
        />
      </mesh>

      {/* Wireframe outline */}
      <mesh>
        <boxGeometry args={[w, h, d]} />
        <meshBasicMaterial color={color} wireframe transparent opacity={0.4} />
      </mesh>

      {/* Score indicator pillar */}
      <mesh position={[0, h / 2 + 0.2 + (score / 100) * 0.5, 0]}>
        <sphereGeometry args={[0.15, 8, 8]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1} />
      </mesh>

      {/* Label */}
      {showLabels && (
        <Text
          position={[0, h / 2 + 0.6, 0]}
          fontSize={0.22}
          color={color}
          anchorX="center"
          anchorY="middle">
          {zone.name}
        </Text>
      )}
      {showLabels && (
        <Text
          position={[0, h / 2 + 0.35, 0]}
          fontSize={0.18}
          color={color}
          anchorX="center"
          anchorY="middle">
          {score.toFixed(0)}%
        </Text>
      )}

      {/* Danger pulse ring (critical zones) */}
      {isAnomaly && <PulseRing color={color} h={h} />}
    </group>
  );
}

function PulseRing({ color, h }) {
  const ringRef = useRef();
  useFrame(({ clock }) => {
    if (ringRef.current) {
      const s = 1 + (Math.sin(clock.elapsedTime * 2) * 0.5 + 0.5) * 0.8;
      ringRef.current.scale.setScalar(s);
      ringRef.current.material.opacity = (1 - (s - 1) / 0.8) * 0.4;
    }
  });
  return (
    <mesh ref={ringRef} position={[0, -h / 2 + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[1.2, 1.5, 32]} />
      <meshBasicMaterial color={color} transparent opacity={0.4} side={THREE.DoubleSide} />
    </mesh>
  );
}

// ─── Animated Fan ─────────────────────────────────────────────────────────
function AnimatedFan({ position, isOn }) {
  const ref = useRef();
  useFrame(() => {
    if (ref.current && isOn) ref.current.rotation.y += 0.08;
  });
  return (
    <group position={position} ref={ref}>
      {[-90, 0, 90, 180].map((angle, i) => (
        <mesh key={i} rotation={[0, (angle * Math.PI) / 180, 0]} position={[0, 0, 0]}>
          <boxGeometry args={[0.3, 0.04, 0.1]} />
          <meshStandardMaterial color={isOn ? '#22C55E' : '#334155'} />
        </mesh>
      ))}
      <mesh>
        <cylinderGeometry args={[0.07, 0.07, 0.05, 16]} />
        <meshStandardMaterial color={isOn ? '#00E5FF' : '#475569'} emissive={isOn ? '#00E5FF' : '#000'} emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}

// ─── Pipeline ─────────────────────────────────────────────────────────────
function Pipeline({ from, to }) {
  const mid = [(from[0] + to[0]) / 2, from[1], (from[2] + to[2]) / 2];
  const length = Math.sqrt(
    Math.pow(to[0] - from[0], 2) + Math.pow(to[2] - from[2], 2)
  );
  const angle = Math.atan2(to[2] - from[2], to[0] - from[0]);

  return (
    <mesh position={mid} rotation={[0, -angle, 0]}>
      <cylinderGeometry args={[0.07, 0.07, length, 8]} rotation={[0, 0, Math.PI / 2]} />
      <meshStandardMaterial color="#1E3A5F" emissive="#00E5FF" emissiveIntensity={0.1} />
    </mesh>
  );
}

// ─── 3D Scene ─────────────────────────────────────────────────────────────
function FactoryScene({ zoneScores, relayOn, showLabels }) {
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.3} />
      <directionalLight position={[10, 10, 5]} intensity={0.6} castShadow />
      <pointLight position={[0, 8, 0]} intensity={0.4} color="#00E5FF" />

      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.9, 0]} receiveShadow>
        <planeGeometry args={[20, 14]} />
        <meshStandardMaterial color="#0A1628" />
      </mesh>

      {/* Grid */}
      <gridHelper args={[20, 20, '#0D2040', '#0D2040']} position={[0, -0.88, 0]} />

      {/* Zone Buildings */}
      {ZONES.map((zone, i) => (
        <ZoneBuilding key={zone.id} zone={zone}
          zoneScore={zoneScores[i]} showLabels={showLabels} />
      ))}

      {/* Pipelines connecting zones */}
      <Pipeline from={[-5, -0.5, -4]} to={[-1, -0.5, -4]} />
      <Pipeline from={[-1, -0.5, -4]} to={[3, -0.5, -4]} />
      <Pipeline from={[-5, -0.5, -4]} to={[-5, -0.5, 0]} />
      <Pipeline from={[-1, -0.5, -4]} to={[-1, -0.5, 0]} />
      <Pipeline from={[3, -0.5, -4]} to={[3, -0.5, 0]} />
      <Pipeline from={[-1, -0.5, 0]} to={[0, -0.5, 4]} />

      {/* Fan */}
      <AnimatedFan position={[3.5, 0.5, 0.5]} isOn={relayOn} />

      {/* Camera Controls */}
      <OrbitControls enablePan minDistance={5} maxDistance={25} maxPolarAngle={Math.PI / 2.1} />
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────
export default function DigitalTwin() {
  const { zoneScores, relayStatus, anomalyZone, hazardScore, riskLevel, scoreColor } = useApp();
  const [showLabels, setShowLabels] = useState(true);
  const color = scoreColor(hazardScore);

  return (
    <div className="h-full flex flex-col gap-4" style={{ minHeight: '600px' }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Digital Twin</h1>
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            Interactive 3D Factory — 7 Departments · Live Hazard Mapping
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowLabels(s => !s)} className="btn-primary">
            {showLabels ? <EyeOff size={12} /> : <Eye size={12} />}
            {showLabels ? 'Hide Labels' : 'Show Labels'}
          </button>
          {anomalyZone && (
            <motion.div animate={{ opacity: [1, 0.4] }} transition={{ repeat: Infinity, duration: 0.8 }}
              className="px-3 py-1.5 rounded-lg text-xs font-bold"
              style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.5)', color: '#EF4444' }}>
              ⚠️ ANOMALY: {anomalyZone}
            </motion.div>
          )}
        </div>
      </div>

      {/* Risk Legend */}
      <div className="flex items-center gap-4">
        {[['Low', '#22C55E'], ['Medium', '#EAB308'], ['High', '#F97316'], ['Critical', '#EF4444']].map(([l, c]) => (
          <div key={l} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ background: c, opacity: 0.6 }} />
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{l}</span>
          </div>
        ))}
        <div className="ml-auto text-[10px]" style={{ color: 'var(--text-muted)' }}>
          Click + drag to rotate · Scroll to zoom
        </div>
      </div>

      {/* 3D Canvas */}
      <div className="flex-1 glass-card overflow-hidden" style={{ minHeight: 400 }}>
        <Suspense fallback={
          <div className="h-full flex items-center justify-center" style={{ color: 'var(--text-muted)' }}>
            Loading 3D scene...
          </div>
        }>
          <Canvas camera={{ position: [8, 8, 12], fov: 50 }} shadows style={{ background: '#040810' }}>
            <FactoryScene
              zoneScores={zoneScores}
              relayOn={relayStatus.relay1?.on || false}
              showLabels={showLabels}
            />
          </Canvas>
        </Suspense>
      </div>

      {/* Zone Status Grid */}
      <div className="grid grid-cols-7 gap-2">
        {ZONES.map((zone, i) => {
          const score = zoneScores[i];
          const level = score?.risk_level || 'low';
          const zc = riskToColor(level);
          return (
            <div key={zone.id} className="glass-card p-3 text-center"
              style={{ borderColor: `${zc}25` }}>
              <div className="text-[9px] font-bold mb-1" style={{ color: zc }}>{zone.name}</div>
              <div className="text-lg font-bold font-mono" style={{ color: zc, fontFamily: 'var(--font-mono)' }}>
                {score?.hazard_score?.toFixed(0) || '0'}
              </div>
              <div className={`badge badge-${level} mt-1`} style={{ fontSize: 8 }}>{level}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
