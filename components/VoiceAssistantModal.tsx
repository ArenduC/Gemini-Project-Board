import React, { useState, useEffect, useRef, useCallback } from 'react';
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
    const onCommandRef = useRef(onCommand);

    useEffect(() => {
        onCommandRef.current = onCommand;
    }, [onCommand]);

    const handleCommand = useCallback(async (command: string) => {
        if (!command || !recognitionRef.current) return;
        recognitionRef.current.stop();
        setStatus('processing');
        setFeedback('Thinking...');
        const response = await onCommandRef.current(command);
        setFeedback(response);
        setStatus('responding');
    }, []);

    useEffect(() => {
        if (!isOpen) {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
                recognitionRef.current = null;
            }
            return;
        }

        setStatus('idle');
        setTranscript('');
        setFeedback('Hi! How can I help you today?');

        const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognitionAPI) {
            setStatus('error');
            setFeedback('Sorry, your browser does not support voice recognition.');
            return;
        }

        const recognition = new SpeechRecognitionAPI();
        recognitionRef.current = recognition;
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
            setStatus(currentStatus => {
                if (currentStatus === 'listening') {
                    return 'idle';
                }
                return currentStatus;
            });
        };

        return () => {
            recognition.stop();
            recognitionRef.current = null;
        };
    }, [isOpen, handleCommand]);
    
    const toggleListening = () => {
        if (status === 'listening') {
            recognitionRef.current?.stop();
        } else {
            setTranscript('');
            setFeedback('Listening...');
            setStatus('listening');
            try {
                recognitionRef.current?.start();
            } catch (err) {
                 console.error("Error starting recognition:", err);
                 setStatus('error');
                 setFeedback("Could not start listening. Microphone might be in use.");
            }
        }
    };
    
    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4 transition-opacity duration-300"
            onClick={onClose}
        >
            <div 
                className="bg-[#131C1B] rounded-2xl shadow-2xl w-full max-w-lg flex flex-col transform transition-all duration-300"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="p-4 border-b border-gray-800 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <BotMessageSquareIcon className="w-7 h-7 text-gray-400" />
                        <h2 className="text-lg font-bold text-white">Voice Assistant</h2>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full text-gray-400 hover:bg-gray-800 transition-colors">
                        <XIcon className="w-6 h-6" />
                    </button>
                </header>

                <div className="p-6 text-center space-y-4 min-h-[250px] flex flex-col justify-between">
                    <div>
                        <p className="text-base font-medium text-white">{feedback}</p>
                        {transcript && (
                            <p className="text-sm text-gray-400 mt-2 h-6">"{transcript}"</p>
                        )}
                    </div>
                    <div className="flex flex-col items-center">
                        <button
                            onClick={toggleListening}
                            className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-colors duration-300
                                ${status === 'listening' ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-300 hover:bg-gray-400'}
                                focus:outline-none focus:ring-4 focus:ring-gray-500/50`}
                            aria-label={status === 'listening' ? 'Stop listening' : 'Start listening'}
                        >
                            {status === 'processing' && (
                                <LoaderCircleIcon className="w-10 h-10 text-black animate-spin" />
                            )}
                            {status !== 'processing' && (
                                <MicrophoneIcon className="w-10 h-10 text-black" />
                            )}
                            {status === 'listening' && (
                                <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-75"></span>
                            )}
                        </button>
                        <p className="text-sm text-gray-400 mt-4">
                            {status === 'listening' ? 'Listening...' : 'Tap the mic to speak'}
                        </p>
                    </div>
                </div>
                 <footer className="p-4 border-t border-gray-800 text-center">
                    <p className="text-xs text-gray-500/70">
                        Try saying: "Create a task to design the new homepage" or "Move task 'Finalize report' to Done".
                    </p>
                </footer>
            </div>
        </div>
    );
};