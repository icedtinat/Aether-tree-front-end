import React, { useMemo, useRef } from 'react';
import { useFrame, extend } from '@react-three/fiber';
import { useSpring, animated } from '@react-spring/three';
import * as THREE from 'three';
import { shaderMaterial } from '@react-three/drei';
import { useWishStore } from '../store';

// --------------------------------------------------------
// 1. HELPER FUNCTIONS (Texture Atlas Generation)
// --------------------------------------------------------

const getUniqueWords = (text: string) => {
  const cleanText = text.replace(/[.,;，,。 \n\t]/g, ' ');
  const words = cleanText.split(' ').filter(w => w.length > 0);
  return [...new Set(words)];
};

const createWordTextureAtlas = (words: string[]) => {
  if (typeof document === 'undefined') return { texture: new THREE.Texture(), cols: 1, rows: 1 };
  
  if (words.length === 0) return { texture: new THREE.Texture(), cols: 1, rows: 1 };

  const count = words.length;
  const cols = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);
  
  const canvas = document.createElement('canvas');
  const size = 1024; 
  canvas.width = size;
  canvas.height = size;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return { texture: new THREE.Texture(), cols: 1, rows: 1 };

  ctx.clearRect(0, 0, size, size);
  
  const cellWidth = size / cols;
  const cellHeight = size / rows;
  
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  
  words.forEach((word, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    
    const centerX = col * cellWidth + cellWidth / 2;
    const centerY = row * cellHeight + cellHeight / 2;
    
    let fontSize = cellHeight * 0.6; 
    ctx.font = `bold ${fontSize}px "Microsoft YaHei", "Arial", sans-serif`;
    
    const metrics = ctx.measureText(word);
    const textWidth = metrics.width;
    const maxWidth = cellWidth * 0.9;
    
    if (textWidth > maxWidth) {
      fontSize = fontSize * (maxWidth / textWidth);
      ctx.font = `bold ${fontSize}px "Microsoft YaHei", "Arial", sans-serif`;
    }
    
    ctx.fillText(word, centerX, centerY);
  });
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  
  return { texture, cols, rows };
};

// --------------------------------------------------------
// 2. CUSTOM SHADER MATERIAL
// --------------------------------------------------------

const ParticleShaderMaterial = shaderMaterial(
  {
    uTime: 0,
    uColorTop: new THREE.Color('#FFD700'), // Fixed: Gold/Yellow
    uColorBottom: new THREE.Color('#FFFFFF'), // Fixed: White
    uPixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio : 2.0,
    uSize: 80.0,
    uTexture: null,
    uAtlasGrid: new THREE.Vector2(1, 1),
    uFocus: 0.0, // New uniform: 0.0 (unfocused) -> 1.0 (focused)
  },
  // Vertex Shader
  `
    uniform float uTime;
    uniform float uPixelRatio;
    uniform float uSize;
    uniform float uFocus; // Controls density
    
    attribute float aScale;
    attribute vec3 aColor;
    attribute vec3 aRandom;
    attribute float aWordIndex;
    
    varying vec3 vColor;
    varying float vWordIndex;
    varying float vScale;
    
    void main() {
      vColor = aColor;
      vWordIndex = aWordIndex;
      vScale = aScale;

      // CULLING LOGIC:
      // If uFocus is high (zoomed in), we want LESS density.
      // So if uFocus -> 1.0, we want to hide more particles.
      // Let's hide 70% of particles when focused.
      // aRandom.x is 0..1.
      // mix(1.0, 0.3, uFocus) means:
      // unfocused (0.0): threshold = 1.0 (allow all)
      // focused (1.0): threshold = 0.3 (allow only 30%)
      
      float densityThreshold = mix(1.0, 0.3, uFocus);
      if (aRandom.x > densityThreshold) {
        vScale = 0.0; // Hide particle
      }
      
      vec3 pos = position;
      
      // ORGANIC MOVEMENT
      float time = uTime * 0.5;
      
      // Wiggling
      pos.x += sin(time + pos.y * 2.0 + aRandom.x) * 0.1;
      pos.y += cos(time + pos.x * 2.0 + aRandom.y) * 0.1;
      pos.z += sin(time + pos.z * 2.0 + aRandom.z) * 0.1;
      
      // Breathing
      float breath = sin(time * 0.5) * 0.1;
      pos += normal * breath;

      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      gl_Position = projectionMatrix * mvPosition;
      
      // Apply vScale which might be 0
      gl_PointSize = uSize * aScale * vScale * uPixelRatio * (1.0 / -mvPosition.z);
    }
  `,
  // Fragment Shader
  `
    uniform sampler2D uTexture;
    uniform vec2 uAtlasGrid;
    uniform vec3 uColorTop;
    uniform vec3 uColorBottom;
    
    varying vec3 vColor;
    varying float vWordIndex;
    varying float vScale; // passed from vertex to ensure 0-scale pixels are discarded
    
    void main() {
      if (vScale <= 0.01) discard;

      vec2 uv = gl_PointCoord;
      uv.y = 1.0 - uv.y; 
      
      float cols = uAtlasGrid.x;
      float rows = uAtlasGrid.y;
      
      float index = floor(vWordIndex + 0.5);
      float colIndex = mod(index, cols);
      float rowIndex = floor(index / cols);
      
      vec2 atlasUV = vec2(
        (colIndex + uv.x) / cols,
        1.0 - (rowIndex + 1.0 - uv.y) / rows
      );
      
      vec4 texColor = texture2D(uTexture, atlasUV);
      
      if (texColor.a < 0.3) discard;
      
      gl_FragColor = vec4(vColor, texColor.a);
    }
  `
);

extend({ ParticleShaderMaterial });

// --------------------------------------------------------
// 3. COMPONENT
// --------------------------------------------------------

interface WishSphereProps {
  id: string;
  text: string;
  color: string;
  position: [number, number, number];
}

export const WishSphere: React.FC<WishSphereProps> = ({ id, text, color, position }) => {
  const materialRef = useRef<THREE.ShaderMaterial & { uTime: number; uFocus: number }>(null!);
  const pointsRef = useRef<THREE.Points>(null!);
  const { setFocusedWishId, focusedWishId } = useWishStore(state => ({
    setFocusedWishId: state.setFocusedWishId,
    focusedWishId: state.focusedWishId
  }));
  
  const isFocused = focusedWishId === id;

  // Animation: Trajectory
  const { pos } = useSpring({
    from: { pos: [0, 15, 30] },
    to: { pos: position },
    config: { mass: 2, tension: 50, friction: 15 },
    delay: 100,
  });

  // Data Generation (Memoized)
  const uniqueWords = useMemo(() => getUniqueWords(text), [text]);
  const { texture, cols, rows } = useMemo(() => createWordTextureAtlas(uniqueWords), [uniqueWords]);
  const atlasGrid = useMemo(() => new THREE.Vector2(cols, rows), [cols, rows]);

  const { positions, colors, randoms, scales, wordIndexes } = useMemo(() => {
    const count = 2000; 
    const radius = 0.6; 

    const positions = [];
    const colors = [];
    const randoms = [];
    const scales = [];
    const wordIndexes = [];
    
    // Use Hardcoded Yellow -> White colors for particles regardless of wish color prop
    const cTop = new THREE.Color('#FFD700'); 
    const cBottom = new THREE.Color('#FFFFFF'); 
    const tempColor = new THREE.Color();

    for (let i = 0; i < count; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      
      const r = radius * (0.8 + Math.random() * 0.4); 

      let x = r * Math.sin(phi) * Math.cos(theta);
      let y = r * Math.cos(phi);
      let z = r * Math.sin(phi) * Math.sin(theta);
      
      positions.push(x, y, z);
      
      // Color Gradient based on Y
      const normalizedY = y / radius; 
      const t = (normalizedY + 1) / 2;
      tempColor.copy(cBottom).lerp(cTop, t);
      colors.push(tempColor.r, tempColor.g, tempColor.b);

      randoms.push(Math.random(), Math.random(), Math.random());
      
      scales.push(0.5 + Math.random() * 1.0);
      
      const wIdx = Math.floor(Math.random() * uniqueWords.length);
      wordIndexes.push(wIdx);
    }

    return {
      positions: new Float32Array(positions),
      colors: new Float32Array(colors),
      randoms: new Float32Array(randoms),
      scales: new Float32Array(scales),
      wordIndexes: new Float32Array(wordIndexes)
    };
  }, [text, uniqueWords]);

  useFrame((state, delta) => {
    if (materialRef.current) {
      materialRef.current.uTime = state.clock.elapsedTime;
      
      // Animate uFocus
      // 1.0 if focused, 0.0 if not
      const targetFocus = isFocused ? 1.0 : 0.0;
      const currentFocus = materialRef.current.uFocus;
      // Smooth interpolation
      materialRef.current.uFocus += (targetFocus - currentFocus) * delta * 2.0;
    }
    if (pointsRef.current) {
      pointsRef.current.rotation.y += delta * 0.2; 
      
      const currentPos = pos.get() as [number, number, number];
      pointsRef.current.position.set(currentPos[0], currentPos[1], currentPos[2]);
    }
  });

  return (
    <animated.points 
      ref={pointsRef} 
      onDoubleClick={(e) => {
        e.stopPropagation();
        setFocusedWishId(id);
      }}
      onPointerOver={() => document.body.style.cursor = 'pointer'}
      onPointerOut={() => document.body.style.cursor = 'auto'}
    >
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-aColor" count={colors.length / 3} array={colors} itemSize={3} />
        <bufferAttribute attach="attributes-aRandom" count={randoms.length / 3} array={randoms} itemSize={3} />
        <bufferAttribute attach="attributes-aScale" count={scales.length} array={scales} itemSize={1} />
        <bufferAttribute attach="attributes-aWordIndex" count={wordIndexes.length} array={wordIndexes} itemSize={1} />
      </bufferGeometry>
      {/* @ts-ignore */}
      <particleShaderMaterial
        ref={materialRef}
        uTexture={texture}
        uAtlasGrid={atlasGrid}
        uColorTop={new THREE.Color('#FFD700')}
        uColorBottom={new THREE.Color('#FFFFFF')}
        transparent={true}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </animated.points>
  );
};