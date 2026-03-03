export const appConfig = {
  speechRecognitionMode: 'browser' as const, // use Web Speech API (webkitSpeechRecognition)
  enableTenantScoping: true,
};

export function getLearnYourWayOrigin(): string {
  if (typeof window !== 'undefined') return window.location.origin;
  return '';
}
