import React, { useState, useEffect, useRef } from "react";
import {
  Send,
  Square,
  RotateCcw,
  Copy,
  Check,
  Trash2,
  Sliders,
  Cpu,
  AlertCircle,
  KeyRound,
  Download,
  Info,
  Terminal,
  Sparkles,
  Zap,
  Edit3,
  FilePlus,
  FolderPlus,
  X,
  FileCode,
  Folder,
  FileText,
  FileSpreadsheet,
  Layers,
  Eye,
  Paperclip,
  CheckCircle2,
} from "lucide-react";
import { OllamaModel, ChatMessage, AttachedContextItem } from "../types/index.ts";
import { ContextPreviewModal } from "./ContextPreviewModal.tsx";

interface OllamaCloudWorkspaceProps {
  onOpenConfig: () => void;
  healthState: {
    connected: boolean;
    configured: boolean;
    error?: string;
  };
}

export const OllamaCloudWorkspace: React.FC<OllamaCloudWorkspaceProps> = ({
  onOpenConfig,
  healthState,
}) => {
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("gemma4:31b-cloud");
  const [isCustomModel, setIsCustomModel] = useState(false);
  const [customModelInput, setCustomModelInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "msg-init",
      role: "assistant",
      content:
        "Welcome to the OptiNeural Ollama Cloud workspace with RAG context ingestion. Attach files, repositories, or full codebase folders using the '+ File' and '+ Folder' toolbar below to ground the model on your exact PyTorch code, datasets, or configurations.",
      timestamp: Date.now(),
      modelUsed: "gemma4:31b-cloud",
    },
  ]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);

  const GEMINI_POLISHED_SYSTEM_PROMPT = `You are an elite AI collaborator and senior engineering partner. 
Your tone is warm, engaging, articulate, and natural—like a brilliant human colleague, mentor, or expert developer. 
- Avoid all robotic or formulaic filler phrases ("Here is the breakdown...", "As an AI...", "Certainly!", "Let's dive in").
- Speak directly to the problem, use clean conversational transitions, and structure technical answers logically with clear headings and Markdown without sounding dry or overly templated.
- Be empathetic to debugging hurdles and provide precise, actionable technical solutions immediately.`;

  type PersonaKey = "senior-partner" | "pytorch-cuda" | "code-architect";

  const PERSONA_CONFIGS: Record<PersonaKey, { label: string; prompt: string; description: string }> = {
    "senior-partner": {
      label: "Senior Partner",
      description: "Gemini-grade human collaborator & senior engineering mentor",
      prompt: GEMINI_POLISHED_SYSTEM_PROMPT,
    },
    "pytorch-cuda": {
      label: "PyTorch & CUDA",
      description: "Systems engineer specializing in PyTorch, CUDA, Triton & Ollama",
      prompt: `You are an expert AI systems engineer specializing in LLM training, GPU kernel optimization, PyTorch, CUDA, Triton, and Ollama integration.

When answering questions about attention optimization:
1. Clearly distinguish model fine-tuning, inference optimization, and custom GPU kernel development.
2. Explain whether the proposed optimization affects training, inference, or both.
3. Prefer PyTorch's torch.nn.functional.scaled_dot_product_attention as the first baseline before recommending a custom kernel.
4. Explain FlashAttention-style tiled attention, online softmax, numerical stability, and reduced global-memory traffic accurately.
5. Recommend Triton only when the user's hardware, CUDA environment, and workload support it.
6. Never assume the user has an NVIDIA GPU, a specific GPU architecture, sufficient VRAM, or a working CUDA installation.
7. Ask for GPU model, VRAM, PyTorch version, CUDA version, tensor dimensions, dtype, and the actual bottleneck when these details materially affect the solution.
8. Distinguish GPU SRAM, registers, shared memory, caches, and global VRAM. Do not imply that all attention intermediates remain in shared memory; their placement depends on the kernel implementation and compiler.
9. Explain that CUDA Unified Memory addresses memory accessibility and migration, not attention operator fusion. Discuss prefetching and memory advice only when relevant.
10. Provide executable, version-compatible code when requested. Identify dependencies, expected tensor shapes, numerical correctness checks, and benchmarking methodology.
11. Never fabricate performance gains. Require measurements against an appropriate baseline.
12. For Ollama-specific questions, explain what the Ollama API can configure and what requires modifying the underlying model runtime, inference engine, or training code.

Structure technical answers as:
- Direct answer
- Explanation of the bottleneck
- Recommended implementation
- Code or commands, when appropriate
- Hardware and compatibility requirements
- Correctness and performance verification

Prioritize correctness, reproducibility, and practical implementation over impressive-sounding claims.`,
    },
    "code-architect": {
      label: "Code Architect",
      description: "Software design, clean modular interfaces & type safety",
      prompt: `${GEMINI_POLISHED_SYSTEM_PROMPT}\n\nDomain Specialization: You are an elite software architect and systems engineer. Focus on clean interfaces, type safety, modular design, asymptotic efficiency, maintainability, and production reliability.`,
    },
  };

  const [activePersona, setActivePersona] = useState<PersonaKey>("senior-partner");
  const [temperature, setTemperature] = useState<number>(0.7);
  const [systemPrompt, setSystemPrompt] = useState<string>(GEMINI_POLISHED_SYSTEM_PROMPT);
  const [showSettings, setShowSettings] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [streamSpeed, setStreamSpeed] = useState<number | null>(null);

  // RAG Context State
  const [attachedContext, setAttachedContext] = useState<AttachedContextItem[]>([]);
  const [previewItem, setPreviewItem] = useState<AttachedContextItem | null>(null);
  const [isIngesting, setIsIngesting] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Hidden File & Folder Inputs
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetchModels();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        220
      )}px`;
    }
  }, [input]);

  const fetchModels = async () => {
    try {
      const res = await fetch("/api/ollama/models");
      const data = await res.json();
      if (Array.isArray(data.models) && data.models.length > 0) {
        setModels(data.models);
        const hasGemma = data.models.some(
          (m: OllamaModel) =>
            m.name === "gemma4:31b-cloud" || m.model === "gemma4:31b-cloud"
        );
        if (hasGemma && selectedModel === "llama3.3:70b") {
          setSelectedModel("gemma4:31b-cloud");
        }
      }
    } catch (e) {
      console.error("Failed to fetch models", e);
    }
  };

  // Helper to estimate token count (~4 characters per token)
  const estimateTokens = (text: string) => Math.max(1, Math.round(text.length / 3.8));

  // Handle single/multi-file ingestion
  const handleFilesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsIngesting(true);
    const newItems: AttachedContextItem[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const text = await readFileAsText(file);
        const ext = file.name.split(".").pop()?.toLowerCase() || "";
        newItems.push({
          id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          name: file.name,
          type: "file",
          size: file.size,
          tokens: estimateTokens(text),
          content: text,
          extension: ext,
        });
      } catch (err) {
        console.error(`Failed to read file ${file.name}:`, err);
      }
    }

    setAttachedContext((prev) => [...prev, ...newItems]);
    setIsIngesting(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Handle directory/folder ingestion using webkitdirectory
  const handleFolderUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsIngesting(true);
    let totalSize = 0;
    let accumulatedContent = "";
    let readCount = 0;
    const folderName =
      (files[0] as any).webkitRelativePath?.split("/")[0] || "Codebase Folder";

    // Common text/code extensions to include
    const allowedExtensions = new Set([
      "py", "ts", "tsx", "js", "jsx", "json", "yaml", "yml", "md",
      "txt", "csv", "sql", "sh", "env", "toml", "cfg", "ini", "c",
      "cpp", "h", "hpp", "rs", "go", "java", "kt", "html", "css"
    ]);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const relPath = (file as any).webkitRelativePath || file.name;

      // Filter out node_modules, git, binaries, hidden dirs
      if (
        relPath.includes("node_modules/") ||
        relPath.includes(".git/") ||
        relPath.includes("dist/") ||
        relPath.includes("build/") ||
        relPath.includes("__pycache__/") ||
        relPath.endsWith(".pyc") ||
        relPath.endsWith(".png") ||
        relPath.endsWith(".jpg") ||
        relPath.endsWith(".jpeg") ||
        relPath.endsWith(".zip") ||
        relPath.endsWith(".tar.gz")
      ) {
        continue;
      }

      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      if (!allowedExtensions.has(ext) && file.size > 200000) continue;

      try {
        const text = await readFileAsText(file);
        // Cap individual file size in folder to prevent massive prompt overflow
        const truncatedText =
          text.length > 50000
            ? text.slice(0, 50000) + "\n...[file truncated for context budget]"
            : text;

        accumulatedContent += `\n\n--- File: ${relPath} (${file.size} bytes) ---\n${truncatedText}`;
        totalSize += file.size;
        readCount++;
      } catch (err) {
        console.error(`Skipping unreadable file ${relPath}:`, err);
      }
    }

    if (readCount > 0) {
      const folderItem: AttachedContextItem = {
        id: `folder-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: folderName,
        type: "folder",
        size: totalSize,
        fileCount: readCount,
        tokens: estimateTokens(accumulatedContent),
        content: `Folder Ingestion Manifest: ${folderName}\nTotal Code Files: ${readCount}\n${accumulatedContent}`,
      };
      setAttachedContext((prev) => [...prev, folderItem]);
    }

    setIsIngesting(false);
    if (folderInputRef.current) folderInputRef.current.value = "";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    setIsIngesting(true);
    const newItems: AttachedContextItem[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const text = await readFileAsText(file);
        const ext = file.name.split(".").pop()?.toLowerCase() || "";
        newItems.push({
          id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          name: file.name,
          type: "file",
          size: file.size,
          tokens: estimateTokens(text),
          content: text,
          extension: ext,
        });
      } catch (err) {
        console.error(`Skipping file ${file.name}`, err);
      }
    }
    setAttachedContext((prev) => [...prev, ...newItems]);
    setIsIngesting(false);
  };

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  };

  // Quick preset loader: attaches the OptiNeural Python scripts from the project
  const handleAttachOptiNeuralPreset = async () => {
    setIsIngesting(true);
    try {
      const res = await fetch("/api/optineural/files");
      const data = await res.json();
      if (Array.isArray(data.files)) {
        const presetItems: AttachedContextItem[] = data.files.map(
          (f: any) => ({
            id: `preset-${f.name}-${Date.now()}`,
            name: f.name,
            type: "file",
            size: parseInt(f.size) * 1024 || 12000,
            tokens: estimateTokens(f.snippet),
            content: `// Source: OptiNeural Repository / ${f.name}\n// Description: ${f.description}\n\n${f.snippet}`,
            extension: f.type,
          })
        );
        setAttachedContext((prev) => [...prev, ...presetItems]);
      }
    } catch (err) {
      console.error("Failed to load preset files", err);
    } finally {
      setIsIngesting(false);
    }
  };

  const handleRemoveContextItem = (id: string) => {
    setAttachedContext((prev) => prev.filter((item) => item.id !== id));
  };

  const handleClearContext = () => {
    setAttachedContext([]);
  };

  const totalContextTokens = attachedContext.reduce(
    (acc, item) => acc + item.tokens,
    0
  );

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (item: AttachedContextItem) => {
    if (item.type === "folder") {
      return <Folder className="h-3.5 w-3.5 text-purple-400 shrink-0" />;
    }
    const ext = item.extension?.toLowerCase();
    if (["py", "ts", "tsx", "js", "jsx", "rs", "cpp", "c", "h"].includes(ext || "")) {
      return <FileCode className="h-3.5 w-3.5 text-blue-400 shrink-0" />;
    }
    if (["json", "yaml", "yml", "toml"].includes(ext || "")) {
      return <FileText className="h-3.5 w-3.5 text-amber-400 shrink-0" />;
    }
    if (["csv", "tsv", "parquet"].includes(ext || "")) {
      return <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400 shrink-0" />;
    }
    return <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0" />;
  };

  const handleSend = async (contentToSend?: string, modelOverride?: string) => {
    const text = contentToSend || input;
    if ((!text.trim() && attachedContext.length === 0) || isStreaming) return;

    const activeModel = modelOverride || selectedModel;
    if (modelOverride) {
      setSelectedModel(modelOverride);
    }

    // Prepare full RAG prompt payload for the LLM
    let fullPromptForLlm = text.trim();
    const hasRAG = attachedContext.length > 0;

    if (hasRAG) {
      const ragPreamble = attachedContext
        .map(
          (c) =>
            `=== CONTEXT: ${c.type.toUpperCase()} '${c.name}' (${c.tokens} tokens) ===\n${c.content}`
        )
        .join("\n\n");

      fullPromptForLlm = `[GROUNDED WORKSPACE CONTEXT / ATTACHED REPOSITORY FILES]:\n${ragPreamble}\n\n========================================\n[USER INQUIRY]:\n${text.trim() || "Analyze the attached context and provide architectural feedback or summary."}`;
    }

    // UI representation (clean without dumping 10k lines into chat bubble)
    const userDisplayContent = text.trim() || "(Sent attached workspace context)";

    const userMessage: ChatMessage = {
      id: "msg-" + Date.now(),
      role: "user",
      content: hasRAG
        ? `📎 Attached Context: ${attachedContext.map((c) => c.name).join(", ")} (~${totalContextTokens.toLocaleString()} tokens)\n\n${userDisplayContent}`
        : userDisplayContent,
      timestamp: Date.now(),
    };

    const assistantPlaceholderId = "msg-" + (Date.now() + 1);
    const initialAssistantMessage: ChatMessage = {
      id: assistantPlaceholderId,
      role: "assistant",
      content: "",
      timestamp: Date.now(),
      modelUsed: activeModel,
    };

    setMessages((prev) => [...prev, userMessage, initialAssistantMessage]);
    if (!contentToSend) setInput("");
    setIsStreaming(true);
    setStreamSpeed(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const startTime = performance.now();
    let tokenCount = 0;

    try {
      const activeSystemInstruction = systemPrompt.trim() || GEMINI_POLISHED_SYSTEM_PROMPT;

      const conversationHistory = [
        { role: "system", content: activeSystemInstruction },
        ...messages
          .filter((m) => m.role !== "system" && !m.isError)
          .map((m) => ({ role: m.role, content: m.content })),
        { role: "user", content: fullPromptForLlm },
      ];

      const response = await fetch("/api/ollama/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: activeModel,
          messages: conversationHistory,
          temperature,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        let rawDetail =
          errorData.detail ||
          errorData.error ||
          `HTTP ${response.status} from Ollama Cloud`;
        let suggestedModel = errorData.suggestedModel;

        if (!suggestedModel) {
          const match = rawDetail.match(/Try\s+([a-zA-Z0-9_.:-]+)/i);
          if (match && match[1]) suggestedModel = match[1];
        }

        try {
          const parsed = JSON.parse(rawDetail);
          if (parsed.error) rawDetail = parsed.error;
        } catch {}

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantPlaceholderId
              ? {
                  ...msg,
                  isError: true,
                  suggestedModel,
                  content: rawDetail,
                }
              : msg
          )
        );
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No readable stream received from server");

      const decoder = new TextDecoder("utf-8");
      let streamBuffer = "";
      let accumulatedContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        streamBuffer += decoder.decode(value, { stream: true });
        const lines = streamBuffer.split("\n");
        streamBuffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const parsed = JSON.parse(trimmed);
            if (parsed.message?.content) {
              accumulatedContent += parsed.message.content;
              tokenCount += 1;
              const elapsedSec = (performance.now() - startTime) / 1000;
              const currentTokensPerSec =
                elapsedSec > 0 ? Math.round(tokenCount / elapsedSec) : 0;

              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantPlaceholderId
                    ? {
                        ...msg,
                        content: accumulatedContent,
                        tokensPerSec: currentTokensPerSec,
                        totalTokens: tokenCount,
                      }
                    : msg
                )
              );
              setStreamSpeed(currentTokensPerSec);
            }
          } catch {
            // Partial chunk
          }
        }
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantPlaceholderId
              ? { ...msg, content: msg.content + "\n\n*(Generation stopped by user)*" }
              : msg
          )
        );
      } else {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantPlaceholderId
              ? {
                  ...msg,
                  isError: true,
                  content: `[Stream Interrupted]: ${err.message || "Connection lost"}`,
                }
              : msg
          )
        );
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const handleRetry = () => {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    if (lastUserMsg) {
      handleSend(lastUserMsg.content);
    }
  };

  const handleCopy = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClear = () => {
    setMessages([
      {
        id: "msg-" + Date.now(),
        role: "assistant",
        content:
          "Workspace cleared. Select an Ollama Cloud model or enter a prompt below.",
        timestamp: Date.now(),
        modelUsed: selectedModel,
      },
    ]);
  };

  const handleExport = () => {
    const markdown = messages
      .map(
        (m) =>
          `### ${m.role === "user" ? "User" : `Assistant (${m.modelUsed || "Ollama"})`}\n\n${
            m.content
          }\n`
      )
      .join("\n---\n\n");
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `optineural-ollama-session-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const selectedModelObj = models.find(
    (m) => m.name === selectedModel || m.model === selectedModel
  );

  const samplePrompts = [
    {
      title: "Analyze Attached Codebase",
      prompt:
        "Please review the attached training harness and model configuration files. Identify potential throughput bottlenecks and memory optimization opportunities.",
    },
    {
      title: "CUDA Kernel Optimization",
      prompt:
        "How can I optimize a custom PyTorch attention kernel using Triton or CUDA unified memory to eliminate DRAM roundtrips?",
    },
    {
      title: "Loss Spike Diagnosis",
      prompt:
        "My Transformer training run experiences sudden loss spikes around step 45,000 using AdamW. What gradient clipping or beta2 adjustments should I test?",
    },
    {
      title: "FlashAttention-2 Integration",
      prompt:
        "Provide an idiomatic PyTorch module demonstrating scaled_dot_product_attention with causal masking and rotary embeddings (RoPE).",
    },
  ];

  return (
    <div className="flex h-[calc(100vh-65px)] flex-col bg-[#090d16] text-slate-100">
      {/* Workspace Header Strip */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800 bg-[#0c1220] px-6 py-2.5 gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-blue-400" />
            <span className="text-xs font-semibold text-slate-200">Active Model:</span>

            {isCustomModel ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={customModelInput}
                  onChange={(e) => setCustomModelInput(e.target.value)}
                  placeholder="e.g. gemma4:31b-cloud"
                  className="rounded-md border border-blue-500 bg-slate-900 px-2.5 py-1 text-xs font-mono text-slate-200 focus:outline-hidden w-48"
                />
                <button
                  onClick={() => {
                    if (customModelInput.trim()) {
                      setSelectedModel(customModelInput.trim());
                    }
                    setIsCustomModel(false);
                  }}
                  className="rounded bg-blue-600 px-2 py-1 text-[11px] text-white hover:bg-blue-500 cursor-pointer"
                >
                  Apply
                </button>
              </div>
            ) : (
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs font-medium text-slate-200 focus:border-blue-500 focus:outline-hidden font-mono"
              >
                {models.map((m) => (
                  <option key={m.name} value={m.name}>
                    {m.name === "gemma4:31b-cloud"
                      ? `${m.name} (Free Plan Default)`
                      : m.name}
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={() => {
                setIsCustomModel(!isCustomModel);
                setCustomModelInput(selectedModel);
              }}
              title="Enter custom model identifier"
              className="text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Edit3 className="h-3.5 w-3.5" />
            </button>
          </div>

          {selectedModel !== "gemma4:31b-cloud" && (
            <button
              onClick={() => setSelectedModel("gemma4:31b-cloud")}
              className="flex items-center gap-1 rounded bg-blue-950/60 border border-blue-800/60 px-2 py-0.5 text-[11px] text-blue-300 hover:bg-blue-900/60 hover:text-white transition-colors cursor-pointer"
            >
              <Zap className="h-3 w-3 text-blue-400" />
              <span>Use Free Plan (gemma4:31b-cloud)</span>
            </button>
          )}

          {selectedModelObj?.details?.quantization_level && (
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
              <span className="text-slate-600">/</span>
              <span>
                Quant:{" "}
                <strong className="font-mono text-slate-300">
                  {selectedModelObj.details.quantization_level}
                </strong>
              </span>
              <span className="text-slate-600">/</span>
              <span>
                Family:{" "}
                <strong className="text-slate-300">
                  {selectedModelObj.details.family || "Transformer"}
                </strong>
              </span>
            </div>
          )}

          {/* Quick Persona Switcher Segmented Control */}
          <div className="flex items-center gap-1.5 border-l border-slate-800 pl-3">
            <span className="text-xs text-slate-400 font-medium hidden md:inline">Persona:</span>
            <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 rounded-lg p-0.5">
              {(["senior-partner", "pytorch-cuda", "code-architect"] as PersonaKey[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    setActivePersona(p);
                    setSystemPrompt(PERSONA_CONFIGS[p].prompt);
                  }}
                  title={PERSONA_CONFIGS[p].description}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer whitespace-nowrap ${
                    activePersona === p
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {PERSONA_CONFIGS[p].label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {streamSpeed !== null && (
            <div className="text-xs text-blue-400 font-mono tabular-nums">
              {streamSpeed} tok/s
            </div>
          )}

          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
              showSettings
                ? "bg-blue-600 text-white"
                : "border border-slate-700 bg-slate-900 text-slate-300 hover:text-white"
            }`}
          >
            <Sliders className="h-3.5 w-3.5" />
            <span>Parameters</span>
          </button>

          <button
            onClick={handleExport}
            title="Export conversation as Markdown"
            className="flex items-center gap-1 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={handleClear}
            title="Clear Chat History"
            className="flex items-center gap-1 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-300 hover:text-red-400 transition-colors cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Cloud Authentication Warning Banner if not connected */}
      {!healthState.connected && (
        <div className="flex items-center justify-between border-b border-amber-900/40 bg-amber-950/20 px-6 py-2 text-xs text-amber-300">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-400" />
            <span>
              Ollama Cloud is not yet authenticated with an active API Key.
            </span>
          </div>
          <button
            onClick={onOpenConfig}
            className="flex items-center gap-1 rounded bg-amber-500/20 px-2.5 py-1 font-medium text-amber-200 hover:bg-amber-500/30 transition-colors cursor-pointer"
          >
            <KeyRound className="h-3 w-3" />
            Configure Key
          </button>
        </div>
      )}

      {/* Main Split Body: Chat Pane + Optional Settings Drawer */}
      <div className="flex flex-1 overflow-hidden">
        {/* Chat Feed */}
        <div className="flex flex-1 flex-col overflow-y-auto p-6 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex flex-col ${
                message.role === "user" ? "items-end" : "items-start"
              }`}
            >
              <div className="flex items-center gap-2 text-[11px] text-slate-400 mb-1">
                <span>
                  {message.role === "user"
                    ? "Research Engineer"
                    : message.modelUsed
                    ? `Ollama Cloud · ${message.modelUsed}`
                    : "OptiNeural Assistant"}
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">
                  {new Date(message.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                {message.tokensPerSec && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono text-blue-400 tabular-nums">
                      {message.tokensPerSec} tok/s
                    </span>
                  </>
                )}
              </div>

              <div
                className={`group relative max-w-3xl rounded-xl p-4 text-xs leading-relaxed ${
                  message.role === "user"
                    ? "bg-blue-600 text-white font-normal shadow-lg shadow-blue-950/20"
                    : message.isError
                    ? "border border-red-500/40 bg-red-950/30 text-red-200"
                    : "border border-slate-800 bg-[#0d1424] text-slate-200"
                }`}
              >
                <div className="whitespace-pre-wrap font-sans text-[13px] leading-relaxed">
                  {message.content || (
                    <span className="inline-flex items-center gap-1.5 text-slate-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
                      Streaming response from Ollama Cloud ({selectedModel})...
                    </span>
                  )}
                </div>

                {/* Free Plan Model Suggestion Box with One-Click Fix */}
                {message.suggestedModel && (
                  <div className="mt-3.5 rounded-lg border border-blue-500/40 bg-[#091122] p-3 text-xs space-y-2">
                    <div className="flex items-center gap-2 font-semibold text-blue-300">
                      <Sparkles className="h-4 w-4 text-blue-400" />
                      <span>Free Plan Model Available</span>
                    </div>
                    <p className="text-[12px] text-slate-300 leading-normal">
                      Your Ollama Cloud Free Plan provides access to{" "}
                      <strong className="text-white font-mono bg-blue-950/80 px-1 py-0.5 rounded border border-blue-800/40">
                        {message.suggestedModel}
                      </strong>
                      . Switch to this model to execute your queries without plan restrictions.
                    </p>
                    <button
                      onClick={() => {
                        const lastUser = [...messages]
                          .reverse()
                          .find((m) => m.role === "user");
                        if (lastUser) {
                          handleSend(lastUser.content, message.suggestedModel);
                        } else {
                          setSelectedModel(message.suggestedModel!);
                        }
                      }}
                      className="flex items-center gap-1.5 rounded-md bg-blue-600 px-3.5 py-1.5 font-medium text-white hover:bg-blue-500 transition-colors cursor-pointer mt-1"
                    >
                      <Zap className="h-3.5 w-3.5" />
                      <span>Switch to {message.suggestedModel} & Retry Query</span>
                    </button>
                  </div>
                )}

                {message.role === "assistant" && message.content && !message.isError && (
                  <div className="mt-3 flex items-center justify-end gap-2 border-t border-slate-800/80 pt-2 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleCopy(message.content, message.id)}
                      className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-100 transition-colors cursor-pointer"
                    >
                      {copiedId === message.id ? (
                        <>
                          <Check className="h-3 w-3 text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Prompt Starter Cards when conversation is fresh */}
          {messages.length <= 1 && (
            <div className="pt-4">
              <p className="text-xs font-semibold text-slate-400 mb-2.5 flex items-center gap-1.5">
                <Terminal className="h-3.5 w-3.5 text-blue-400" />
                Prompt Starters & PyTorch Debugging:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {samplePrompts.map((sample, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(sample.prompt)}
                    className="flex flex-col text-left rounded-lg border border-slate-800 bg-[#0d1424]/60 p-3 hover:border-blue-500/40 hover:bg-[#0d1424] transition-all cursor-pointer"
                  >
                    <span className="text-xs font-medium text-slate-200 mb-1">
                      {sample.title}
                    </span>
                    <span className="text-[11px] text-slate-400 line-clamp-2">
                      {sample.prompt}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Hyperparameter / System Prompt Drawer */}
        {showSettings && (
          <div className="w-80 border-l border-slate-800 bg-[#0c1220] p-4 text-xs overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="font-semibold text-slate-200">Sampling Settings</h3>
              <button
                onClick={() => setShowSettings(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span className="font-medium">Temperature</span>
                <span className="font-mono text-blue-400 tabular-nums">
                  {temperature.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min="0.0"
                max="2.0"
                step="0.05"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full accent-blue-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>0.0 (Deterministic)</span>
                <span>1.0 (Standard)</span>
                <span>2.0 (Creative)</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-medium text-slate-300">
                  System Persona
                </label>
                <span className="text-[10px] text-blue-400 font-mono">Customizable</span>
              </div>
              <div className="flex flex-wrap gap-1 mb-2">
                {(["senior-partner", "pytorch-cuda", "code-architect"] as PersonaKey[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      setActivePersona(p);
                      setSystemPrompt(PERSONA_CONFIGS[p].prompt);
                    }}
                    className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer ${
                      activePersona === p
                        ? "bg-blue-600 text-white"
                        : "bg-slate-800 text-slate-300 hover:text-white"
                    }`}
                  >
                    {PERSONA_CONFIGS[p].label}
                  </button>
                ))}
              </div>
              <textarea
                rows={5}
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                className="w-full rounded-md border border-slate-700 bg-slate-900 p-2 text-xs text-slate-200 focus:border-blue-500 focus:outline-hidden font-mono"
              />
            </div>

            <div className="rounded-md border border-slate-800 bg-slate-900/60 p-3 text-[11px] text-slate-400 leading-relaxed">
              <div className="flex items-center gap-1.5 font-medium text-slate-300 mb-1">
                <Info className="h-3.5 w-3.5 text-blue-400" />
                <span>Ollama Cloud Protocol</span>
              </div>
              Streaming is received via newline-delimited JSON (NDJSON) over HTTP chunked transfer directly from Ollama Cloud.
            </div>
          </div>
        )}
      </div>

      {/* Hidden File & Folder Inputs for RAG Ingestion */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFilesUpload}
        className="hidden"
        accept=".py,.ts,.tsx,.js,.jsx,.json,.yaml,.yml,.md,.txt,.csv,.sql,.env,.sh,.rs,.cpp,.h,.parquet"
      />
      <input
        ref={folderInputRef}
        type="file"
        // HTML5 directory picker attributes
        {...({ webkitdirectory: "", directory: "", multiple: true } as any)}
        onChange={handleFolderUpload}
        className="hidden"
      />

      {/* Google AI Studio Signature Floating Prompt Container */}
      <div className="p-4 bg-gradient-to-t from-[#090d16] via-[#090d16]/95 to-transparent">
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative mx-auto max-w-4xl rounded-2xl border ${
            isDraggingOver
              ? "border-blue-400 bg-blue-950/40 ring-2 ring-blue-400/40"
              : "border-slate-700/80 bg-[#0e1628]/95 hover:border-slate-600/90"
          } p-3.5 shadow-[inset_0_1px_2px_rgba(255,255,255,0.06),0_16px_36px_rgba(0,0,0,0.65)] backdrop-blur-md transition-all focus-within:border-blue-500/90 focus-within:ring-2 focus-within:ring-blue-500/25 focus-within:shadow-[inset_0_1px_2px_rgba(255,255,255,0.08),0_16px_40px_rgba(37,99,235,0.15)]`}
        >
          {isDraggingOver && (
            <div className="absolute inset-0 z-30 flex items-center justify-center rounded-2xl bg-[#091122]/95 border-2 border-dashed border-blue-400 backdrop-blur-xs text-xs font-medium text-blue-300">
              <div className="flex items-center gap-2 animate-pulse">
                <FilePlus className="h-5 w-5 text-blue-400" />
                <span>Drop files or directories to ingest into RAG context</span>
              </div>
            </div>
          )}
          
          {/* Attached Context Badge Pills Area */}
          {attachedContext.length > 0 && (
            <div className="mb-3 space-y-2 border-b border-slate-800/80 pb-3">
              <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 font-mono">
                <div className="flex items-center gap-2">
                  <Paperclip className="h-3.5 w-3.5 text-blue-400" />
                  <span className="text-slate-300 font-medium">
                    Attached Context ({attachedContext.length}{" "}
                    {attachedContext.length === 1 ? "item" : "items"})
                  </span>
                  <span>·</span>
                  <span className="text-blue-400 tabular-nums">
                    ~{totalContextTokens.toLocaleString()} tokens
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleClearContext}
                  className="text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
                >
                  Clear all
                </button>
              </div>

              {/* Horizontal Scrollable Context Chips */}
              <div className="flex flex-wrap items-center gap-2 max-h-24 overflow-y-auto px-0.5">
                {attachedContext.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-2 rounded-lg border border-slate-700/80 bg-slate-900/90 py-1 pl-2.5 pr-1.5 text-xs text-slate-200 transition-all hover:border-slate-600 hover:bg-slate-800/90"
                  >
                    {getFileIcon(item)}
                    <span className="font-mono text-[11px] font-medium max-w-[140px] truncate">
                      {item.name}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 tabular-nums">
                      {formatSize(item.size)}
                    </span>
                    <div className="flex items-center gap-1 ml-1 border-l border-slate-800 pl-1.5">
                      <button
                        type="button"
                        onClick={() => setPreviewItem(item)}
                        title="Inspect context content"
                        className="text-slate-400 hover:text-blue-300 p-0.5 rounded transition-colors cursor-pointer"
                      >
                        <Eye className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveContextItem(item.id)}
                        title="Remove attachment"
                        className="text-slate-400 hover:text-red-400 p-0.5 rounded transition-colors cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Expandable Textarea Prompt Box */}
          <textarea
            ref={textareaRef}
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={
              attachedContext.length > 0
                ? "Ask about the attached files or codebase context (Shift+Enter for newline)..."
                : `Type instructions or inquiry for ${selectedModel}... (Shift+Enter for newline)`
            }
            disabled={isStreaming || isIngesting}
            className="w-full resize-none bg-transparent px-1 text-sm text-slate-100 placeholder-slate-500 focus:outline-hidden disabled:opacity-60 font-sans leading-relaxed min-h-[48px]"
          />

          {/* Action Toolbar Inside Container */}
          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80 pt-2.5">
            {/* Left Action Buttons: RAG Attachments */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isIngesting || isStreaming}
                className="flex items-center gap-1.5 rounded-lg border border-slate-700/80 bg-slate-900/80 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:border-blue-500/60 hover:bg-slate-800 hover:text-white transition-all cursor-pointer disabled:opacity-50"
              >
                <FilePlus className="h-3.5 w-3.5 text-blue-400" />
                <span>+ File</span>
              </button>

              <button
                type="button"
                onClick={() => folderInputRef.current?.click()}
                disabled={isIngesting || isStreaming}
                className="flex items-center gap-1.5 rounded-lg border border-slate-700/80 bg-slate-900/80 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:border-purple-500/60 hover:bg-slate-800 hover:text-white transition-all cursor-pointer disabled:opacity-50"
              >
                <FolderPlus className="h-3.5 w-3.5 text-purple-400" />
                <span>+ Folder</span>
              </button>

              <button
                type="button"
                onClick={handleAttachOptiNeuralPreset}
                disabled={isIngesting || isStreaming}
                title="Quickly attach OptiNeural Python repository scripts (train.py, model.py, etc.)"
                className="hidden sm:flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/50 px-2.5 py-1.5 text-xs text-slate-400 hover:border-slate-700 hover:text-slate-200 transition-colors cursor-pointer"
              >
                <Layers className="h-3.5 w-3.5 text-slate-400" />
                <span>+ Project Codebase</span>
              </button>

              {isIngesting && (
                <span className="flex items-center gap-1 text-[11px] text-blue-400 animate-pulse font-mono">
                  Ingesting context...
                </span>
              )}
            </div>

            {/* Right Action Buttons: Controls & Run Action */}
            <div className="flex items-center gap-2.5">
              {/* Persona indicator pill */}
              <button
                type="button"
                onClick={() => setShowSettings(true)}
                title={`Active Persona: ${PERSONA_CONFIGS[activePersona].label}. Click to view or customize.`}
                className="hidden sm:flex items-center gap-1.5 text-[11px] font-medium text-slate-300 bg-slate-900/80 border border-slate-700/80 hover:border-blue-500/60 hover:text-white rounded-lg px-2.5 py-1.5 transition-all cursor-pointer"
              >
                <Sparkles className="h-3 w-3 text-blue-400" />
                <span>{PERSONA_CONFIGS[activePersona].label}</span>
              </button>

              {attachedContext.length > 0 && (
                <div className="hidden md:flex items-center gap-1 text-[11px] text-slate-400 font-mono">
                  <span>Context:</span>
                  <span className="text-blue-400 font-semibold tabular-nums">
                    ~{totalContextTokens.toLocaleString()} tok
                  </span>
                </div>
              )}

              {isStreaming ? (
                <button
                  type="button"
                  onClick={handleStop}
                  className="flex items-center gap-1.5 rounded-xl border border-red-500/50 bg-red-950/50 px-4 py-2 text-xs font-semibold text-red-300 hover:bg-red-900/60 transition-all cursor-pointer shadow-lg shadow-red-950/40"
                >
                  <Square className="h-3.5 w-3.5 fill-red-400" />
                  <span>Stop</span>
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleRetry}
                    disabled={messages.length <= 1}
                    title="Regenerate previous turn"
                    className="flex items-center gap-1 rounded-xl border border-slate-700 bg-slate-900 px-2.5 py-2 text-xs text-slate-300 hover:text-white transition-colors disabled:opacity-40 cursor-pointer"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSend()}
                    disabled={
                      (!input.trim() && attachedContext.length === 0) ||
                      isStreaming ||
                      isIngesting
                    }
                    className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white hover:bg-blue-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-lg shadow-blue-600/30 active:scale-98"
                  >
                    <Sparkles className="h-3.5 w-3.5 fill-white" />
                    <span>Run</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Context File/Folder Preview Modal */}
      <ContextPreviewModal
        item={previewItem}
        onClose={() => setPreviewItem(null)}
      />
    </div>
  );
};
