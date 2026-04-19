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

function latLngToVec3(lat: number, lng: number, r: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta)
  );
}

export default function WineriesGlobe({ wineries, onSelect, selected }: WineriesGlobeProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const selectedRef = useRef(selected);
  selectedRef.current = selected;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // --- Renderer ---
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    // --- Scene / Camera ---
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      42,
      mount.clientWidth / mount.clientHeight,
      0.1,
      100
    );
    camera.position.z = 2.6;

    // --- Lights ---
    scene.add(new THREE.AmbientLight(0xffffff, 0.25));
    const sunLight = new THREE.DirectionalLight(0xffd9a0, 1.4);
    sunLight.position.set(4, 3, 5);
    scene.add(sunLight);
    const fillLight = new THREE.DirectionalLight(0x2a0e0e, 0.6);
    fillLight.position.set(-4, -2, -5);
    scene.add(fillLight);

    // --- Stars ---
    const starGeo = new THREE.BufferGeometry();
    const starCount = 2500;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i++) {
      starPos[i] = (Math.random() - 0.5) * 60;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    scene.add(
      new THREE.Points(
        starGeo,
        new THREE.PointsMaterial({ color: 0xffffff, size: 0.04, sizeAttenuation: true })
      )
    );

    // --- Earth ---
    const earthGeo = new THREE.SphereGeometry(1, 72, 72);
    const earthMat = new THREE.MeshPhongMaterial({
      color: new THREE.Color(0x0e0808),
      emissive: new THREE.Color(0x180808),
      shininess: 18,
      specular: new THREE.Color(0x5b1a14),
    });
    const earth = new THREE.Mesh(earthGeo, earthMat);
    scene.add(earth);

    // Latitude / longitude grid lines
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x731515,
      transparent: true,
      opacity: 0.14,
    });
    const gridGroup = new THREE.Group();
    // Parallels
    for (let lat = -75; lat <= 75; lat += 30) {
      const pts: THREE.Vector3[] = [];
      for (let lng = 0; lng <= 360; lng += 2) {
        pts.push(latLngToVec3(lat, lng - 180, 1.001));
      }
      gridGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMat));
    }
    // Meridians
    for (let lng = 0; lng < 360; lng += 30) {
      const pts: THREE.Vector3[] = [];
      for (let lat = -90; lat <= 90; lat += 2) {
        pts.push(latLngToVec3(lat, lng, 1.001));
      }
      gridGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMat));
    }
    scene.add(gridGroup);

    // --- Atmosphere ---
    const atmosGeo = new THREE.SphereGeometry(1.12, 64, 64);
    const atmosMat = new THREE.ShaderMaterial({
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
          float i = pow(0.75 - dot(vNormal, vec3(0,0,1.0)), 4.0);
          gl_FragColor = vec4(0.36, 0.10, 0.08, 1.0) * i;
        }
      `,
      side: THREE.BackSide,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    scene.add(new THREE.Mesh(atmosGeo, atmosMat));

    // --- Markers ---
    const markerMeshes: THREE.Mesh[] = [];
    const glowMeshes: THREE.Mesh[] = [];
    const markerGroup = new THREE.Group();

    wineries.forEach((w) => {
      const pos = latLngToVec3(w.lat, w.lng, 1.018);

      // Dot
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(0.018, 10, 10),
        new THREE.MeshBasicMaterial({ color: 0xc9a84c })
      );
      dot.position.copy(pos);
      dot.userData = w;
      markerGroup.add(dot);
      markerMeshes.push(dot);

      // Glow halo
      const glow = new THREE.Mesh(
        new THREE.SphereGeometry(0.034, 10, 10),
        new THREE.MeshBasicMaterial({
          color: 0xc9a84c,
          transparent: true,
          opacity: 0.2,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );
      glow.position.copy(pos);
      markerGroup.add(glow);
      glowMeshes.push(glow);
    });
    scene.add(markerGroup);

    // --- OrbitControls ---
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.45;
    controls.enablePan = false;
    controls.minDistance = 1.6;
    controls.maxDistance = 4.5;

    let resumeTimer: ReturnType<typeof setTimeout>;
    controls.addEventListener('start', () => {
      controls.autoRotate = false;
      clearTimeout(resumeTimer);
    });
    controls.addEventListener('end', () => {
      resumeTimer = setTimeout(() => { controls.autoRotate = true; }, 2500);
    });

    // --- Raycaster ---
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let hoveredMesh: THREE.Mesh | null = null;

    const onMove = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(markerMeshes);

      if (hits.length) {
        renderer.domElement.style.cursor = 'pointer';
        const hit = hits[0].object as THREE.Mesh;
        if (hoveredMesh !== hit) {
          if (hoveredMesh) (hoveredMesh.material as THREE.MeshBasicMaterial).color.set(0xc9a84c);
          hoveredMesh = hit;
          (hoveredMesh.material as THREE.MeshBasicMaterial).color.set(0xff8866);
        }
      } else {
        renderer.domElement.style.cursor = 'default';
        if (hoveredMesh) {
          const isSelected = selectedRef.current?.id === hoveredMesh.userData.id;
          (hoveredMesh.material as THREE.MeshBasicMaterial).color.set(
            isSelected ? 0xffd700 : 0xc9a84c
          );
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

    // --- Animation ---
    const clock = new THREE.Clock();
    let rafId: number;

    const animate = () => {
      rafId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      // Pulse markers
      markerMeshes.forEach((m, i) => {
        const isSelected = selectedRef.current?.id === (m.userData as Winery).id;
        const pulse = 1 + Math.sin(t * 2.2 + i * 0.8) * (isSelected ? 0.3 : 0.12);
        m.scale.setScalar(pulse);
        if (isSelected) {
          (m.material as THREE.MeshBasicMaterial).color.set(0xffd700);
        }
      });
      glowMeshes.forEach((g, i) => {
        const pulse = 1 + Math.sin(t * 1.8 + i * 0.8) * 0.25;
        g.scale.setScalar(pulse);
      });

      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // --- Resize ---
    const onResize = () => {
      if (!mount) return;
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
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
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wineries]);

  return <div ref={mountRef} className="w-full h-full" />;
}
