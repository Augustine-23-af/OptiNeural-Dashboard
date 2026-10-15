import React, { useState, useEffect } from "react";
import {
  Play,
  Pause,
  Square,
  FastForward,
  TrendingDown,
  Activity,
  Layers,
  Zap,
} from "lucide-react";
import { TrainingState } from "../types/index.ts";

export const TrainingConsole: React.FC = () => {
  const [training, setTraining] = useState<TrainingState | null>(null);
  const [learningRate, setLearningRate] = useState("0.0003");
  const [batchSize, setBatchSize] = useState("64");
  const [optimizer, setOptimizer] = useState("AdamW");
  const [precision, setPrecision] = useState("BF16");

  useEffect(() => {
    fetchTrainingStatus();
    const interval = setInterval(fetchTrainingStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const fetchTrainingStatus = async () => {
    try {
      const res = await fetch("/api/optineural/training/status");
      const data = await res.json();
      if (data.training) {
        setTraining(data.training);
      }
    } catch (e) {
      console.error("Failed to fetch training status", e);
    }
  };

  const handleControl = async (action: "start" | "pause" | "stop" | "step") => {
    try {
      const res = await fetch("/api/optineural/training/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          config: {
            learningRate: parseFloat(learningRate),
            batchSize: parseInt(batchSize),
            optimizer,
            precision,
          },
        }),
      });
      const data = await res.json();
      if (data.training) setTraining(data.training);
    } catch (e) {
      console.error("Control action failed", e);
    }
  };

  if (!training) {
    return <div className="p-8 text-center text-slate-400">Loading training harness...</div>;
  }

  const progressPercent = Math.min(
    100,
    Math.round((training.currentStep / training.maxSteps) * 100)
  );

  // SVG Chart points calculation for loss history
  const points = training.lossHistory;
  const minLoss = Math.min(...points.map((p) => p.trainLoss), 1.0);
  const maxLoss = Math.max(...points.map((p) => p.trainLoss), 1.6);
  const chartWidth = 560;
  const chartHeight = 160;

  const getCoordinates = (index: number, val: number) => {
    const x = (index / (points.length - 1 || 1)) * (chartWidth - 40) + 20;
    const y =
      chartHeight -
      20 -
      ((val - minLoss) / (maxLoss - minLoss || 0.1)) * (chartHeight - 40);
    return { x, y };
  };

  const trainPointsStr = points
    .map((p, i) => {
      const { x, y } = getCoordinates(i, p.trainLoss);
      return `${x},${y}`;
    })
    .join(" ");

  const valPointsStr = points
    .map((p, i) => {
      const { x, y } = getCoordinates(i, p.valLoss);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header and Run Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-400" />
            <h2 className="text-xl font-bold text-slate-100">
              Neural Network Training Console
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            PyTorch DistributedDataParallel (DDP) runtime harness with mixed-precision autograd.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {training.status === "running" ? (
            <button
              onClick={() => handleControl("pause")}
              className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-950/30 px-3.5 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-900/40 transition-colors cursor-pointer"
            >
              <Pause className="h-3.5 w-3.5" />
              <span>Pause</span>
            </button>
          ) : (
            <button
              onClick={() => handleControl("start")}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 transition-colors cursor-pointer"
            >
              <Play className="h-3.5 w-3.5 fill-white" />
              <span>{training.status === "paused" ? "Resume" : "Start Run"}</span>
            </button>
          )}

          <button
            onClick={() => handleControl("step")}
            title="Step forward +100 gradient updates"
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-200 hover:text-white transition-colors cursor-pointer"
          >
            <FastForward className="h-3.5 w-3.5 text-blue-400" />
            <span>Step +100</span>
          </button>

          <button
            onClick={() => handleControl("stop")}
            disabled={training.status === "idle"}
            className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-red-400 transition-colors disabled:opacity-40 cursor-pointer"
          >
            <Square className="h-3.5 w-3.5" />
            <span>Stop</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-slate-800 bg-[#0c1220]">
          <span className="text-[11px] text-slate-400">Step Progress</span>
          <p className="text-base font-mono font-bold text-slate-100 mt-1 tabular-nums">
            {training.currentStep.toLocaleString()} / {training.maxSteps.toLocaleString()}
          </p>
          <div className="mt-2 h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block font-mono">
            Epoch {training.currentEpoch} ({progressPercent}%)
          </span>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-[#0c1220]">
          <span className="text-[11px] text-slate-400">Current Train Loss</span>
          <p className="text-base font-mono font-bold text-blue-400 mt-1 tabular-nums">
            {training.currentLoss.toFixed(4)}
          </p>
          <div className="flex items-center gap-1 text-[11px] text-emerald-400 mt-1 font-mono">
            <TrendingDown className="h-3 w-3" />
            <span>Converging</span>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-[#0c1220]">
          <span className="text-[11px] text-slate-400">Validation Perplexity</span>
          <p className="text-base font-mono font-bold text-emerald-400 mt-1 tabular-nums">
            {Math.exp(training.valLoss).toFixed(2)}
          </p>
          <span className="text-[10px] text-slate-400 mt-1 block font-mono">
            Val Loss: {training.valLoss.toFixed(4)}
          </span>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-[#0c1220]">
          <span className="text-[11px] text-slate-400">Throughput & ETA</span>
          <p className="text-base font-mono font-bold text-slate-100 mt-1 tabular-nums">
            {training.tokensPerSec.toLocaleString()} tok/s
          </p>
          <span className="text-[10px] text-slate-400 mt-1 block font-mono">
            ETA: ~{Math.round(training.etaSeconds / 60)} mins remaining
          </span>
        </div>
      </div>

      {/* Main Grid: Loss Curve Chart + Hyperparameter Adjustments */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* SVG Loss Curve Chart */}
        <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-[#0c1220] p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-200">
                Cross-Entropy Loss Trajectory
              </h3>
              <p className="text-[11px] text-slate-400">
                Evaluation curves across optimizer steps
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono">
              <span className="flex items-center gap-1.5 text-blue-400">
                <span className="h-2 w-2 rounded-full bg-blue-500" />
                Train Loss
              </span>
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Val Loss
              </span>
            </div>
          </div>

          <div className="relative w-full overflow-x-auto">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="w-full h-48 stroke-linecap-round stroke-linejoin-round"
            >
              {/* Grid lines */}
              <line x1="20" y1="20" x2={chartWidth - 20} y2="20" stroke="#1e293b" strokeDasharray="3 3" />
              <line x1="20" y1="80" x2={chartWidth - 20} y2="80" stroke="#1e293b" strokeDasharray="3 3" />
              <line x1="20" y1="140" x2={chartWidth - 20} y2="140" stroke="#1e293b" strokeDasharray="3 3" />

              {/* Train Loss Line */}
              <polyline
                fill="none"
                stroke="#3b82f6"
                strokeWidth="2.5"
                points={trainPointsStr}
              />

              {/* Val Loss Line */}
              <polyline
                fill="none"
                stroke="#10b981"
                strokeWidth="2"
                strokeDasharray="4 2"
                points={valPointsStr}
              />

              {/* Data point dots */}
              {points.map((p, idx) => {
                const { x, y } = getCoordinates(idx, p.trainLoss);
                return (
                  <circle
                    key={idx}
                    cx={x}
                    cy={y}
                    r="3.5"
                    fill="#3b82f6"
                    className="hover:r-5 transition-all cursor-pointer"
                  />
                );
              })}
            </svg>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/80 pt-2 font-mono">
            <span>Start Step: {points[0]?.step || 0}</span>
            <span>Latest Step: {points[points.length - 1]?.step || 0}</span>
          </div>
        </div>

        {/* Hyperparameters Card */}
        <div className="rounded-xl border border-slate-800 bg-[#0c1220] p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Zap className="h-4 w-4 text-blue-400" />
            <h3 className="text-sm font-semibold text-slate-200">
              Training Hyperparameters
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-400 mb-1">Architecture</label>
              <div className="p-2 rounded-lg border border-slate-800 bg-slate-900/60 font-mono text-slate-200">
                {training.architecture}
              </div>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Learning Rate</label>
              <input
                type="text"
                value={learningRate}
                onChange={(e) => setLearningRate(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 font-mono text-slate-100 focus:border-blue-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Batch Size</label>
              <input
                type="text"
                value={batchSize}
                onChange={(e) => setBatchSize(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 font-mono text-slate-100 focus:border-blue-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Optimizer</label>
              <select
                value={optimizer}
                onChange={(e) => setOptimizer(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-slate-100 focus:border-blue-500 focus:outline-hidden"
              >
                <option value="AdamW">AdamW (Weight Decay 0.01)</option>
                <option value="Sophia">Sophia-G (Second-order Hessian)</option>
                <option value="Lion">Lion (EvoLved Sign Momentum)</option>
                <option value="SGD">SGD with Nesterov</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Precision</label>
              <select
                value={precision}
                onChange={(e) => setPrecision(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-slate-100 focus:border-blue-500 focus:outline-hidden"
              >
                <option value="BF16">BF16 Mixed Precision (Ampere / Hopper)</option>
                <option value="FP16">FP16 with GradScaler</option>
                <option value="FP32">FP32 Full Precision</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
