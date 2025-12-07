
import React, { useEffect, useState, useRef } from 'react';

interface TerminalProps {
  message: string;
  loading: boolean;
}

export const Terminal: React.FC<TerminalProps> = ({ message, loading }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isAlert, setIsAlert] = useState(false);
  const intervalRef = useRef<number | null>(null);

  // Visual flare effect when message changes
  useEffect(() => {
    if (message) {
        setIsAlert(true);
        const timer = setTimeout(() => setIsAlert(false), 600);
        return () => clearTimeout(timer);
    }
  }, [message]);

  // Typewriter effect
  useEffect(() => {
    // Reset state immediately
    setDisplayedText('');
    
    if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
    }

    if (!message) return;

    // Local variable ensures index always starts at 0 for this specific effect run
    let charIndex = 0;
    const messageLength = message.length;

    intervalRef.current = window.setInterval(() => {
      if (charIndex < messageLength) {
        const charToAdd = message.charAt(charIndex);
        setDisplayedText((prev) => prev + charToAdd);
        charIndex++;
      } else {
        if (intervalRef.current) window.clearInterval(intervalRef.current);
      }
    }, 30); // Speed of typing

    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [message]);

  return (
    <div className={`w-full max-w-2xl mx-auto mt-4 border-2 bg-black/80 px-6 py-4 rounded-lg backdrop-blur-sm relative overflow-hidden group transition-all duration-300 
        ${isAlert ? 'border-green-400 shadow-[0_0_20px_rgba(74,222,128,0.4)] scale-[1.01]' : 'border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.2)]'}
    `}>
      <div className="absolute top-0 left-0 w-full h-1 bg-green-500/30 animate-pulse" />
      
      <div className="flex items-center gap-2 mb-2 text-green-400 text-xs font-bold uppercase tracking-widest border-b border-green-900/50 pb-2">
        <div className={`w-2 h-2 bg-green-500 rounded-full ${loading ? 'animate-ping' : ''}`} />
        <span>Incoming Transmission // OVERLORD_CHANNEL_01</span>
      </div>

      {/* Increased padding to pl-4 to ensure no clipping occurs */}
      <div className="font-mono text-green-300 text-sm md:text-base min-h-[3rem] pl-4">
        {loading ? (
          <span className="animate-pulse">Deciphering alien signal...</span>
        ) : (
          <>
            {displayedText}
            <span className="animate-pulse inline-block w-2 h-4 bg-green-500 ml-1 align-middle" />
          </>
        )}
      </div>
    </div>
  );
};
