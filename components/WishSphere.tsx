import React, { useRef, useState, useMemo } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { useSpring, animated } from '@react-spring/three';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler';

interface WishSphereProps {
  text: string;
  color: string;
  position: [number, number, number];
}

// ----------------------
// Vertex Shader
// ----------------------
const vertexShader = `
  uniform float uTime;
  attribute float aRandom;
  varying float vAlpha;
  varying float vY; // Pass Y position for gradient

  void main() {
    vec3 pos = position;
    vY = pos.y; // Normalized Y height (approx -1 to 1)

    // Organic Pulse: Expand and contract slightly based on time and randomness
    float pulse = sin(uTime * 2.0 + aRandom * 10.0) * 0.05;
    pos *= (1.0 + pulse);

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    // Size Attenuation: Finer particles for high density
    // Reduced max size slightly to accommodate higher count
    float size = (20.0 * aRandom + 5.0); 
    gl_PointSize = size * (1.0 / -mvPosition.z);
    
    // Twinkle Alpha
    vAlpha = 0.8 + 0.2 * sin(uTime * 3.0 + aRandom * 10.0);
  }
`;

// ----------------------
// Fragment Shader
// ----------------------
const fragmentShader = `
  uniform vec3 uColor;
  varying float vAlpha;
  varying float vY;

  void main() {
    // Soft circular particle
    vec2 xy = gl_PointCoord.xy - vec2(0.5);
    float dist = length(xy);
    
    if (dist > 0.5) discard;

    // 1. Vertical Gradient Logic
    // Map vY (approx -1 to 1) to a 0-1 range for mixing
    float gradientMix = smoothstep(-0.8, 0.8, vY);
    
    vec3 colorBottom = vec3(1.0, 1.0, 1.0); // White bottom
    vec3 colorTop = uColor; // Assigned Neon Color (e.g. Orange/Gold) on top
    
    vec3 finalColor = mix(colorBottom, colorTop, gradientMix);

    // 2. Radial Glow (Bright center)
    // Create a hot center that fades out
    float glow = 1.0 - (dist * 2.0);
    glow = pow(glow, 1.5);

    // Output: Boost brightness (x2.0) for HDR bloom
    gl_FragColor = vec4(finalColor * 2.0, vAlpha * glow);
  }
`;

export const WishSphere: React.FC<WishSphereProps> = ({ text, color, position }) => {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [hovered, setHovered] = useState(false);

  // Load the external model
  // FIXED URL: Removed 'refs/heads/'
  const obj = useLoader(OBJLoader, 'https://raw.githubusercontent.com/icedtinat/lumina-assets/main/ball2.obj');
  const count = 20000; // Increased to 20k for solid, high-density look

  const { positions, randoms } = useMemo(() => {
    let mesh: THREE.Mesh | null = null;
    obj.traverse((child) => {
      if ((child as THREE.Mesh).isMesh && !mesh) {
        mesh = child as THREE.Mesh;
      }
    });

    if (!mesh) {
      // Fallback if no mesh found
      return { positions: new Float32Array(0), randoms: new Float32Array(0) };
    }

    const geometry = (mesh as THREE.Mesh).geometry.clone();
    
    // Normalize Geometry
    geometry.center();
    geometry.computeBoundingBox();
    
    // Normalize scale to approx radius 1
    const size = new THREE.Vector3();
    if (geometry.boundingBox) {
      geometry.boundingBox.getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z);
      if (maxDim > 0) {
        const scaleFactor = 2.0 / maxDim; // Target diameter 2 (radius 1)
        geometry.scale(scaleFactor, scaleFactor, scaleFactor);
      }
    }

    // Sample Points
    const sampler = new MeshSurfaceSampler(new THREE.Mesh(geometry)).build();
    const positions = new Float32Array(count * 3);
    const randoms = new Float32Array(count);
    const tempPos = new THREE.Vector3();

    for (let i = 0; i < count; i++) {
      sampler.sample(tempPos);
      positions[i * 3] = tempPos.x;
      positions[i * 3 + 1] = tempPos.y;
      positions[i * 3 + 2] = tempPos.z;
      randoms[i] = Math.random();
    }
    
    return { positions, randoms };
  }, [obj, count]);

  // Animation: Trajectory from camera to tree
  const { pos } = useSpring({
    from: { pos: [0, 15, 30] }, // Start higher and further back
    to: { pos: position },
    config: { mass: 2, tension: 50, friction: 15 }, // Slower, floatier arrival
    delay: 100,
  });

  // Idle Animation & Uniform Updates
  useFrame((state) => {
    if (pointsRef.current && materialRef.current) {
      // Bobbing logic
      const currentPos = pos.get() as [number, number, number];
      const bobOffset = Math.sin(state.clock.elapsedTime * 1.5 + position[0]) * 0.15;
      
      pointsRef.current.position.set(
        currentPos[0], 
        currentPos[1] + bobOffset, 
        currentPos[2]
      );

      // Update Shader Time
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
      
      // Pulse size on hover
      const targetScale = hovered ? 0.45 : 0.35; // Slightly larger overall scale
      pointsRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
    }
  });

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uColor: { value: new THREE.Color(color) }
  }), [color]);

  return (
    <animated.points
      ref={pointsRef}
      onClick={(e) => {
        e.stopPropagation();
        setShowTooltip(!showTooltip);
      }}
      onPointerOver={() => {
        document.body.style.cursor = 'pointer';
        setHovered(true);
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto';
        setHovered(false);
      }}
    >
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aRandom"
          count={count}
          array={randoms}
          itemSize={1}
        />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
      
      {/* Tooltip */}
      {showTooltip && (
        <Html distanceFactor={15}>
          <div className="bg-black/90 backdrop-blur-xl border border-white/30 p-4 rounded-xl text-white w-52 text-center shadow-[0_0_30px_rgba(255,255,255,0.1)] pointer-events-none transform -translate-y-full -mt-6">
            <p className="font-light text-sm italic tracking-wide text-cyan-50">"{text}"</p>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-black/90" />
          </div>
        </Html>
      )}
    </animated.points>
  );
};