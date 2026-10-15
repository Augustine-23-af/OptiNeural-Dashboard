import React from "react";
import { KeyRound, CheckCircle2, ShieldAlert } from "lucide-react";

export type NavTab = "ollama" | "base-inference" | "training" | "checkpoints" | "datasets" | "telemetry";

interface NavbarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onOpenConfig: () => void;
  healthState: {
    connected: boolean;
    configured: boolean;
  };
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  onOpenConfig,
  healthState,
}) => {
  return (
    <header className="sticky top-0 z-40 flex items-center justify-between gap-8 border-b border-slate-800 bg-[#090d16]/90 px-6 py-3.5 backdrop-blur-md">
      {/* Zone 1: Brand wordmark (single element, whitespace-nowrap) */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={() => onTabChange("ollama")}
          className="text-left group cursor-pointer focus:outline-hidden"
        >
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-600/20 text-blue-400 border border-blue-500/30 font-mono text-xs font-bold">
              ON
            </div>
            <span className="text-base font-bold tracking-tight text-white whitespace-nowrap">
              OptiNeural
            </span>
          </div>
        </button>
      </div>

      {/* Zone 2: Nav links, 1-2 word single-line labels */}
      <nav className="hidden lg:flex items-center gap-6 text-xs font-medium text-slate-300">
        <button
          onClick={() => onTabChange("ollama")}
          className={`cursor-pointer transition-colors whitespace-nowrap shrink-0 hover:text-white ${
            activeTab === "ollama"
              ? "text-blue-400 font-semibold"
              : "text-slate-400"
          }`}
        >
          Ollama Cloud
        </button>

        <button
          onClick={() => onTabChange("base-inference")}
          className={`cursor-pointer transition-colors whitespace-nowrap shrink-0 hover:text-white ${
            activeTab === "base-inference"
              ? "text-blue-400 font-semibold"
              : "text-slate-400"
          }`}
        >
          Base Inference
        </button>

        <button
          onClick={() => onTabChange("training")}
          className={`cursor-pointer transition-colors whitespace-nowrap shrink-0 hover:text-white ${
            activeTab === "training"
              ? "text-blue-400 font-semibold"
              : "text-slate-400"
          }`}
        >
          Neural Training
        </button>

        <button
          onClick={() => onTabChange("checkpoints")}
          className={`cursor-pointer transition-colors whitespace-nowrap shrink-0 hover:text-white ${
            activeTab === "checkpoints"
              ? "text-blue-400 font-semibold"
              : "text-slate-400"
          }`}
        >
          Checkpoints
        </button>

        <button
          onClick={() => onTabChange("datasets")}
          className={`cursor-pointer transition-colors whitespace-nowrap shrink-0 hover:text-white ${
            activeTab === "datasets"
              ? "text-blue-400 font-semibold"
              : "text-slate-400"
          }`}
        >
          Datasets & Files
        </button>

        <button
          onClick={() => onTabChange("telemetry")}
          className={`cursor-pointer transition-colors whitespace-nowrap shrink-0 hover:text-white ${
            activeTab === "telemetry"
              ? "text-blue-400 font-semibold"
              : "text-slate-400"
          }`}
        >
          Telemetry
        </button>
      </nav>

      {/* Zone 3: 1 primary action */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onOpenConfig}
          className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-slate-600 hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <KeyRound className="h-3.5 w-3.5 text-blue-400" />
          <span>Cloud Key</span>
          {healthState.connected ? (
            <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-mono">
              <CheckCircle2 className="h-3 w-3" />
              Live
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[11px] text-amber-400 font-mono">
              <ShieldAlert className="h-3 w-3" />
              Setup
            </span>
          )}
        </button>
      </div>
    </header>
  );
};
