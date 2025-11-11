import React, { useState, DragEvent, useRef } from 'react';
import { FileUpIcon, LoaderCircleIcon } from './Icons';

interface TaskImportDropzoneProps {
    onFileProcessed: (fileData: { content: string, mimeType: string }) => void;
    isLoading: boolean;
}

export const TaskImportDropzone: React.FC<TaskImportDropzoneProps> = ({ onFileProcessed, isLoading }) => {
    const [isDragging, setIsDragging] = useState(false);
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
        if (!supportedTypes.includes(file.type)) {
            alert('Please upload a valid .csv, .txt, .pdf, .doc, or .docx file.');
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const result = event.target?.result as string;
            if (file.type === 'text/csv' || file.type === 'text/plain') {
                onFileProcessed({ content: result, mimeType: file.type });
            } else {
                // For binary files read as data URL, extract base64 part
                const base64Content = result.split(',')[1];
                onFileProcessed({ content: base64Content, mimeType: file.type });
            }
        };

        if (file.type === 'text/csv' || file.type === 'text/plain') {
            reader.readAsText(file);
        } else {
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="relative">
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
                className={`flex items-center justify-center gap-2 w-full h-10 px-4 py-2 border-2 border-dashed rounded-lg cursor-pointer transition-colors
                    ${isLoading ? 'border-gray-600 bg-gray-800/30' : 
                    isDragging ? 'border-gray-500 bg-gray-800/50' : 'border-gray-700 hover:border-gray-600 text-gray-400 hover:text-white'}`}
            >
                {isLoading ? (
                    <>
                        <LoaderCircleIcon className="w-5 h-5 animate-spin text-white" />
                        <span className="font-semibold text-xs text-white">AI is parsing...</span>
                    </>
                ) : (
                    <>
                        <FileUpIcon className="w-5 h-5"/>
                        <span className="font-semibold text-xs text-white">Import Tasks from File (.csv, .txt, .pdf, .doc)</span>
                    </>
                )}
            </div>
        </div>
    );
};
