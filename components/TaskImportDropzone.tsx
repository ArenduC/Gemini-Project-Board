import React, { useState, DragEvent, useRef } from 'react';
import { FileUpIcon, LoaderCircleIcon, CheckIcon } from './Icons';

interface TaskImportDropzoneProps {
    onFileProcessed: (fileData: { content: string, mimeType: string, name: string }) => void;
    isLoading: boolean;
}

export const TaskImportDropzone: React.FC<TaskImportDropzoneProps> = ({ onFileProcessed, isLoading }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [hasFile, setHasFile] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };
    
    const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            processFile(e.dataTransfer.files[0]);
            e.dataTransfer.clearData();
        }
    };
    
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            processFile(e.target.files[0]);
        }
    };
    
    const handleClick = () => {
        fileInputRef.current?.click();
    };

    const processFile = (file: File) => {
        const supportedTypes = ['text/csv', 'text/plain', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        if (!supportedTypes.includes(file.type) && !file.name.toLowerCase().endsWith('.csv')) {
            alert('Please upload a valid .csv, .txt, .pdf, .doc, or .docx file.');
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const result = event.target?.result as string;
            const mimeType = file.name.toLowerCase().endsWith('.csv') ? 'text/csv' : file.type;
            
            if (mimeType === 'text/csv' || mimeType === 'text/plain') {
                onFileProcessed({ content: result, mimeType: mimeType, name: file.name });
            } else {
                const base64Content = result.split(',')[1];
                onFileProcessed({ content: base64Content, mimeType: mimeType, name: file.name });
            }
            setHasFile(true);
            setTimeout(() => setHasFile(false), 2000);
        };

        if (file.type === 'text/csv' || file.type === 'text/plain' || file.name.toLowerCase().endsWith('.csv')) {
            reader.readAsText(file);
        } else {
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="relative h-40">
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept=".csv,.txt,.pdf,.doc,.docx"
                className="hidden"
            />
            <div
                onClick={handleClick}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                className={`flex flex-col items-center justify-center gap-3 w-full h-full border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300 group
                    ${isLoading ? 'border-emerald-500/50 bg-emerald-500/5' : 
                    isDragging ? 'border-emerald-400 bg-white/5 scale-[0.98]' : 'border-white/10 hover:border-white/20 hover:bg-white/5'}`}
            >
                {isLoading ? (
                    <>
                        <LoaderCircleIcon className="w-8 h-8 animate-spin text-emerald-400" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">Analyzing Mesh...</span>
                    </>
                ) : hasFile ? (
                    <>
                        <CheckIcon className="w-8 h-8 text-emerald-400" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">Array Transmitted</span>
                    </>
                ) : (
                    <>
                        <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-gray-500 group-hover:text-white transition-colors">
                            <FileUpIcon className="w-5 h-5"/>
                        </div>
                        <div className="text-center">
                            <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 group-hover:text-white transition-colors">Initialize Import</span>
                            <span className="block text-[9px] text-gray-600 font-medium mt-1">DROP DATA PACKETS HERE</span>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};