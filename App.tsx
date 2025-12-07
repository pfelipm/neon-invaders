import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { Terminal } from './components/Terminal';
import { GameState } from './types';
import { getAlienTaunt, TauntSituation } from './services/geminiService';
import { initAudio, playLevelUp, playGameOver, playBossWarning } from './services/audioService';
import { KEY_CODES, BOSS_LEVEL_INTERVAL } from './constants';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [aiMessage, setAiMessage] = useState<string>("Initialization complete. Waiting for pilot...");
  const [loadingMessage, setLoadingMessage] = useState(false);
  
  // Rate limiting ref
  const lastTauntTimeRef = useRef<number>(0);

  const fetchTaunt = async (situation: TauntSituation) => {
    const now = Date.now();
    // Rate limit PLAYER_HIT events to once every 6 seconds to save API quota
    if (situation === 'PLAYER_HIT' && now - lastTauntTimeRef.current < 6000) {
      return;
    }
    
    lastTauntTimeRef.current = now;
    setLoadingMessage(true);
    const msg = await getAlienTaunt(situation, level);
    setAiMessage(msg);
    setLoadingMessage(false);
  };

  const startGame = useCallback(() => {
    initAudio(); // Start AudioContext on user gesture
    setScore(0);
    setLives(3);
    setLevel(1);
    setGameState(GameState.PLAYING);
    fetchTaunt('START');
  }, []);

  const handleGameOver = useCallback(() => {
    playGameOver();
    setGameState(GameState.GAME_OVER);
    fetchTaunt('GAME_OVER');
  }, []);

  const handlePlayerHit = useCallback(() => {
    fetchTaunt('PLAYER_HIT');
  }, [level]);

  const handleLevelComplete = useCallback(() => {
    playLevelUp();
    setGameState(GameState.VICTORY);
    
    // Determine if we just beat a boss or a normal level
    const justDefeatedBoss = level % BOSS_LEVEL_INTERVAL === 0;
    
    if (justDefeatedBoss) {
      fetchTaunt('BOSS_DEFEATED');
    } else {
      fetchTaunt('LEVEL_UP');
    }
    
    setTimeout(() => {
      const nextLevel = level + 1;
      setLevel(nextLevel);
      
      if (nextLevel % BOSS_LEVEL_INTERVAL === 0) {
          setGameState(GameState.BOSS_WARNING);
          playBossWarning();
          fetchTaunt('BOSS_IMMINENT'); // Trigger Warning Taunt
          setTimeout(() => {
              setGameState(GameState.PLAYING);
          }, 3500);
      } else {
          setGameState(GameState.PLAYING);
      }
    }, 3000); 
  }, [level]);

  const handleScoreUpdate = (newScore: number) => {
      setScore(newScore);
  };

  // Global Key Listener for Pause
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (KEY_CODES.PAUSE.includes(e.code)) {
        setGameState(prev => {
          if (prev === GameState.PLAYING) return GameState.PAUSED;
          if (prev === GameState.PAUSED) return GameState.PLAYING;
          return prev;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-4 relative">
      {/* CRT Lines Overlay */}
      <div className="fixed inset-0 crt-overlay z-50 pointer-events-none"></div>

      {/* Header / HUD */}
      <div className="w-full max-w-[800px] flex justify-between items-end mb-2 z-10 font-mono text-cyan-400 select-none">
        <div>
          <h1 className="text-3xl font-black italic tracking-tighter neon-text text-white mb-1">
            NEON<span className="text-cyan-400">INVADERS</span>
          </h1>
          <div className="text-xs text-cyan-600">GEMINI_CORE // CONNECTED</div>
        </div>
        <div className="text-right">
          <div className="text-sm text-purple-400">LEVEL {level}</div>
          <div className="text-2xl font-bold text-white">SCORE: {score.toString().padStart(6, '0')}</div>
          <div className="flex gap-1 justify-end mt-1">
            {Array.from({ length: Math.max(0, lives) }).map((_, i) => (
              <div key={i} className="w-4 h-4 bg-cyan-500 rounded-sm shadow-[0_0_5px_#06b6d4]"></div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Game Area */}
      <div className="relative z-10 w-full flex flex-col items-center">
        
        {/* Game Canvas */}
        <div className="relative group">
           <GameCanvas 
              gameState={gameState}
              score={score}
              setScore={handleScoreUpdate}
              setLives={setLives}
              onGameOver={handleGameOver}
              onLevelComplete={handleLevelComplete}
              onPlayerHit={handlePlayerHit}
              level={level}
           />
           
           {/* Menu Overlays */}
           {gameState === GameState.MENU && (
             <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm rounded-lg">
                <button 
                  onClick={startGame}
                  className="px-8 py-4 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xl rounded shadow-[0_0_15px_rgba(8,145,178,0.5)] transition-all transform hover:scale-105 hover:shadow-[0_0_25px_rgba(8,145,178,0.8)]"
                >
                  INITIATE DEFENSE
                </button>
                <p className="mt-4 text-cyan-300 text-sm animate-pulse">PRESS START TO ENGAGE</p>
             </div>
           )}

           {gameState === GameState.GAME_OVER && (
             <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-900/80 backdrop-blur-sm rounded-lg">
                <h2 className="text-4xl font-bold text-red-500 neon-text mb-4">MISSION FAILED</h2>
                <div className="text-white mb-6 text-xl">FINAL SCORE: {score}</div>
                <button 
                  onClick={startGame}
                  className="px-8 py-3 bg-white text-red-900 font-bold text-lg rounded hover:bg-gray-200 transition-colors"
                >
                  RETRY
                </button>
             </div>
           )}

           {gameState === GameState.VICTORY && (
             <div className="absolute inset-0 flex flex-col items-center justify-center bg-green-900/80 backdrop-blur-sm rounded-lg">
                <h2 className="text-4xl font-bold text-green-400 neon-text mb-2">WAVE CLEARED</h2>
                <p className="text-green-200 animate-pulse">PREPARING NEXT WAVE...</p>
             </div>
           )}

           {gameState === GameState.BOSS_WARNING && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-950/90 backdrop-blur-sm rounded-lg z-50 overflow-hidden">
                  <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjMjAwIiAvPgo8cmVjdCB3aWR0aD0iMSIgaGVpZ2h0PSIxIiBmaWxsPSIjNDAwIiAvPgo8L3N2Zz4=')] opacity-20"></div>
                  <div className="border-y-4 border-red-500 w-full text-center py-12 bg-black/80 relative animate-pulse">
                      <div className="absolute top-0 left-0 w-full h-1 bg-red-500 shadow-[0_0_10px_#ef4444]"></div>
                      <h2 className="text-6xl font-black text-red-500 neon-text tracking-[0.5em] animate-ping mb-4">WARNING</h2>
                      <div className="space-y-2">
                        <p className="text-red-200 font-mono text-xl tracking-widest uppercase">Massive Signal Detected</p>
                        <p className="text-red-400 font-mono text-sm tracking-wider">BOSS APPROACHING</p>
                      </div>
                      <div className="absolute bottom-0 left-0 w-full h-1 bg-red-500 shadow-[0_0_10px_#ef4444]"></div>
                  </div>
              </div>
           )}

           {gameState === GameState.PAUSED && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm rounded-lg z-50">
                <h2 className="text-5xl font-black text-white neon-text mb-4 tracking-widest">PAUSED</h2>
                <p className="text-cyan-300 animate-pulse">PRESS 'P' or 'ESC' TO RESUME</p>
                <button 
                  onClick={() => setGameState(GameState.PLAYING)}
                  className="mt-6 px-6 py-2 border border-cyan-500 text-cyan-400 hover:bg-cyan-500/20 rounded transition-all"
                >
                  RESUME MISSION
                </button>
              </div>
           )}
        </div>

        {/* AI Terminal */}
        <Terminal message={aiMessage} loading={loadingMessage} />
        
        <div className="mt-4 text-gray-600 text-xs font-mono text-center max-w-lg">
          CONTROLS: ARROWS/WASD to Move & Shoot. 'P' or 'ESC' to Pause. <br/>
          Powered by React, Canvas & Google Gemini API.
        </div>
      </div>
    </div>
  );
};

export default App;