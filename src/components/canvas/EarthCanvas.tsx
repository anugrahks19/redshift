import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { generateEarthTextures } from './earthTextures';

interface EarthCanvasProps {
  scrollY: number;
}

export const EarthCanvas: React.FC<EarthCanvasProps> = ({ scrollY }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const earthGroupRef = useRef<THREE.Group | null>(null);
  const earthMeshRef = useRef<THREE.Mesh | null>(null);
  const cloudsMeshRef = useRef<THREE.Mesh | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const animFrameIdRef = useRef<number>(0);

  // Mouse interaction state for manual orbit drag
  const isDraggingRef = useRef(false);
  const previousMousePositionRef = useRef({ x: 0, y: 0 });
  const userRotationRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
    camera.position.set(0, 0, 7.2);
    cameraRef.current = camera;

    // 2. High-Performance WebGL Renderer
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 3. Lighting (Directional Sun Key Light + Soft Space Fill)
    const sunLight = new THREE.DirectionalLight(0xffffff, 2.8);
    sunLight.position.set(6, 2.5, 4.5);
    scene.add(sunLight);

    const ambientLight = new THREE.AmbientLight(0x061122, 0.5);
    scene.add(ambientLight);

    // Subtle blue rim light from the edge of space
    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.8);
    rimLight.position.set(-6, -2, -3);
    scene.add(rimLight);

    // 4. Generate Procedural Textures
    const { dayTexture, nightTexture, specTexture, cloudTexture } = generateEarthTextures();

    // 5. Earth Master Group with 23.4° Axial Tilt
    const earthGroup = new THREE.Group();
    earthGroup.rotation.z = (23.4 * Math.PI) / 180; // True axial tilt
    scene.add(earthGroup);
    earthGroupRef.current = earthGroup;

    // Earth Base Sphere
    const earthGeo = new THREE.SphereGeometry(2.35, 96, 96);
    const earthMat = new THREE.MeshStandardMaterial({
      map: dayTexture,
      roughnessMap: specTexture,
      roughness: 0.45,
      metalness: 0.08,
      emissiveMap: nightTexture,
      emissive: new THREE.Color(0xffe8c2),
      emissiveIntensity: 1.15,
    });
    const earthMesh = new THREE.Mesh(earthGeo, earthMat);
    earthGroup.add(earthMesh);
    earthMeshRef.current = earthMesh;

    // 6. Rotating Cloud Layer (Radius slightly above ground)
    const cloudGeo = new THREE.SphereGeometry(2.385, 80, 80);
    const cloudMat = new THREE.MeshStandardMaterial({
      map: cloudTexture,
      transparent: true,
      opacity: 0.72,
      blending: THREE.NormalBlending,
      roughness: 0.9,
    });
    const cloudsMesh = new THREE.Mesh(cloudGeo, cloudMat);
    earthGroup.add(cloudsMesh);
    cloudsMeshRef.current = cloudsMesh;

    // 7. Atmospheric Fresnel Glow (Cyan / Azure Limb Envelope)
    const atmosGeo = new THREE.SphereGeometry(2.47, 64, 64);
    const atmosMat = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        void main() {
          // Fresnel effect: intense at silhouette edges, transparent in center
          float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.8);
          vec3 atmosphericColor = vec3(0.22, 0.74, 0.97); // Radiant Cyan #38bdf8
          gl_FragColor = vec4(atmosphericColor, intensity * 0.75);
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
    });
    const atmosMesh = new THREE.Mesh(atmosGeo, atmosMat);
    earthGroup.add(atmosMesh);

    // 8. Distant Deep Space Starfield (2,000 Stars)
    const starCount = 2000;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
      const radius = 35 + Math.random() * 50;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      starPositions[i] = radius * Math.sin(phi) * Math.cos(theta);
      starPositions[i + 1] = radius * Math.sin(phi) * Math.sin(theta);
      starPositions[i + 2] = radius * Math.cos(phi);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({
      size: 0.12,
      color: 0x94a3b8,
      transparent: true,
      opacity: 0.65,
    });
    const starField = new THREE.Points(starGeo, starMat);
    scene.add(starField);

    // 9. Interactive Drag / Orbit Handlers
    const onMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = true;
      previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const deltaX = e.clientX - previousMousePositionRef.current.x;
      const deltaY = e.clientY - previousMousePositionRef.current.y;

      userRotationRef.current.y += deltaX * 0.005;
      userRotationRef.current.x += deltaY * 0.005;

      previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
    };

    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    // Touch support for mobile
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        isDraggingRef.current = true;
        previousMousePositionRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!isDraggingRef.current || e.touches.length !== 1) return;
      const deltaX = e.touches[0].clientX - previousMousePositionRef.current.x;
      const deltaY = e.touches[0].clientY - previousMousePositionRef.current.y;
      userRotationRef.current.y += deltaX * 0.007;
      userRotationRef.current.x += deltaY * 0.007;
      previousMousePositionRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };
    const onTouchEnd = () => {
      isDraggingRef.current = false;
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);

    // 10. Resize Handler
    const onResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // 11. Render Animation Loop
    let clock = new THREE.Clock();

    const animate = () => {
      animFrameIdRef.current = requestAnimationFrame(animate);
      const delta = clock.getDelta();

      // Earth autonomous revolving on its axis
      if (earthMeshRef.current) {
        earthMeshRef.current.rotation.y += delta * 0.08 + userRotationRef.current.y * 0.04;
        earthMeshRef.current.rotation.x = userRotationRef.current.x * 0.4;
      }

      // Clouds rotate slightly faster for atmospheric drift
      if (cloudsMeshRef.current) {
        cloudsMeshRef.current.rotation.y += delta * 0.095 + userRotationRef.current.y * 0.04;
        cloudsMeshRef.current.rotation.x = userRotationRef.current.x * 0.4;
      }

      // Dampen manual drag rotation
      userRotationRef.current.x *= 0.94;
      userRotationRef.current.y *= 0.94;

      renderer.render(scene, camera);
    };

    animate();

    // 12. Cleanup
    return () => {
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(animFrameIdRef.current);

      earthGeo.dispose();
      earthMat.dispose();
      cloudGeo.dispose();
      cloudMat.dispose();
      atmosGeo.dispose();
      atmosMat.dispose();
      starGeo.dispose();
      starMat.dispose();

      dayTexture.dispose();
      nightTexture.dispose();
      specTexture.dispose();
      cloudTexture.dispose();

      if (rendererRef.current && rendererRef.current.domElement) {
        container.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }
    };
  }, []);

  // Scroll effect on the camera position and rotation:
  // As the user scrolls down into the dark, the camera shifts subtly, creating cinematic depth
  useEffect(() => {
    if (!cameraRef.current || !earthGroupRef.current) return;
    const progress = Math.min(1.0, scrollY / 1200);

    // Subtle upward drift of the Earth as dark fills below
    earthGroupRef.current.position.y = progress * 0.8;
    cameraRef.current.position.z = 7.2 + progress * 1.5;
  }, [scrollY]);

  return (
    <div
      ref={mountRef}
      className="fixed inset-0 z-0 overflow-hidden pointer-events-auto cursor-grab active:cursor-grabbing"
      aria-label="Interactive 3D revolving Earth"
    />
  );
};

