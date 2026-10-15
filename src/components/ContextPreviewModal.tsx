import React from "react";
import { X, FileCode, Folder, Copy, Check, HardDrive } from "lucide-react";
import { AttachedContextItem } from "../types/index.ts";

interface ContextPreviewModalProps {
  item: AttachedContextItem | null;
  onClose: () => void;
}

export const ContextPreviewModal: React.FC<ContextPreviewModalProps> = ({
  item,
  onClose,
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!item) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(item.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
      <div className="relative flex flex-col w-full max-w-3xl max-h-[85vh] rounded-2xl border border-slate-700 bg-[#0c1220] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-[#0e1628] px-5 py-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
              {item.type === "folder" ? (
                <Folder className="h-4 w-4" />
              ) : (
                <FileCode className="h-4 w-4" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-semibold text-slate-100">
                  {item.name}
                </span>
                <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                  {item.type.toUpperCase()}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5 font-mono">
                <span>{formatSize(item.size)}</span>
                <span>·</span>
                <span className="text-blue-400 tabular-nums">
                  ~{item.tokens.toLocaleString()} tokens
                </span>
                {item.fileCount && (
                  <>
                    <span>·</span>
                    <span>{item.fileCount} files indexed</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-xs font-medium text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy Content</span>
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              aria-label="Close preview"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 bg-[#080d1a]">
          <pre className="font-mono text-xs text-slate-200 whitespace-pre-wrap leading-relaxed select-text">
            <code>{item.content || "(No text content extracted)"}</code>
          </pre>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-800 bg-[#0c1220] px-5 py-2.5 text-[11px] text-slate-400 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <HardDrive className="h-3.5 w-3.5 text-blue-400" />
            Context will be injected into Ollama prompt as verified RAG grounding
          </span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
