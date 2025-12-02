import React, { useMemo, useRef } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler';

// ----------------------
// Vertex Shader
// ----------------------
const vertexShader = `
  uniform float uTime;
  uniform float uGrowth; // 0.0 to 1.0
  uniform float uTreeHeight; // Height of the tree in world units
  
  attribute float aRandom;
  attribute float aSize;
  attribute vec3 aTargetPos;

  varying float vAlpha;
  varying vec3 vColor;

  // Simple noise function
  float hash(float n) { return fract(sin(n) * 43758.5453123); }

  void main() {
    // 1. Growth Logic
    // Normalize height based on actual tree height
    float normalizedY = aTargetPos.y / uTreeHeight;
    
    // Calculate progress: uGrowth * 2.0 ensures we go well past 1.0 to fully reveal the top
    float heightProgress = smoothstep(0.0, 1.0, (uGrowth * 2.0) - normalizedY);
    
    // Animate from 0,0,0 to Target Position
    float currentY = mix(0.0, aTargetPos.y, heightProgress);
    
    // Expand radius as we grow
    float radiusProgress = smoothstep(0.0, 1.0, heightProgress);
    float currentX = mix(0.0, aTargetPos.x, radiusProgress);
    float currentZ = mix(0.0, aTargetPos.z, radiusProgress);

    // 2. Spiral/Swirl Animation during growth
    // While growing (heightProgress < 1.0), rotate around Y
    float twistStrength = (1.0 - heightProgress) * 5.0; 
    float c = cos(twistStrength);
    float s = sin(twistStrength);
    float twistedX = currentX * c - currentZ * s;
    float twistedZ = currentX * s + currentZ * c;

    vec3 pos = vec3(twistedX, currentY, twistedZ);

    // 3. Organic Movement (Wind/Breathing)
    // Only apply when fully grown or significantly grown
    // SLOWED DOWN: Reduced time multipliers for ethereal feel
    float windStrength = 0.1 * heightProgress;
    pos.x += sin(uTime * 0.3 + pos.y * 0.5) * windStrength;
    pos.z += cos(uTime * 0.2 + pos.y * 0.5) * windStrength;
    
    // 4. Sparkle/Floating effect
    // SLOWED DOWN: Slower breathing vertical movement
    pos.y += sin(uTime * 0.5 + aRandom * 10.0) * 0.05;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    // Size attenuation
    gl_PointSize = (aSize * 25.0) * (1.0 / -mvPosition.z);
    
    // Fade in/out based on growth
    vAlpha = smoothstep(0.0, 0.2, heightProgress);

    // Slight color variation based on height
    float heightMix = normalizedY; 
    vec3 bottomColor = vec3(0.1, 0.8, 0.6); // Cyan-ish green
    vec3 topColor = vec3(0.8, 0.9, 1.0);    // White-ish blue
    vColor = mix(bottomColor, topColor, heightMix);
    
    // Boost brightness for bloom
    vColor *= 2.0; 
  }
`;

// ----------------------
// Fragment Shader
// ----------------------
const fragmentShader = `
  uniform float uGlobalAlpha; // Transparency Control
  varying float vAlpha;
  varying vec3 vColor;

  void main() {
    // Circular particle shape
    vec2 xy = gl_PointCoord.xy - vec2(0.5);
    float r = length(xy);
    if (r > 0.5) discard;

    // Soft glow gradient
    float glow = 1.0 - (r * 2.0);
    glow = pow(glow, 1.5);

    // Combine alpha
    float alpha = vAlpha * uGlobalAlpha;

    gl_FragColor = vec4(vColor, alpha * glow);
  }
`;

interface ParticleTreeProps {
  isFocused: boolean;
}

export const ParticleTree: React.FC<ParticleTreeProps> = ({ isFocused }) => {
  const meshRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  
  // Use remote path pointing to raw github content
  const obj = useLoader(OBJLoader, 'https://raw.githubusercontent.com/icedtinat/lumina-assets/main/tree.obj');

  // Configuration
  const count = 80000;

  const { positions, randoms, sizes, treeHeight } = useMemo(() => {
    // 1. Find the mesh in the loaded OBJ
    let mesh: THREE.Mesh | null = null;
    obj.traverse((child) => {
      if ((child as THREE.Mesh).isMesh && !mesh) {
        mesh = child as THREE.Mesh;
      }
    });

    if (!mesh) {
      console.warn('No mesh found in tree.obj');
      return { 
        positions: new Float32Array(count * 3), 
        randoms: new Float32Array(count), 
        sizes: new Float32Array(count),
        treeHeight: 10.0
      };
    }

    // 2. Prepare Geometry
    const geometry = mesh.geometry.clone();

    // Transform sequence:
    // A. Rotate upright
    geometry.rotateX(-Math.PI / 2);
    
    // B. Center at 0,0,0
    geometry.center();

    // C. Scale UP (Bigger tree)
    geometry.scale(2.5, 2.5, 2.5);

    // D. Compute Bounding Box to find height
    geometry.computeBoundingBox();
    let height = 10.0;
    if (geometry.boundingBox) {
      height = geometry.boundingBox.max.y - geometry.boundingBox.min.y;
      
      // E. Shift UP so bottom is at Y=0
      // Since it's centered, min.y is -height/2. We add height/2 to bring min to 0.
      geometry.translate(0, height / 2, 0);
    }
    
    // Create a temporary mesh for the sampler
    const sampleMesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial());
    
    // Build the sampler
    const sampler = new MeshSurfaceSampler(sampleMesh).build();

    // 3. Sample Points
    const positions = new Float32Array(count * 3);
    const randoms = new Float32Array(count);
    const sizes = new Float32Array(count);
    const tempPosition = new THREE.Vector3();

    for (let i = 0; i < count; i++) {
      sampler.sample(tempPosition);

      // Map sampled point to position buffer
      positions[i * 3] = tempPosition.x;
      positions[i * 3 + 1] = tempPosition.y;
      positions[i * 3 + 2] = tempPosition.z;

      randoms[i] = Math.random();
      sizes[i] = Math.random() * 0.5 + 0.5; // range 0.5 - 1.0
    }

    return { positions, randoms, sizes, treeHeight: height };
  }, [obj, count]);

  // Animation Loop
  useFrame((state, delta) => {
    if (materialRef.current) {
      // Update Time
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
      
      // Update Growth
      const currentGrowth = materialRef.current.uniforms.uGrowth.value;
      const targetGrowth = 1.0;
      
      // Smoothly interpolate growth to 1.0
      if (currentGrowth < 0.999) {
          const step = (targetGrowth - currentGrowth) * 1.0 * delta; 
          materialRef.current.uniforms.uGrowth.value += step;
      } else {
        materialRef.current.uniforms.uGrowth.value = 1.0;
      }

      // Update Opacity (uGlobalAlpha) based on focus state
      // 1.0 = Opaque, 0.3 = Transparent
      const targetAlpha = isFocused ? 0.3 : 1.0;
      const currentAlpha = materialRef.current.uniforms.uGlobalAlpha.value;
      materialRef.current.uniforms.uGlobalAlpha.value += (targetAlpha - currentAlpha) * delta * 2.0;
    }
  });

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uGrowth: { value: 0 },
      uTreeHeight: { value: treeHeight },
      uGlobalAlpha: { value: 1.0 } // Init alpha
    }),
    [treeHeight]
  );

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aTargetPos"
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
        <bufferAttribute
          attach="attributes-aSize"
          count={count}
          array={sizes}
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
    </points>
  );
};