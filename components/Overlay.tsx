import React from 'react';

interface OverlayProps {
  onRegrow: () => void;
}

export const Overlay: React.FC<OverlayProps> = ({ onRegrow }) => {
  return (
    <div className="absolute top-0 left-0 w-full h-full pointer-events-none flex flex-col justify-end p-8 z-10">
      {/* Header removed as requested */}

      <footer className="flex justify-between items-end w-full">
        <div className="text-white/30 text-xs font-mono">
          <p>VERTICES: 80,000</p>
          <p>RENDER: R3F / GLSL</p>
        </div>

        <button 
          onClick={onRegrow}
          className="pointer-events-auto bg-white/5 hover:bg-white/10 text-white/80 border border-white/20 px-6 py-3 rounded-full backdrop-blur-md transition-all duration-300 hover:scale-105 hover:shadow-[0_0_20px_rgba(255,255,255,0.2)] active:scale-95 group flex items-center gap-2"
        >
          <span className="uppercase tracking-widest text-xs font-bold">Reseed</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="opacity-50 group-hover:opacity-100 transition-opacity" viewBox="0 0 16 16">
            <path fillRule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
            <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
          </svg>
        </button>
      </footer>
    </div>
  );
};