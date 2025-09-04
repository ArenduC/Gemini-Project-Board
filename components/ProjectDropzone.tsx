import React, { useState, DragEvent, useRef } from 'react';
import { FileUpIcon, LoaderCircleIcon, SparklesIcon } from './Icons';

interface ProjectDropzoneProps {
    onFileProcessed: (csvContent: string) => void;
    isLoading: boolean;
}

export const ProjectDropzone: React.FC<ProjectDropzoneProps> = ({ onFileProcessed, isLoading }) => {
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
        if (file.type !== 'text/csv') {
            alert('Please upload a valid .csv file.');
            return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            onFileProcessed(content);
        };
        reader.readAsText(file);
    };

    return (
        <div className="mb-6">
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept=".csv"
                className="hidden"
            />
            <div
                onClick={handleClick}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                className={`relative group p-6 border-2 border-dashed rounded-xl text-center cursor-pointer transition-colors duration-300
                    ${isLoading ? 'border-gray-600 bg-gray-800/30' : 
                    isDragging ? 'border-gray-500 bg-gray-800/50' : 'border-gray-700 hover:border-gray-600 hover:bg-gray-800/30'}`}
            >
                {isLoading ? (
                     <div className="flex flex-col items-center justify-center text-white">
                        <LoaderCircleIcon className="w-10 h-10 animate-spin mb-3" />
                        <h3 className="font-semibold text-base">AI is building your project...</h3>
                        <p className="text-sm text-gray-400">This may take a moment.</p>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center text-gray-400">
                        <FileUpIcon className="w-10 h-10 mb-3"/>
                        <h3 className="font-semibold text-base text-white">Create Project from CSV</h3>
                        <p className="text-sm">
                            <span className="font-semibold text-gray-300">Drop a file</span> or click to upload.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};