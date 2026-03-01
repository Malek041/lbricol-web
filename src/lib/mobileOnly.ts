import { useSyncExternalStore } from 'react';

export const MOBILE_ONLY_MODE = true;

type ViewportMode = 'lte' | 'lt';
export type MobileTier = 'compact' | 'standard' | 'wide';

const subscribers = new Set<() => void>();
let resizeBound = false;

const notifySubscribers = () => {
  subscribers.forEach((callback) => callback());
};

const onResize = () => {
  notifySubscribers();
};

const bindResizeListener = () => {
  if (resizeBound || typeof window === 'undefined') return;
  window.addEventListener('resize', onResize, { passive: true });
  resizeBound = true;
};

const unbindResizeListenerIfIdle = () => {
  if (!resizeBound || subscribers.size > 0 || typeof window === 'undefined') return;
  window.removeEventListener('resize', onResize);
  resizeBound = false;
};

const subscribeViewportWidth = (callback: () => void) => {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  bindResizeListener();
  subscribers.add(callback);

  return () => {
    subscribers.delete(callback);
    unbindResizeListenerIfIdle();
  };
};

const getViewportWidth = () => {
  if (typeof window === 'undefined') return 0;
  return window.innerWidth;
};

export const isMobileViewport = (breakpoint: number, mode: ViewportMode = 'lte'): boolean => {
  if (MOBILE_ONLY_MODE) return true;
  const width = getViewportWidth();
  return mode === 'lt' ? width < breakpoint : width <= breakpoint;
};

export const useIsMobileViewport = (breakpoint: number, mode: ViewportMode = 'lte') => {
  const width = useSyncExternalStore(subscribeViewportWidth, getViewportWidth, () => 0);
  if (MOBILE_ONLY_MODE) return true;
  return mode === 'lt' ? width < breakpoint : width <= breakpoint;
};

export const useViewportWidth = () => {
  return useSyncExternalStore(subscribeViewportWidth, getViewportWidth, () => 390);
};

export const getMobileTier = (width: number): MobileTier => {
  if (width <= 360) return 'compact';
  if (width >= 430) return 'wide';
  return 'standard';
};

export const useMobileTier = (): MobileTier => {
  const width = useViewportWidth();
  return getMobileTier(width);
};

// Linear interpolation helper for smooth sizing between common phone widths.
export const fluidMobilePx = (
  width: number,
  minPx: number,
  maxPx: number,
  minWidth = 320,
  maxWidth = 430
) => {
  const clampedWidth = Math.min(Math.max(width, minWidth), maxWidth);
  const t = (clampedWidth - minWidth) / (maxWidth - minWidth);
  return minPx + (maxPx - minPx) * t;
};
