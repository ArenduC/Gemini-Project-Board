import React, { useMemo, useState } from 'react';
import { CopyIcon, CheckIcon, ChevronRightIcon } from './Icons';

interface JsonSyntaxHighlighterProps {
  data: string | object;
  className?: string;
}

const getDataType = (value: any) => {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
};

const JsonPrimitive: React.FC<{ value: any }> = ({ value }) => {
  const type = getDataType(value);
  
  if (type === 'string') return <span className="text-green-300 break-all">"{value}"</span>;
  if (type === 'number') return <span className="text-orange-300">{value}</span>;
  if (type === 'boolean') return <span className="text-purple-300">{String(value)}</span>;
  if (type === 'null') return <span className="text-gray-500">null</span>;
  
  return <span className="text-gray-300">{String(value)}</span>;
};

const JsonNode: React.FC<{ name?: string, value: any, isLast: boolean }> = ({ name, value, isLast }) => {
  const [expanded, setExpanded] = useState(true);
  const type = getDataType(value);
  const isObject = type === 'object';
  const isArray = type === 'array';
  const isContainer = isObject || isArray;
  
  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded(!expanded);
  };

  if (!isContainer) {
    return (
      <div className="flex font-mono text-xs leading-5 hover:bg-white/5 px-1 rounded ml-4">
        {name && <span className="text-blue-300 mr-1 flex-shrink-0">"{name}":</span>}
        <JsonPrimitive value={value} />
        {!isLast && <span className="text-gray-500 select-none">,</span>}
      </div>
    );
  }

  const keys = isObject ? Object.keys(value) : [];
  const itemCount = isArray ? value.length : keys.length;
  const isEmpty = itemCount === 0;
  
  const openBracket = isArray ? '[' : '{';
  const closeBracket = isArray ? ']' : '}';

  return (
    <div className="font-mono text-xs leading-5">
      {/* Header Line */}
      <div 
        className={`flex items-start hover:bg-white/5 px-1 rounded cursor-pointer select-none`}
        onClick={handleToggle}
      >
        {/* Toggle Icon */}
        <span className="w-4 h-5 flex items-center justify-center mr-0.5 text-gray-500 flex-shrink-0">
            {!isEmpty && (
                <ChevronRightIcon 
                    className={`w-3 h-3 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`} 
                />
            )}
        </span>

        <div className="break-all flex-grow">
            {/* Key */}
            {name && <span className="text-blue-300 mr-1">"{name}":</span>}
            
            {/* Open Bracket */}
            <span className="text-gray-300">{openBracket}</span>
            
            {/* Collapsed Content */}
            {!expanded && !isEmpty && (
                <span className="text-gray-500 mx-1 bg-white/10 px-1 rounded text-[10px]">
                    {isArray ? `${itemCount} items` : `${itemCount} keys`}
                </span>
            )}

            {/* Empty or Collapsed Close Bracket */}
            {(!expanded || isEmpty) && (
                <span>
                    <span className="text-gray-300">{closeBracket}</span>
                    {!isLast && <span className="text-gray-500">,</span>}
                </span>
            )}
        </div>
      </div>

      {/* Expanded Children */}
      {expanded && !isEmpty && (
        <div className="border-l border-gray-700/50 ml-2.5 pl-1">
            {isArray ? (
                value.map((item: any, index: number) => (
                    <JsonNode 
                        key={index} 
                        value={item} 
                        isLast={index === value.length - 1} 
                    />
                ))
            ) : (
                keys.map((key, index) => (
                    <JsonNode 
                        key={key} 
                        name={key} 
                        value={value[key]} 
                        isLast={index === keys.length - 1} 
                    />
                ))
            )}
            <div className="hover:bg-white/5 px-1 rounded ml-4">
                <span className="text-gray-300">{closeBracket}</span>
                {!isLast && <span className="text-gray-500 select-none">,</span>}
            </div>
        </div>
      )}
    </div>
  );
};

export const JsonSyntaxHighlighter: React.FC<JsonSyntaxHighlighterProps> = ({ data, className = '' }) => {
  const [copied, setCopied] = useState(false);

  const parsedData = useMemo(() => {
    if (typeof data === 'string') {
      try {
        return JSON.parse(data);
      } catch (e) {
        return data;
      }
    }
    return data;
  }, [data]);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(JSON.stringify(parsedData, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isComplex = typeof parsedData === 'object' && parsedData !== null;

  if (!isComplex) {
      return (
        <div className={`relative group bg-[#0D1117] rounded-md border border-gray-800 p-3 text-xs font-mono text-gray-300 whitespace-pre-wrap ${className}`}>
             {String(parsedData)}
        </div>
      );
  }

  return (
    <div className={`relative group bg-[#0D1117] rounded-md border border-gray-800 overflow-hidden w-full ${className}`}>
        <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
             <button
                onClick={handleCopy}
                className="p-1.5 rounded bg-gray-800 text-gray-400 hover:text-white border border-gray-700 shadow-sm"
                title="Copy JSON"
            >
                {copied ? <CheckIcon className="w-3.5 h-3.5 text-green-500" /> : <CopyIcon className="w-3.5 h-3.5" />}
            </button>
        </div>
        <div className="overflow-x-auto custom-scrollbar p-2">
            <JsonNode value={parsedData} isLast={true} />
        </div>
    </div>
  );
};