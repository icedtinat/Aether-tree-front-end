import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Star, Circle, Cookie, Bell, X } from 'lucide-react';
import { useWishStore } from '../store';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Helper for Tailwind class merging
function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

const VesselOption = ({ 
  id, 
  icon: Icon, 
  selected, 
  onClick 
}: { 
  id: string; 
  icon: any; 
  selected: boolean; 
  onClick: () => void 
}) => (
  <button
    onClick={onClick}
    className={cn(
      "relative group flex flex-col items-center gap-2 p-4 rounded-xl transition-all duration-500",
      selected ? "bg-white/10 scale-110" : "hover:bg-white/5"
    )}
  >
    <div className={cn(
      "w-12 h-12 flex items-center justify-center transition-all duration-500",
      selected ? "text-cyan-200 drop-shadow-[0_0_10px_rgba(165,243,252,0.6)]" : "text-white/40 group-hover:text-white/70"
    )}>
      {/* Ghostly Blueprint Style: Dotted Strokes */}
      <Icon 
        size={32} 
        strokeWidth={1.5} 
        strokeDasharray="4 3" 
        className={cn("transition-all", selected && "stroke-cyan-200")}
      />
    </div>
    <span className={cn(
      "text-[10px] uppercase tracking-widest transition-colors duration-300",
      selected ? "text-cyan-200" : "text-white/20"
    )}>
      {id}
    </span>
    
    {/* Selection Indicator */}
    {selected && (
      <motion.div 
        layoutId="vessel-glow"
        className="absolute inset-0 rounded-xl border border-cyan-500/30 shadow-[0_0_20px_rgba(34,211,238,0.1)]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />
    )}
  </button>
);

export const WishUI = () => {
  const { isWishing, setIsWishing, wishText, setWishText, selectedVessel, setSelectedVessel, addWish } = useWishStore();

  // Calculate "Energy" level based on text length (0 to 1)
  const energyLevel = Math.min(wishText.length / 50, 1);

  const handleSubmit = () => {
    if (wishText.trim()) {
      addWish(wishText, selectedVessel);
    }
  };

  return (
    <>
      <AnimatePresence>
        {/* STAGE 1: THE SUMMONING (Idle State) */}
        {!isWishing && (
          <motion.div
            className="absolute bottom-8 right-8 z-50"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.5 }}
          >
            <motion.button
              onClick={() => setIsWishing(true)}
              className="relative w-16 h-16 md:w-auto md:h-auto md:px-8 md:py-4 rounded-full bg-white/5 border border-white/20 backdrop-blur-md flex items-center justify-center gap-3 group overflow-hidden"
              // The Breathing Animation
              animate={{
                boxShadow: [
                  "0 0 0px rgba(255,255,255,0)",
                  "0 0 20px rgba(255,255,255,0.2)",
                  "0 0 0px rgba(255,255,255,0)"
                ],
                scale: [1, 1.05, 1],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              whileHover={{ scale: 1.1, backgroundColor: "rgba(255,255,255,0.1)" }}
              whileTap={{ scale: 0.95 }}
            >
              <Sparkles className="text-cyan-200 w-6 h-6" />
              <span className="hidden md:block text-white/90 font-light tracking-wider uppercase text-sm">Make a Wish</span>
              
              {/* Internal Glow Blob */}
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/10 to-cyan-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-xl" />
            </motion.button>
          </motion.div>
        )}

        {/* STAGE 2: THE PORTAL (Active State) */}
        {isWishing && (
          <motion.div
            className="absolute inset-0 z-40 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Backdrop Dimmer */}
            <div 
              className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" 
              onClick={() => setIsWishing(false)}
            />

            {/* The Wish Card */}
            <motion.div
              className="relative w-full max-w-lg bg-black/40 border border-white/10 rounded-2xl backdrop-blur-xl p-8 shadow-2xl overflow-hidden"
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
            >
              {/* Close Button */}
              <button 
                onClick={() => setIsWishing(false)}
                className="absolute top-4 right-4 text-white/30 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>

              <h2 className="text-2xl font-light text-white/90 mb-1 text-center tracking-wide">
                Cast Your Intention
              </h2>
              <p className="text-white/40 text-center text-sm mb-8 font-light">
                Your words will become light within the tree.
              </p>

              {/* Magic Input Field */}
              <div className="relative mb-8 group">
                <textarea
                  value={wishText}
                  onChange={(e) => setWishText(e.target.value)}
                  placeholder="I wish for..."
                  rows={3}
                  className="w-full bg-white/5 text-white placeholder-white/20 text-xl font-light p-4 rounded-lg outline-none resize-none transition-all duration-700"
                  style={{
                    // Dynamic Shadow based on Energy Level
                    boxShadow: `0 0 ${20 * energyLevel}px ${energyLevel > 0.8 ? 'rgba(255, 215, 0, 0.2)' : 'rgba(34, 211, 238, 0.1)'}`,
                    borderColor: `rgba(255, 255, 255, ${0.1 + energyLevel * 0.4})`
                  }}
                />
                
                {/* Visual Energy Bar */}
                <div className="absolute bottom-0 left-0 h-[2px] bg-gradient-to-r from-cyan-500 to-amber-200 transition-all duration-500 ease-out"
                     style={{ width: `${energyLevel * 100}%`, opacity: energyLevel > 0 ? 1 : 0 }} 
                />
              </div>

              {/* Stage 3: The Vessel (Selection) */}
              <div className="grid grid-cols-4 gap-2 mb-8">
                <VesselOption id="Star" icon={Star} selected={selectedVessel === 'Star'} onClick={() => setSelectedVessel('Star')} />
                <VesselOption id="Sphere" icon={Circle} selected={selectedVessel === 'Sphere'} onClick={() => setSelectedVessel('Sphere')} />
                <VesselOption id="Cookie" icon={Cookie} selected={selectedVessel === 'Cookie'} onClick={() => setSelectedVessel('Cookie')} />
                <VesselOption id="Bell" icon={Bell} selected={selectedVessel === 'Bell'} onClick={() => setSelectedVessel('Bell')} />
              </div>

              {/* Submit Action */}
              <button 
                onClick={handleSubmit}
                disabled={!wishText}
                className={cn(
                  "w-full py-4 rounded-lg font-medium tracking-widest uppercase text-sm transition-all duration-500 flex items-center justify-center gap-2",
                  wishText 
                    ? "bg-white text-black hover:bg-cyan-50 hover:shadow-[0_0_20px_rgba(34,211,238,0.5)]" 
                    : "bg-white/5 text-white/20 cursor-not-allowed"
                )}
              >
                <span>Materialize</span>
                {wishText && <Sparkles size={16} />}
              </button>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};