import React, { useState } from 'react';
import { SparklesIcon, LoaderCircleIcon } from './Icons';

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
    <div className="relative">
      <SparklesIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
      <input
        type="text"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
        placeholder="Describe a task to generate with AI..."
        className="w-full pl-10 pr-28 py-2 border border-gray-800 rounded-lg bg-[#1C2326] text-white focus:outline-none focus:ring-2 focus:ring-gray-500 text-xs h-10"
        disabled={isLoading}
      />
      <button
        onClick={handleGenerate}
        disabled={isLoading || !prompt.trim()}
        className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center justify-center gap-2 px-3 py-1 bg-gray-700 text-white font-semibold rounded-md hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed transition-all text-xs h-8"
      >
        {isLoading ? (
          <>
            <LoaderCircleIcon className="w-4 h-4 animate-spin" />
          </>
        ) : (
          'Generate'
        )}
      </button>
      {error && <p className="text-xs text-red-500 mt-1 absolute">{error}</p>}
    </div>
  );
};
