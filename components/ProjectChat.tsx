import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, User } from '../types';
import { XIcon, SendIcon } from './Icons';
import { UserAvatar } from './UserAvatar';

interface ProjectChatProps {
    messages: ChatMessage[];
    currentUser: User;
    onlineUsers: Set<string>;
    onClose: () => void;
    onSendMessage: (text: string) => Promise<void>;
}

const ChatBubble: React.FC<{ message: ChatMessage, isCurrentUser: boolean, isOnline: boolean }> = ({ message, isCurrentUser, isOnline }) => {
    const alignment = isCurrentUser ? 'items-end' : 'items-start';
    const bubbleColor = isCurrentUser ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-800';

    return (
        <div className={`flex flex-col ${alignment}`}>
            <div className="flex items-end gap-2 max-w-xs sm:max-w-md">
                {!isCurrentUser && (
                    <UserAvatar user={message.author} className="w-7 h-7 flex-shrink-0 text-xs" isOnline={isOnline} />
                )}
                <div className={`px-4 py-2 rounded-2xl ${bubbleColor}`}>
                    <p className="text-sm">{message.text}</p>
                </div>
            </div>
             <div className={`flex gap-2 items-center text-xs text-gray-500 dark:text-gray-400 mt-1 ${isCurrentUser ? 'mr-1' : 'ml-9'}`}>
                <span>{message.author.name.split(' ')[0]}</span>
                <span>·</span>
                <span>{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
             </div>
        </div>
    );
};


export const ProjectChat: React.FC<ProjectChatProps> = ({ messages, currentUser, onlineUsers, onClose, onSendMessage }) => {
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newMessage.trim()) {
            await onSendMessage(newMessage.trim());
            setNewMessage('');
        }
    };

    return (
        <div className="fixed top-0 right-0 h-full w-full max-w-md bg-white dark:bg-gray-900 shadow-2xl z-30 flex flex-col transform transition-transform duration-300 ease-in-out">
             <header className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center flex-shrink-0">
                <h3 className="text-lg font-bold">Project Chat</h3>
                <button onClick={onClose} className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors">
                    <XIcon className="w-6 h-6" />
                </button>
            </header>
            <div className="flex-grow p-4 overflow-y-auto custom-scrollbar space-y-4">
                {messages.map(msg => (
                    <ChatBubble 
                        key={msg.id} 
                        message={msg} 
                        isCurrentUser={msg.author.id === currentUser.id} 
                        isOnline={onlineUsers.has(msg.author.id)}
                    />
                ))}
                <div ref={messagesEndRef} />
            </div>
            <footer className="p-4 border-t border-gray-200 dark:border-gray-800 flex-shrink-0">
                <form onSubmit={handleSubmit} className="flex items-center gap-2">
                     <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-sm"
                    />
                    <button type="submit" className="p-2.5 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:bg-indigo-400 flex-shrink-0" disabled={!newMessage.trim()} aria-label="Send message">
                        <SendIcon className="w-5 h-5"/>
                    </button>
                </form>
            </footer>
        </div>
    );
};