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
    <div className="p-4 bg-indigo-50 dark:bg-gray-800/50 border border-indigo-200 dark:border-gray-800 rounded-xl shadow-sm">
      <div className="flex items-center gap-4">
        <div className="flex-shrink-0 p-2 bg-indigo-100 dark:bg-indigo-950/40 rounded-full">
          <SparklesIcon className="w-6 h-6 text-indigo-500" />
        </div>
        <div className="flex-grow">
          <h3 className="font-semibold text-base text-gray-800 dark:text-gray-100">Create Task with AI</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Describe a goal, and let Gemini create the task for you.</p>
        </div>
      </div>
      <div className="mt-4 flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
          placeholder="e.g., 'Draft a blog post about the new feature launch'"
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          disabled={isLoading}
        />
        <button
          onClick={handleGenerate}
          disabled={isLoading || !prompt.trim()}
          className="flex-shrink-0 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-all text-sm"
        >
          {isLoading ? (
            <>
              <LoaderCircleIcon className="w-5 h-5 animate-spin" />
              Generating...
            </>
          ) : (
            'Generate'
          )}
        </button>
      </div>
      {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
    </div>
  );
};