import React, { useRef, useEffect, useMemo } from 'react';
import { CameraControls, PerspectiveCamera } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { ParticleTree } from './ParticleTree';
import { WishSphere } from './WishSphere';
import { useWishStore } from '../store';
import * as THREE from 'three';

interface ExperienceProps {
  triggerGrow: number;
}

export const Experience: React.FC<ExperienceProps> = ({ triggerGrow }) => {
  const wishes = useWishStore((state) => state.wishes);
  const focusedWishId = useWishStore((state) => state.focusedWishId);
  const controlsRef = useRef<CameraControls>(null);
  const isInteracting = useRef(false);

  // Find the focused wish to get its position
  const focusedWish = useMemo(() => 
    wishes.find(w => w.id === focusedWishId), 
  [wishes, focusedWishId]);

  // Camera Animation Logic
  useEffect(() => {
    if (!controlsRef.current) return;

    if (focusedWish) {
      // ZOOM IN: Target the sphere
      // Position: Just in front of the sphere (z + 2.5) to fill 80% view
      const [x, y, z] = focusedWish.position;
      
      // Smoothly animate camera to look at the sphere
      controlsRef.current.setLookAt(
        x, y, z + 2.5, // Camera Position
        x, y, z,       // Target
        true           // Transition: true
      );
    } else {
      // ZOOM OUT: Reset to full tree view
      controlsRef.current.setLookAt(
        0, 5, 35, // Default Position
        0, 6, 0,  // Default Target
        true
      );
    }
  }, [focusedWish]);

  // Auto-rotate logic that pauses on interaction
  useFrame((state, delta) => {
    if (controlsRef.current && !isInteracting.current && !focusedWishId) {
      // Only auto-rotate if NOT focusing on a wish
      const azimuthAngle = controlsRef.current.azimuthAngle;
      controlsRef.current.azimuthAngle = azimuthAngle + delta * 0.1; // 0.1 speed
    }
  });

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 5, 35]} />
      <CameraControls 
        ref={controlsRef}
        minPolarAngle={Math.PI / 4} 
        maxPolarAngle={Math.PI / 1.8}
        minDistance={2} // Allow getting closer for the zoom
        maxDistance={50}
        dollyToCursor={true}
        onStart={() => { isInteracting.current = true; }}
        onEnd={() => { isInteracting.current = false; }}
      />

      <ambientLight intensity={0.5} />
      
      <group position={[0, -8, 0]}>
        <ParticleTree key={triggerGrow} isFocused={!!focusedWishId} />
        
        {wishes.map((wish) => (
          <WishSphere 
            key={wish.id}
            id={wish.id}
            text={wish.text}
            color={wish.color}
            position={wish.position}
          />
        ))}
      </group>

      <EffectComposer enableNormalPass={false}>
        <Bloom 
          luminanceThreshold={0.2} 
          mipmapBlur 
          intensity={1.5} 
          radius={0.6}
        />
        <Vignette eskil={false} offset={0.1} darkness={1.1} />
      </EffectComposer>
    </>
  );
};