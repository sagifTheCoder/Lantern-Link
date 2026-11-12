import React, { useState } from 'react';
import { LevelConfig, CultureOrigin } from '../types/game';
import { LEVELS_DATA } from '../data/levels';
import { X, Star, Lock, Play, Compass } from 'lucide-react';

interface LevelSelectModalProps {
  currentLevelId: number;
  completedLevels: Record<number, { stars: number; gustsUsed: number; patternsCollected: number }>;
  onSelectLevel: (level: LevelConfig) => void;
  onClose: () => void;
}

export const LevelSelectModal: React.FC<LevelSelectModalProps> = ({
  currentLevelId,
  completedLevels,
  onSelectLevel,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<CultureOrigin>('vietnam');

  const filteredLevels = LEVELS_DATA.filter((lvl) => lvl.chapter === activeTab);

  const getChapterName = (chapter: CultureOrigin) => {
    switch (chapter) {
      case 'vietnam':
        return 'Chương 1: Phố Cổ Hội An';
      case 'korea':
        return 'Chương 2: Làng Hanok';
      case 'convergence':
        return 'Chương 3: Cầu Nối Hội Tụ';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-amber-500/30 rounded-3xl p-6 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Compass className="w-6 h-6 text-amber-400" />
            <div>
              <h2 className="text-xl font-bold text-amber-200 font-cinzel">Bản Đồ Hành Trình</h2>
              <p className="text-xs text-slate-400">Chọn màn chơi để đưa đèn lồng trở về lễ hội</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/60 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Chapter Tabs */}
        <div className="grid grid-cols-3 gap-2 my-5">
          {(['vietnam', 'korea', 'convergence'] as CultureOrigin[]).map((chap) => {
            const isActive = activeTab === chap;
            return (
              <button
                key={chap}
                onClick={() => setActiveTab(chap)}
                className={`py-2.5 px-3 rounded-xl text-xs font-semibold transition-all flex flex-col items-center gap-1 border ${
                  isActive
                    ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-lg shadow-amber-500/10'
                    : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
                }`}
              >
                <span className="text-base">
                  {chap === 'vietnam' ? '🏮' : chap === 'korea' ? '🏮' : '✨'}
                </span>
                <span className="text-center">{getChapterName(chap)}</span>
              </button>
            );
          })}
        </div>

        {/* Levels Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-h-[50vh] overflow-y-auto pr-1">
          {filteredLevels.map((lvl, index) => {
            const result = completedLevels[lvl.id];
            // Unlocked if it's level 1 or previous level is completed
            const isUnlocked = lvl.id === 1 || completedLevels[lvl.id - 1] !== undefined;
            const isCurrent = lvl.id === currentLevelId;

            return (
              <div
                key={lvl.id}
                onClick={() => {
                  if (isUnlocked) {
                    onSelectLevel(lvl);
                    onClose();
                  }
                }}
                className={`group relative rounded-2xl p-4 border transition-all text-left ${
                  !isUnlocked
                    ? 'bg-slate-900/40 border-slate-800 opacity-60 cursor-not-allowed'
                    : isCurrent
                    ? 'bg-amber-950/40 border-amber-400/80 shadow-lg shadow-amber-500/10 cursor-pointer hover:scale-[1.02]'
                    : 'bg-slate-900/70 border-slate-700/60 cursor-pointer hover:border-amber-400/40 hover:bg-slate-800/60 hover:scale-[1.02]'
                }`}
              >
                {/* Level Number & Status */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold font-cinzel text-amber-400">
                    MÀN {lvl.id}
                  </span>
                  {isUnlocked ? (
                    <div className="flex gap-0.5">
                      {[1, 2, 3].map((starIdx) => (
                        <Star
                          key={starIdx}
                          className={`w-3.5 h-3.5 ${
                            result && result.stars >= starIdx
                              ? 'text-amber-400 fill-amber-400'
                              : 'text-slate-700'
                          }`}
                        />
                      ))}
                    </div>
                  ) : (
                    <Lock className="w-3.5 h-3.5 text-slate-600" />
                  )}
                </div>

                {/* Title */}
                <h3 className="text-sm font-bold text-slate-100 group-hover:text-amber-200 transition-colors line-clamp-1">
                  {lvl.title.replace(/Màn \d+: /, '')}
                </h3>
                <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                  {lvl.subtitle}
                </p>

                {/* Bottom detail */}
                <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                  <span>💨 Tối đa {lvl.maxGusts} lượt</span>
                  {isUnlocked && (
                    <span className="flex items-center gap-1 text-amber-400 font-semibold group-hover:underline">
                      <Play className="w-3 h-3 fill-amber-400" /> Vào chơi
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
