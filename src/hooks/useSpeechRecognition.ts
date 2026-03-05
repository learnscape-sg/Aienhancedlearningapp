import { useState, useRef, useCallback } from 'react';
import { appConfig } from '@/config/appConfig';

interface UseSpeechRecognitionOptions {
  language?: string;
  onResult?: (text: string) => void;
  onError?: (error: Error) => void;
}

interface UseSpeechRecognitionReturn {
  isRecording: boolean;
  isProcessing: boolean;
  error: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  cancelRecording: () => void;
}

type SpeechMode = 'browser' | 'server';

interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult;
  length: number;
}

interface SpeechRecognitionResult {
  [index: number]: SpeechRecognitionAlternative;
  length: number;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message: string;
}

const getSpeechMode = (): SpeechMode =>
  appConfig.speechRecognitionMode === 'browser' ? 'browser' : 'server';

const toServerLanguage = (lang: string): string => {
  if (lang.toLowerCase().startsWith('zh')) return 'cmn-CN';
  return lang;
};

const pickSupportedAudioMimeType = (): string | null => {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') {
    return null;
  }
  const candidates = ['audio/webm;codecs=opus', 'audio/webm'];
  for (const type of candidates) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return null;
};

export function useSpeechRecognition(
  options: UseSpeechRecognitionOptions = {}
): UseSpeechRecognitionReturn {
  const { language = 'zh-CN', onResult, onError } = options;
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const getRecognition = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return null;
    const recognition = new SpeechRecognition();
    recognition.lang = language;
    recognition.continuous = true; // hold-to-talk: 持续监听直至用户松手调用 stop()
    recognition.interimResults = false;
    return recognition;
  };

  const startRecordingBrowser = useCallback(async () => {
    try {
      setError(null);

      const recognition = getRecognition();
      if (!recognition) {
        const err = new Error('当前浏览器不支持语音识别');
        setError(err.message);
        onError?.(err);
        return;
      }

      recognitionRef.current = recognition;

      recognition.onstart = () => {
        setIsRecording(true);
        setIsProcessing(false);
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const results = event.results;
        if (!results?.length) return;
        let full = '';
        for (let i = 0; i < results.length; i++) {
          const t = results[i]?.[0]?.transcript?.trim();
          if (t) full += (full ? ' ' : '') + t;
        }
        if (full) onResult?.(full);
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        const err = new Error(event.error || '语音识别失败');
        setError(err.message);
        onError?.(err);
      };

      recognition.onend = () => {
        setIsRecording(false);
        setIsProcessing(false);
      };

      // 不提前 setisProcessing，避免按钮在 onstart 前被禁用导致 pointerup 无法触发
      recognition.start();
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error('语音识别启动失败');
      setError(errorObj.message);
      setIsRecording(false);
      setIsProcessing(false);
      onError?.(errorObj);
    }
  }, [language, onResult, onError]);

  const startRecordingServer = useCallback(async () => {
    try {
      setError(null);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;

      const preferredMimeType = pickSupportedAudioMimeType();
      const mediaRecorder = preferredMimeType
        ? new MediaRecorder(stream, { mimeType: preferredMimeType })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }

        const blobType = mediaRecorder.mimeType || preferredMimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: blobType });
        const reader = new FileReader();

        reader.onloadend = async () => {
          const base64Audio = reader.result as string;
          setIsProcessing(true);

          try {
            const { speechToText } = await import('@/lib/backendApi');
            const transcribedText = await speechToText(base64Audio, toServerLanguage(language));

            if (transcribedText && onResult) {
              onResult(transcribedText);
            }
          } catch (err) {
            const error = err instanceof Error ? err : new Error('Unknown error');
            const isConfigError =
              error.message.includes('not configured') ||
              error.message.includes('credentials');

            if (isConfigError) {
              setError('语音服务未配置，请使用文字输入');
            } else {
              setError(error.message);
            }

            onError?.(error);
          } finally {
            setIsProcessing(false);
          }
        };

        reader.readAsDataURL(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to start recording');
      setError(error.message);
      setIsRecording(false);
      onError?.(error);
    }
  }, [language, onResult, onError]);

  const startRecording = useCallback(async () => {
    const mode = getSpeechMode();
    if (mode === 'browser') {
      await startRecordingBrowser();
      return;
    }
    await startRecordingServer();
  }, [startRecordingBrowser, startRecordingServer]);

  const stopRecording = useCallback(async () => {
    setIsRecording(false);

    const mode = getSpeechMode();
    if (mode === 'browser') {
      try {
        recognitionRef.current?.stop();
      } catch {
        /* ignore */
      }
      return;
    }

    try {
      mediaRecorderRef.current?.stop();
    } catch {
      /* ignore */
    }
  }, []);

  const cancelRecording = useCallback(() => {
    setIsRecording(false);
    setIsProcessing(false);
    setError(null);

    const mode = getSpeechMode();
    if (mode === 'browser') {
      try {
        recognitionRef.current?.abort();
      } catch {
        /* ignore */
      }
      return;
    }

    try {
      mediaRecorderRef.current?.stop();
    } catch {
      /* ignore */
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    audioChunksRef.current = [];
  }, []);

  return {
    isRecording,
    isProcessing,
    error,
    startRecording,
    stopRecording,
    cancelRecording,
  };
}
