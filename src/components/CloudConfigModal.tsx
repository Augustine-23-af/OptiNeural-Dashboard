import React, { useState } from "react";
import { KeyRound, ShieldAlert, CheckCircle2, RefreshCw, X, Server, ExternalLink } from "lucide-react";

interface CloudConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigSaved: () => void;
  healthState: {
    connected: boolean;
    configured: boolean;
    error?: string;
    baseUrl?: string;
  };
}

export const CloudConfigModal: React.FC<CloudConfigModalProps> = ({
  isOpen,
  onClose,
  onConfigSaved,
  healthState,
}) => {
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState(healthState.baseUrl || "https://ollama.com");
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    tested: boolean;
    success: boolean;
    message: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleTestAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsTesting(true);
    setTestResult(null);

    try {
      // Send to server configuration endpoint
      const saveRes = await fetch("/api/ollama/configure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: apiKey.trim() || undefined,
          baseUrl: baseUrl.trim() || undefined,
        }),
      });
      await saveRes.json();

      // Now test health
      const testRes = await fetch("/api/ollama/health", {
        headers: apiKey.trim() ? { "x-ollama-api-key": apiKey.trim() } : {},
      });
      const healthData = await testRes.json();

      if (healthData.connected) {
        setTestResult({
          tested: true,
          success: true,
          message: `Connected successfully to Ollama Cloud (${healthData.modelCount || 0} models registered).`,
        });
        onConfigSaved();
      } else {
        setTestResult({
          tested: true,
          success: false,
          message: healthData.error || "Connection failed. Check API key format and network connectivity.",
        });
      }
    } catch (err: any) {
      setTestResult({
        tested: true,
        success: false,
        message: err?.message || "Failed to reach server test endpoint",
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-xl rounded-xl border border-slate-800 bg-[#0c1220] p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-100 transition-colors"
          aria-label="Close dialog"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-100">Ollama Cloud Configuration</h2>
            <p className="text-xs text-slate-400">
              Manage Bearer authentication for streaming inference and model catalog access
            </p>
          </div>
        </div>

        {/* Current status pill-free notice */}
        <div className="mb-5 rounded-lg border border-slate-800/80 bg-slate-900/50 p-3 text-xs">
          <div className="flex items-center justify-between text-slate-300">
            <span className="font-medium">Current Status:</span>
            <span className="flex items-center gap-1.5 font-mono">
              {healthState.connected ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Authenticated & Online</span>
                </>
              ) : healthState.configured ? (
                <>
                  <ShieldAlert className="h-3.5 w-3.5 text-amber-400" />
                  <span className="text-amber-400">Configured (Upstream Unreachable)</span>
                </>
              ) : (
                <>
                  <Server className="h-3.5 w-3.5 text-slate-400" />
                  <span className="text-slate-400">Unconfigured (Awaiting API Key)</span>
                </>
              )}
            </span>
          </div>
          {healthState.error && (
            <p className="mt-2 text-slate-400 text-[11px] leading-relaxed border-t border-slate-800 pt-2">
              {healthState.error}
            </p>
          )}
        </div>

        <form onSubmit={handleTestAndSave} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Ollama Cloud API Key (Bearer Token)
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="ollama_sec_..."
              className="w-full rounded-lg border border-slate-700 bg-slate-900/90 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 font-mono focus:border-blue-500 focus:outline-hidden"
            />
            <p className="mt-1 text-[11px] text-slate-400">
              Obtain your key from the Ollama Cloud console at{" "}
              <a
                href="https://ollama.com"
                target="_blank"
                rel="noreferrer"
                className="text-blue-400 hover:underline inline-flex items-center gap-0.5"
              >
                ollama.com <ExternalLink className="h-2.5 w-2.5 inline" />
              </a>
              . Key is kept securely server-side and never leaked to client telemetry.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Ollama Base URL
            </label>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://ollama.com"
              className="w-full rounded-lg border border-slate-700 bg-slate-900/90 px-3 py-2 text-sm text-slate-100 font-mono focus:border-blue-500 focus:outline-hidden"
            />
            <p className="mt-1 text-[11px] text-slate-500">
              Default is <code className="text-slate-400">https://ollama.com</code> for cloud, or custom private gateway.
            </p>
          </div>

          {testResult && (
            <div
              className={`rounded-lg border p-3 text-xs leading-relaxed ${
                testResult.success
                  ? "border-emerald-500/30 bg-emerald-950/20 text-emerald-300"
                  : "border-red-500/30 bg-red-950/20 text-red-300"
              }`}
            >
              {testResult.message}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isTesting}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-500 transition-colors disabled:opacity-50"
            >
              {isTesting ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  Verifying Connection...
                </>
              ) : (
                "Save & Test Connectivity"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
