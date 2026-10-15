import React, { useState, useEffect } from "react";
import { Checkpoint } from "../types/index.ts";
import { HardDrive, Check, Sparkles, FileCode, CheckCircle2 } from "lucide-react";

export const CheckpointManager: React.FC = () => {
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [selectedCkpt, setSelectedCkpt] = useState<Checkpoint | null>(null);
  const [activatedId, setActivatedId] = useState<string | null>(null);

  useEffect(() => {
    fetchCheckpoints();
  }, []);

  const fetchCheckpoints = async () => {
    try {
      const res = await fetch("/api/optineural/checkpoints");
      const data = await res.json();
      if (Array.isArray(data.checkpoints)) {
        setCheckpoints(data.checkpoints);
        const active = data.checkpoints.find((c: Checkpoint) => c.isActive) || data.checkpoints[0];
        setSelectedCkpt(active);
        setActivatedId(active?.id || null);
      }
    } catch (e) {
      console.error("Failed to load checkpoints", e);
    }
  };

  const handleActivate = async (id: string) => {
    try {
      const res = await fetch("/api/optineural/checkpoints/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.checkpoints)) {
        setCheckpoints(data.checkpoints);
        setActivatedId(id);
      }
    } catch (e) {
      console.error("Failed to activate checkpoint", e);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="border-b border-slate-800 pb-4">
        <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <HardDrive className="h-5 w-5 text-blue-400" />
          Model Weights & Checkpoint Registry
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Catalog of independently trained OptiNeural base models, PyTorch state dicts, and quantized artifacts.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Checkpoint Table */}
        <div className="lg:col-span-2 space-y-3">
          <div className="rounded-xl border border-slate-800 bg-[#0c1220] overflow-hidden">
            <div className="border-b border-slate-800 bg-slate-900/40 px-4 py-3 text-xs font-semibold text-slate-300">
              Saved Checkpoints ({checkpoints.length})
            </div>
            <div className="divide-y divide-slate-800/80">
              {checkpoints.map((ckpt) => {
                const isSelected = selectedCkpt?.id === ckpt.id;
                const isCurrentActive = activatedId === ckpt.id;

                return (
                  <div
                    key={ckpt.id}
                    onClick={() => setSelectedCkpt(ckpt)}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3 cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-blue-950/20 border-l-2 border-blue-500"
                        : "hover:bg-slate-900/30"
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-slate-200">
                          {ckpt.filename}
                        </span>
                        {isCurrentActive && (
                          <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-mono">
                            <CheckCircle2 className="h-3 w-3" />
                            Active Inference
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-400">
                        <span>{ckpt.architecture}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums text-blue-400">
                          {ckpt.parameters} params
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{(ckpt.sizeBytes / 1024 / 1024).toFixed(1)} MB</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right text-[11px] font-mono">
                        <div className="text-emerald-400">PPL {ckpt.perplexity.toFixed(2)}</div>
                        <div className="text-slate-400">Loss {ckpt.valLoss.toFixed(3)}</div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleActivate(ckpt.id);
                        }}
                        disabled={isCurrentActive}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                          isCurrentActive
                            ? "bg-emerald-950/40 text-emerald-400 border border-emerald-500/30 cursor-default"
                            : "bg-blue-600 hover:bg-blue-500 text-white"
                        }`}
                      >
                        {isCurrentActive ? "Active" : "Activate"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Selected Checkpoint Deep Inspection */}
        {selectedCkpt && (
          <div className="rounded-xl border border-slate-800 bg-[#0c1220] p-5 text-xs space-y-4">
            <h3 className="font-semibold text-slate-200 flex items-center gap-2 border-b border-slate-800 pb-2">
              <Sparkles className="h-4 w-4 text-blue-400" />
              Weight Tensor Inspection
            </h3>

            <div className="space-y-2.5 font-mono text-[11px]">
              <div className="p-2.5 rounded-lg border border-slate-800 bg-slate-900/50">
                <span className="text-slate-400 block text-[10px]">Checkpoint SHA-256 Digest</span>
                <span className="text-slate-200 break-all">
                  e9b7a42f6c91a083d8e57319c50f4a27bc19a32c0d8924b17f54c93
                </span>
              </div>

              <div className="p-2.5 rounded-lg border border-slate-800 bg-slate-900/50 space-y-1.5">
                <span className="text-slate-400 block text-[10px]">Layer Weight Manifest</span>
                <div className="flex justify-between">
                  <span className="text-slate-300">transformer.wte.weight</span>
                  <span className="text-slate-400">[50257, 768]</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">transformer.h.0-11.attn.c_attn</span>
                  <span className="text-slate-400">[768, 2304]</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">transformer.h.0-11.mlp.c_fc</span>
                  <span className="text-slate-400">[768, 3072]</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">transformer.ln_f.weight</span>
                  <span className="text-slate-400">[768]</span>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-800 pt-3 text-[11px] text-slate-400 space-y-1">
              <div>Created: <span className="text-slate-200">{selectedCkpt.date}</span></div>
              <div>Training Epoch: <span className="text-slate-200">{selectedCkpt.epoch} (Step {selectedCkpt.step})</span></div>
              <div>Serialization: <span className="text-slate-200">{selectedCkpt.format}</span></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
