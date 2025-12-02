export interface ParticleProps {
  count?: number;
  radius?: number;
  colorTop?: string;
  colorBottom?: string;
  onInteract?: () => void;
}

export interface UIOverlayProps {
  title: string;
  subtitle: string;
  visible: boolean;
}