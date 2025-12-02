import React from 'react';
import { UIOverlayProps } from '../types';

const UIOverlay: React.FC<UIOverlayProps> = ({ title, subtitle, visible }) => {
  return (
    <div 
      className={`absolute top-0 left-0 w-full h-full pointer-events-none z-10 flex flex-col justify-between p-8 md:p-12 transition-opacity duration-700 font-mono ${visible ? 'opacity-100' : 'opacity-0'}`}
    >
      {/* Header */}
      <div className="flex flex-col items-start space-y-2">
        <h1 className="text-white text-4xl md:text-6xl font-thin tracking-tighter drop-shadow-lg">
          {title}
        </h1>
        <div className="h-0.5 w-24 bg-gradient-to-r from-orange-400 to-transparent opacity-80" />
        <p className="text-orange-200 text-xs md:text-sm tracking-widest uppercase opacity-70">
          {subtitle}
        </p>
      </div>

      {/* Footer Instructions */}
      <div className="flex justify-end items-end">
        <div className="text-right">
          <p className="text-white/40 text-xs uppercase mb-1">
            Interaction Mode
          </p>
          <p className="text-white/80 text-sm">
            [ DOUBLE CLICK SPHERE TO EXPAND ]
          </p>
        </div>
      </div>
    </div>
  );
};

export default UIOverlay;