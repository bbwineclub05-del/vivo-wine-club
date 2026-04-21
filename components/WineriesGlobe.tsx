'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export interface Winery {
  id: number;
  name: string;
  region: string;
  country: string;
  lat: number;
  lng: number;
  description: string;
  visited: string;
  highlights: string[];
}

interface WineriesGlobeProps {
  wineries: Winery[];
  onSelect: (winery: Winery | null) => void;
  selected: Winery | null;
}

/* ── European wine region markers (decorative, non-interactive) ── */
const REGION_MARKERS = [
  { name: 'Bordeaux',         lat: 44.80,  lng: -0.57 },
  { name: 'Bourgogne',        lat: 47.05,  lng:  4.85 },
  { name: 'Champagne',        lat: 49.05,  lng:  3.93 },
  { name: 'Porto',            lat: 41.15,  lng: -8.61 },
  { name: 'Barolo/Barbaresco',lat: 44.61,  lng:  8.01 },
  { name: 'Franciacorta',     lat: 45.65,  lng: 10.00 },
];

function latLngToVec3(lat: number, lng: number, r: number): THREE.Vector3 {
  const phi   = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
     r * Math.cos(phi),
     r * Math.sin(phi) * Math.sin(theta)
  );
}

/* Camera position that faces Europe (lat≈48, lng≈10) */
function europeCamera(r: number): THREE.Vector3 {
  return latLngToVec3(48, 10, r);
}

export default function WineriesGlobe({ wineries, onSelect, selected }: WineriesGlobeProps) {
  const mountRef    = useRef<HTMLDivElement>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const selectedRef = useRef(selected);
  selectedRef.current = selected;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    /* ── Renderer ── */
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    /* ── Scene ── */
    const scene = new THREE.Scene();

    /* ── Camera — pointed at Europe ── */
    const camera = new THREE.PerspectiveCamera(42, mount.clientWidth / mount.clientHeight, 0.1, 100);
    const camPos = europeCamera(2.6);
    camera.position.copy(camPos);
    camera.lookAt(0, 0, 0);

    /* ── Lights ── */
    scene.add(new THREE.AmbientLight(0xffffff, 0.35));
    const sunLight = new THREE.DirectionalLight(0xfff4e0, 1.6);
    sunLight.position.set(4, 3, 5);
    scene.add(sunLight);
    const fillLight = new THREE.DirectionalLight(0x0a1a3a, 0.5);
    fillLight.position.set(-4, -2, -5);
    scene.add(fillLight);

    /* ── Stars ── */
    const starGeo = new THREE.BufferGeometry();
    const starCount = 3000;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i++) starPos[i] = (Math.random() - 0.5) * 60;
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.035, sizeAttenuation: true })));

    /* ── Earth — texture + higher resolution ── */
    const earthGeo = new THREE.SphereGeometry(1, 96, 96);
    const earthMat = new THREE.MeshPhongMaterial({
      color: new THREE.Color(0x2a3a5a),
      emissive: new THREE.Color(0x050d1a),
      shininess: 22,
      specular: new THREE.Color(0x334466),
    });
    const earth = new THREE.Mesh(earthGeo, earthMat);
    scene.add(earth);

    /* Load texture asynchronously — renders cleanly before texture arrives */
    const texLoader = new THREE.TextureLoader();
    texLoader.load(
      'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg',
      (tex) => {
        earthMat.map = tex;
        earthMat.color.set(0xffffff);
        earthMat.emissive.set(0x050810);
        earthMat.needsUpdate = true;
      }
    );

    /* ── Lat/Lng grid lines (subtle) ── */
    const lineMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.05 });
    const gridGroup = new THREE.Group();
    for (let lat = -75; lat <= 75; lat += 30) {
      const pts: THREE.Vector3[] = [];
      for (let lng = 0; lng <= 360; lng += 2) pts.push(latLngToVec3(lat, lng - 180, 1.001));
      gridGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMat));
    }
    for (let lng = 0; lng < 360; lng += 30) {
      const pts: THREE.Vector3[] = [];
      for (let lat = -90; lat <= 90; lat += 2) pts.push(latLngToVec3(lat, lng, 1.001));
      gridGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMat));
    }
    scene.add(gridGroup);

    /* ── Atmosphere — dual-layer: blue outer + warm inner ── */
    const makeAtmos = (radius: number, r: number, g: number, b: number, power: number, opacity: number) => {
      const mat = new THREE.ShaderMaterial({
        vertexShader: `
          varying vec3 vNormal;
          void main(){
            vNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          varying vec3 vNormal;
          void main(){
            float i = pow(${opacity.toFixed(2)} - dot(vNormal, vec3(0,0,1.0)), ${power.toFixed(1)});
            gl_FragColor = vec4(${r.toFixed(2)}, ${g.toFixed(2)}, ${b.toFixed(2)}, 1.0) * i;
          }
        `,
        side: THREE.BackSide,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      scene.add(new THREE.Mesh(new THREE.SphereGeometry(radius, 64, 64), mat));
    };
    makeAtmos(1.10, 0.20, 0.45, 0.90, 4.0, 0.72); // blue halo
    makeAtmos(1.06, 0.80, 0.30, 0.10, 5.5, 0.68); // warm edge glow

    /* ── Winery markers (interactive) ── */
    const markerMeshes: THREE.Mesh[] = [];
    const glowMeshes:  THREE.Mesh[] = [];
    const markerGroup = new THREE.Group();

    wineries.forEach((w) => {
      const pos = latLngToVec3(w.lat, w.lng, 1.018);

      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(0.018, 12, 12),
        new THREE.MeshBasicMaterial({ color: 0xc9a84c })
      );
      dot.position.copy(pos);
      dot.userData = w;
      markerGroup.add(dot);
      markerMeshes.push(dot);

      const glow = new THREE.Mesh(
        new THREE.SphereGeometry(0.034, 12, 12),
        new THREE.MeshBasicMaterial({ color: 0xc9a84c, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false })
      );
      glow.position.copy(pos);
      markerGroup.add(glow);
      glowMeshes.push(glow);
    });
    scene.add(markerGroup);

    /* ── European wine region markers (decorative, pulsing rings) ── */
    const regionMeshes: THREE.Mesh[] = [];
    const regionGlows:  THREE.Mesh[] = [];
    const regionGroup = new THREE.Group();

    REGION_MARKERS.forEach((r) => {
      const pos  = latLngToVec3(r.lat, r.lng, 1.018);
      const outward = pos.clone().normalize();

      /* Core dot — slightly larger than winery markers */
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(0.022, 12, 12),
        new THREE.MeshBasicMaterial({ color: 0xffd060 })
      );
      dot.position.copy(pos);
      regionGroup.add(dot);
      regionMeshes.push(dot);

      /* Large halo ring — oriented perpendicular to the outward direction */
      const ringGeo = new THREE.TorusGeometry(0.05, 0.005, 8, 32);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0xffd060, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.copy(pos);
      /* Align ring normal to outward direction */
      ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), outward);
      regionGroup.add(ring);
      regionGlows.push(ring);
    });
    scene.add(regionGroup);

    /* ── OrbitControls ── */
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping   = true;
    controls.dampingFactor   = 0.06;
    controls.autoRotate      = true;
    controls.autoRotateSpeed = 0.4;
    controls.enablePan       = false;
    controls.minDistance     = 1.6;
    controls.maxDistance     = 4.5;

    let resumeTimer: ReturnType<typeof setTimeout>;
    controls.addEventListener('start', () => { controls.autoRotate = false; clearTimeout(resumeTimer); });
    controls.addEventListener('end',   () => { resumeTimer = setTimeout(() => { controls.autoRotate = true; }, 2500); });

    /* ── Raycaster ── */
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let hoveredMesh: THREE.Mesh | null = null;

    const onMove = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
      mouse.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(markerMeshes);
      if (hits.length) {
        renderer.domElement.style.cursor = 'pointer';
        const hit = hits[0].object as THREE.Mesh;
        if (hoveredMesh !== hit) {
          if (hoveredMesh) (hoveredMesh.material as THREE.MeshBasicMaterial).color.set(0xc9a84c);
          hoveredMesh = hit;
          (hoveredMesh.material as THREE.MeshBasicMaterial).color.set(0xff9966);
        }
      } else {
        renderer.domElement.style.cursor = 'default';
        if (hoveredMesh) {
          const isSel = selectedRef.current?.id === hoveredMesh.userData.id;
          (hoveredMesh.material as THREE.MeshBasicMaterial).color.set(isSel ? 0xffd700 : 0xc9a84c);
          hoveredMesh = null;
        }
      }
    };

    const onClick = () => {
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(markerMeshes);
      if (hits.length) {
        const w = hits[0].object.userData as Winery;
        onSelectRef.current(selectedRef.current?.id === w.id ? null : w);
      }
    };

    renderer.domElement.addEventListener('mousemove', onMove);
    renderer.domElement.addEventListener('click', onClick);

    /* ── Animation loop ── */
    const clock = new THREE.Clock();
    let rafId: number;

    const animate = () => {
      rafId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      /* Pulse winery markers */
      markerMeshes.forEach((m, i) => {
        const isSel = selectedRef.current?.id === (m.userData as Winery).id;
        m.scale.setScalar(1 + Math.sin(t * 2.2 + i * 0.8) * (isSel ? 0.3 : 0.12));
        if (isSel) (m.material as THREE.MeshBasicMaterial).color.set(0xffd700);
      });
      glowMeshes.forEach((g, i) => {
        g.scale.setScalar(1 + Math.sin(t * 1.8 + i * 0.8) * 0.25);
      });

      /* Pulse region markers */
      regionMeshes.forEach((m, i) => {
        m.scale.setScalar(1 + Math.sin(t * 1.5 + i * 1.1) * 0.2);
      });
      regionGlows.forEach((g, i) => {
        const s = 1 + Math.sin(t * 1.2 + i * 1.0) * 0.35;
        g.scale.setScalar(s);
        (g.material as THREE.MeshBasicMaterial).opacity = 0.20 + Math.sin(t * 1.2 + i) * 0.15;
      });

      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    /* ── Resize ── */
    const onResize = () => {
      if (!mount) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener('resize', onResize);

    return () => {
      clearTimeout(resumeTimer);
      cancelAnimationFrame(rafId);
      renderer.domElement.removeEventListener('mousemove', onMove);
      renderer.domElement.removeEventListener('click', onClick);
      window.removeEventListener('resize', onResize);
      controls.dispose();
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wineries]);

  return <div ref={mountRef} className="w-full h-full" />;
}
