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
            if (recognitionRef.current) {
              recognitionRef.current.stop();
              recognitionRef.current = null;
            }
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
            } catch (error) {
                console.error("Speech recognition start error:", error);
                setStatus('error');
                setFeedback('Could not start listening. Check microphone permissions.');
            }
        }
    };

    return (
        <div 
            className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            onClick={onClose}
        >
            <div className="bg-[#131C1B] rounded-xl shadow-2xl w-full max-w-lg flex flex-col min-h-[400px]" onClick={(e) => e.stopPropagation()}>
                <header className="p-4 border-b border-gray-800 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <BotMessageSquareIcon className="w-6 h-6" />
                        Voice Assistant
                    </h2>
                    <button onClick={onClose} className="p-2 rounded-full text-gray-400 hover:bg-gray-800">
                        <XIcon className="w-6 h-6" />
                    </button>
                </header>
                <div className="p-6 text-center space-y-4 flex-grow flex flex-col justify-center items-center">
                    <p className="text-lg font-medium text-white h-12">{feedback}</p>
                    <p className="text-sm text-gray-400 h-6 italic">{transcript}</p>
                    <button
                        onClick={toggleListening}
                        className={`mt-4 w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300
                            ${status === 'listening' ? 'bg-red-600 animate-pulse' : 'bg-gray-600 hover:bg-gray-500'}
                            ${status === 'processing' ? 'bg-gray-500 cursor-not-allowed' : ''}
                        `}
                        disabled={status === 'processing' || status === 'error'}
                    >
                        {status === 'processing' 
                            ? <LoaderCircleIcon className="w-10 h-10 text-white animate-spin" />
                            : <MicrophoneIcon className="w-10 h-10 text-white" />
                        }
                    </button>
                </div>
                <footer className="p-4 text-xs text-center text-gray-500 border-t border-gray-800">
                    Try saying: "Create a task to deploy the new feature" or "Move task 'Fix Login Bug' to Done".
                </footer>
            </div>
        </div>
    );
};
