import React, { Suspense, useState, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import ParticleSphere, { POEM_TEXT } from './components/ParticleSphere';
import UIOverlay from './components/UIOverlay';

// Scene container to manage lights, environment, and scaling animation
const Scene: React.FC<{ onSphereClick: () => void; isSplit: boolean }> = ({ onSphereClick, isSplit }) => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    if (groupRef.current) {
      // Smoothly interpolate scale: 1.0 (normal) -> 0.8 (split mode)
      const targetScale = isSplit ? 0.8 : 1.0;
      const step = delta * 4; // Animation speed
      groupRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), step);
    }
  });

  return (
    <>
      <ambientLight intensity={0.5} />
      
      {/* Wrap ParticleSphere in a group to handle smooth scaling without regenerating geometry */}
      <group ref={groupRef}>
        <ParticleSphere 
          count={5600} 
          radius={3.0} 
          colorTop="#FFB800" 
          colorBottom="#FFFFFF" 
          onInteract={onSphereClick}
        />
      </group>
      
      <OrbitControls 
        enablePan={false} 
        enableZoom={true} 
        minDistance={isSplit ? 8.0 : 4} 
        maxDistance={10}
        autoRotate={true}
        autoRotateSpeed={0.8}
        zoomSpeed={0.5}
      />
    </>
  );
};

const App: React.FC = () => {
  const [isSplit, setIsSplit] = useState(false);

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden font-mono">
      
      {/* --- UI OVERLAY (Full Screen Mode) --- */}
      <UIOverlay 
        title="NEBULA CORE" 
        subtitle="Organic Particle System" 
        visible={!isSplit}
      />

      {/* --- EXIT BUTTON (Visible in Split Mode) --- */}
      <button
        onClick={() => setIsSplit(false)}
        className={`absolute top-6 left-6 z-50 group flex items-center space-x-2 text-white/70 hover:text-white transition-all duration-500 ${isSplit ? 'opacity-100 translate-y-0 delay-300' : 'opacity-0 -translate-y-4 pointer-events-none'}`}
      >
        <div className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center bg-white/5 backdrop-blur-sm group-hover:bg-white/10 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <span className="text-sm tracking-widest uppercase">Close View</span>
      </button>

      {/* --- MAIN CONTAINER --- */}
      <div className="flex w-full h-full">
        
        {/* --- LEFT SIDE: 3D CANVAS --- */}
        <div className={`relative h-full transition-[width] duration-[800ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${isSplit ? 'w-1/2' : 'w-full'}`}>
           <Canvas
            camera={{ position: [0, 0, 7.5], fov: 40 }}
            dpr={[1, 2]} 
            gl={{ 
              antialias: true,
              alpha: false,
              powerPreference: "high-performance"
            }}
            resize={{ debounce: 0 }}
          >
            <color attach="background" args={['#000000']} />
            <Suspense fallback={null}>
              <Scene onSphereClick={() => setIsSplit(true)} isSplit={isSplit} />
            </Suspense>
          </Canvas>
        </div>

        {/* --- RIGHT SIDE: CONTENT PANEL --- */}
        <div 
          className={`relative h-full overflow-hidden transition-[width] duration-[800ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${isSplit ? 'w-1/2' : 'w-0'}`}
        >
          {/* Glassmorphism Container */}
          <div className={`absolute inset-0 w-full h-full border-l border-white/10 bg-white/5 backdrop-blur-2xl p-12 md:p-16 overflow-y-auto custom-scrollbar transition-opacity duration-700 delay-100 ${isSplit ? 'opacity-100' : 'opacity-0'}`}>
            
            <div className="max-w-xl mx-auto mt-12 flex flex-col space-y-8">
              {/* Header */}
              <div className="space-y-2">
                 <h2 className="text-3xl md:text-4xl text-white font-thin tracking-tighter">
                   静夜思 (Quiet Night Thought)
                 </h2>
                 <p className="text-orange-300/80 text-xs uppercase tracking-widest">
                   李白 (Li Bai)
                 </p>
              </div>
              
              <div className="w-full h-px bg-gradient-to-r from-white/20 to-transparent" />

              {/* Poem Content */}
              <div className="text-white/80 leading-relaxed text-sm md:text-base space-y-6 font-mono">
                 {POEM_TEXT.split('\n').map((line, i) => (
                   <p key={i} className={`${line.trim() === '' ? 'h-4' : ''}`}>
                     {line}
                   </p>
                 ))}
              </div>
              
               <div className="w-full h-px bg-gradient-to-r from-white/20 to-transparent" />
               
               <div className="text-white/40 text-xs italic">
                 "Particle data representation of poetic structure."
               </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

export default App;