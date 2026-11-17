import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useThree, type ThreeEvent } from '@react-three/fiber';
import { CameraControls, CameraControlsImpl, Html, Line, Stars } from '@react-three/drei';
import { AdditiveBlending, CanvasTexture, Color, DoubleSide } from 'three';
import type { GalaxyConfig, Place } from '../../types/timeline';
import { useThemePalette } from '../../themes/palette';
import { generateGalaxy } from './galaxy';
import { starmapLabel, sweep, type RegionView } from '../../lib/regions';

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

const HOME: Vec3 = [0, 95, 125];

/** Deep space: the theme's background, darkened almost to black (matches --space in index.css). */
const spaceColor = (bg: string) => `#${new Color(bg).lerp(new Color('#05050a'), 0.8).getHexString()}`;

interface Props {
  config: GalaxyConfig;
  places: Place[];
  selectedPlaceId?: string | null;
  /** Places to emphasise, e.g. the ones linked to an event. */
  highlightIds?: string[];
  /** Places whose marker opens another map: their labels get a marker. */
  openIds?: string[];
  onSelectPlace?: (id: string) => void;
  /** Placement mode for the editor: click the galaxy to set a position. */
  pick?: { position: Place['position']; onPick: (position: Vec3) => void };
  /** Regions: slices of the galaxy and glowing clouds. */
  regions?: RegionView[];
  selectedRegionId?: string | null;
  onSelectRegion?: (id: string) => void;
}

export default function GalaxyMap({ config, places, selectedPlaceId, highlightIds = [], openIds = [], onSelectPlace, pick, regions = [], selectedRegionId, onSelectRegion }: Props) {
  const placed = places.filter((p): p is Place & { position: Vec3 } => p.position !== null);
  const selected = placed.find((p) => p.id === selectedPlaceId);
  const interactive = !pick && onSelectPlace !== undefined;
  // Bumping this number tells the camera to fly back to its resting view
  const [resetCount, setResetCount] = useState(0);

  // Colours: the theme's (arms = accent, core = highlight) unless set to custom.
  // Selection markers always use the accent, and space is the darkened background.
  const palette = useThemePalette();
  const fromTheme = config.colors !== 'custom';
  const colored: GalaxyConfig = fromTheme ? { ...config, coreColor: palette.highlight, armColor: palette.accent } : config;
  const accent = palette.accent;

  return (
    <div className="galaxy-map">
      <Canvas camera={{ position: HOME, fov: 50, near: 0.1, far: 3000 }} dpr={[1, 2]}>
        <color attach="background" args={[spaceColor(palette.bg)]} />
        <Stars radius={700} depth={300} count={5000} factor={7} fade speed={0.4} />
        <GalaxyPoints config={colored} />
        <CoreGlow color={colored.coreColor} size={config.radius * 0.9} />

        {regions.map((r) => (
          <RegionShape3d
            key={r.id}
            region={r}
            selected={r.id === selectedRegionId}
            onSelect={!pick && onSelectRegion ? () => onSelectRegion(r.id) : undefined}
          />
        ))}

        {placed.map((place) => (
          <PlaceMarker
            key={place.id}
            place={place}
            selected={place.id === selectedPlaceId}
            highlighted={highlightIds.includes(place.id)}
            opensMap={openIds.includes(place.id)}
            accent={accent}
            interactive={interactive}
            dimmed={!!pick}
            onSelect={(id) => onSelectPlace?.(id)}
          />
        ))}

        {pick && (
          <>
            <PickPlane radius={config.radius * 1.3} onPick={pick.onPick} />
            <polarGridHelper args={[config.radius * 1.2, 12, 6, 64, '#3a3a46', '#22222a']} />
            {pick.position && <PickedMarker position={pick.position} accent={accent} />}
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

// ---------- Regions ----------

/** The corners of a slice's outline, on the galactic plane. */
function sliceOutline(from: number, span: number, inner: number, outer: number): Vec3[] {
  const steps = Math.max(8, Math.round(span / 3));
  const arc = (r: number, reverse: boolean) =>
    Array.from({ length: steps + 1 }, (_, i) => {
      const a = ((from + (span * (reverse ? steps - i : i)) / steps) * Math.PI) / 180;
      return [Math.cos(a) * r, 0.05, -Math.sin(a) * r] as Vec3;
    });
  const points = [...arc(outer, false), ...arc(inner, true)];
  return [...points, points[0]];
}

/**
 * A region on the starmap: a slice is a flat, tinted pie segment of the
 * disc (ringGeometry draws round from +X towards +Y; tilted flat, +Y points
 * to −Z, matching lib/regions.ts); a cloud is a soft glow round a point.
 */
function RegionShape3d({ region, selected, onSelect }: { region: RegionView; selected: boolean; onSelect?: () => void }) {
  const texture = useMemo(makeGlowTexture, []);
  const shape = region.shape;
  const click = onSelect
    ? {
        onClick: (e: ThreeEvent<MouseEvent>) => {
          if (e.delta > 4) return;
          e.stopPropagation();
          onSelect();
        },
        onPointerOver: () => (document.body.style.cursor = 'pointer'),
        onPointerOut: () => (document.body.style.cursor = ''),
      }
    : { raycast: () => null };
  const label = starmapLabel(shape);

  return (
    <group>
      {shape.type === 'slice' && (
        <>
          <mesh rotation-x={-Math.PI / 2} {...click}>
            <ringGeometry args={[shape.inner, shape.outer, 64, 1, (shape.from * Math.PI) / 180, (sweep(shape.from, shape.to) * Math.PI) / 180]} />
            <meshBasicMaterial color={region.color} transparent opacity={Math.min(0.9, region.fill)} side={DoubleSide} depthWrite={false} />
          </mesh>
          <Line
            points={sliceOutline(shape.from, sweep(shape.from, shape.to), shape.inner, shape.outer)}
            color={region.color}
            lineWidth={selected ? 2.5 : 1.2}
            dashed={selected}
            dashSize={3}
            gapSize={2}
            transparent
            opacity={0.9}
          />
        </>
      )}
      {shape.type === 'cloud' && (
        <>
          <sprite position={shape.center} scale={[shape.radius * 2.6, shape.radius * 2.6, 1]}>
            <spriteMaterial map={texture} color={region.color} transparent opacity={Math.min(1, 0.25 + region.fill)} depthWrite={false} blending={AdditiveBlending} />
          </sprite>
          {/* An invisible ball to click on */}
          <mesh position={shape.center} {...click}>
            <sphereGeometry args={[shape.radius, 16, 16]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
          {selected && (
            <mesh position={shape.center} rotation-x={-Math.PI / 2}>
              <ringGeometry args={[shape.radius * 0.97, shape.radius, 64]} />
              <meshBasicMaterial color={region.color} side={DoubleSide} transparent opacity={0.9} />
            </mesh>
          )}
        </>
      )}
      <Html center position={label} zIndexRange={[10, 0]} style={{ pointerEvents: onSelect ? 'auto' : 'none' }}>
        {onSelect ? (
          <button type="button" className={`region-label is-button${selected ? ' is-selected' : ''}`} style={{ color: region.color }} onClick={onSelect}>
            {region.name}
          </button>
        ) : (
          <span className="region-label" style={{ color: region.color }}>{region.name}</span>
        )}
      </Html>
    </group>
  );
}

// ---------- Places ----------

interface MarkerProps {
  place: Place & { position: Vec3 };
  selected: boolean;
  highlighted: boolean;
  /** Clicking it opens another map */
  opensMap: boolean;
  /** The theme's accent colour, for the selected marker and its ring */
  accent: string;
  interactive: boolean;
  dimmed: boolean;
  onSelect: (id: string) => void;
}

function PlaceMarker({ place, selected, highlighted, opensMap, accent, interactive, dimmed, onSelect }: MarkerProps) {
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
        <meshBasicMaterial color={selected ? accent : '#f2eee4'} transparent opacity={dimmed ? 0.45 : 1} />
      </mesh>
      {active && (
        <mesh rotation-x={-Math.PI / 2}>
          <ringGeometry args={[2.6, 3.2, 48]} />
          <meshBasicMaterial color={accent} transparent opacity={0.85} side={DoubleSide} />
        </mesh>
      )}
      {/* <Html> places normal DOM elements at a 3D position */}
      <Html center position={[0, 4.5, 0]} zIndexRange={[20, 0]} style={{ pointerEvents: interactive ? 'auto' : 'none' }}>
        <button
          type="button" // the map can sit inside a <form>; don't let labels submit it
          className={`map-label${selected ? ' is-selected' : ''}${highlighted ? ' is-highlighted' : ''}${opensMap ? ' opens-map' : ''}${dimmed ? ' is-dimmed' : ''}`}
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

function PickedMarker({ position, accent }: { position: Vec3; accent: string }) {
  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[1.8, 16, 16]} />
        <meshBasicMaterial color={accent} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2}>
        <ringGeometry args={[3, 3.6, 48]} />
        <meshBasicMaterial color={accent} side={DoubleSide} />
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
