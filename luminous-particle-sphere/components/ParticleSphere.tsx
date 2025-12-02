import React, { useMemo, useRef } from 'react';
import { useFrame, extend } from '@react-three/fiber';
import * as THREE from 'three';
import { shaderMaterial } from '@react-three/drei';
import { ParticleProps } from '../types';

export const POEM_TEXT = `床前明月光，疑是地上霜，
举头望明月，低头思故乡。`;

// 1. Extract unique words (characters for Chinese)
const getUniqueWords = (text: string) => {
  // Remove punctuation, spaces, newlines using regex
  // Matches: comma, period, chinese comma, chinese period, whitespace, newline
  const cleanText = text.replace(/[.,;，,。 \n\t]/g, '');
  // Split into individual characters and remove duplicates
  return [...new Set(cleanText.split(''))];
};

// 2. Helper to generate a texture atlas with all words
const createWordTextureAtlas = (words: string[]) => {
  if (typeof document === 'undefined') return { texture: new THREE.Texture(), cols: 1, rows: 1 };
  
  const count = words.length;
  // Calculate grid dimensions (e.g. 64 words -> 8x8 grid)
  const cols = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);
  
  const canvas = document.createElement('canvas');
  // Use high resolution for crisp text
  const size = 2048; 
  canvas.width = size;
  canvas.height = size;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return { texture: new THREE.Texture(), cols: 1, rows: 1 };

  // Clear background
  ctx.clearRect(0, 0, size, size);
  
  const cellWidth = size / cols;
  const cellHeight = size / rows;
  
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  
  words.forEach((word, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols); // 0 is top row
    
    const centerX = col * cellWidth + cellWidth / 2;
    const centerY = row * cellHeight + cellHeight / 2;
    
    // Dynamic font sizing
    // Start with a large font relative to cell height
    let fontSize = cellHeight * 0.75; // Increased slightly for Chinese characters which are square
    // Use common Chinese font stack
    ctx.font = `bold ${fontSize}px "Microsoft YaHei", "PingFang SC", "Heiti SC", "SimHei", "Arial", sans-serif`;
    
    // Measure and scale down if word is too wide for the cell
    const metrics = ctx.measureText(word);
    const textWidth = metrics.width;
    const maxWidth = cellWidth * 0.9; // 90% of cell width
    
    if (textWidth > maxWidth) {
      fontSize = fontSize * (maxWidth / textWidth);
      ctx.font = `bold ${fontSize}px "Microsoft YaHei", "PingFang SC", "Heiti SC", "SimHei", "Arial", sans-serif`;
    }
    
    ctx.fillText(word, centerX, centerY);
  });
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  // texture.minFilter = THREE.LinearFilter;
  
  return { texture, cols, rows };
};

// Custom Shader Material
const ParticleShaderMaterial = shaderMaterial(
  {
    uTime: 0,
    uColorTop: new THREE.Color('#ffaa33'),
    uColorBottom: new THREE.Color('#ffffff'),
    uPixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio : 2.0,
    uSize: 95.0, // Reduced from 110.0 to help with overlap
    uTexture: null,
    uAtlasGrid: new THREE.Vector2(1, 1), // cols, rows
  },
  // Vertex Shader
  `
    uniform float uTime;
    uniform float uPixelRatio;
    uniform float uSize;
    
    attribute float aScale;
    attribute vec3 aColor;
    attribute vec3 aRandom;
    attribute float aWordIndex; // Index of the word in the atlas
    
    varying vec3 vColor;
    varying float vWordIndex;
    varying float vScale;
    
    void main() {
      vColor = aColor;
      vWordIndex = aWordIndex;
      vScale = aScale;
      
      vec3 pos = position;
      
      // ORGANIC MOVEMENT
      float time = uTime * 0.3;
      
      // Independent wiggling
      pos.x += sin(time + pos.y * 1.5 + aRandom.x) * 0.05;
      pos.y += cos(time + pos.x * 1.5 + aRandom.y) * 0.05;
      pos.z += sin(time + pos.z * 1.5 + aRandom.z) * 0.05;
      
      // Breathing effect
      float breath = sin(time * 0.5) * 0.08;
      pos += normal * breath;

      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      gl_Position = projectionMatrix * mvPosition;
      
      // Size attenuation
      gl_PointSize = uSize * aScale * uPixelRatio * (1.0 / -mvPosition.z);
    }
  `,
  // Fragment Shader
  `
    uniform sampler2D uTexture;
    uniform vec2 uAtlasGrid; // (cols, rows)
    
    varying vec3 vColor;
    varying float vWordIndex;
    
    void main() {
      // Basic UV from point coord (0..1)
      vec2 uv = gl_PointCoord;
      
      // Flip Y because point coords are top-left, but we want to map naturally
      uv.y = 1.0 - uv.y;
      
      // Calculate which cell in the atlas we want
      float cols = uAtlasGrid.x;
      float rows = uAtlasGrid.y;
      
      // Determine row and column for this word index
      float index = floor(vWordIndex + 0.5); // Ensure integer
      float colIndex = mod(index, cols);
      float rowIndex = floor(index / cols);
      
      // Map local UV (0..1) to Atlas UV
      // X: (colIndex + uv.x) / cols
      // Y: (rowIndex + uv.y) / rows
      
      vec2 atlasUV = vec2(
        (colIndex + uv.x) / cols,
        1.0 - (rowIndex + 1.0 - uv.y) / rows
      );
      
      vec4 texColor = texture2D(uTexture, atlasUV);
      
      // Alpha test
      if (texColor.a < 0.3) discard;
      
      // Apply color
      gl_FragColor = vec4(vColor, texColor.a);
    }
  `
);

extend({ ParticleShaderMaterial });

const ParticleSphere: React.FC<ParticleProps> = ({ 
  count = 15000, 
  radius = 2.5,
  colorTop = '#FFC107', 
  colorBottom = '#FFFFFF',
  onInteract
}) => {
  const materialRef = useRef<THREE.ShaderMaterial & { uTime: number }>(null!);
  const pointsRef = useRef<THREE.Points>(null!);

  // Process poem words
  const uniqueWords = useMemo(() => getUniqueWords(POEM_TEXT), []);
  
  // Generate Texture Atlas
  const { texture: atlasTexture, cols, rows } = useMemo(
    () => createWordTextureAtlas(uniqueWords), 
    [uniqueWords]
  );
  
  const atlasGrid = useMemo(() => new THREE.Vector2(cols, rows), [cols, rows]);

  // Generate geometry data
  const { positions, colors, randoms, scales, wordIndexes } = useMemo(() => {
    const positions = [];
    const colors = [];
    const randoms = [];
    const scales = [];
    const wordIndexes = [];
    
    const cTop = new THREE.Color(colorTop);
    const cBottom = new THREE.Color(colorBottom);
    const tempColor = new THREE.Color();

    let i = 0;
    while (positions.length < count * 3) {
      // 1. Random Point on Sphere
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      
      const r = radius * (0.95 + Math.random() * 0.1);

      let x = r * Math.sin(phi) * Math.cos(theta);
      let y = r * Math.cos(phi);
      let z = r * Math.sin(phi) * Math.sin(theta);
      
      // 2. DENSITY LOGIC
      const normalizedY = y / radius; 
      const densityVal = Math.abs(normalizedY); // 0 (equator) -> 1 (poles)
      
      // Keep density probability: higher at poles
      const densityProbability = 0.25 + 0.75 * Math.pow(densityVal, 2.5);
      
      if (Math.random() > densityProbability) continue;

      positions.push(x, y, z);
      
      // 3. COLOR
      const t = (normalizedY + 1) / 2;
      tempColor.copy(cBottom).lerp(cTop, t);
      colors.push(tempColor.r, tempColor.g, tempColor.b);

      // 4. ANIMATION ATTRIBUTES
      randoms.push(Math.random(), Math.random(), Math.random());
      
      // 5. SCALE LOGIC
      // Sparse (equator) -> Larger
      // Dense (poles) -> Smaller
      const sizeBase = 2.5 - (densityVal * 1.5); 
      scales.push(sizeBase * (0.8 + Math.random() * 0.5));
      
      // 6. WORD INDEX
      // Pick a random word from the list
      const wIdx = Math.floor(Math.random() * uniqueWords.length);
      wordIndexes.push(wIdx);
      
      i++;
    }

    return {
      positions: new Float32Array(positions),
      colors: new Float32Array(colors),
      randoms: new Float32Array(randoms),
      scales: new Float32Array(scales),
      wordIndexes: new Float32Array(wordIndexes)
    };
  }, [count, radius, colorTop, colorBottom, uniqueWords]);

  useFrame((state, delta) => {
    if (materialRef.current) {
      materialRef.current.uTime = state.clock.elapsedTime;
    }
    if (pointsRef.current) {
      pointsRef.current.rotation.y += delta * 0.05;
    }
  });

  return (
    <points 
      ref={pointsRef} 
      onDoubleClick={(e) => {
        e.stopPropagation();
        onInteract && onInteract();
      }}
    >
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aColor"
          count={colors.length / 3}
          array={colors}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aRandom"
          count={randoms.length / 3}
          array={randoms}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aScale"
          count={scales.length}
          array={scales}
          itemSize={1}
        />
        <bufferAttribute
          attach="attributes-aWordIndex"
          count={wordIndexes.length}
          array={wordIndexes}
          itemSize={1}
        />
      </bufferGeometry>
      {/* @ts-ignore */}
      <particleShaderMaterial
        ref={materialRef}
        uTexture={atlasTexture}
        uAtlasGrid={atlasGrid}
        transparent={true}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

export default ParticleSphere;