import React, { useState, useEffect } from "react";
import { Play, Sparkles, Layers, Sliders, CheckCircle2, ArrowRightLeft } from "lucide-react";
import { Checkpoint } from "../types/index.ts";

export const BaseModelInference: React.FC = () => {
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [activeCheckpoint, setActiveCheckpoint] = useState<Checkpoint | null>(null);
  const [prompt, setPrompt] = useState(
    "Given the loss convergence trajectory of our custom 124M parameter transformer, explain the optimal gradient accumulation step count:"
  );
  const [temperature, setTemperature] = useState(0.7);
  const [topP, setTopP] = useState(0.9);
  const [maxTokens, setMaxTokens] = useState(64);
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<{
    checkpoint: string;
    architecture: string;
    prompt: string;
    generatedText: string;
    tokensGenerated: number;
    inferenceLatencyMs: number;
    tokensPerSecond: number;
    attentionDistribution: Array<{ layer: string; attentionWeight: number; description: string }>;
  } | null>(null);

  // Side-by-side comparison mode
  const [compareWithOllama, setCompareWithOllama] = useState(false);
  const [ollamaComparisonText, setOllamaComparisonText] = useState<string | null>(null);
  const [isComparing, setIsComparing] = useState(false);

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
        setActiveCheckpoint(active);
      }
    } catch (e) {
      console.error("Failed to load checkpoints", e);
    }
  };

  const handleRunInference = async () => {
    if (!prompt.trim() || isGenerating) return;
    setIsGenerating(true);
    setResult(null);

    try {
      const res = await fetch("/api/optineural/inference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          maxTokens,
          temperature,
          topP,
        }),
      });
      const data = await res.json();
      setResult(data);

      if (compareWithOllama) {
        setIsComparing(true);
        try {
          const ollamaRes = await fetch("/api/ollama/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "gemma4:31b-cloud",
              messages: [{ role: "user", content: prompt }],
              temperature,
            }),
          });
          if (ollamaRes.ok) {
            const reader = ollamaRes.body?.getReader();
            const decoder = new TextDecoder();
            let accumulated = "";
            if (reader) {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value);
                const lines = chunk.split("\n");
                for (const l of lines) {
                  if (!l.trim()) continue;
                  try {
                    const parsed = JSON.parse(l);
                    if (parsed.message?.content) accumulated += parsed.message.content;
                  } catch {}
                }
              }
            }
            setOllamaComparisonText(accumulated || "Received response from Ollama Cloud.");
          } else {
            const errData = await ollamaRes.json().catch(() => ({}));
            setOllamaComparisonText(errData.detail || errData.error || "Ollama Cloud comparison not available (check API key / model access).");
          }
        } catch {
          setOllamaComparisonText("Ollama Cloud benchmark request timed out or unconfigured.");
        } finally {
          setIsComparing(false);
        }
      }
    } catch (err: any) {
      console.error("Inference failed", err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header and Checkpoint Selection */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Layers className="h-5 w-5 text-blue-400" />
            OptiNeural Base Model Inference
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Evaluate independently trained local PyTorch state dicts and SafeTensors weights.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-xs text-slate-300 font-medium">Checkpoint:</label>
          <select
            value={activeCheckpoint?.id || ""}
            onChange={(e) => {
              const selected = checkpoints.find((c) => c.id === e.target.value);
              if (selected) setActiveCheckpoint(selected);
            }}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-100 font-mono focus:border-blue-500 focus:outline-hidden"
          >
            {checkpoints.map((c) => (
              <option key={c.id} value={c.id}>
                {c.filename} ({c.parameters} params)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Active Checkpoint Telemetry Card */}
      {activeCheckpoint && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl border border-slate-800 bg-[#0c1220]">
          <div>
            <span className="text-[11px] text-slate-400">Architecture</span>
            <p className="text-xs font-semibold text-slate-200 mt-0.5 truncate">
              {activeCheckpoint.architecture}
            </p>
          </div>
          <div>
            <span className="text-[11px] text-slate-400">Parameters</span>
            <p className="text-xs font-mono font-semibold text-blue-400 mt-0.5 tabular-nums">
              {activeCheckpoint.parameters}
            </p>
          </div>
          <div>
            <span className="text-[11px] text-slate-400">Validation Perplexity</span>
            <p className="text-xs font-mono font-semibold text-emerald-400 mt-0.5 tabular-nums">
              {activeCheckpoint.perplexity.toFixed(2)} (Loss {activeCheckpoint.valLoss})
            </p>
          </div>
          <div>
            <span className="text-[11px] text-slate-400">Checkpoint Format</span>
            <p className="text-xs font-mono text-slate-300 mt-0.5">
              {activeCheckpoint.format}
            </p>
          </div>
        </div>
      )}

      {/* Interactive Inference Prompt & Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Inference Evaluation Prompt
            </label>
            <textarea
              rows={4}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter prompt to evaluate model tokenization and next-token probability distribution..."
              className="w-full rounded-xl border border-slate-700 bg-slate-900/90 p-3.5 text-xs text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-hidden font-mono leading-relaxed"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
              <input
                type="checkbox"
                checked={compareWithOllama}
                onChange={(e) => setCompareWithOllama(e.target.checked)}
                className="accent-blue-500 rounded"
              />
              <span className="flex items-center gap-1">
                <ArrowRightLeft className="h-3.5 w-3.5 text-blue-400" />
                Benchmark side-by-side with Ollama Cloud (gemma4:31b-cloud)
              </span>
            </label>

            <button
              onClick={handleRunInference}
              disabled={isGenerating || !prompt.trim()}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-blue-500 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Play className="h-4 w-4 fill-white" />
              <span>{isGenerating ? "Executing Forward Pass..." : "Run Base Inference"}</span>
            </button>
          </div>

          {/* Results Display */}
          {result && (
            <div className="space-y-4 pt-2">
              <div className="rounded-xl border border-slate-800 bg-[#0d1424] p-4 text-xs">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-blue-400" />
                    <span className="font-semibold text-slate-200">
                      OptiNeural Model Output
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
                    <span>Latency: <strong className="text-slate-200 tabular-nums">{result.inferenceLatencyMs}ms</strong></span>
                    <span>·</span>
                    <span>Throughput: <strong className="text-emerald-400 tabular-nums">{result.tokensPerSecond} tok/s</strong></span>
                  </div>
                </div>

                <div className="whitespace-pre-wrap font-mono text-[12px] text-slate-200 leading-relaxed bg-slate-950/60 p-3.5 rounded-lg border border-slate-800">
                  {result.generatedText}
                </div>
              </div>

              {/* Side-by-side Ollama comparison */}
              {compareWithOllama && (
                <div className="rounded-xl border border-blue-900/40 bg-[#091122] p-4 text-xs">
                  <div className="flex items-center justify-between border-b border-blue-900/30 pb-2 mb-3">
                    <span className="font-semibold text-blue-300">
                      Ollama Cloud Benchmark (gemma4:31b-cloud)
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Cloud Comparison Reference
                    </span>
                  </div>
                  <div className="whitespace-pre-wrap font-sans text-[12px] text-slate-300 leading-relaxed bg-slate-950/50 p-3.5 rounded-lg border border-slate-800">
                    {isComparing ? (
                      <span className="text-slate-400 animate-pulse">
                        Querying Ollama Cloud endpoint...
                      </span>
                    ) : (
                      ollamaComparisonText || "No response received."
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Hyperparameter Controls & Attention Layer Weights */}
        <div className="space-y-5">
          <div className="rounded-xl border border-slate-800 bg-[#0c1220] p-4 text-xs space-y-4">
            <h3 className="font-semibold text-slate-200 flex items-center gap-2 border-b border-slate-800 pb-2">
              <Sliders className="h-4 w-4 text-blue-400" />
              Sampling Parameters
            </h3>

            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Temperature</span>
                <span className="font-mono text-blue-400 tabular-nums">{temperature}</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.5"
                step="0.05"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full accent-blue-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Top-P (Nucleus)</span>
                <span className="font-mono text-blue-400 tabular-nums">{topP}</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={topP}
                onChange={(e) => setTopP(parseFloat(e.target.value))}
                className="w-full accent-blue-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Max Tokens</span>
                <span className="font-mono text-blue-400 tabular-nums">{maxTokens}</span>
              </div>
              <input
                type="range"
                min="16"
                max="256"
                step="16"
                value={maxTokens}
                onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                className="w-full accent-blue-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Attention Weights Visualizer */}
          {result?.attentionDistribution && (
            <div className="rounded-xl border border-slate-800 bg-[#0c1220] p-4 text-xs space-y-3">
              <h4 className="font-semibold text-slate-200">
                Layer Attention Weights Distribution
              </h4>
              <div className="space-y-2.5">
                {result.attentionDistribution.map((item, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="font-medium text-slate-300">{item.layer}</span>
                      <span className="font-mono text-blue-400 tabular-nums">
                        {(item.attentionWeight * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${item.attentionWeight * 100}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 block">
                      {item.description}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
