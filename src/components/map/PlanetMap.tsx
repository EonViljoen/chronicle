import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { CameraControls, CameraControlsImpl, Html, Stars, useTexture } from '@react-three/drei';
import { AdditiveBlending, BackSide, CanvasTexture, Color, DoubleSide, SRGBColorSpace, Vector3, type DirectionalLight } from 'three';
import type { FlatMap, Place } from '../../types/timeline';
import type { RegionView } from '../../lib/regions';
import { regionAt } from '../../lib/regions';
import { defaultLook, generateClouds, pinToSphere } from '../../lib/planets';
import { useThemePalette } from '../../themes/palette';

/*
 * A planet: the map's picture wrapped round a globe, with its places pinned
 * by latitude and longitude (see lib/planets.ts), its regions painted on,
 * and an atmosphere, clouds and rings as set in the Maps tab. Drag to turn
 * it, scroll to zoom; it turns to face the selected place.
 *
 * Loaded lazily with three.js, like GalaxyMap (see LazyGalaxyMap.ts).
 */

type Pin = [number, number];
type Vec3 = [number, number, number];

interface Props {
  map: FlatMap;
  places: Place[];
  selectedPlaceId?: string | null;
  highlightIds?: string[];
  openIds?: string[];
  onSelectPlace?: (id: string) => void;
  /** Placement mode for the editor: click the globe to set a position. */
  pick?: { pin: Pin | null; onPick: (pin: Pin) => void };
  regions?: RegionView[];
  selectedRegionId?: string | null;
  onSelectRegion?: (id: string) => void;
}

/** How far the camera rests from the centre (the planet's radius is 1). */
const DISTANCE = 3.1;
const spaceColor = (bg: string) => `#${new Color(bg).lerp(new Color('#05050a'), 0.8).getHexString()}`;

export default function PlanetMap({ map, places, selectedPlaceId, highlightIds = [], openIds = [], onSelectPlace, pick, regions = [], selectedRegionId, onSelectRegion }: Props) {
  const look = map.planet ?? defaultLook();
  const palette = useThemePalette();
  const [resetCount, setResetCount] = useState(0);
  const pinned = places.flatMap((p) => {
    const pin = p.pins?.[map.id];
    return pin ? [{ ...p, pin }] : [];
  });
  const selected = pinned.find((p) => p.id === selectedPlaceId);
  // Turn to face: the pin being placed, else the selected place, else the selected region
  const focus = pick?.pin ?? selected?.pin ?? regions.find((r) => r.id === selectedRegionId)?.label ?? null;
  const atmosphere = look.atmosphere === 'none' ? null : look.atmosphere === 'theme' ? palette.accent : look.atmosphere;

  // Every label (pins and region names) hides when it's round the back of the globe
  const labels = useRef(new Map<string, { el: HTMLElement; normal: Vector3 }>());
  const track = (key: string, position: Vec3) => (el: HTMLElement | null) => {
    if (el) labels.current.set(key, { el, normal: new Vector3(...position).normalize() });
    else labels.current.delete(key);
  };

  function clickGlobe(e: ThreeEvent<MouseEvent>) {
    if (e.delta > 4 || !e.uv) return; // a drag that turned the globe
    e.stopPropagation();
    const point: Pin = [round(e.uv.x), round(1 - e.uv.y)];
    if (pick) pick.onPick(point);
    else {
      const hit = regionAt(point, regions);
      if (hit) onSelectRegion?.(hit.id);
    }
  }

  return (
    <div className={`galaxy-map planet-map${pick ? ' is-picking' : ''}`}>
      <Canvas camera={{ position: [0, 0.8, DISTANCE], fov: 45, near: 0.05, far: 500 }} dpr={[1, 2]}>
        <color attach="background" args={[spaceColor(palette.bg)]} />
        <Stars radius={120} depth={60} count={3000} factor={4} fade speed={0.3} />
        <ambientLight intensity={1.1} />
        <CameraLight />

        {/* Everything waits for the surface picture, so the glow never shows round an empty globe */}
        <Suspense fallback={null}>
          <Surface image={map.image} onClick={clickGlobe} />
          {regions.length > 0 && <RegionPaint regions={regions} selectedId={selectedRegionId ?? null} />}
          {look.clouds && <Clouds seed={look.generated?.seed ?? hashId(map.id)} />}
          {atmosphere && <Atmosphere color={atmosphere} />}
          {look.rings && <Rings color={look.ringColor} />}
        </Suspense>

        {pinned.map((p) => {
          const position = pinToSphere(p.pin, 1.002);
          return (
            <Html key={p.id} position={position} zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
              <span ref={track(`p:${p.id}`, position)} className="flat-anchor planet-anchor">
                <button
                  type="button"
                  className={[
                    'map-label',
                    'flat-pin',
                    p.id === selectedPlaceId && 'is-selected',
                    highlightIds.includes(p.id) && 'is-highlighted',
                    openIds.includes(p.id) && 'opens-map',
                    pick && 'is-dimmed',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => !pick && onSelectPlace?.(p.id)}
                  disabled={!!pick}
                >
                  {p.name}
                </button>
              </span>
            </Html>
          );
        })}
        {regions.map((r) => {
          if (r.shape.type !== 'polygon' || r.shape.points.length < 3) return null;
          const position = pinToSphere(r.label, 1.002);
          return (
            <Html key={r.id} position={position} zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
              <span ref={track(`r:${r.id}`, position)} className="flat-anchor planet-anchor">
                <span className="region-label" style={{ color: r.color }}>{r.name}</span>
              </span>
            </Html>
          );
        })}
        {pick?.pin && (
          <Html position={pinToSphere(pick.pin, 1.002)} style={{ pointerEvents: 'none' }}>
            <span ref={track('pick', pinToSphere(pick.pin))} className="flat-anchor">
              <span className="flat-pick-marker" aria-hidden="true" />
            </span>
          </Html>
        )}

        <HideBackLabels labels={labels} />
        <Orbit focus={focus} resetCount={resetCount} />
      </Canvas>
      <button type="button" className="btn map-reset" onClick={() => setResetCount((n) => n + 1)}>Reset view</button>
    </div>
  );
}

const round = (n: number) => Math.round(n * 10000) / 10000;

/** A steady number from a map id, for its cloud pattern. */
const hashId = (id: string) => [...id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7) & 0xffff;

// ---------- The globe ----------

function Surface({ image, onClick }: { image: string; onClick: (e: ThreeEvent<MouseEvent>) => void }) {
  const texture = useTexture(image);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  return (
    <mesh onClick={onClick}>
      <sphereGeometry args={[1, 128, 64]} />
      <meshStandardMaterial map={texture} roughness={1} metalness={0} />
    </mesh>
  );
}

/** A light that follows the camera, so the side you're looking at is always lit. */
function CameraLight() {
  const light = useRef<DirectionalLight>(null);
  useFrame(({ camera }) => {
    light.current?.position.copy(camera.position).add(new Vector3(1.5, 1.5, 0));
  });
  return <directionalLight ref={light} intensity={1.8} />;
}

/** The regions, painted onto a transparent shell just above the surface. */
function RegionPaint({ regions, selectedId }: { regions: RegionView[]; selectedId: string | null }) {
  const key = JSON.stringify([regions, selectedId]);
  const texture = useMemo(() => {
    const [list, selected] = JSON.parse(key) as [RegionView[], string | null];
    const w = 2048;
    const h = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.lineJoin = 'round';
    for (const r of list) {
      if (r.shape.type !== 'polygon' || r.shape.points.length < 3) continue;
      ctx.beginPath();
      r.shape.points.forEach(([x, y], i) => (i ? ctx.lineTo(x * w, y * h) : ctx.moveTo(x * w, y * h)));
      ctx.closePath();
      ctx.globalAlpha = r.fill;
      ctx.fillStyle = r.color;
      ctx.fill();
      ctx.globalAlpha = 0.95;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = r.id === selected ? 7 : 4;
      ctx.setLineDash(r.id === selected ? [18, 10] : []);
      ctx.stroke();
    }
    const t = new CanvasTexture(canvas);
    t.colorSpace = SRGBColorSpace;
    return t;
  }, [key]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <mesh raycast={() => null}>
      <sphereGeometry args={[1.003, 128, 64]} />
      <meshStandardMaterial map={texture} transparent depthWrite={false} roughness={1} />
    </mesh>
  );
}

function Clouds({ seed }: { seed: number }) {
  const texture = useMemo(() => new CanvasTexture(generateClouds(seed)), [seed]);
  const mesh = useRef<import('three').Mesh>(null);
  useFrame((_, delta) => {
    if (mesh.current) mesh.current.rotation.y += delta * 0.006;
  });
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <mesh ref={mesh} raycast={() => null}>
      <sphereGeometry args={[1.012, 96, 48]} />
      <meshStandardMaterial map={texture} transparent opacity={0.7} depthWrite={false} roughness={1} />
    </mesh>
  );
}

/** A soft glow round the rim: a slightly bigger sphere, seen from inside, brightest at its edge. */
function Atmosphere({ color }: { color: string }) {
  const uniforms = useMemo(() => ({ glowColor: { value: new Color(color) } }), [color]);
  return (
    <mesh scale={1.12} raycast={() => null}>
      <sphereGeometry args={[1, 64, 32]} />
      <shaderMaterial
        key={color}
        uniforms={uniforms}
        vertexShader={`varying vec3 vNormal;
          void main() { vNormal = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`}
        fragmentShader={`uniform vec3 glowColor; varying vec3 vNormal;
          void main() { float i = pow(max(0.0, 0.72 - dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.6); gl_FragColor = vec4(glowColor, 1.0) * i * 1.1; }`}
        side={BackSide}
        blending={AdditiveBlending}
        transparent
        depthWrite={false}
      />
    </mesh>
  );
}

/** Banded rings, tilted a little. The bands come from the distance to the centre. */
function Rings({ color }: { color: string }) {
  const uniforms = useMemo(() => ({ ringColor: { value: new Color(color) } }), [color]);
  return (
    <mesh rotation={[-Math.PI / 2 + 0.38, 0, 0.12]} raycast={() => null}>
      <ringGeometry args={[1.45, 2.35, 160]} />
      <shaderMaterial
        key={color}
        uniforms={uniforms}
        vertexShader={`varying vec2 vPos; void main() { vPos = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`}
        fragmentShader={`uniform vec3 ringColor; varying vec2 vPos;
          void main() {
            float r = length(vPos);
            float bands = 0.55 + 0.25 * sin(r * 47.0) + 0.2 * sin(r * 131.0);
            float edge = smoothstep(1.45, 1.55, r) * (1.0 - smoothstep(2.2, 2.35, r));
            float gap = 1.0 - 0.85 * smoothstep(0.02, 0.0, abs(r - 1.95));
            gl_FragColor = vec4(ringColor, bands * edge * gap * 0.75);
          }`}
        side={DoubleSide}
        transparent
        depthWrite={false}
      />
    </mesh>
  );
}

// ---------- Labels and camera ----------

/** Each frame, fades out the labels on the far side of the globe. */
function HideBackLabels({ labels }: { labels: React.RefObject<Map<string, { el: HTMLElement; normal: Vector3 }>> }) {
  const toCamera = useMemo(() => new Vector3(), []);
  useFrame(({ camera }) => {
    toCamera.copy(camera.position).normalize();
    for (const { el, normal } of labels.current.values()) {
      const facing = normal.dot(toCamera);
      const hidden = facing < 0.12;
      el.style.opacity = hidden ? '0' : facing < 0.3 ? String((facing - 0.12) / 0.18) : '1';
      el.style.visibility = hidden ? 'hidden' : 'visible';
      // Only labels on the near side can be clicked
      el.style.pointerEvents = hidden ? 'none' : 'auto';
    }
  });
  return null;
}

/** Drag to turn, scroll to zoom; glides round to face the focused pin, or back to the start. */
function Orbit({ focus, resetCount }: { focus: Pin | null; resetCount: number }) {
  const controls = useRef<CameraControlsImpl>(null);
  const focusKey = focus ? focus.join(',') : '';
  // Narrow screens: back off so the whole globe fits across
  const pullBack = useThree((s) => Math.round(Math.min(1.8, Math.max(1, s.size.height / s.size.width)) * 10) / 10);

  useEffect(() => {
    const c = controls.current;
    if (!c) return;
    // Turning only: no panning off the planet
    c.mouseButtons.right = CameraControlsImpl.ACTION.NONE;
    c.touches.two = CameraControlsImpl.ACTION.TOUCH_DOLLY;
    c.touches.three = CameraControlsImpl.ACTION.NONE;
  }, []);

  useEffect(() => {
    const c = controls.current;
    if (!c) return;
    const d = DISTANCE * pullBack;
    if (!focusKey) {
      c.setLookAt(0, 0.8 * pullBack, d, 0, 0, 0, true);
      return;
    }
    const [x, y, z] = pinToSphere(focusKey.split(',').map(Number) as Pin, d);
    c.setLookAt(x, y, z, 0, 0, 0, true);
    // resetCount isn't read inside, but changing it re-runs the effect
  }, [focusKey, resetCount, pullBack]);

  return <CameraControls ref={controls} makeDefault minDistance={1.35} maxDistance={8} dollySpeed={0.6} />;
}
