export const appConfig = {
  speechRecognitionMode: 'server' as const, // use backendApi for STT
};

export function getLearnYourWayOrigin(): string {
  if (typeof window !== 'undefined') return window.location.origin;
  return '';
}
