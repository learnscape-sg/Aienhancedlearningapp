import { useState, useRef, useCallback } from 'react';

// 计算 UTF-8 字节数的辅助函数
function getByteLength(str: string): number {
  // 在浏览器环境中使用 Blob API 计算字节数
  return new Blob([str]).size;
}

// 移除emoji和特殊格式字符的函数
function removeEmojis(text: string): string {
  // 匹配各种emoji字符（包括Unicode范围、组合字符等）
  const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F700}-\u{1F77F}]|[\u{1F780}-\u{1F7FF}]|[\u{1F800}-\u{1F8FF}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FAFF}]|[\u{200D}]|[\u{FE00}-\u{FE0F}]|[\u{20D0}-\u{20FF}]/gu;
  let cleaned = text.replace(emojiRegex, '');
  
  // 先移除完整的拼音标注模式：⟪汉字⧸拼音⟫（包括换行和空格）
  cleaned = cleaned.replace(/⟪[^⟫]*⧸[^⟫]*⟫/g, '');
  
  // 移除不完整的拼音标注（更彻底）
  cleaned = cleaned.replace(/⟪[^⧸⟫]*⧸[^⟫]*/g, ''); // ⟪...⧸...（没有结束）
  cleaned = cleaned.replace(/⟪[^⟫]*/g, ''); // 剩余的 ⟪...（没有结束）
  cleaned = cleaned.replace(/⧸[^⟫]*⟫/g, ''); // ⧸...⟫（没有开始）
  
  // 移除单个特殊字符（确保完全清除）
  cleaned = cleaned.replace(/[⟪⟫⧸]/g, '');
  
  // 移除音乐符号范围（U+1D100 到 U+1D1FF）
  cleaned = cleaned.replace(/[\u{1D100}-\u{1D1FF}]/gu, '');
  
  // 移除多余的空白字符
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  return cleaned;
}

// 分割过长句子的函数（基于字节数，而不是字符数）
// Google Cloud TTS 限制：
// - 整个请求最大 5000 字节（约1666个中文字符）
// - 单个句子建议不超过 500-600 字符（Neural2等语音模型）
// - 为了安全，我们使用更保守的字节限制，避免单句过长
function splitLongSentences(text: string, maxBytes: number = 800): string {
  const safeText = text.replace(/\s+/g, ' ').trim();
  if (!safeText) {
    return '';
  }

  // 首先尝试在句号、问号、感叹号、换行符处分割
  const sentenceEnders = /([。！？\n])/;
  const parts = safeText.split(sentenceEnders);
  const sentences: string[] = [];
  let current = '';

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part) continue;

    // 如果是句末标点或换行
    if (/^[。！？\n]$/.test(part)) {
      current += part;
      if (current.trim()) {
        sentences.push(current.trim());
      }
      current = '';
      continue;
    }

    // 如果加上这部分会超过字节限制
    const currentBytes = getByteLength(current);
    const partBytes = getByteLength(part);
    if (currentBytes + partBytes > maxBytes) {
      if (current.trim()) {
        sentences.push(current.trim());
      }
      
      // 如果这部分本身就很长，需要进一步分割
      if (partBytes > maxBytes) {
        // 尝试在逗号、分号、顿号处分割
        const subParts = part.split(/([，；、])/);
        let subCurrent = '';
        
        for (const subPart of subParts) {
          if (!subPart) continue;
          
          if (/^[，；、]$/.test(subPart)) {
            subCurrent += subPart;
            if (subCurrent.trim()) {
              sentences.push(subCurrent.trim());
            }
            subCurrent = '';
          } else {
            const subCurrentBytes = getByteLength(subCurrent);
            const subPartBytes = getByteLength(subPart);
            
            if (subCurrentBytes + subPartBytes > maxBytes) {
              if (subCurrent.trim()) {
                sentences.push(subCurrent.trim());
              }
              // 如果单个部分仍然太长，强制按字节数分割
              if (subPartBytes > maxBytes) {
                // 按字节数强制分割
                let charIndex = 0;
                while (charIndex < subPart.length) {
                  let chunk = '';
                  let chunkBytes = 0;
                  while (charIndex < subPart.length && chunkBytes < maxBytes) {
                    const char = subPart[charIndex];
                    const charBytes = getByteLength(char);
                    if (chunkBytes + charBytes > maxBytes) break;
                    chunk += char;
                    chunkBytes += charBytes;
                    charIndex++;
                  }
                  if (chunk.trim()) {
                    sentences.push(chunk.trim());
                  }
                }
                subCurrent = '';
              } else {
                subCurrent = subPart;
              }
            } else {
              subCurrent += subPart;
            }
          }
        }
        
        if (subCurrent.trim()) {
          current = subCurrent;
        } else {
          current = '';
        }
      } else {
        current = part;
      }
    } else {
      current += part;
    }
  }

  if (current.trim()) {
    sentences.push(current.trim());
  }

  // 过滤空字符串并连接
  const result = sentences.filter(s => s.length > 0);
  if (result.length === 0) {
    return safeText; // 如果分割后为空，返回原文本
  }
  
  // 用句号连接，确保每个句子都有句号结尾（除了最后一个）
  const finalText = result.join('。');
  return safeText.endsWith('。') || safeText.endsWith('！') || safeText.endsWith('？') 
    ? finalText 
    : finalText + '。';
}

function splitLongSentencesToChunks(text: string, maxBytes: number = 800): string[] {
  const safeText = text.replace(/\s+/g, ' ').trim();
  if (!safeText) {
    return [];
  }

  const sentenceEnders = /([。！？\n])/;
  const parts = safeText.split(sentenceEnders);
  const sentences: string[] = [];
  let current = '';

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part) continue;

    if (/^[。！？\n]$/.test(part)) {
      current += part;
      if (current.trim()) sentences.push(current.trim());
      current = '';
      continue;
    }

    const currentBytes = getByteLength(current);
    const partBytes = getByteLength(part);

    if (currentBytes + partBytes > maxBytes) {
      if (current.trim()) sentences.push(current.trim());

      if (partBytes > maxBytes) {
        const subParts = part.split(/([，；、])/);
        let subCurrent = '';

        for (const subPart of subParts) {
          if (!subPart) continue;

          if (/^[，；、]$/.test(subPart)) {
            subCurrent += subPart;
            if (subCurrent.trim()) sentences.push(subCurrent.trim());
            subCurrent = '';
          } else {
            const subCurrentBytes = getByteLength(subCurrent);
            const subPartBytes = getByteLength(subPart);

            if (subCurrentBytes + subPartBytes > maxBytes) {
              if (subCurrent.trim()) sentences.push(subCurrent.trim());

              if (subPartBytes > maxBytes) {
                let charIndex = 0;
                while (charIndex < subPart.length) {
                  let chunk = '';
                  let chunkBytes = 0;
                  while (charIndex < subPart.length && chunkBytes < maxBytes) {
                    const char = subPart[charIndex];
                    const charBytes = getByteLength(char);
                    if (chunkBytes + charBytes > maxBytes) break;
                    chunk += char;
                    chunkBytes += charBytes;
                    charIndex++;
                  }
                  if (chunk.trim()) sentences.push(chunk.trim());
                }
                subCurrent = '';
              } else {
                subCurrent = subPart;
              }
            } else {
              subCurrent += subPart;
            }
          }
        }

        if (subCurrent.trim()) {
          current = subCurrent;
        } else {
          current = '';
        }
      } else {
        current = part;
      }
    } else {
      current += part;
    }
  }

  if (current.trim()) sentences.push(current.trim());

  return sentences.filter(s => s.length > 0);
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  mapper: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let idx = 0;

  const workers = new Array(Math.min(limit, items.length)).fill(0).map(async () => {
    while (idx < items.length) {
      const current = idx++;
      results[current] = await mapper(items[current], current);
    }
  });

  await Promise.all(workers);
  return results;
}

interface UseTextToSpeechOptions {
  language?: string;
  voiceName?: string;
  onPlayStart?: () => void;
  onPlayEnd?: () => void;
  onError?: (error: Error) => void;
}

interface UseTextToSpeechReturn {
  isPlaying: boolean;
  isLoading: boolean;
  error: string | null;
  play: (text: string) => Promise<void>;
  stop: () => void;
  pause: () => void;
}

export function useTextToSpeech(
  options: UseTextToSpeechOptions = {}
): UseTextToSpeechReturn {
  const { 
    language = 'cmn-CN', 
    voiceName = 'cmn-CN-Chirp3-HD-Despina',
    onPlayStart,
    onPlayEnd,
    onError 
  } = options;
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playRequestIdRef = useRef(0);

  const play = useCallback(async (text: string) => {
    if (!text.trim()) {
      return;
    }

    try {
      setError(null);
      setIsLoading(true);

      // Stop any currently playing audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      // 先移除特殊字符（这些字符占用更多字节且对TTS无意义）
      let cleanedText = removeEmojis(text);
      
      if (!cleanedText) {
        setIsLoading(false);
        return;
      }

      // 不再预先拼句，直接按chunk分段，避免插入额外标点被读出

      const sendTTSRequest = async (textToSend: string): Promise<string> => {
        const { textToSpeech } = await import('@/lib/backendApi');
        return textToSpeech(textToSend, language, voiceName);
      };

      // 尝试发送请求，如果失败则重试
      let retryCount = 0;
      const maxRetries = 2;
      let currentText = cleanedText;
      let currentMaxBytes = 800; // 使用字节数而不是字符数
      const currentRequestId = ++playRequestIdRef.current;
      let hasStarted = false;

      while (retryCount <= maxRetries) {
        try {
          const chunks = splitLongSentencesToChunks(currentText, currentMaxBytes);
          if (chunks.length === 0) {
            setIsLoading(false);
            return;
          }

          const audioUrls = await mapWithConcurrency(chunks, 10, sendTTSRequest);

          for (let i = 0; i < audioUrls.length; i++) {
            if (playRequestIdRef.current !== currentRequestId) {
              break;
            }

            const audioDataUrl = audioUrls[i];
            const audio = new Audio(audioDataUrl);
            audioRef.current = audio;

            await new Promise<void>((resolve, reject) => {
              audio.onplay = () => {
                if (!hasStarted) {
                  hasStarted = true;
                  setIsPlaying(true);
                  setIsLoading(false);
                  if (onPlayStart) {
                    onPlayStart();
                  }
                }
              };

              audio.onended = () => {
                resolve();
              };

              audio.onerror = (e) => {
                const audioElement = (e instanceof Event ? e.target : audio) as HTMLAudioElement | null;
                let errorMessage = 'Audio playback failed';
                
                if (audioElement?.error) {
                  const mediaError = audioElement.error;
                  switch (mediaError.code) {
                    case mediaError.MEDIA_ERR_ABORTED:
                      errorMessage = 'Audio playback was aborted';
                      break;
                    case mediaError.MEDIA_ERR_NETWORK:
                      errorMessage = 'Network error while loading audio';
                      break;
                    case mediaError.MEDIA_ERR_DECODE:
                      errorMessage = 'Audio decoding error';
                      break;
                    case mediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
                      errorMessage = 'Audio format not supported';
                      break;
                    default:
                      errorMessage = `Audio error: ${mediaError.message || 'Unknown error'}`;
                  }
                }
                
                reject(new Error(errorMessage));
              };

              audio.play().catch((e: unknown) => {
                const maybeErr = e as { name?: string; message?: string };
                if (maybeErr?.name === 'NotAllowedError') {
                  reject(new Error('需要先点击页面或按任意键，才能播放语音'));
                  return;
                }
                reject(e as Error);
              });
            });
          }

          if (playRequestIdRef.current === currentRequestId && hasStarted) {
            setIsPlaying(false);
            audioRef.current = null;
            if (onPlayEnd) {
              onPlayEnd();
            }
          }
          return; // 成功，直接返回
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          
          // 如果错误是句子太长，尝试用更小的字节数重新分割
          if ((errorMessage.includes('too long') || errorMessage.includes('sentence')) && retryCount < maxRetries) {
            retryCount++;
            // 每次重试时减小最大字节数（每次减少500字节）
            currentMaxBytes = Math.max(500, currentMaxBytes - 200);
            // 重新清理和分割文本
            currentText = removeEmojis(text);
            
            // 如果文本没有变化，说明无法进一步分割，直接抛出错误
            if (currentText === cleanedText && retryCount > 1) {
              throw err;
            }
            
            continue; // 重试
          }
          
          // 其他错误或重试次数用完，抛出错误
          throw err;
        }
      }
    } catch (err) {
      // 更好地处理不同类型的错误
      let error: Error;
      if (err instanceof Error) {
        error = err;
      } else if (err && typeof err === 'object' && 'target' in err) {
        // 如果是Event对象，提取更多信息
        const event = err as Event;
        const target = event.target as HTMLAudioElement | null;
        const errorMessage = target?.error 
          ? `Audio error: ${target.error.code} - ${target.error.message}`
          : 'Audio playback failed';
        error = new Error(errorMessage);
      } else {
        // 尝试转换为字符串
        const errorMessage = err?.toString() || String(err) || 'Unknown error';
        error = new Error(errorMessage);
      }
      
      // Check if it's a configuration error (graceful degradation)
      const isConfigError = error.message.includes('not configured') || 
                           error.message.includes('credentials');
      
      if (isConfigError) {
        setError('语音服务未配置，仅显示文字回复');
      } else {
        setError(error.message);
      }
      
      setIsLoading(false);
      setIsPlaying(false);
      if (onError) {
        onError(error);
      }
    }
  }, [language, voiceName, onPlayStart, onPlayEnd, onError]);

  const stop = useCallback(() => {
    playRequestIdRef.current += 1;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
      setIsPlaying(false);
    }
  }, []);

  const pause = useCallback(() => {
    if (audioRef.current && isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, [isPlaying]);

  return {
    isPlaying,
    isLoading,
    error,
    play,
    stop,
    pause,
  };
}
