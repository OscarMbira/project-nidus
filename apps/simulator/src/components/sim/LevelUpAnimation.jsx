import React, { useEffect, useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { Sparkles, Trophy, Star } from 'lucide-react';

const LevelUpAnimation = ({ level, onComplete }) => {
  const { theme } = useTheme();
  const [show, setShow] = useState(true);
  const [animationPhase, setAnimationPhase] = useState(0);

  useEffect(() => {
    // Phase 1: Initial burst
    const timer1 = setTimeout(() => setAnimationPhase(1), 300);
    // Phase 2: Text reveal
    const timer2 = setTimeout(() => setAnimationPhase(2), 600);
    // Phase 3: Complete
    const timer3 = setTimeout(() => {
      setAnimationPhase(3);
      setTimeout(() => {
        setShow(false);
        if (onComplete) onComplete();
      }, 2000);
    }, 1500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [onComplete]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
      <div className="relative">
        {/* Sparkle effects */}
        {animationPhase >= 1 && (
          <>
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="absolute animate-ping"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 0.5}s`,
                  animationDuration: `${1 + Math.random()}s`,
                }}
              >
                <Sparkles className="w-4 h-4 text-yellow-400" />
              </div>
            ))}
          </>
        )}

        {/* Main content */}
        <div
          className={`relative transform transition-all duration-500 ${
            animationPhase >= 1 ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
          }`}
        >
          {/* Trophy icon */}
          <div className="flex justify-center mb-4">
            <div
              className={`p-8 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 ${
                animationPhase >= 1 ? 'animate-bounce' : ''
              }`}
            >
              <Trophy className="w-24 h-24 text-white" />
            </div>
          </div>

          {/* Level text */}
          {animationPhase >= 2 && (
            <div className="text-center">
              <div className="text-6xl font-bold text-white mb-2 animate-pulse">
                LEVEL {level}
              </div>
              <div className="text-2xl text-yellow-300 font-semibold">
                Congratulations!
              </div>
              <div className="flex justify-center mt-4 space-x-2">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className="w-6 h-6 text-yellow-400 animate-spin"
                    style={{ animationDelay: `${i * 0.1}s` }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LevelUpAnimation;

