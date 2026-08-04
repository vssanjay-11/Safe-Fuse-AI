import { useRef, useEffect, useState, useMemo, useCallback, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text, Html } from '@react-three/drei';
import { useApp } from '../context/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye, EyeOff, RotateCcw, ShieldAlert, Cpu, Users,
  Activity, Zap, AlertTriangle, CheckCircle, Wind,
  Thermometer, Droplets, Wrench, Search, Layers,
  X, Radio, Heart, Clock, Navigation, MapPin, AlertOctagon, Box
} from 'lucide-react';
import * as THREE from 'three';

/* ═══════════════════════════════════════════════════════════════════════════
   1. INDUSTRIAL FACILITY CONFIGURATION (13 ZONES)
   ═══════════════════════════════════════════════════════════════════════════ */
const INDUSTRIAL_ZONES = [
  { id: 0,  code: 'Z-01', name: 'Raw Material Storage',    pos: [-12, 0, -8], size: [4.5, 2.4, 4.5], color: '#3B82F6', dept: 'Logistics' },
  { id: 1,  code: 'Z-02', name: 'Chemical Mixing',         pos: [-5,  0, -8], size: [4.5, 3.0, 4.5], color: '#EF4444', dept: 'Processing' },
  { id: 2,  code: 'Z-03', name: 'Production Hall A',       pos: [ 2,  0, -8], size: [5.5, 3.2, 4.5], color: '#F97316', dept: 'Manufacturing' },
  { id: 3,  code: 'Z-04', name: 'Production Hall B',       pos: [ 9,  0, -8], size: [5.5, 3.2, 4.5], color: '#EAB308', dept: 'Manufacturing' },
  { id: 4,  code: 'Z-05', name: 'Quality Inspection',      pos: [ 16, 0, -8], size: [4.5, 2.4, 4.5], color: '#22C55E', dept: 'Quality Assurance' },
  
  { id: 5,  code: 'Z-06', name: 'Packing Section',        pos: [-12, 0,  0], size: [4.5, 2.2, 4.5], color: '#00E5FF', dept: 'Packaging' },
  { id: 6,  code: 'Z-07', name: 'Warehouse',              pos: [-5,  0,  0], size: [5.5, 3.5, 4.5], color: '#3B82F6', dept: 'Logistics' },
  { id: 7,  code: 'Z-08', name: 'Control Room',           pos: [ 2,  0,  0], size: [4.5, 2.6, 4.5], color: '#7C3AED', dept: 'Operations' },
  { id: 8,  code: 'Z-09', name: 'Maintenance Room',       pos: [ 8,  0,  0], size: [4.5, 2.4, 4.5], color: '#64748B', dept: 'Engineering' },
  { id: 9,  code: 'Z-10', name: 'Emergency Assembly',     pos: [ 14, 0,  0], size: [4.5, 0.2, 4.5], color: '#22C55E', dept: 'Safety' },
  
  { id: 10, code: 'Z-11', name: 'Loading Bay',            pos: [-12, 0,  8], size: [6.0, 2.0, 4.5], color: '#F59E0B', dept: 'Logistics' },
  { id: 11, code: 'Z-12', name: 'Utility Area',           pos: [-4,  0,  8], size: [4.5, 2.8, 4.5], color: '#06B6D4', dept: 'Utilities' },
  { id: 12, code: 'Z-13', name: 'Power Distribution',     pos: [ 4,  0,  8], size: [4.5, 2.8, 4.5], color: '#EC4899', dept: 'Power' },
];

/* ═══════════════════════════════════════════════════════════════════════════
   2. DETAILED REALISTIC MACHINERY DATA
   ═══════════════════════════════════════════════════════════════════════════ */
const INITIAL_MACHINES = [
  { id: 'MCH-01', name: 'High-Shear Chemical Reactor Tank', type: 'Reactor', zoneId: 1, pos: [-5, 0, -8], status: 'running', health: 92, temp: 48.5, current: 14.2, vibration: 1.2, rul: 86, failureProb: 4.2, power: 18.5, schedule: 'In 14 days' },
  { id: 'MCH-02', name: 'Fluidized Bed Thermal Dryer', type: 'Dryer', zoneId: 2, pos: [1.2, 0, -8], status: 'running', health: 78, temp: 62.0, current: 18.6, vibration: 2.8, rul: 64, failureProb: 12.5, power: 24.0, schedule: 'In 5 days' },
  { id: 'MCH-03', name: 'Motorized Roller Conveyor Assembly', type: 'Conveyor', zoneId: 2, pos: [3.8, 0, -8], status: 'running', health: 96, temp: 34.0, current: 8.1, vibration: 0.8, rul: 94, failureProb: 1.8, power: 5.2, schedule: 'In 30 days' },
  { id: 'MCH-04', name: 'Heavy Hydraulic Stamping Press', type: 'Press', zoneId: 3, pos: [8.5, 0, -8], status: 'warning', health: 65, temp: 58.4, current: 22.4, vibration: 4.5, rul: 42, failureProb: 28.0, power: 32.0, schedule: 'IMMEDIATE' },
  { id: 'MCH-05', name: 'Automated Box Sealing Machine', type: 'Packaging', zoneId: 5, pos: [-12, 0, 0], status: 'running', health: 98, temp: 31.2, current: 6.4, vibration: 0.5, rul: 97, failureProb: 0.9, power: 4.1, schedule: 'In 45 days' },
  { id: 'MCH-06', name: 'Industrial Coolant Pump Motor', type: 'Motor', zoneId: 11, pos: [-4.8, 0, 8], status: 'running', health: 88, temp: 42.1, current: 11.8, vibration: 1.4, rul: 82, failureProb: 5.6, power: 12.4, schedule: 'In 20 days' },
  { id: 'MCH-07', name: 'High-Pressure Steam Boiler Vessel', type: 'Boiler', zoneId: 11, pos: [-3.0, 0, 8], status: 'running', health: 84, temp: 78.0, current: 19.5, vibration: 2.1, rul: 75, failureProb: 8.4, power: 45.0, schedule: 'In 12 days' },
  { id: 'MCH-08', name: 'Rotary Screw Air Compressor System', type: 'Compressor', zoneId: 12, pos: [3.2, 0, 8], status: 'running', health: 91, temp: 46.2, current: 15.0, vibration: 1.1, rul: 89, failureProb: 3.1, power: 22.0, schedule: 'In 25 days' },
  { id: 'MCH-09', name: 'High-Voltage Switchgear Cabinet', type: 'Switchgear', zoneId: 12, pos: [5.2, 0, 8], status: 'running', health: 99, temp: 29.0, current: 38.0, vibration: 0.1, rul: 99, failureProb: 0.2, power: 110.0, schedule: 'In 60 days' },
];

/* ═══════════════════════════════════════════════════════════════════════════
   3. WORKERS DATA (VIRTUAL 3D MOVEMENTS & TELEMETRY)
   ═══════════════════════════════════════════════════════════════════════════ */
const INITIAL_WORKERS = [
  { id: 'EMP-101', name: 'Alex Mercer', dept: 'Processing', designation: 'Senior Process Engineer', zoneId: 1, activity: 'Inspecting Chemical Reactor', ppe: { helmet: true, mask: true, gloves: true, shoes: true }, rfid: 'ACTIVE', heartRate: 74, bodyTemp: 36.6, shift: 'Morning', hours: 5.2, fatigue: 'Low (12%)', emergency: 'NORMAL', assignedMachine: 'MCH-01', task: 'Monitor chemical reaction', path: [[-6.5, 0.4, -9.5], [-3.5, 0.4, -6.5], [-5.0, 0.4, -8.0]] },
  { id: 'EMP-104', name: 'Elena Rostova', dept: 'Manufacturing', designation: 'Thermal Dryer Specialist', zoneId: 2, activity: 'Monitoring Dryer Heat Curve', ppe: { helmet: true, mask: true, gloves: true, shoes: true }, rfid: 'ACTIVE', heartRate: 82, bodyTemp: 36.8, shift: 'Morning', hours: 4.8, fatigue: 'Moderate (28%)', emergency: 'NORMAL', assignedMachine: 'MCH-02', task: 'Airflow calibration', path: [[0.5, 0.4, -9.0], [2.5, 0.4, -7.0], [1.2, 0.4, -8.0]] },
  { id: 'EMP-108', name: 'Marcus Vance', dept: 'Engineering', designation: 'Hydraulic Press Specialist', zoneId: 3, activity: 'Hydraulic Pressure Audit', ppe: { helmet: true, mask: false, gloves: true, shoes: true }, rfid: 'ACTIVE', heartRate: 91, bodyTemp: 37.1, shift: 'Morning', hours: 6.5, fatigue: 'High (45%)', emergency: 'ATTENTION', assignedMachine: 'MCH-04', task: 'Check hydraulic oil pressure', path: [[7.5, 0.4, -9.0], [9.5, 0.4, -7.0], [8.5, 0.4, -8.0]] },
  { id: 'EMP-112', name: 'Sarah Jenkins', dept: 'Logistics', designation: 'Forklift Operator', zoneId: 6, activity: 'Transferring Pallets to Warehouse', ppe: { helmet: true, mask: true, gloves: true, shoes: true }, rfid: 'ACTIVE', heartRate: 78, bodyTemp: 36.5, shift: 'Morning', hours: 3.5, fatigue: 'Low (18%)', emergency: 'NORMAL', assignedMachine: 'FORKLIFT-01', task: 'Finished batch logistics', path: [[-6.5, 0.4, 0], [-3.5, 0.4, 2], [-5.0, 0.4, 0]] },
  { id: 'EMP-115', name: 'David Chen', dept: 'Operations', designation: 'Control Room Lead', zoneId: 7, activity: 'SCADA Telemetry Audit', ppe: { helmet: true, mask: true, gloves: false, shoes: true }, rfid: 'ACTIVE', heartRate: 68, bodyTemp: 36.4, shift: 'Morning', hours: 5.0, fatigue: 'Low (15%)', emergency: 'NORMAL', assignedMachine: 'SCADA-CON-01', task: 'Plant safety monitoring', path: [[0.8, 0.4, 0], [3.2, 0.4, 0], [2.0, 0.4, 0]] },
  { id: 'EMP-119', name: 'Viktor Krum', dept: 'Utilities', designation: 'Boiler Maintenance Engineer', zoneId: 11, activity: 'Steam Relief Valve Test', ppe: { helmet: true, mask: true, gloves: true, shoes: true }, rfid: 'ACTIVE', heartRate: 85, bodyTemp: 36.9, shift: 'Morning', hours: 7.1, fatigue: 'High (52%)', emergency: 'NORMAL', assignedMachine: 'MCH-07', task: 'Pressure gauge audit', path: [[-5.2, 0.4, 8], [-2.8, 0.4, 8], [-4.0, 0.4, 8]] },
  { id: 'EMP-122', name: 'Rachel Adams', dept: 'Quality Assurance', designation: 'QA Lab Tech', zoneId: 4, activity: 'Batch Purity Sample Test', ppe: { helmet: true, mask: true, gloves: true, shoes: true }, rfid: 'ACTIVE', heartRate: 72, bodyTemp: 36.6, shift: 'Morning', hours: 2.4, fatigue: 'Low (8%)', emergency: 'NORMAL', assignedMachine: 'QA-BENCH-02', task: 'Sample chemical analysis', path: [[14.5, 0.4, -8], [17.2, 0.4, -8], [16.0, 0.4, -8]] },
];

/* ═══════════════════════════════════════════════════════════════════════════
   4. PHYSICAL MOUNTED SENSORS LIST
   ═══════════════════════════════════════════════════════════════════════════ */
const INITIAL_SENSORS = [
  { id: 'SNS-TEMP-01', type: 'Temperature', zoneId: 1, pos: [-5, 2.6, -6], unit: '°C', normal: '20-40', calib: '2026-06-15', status: 'OK' },
  { id: 'SNS-GAS-01',  type: 'Gas (MQ-135)', zoneId: 1, pos: [-5, 2.8, -10], unit: 'ppm', normal: '< 200', calib: '2026-07-01', status: 'ALERT' },
  { id: 'SNS-DUST-01', type: 'Dust Density', zoneId: 2, pos: [2, 2.7, -6], unit: 'µg/m³', normal: '< 100', calib: '2026-05-20', status: 'OK' },
  { id: 'SNS-CURR-01', type: 'Current (ACS712)', zoneId: 3, pos: [9, 2.8, -6], unit: 'A', normal: '< 15', calib: '2026-06-10', status: 'WARNING' },
  { id: 'SNS-FLAM-01', type: 'IR Flame', zoneId: 1, pos: [-3, 2.5, -8], unit: 'bool', normal: 'OFF', calib: '2026-07-12', status: 'OK' },
  { id: 'SNS-HUM-01',  type: 'Humidity (DHT22)', zoneId: 6, pos: [-5, 2.8, 2], unit: '%', normal: '40-60', calib: '2026-04-18', status: 'OK' },
  { id: 'SNS-POW-01',  type: 'Power Meter', zoneId: 12, pos: [4, 2.7, 6], unit: 'kW', normal: '< 50', calib: '2026-07-22', status: 'OK' },
];

/* ═══════════════════════════════════════════════════════════════════════════
   5. PRECISE CONNECTED PIPELINES
   ═══════════════════════════════════════════════════════════════════════════ */
const PIPELINES = [
  // --- Row 1 Chemical & Process Trunk Line (along z = -8) ---
  { from: [-12, 0.4, -8], to: [-5, 0.4, -8], type: 'Raw Material Feed', color: '#F59E0B' },
  { from: [-5, 0.4, -8], to: [2, 0.4, -8], type: 'Chemical Feed Line', color: '#00E5FF' },
  { from: [2, 0.4, -8], to: [9, 0.4, -8], type: 'Processed Batch Line', color: '#00E5FF' },
  { from: [9, 0.4, -8], to: [16, 0.4, -8], type: 'Quality Inspection Conveyance', color: '#22C55E' },

  // --- Row 2 Logistics Conveyor Line (along z = 0) ---
  { from: [-12, 0.4, 0], to: [-5, 0.4, 0], type: 'Packaged Goods Conveyor', color: '#A855F7' },

  // --- Row 3 Utility & Power Trunk Line (along z = 8) ---
  { from: [-12, 0.4, 8], to: [-4, 0.4, 8], type: 'Utility Distribution Feed', color: '#06B6D4' },
  { from: [-4, 0.4, 8], to: [4, 0.4, 8], type: 'Main Power Grid Link', color: '#EC4899' },

  // --- Orthogonal North-South Feeder Corridor 1 (along x = -4) ---
  { from: [-4, 0.4, 8], to: [-4, 0.4, -8], type: 'Cooling Water Trunk Line', color: '#3B82F6' },
  { from: [-4, 0.4, -8], to: [-5, 0.4, -8], type: 'Cooling Water Inlet Z-02', color: '#3B82F6' },
  { from: [-4, 0.4, -8], to: [2, 0.4, -8], type: 'Chilled Water Supply Z-03', color: '#3B82F6' },

  // --- Orthogonal North-South Power Corridor 2 (along x = 4) ---
  { from: [4, 0.4, 8], to: [4, 0.4, 0], type: 'High-Voltage Busbar Z-13 to Z-08', color: '#EC4899' },
  { from: [4, 0.4, 0], to: [2, 0.4, 0], type: 'Control Room Power Branch', color: '#EC4899' },
  { from: [4, 0.4, 0], to: [4, 0.4, -8], type: 'High-Voltage Feeder to Row 1', color: '#EC4899' },
  { from: [4, 0.4, -8], to: [9, 0.4, -8], type: 'Power Branch to Prod Hall B', color: '#EC4899' },
];

function riskToColor(level) {
  if (level === 'critical') return '#EF4444';
  if (level === 'high')     return '#F97316';
  if (level === 'medium')   return '#EAB308';
  return '#22C55E';
}

/* ═══════════════════════════════════════════════════════════════════════════
   6. 3D CAMERA CONTROLLER (UNRESTRICTED ORBIT CONTROLS WITH SMOOTH FLY-TO)
   ═══════════════════════════════════════════════════════════════════════════ */
function CameraController({ cameraTarget, resetTrigger }) {
  const { camera } = useThree();
  const controlsRef = useRef();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') resetTrigger();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [resetTrigger]);

  useEffect(() => {
    if (!cameraTarget || !controlsRef.current) return;
    const { pos, lookAt } = cameraTarget;

    let frameId;
    let t = 0;
    const startPos = camera.position.clone();
    const startLook = controlsRef.current.target.clone();
    const endPos = new THREE.Vector3(...pos);
    const endLook = new THREE.Vector3(...lookAt);

    const animate = () => {
      t += 0.05;
      if (t <= 1) {
        camera.position.lerpVectors(startPos, endPos, t);
        controlsRef.current.target.lerpVectors(startLook, endLook, t);
        controlsRef.current.update();
        frameId = requestAnimationFrame(animate);
      }
    };
    animate();

    return () => cancelAnimationFrame(frameId);
  }, [cameraTarget, camera]);

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={true}
      enableZoom={true}
      enableRotate={true}
      minDistance={1}
      maxDistance={80}
      maxPolarAngle={Math.PI / 2 - 0.01}
    />
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   7. REALISTIC 3D INDUSTRIAL MACHINERY COMPONENTS
   ═══════════════════════════════════════════════════════════════════════════ */
function MachineMesh({ machine, onClick, isSelected }) {
  const movingPartRef = useRef();

  useFrame((state, delta) => {
    if (!movingPartRef.current || machine.status !== 'running') return;
    if (machine.type === 'Reactor') {
      movingPartRef.current.rotation.y += delta * 3.5;
    } else if (machine.type === 'Dryer') {
      movingPartRef.current.rotation.z += delta * 2.0;
    } else if (machine.type === 'Compressor' || machine.type === 'Motor') {
      movingPartRef.current.rotation.x += delta * 7.0;
    } else if (machine.type === 'Press') {
      movingPartRef.current.position.y = 0.5 + Math.sin(state.clock.elapsedTime * 3.5) * 0.2;
    }
  });

  const [x, y, z] = machine.pos;
  const color = machine.status === 'warning' ? '#F97316' : machine.status === 'critical' ? '#EF4444' : '#00E5FF';

  return (
    <group position={[x, y, z]} onClick={(e) => { e.stopPropagation(); onClick(machine); }}>
      {/* Heavy Steel Foundation Pad */}
      <mesh position={[0, 0.1, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.8, 0.2, 1.8]} />
        <meshStandardMaterial color="#1E293B" metalness={0.8} roughness={0.3} />
      </mesh>

      {/* Selected Glow Ring */}
      {isSelected && (
        <mesh position={[0, 0.22, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.1, 1.3, 32]} />
          <meshBasicMaterial color="#00E5FF" side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Chemical Reactor Vessel */}
      {machine.type === 'Reactor' && (
        <group position={[0, 0.2, 0]}>
          {/* Support Legs */}
          {[-0.6, 0.6].map((lx, i) => (
            <mesh key={i} position={[lx, 0.4, 0]}>
              <cylinderGeometry args={[0.06, 0.06, 0.8, 8]} />
              <meshStandardMaterial color="#475569" metalness={0.9} />
            </mesh>
          ))}
          {/* Main Pressure Tank Vessel */}
          <mesh position={[0, 0.9, 0]}>
            <cylinderGeometry args={[0.55, 0.55, 1.1, 24]} />
            <meshStandardMaterial color="#334155" metalness={0.6} roughness={0.2} />
          </mesh>
          {/* Sight Glass Level Tube */}
          <mesh position={[0.56, 0.9, 0]}>
            <cylinderGeometry args={[0.04, 0.04, 0.8, 12]} />
            <meshStandardMaterial color="#00E5FF" transparent opacity={0.8} />
          </mesh>
          {/* Top Gearbox Motor Head */}
          <mesh position={[0, 1.55, 0]}>
            <boxGeometry args={[0.4, 0.3, 0.4]} />
            <meshStandardMaterial color="#0F172A" />
          </mesh>
          {/* Rotating Impeller Shaft inside */}
          <group ref={movingPartRef} position={[0, 0.9, 0]}>
            {[-45, 45, 135, 225].map((ang, idx) => (
              <mesh key={idx} rotation={[0, (ang * Math.PI) / 180, 0]}>
                <boxGeometry args={[0.7, 0.04, 0.1]} />
                <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
              </mesh>
            ))}
          </group>
        </group>
      )}

      {/* Thermal Dryer Chamber */}
      {machine.type === 'Dryer' && (
        <group position={[0, 0.2, 0]}>
          {/* Insulated Frame */}
          <mesh position={[0, 0.7, 0]}>
            <boxGeometry args={[1.5, 1.0, 1.2]} />
            <meshStandardMaterial color="#334155" metalness={0.7} />
          </mesh>
          {/* Rotating Drum */}
          <group ref={movingPartRef} position={[0, 0.7, 0]}>
            <mesh rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.45, 0.45, 1.3, 20]} />
              <meshStandardMaterial color="#64748B" metalness={0.8} wireframe />
            </mesh>
          </group>
        </group>
      )}

      {/* Hydraulic Press */}
      {machine.type === 'Press' && (
        <group position={[0, 0.2, 0]}>
          {/* 4 Corner Heavy Columns */}
          {[[-0.5, -0.5], [-0.5, 0.5], [0.5, -0.5], [0.5, 0.5]].map(([cx, cz], i) => (
            <mesh key={i} position={[cx, 0.8, cz]}>
              <cylinderGeometry args={[0.06, 0.06, 1.4, 12]} />
              <meshStandardMaterial color="#64748B" metalness={0.9} />
            </mesh>
          ))}
          {/* Top Crown */}
          <mesh position={[0, 1.5, 0]}>
            <boxGeometry args={[1.3, 0.3, 1.3]} />
            <meshStandardMaterial color="#1E293B" />
          </mesh>
          {/* Moving Hydraulic Ram */}
          <mesh ref={movingPartRef} position={[0, 0.5, 0]}>
            <boxGeometry args={[0.9, 0.3, 0.9]} />
            <meshStandardMaterial color={color} metalness={0.9} emissive={color} emissiveIntensity={0.2} />
          </mesh>
        </group>
      )}

      {/* Roller Conveyor */}
      {machine.type === 'Conveyor' && (
        <group position={[0, 0.2, 0]}>
          <mesh position={[0, 0.2, 0]}>
            <boxGeometry args={[2.0, 0.15, 0.6]} />
            <meshStandardMaterial color="#0F172A" metalness={0.8} />
          </mesh>
          {/* Moving Package Cargo */}
          <mesh position={[0, 0.4, 0]}>
            <boxGeometry args={[0.4, 0.3, 0.4]} />
            <meshStandardMaterial color="#F59E0B" />
          </mesh>
        </group>
      )}

      {/* Boiler / Compressor / Motor / Packaging / Switchgear */}
      {(machine.type === 'Motor' || machine.type === 'Compressor' || machine.type === 'Boiler' || machine.type === 'Switchgear' || machine.type === 'Packaging') && (
        <group position={[0, 0.2, 0]}>
          <mesh ref={movingPartRef} position={[0, 0.6, 0]}>
            <boxGeometry args={[1.1, 0.9, 1.1]} />
            <meshStandardMaterial color={color} metalness={0.7} roughness={0.2} />
          </mesh>
        </group>
      )}

      {/* Top Status Beacon */}
      <mesh position={[0, 1.8, 0]}>
        <sphereGeometry args={[0.1, 12, 12]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </group>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   8. REALISTIC VIRTUAL 3D WORKERS WITH OVERHEAD 3D LABELS
   ═══════════════════════════════════════════════════════════════════════════ */
function WorkerMesh({ worker, onClick, isSelected }) {
  const meshRef = useRef();
  const leftLegRef = useRef();
  const rightLegRef = useRef();
  const leftArmRef = useRef();
  const rightArmRef = useRef();

  const [pathIndex, setPathIndex] = useState(0);
  const targetPos = useMemo(() => worker.path[pathIndex], [worker.path, pathIndex]);
  const figureMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#E2E8F0',
    roughness: 0.25,
    metalness: 0.1,
  }), []);

  useFrame((state, delta) => {
    if (!meshRef.current || !targetPos) return;
    const current = meshRef.current.position;
    const target = new THREE.Vector3(...targetPos);
    
    current.lerp(target, delta * 0.9);

    // Walking leg & arm swing animation
    const swing = Math.sin(state.clock.elapsedTime * 6) * 0.35;
    if (leftLegRef.current) leftLegRef.current.rotation.x = swing;
    if (rightLegRef.current) rightLegRef.current.rotation.x = -swing;
    if (leftArmRef.current) leftArmRef.current.rotation.x = -swing * 0.8;
    if (rightArmRef.current) rightArmRef.current.rotation.x = swing * 0.8;

    if (current.distanceTo(target) < 0.25) {
      setPathIndex((prev) => (prev + 1) % worker.path.length);
    }
  });

  const ppeColor = worker.ppe.helmet && worker.ppe.mask && worker.ppe.gloves ? '#22C55E' : '#F97316';

  return (
    <group ref={meshRef} position={worker.path[0]} onClick={(e) => { e.stopPropagation(); onClick(worker); }}>
      {/* 3D Floating Worker Status Badge */}
      <Html position={[0, 1.6, 0]} center distanceFactor={15}>
        <div className="px-2 py-1 rounded glass-card flex items-center gap-1.5 whitespace-nowrap text-[10px] font-mono shadow-lg border"
          style={{ borderColor: ppeColor, background: 'rgba(8,13,26,0.9)' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: ppeColor }} />
          <span className="font-bold text-white">{worker.name}</span>
          <span className="text-muted">({worker.heartRate} bpm)</span>
        </div>
      </Html>

      {/* Selected Halo Ring */}
      {isSelected && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.5, 0.7, 32]} />
          <meshBasicMaterial color="#00E5FF" side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* RFID Foot Beacon */}
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.25, 0.35, 16]} />
        <meshBasicMaterial color={ppeColor} transparent opacity={0.7} side={THREE.DoubleSide} />
      </mesh>

      {/* ─── HUMANOID MANNEQUIN SCALE FIGURE ─── */}
      <group position={[0, 0, 0]}>
        {/* Head */}
        <mesh position={[0, 0.94, 0]} material={figureMaterial}>
          <sphereGeometry args={[0.09, 16, 16]} />
        </mesh>

        {/* Safety Helmet / Hardhat */}
        <mesh position={[0, 0.97, 0]}>
          <sphereGeometry args={[0.11, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#F59E0B" roughness={0.3} emissive="#F59E0B" emissiveIntensity={0.2} />
        </mesh>

        {/* Neck */}
        <mesh position={[0, 0.84, 0]} material={figureMaterial}>
          <cylinderGeometry args={[0.035, 0.04, 0.08, 8]} />
        </mesh>

        {/* Chest & Torso */}
        <mesh position={[0, 0.65, 0]} material={figureMaterial}>
          <cylinderGeometry args={[0.14, 0.11, 0.32, 12]} />
        </mesh>

        {/* Hi-Vis Safety Vest Overlay */}
        <mesh position={[0, 0.65, 0]}>
          <cylinderGeometry args={[0.145, 0.115, 0.28, 12]} />
          <meshStandardMaterial color="#F97316" roughness={0.3} />
        </mesh>

        {/* Hips / Waist */}
        <mesh position={[0, 0.46, 0]} material={figureMaterial}>
          <cylinderGeometry args={[0.11, 0.10, 0.1, 12]} />
        </mesh>

        {/* Left Arm */}
        <group ref={leftArmRef} position={[-0.16, 0.72, 0]}>
          <mesh position={[0, -0.16, 0]} material={figureMaterial}>
            <capsuleGeometry args={[0.035, 0.28, 8, 8]} />
          </mesh>
        </group>

        {/* Right Arm */}
        <group ref={rightArmRef} position={[0.16, 0.72, 0]}>
          <mesh position={[0, -0.16, 0]} material={figureMaterial}>
            <capsuleGeometry args={[0.035, 0.28, 8, 8]} />
          </mesh>
        </group>

        {/* Left Leg */}
        <group ref={leftLegRef} position={[-0.07, 0.42, 0]}>
          <mesh position={[0, -0.18, 0]} material={figureMaterial}>
            <capsuleGeometry args={[0.045, 0.34, 8, 8]} />
          </mesh>
          {/* Shoe */}
          <mesh position={[0, -0.38, 0.03]}>
            <boxGeometry args={[0.07, 0.05, 0.12]} />
            <meshStandardMaterial color="#1E293B" />
          </mesh>
        </group>

        {/* Right Leg */}
        <group ref={rightLegRef} position={[0.07, 0.42, 0]}>
          <mesh position={[0, -0.18, 0]} material={figureMaterial}>
            <capsuleGeometry args={[0.045, 0.34, 8, 8]} />
          </mesh>
          {/* Shoe */}
          <mesh position={[0, -0.38, 0.03]}>
            <boxGeometry args={[0.07, 0.05, 0.12]} />
            <meshStandardMaterial color="#1E293B" />
          </mesh>
        </group>
      </group>
    </group>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   9. PHYSICAL MOUNTED SENSORS
   ═══════════════════════════════════════════════════════════════════════════ */
function SensorMesh({ sensor, onClick, isSelected }) {
  const [x, y, z] = sensor.pos;
  const statusColor = sensor.status === 'ALERT' ? '#EF4444' : sensor.status === 'WARNING' ? '#F97316' : '#22C55E';

  return (
    <group position={[x, y, z]} onClick={(e) => { e.stopPropagation(); onClick(sensor); }}>
      <mesh>
        <boxGeometry args={[0.3, 0.3, 0.3]} />
        <meshStandardMaterial color="#0F172A" metalness={0.9} />
      </mesh>
      <mesh position={[0, 0, 0.17]}>
        <sphereGeometry args={[0.08, 12, 12]} />
        <meshBasicMaterial color={statusColor} />
      </mesh>
      {isSelected && (
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[0.35, 16, 16]} />
          <meshBasicMaterial color="#00E5FF" wireframe />
        </mesh>
      )}
    </group>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   10. ANIMATED PIPELINES
   ═══════════════════════════════════════════════════════════════════════════ */
function PipelineTube({ pipe }) {
  const from = new THREE.Vector3(...pipe.from);
  const to = new THREE.Vector3(...pipe.to);
  const mid = from.clone().add(to).multiplyScalar(0.5);
  const length = from.distanceTo(to);
  const angleY = Math.atan2(to.x - from.x, to.z - from.z);

  return (
    <mesh position={[mid.x, mid.y, mid.z]} rotation={[Math.PI / 2, 0, angleY]}>
      <cylinderGeometry args={[0.07, 0.07, length, 12]} />
      <meshStandardMaterial
        color="#0F172A"
        emissive={pipe.color}
        emissiveIntensity={0.4}
        roughness={0.2}
      />
    </mesh>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   11. 3D ZONE BUILDING SCADA STRUCTURE
   ═══════════════════════════════════════════════════════════════════════════ */
function ZoneBuilding({ zone, zoneScore, showLabels, isSelected, onClick }) {
  const meshRef = useRef();
  const [hovered, setHovered] = useState(false);

  const score = zoneScore?.hazard_score || 0;
  const level = zoneScore?.risk_level || 'low';
  const color = riskToColor(level);
  const isAnomaly = level === 'critical' || level === 'high';
  const [w, h, d] = zone.size;

  useFrame(({ clock }) => {
    if (meshRef.current && isAnomaly) {
      const pulse = Math.sin(clock.elapsedTime * 4) * 0.03 + 1;
      meshRef.current.scale.setScalar(hovered ? 1.05 : pulse);
    }
  });

  return (
    <group position={zone.pos} onClick={(e) => { e.stopPropagation(); onClick(zone); }}>
      {/* Floor Base */}
      <mesh position={[0, 0.04, 0]} receiveShadow>
        <boxGeometry args={[w + 0.2, 0.08, d + 0.2]} />
        <meshStandardMaterial color={color} transparent opacity={0.25} />
      </mesh>

      {/* Structural Glass Building Body */}
      <mesh
        ref={meshRef}
        castShadow
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        position={[0, h / 2 + 0.08, 0]}
      >
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={isSelected ? 0.45 : hovered ? 0.35 : 0.18}
          emissive={color}
          emissiveIntensity={isAnomaly ? 0.35 : 0.08}
          metalness={0.1}
          roughness={0.1}
        />
      </mesh>

      {/* Wireframe Structural Beams */}
      <mesh position={[0, h / 2 + 0.08, 0]}>
        <boxGeometry args={[w, h, d]} />
        <meshBasicMaterial color={color} wireframe transparent opacity={0.4} />
      </mesh>

      {/* Department Status Ring */}
      <mesh position={[0, 0.09, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[w * 0.45, w * 0.48, 32]} />
        <meshBasicMaterial color={color} side={THREE.DoubleSide} transparent opacity={0.7} />
      </mesh>

      {/* Zone Title & Score Floating 3D Text */}
      {showLabels && (
        <group position={[0, h + 0.8, 0]}>
          <Text
            position={[0, 0.25, 0]}
            fontSize={0.28}
            color="#FFFFFF"
            anchorX="center"
            anchorY="middle"
          >
            {zone.name}
          </Text>
          <Text
            position={[0, -0.05, 0]}
            fontSize={0.22}
            color={color}
            anchorX="center"
            anchorY="middle"
          >
            {score.toFixed(0)}% HAZARD ({level.toUpperCase()})
          </Text>
        </group>
      )}
    </group>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   12. MAIN SCADA FACTORY 3D SCENE
   ═══════════════════════════════════════════════════════════════════════════ */
function FactoryScene({
  zoneScores = [],
  machines = [],
  workers = [],
  sensors = [],
  showLabels = true,
  showPipelines = true,
  selectedObject = null,
  onSelectObject,
  cameraTarget,
  resetCamera
}) {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[20, 35, 15]} intensity={0.9} castShadow />
      <pointLight position={[0, 14, 0]} intensity={0.7} color="#00E5FF" />
      <pointLight position={[-12, 10, -8]} intensity={0.6} color="#EF4444" />
      <pointLight position={[12, 10, 8]} intensity={0.6} color="#3B82F6" />

      {/* Industrial Floor Plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[2, -0.02, 0]} receiveShadow>
        <planeGeometry args={[48, 32]} />
        <meshStandardMaterial color="#080D1A" roughness={0.8} />
      </mesh>

      {/* SCADA Grid Floor */}
      <gridHelper args={[48, 48, '#00E5FF', '#0D2040']} position={[2, 0, 0]} />

      {/* 13 Zone Buildings */}
      {INDUSTRIAL_ZONES.map((zone, i) => (
        <ZoneBuilding
          key={zone.id}
          zone={zone}
          zoneScore={zoneScores[i]}
          showLabels={showLabels}
          isSelected={selectedObject?.type === 'zone' && selectedObject?.data.id === zone.id}
          onClick={(z) => onSelectObject('zone', z)}
        />
      ))}

      {/* Animated Machinery */}
      {machines.map((mch) => (
        <MachineMesh
          key={mch.id}
          machine={mch}
          isSelected={selectedObject?.type === 'machine' && selectedObject?.data.id === mch.id}
          onClick={(m) => onSelectObject('machine', m)}
        />
      ))}

      {/* Autonomous Moving Workers */}
      {workers.map((wkr) => (
        <WorkerMesh
          key={wkr.id}
          worker={wkr}
          isSelected={selectedObject?.type === 'worker' && selectedObject?.data.id === wkr.id}
          onClick={(w) => onSelectObject('worker', w)}
        />
      ))}

      {/* Physical Mounted Sensors */}
      {sensors.map((sns) => (
        <SensorMesh
          key={sns.id}
          sensor={sns}
          isSelected={selectedObject?.type === 'sensor' && selectedObject?.data.id === sns.id}
          onClick={(s) => onSelectObject('sensor', s)}
        />
      ))}

      {/* Glowing Pipelines */}
      {showPipelines && PIPELINES.map((p, idx) => (
        <PipelineTube key={idx} pipe={p} />
      ))}

      {/* Camera Controller */}
      <CameraController
        cameraTarget={cameraTarget}
        resetTrigger={resetCamera}
      />
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   13. RIGHT-SIDE SCADA GLASS INSPECTOR DRAWER
   ═══════════════════════════════════════════════════════════════════════════ */
function InspectorDrawer({ selected, onClose }) {
  if (!selected) return null;

  const { type, data } = selected;

  return (
    <motion.aside
      initial={{ x: 380, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 380, opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="w-96 flex flex-col glass-card border-l h-full overflow-hidden"
      style={{
        background: 'rgba(8, 13, 26, 0.95)',
        borderColor: 'var(--border-normal)',
        boxShadow: '-8px 0 32px rgba(0,0,0,0.6)',
      }}
    >
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-dim)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(0,229,255,0.12)', border: '1px solid var(--border-normal)' }}>
            {type === 'zone' && <Layers size={16} className="text-cyan" />}
            {type === 'worker' && <Users size={16} className="text-cyan" />}
            {type === 'machine' && <Cpu size={16} className="text-cyan" />}
            {type === 'sensor' && <Activity size={16} className="text-cyan" />}
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-cyan" style={{ fontFamily: 'var(--font-mono)' }}>
              {type} INSPECTOR
            </div>
            <div className="text-sm font-bold text-primary">{data.name || data.id}</div>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-muted hover:text-white">
          <X size={16} />
        </button>
      </div>

      {/* Body Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">

        {/* ZONE INSPECTOR VIEW */}
        {type === 'zone' && (
          <>
            <div className="p-3 rounded-lg border flex items-center justify-between" style={{ background: 'rgba(0,229,255,0.04)', borderColor: 'var(--border-dim)' }}>
              <div>
                <div className="text-[10px] text-muted font-mono">ZONE CODE</div>
                <div className="text-base font-bold font-mono text-cyan">{data.code}</div>
              </div>
              <div>
                <div className="text-[10px] text-muted font-mono">DEPARTMENT</div>
                <div className="text-sm font-semibold">{data.dept}</div>
              </div>
            </div>

            {/* Telemetry Metrics Grid */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded-lg border glass-card">
                <div className="text-[10px] text-muted flex items-center gap-1"><Thermometer size={10} /> Temperature</div>
                <div className="text-sm font-bold font-mono mt-1 text-danger">48.2°C</div>
              </div>
              <div className="p-2.5 rounded-lg border glass-card">
                <div className="text-[10px] text-muted flex items-center gap-1"><Droplets size={10} /> Humidity</div>
                <div className="text-sm font-bold font-mono mt-1 text-warn">24.0%</div>
              </div>
              <div className="p-2.5 rounded-lg border glass-card">
                <div className="text-[10px] text-muted flex items-center gap-1"><Wind size={10} /> Gas Level</div>
                <div className="text-sm font-bold font-mono mt-1 text-warn">380 ppm</div>
              </div>
              <div className="p-2.5 rounded-lg border glass-card">
                <div className="text-[10px] text-muted flex items-center gap-1"><Zap size={10} /> Power</div>
                <div className="text-sm font-bold font-mono mt-1 text-cyan">18.4 kW</div>
              </div>
            </div>

            {/* AI Safety Advice */}
            <div className="p-3 rounded-lg border space-y-1.5" style={{ background: 'rgba(239,68,68,0.06)', borderColor: 'rgba(239,68,68,0.2)' }}>
              <div className="flex items-center gap-1.5 font-bold text-danger text-[11px]">
                <ShieldAlert size={14} /> AI SAFETY RECOMMENDATION
              </div>
              <p className="text-[11px] text-secondary leading-relaxed font-mono">
                Hazard index at 68%. Elevated gas concentration detected. Increase exhaust ventilation rate by 35% and trigger automated humidifier spray.
              </p>
            </div>
          </>
        )}

        {/* WORKER INSPECTOR VIEW */}
        {type === 'worker' && (
          <>
            <div className="p-3 rounded-lg border space-y-2" style={{ background: 'rgba(0,229,255,0.04)', borderColor: 'var(--border-dim)' }}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold">{data.name}</span>
                <span className="badge badge-normal">{data.rfid}</span>
              </div>
              <div className="text-[11px] text-muted font-mono">{data.id} · {data.designation}</div>
            </div>

            {/* PPE Verification Checklist */}
            <div className="space-y-2">
              <div className="section-label">PPE Compliance Status</div>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(data.ppe).map(([item, ok]) => (
                  <div key={item} className="p-2 rounded border flex items-center justify-between" style={{ background: ok ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)', borderColor: ok ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)' }}>
                    <span className="capitalize font-semibold text-[11px]">{item}</span>
                    {ok ? <CheckCircle size={14} className="text-safe" /> : <AlertTriangle size={14} className="text-danger" />}
                  </div>
                ))}
              </div>
            </div>

            {/* Vitals Telemetry */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded-lg border glass-card">
                <div className="text-[10px] text-muted flex items-center gap-1"><Heart size={10} className="text-danger" /> Heart Rate</div>
                <div className="text-sm font-bold font-mono mt-1 text-primary">{data.heartRate} bpm</div>
              </div>
              <div className="p-2.5 rounded-lg border glass-card">
                <div className="text-[10px] text-muted flex items-center gap-1"><Thermometer size={10} className="text-warn" /> Body Temp</div>
                <div className="text-sm font-bold font-mono mt-1 text-primary">{data.bodyTemp}°C</div>
              </div>
            </div>

            {/* Current Activity */}
            <div className="p-3 rounded-lg border space-y-1" style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'var(--border-dim)' }}>
              <div className="text-[10px] text-muted font-mono">CURRENT TASK</div>
              <div className="font-semibold text-cyan">{data.task}</div>
              <div className="text-[10px] text-muted">Assigned: {data.assignedMachine}</div>
            </div>
          </>
        )}

        {/* MACHINE INSPECTOR VIEW */}
        {type === 'machine' && (
          <>
            <div className="p-3 rounded-lg border space-y-2" style={{ background: 'rgba(0,229,255,0.04)', borderColor: 'var(--border-dim)' }}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold">{data.name}</span>
                <span className={`badge badge-${data.status === 'running' ? 'normal' : 'warning'}`}>{data.status}</span>
              </div>
              <div className="text-[11px] text-muted font-mono">{data.id} · Type: {data.type}</div>
            </div>

            {/* Machine Health & RUL */}
            <div className="p-3 rounded-lg border space-y-2" style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'var(--border-dim)' }}>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted">Health Index</span>
                <span className="font-bold font-mono text-cyan">{data.health}%</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${data.health}%`, background: 'var(--cyan)' }} />
              </div>

              <div className="flex items-center justify-between text-[11px] pt-1">
                <span className="text-muted">Remaining Useful Life (RUL)</span>
                <span className="font-bold font-mono text-warn">{data.rul} days</span>
              </div>
            </div>

            {/* Sensor Readings */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded-lg border glass-card">
                <div className="text-[10px] text-muted">Temperature</div>
                <div className="text-sm font-bold font-mono mt-1 text-danger">{data.temp}°C</div>
              </div>
              <div className="p-2.5 rounded-lg border glass-card">
                <div className="text-[10px] text-muted">Vibration</div>
                <div className="text-sm font-bold font-mono mt-1 text-warn">{data.vibration} mm/s</div>
              </div>
            </div>

            {/* AI Predictive Maintenance */}
            <div className="p-3 rounded-lg border space-y-1.5" style={{ background: 'rgba(234,179,8,0.06)', borderColor: 'rgba(234,179,8,0.2)' }}>
              <div className="flex items-center gap-1.5 font-bold text-warn text-[11px]">
                <Wrench size={14} /> PREDICTIVE MAINTENANCE ALERT
              </div>
              <p className="text-[11px] text-secondary leading-relaxed font-mono">
                Failure probability: {data.failureProb}%. Recommended action: Inspect bearing lubrication within {data.schedule}.
              </p>
            </div>
          </>
        )}

        {/* SENSOR INSPECTOR VIEW */}
        {type === 'sensor' && (
          <>
            <div className="p-3 rounded-lg border space-y-1" style={{ background: 'rgba(0,229,255,0.04)', borderColor: 'var(--border-dim)' }}>
              <div className="text-sm font-bold text-cyan">{data.id}</div>
              <div className="text-[11px] text-muted font-mono">Type: {data.type}</div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded-lg border glass-card">
                <div className="text-[10px] text-muted">Normal Range</div>
                <div className="text-sm font-bold font-mono mt-1 text-safe">{data.normal}</div>
              </div>
              <div className="p-2.5 rounded-lg border glass-card">
                <div className="text-[10px] text-muted">Last Calibration</div>
                <div className="text-sm font-bold font-mono mt-1 text-primary">{data.calib}</div>
              </div>
            </div>
          </>
        )}

      </div>
    </motion.aside>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   14. MAIN DIGITAL TWIN SCADA OPERATIONS CENTER PAGE
   ═══════════════════════════════════════════════════════════════════════════ */
export default function DigitalTwin() {
  const { zoneScores, anomalyZone } = useApp();

  const [showLabels, setShowLabels] = useState(true);
  const [showPipelines, setShowPipelines] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedObject, setSelectedObject] = useState(null);

  const [machines] = useState(INITIAL_MACHINES);
  const [workers] = useState(INITIAL_WORKERS);
  const [sensors] = useState(INITIAL_SENSORS);

  const [cameraTarget, setCameraTarget] = useState(null);

  const resetCamera = useCallback(() => {
    setCameraTarget({ pos: [14, 18, 26], lookAt: [2, 0, 0] });
    setSelectedObject(null);
  }, []);

  const handleSelectObject = (type, data) => {
    setSelectedObject({ type, data });
    let targetPos = [14, 18, 26];
    let lookAt = [0, 0, 0];

    if (type === 'zone') {
      lookAt = data.pos;
      targetPos = [data.pos[0] + 6, data.pos[1] + 8, data.pos[2] + 10];
    } else if (type === 'machine' || type === 'worker' || type === 'sensor') {
      lookAt = data.pos || [0, 0, 0];
      targetPos = [lookAt[0] + 4, lookAt[1] + 5, lookAt[2] + 6];
    }

    setCameraTarget({ pos: targetPos, lookAt });
  };

  return (
    <div className="h-full flex flex-col gap-3 font-display">
      
      {/* 1. TOP SCADA COMMAND STATUS BAR */}
      <div className="glass-card p-3 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(0,229,255,0.15)', border: '1px solid var(--border-bright)' }}>
            <Layers className="text-cyan" size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-primary tracking-wide">DIGITAL TWIN SCADA OPERATIONS CENTER</h1>
              <span className="badge badge-hw">13 ZONES ACTIVE</span>
            </div>
            <p className="text-[11px] text-muted font-mono">
              Siemens SCADA v4.8 Architecture · Live Facility Telemetry & Worker Tracking
            </p>
          </div>
        </div>

        <div className="flex items-center gap-5 text-xs font-mono">
          <div className="text-center">
            <div className="text-[10px] text-muted uppercase">Facility Health</div>
            <div className="text-sm font-bold text-safe">94.8%</div>
          </div>
          <div className="text-center">
            <div className="text-[10px] text-muted uppercase">Active Workers</div>
            <div className="text-sm font-bold text-cyan">{workers.length}</div>
          </div>
          <div className="text-center">
            <div className="text-[10px] text-muted uppercase">Machines Running</div>
            <div className="text-sm font-bold text-primary">{machines.filter(m => m.status === 'running').length}/{machines.length}</div>
          </div>
          <div className="text-center">
            <div className="text-[10px] text-muted uppercase">Critical Hazards</div>
            <div className="text-sm font-bold text-danger">{anomalyZone ? 1 : 0}</div>
          </div>
        </div>
      </div>

      {/* 2. GLOBAL SEARCH & QUICK FILTERS TOOLBAR */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-[280px]">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-2.5 text-muted" />
            <input
              type="text"
              placeholder="Search Worker, Machine, Zone or Sensor ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg text-xs font-mono"
              style={{ background: 'rgba(13,21,38,0.9)', border: '1px solid var(--border-normal)', color: 'var(--text-primary)' }}
            />
          </div>

          <div className="flex items-center gap-1">
            {['all', 'workers', 'machines', 'sensors', 'hazards'].map((f) => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold capitalize transition-all ${activeFilter === f ? 'btn-primary' : 'glass-card text-muted'}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setShowPipelines(p => !p)} className="btn-primary text-xs">
            <Radio size={12} /> {showPipelines ? 'Hide Pipes' : 'Show Pipes'}
          </button>
          <button onClick={() => setShowLabels(s => !s)} className="btn-primary text-xs">
            {showLabels ? <EyeOff size={12} /> : <Eye size={12} />}
            {showLabels ? 'Hide Labels' : 'Show Labels'}
          </button>
          <button onClick={resetCamera} className="btn-primary text-xs">
            <RotateCcw size={12} /> Reset View
          </button>
        </div>
      </div>

      {/* 3. MAIN 3D CANVAS & INSPECTOR CONTAINER */}
      <div className="flex-1 flex gap-3 min-h-[520px] relative overflow-hidden">
        
        {/* 3D Canvas */}
        <div className="flex-1 glass-card overflow-hidden relative">
          <Suspense fallback={
            <div className="h-full flex items-center justify-center text-muted font-mono text-xs">
              Loading 3D SCADA Facility Environment...
            </div>
          }>
            <Canvas camera={{ position: [14, 18, 26], fov: 48 }} shadows style={{ background: '#040810' }}>
              <FactoryScene
                zoneScores={zoneScores}
                machines={machines}
                workers={workers}
                sensors={sensors}
                showLabels={showLabels}
                showPipelines={showPipelines}
                selectedObject={selectedObject}
                onSelectObject={handleSelectObject}
                cameraTarget={cameraTarget}
                resetCamera={resetCamera}
              />
            </Canvas>
          </Suspense>

          {/* Controls overlay prompt */}
          <div className="absolute bottom-3 left-3 px-3 py-1.5 rounded-lg glass-card text-[11px] font-mono text-muted flex items-center gap-2">
            <span>🖱️ Drag to Orbit · Scroll to Zoom</span>
            <span>·</span>
            <span>⌨️ Press <kbd className="text-cyan bg-white/10 px-1 rounded">ESC</kbd> to reset view</span>
          </div>
        </div>

        {/* Contextual Right Inspector Drawer */}
        <AnimatePresence>
          {selectedObject && (
            <InspectorDrawer
              selected={selectedObject}
              onClose={() => setSelectedObject(null)}
            />
          )}
        </AnimatePresence>
      </div>

      {/* 4. BOTTOM REAL-TIME EVENT LOG TIMELINE */}
      <div className="glass-card p-2.5 flex items-center gap-4 text-xs font-mono overflow-x-auto whitespace-nowrap">
        <div className="flex items-center gap-1.5 text-cyan font-bold flex-shrink-0">
          <Clock size={14} /> LIVE EVENT TICKER:
        </div>
        <div className="flex items-center gap-6 text-muted flex-1">
          <span className="text-secondary">03:44:10 · EMP-101 (Alex Mercer) walking in Chemical Mixing (Z-02)</span>
          <span>·</span>
          <span className="text-warn">03:43:55 · Machine MCH-04 (Hydraulic Press) vibration alert 4.5 mm/s</span>
          <span>·</span>
          <span className="text-safe">03:42:30 · Exhaust ventilation rate auto-adjusted to 85%</span>
          <span>·</span>
          <span className="text-cyan">03:40:12 · Sensor SNS-GAS-01 calibration valid</span>
        </div>
      </div>

    </div>
  );
}
