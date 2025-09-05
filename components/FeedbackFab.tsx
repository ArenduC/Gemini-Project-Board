import React from 'react';
import { LifeBuoyIcon } from './Icons';

interface FeedbackFabProps {
  onClick: () => void;
}

export const FeedbackFab: React.FC<FeedbackFabProps> = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-30 p-3 bg-gray-300 text-black rounded-full shadow-lg hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-[#1C2326] transition-all"
      aria-label="Submit Feedback or Bug Report"
      title="Submit Feedback or Bug Report"
    >
      <LifeBuoyIcon className="w-6 h-6" />
    </button>
  );
};
