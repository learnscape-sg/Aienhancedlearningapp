import React, { useEffect, useRef, useState } from 'react';
import Lottie from 'lottie-react';

export type AvatarState = 'idle' | 'speaking' | 'thinking' | 'listening';

interface AnimatedAvatarProps {
  state: AvatarState;
  size?: number;
  className?: string;
}

// Simple fallback animation component when Lottie files are not available
const FallbackAvatar: React.FC<{ state: AvatarState; size: number }> = ({ state, size }) => {
  const getEmoji = () => {
    switch (state) {
      case 'speaking':
        return '🗣️';
      case 'thinking':
        return '🤔';
      case 'listening':
        return '👂';
      default:
        return '😊';
    }
  };

  return (
    <div
      className="flex items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-purple-500"
      style={{ width: size, height: size }}
    >
      <span
        className="text-4xl animate-pulse"
        style={{ fontSize: size * 0.5 }}
      >
        {getEmoji()}
      </span>
    </div>
  );
};

export const AnimatedAvatar: React.FC<AnimatedAvatarProps> = ({
  state,
  size = 80,
  className = '',
}) => {
  const [animationData, setAnimationData] = useState<unknown>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const lottieRef = useRef<{ goToAndPlay: (frame: number) => void } | null>(null);

  useEffect(() => {
    const loadAnimation = async () => {
      setIsLoading(true);
      setHasError(false);

      try {
        const animationPath = `/animations/${state}.json`;
        const response = await fetch(animationPath);

        if (response.ok) {
          const data = await response.json();
          setAnimationData(data);
          setHasError(false);
        } else {
          setHasError(true);
        }
      } catch (error) {
        console.warn(`Animation file for state "${state}" not found, using fallback`, error);
        setHasError(true);
      } finally {
        setIsLoading(false);
      }
    };

    loadAnimation();
  }, [state]);

  // Control animation playback based on state
  useEffect(() => {
    if (lottieRef.current && animationData && !hasError) {
      lottieRef.current.goToAndPlay(0);
    }
  }, [state, animationData, hasError]);

  // 检查是否使用了w-full或h-full类，如果是则使用100%尺寸
  const useFullSize = className.includes('w-full') || className.includes('h-full');

  if (isLoading) {
    return (
      <div
        className={`flex items-center justify-center ${className}`}
        style={useFullSize ? { width: '100%', height: '100%' } : { width: size, height: size }}
      >
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (hasError || !animationData) {
    return (
      <div
        className={`flex items-center justify-center ${className}`}
        style={useFullSize ? { width: '100%', height: '100%' } : { width: size, height: size }}
      >
        <FallbackAvatar state={state} size={useFullSize ? 200 : size} />
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-center ${className}`}
      style={useFullSize ? { width: '100%', height: '100%' } : { width: size, height: size }}
    >
      <Lottie
        lottieRef={lottieRef}
        animationData={animationData}
        loop={state === 'idle' || state === 'thinking' || state === 'listening'}
        autoplay={true}
        style={useFullSize ? { width: '100%', height: '100%' } : { width: size, height: size }}
      />
    </div>
  );
};
