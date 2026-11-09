import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useThree, type ThreeEvent } from '@react-three/fiber';
import { CameraControls, CameraControlsImpl, Html, Stars } from '@react-three/drei';
import { AdditiveBlending, CanvasTexture, DoubleSide } from 'three';
import type { GalaxyConfig, Place } from '../../types/timeline';
import { generateGalaxy } from './galaxy';

/*
 * react-three-fiber lets you write three.js scenes as JSX. Lowercase tags
 * like <mesh>, <points> and <sphereGeometry> become three.js objects
 * (new THREE.Mesh() etc.); props set their properties, and `args` are the
 * constructor arguments. Everything inside <Canvas> is the 3D scene.
 *
 * This file is loaded lazily (see LazyGalaxyMap.ts), so the large three.js
 * bundle only downloads when a map is actually shown.
 */

type Vec3 = [number, number, number];

const ACCENT = '#c9a227';
const HOME: Vec3 = [0, 95, 125];

interface Props {
  config: GalaxyConfig;
  places: Place[];
  selectedPlaceId?: string | null;
  /** Places to emphasise, e.g. the ones linked to an event. */
  highlightIds?: string[];
  onSelectPlace?: (id: string) => void;
  /** Placement mode for the editor: click the galaxy to set a position. */
  pick?: { position: Place['position']; onPick: (position: Vec3) => void };
}

export default function GalaxyMap({ config, places, selectedPlaceId, highlightIds = [], onSelectPlace, pick }: Props) {
  const placed = places.filter((p): p is Place & { position: Vec3 } => p.position !== null);
  const selected = placed.find((p) => p.id === selectedPlaceId);
  const interactive = !pick && onSelectPlace !== undefined;
  // Bumping this number tells the camera to fly back to its resting view
  const [resetCount, setResetCount] = useState(0);

  return (
    <div className="galaxy-map">
      <Canvas camera={{ position: HOME, fov: 50, near: 0.1, far: 3000 }} dpr={[1, 2]}>
        <color attach="background" args={['#05050a']} />
        <Stars radius={700} depth={300} count={5000} factor={7} fade speed={0.4} />
        <GalaxyPoints config={config} />
        <CoreGlow color={config.coreColor} size={config.radius * 0.9} />

        {placed.map((place) => (
          <PlaceMarker
            key={place.id}
            place={place}
            selected={place.id === selectedPlaceId}
            highlighted={highlightIds.includes(place.id)}
            interactive={interactive}
            dimmed={!!pick}
            onSelect={(id) => onSelectPlace?.(id)}
          />
        ))}

        {pick && (
          <>
            <PickPlane radius={config.radius * 1.3} onPick={pick.onPick} />
            <polarGridHelper args={[config.radius * 1.2, 12, 6, 64, '#3a3a46', '#22222a']} />
            {pick.position && <PickedMarker position={pick.position} />}
          </>
        )}

        <CameraRig focus={selected?.position ?? null} resetCount={resetCount} />
      </Canvas>
      <button type="button" className="btn map-reset" onClick={() => setResetCount((n) => n + 1)}>Reset view</button>
    </div>
  );
}

// ---------- The galaxy ----------

/** A soft round dot, drawn once on a 2D canvas and used as a texture. */
function makeGlowTexture() {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,255,255,0.6)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new CanvasTexture(canvas);
}

function GalaxyPoints({ config }: { config: GalaxyConfig }) {
  // The config object is recreated on every database update, so key the
  // (expensive) generation on its contents instead of its identity.
  const configKey = JSON.stringify(config);
  const { positions, colors } = useMemo(() => generateGalaxy(JSON.parse(configKey)), [configKey]);
  const texture = useMemo(makeGlowTexture, []);

  return (
    <points key={configKey}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={1.1}
        sizeAttenuation
        vertexColors
        map={texture}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </points>
  );
}

function CoreGlow({ color, size }: { color: string; size: number }) {
  const texture = useMemo(makeGlowTexture, []);
  return (
    <sprite scale={[size, size, 1]}>
      <spriteMaterial map={texture} color={color} transparent opacity={0.55} depthWrite={false} blending={AdditiveBlending} />
    </sprite>
  );
}

// ---------- Places ----------

interface MarkerProps {
  place: Place & { position: Vec3 };
  selected: boolean;
  highlighted: boolean;
  interactive: boolean;
  dimmed: boolean;
  onSelect: (id: string) => void;
}

function PlaceMarker({ place, selected, highlighted, interactive, dimmed, onSelect }: MarkerProps) {
  const [hovered, setHovered] = useState(false);
  const active = selected || highlighted || (hovered && interactive);

  // Pointer events on 3D objects work like DOM events in r3f
  const handlers = interactive
    ? {
        onClick: (e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          onSelect(place.id);
        },
        onPointerOver: () => {
          setHovered(true);
          document.body.style.cursor = 'pointer';
        },
        onPointerOut: () => {
          setHovered(false);
          document.body.style.cursor = '';
        },
      }
    : {};

  return (
    <group position={place.position}>
      <mesh {...handlers}>
        <sphereGeometry args={[active ? 1.6 : 1.1, 16, 16]} />
        <meshBasicMaterial color={selected ? ACCENT : '#f2eee4'} transparent opacity={dimmed ? 0.45 : 1} />
      </mesh>
      {active && (
        <mesh rotation-x={-Math.PI / 2}>
          <ringGeometry args={[2.6, 3.2, 48]} />
          <meshBasicMaterial color={ACCENT} transparent opacity={0.85} side={DoubleSide} />
        </mesh>
      )}
      {/* <Html> places normal DOM elements at a 3D position */}
      <Html center position={[0, 4.5, 0]} zIndexRange={[20, 0]} style={{ pointerEvents: interactive ? 'auto' : 'none' }}>
        <button
          type="button" // the map can sit inside a <form>; don't let labels submit it
          className={`map-label${selected ? ' is-selected' : ''}${highlighted ? ' is-highlighted' : ''}${dimmed ? ' is-dimmed' : ''}`}
          tabIndex={interactive ? 0 : -1}
          onClick={() => onSelect(place.id)}
        >
          {place.name}
        </button>
      </Html>
    </group>
  );
}

// ---------- Editor placement ----------

/** An invisible disc on the galactic plane that catches clicks. */
function PickPlane({ radius, onPick }: { radius: number; onPick: (p: Vec3) => void }) {
  const round = (n: number) => Math.round(n * 10) / 10;
  return (
    <mesh
      rotation-x={-Math.PI / 2}
      onClick={(e) => {
        // `delta` is how far the pointer moved: ignore drags (camera orbits)
        if (e.delta > 4) return;
        e.stopPropagation();
        onPick([round(e.point.x), 0, round(e.point.z)]);
      }}
      onPointerOver={() => (document.body.style.cursor = 'crosshair')}
      onPointerOut={() => (document.body.style.cursor = '')}
    >
      <circleGeometry args={[radius, 64]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}

function PickedMarker({ position }: { position: Vec3 }) {
  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[1.8, 16, 16]} />
        <meshBasicMaterial color={ACCENT} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2}>
        <ringGeometry args={[3, 3.6, 48]} />
        <meshBasicMaterial color={ACCENT} side={DoubleSide} />
      </mesh>
    </group>
  );
}

// ---------- Camera ----------

/** Orbit / zoom controls that glide to the selected place, or back home. */
function CameraRig({ focus, resetCount }: { focus: Vec3 | null; resetCount: number }) {
  const controls = useRef<CameraControlsImpl>(null);
  const focusKey = focus ? focus.join(',') : '';
  // On tall, narrow screens (phones) back the camera off so the whole
  // galaxy fits across. Rounded so tiny resizes don't re-trigger the flight.
  const pullBack = useThree((s) => Math.round(Math.min(2.2, Math.max(1, s.size.height / s.size.width)) * 10) / 10);

  useEffect(() => {
    const c = controls.current;
    if (!c) return;
    if (!focusKey) {
      const [hx, hy, hz] = HOME.map((v) => v * pullBack);
      c.setLookAt(hx, hy, hz, 0, 0, 0, true);
      return;
    }
    const [x, y, z] = focusKey.split(',').map(Number);
    c.setLookAt(x, y + 45 * pullBack, z + 60 * pullBack, x, y, z, true); // true = animate
    // resetCount isn't read inside, but changing it re-runs the effect
  }, [focusKey, resetCount, pullBack]);

  // Reset the cursor if the map unmounts while hovering something
  useEffect(() => () => void (document.body.style.cursor = ''), []);

  return <CameraControls ref={controls} makeDefault minDistance={10} maxDistance={600} maxPolarAngle={Math.PI * 0.48} />;
}
