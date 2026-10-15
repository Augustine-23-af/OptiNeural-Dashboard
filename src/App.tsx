import React, { useState, useEffect } from "react";
import { Navbar, NavTab } from "./components/Navbar.tsx";
import { OllamaCloudWorkspace } from "./components/OllamaCloudWorkspace.tsx";
import { BaseModelInference } from "./components/BaseModelInference.tsx";
import { TrainingConsole } from "./components/TrainingConsole.tsx";
import { CheckpointManager } from "./components/CheckpointManager.tsx";
import { DatasetExplorer } from "./components/DatasetExplorer.tsx";
import { HardwareTelemetry } from "./components/HardwareTelemetry.tsx";
import { CloudConfigModal } from "./components/CloudConfigModal.tsx";

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>("ollama");
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [healthState, setHealthState] = useState<{
    connected: boolean;
    configured: boolean;
    error?: string;
    baseUrl?: string;
  }>({
    connected: false,
    configured: false,
    baseUrl: "https://ollama.com",
  });

  const checkHealth = async () => {
    try {
      const res = await fetch("/api/ollama/health");
      const data = await res.json();
      setHealthState(data);
    } catch {
      setHealthState({
        connected: false,
        configured: false,
        error: "Server health endpoint unreachable",
      });
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 20000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top 3-Zone Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenConfig={() => setIsConfigOpen(true)}
        healthState={healthState}
      />

      {/* Mobile Tab Selector */}
      <div className="flex lg:hidden overflow-x-auto border-b border-slate-800 bg-[#0c1220] px-4 py-2 gap-2 text-xs">
        {[
          { id: "ollama", label: "Ollama Cloud" },
          { id: "base-inference", label: "Base Inference" },
          { id: "training", label: "Training" },
          { id: "checkpoints", label: "Checkpoints" },
          { id: "datasets", label: "Datasets & Files" },
          { id: "telemetry", label: "Telemetry" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as NavTab)}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap cursor-pointer ${
              activeTab === tab.id
                ? "bg-blue-600 text-white font-medium"
                : "text-slate-400 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Content Workspace */}
      <main className="flex-1">
        {activeTab === "ollama" && (
          <OllamaCloudWorkspace
            onOpenConfig={() => setIsConfigOpen(true)}
            healthState={healthState}
          />
        )}

        {activeTab === "base-inference" && <BaseModelInference />}

        {activeTab === "training" && <TrainingConsole />}

        {activeTab === "checkpoints" && <CheckpointManager />}

        {activeTab === "datasets" && <DatasetExplorer />}

        {activeTab === "telemetry" && <HardwareTelemetry />}
      </main>

      {/* Cloud Configuration Modal */}
      <CloudConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        onConfigSaved={checkHealth}
        healthState={healthState}
      />
    </div>
  );
}
