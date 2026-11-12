/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { LevelSelectModal } from './components/LevelSelectModal';
import { LanternSelector } from './components/LanternSelector';
import { UnityExportModal } from './components/UnityExportModal';
import { CulturalCodexModal } from './components/CulturalCodexModal';
import { LevelResultModal } from './components/LevelResultModal';
import { LEVELS_DATA } from './data/levels';
import { LANTERNS_DATA } from './data/lanterns';
import { LevelConfig, LanternStats } from './types/game';
import { soundManager } from './utils/audio';
import {
  Compass,
  Code2,
  BookOpen,
  Volume2,
  VolumeX,
  RotateCcw,
  Sparkles,
  Smartphone,
  ChevronLeft,
  ChevronRight,
  Info,
} from 'lucide-react';

export default function App() {
  // Current game configuration
  const [currentLevel, setCurrentLevel] = useState<LevelConfig>(LEVELS_DATA[0]);
  const [selectedLantern, setSelectedLantern] = useState<LanternStats>(LANTERNS_DATA[0]);
  const [canvasKey, setCanvasKey] = useState<number>(1);

  // Persistent player progress
  const [completedLevels, setCompletedLevels] = useState<
    Record<number, { stars: number; gustsUsed: number; patternsCollected: number }>
  >(() => {
    try {
      const saved = localStorage.getItem('lantern_link_progress');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [collectedPatternIds, setCollectedPatternIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('lantern_link_patterns');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Modal active states
  const [showLevelSelect, setShowLevelSelect] = useState(false);
  const [showLanternSelect, setShowLanternSelect] = useState(false);
  const [showUnityExport, setShowUnityExport] = useState(false);
  const [showCulturalCodex, setShowCulturalCodex] = useState(false);

  // Level end result modal state
  const [levelResult, setLevelResult] = useState<{
    open: boolean;
    status: 'complete' | 'failed';
    reason?: 'gusts' | 'destroyed';
    stars: number;
    gustsUsed: number;
    patternsCollected: number;
  }>({
    open: false,
    status: 'complete',
    stars: 1,
    gustsUsed: 0,
    patternsCollected: 0,
  });

  // Cultural trivia toast
  const [triviaToast, setTriviaToast] = useState<{ name: string; trivia: string } | null>(null);
  const [isMuted, setIsMuted] = useState(soundManager.getIsMuted());

  // Save progress changes
  useEffect(() => {
    try {
      localStorage.setItem('lantern_link_progress', JSON.stringify(completedLevels));
    } catch {
      // ignore
    }
  }, [completedLevels]);

  useEffect(() => {
    try {
      localStorage.setItem('lantern_link_patterns', JSON.stringify(collectedPatternIds));
    } catch {
      // ignore
    }
  }, [collectedPatternIds]);

  const handleAudioToggle = () => {
    const unmuted = soundManager.toggleMute();
    setIsMuted(!unmuted);
  };

  const handleRestartLevel = () => {
    setLevelResult((prev) => ({ ...prev, open: false }));
    setCanvasKey((k) => k + 1);
  };

  const handleSelectLevel = (lvl: LevelConfig) => {
    setCurrentLevel(lvl);
    setLevelResult((prev) => ({ ...prev, open: false }));
    setCanvasKey((k) => k + 1);
  };

  const handleNextLevel = () => {
    const nextIdx = LEVELS_DATA.findIndex((l) => l.id === currentLevel.id) + 1;
    if (nextIdx < LEVELS_DATA.length) {
      setCurrentLevel(LEVELS_DATA[nextIdx]);
    } else {
      // Reached finale, go back to level 1 or show map
      setCurrentLevel(LEVELS_DATA[0]);
    }
    setLevelResult((prev) => ({ ...prev, open: false }));
    setCanvasKey((k) => k + 1);
  };

  const handleLevelComplete = (stars: number, gustsUsed: number, patternsCollected: number) => {
    setCompletedLevels((prev) => {
      const prevStars = prev[currentLevel.id]?.stars || 0;
      return {
        ...prev,
        [currentLevel.id]: {
          stars: Math.max(prevStars, stars),
          gustsUsed,
          patternsCollected,
        },
      };
    });

    setLevelResult({
      open: true,
      status: 'complete',
      stars,
      gustsUsed,
      patternsCollected,
    });
  };

  const handleLevelFailed = (reason: 'gusts' | 'destroyed') => {
    setLevelResult({
      open: true,
      status: 'failed',
      reason,
      stars: 0,
      gustsUsed: currentLevel.maxGusts,
      patternsCollected: 0,
    });
  };

  const handlePatternCollectedTrivia = (name: string, trivia: string) => {
    // Add to collected list
    setCollectedPatternIds((prev) => (prev.includes(name) ? prev : [...prev, name]));

    setTriviaToast({ name, trivia });
    setTimeout(() => {
      setTriviaToast(null);
    }, 4500);
  };

  const currentLevelIndex = LEVELS_DATA.findIndex((l) => l.id === currentLevel.id);

  return (
    <div className="min-h-screen bg-[#080914] text-slate-100 flex flex-col justify-between selection:bg-amber-500 selection:text-slate-950">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 border-b border-amber-500/20 bg-slate-950/80 backdrop-blur-md px-4 py-2.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
          {/* Brand Logo & Title */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-600 via-rose-600 to-amber-400 p-0.5 shadow-md shadow-amber-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center text-lg">
                🏮
              </div>
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-rose-300 font-cinzel tracking-wider">
                LANTERN LINK
              </h1>
              <p className="text-[10px] text-slate-400 font-medium tracking-wide hidden sm:block">
                Hành trình của những chiếc đèn lồng Hội An & Hanok
              </p>
            </div>
          </div>

          {/* Quick Action Navigation */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Unity Export C# Toolkit Button */}
            <button
              onClick={() => setShowUnityExport(true)}
              className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-rose-500/20 hover:from-amber-500/30 hover:to-rose-500/30 border border-amber-400/40 text-amber-300 text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
              title="Xuất mã nguồn Unity C# cho di động"
            >
              <Code2 className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden md:inline">Mã Nguồn Unity C#</span>
              <span className="md:hidden">Unity</span>
            </button>

            {/* Cultural Codex Lore Button */}
            <button
              onClick={() => setShowCulturalCodex(true)}
              className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-200 text-xs font-semibold border border-slate-700/80 flex items-center gap-1.5 transition"
              title="Sổ tay văn hóa Hội An & Hàn Quốc"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Sổ Tay Văn Hóa</span>
            </button>

            {/* Lantern Customizer Button */}
            <button
              onClick={() => setShowLanternSelect(true)}
              className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-200 text-xs font-semibold border border-slate-700/80 flex items-center gap-1.5 transition"
            >
              <span className="text-sm">🏮</span>
              <span className="hidden sm:inline">{selectedLantern.name}</span>
            </button>

            {/* Level Select Map Button */}
            <button
              onClick={() => setShowLevelSelect(true)}
              className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-1.5 transition"
            >
              <Compass className="w-3.5 h-3.5 text-amber-400" />
              <span>Bản Đồ</span>
            </button>

            {/* Sound Toggle */}
            <button
              onClick={handleAudioToggle}
              className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700/80 transition"
              title={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Playable Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-3 sm:p-5 flex flex-col items-center justify-center">
        {/* Cultural Level Introduction Card */}
        <div className="w-full max-w-[840px] mb-3 bg-slate-900/60 border border-slate-800/80 rounded-2xl px-4 py-2.5 flex items-center justify-between text-xs backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <button
              disabled={currentLevelIndex === 0}
              onClick={() => handleSelectLevel(LEVELS_DATA[currentLevelIndex - 1])}
              className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft className="w-4 h-4 text-slate-300" />
            </button>
            <div>
              <div className="font-bold text-amber-300 text-xs sm:text-sm">
                {currentLevel.title}
              </div>
              <div className="text-[11px] text-slate-400 italic line-clamp-1">
                "{currentLevel.culturalStory}"
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRestartLevel}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              title="Chơi lại màn này"
            >
              <RotateCcw className="w-4 h-4 text-amber-400" />
            </button>
            <button
              disabled={currentLevelIndex === LEVELS_DATA.length - 1}
              onClick={() => handleSelectLevel(LEVELS_DATA[currentLevelIndex + 1])}
              className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
              <ChevronRight className="w-4 h-4 text-slate-300" />
            </button>
          </div>
        </div>

        {/* 2D Physics Canvas */}
        <GameCanvas
          key={canvasKey}
          level={currentLevel}
          lantern={selectedLantern}
          onLevelComplete={handleLevelComplete}
          onLevelFailed={handleLevelFailed}
          onPatternCollectedTrivia={handlePatternCollectedTrivia}
        />

        {/* Cultural Trivia Toast Notification */}
        {triviaToast && (
          <div className="fixed bottom-6 right-6 z-40 max-w-sm bg-gradient-to-r from-amber-950 via-slate-900 to-slate-900 border border-amber-400/50 rounded-2xl p-4 shadow-2xl animate-bounce">
            <div className="flex items-start gap-2.5">
              <span className="text-xl">✨</span>
              <div>
                <div className="text-xs font-bold text-amber-300">
                  Thu Thập: {triviaToast.name}
                </div>
                <div className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                  {triviaToast.trivia}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer Info */}
      <footer className="border-t border-slate-800/80 bg-slate-950/60 py-3 px-4 text-center text-[11px] text-slate-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span>🏮 Hội An (Việt Nam) & Làng Hanok (Hàn Quốc)</span>
            <span>•</span>
            <span className="text-slate-400">Vật lý 2D Hyper-casual & Lễ hội hoa đăng</span>
          </div>
          <div className="flex items-center gap-3 text-slate-400">
            <button
              onClick={() => setShowUnityExport(true)}
              className="hover:text-amber-400 underline underline-offset-2 flex items-center gap-1"
            >
              <Smartphone className="w-3.5 h-3.5" /> Hướng dẫn xuất bản Android/iOS
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      {showLevelSelect && (
        <LevelSelectModal
          currentLevelId={currentLevel.id}
          completedLevels={completedLevels}
          onSelectLevel={handleSelectLevel}
          onClose={() => setShowLevelSelect(false)}
        />
      )}

      {showLanternSelect && (
        <LanternSelector
          selectedLantern={selectedLantern}
          patternsCount={collectedPatternIds.length}
          completedLevelsCount={Object.keys(completedLevels).length}
          onSelectLantern={(lnt) => {
            setSelectedLantern(lnt);
            setShowLanternSelect(false);
            setCanvasKey((k) => k + 1);
          }}
          onClose={() => setShowLanternSelect(false)}
        />
      )}

      {showUnityExport && (
        <UnityExportModal onClose={() => setShowUnityExport(false)} />
      )}

      {showCulturalCodex && (
        <CulturalCodexModal
          collectedPatternIds={collectedPatternIds}
          onClose={() => setShowCulturalCodex(false)}
        />
      )}

      {levelResult.open && (
        <LevelResultModal
          status={levelResult.status}
          reason={levelResult.reason}
          level={currentLevel}
          stars={levelResult.stars}
          gustsUsed={levelResult.gustsUsed}
          patternsCollected={levelResult.patternsCollected}
          onNextLevel={handleNextLevel}
          onRestart={handleRestartLevel}
          onHome={() => {
            setLevelResult((prev) => ({ ...prev, open: false }));
            setShowLevelSelect(true);
          }}
        />
      )}
    </div>
  );
}
