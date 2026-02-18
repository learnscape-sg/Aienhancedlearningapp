import React, { useEffect, useRef, useState } from 'react';
import Lottie from 'lottie-react';

export type AvatarState = 'idle' | 'speaking' | 'thinking' | 'listening';

interface AnimatedAvatarProps {
  state: AvatarState;
  size?: number;
  className?: string;
}

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
      <span className="text-4xl animate-pulse" style={{ fontSize: size * 0.5 }}>
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
  const [hasError, setHasError] = useState(false);
  const lottieRef = useRef<unknown>(null);

  useEffect(() => {
    const loadAnimation = async () => {
      setHasError(false);
      try {
        const animationPath = `/animations/${state}.json`;
        const response = await fetch(animationPath);
        if (response.ok) {
          const data = await response.json();
          setAnimationData(data);
        } else {
          setHasError(true);
        }
      } catch {
        setHasError(true);
      }
    };
    loadAnimation();
  }, [state]);

  if (hasError || !animationData) {
    return (
      <div className={className}>
        <FallbackAvatar state={state} size={size} />
      </div>
    );
  }

  return (
    <div className={className} style={{ width: size, height: size }}>
      <Lottie
        lottieRef={lottieRef}
        animationData={animationData}
        loop={state === 'idle' || state === 'thinking' || state === 'listening'}
        style={{ width: size, height: size }}
      />
    </div>
  );
};
