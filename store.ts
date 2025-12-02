import { create } from 'zustand';

export interface Wish {
  id: string;
  text: string;
  vessel: string;
  color: string;
  position: [number, number, number];
}

interface WishState {
  isWishing: boolean;
  wishText: string;
  selectedVessel: string;
  wishes: Wish[];
  focusedWishId: string | null; // New: Track which wish is open in Split View
  setIsWishing: (isWishing: boolean) => void;
  setWishText: (text: string) => void;
  setSelectedVessel: (vessel: string) => void;
  setFocusedWishId: (id: string | null) => void; // New Action
  addWish: (text: string, vessel: string) => void;
}

const NEON_COLORS = [
  '#ff00ff', // Magenta
  '#00ffff', // Cyan
  '#ffff00', // Yellow
  '#ff00aa', // Hot Pink
  '#00ff00', // Lime
  '#aa00ff', // Violet
  '#ffaa00', // Amber
];

export const useWishStore = create<WishState>((set) => ({
  isWishing: false,
  wishText: '',
  selectedVessel: 'Sphere', 
  wishes: [],
  focusedWishId: null,
  setIsWishing: (isWishing) => set({ isWishing }),
  setWishText: (wishText) => set({ wishText }),
  setSelectedVessel: (selectedVessel) => set({ selectedVessel }),
  setFocusedWishId: (focusedWishId) => set({ focusedWishId }),
  addWish: (text, vessel) => {
    set((state) => {
      // Place in middle section of tree (3.0 to 8.5)
      const y = 3.0 + Math.random() * 5.5; 
      
      // Radius taper logic
      const maxRadiusAtY = 3.5 * (1 - y / 10.5); 
      const radius = maxRadiusAtY * (0.85 + Math.random() * 0.2); 
      const theta = Math.random() * Math.PI * 2;
      
      const x = radius * Math.cos(theta);
      const z = radius * Math.sin(theta);
      
      const color = NEON_COLORS[Math.floor(Math.random() * NEON_COLORS.length)];

      const newWish: Wish = {
        id: Math.random().toString(36).substr(2, 9),
        text,
        vessel,
        color,
        position: [x, y, z]
      };

      return {
        wishes: [...state.wishes, newWish],
        wishText: '', 
        isWishing: false 
      };
    });
  }
}));