import React, { useState, useEffect } from "react";
import { SystemTelemetry } from "../types/index.ts";
import { Cpu, HardDrive, Thermometer, Zap, Server, RefreshCw } from "lucide-react";

export const HardwareTelemetry: React.FC = () => {
  const [telemetry, setTelemetry] = useState<SystemTelemetry | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchTelemetry();
    const timer = setInterval(fetchTelemetry, 3000);
    return () => clearInterval(timer);
  }, []);

  const fetchTelemetry = async () => {
    try {
      const res = await fetch("/api/system/telemetry");
      const data = await res.json();
      setTelemetry(data);
    } catch (e) {
      console.error("Failed to load telemetry", e);
    }
  };

  const handleManualRefresh = async () => {
    setIsLoading(true);
    await fetchTelemetry();
    setIsLoading(false);
  };

  if (!telemetry) {
    return <div className="p-8 text-center text-slate-400">Loading system telemetry...</div>;
  }

  const { system, gpu } = telemetry;
  const usedRamGb = (system.usedMemoryBytes / (1024 * 1024 * 1024)).toFixed(2);
  const totalRamGb = (system.totalMemoryBytes / (1024 * 1024 * 1024)).toFixed(2);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Server className="h-5 w-5 text-blue-400" />
            Compute & Hardware Telemetry
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time Node.js host kernel stats and GPU acceleration metrics.
          </p>
        </div>

        <button
          onClick={handleManualRefresh}
          className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-300 hover:text-white transition-colors cursor-pointer"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Host CPU & Memory */}
        <div className="rounded-xl border border-slate-800 bg-[#0c1220] p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Cpu className="h-4 w-4 text-blue-400" />
            <h3 className="text-sm font-semibold text-slate-200">
              Host CPU & Physical Memory
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">CPU Architecture:</span>
              <span className="font-mono text-slate-200 font-semibold">{system.arch} ({system.cpuCores} vCPUs)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Processor:</span>
              <span className="font-mono text-slate-200 truncate max-w-xs">{system.cpuModel}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Load Average (1m, 5m, 15m):</span>
              <span className="font-mono text-blue-400 tabular-nums">
                {system.loadAverage.join(", ")}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">RAM Allocation:</span>
              <span className="font-mono text-slate-200 tabular-nums">
                {usedRamGb} GB / {totalRamGb} GB ({system.memoryUsagePercent}%)
              </span>
            </div>

            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full"
                style={{ width: `${system.memoryUsagePercent}%` }}
              />
            </div>

            <div className="flex justify-between text-slate-400 pt-2 border-t border-slate-800/80">
              <span>Process Uptime:</span>
              <span className="font-mono text-slate-200 tabular-nums">
                {Math.floor(system.processUptimeSeconds / 3600)}h {Math.floor((system.processUptimeSeconds % 3600) / 60)}m {system.processUptimeSeconds % 60}s
              </span>
            </div>
          </div>
        </div>

        {/* GPU Accelerator & Tensor Engine */}
        <div className="rounded-xl border border-slate-800 bg-[#0c1220] p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Zap className="h-4 w-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-slate-200">
              GPU Tensor Acceleration
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Accelerator Device:</span>
              <span className="font-mono text-emerald-400 font-semibold">{gpu.device}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">CUDA / Driver Version:</span>
              <span className="font-mono text-slate-200">CUDA {gpu.cudaVersion} / Driver {gpu.driverVersion}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">VRAM Allocation:</span>
              <span className="font-mono text-blue-400 tabular-nums">
                {gpu.usedVramGb} GB / {gpu.totalVramGb} GB ({gpu.vramPercent}%)
              </span>
            </div>

            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full"
                style={{ width: `${gpu.vramPercent}%` }}
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
              <div className="flex items-center gap-2">
                <Thermometer className="h-4 w-4 text-amber-400" />
                <div>
                  <span className="text-[10px] text-slate-400 block">Die Temperature</span>
                  <span className="font-mono font-semibold text-slate-200 tabular-nums">
                    {gpu.temperatureCelsius}°C
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-blue-400" />
                <div>
                  <span className="text-[10px] text-slate-400 block">Power Draw</span>
                  <span className="font-mono font-semibold text-slate-200 tabular-nums">
                    {gpu.powerDrawWatts} W
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
