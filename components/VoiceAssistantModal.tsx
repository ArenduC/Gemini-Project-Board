

import React, { useState, useEffect, useRef } from 'react';
import { XIcon, MicrophoneIcon, LoaderCircleIcon, BotMessageSquareIcon } from './Icons';

// Web Speech API interfaces for compatibility
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onerror: ((this: SpeechRecognition, ev: Event) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
}
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}
declare var SpeechRecognition: { new(): SpeechRecognition };
declare var webkitSpeechRecognition: { new(): SpeechRecognition };

interface VoiceAssistantModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCommand: (command: string) => Promise<string>;
}

type Status = 'idle' | 'listening' | 'processing' | 'responding' | 'error';

export const VoiceAssistantModal: React.FC<VoiceAssistantModalProps> = ({ isOpen, onClose, onCommand }) => {
    const [status, setStatus] = useState<Status>('idle');
    const [transcript, setTranscript] = useState('');
    const [feedback, setFeedback] = useState('Hi! How can I help you today?');
    const recognitionRef = useRef<SpeechRecognition | null>(null);

    useEffect(() => {
        if (!isOpen) return;

        // FIX: Cast window to `any` to access non-standard SpeechRecognition APIs.
        const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognitionAPI) {
            setStatus('error');
            setFeedback('Sorry, your browser does not support voice recognition.');
            return;
        }

        recognitionRef.current = new SpeechRecognitionAPI();
        const recognition = recognitionRef.current;
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: SpeechRecognitionEvent) => {
            let interimTranscript = '';
            let finalTranscript = '';
            for (let i = 0; i < event.results.length; i++) {
                const result = event.results[i];
                if (result.isFinal) {
                    finalTranscript += result[0].transcript + ' ';
                } else {
                    interimTranscript += result[0].transcript;
                }
            }
            setTranscript(interimTranscript || finalTranscript);

            if (finalTranscript.trim()) {
                handleCommand(finalTranscript.trim());
            }
        };

        recognition.onerror = (event: any) => {
            console.error('Speech recognition error:', event.error);
            setStatus('error');
            setFeedback('There was an error with speech recognition.');
        };
        
        recognition.onend = () => {
            if (status === 'listening') {
                setStatus('idle');
            }
        };

        return () => {
            recognition.stop();
        };
    }, [isOpen, status]);

    const handleCommand = async (command: string) => {
        if (!command || !recognitionRef.current) return;
        recognitionRef.current.stop();
        setStatus('processing');
        setFeedback('Thinking...');
        const response = await onCommand(command);
        setFeedback(response);
        setStatus('responding');
    };
    
    const toggleListening = () => {
        if (status === 'listening') {
            recognitionRef.current?.stop();
            setStatus('idle');
        } else {
            setTranscript('');
            setFeedback('Listening...');
            setStatus('listening');
            recognitionRef.current?.start();
        }
    };
    
    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4 transition-opacity duration-300"
            onClick={onClose}
        >
            <div 
                className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col transform transition-all duration-300"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <BotMessageSquareIcon className="w-7 h-7 text-indigo-500" />
                        <h2 className="text-xl font-bold">Voice Assistant</h2>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
                        <XIcon className="w-6 h-6" />
                    </button>
                </header>

                <div className="p-6 text-center space-y-4 min-h-[250px] flex flex-col justify-between">
                    <div>
                        <p className="text-lg font-medium text-slate-800 dark:text-slate-200">{feedback}</p>
                        {transcript && (
                            <p className="text-md text-slate-500 dark:text-slate-400 mt-2 h-6">"{transcript}"</p>
                        )}
                    </div>
                    <div className="flex flex-col items-center">
                        <button
                            onClick={toggleListening}
                            className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-colors duration-300
                                ${status === 'listening' ? 'bg-red-500 hover:bg-red-600' : 'bg-indigo-600 hover:bg-indigo-700'}
                                focus:outline-none focus:ring-4 focus:ring-indigo-500/50`}
                            aria-label={status === 'listening' ? 'Stop listening' : 'Start listening'}
                        >
                            {status === 'processing' && (
                                <LoaderCircleIcon className="w-10 h-10 text-white animate-spin" />
                            )}
                            {status !== 'processing' && (
                                <MicrophoneIcon className="w-10 h-10 text-white" />
                            )}
                            {status === 'listening' && (
                                <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-75"></span>
                            )}
                        </button>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-4">
                            {status === 'listening' ? 'Listening...' : 'Tap the mic to speak'}
                        </p>
                    </div>
                </div>
                 <footer className="p-4 border-t border-slate-200 dark:border-slate-800 text-center">
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                        Try saying: "Create a task to design the new homepage" or "Move task 'Finalize report' to Done".
                    </p>
                </footer>
            </div>
        </div>
    );
};