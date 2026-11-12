import React from 'react';
import { Star, RotateCcw, ArrowRight, Home, Sparkles, AlertCircle } from 'lucide-react';
import { LevelConfig } from '../types/game';

interface LevelResultModalProps {
  status: 'complete' | 'failed';
  reason?: 'gusts' | 'destroyed';
  level: LevelConfig;
  stars: number;
  gustsUsed: number;
  patternsCollected: number;
  onNextLevel: () => void;
  onRestart: () => void;
  onHome: () => void;
}

export const LevelResultModal: React.FC<LevelResultModalProps> = ({
  status,
  reason,
  level,
  stars,
  gustsUsed,
  patternsCollected,
  onNextLevel,
  onRestart,
  onHome,
}) => {
  const isVictory = status === 'complete';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md bg-gradient-to-b from-slate-900 to-slate-950 border border-amber-500/40 rounded-3xl p-6 shadow-2xl text-center overflow-hidden">
        {/* Glow backdrop */}
        <div
          className={`absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full blur-3xl pointer-events-none ${
            isVictory ? 'bg-amber-500/25' : 'bg-rose-500/25'
          }`}
        />

        {/* Status Header */}
        {isVictory ? (
          <div>
            <div className="text-4xl mb-2">🏮</div>
            <h2 className="text-2xl font-black text-amber-200 font-cinzel tracking-wider">
              VỀ ĐÍCH AN TOÀN!
            </h2>
            <p className="text-xs text-amber-300/80 mt-1">
              Chiếc đèn đã thắp sáng lễ hội hoa đăng
            </p>

            {/* 3-Star Rating Animation */}
            <div className="flex justify-center gap-3 my-5">
              {[1, 2, 3].map((starIdx) => (
                <div
                  key={starIdx}
                  className={`transition-all duration-500 transform ${
                    stars >= starIdx ? 'scale-110' : 'scale-90 opacity-40'
                  }`}
                >
                  <Star
                    className={`w-10 h-10 ${
                      stars >= starIdx
                        ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.6)]'
                        : 'text-slate-700'
                    }`}
                  />
                </div>
              ))}
            </div>

            {/* Stats Breakdown */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 my-4 space-y-2 text-xs text-left">
              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center gap-1.5 text-amber-400">
                  <Sparkles className="w-4 h-4" /> Hoa văn truyền thống:
                </span>
                <span className="font-bold text-amber-300 font-cinzel">
                  {patternsCollected} / 3 Mảnh
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center gap-1.5 text-sky-400">
                  💨 Lượt gió sử dụng:
                </span>
                <span className="font-bold text-slate-200">
                  {gustsUsed} / {level.maxGusts} lượt
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div className="text-4xl mb-2">💨</div>
            <h2 className="text-2xl font-black text-rose-300 font-cinzel tracking-wider">
              {reason === 'destroyed' ? 'NAN ĐÈN BỊ RÁCH' : 'HẾT LƯỢT GIÓ'}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {reason === 'destroyed'
                ? 'Đèn lồng va chạm mạnh với mái ngói nhọn. Hãy điều tiết lực gió nhẹ nhàng hơn!'
                : 'Ngọn gió đã lặng yên trước khi đèn đến lễ hội. Hãy vuốt vệt dài hơn để đèn bay xa hơn!'}
            </p>

            <div className="bg-rose-950/20 border border-rose-500/20 rounded-2xl p-4 my-5 text-xs text-slate-300 text-left flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-rose-300 mb-0.5">Mẹo Nghệ Nhân:</div>
                <div className="text-[11px] text-slate-300 leading-relaxed">
                  Tận dụng luồng khí nóng bốc lên từ ống khói Ondol hoặc dòng sông để nâng đèn mà không tốn lượt gió.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 mt-6">
          <button
            onClick={onRestart}
            className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-2 border border-slate-700 transition"
          >
            <RotateCcw className="w-4 h-4" /> Chơi Lại
          </button>

          {isVictory ? (
            <button
              onClick={onNextLevel}
              className="py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition"
            >
              Màn Kế Tiếp <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={onHome}
              className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-2 border border-slate-700 transition"
            >
              <Home className="w-4 h-4" /> Về Bản Đồ
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
