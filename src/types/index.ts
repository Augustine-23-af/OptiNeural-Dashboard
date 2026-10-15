export interface OllamaModelDetails {
  parent_model?: string;
  format?: string;
  family?: string;
  families?: string[];
  parameter_size?: string;
  quantization_level?: string;
}

export interface OllamaModel {
  name: string;
  model?: string;
  size?: number;
  digest?: string;
  details?: OllamaModelDetails;
  description?: string;
}

export interface AttachedContextItem {
  id: string;
  name: string;
  type: "file" | "folder";
  size: number;
  tokens: number;
  content: string;
  fileCount?: number;
  extension?: string;
  path?: string;
}

export interface ChatMessage {
  id: string;
  role: "system" | "user" | "assistant";
  content: string;
  timestamp: number;
  modelUsed?: string;
  tokensPerSec?: number;
  totalTokens?: number;
  suggestedModel?: string;
  isError?: boolean;
}

export interface Checkpoint {
  id: string;
  filename: string;
  architecture: string;
  parameters: string;
  epoch: number;
  step: number;
  valLoss: number;
  perplexity: number;
  sizeBytes: number;
  date: string;
  format: string;
  isActive: boolean;
}

export interface TrainingState {
  status: "idle" | "running" | "paused";
  architecture: string;
  optimizer: string;
  precision: string;
  batchSize: number;
  learningRate: number;
  currentEpoch: number;
  currentStep: number;
  maxSteps: number;
  currentLoss: number;
  valLoss: number;
  tokensPerSec: number;
  etaSeconds: number;
  lossHistory: Array<{
    step: number;
    trainLoss: number;
    valLoss: number;
    perplexity: number;
  }>;
}

export interface DatasetItem {
  id: string;
  name: string;
  tokens: string;
  size: string;
  samples: number;
  splits: { train: string; val: string; test: string };
  vocabSize: string;
  status: string;
}

export interface FileItem {
  name: string;
  type: string;
  size: string;
  lines: number;
  description: string;
  snippet: string;
}

export interface SystemTelemetry {
  system: {
    platform: string;
    release: string;
    arch: string;
    cpuModel: string;
    cpuCores: number;
    loadAverage: number[];
    totalMemoryBytes: number;
    freeMemoryBytes: number;
    usedMemoryBytes: number;
    memoryUsagePercent: number;
    processUptimeSeconds: number;
  };
  gpu: {
    detected: boolean;
    device: string;
    cudaVersion: string;
    driverVersion: string;
    totalVramGb: number;
    usedVramGb: number;
    vramPercent: number;
    gpuUtilizationPercent: number;
    temperatureCelsius: number;
    powerDrawWatts: number;
  };
}
