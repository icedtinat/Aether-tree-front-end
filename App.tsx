import React, { Suspense, useState, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { Experience } from './components/Experience';
import { Overlay } from './components/Overlay';
import { WishUI } from './components/WishUI';

export default function App() {
  const [triggerGrow, setTriggerGrow] = useState(0);

  const handleRegrow = useCallback(() => {
    setTriggerGrow(prev => prev + 1);
  }, []);

  return (
    <div className="relative w-full h-full bg-black">
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 5, 35], fov: 45 }}
        gl={{ antialias: false, alpha: false }}
      >
        <color attach="background" args={['#050505']} />
        <Suspense fallback={null}>
          <Experience triggerGrow={triggerGrow} />
        </Suspense>
      </Canvas>
      <Overlay onRegrow={handleRegrow} />
      <WishUI />
    </div>
  );
}