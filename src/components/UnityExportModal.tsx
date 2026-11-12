import React, { useState } from 'react';
import { UNITY_SCRIPTS, UnityScriptItem } from '../data/unityScripts';
import { X, Copy, Check, Download, Code2, Smartphone, Terminal, Layers } from 'lucide-react';

interface UnityExportModalProps {
  onClose: () => void;
}

export const UnityExportModal: React.FC<UnityExportModalProps> = ({ onClose }) => {
  const [activeFile, setActiveFile] = useState<UnityScriptItem>(UNITY_SCRIPTS[0]);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(activeFile.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadAll = () => {
    // Generate combined bundle download
    let combinedContent = `// ==================================================================\n// LANTERN LINK - BỘ MÃ NGUỒN UNITY 2D C# (MOBILE READY)\n// Thiết Kế Cho Unity 2022.3 LTS & Unity 6 (URP 2D Physics)\n// Phát hành di động: Android (Google Play) & iOS (App Store)\n// ==================================================================\n\n`;

    UNITY_SCRIPTS.forEach((s) => {
      combinedContent += `\n\n// ==================================================================\n// FILE: ${s.filename}\n// MÔ TẢ: ${s.description}\n// ==================================================================\n\n${s.code}\n`;
    });

    const blob = new Blob([combinedContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'LanternLink_Unity_Mobile_SourceScripts.cs';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-amber-500/30 rounded-3xl p-6 shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white shadow-lg">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-amber-200 font-cinzel flex items-center gap-2">
                Bộ Mã Nguồn Unity C# Cho Di Động
              </h2>
              <p className="text-xs text-slate-400">
                Sẵn sàng import vào dự án Unity 2D URP để xuất bản APK Android & iOS
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadAll}
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition shadow-md"
            >
              <Download className="w-4 h-4" /> Tải Toàn Bộ (.cs)
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/60 hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body Layout: Sidebar file list + Code Viewer */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 my-4 flex-1 overflow-hidden min-h-0">
          {/* File Explorer Sidebar */}
          <div className="md:col-span-4 bg-slate-950/70 border border-slate-800 rounded-2xl p-2 overflow-y-auto space-y-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 py-1.5 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-amber-400" /> CÁC SCRIPT C# (.CS)
            </div>
            {UNITY_SCRIPTS.map((script) => {
              const isSelected = activeFile.filename === script.filename;
              return (
                <button
                  key={script.filename}
                  onClick={() => setActiveFile(script)}
                  className={`w-full text-left p-2.5 rounded-xl text-xs transition border flex flex-col gap-0.5 ${
                    isSelected
                      ? 'bg-amber-500/20 border-amber-400/80 text-amber-300 font-semibold shadow-md'
                      : 'border-transparent text-slate-300 hover:bg-slate-800/60 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <Code2 className="w-3.5 h-3.5 text-amber-400" />
                    <span className="font-mono text-xs">{script.filename}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 truncate">
                    {script.category}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Code Viewer Panel */}
          <div className="md:col-span-8 bg-slate-950/90 border border-slate-800 rounded-2xl p-4 flex flex-col overflow-hidden">
            {/* File Header & Action */}
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/80">
              <div>
                <span className="font-mono text-xs font-bold text-amber-300">
                  {activeFile.filename}
                </span>
                <p className="text-[11px] text-slate-400">{activeFile.description}</p>
              </div>
              <button
                onClick={handleCopy}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 flex items-center gap-1 transition"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Đã sao chép</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-amber-400" />
                    <span>Sao chép mã</span>
                  </>
                )}
              </button>
            </div>

            {/* Code Content */}
            <div className="flex-1 overflow-auto rounded-xl bg-slate-950 p-3 font-mono text-[11px] text-slate-300 leading-relaxed border border-slate-800/50">
              <pre className="whitespace-pre">{activeFile.code}</pre>
            </div>
          </div>
        </div>

        {/* Mobile Publishing Checklist Footer */}
        <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <Check className="w-3.5 h-3.5" /> Hỗ trợ Vuốt Cảm Ứng Di Động (Touch Swipe)
            </span>
            <span className="flex items-center gap-1.5 text-emerald-400">
              <Check className="w-3.5 h-3.5" /> Phản hồi rung điện thoại (Haptics)
            </span>
            <span className="flex items-center gap-1.5 text-emerald-400">
              <Check className="w-3.5 h-3.5" /> Tương thích URP 2D Lights
            </span>
          </div>
          <span className="text-amber-400/90 font-medium">
            Phù hợp phát hành Google Play & iOS App Store
          </span>
        </div>
      </div>
    </div>
  );
};
