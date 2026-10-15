import React, { useState, useEffect } from "react";
import { DatasetItem, FileItem } from "../types/index.ts";
import { Database, FileCode, Copy, Check, Terminal } from "lucide-react";

export const DatasetExplorer: React.FC = () => {
  const [datasets, setDatasets] = useState<DatasetItem[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchDatasetsAndFiles();
  }, []);

  const fetchDatasetsAndFiles = async () => {
    try {
      const [dsRes, filesRes] = await Promise.all([
        fetch("/api/optineural/datasets"),
        fetch("/api/optineural/files"),
      ]);
      const dsData = await dsRes.json();
      const filesData = await filesRes.json();

      if (Array.isArray(dsData.datasets)) setDatasets(dsData.datasets);
      if (Array.isArray(filesData.files)) {
        setFiles(filesData.files);
        setSelectedFile(filesData.files[0] || null);
      }
    } catch (e) {
      console.error("Failed to load datasets/files", e);
    }
  };

  const handleCopySnippet = (snippet: string) => {
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      {/* Section 1: Datasets */}
      <div>
        <div className="border-b border-slate-800 pb-3 mb-4">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Database className="h-5 w-5 text-blue-400" />
            Corpus & Pre-tokenized Datasets
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Mounted training data shards and tokenization manifests.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {datasets.map((ds) => (
            <div
              key={ds.id}
              className="rounded-xl border border-slate-800 bg-[#0c1220] p-4 text-xs space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-semibold text-slate-200">
                  {ds.name}
                </span>
                <span className="text-[11px] font-mono text-emerald-400">
                  {ds.status}
                </span>
              </div>

              <div className="space-y-1.5 text-[11px] text-slate-400">
                <div className="flex justify-between">
                  <span>Total Tokens:</span>
                  <span className="font-mono text-blue-400 tabular-nums">{ds.tokens}</span>
                </div>
                <div className="flex justify-between">
                  <span>Samples:</span>
                  <span className="font-mono text-slate-200 tabular-nums">
                    {ds.samples.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Vocabulary:</span>
                  <span className="font-mono text-slate-200">{ds.vocabSize}</span>
                </div>
                <div className="flex justify-between">
                  <span>Splits (Train/Val/Test):</span>
                  <span className="font-mono text-slate-300">
                    {ds.splits.train} / {ds.splits.val} / {ds.splits.test}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 2: Python Code Files */}
      <div>
        <div className="border-b border-slate-800 pb-3 mb-4">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <FileCode className="h-5 w-5 text-blue-400" />
            PyTorch Training Scripts & Configurations
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            OptiNeural training harness, model definition, tokenizer, and hyperparameter specs.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* File List */}
          <div className="space-y-2">
            {files.map((file) => (
              <button
                key={file.name}
                onClick={() => setSelectedFile(file)}
                className={`w-full flex items-center justify-between p-3 rounded-lg border text-left text-xs transition-colors cursor-pointer ${
                  selectedFile?.name === file.name
                    ? "border-blue-500 bg-blue-950/20 text-white"
                    : "border-slate-800 bg-[#0c1220] text-slate-300 hover:bg-slate-900/40"
                }`}
              >
                <div>
                  <span className="font-mono font-medium block">{file.name}</span>
                  <span className="text-[11px] text-slate-400">{file.lines} lines · {file.size}</span>
                </div>
                <span className="font-mono text-[10px] uppercase text-blue-400">
                  {file.type}
                </span>
              </button>
            ))}
          </div>

          {/* Code Viewer */}
          {selectedFile && (
            <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-[#0c1220] p-4 text-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div>
                  <span className="font-mono font-bold text-slate-200">
                    {selectedFile.name}
                  </span>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {selectedFile.description}
                  </p>
                </div>
                <button
                  onClick={() => handleCopySnippet(selectedFile.snippet)}
                  className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      <span>Copy Code</span>
                    </>
                  )}
                </button>
              </div>

              <pre className="p-4 rounded-lg bg-slate-950 border border-slate-800 font-mono text-[12px] text-slate-200 overflow-x-auto leading-relaxed">
                <code>{selectedFile.snippet}</code>
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
