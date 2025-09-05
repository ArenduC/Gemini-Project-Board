import React, { useState, FormEvent, useEffect } from 'react';
import { FeedbackType } from '../types';
import { XIcon, LoaderCircleIcon, CheckIcon, LifeBuoyIcon } from './Icons';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (feedbackData: { 
    type: FeedbackType; 
    title: string; 
    description: string; 
    contextData: { url: string; userAgent: string; }; 
  }) => Promise<void>;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [type, setType] = useState<FeedbackType>(FeedbackType.GENERAL);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) {
      // Reset form state when modal is closed
      setTimeout(() => {
        setType(FeedbackType.GENERAL);
        setTitle('');
        setDescription('');
        setStatus('idle');
        setError('');
      }, 300); // Delay to allow for closing animation
    }
  }, [isOpen]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setError('Please provide a title and description.');
      return;
    }
    setStatus('loading');
    setError('');

    const contextData = {
      url: window.location.hash || '/',
      userAgent: navigator.userAgent,
    };

    try {
      await onSubmit({ type, title, description, contextData });
      setStatus('success');
      setTimeout(() => {
        onClose();
      }, 2000); // Close after 2 seconds on success
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'An unknown error occurred. Please try again.');
    }
  };
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#131C1B] rounded-xl shadow-2xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <header className="p-4 border-b border-gray-800 flex justify-between items-center">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <LifeBuoyIcon className="w-6 h-6" />
            Submit Feedback
          </h2>
          <button onClick={onClose} className="p-2 rounded-full text-gray-400 hover:bg-gray-800 transition-colors">
            <XIcon className="w-6 h-6" />
          </button>
        </header>

        {status === 'success' ? (
          <div className="p-10 text-center">
            <CheckIcon className="w-12 h-12 mx-auto text-green-500 mb-4" />
            <h3 className="text-xl font-bold text-white">Thank You!</h3>
            <p className="text-gray-400 mt-2">Your feedback has been submitted successfully.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label htmlFor="feedback-type" className="block text-sm font-medium text-white mb-1">Feedback Type</label>
              <select
                id="feedback-type"
                value={type}
                onChange={(e) => setType(e.target.value as FeedbackType)}
                className="w-full px-3 py-2 border border-gray-800 rounded-md shadow-sm focus:outline-none focus:ring-gray-500 focus:border-gray-500 bg-[#1C2326] text-white text-sm"
              >
                {Object.values(FeedbackType).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="feedback-title" className="block text-sm font-medium text-white mb-1">Title / Summary</label>
              <input
                type="text"
                id="feedback-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-800 rounded-md shadow-sm focus:outline-none focus:ring-gray-500 focus:border-gray-500 bg-[#1C2326] text-white text-sm"
                placeholder="e.g., Button not working on dashboard"
              />
            </div>
            <div>
              <label htmlFor="feedback-description" className="block text-sm font-medium text-white mb-1">Details</label>
              <textarea
                id="feedback-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                required
                className="w-full px-3 py-2 border border-gray-800 rounded-md shadow-sm focus:outline-none focus:ring-gray-500 focus:border-gray-500 bg-[#1C2326] text-white text-sm"
                placeholder="Please provide as much detail as possible, including steps to reproduce if you're reporting a bug."
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="pt-2 flex justify-end gap-3">
              <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-700 text-white font-semibold rounded-lg hover:bg-gray-600 text-sm">
                Cancel
              </button>
              <button
                type="submit"
                disabled={status === 'loading'}
                className="px-4 py-2 bg-gray-300 text-black font-semibold rounded-lg shadow-md hover:bg-gray-400 disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
              >
                {status === 'loading' && <LoaderCircleIcon className="w-5 h-5 animate-spin" />}
                Submit
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
