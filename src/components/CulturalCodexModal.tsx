import React, { useState } from 'react';
import { X, BookOpen, Sparkles, Scroll, Heart } from 'lucide-react';
import { LEVELS_DATA } from '../data/levels';

interface CulturalCodexModalProps {
  collectedPatternIds: string[];
  onClose: () => void;
}

export const CulturalCodexModal: React.FC<CulturalCodexModalProps> = ({
  collectedPatternIds,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'lore' | 'patterns'>('lore');

  // Collect all patterns across all levels
  const allPatterns = LEVELS_DATA.flatMap((lvl) => lvl.patterns);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-3xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-amber-500/30 rounded-3xl p-6 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-md">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-amber-200 font-cinzel">
                Sổ Tay Văn Hóa Phương Đông
              </h2>
              <p className="text-xs text-slate-400">
                Lịch sử đèn lồng Hội An & Đèn lụa Cheongsachorong xứ Hàn
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/60 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-2 my-4">
          <button
            onClick={() => setActiveTab('lore')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
              activeTab === 'lore'
                ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-md'
                : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Scroll className="w-3.5 h-3.5" /> Điển Tích & Văn Hóa Đèn Lồng
          </button>
          <button
            onClick={() => setActiveTab('patterns')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
              activeTab === 'patterns'
                ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-md'
                : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" /> Hoa Văn Đã Khám Phá ({collectedPatternIds.length}/{allPatterns.length})
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4">
          {activeTab === 'lore' ? (
            <>
              {/* Hoi An Ancient Town */}
              <div className="bg-slate-950/70 border border-amber-500/20 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
                  <span>🏮</span>
                  <span>Đèn Lồng Phố Cổ Hội An – Ánh Sáng Tâm Tình Xứ Quảng</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Vào khoảng cuối thế kỷ 16, khi thương cảng Hội An sầm uất đón các đoàn thuyền buôn Á - Âu, nghề làm đèn lồng bắt đầu bén duyên. Nghệ nhân người Việt như cụ Huỳnh Văn Ba đã sáng tạo khung nan tre ngâm nước muối dẻo dai bọc lụa tơ tằm mềm mại, cho ra đời chiếc đèn lồng Hội An đặc trưng.
                </p>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Vào mỗi đêm rằm 14 âm lịch hàng tháng, cả khu phố cổ Hội An tắt hết đèn điện, chỉ còn ánh nến bập bùng từ hàng ngàn chiếc đèn lồng treo trước hiên nhà gỗ và hoa đăng thả trôi lững lờ trên dòng sông Hoài, thắp lên ước nguyện bình an, thịnh vượng.
                </p>
              </div>

              {/* Korean Hanok & Cheongsachorong */}
              <div className="bg-slate-950/70 border border-sky-500/20 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-sky-300 font-bold text-sm">
                  <span>🏮</span>
                  <span>Đèn Cheongsachorong (청사초롱) & Làng Cổ Hanok</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Xuất hiện từ triều đại Joseon (1392–1910), chiếc đèn lồng Cheongsachorong được chế tác bằng vải lụa tơ tằm hai màu đặc trưng: nửa trên màu đỏ tượng trưng cho <strong className="text-rose-400">Dương (Trời, Lửa, Sinh khí)</strong>, nửa dưới màu xanh lam tượng trưng cho <strong className="text-sky-400">Âm (Đất, Nước, Bình lặng)</strong>.
                </p>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Đèn Cheongsachorong là biểu tượng thiêng liêng dẫn lối cho chú rể đến nhà cô dâu trong lễ cưới truyền thống xứ Hàn, đại diện cho lời chúc phúc âm dương hòa hợp, gia đình viên mãn và xua tan những điều không may mắn.
                </p>
              </div>

              {/* Architectural Harmony */}
              <div className="bg-slate-950/70 border border-purple-500/20 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-purple-300 font-bold text-sm">
                  <span>✨</span>
                  <span>Mái Ngói Âm Dương & Mái Cheoma Đón Gió</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Cả phố cổ Hội An và làng Hanok Hàn Quốc đều tôn vinh sự hài hòa giữa con người và thiên nhiên. Mái ngói rêu phong Hội An lượn sóng nhịp nhàng bên giàn hoa giấy hồng thắm, còn mái ngói Cheoma nhà Hanok uốn cong vút kiêu hãnh lên bầu trời đón ánh trăng rằm và những ngọn gió lành.
                </p>
              </div>
            </>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {allPatterns.map((pat) => {
                const isCollected = collectedPatternIds.includes(pat.id);

                return (
                  <div
                    key={pat.id}
                    className={`rounded-2xl p-3 border transition text-left flex gap-3 ${
                      isCollected
                        ? 'bg-amber-950/20 border-amber-500/40 text-slate-200'
                        : 'bg-slate-950/40 border-slate-800 text-slate-500 opacity-60'
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                        isCollected
                          ? 'bg-amber-500/20 border-amber-400/50 text-amber-300'
                          : 'bg-slate-800/40 border-slate-700 text-slate-600'
                      }`}
                    >
                      {isCollected ? '✨' : '🔒'}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-200">
                        {pat.name}
                      </h4>
                      {pat.koreanName && (
                        <div className="text-[10px] text-sky-400 font-korean">{pat.koreanName}</div>
                      )}
                      <p className="text-[11px] text-slate-400 mt-1">
                        {isCollected ? pat.trivia : 'Khám phá và thu thập trong các màn chơi để mở khóa điển tích văn hóa này.'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
