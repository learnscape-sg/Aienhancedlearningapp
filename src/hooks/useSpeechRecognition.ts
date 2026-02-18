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
    recognition.continuous = false;
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
        const result = event.results?.[0]?.[0]?.transcript?.trim();
        if (result) onResult?.(result);
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

      setIsProcessing(true);
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

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

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

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
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
    const mode = getSpeechMode();
    if (mode === 'browser') {
      if (recognitionRef.current && isRecording) recognitionRef.current.stop();
      return;
    }
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  const cancelRecording = useCallback(() => {
    const mode = getSpeechMode();
    if (mode === 'browser') {
      if (recognitionRef.current && isRecording) recognitionRef.current.abort();
      setIsRecording(false);
      setIsProcessing(false);
      setError(null);
      return;
    }

    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    audioChunksRef.current = [];
    setError(null);
  }, [isRecording]);

  return {
    isRecording,
    isProcessing,
    error,
    startRecording,
    stopRecording,
    cancelRecording,
  };
}
