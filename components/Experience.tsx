import React from 'react';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { ParticleTree } from './ParticleTree';
import { WishSphere } from './WishSphere';
import { useWishStore } from '../store';

interface ExperienceProps {
  triggerGrow: number;
}

export const Experience: React.FC<ExperienceProps> = ({ triggerGrow }) => {
  const wishes = useWishStore((state) => state.wishes);

  return (
    <>
      {/* Moved camera further back for larger tree scale */}
      <PerspectiveCamera makeDefault position={[0, 5, 35]} />
      <OrbitControls 
        enablePan={false} 
        minPolarAngle={Math.PI / 4} 
        maxPolarAngle={Math.PI / 1.8}
        minDistance={10}
        maxDistance={50}
        target={[0, 6, 0]} // Lowered target to match the lowered tree position
        autoRotate
        autoRotateSpeed={0.5}
      />

      <ambientLight intensity={0.5} />
      
      {/* Moved tree down (-8) to position it middle-to-bottom in the viewport */}
      <group position={[0, -8, 0]}>
        <ParticleTree key={triggerGrow} />
        
        {/* Render Crystallized Wishes on the Tree */}
        {wishes.map((wish) => (
          <WishSphere 
            key={wish.id}
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