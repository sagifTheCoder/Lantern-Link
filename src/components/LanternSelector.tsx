import React from 'react';
import { LanternStats } from '../types/game';
import { LANTERNS_DATA } from '../data/lanterns';
import { X, Check, Lock, Sparkles, Feather, Shield, Sun } from 'lucide-react';

interface LanternSelectorProps {
  selectedLantern: LanternStats;
  patternsCount: number;
  completedLevelsCount: number;
  onSelectLantern: (lantern: LanternStats) => void;
  onClose: () => void;
}

export const LanternSelector: React.FC<LanternSelectorProps> = ({
  selectedLantern,
  patternsCount,
  completedLevelsCount,
  onSelectLantern,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-3xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-amber-500/30 rounded-3xl p-6 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏮</span>
            <div>
              <h2 className="text-xl font-bold text-amber-200 font-cinzel">Phòng Nghệ Nhân Đèn Lồng</h2>
              <p className="text-xs text-slate-400">Chọn đèn lồng mang bản sắc văn hóa truyền thống</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/60 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4 overflow-y-auto pr-1">
          {LANTERNS_DATA.map((lnt) => {
            const isSelected = selectedLantern.id === lnt.id;

            // Check unlock condition dynamically
            let isUnlocked = lnt.unlocked;
            if (lnt.id === 'hoian_diamond' && patternsCount >= 6) isUnlocked = true;
            if (lnt.id === 'hanok_hanji' && completedLevelsCount >= 3) isUnlocked = true;
            if (lnt.id === 'hoian_lotus' && patternsCount >= 12) isUnlocked = true;
            if (lnt.id === 'royal_palace' && completedLevelsCount >= 9) isUnlocked = true;

            return (
              <div
                key={lnt.id}
                onClick={() => {
                  if (isUnlocked) onSelectLantern(lnt);
                }}
                className={`relative rounded-2xl p-4 border transition-all text-left flex flex-col justify-between ${
                  !isUnlocked
                    ? 'bg-slate-900/40 border-slate-800 opacity-65 cursor-not-allowed'
                    : isSelected
                    ? 'bg-amber-950/40 border-amber-400 shadow-lg shadow-amber-500/10 cursor-pointer'
                    : 'bg-slate-900/70 border-slate-700/60 cursor-pointer hover:border-amber-400/40 hover:bg-slate-800/50'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded-full border border-amber-300/40 flex items-center justify-center shadow-md"
                        style={{ backgroundColor: lnt.glowColor }}
                      >
                        <span className="text-sm">🏮</span>
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                          {lnt.name}
                        </h3>
                        {lnt.koreanName && (
                          <span className="text-[10px] text-sky-300 font-korean">{lnt.koreanName}</span>
                        )}
                      </div>
                    </div>

                    {isUnlocked ? (
                      isSelected ? (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/50 text-[10px] font-bold flex items-center gap-1">
                          <Check className="w-3 h-3" /> Đang dùng
                        </span>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectLantern(lnt);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-amber-500/30 text-slate-300 hover:text-amber-200 text-xs font-semibold border border-slate-700 transition"
                        >
                          Chọn
                        </button>
                      )
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-[10px] flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Khóa
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-300 mt-1">{lnt.description}</p>
                  <p className="text-[11px] text-amber-300/80 italic mt-1.5">
                    📜 {lnt.culturalNote}
                  </p>
                </div>

                {/* Physics Stats Bars */}
                <div className="mt-3 pt-2 border-t border-slate-800/80 space-y-1 text-[11px]">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="flex items-center gap-1">
                      <Feather className="w-3 h-3 text-sky-400" /> Độ nổi (Buoyancy)
                    </span>
                    <span className="font-semibold text-slate-200">
                      {Math.round(lnt.buoyancy * 500)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="flex items-center gap-1">
                      <Shield className="w-3 h-3 text-rose-400" /> Độ bền nan đèn
                    </span>
                    <span className="font-semibold text-slate-200">{lnt.durability} HP</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="flex items-center gap-1">
                      <Sun className="w-3 h-3 text-amber-400" /> Bán kính ánh sáng
                    </span>
                    <span className="font-semibold text-slate-200">{lnt.glowRadius} px</span>
                  </div>
                </div>

                {!isUnlocked && lnt.unlockRequirement && (
                  <div className="mt-2 text-[10px] text-amber-400/90 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">
                    🔒 Yêu cầu: {lnt.unlockRequirement}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
