import React from 'react';
import { XIcon, CopyIcon, CheckIcon } from './Icons';

interface JsonViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  data: any;
}

export const JsonViewModal: React.FC<JsonViewModalProps> = ({ isOpen, onClose, title, data }) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen) return null;

  const jsonString = JSON.stringify(data, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#131C1B] rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[80vh]" onClick={(e) => e.stopPropagation()}>
        <header className="p-4 border-b border-gray-800 flex justify-between items-center">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="text-gray-400 font-mono text-sm">JSON</span>
            {title}
          </h2>
          <div className="flex items-center gap-2">
             <button
                onClick={handleCopy}
                className="p-2 rounded-md text-gray-400 hover:bg-gray-800 hover:text-white flex items-center gap-2 transition-colors"
                title="Copy JSON"
            >
                {copied ? <CheckIcon className="w-4 h-4 text-green-500" /> : <CopyIcon className="w-4 h-4" />}
                <span className="text-xs font-semibold">{copied ? 'Copied' : 'Copy'}</span>
            </button>
            <button onClick={onClose} className="p-2 rounded-full text-gray-400 hover:bg-gray-800 transition-colors">
                <XIcon className="w-6 h-6" />
            </button>
          </div>
        </header>
        <div className="p-4 overflow-auto custom-scrollbar bg-[#0D1117]">
            <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap break-words">
                {jsonString}
            </pre>
        </div>
      </div>
    </div>
  );
};
