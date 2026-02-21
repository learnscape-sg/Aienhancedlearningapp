export const appConfig = {
  speechRecognitionMode: 'server' as const, // use backendApi for STT
};

export function getLearnYourWayOrigin(): string {
  const env = import.meta.env.VITE_LEARNYOURWAY_URL;
  if (env) return env.replace(/\/$/, '');
  if (typeof window !== 'undefined') return window.location.origin;
  return '';
}
