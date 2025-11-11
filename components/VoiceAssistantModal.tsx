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
            } catch