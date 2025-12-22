import React, { useState } from 'react';
import { SparklesIcon, LoaderCircleIcon, SendIcon } from './Icons';

interface AiTaskCreatorProps {
  onGenerateTask: (prompt: string) => Promise<void>;
}

export const AiTaskCreator: React.FC<AiTaskCreatorProps> = ({ onGenerateTask }) => {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      await onGenerateTask(prompt);
      setPrompt('');
    } catch (err) {
      console.error("Failed to generate AI task:", err);
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleGenerate();
            }
          }}
          placeholder="e.g., Build a neural gateway for user onboarding..."
          className="w-full pl-4 pr-12 py-4 border border-white/10 rounded-2xl bg-[#1C2326] text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm h-32 resize-none shadow-inner custom-scrollbar"
          disabled={isLoading}
        />
        <button
          onClick={handleGenerate}
          disabled={isLoading || !prompt.trim()}
          className="absolute right-3 bottom-3 flex items-center justify-center w-10 h-10 bg-emerald-500 text-black font-bold rounded-xl hover:bg-emerald-400 disabled:bg-gray-800 disabled:text-gray-600 transition-all shadow-lg"
          title="Synthesize Task"
        >
          {isLoading ? (
            <LoaderCircleIcon className="w-5 h-5 animate-spin" />
          ) : (
            <SendIcon className="w-5 h-5" />
          )}
        </button>
      </div>
      {error && <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest ml-1">{error}</p>}
    </div>
  );
};