
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChatMessage, User, Project, Bug } from '../types';
import { XIcon, SendIcon } from './Icons';
import { UserAvatar } from './UserAvatar';

interface ProjectChatProps {
    project: Project;
    users: User[];
    messages: ChatMessage[];
    currentUser: User;
    onlineUsers: Set<string>;
    onClose: () => void;
    onSendMessage: (text: string) => Promise<void>;
    onNavigateToBug: (bugNumber: string) => void;
}

const formatDateSeparator = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
        return "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
        return "Yesterday";
    } else {
        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined });
    }
};

const ChatBubble: React.FC<{ 
    message: ChatMessage;
    isCurrentUser: boolean;
    isOnline: boolean;
    users: User[];
    bugs: Bug[];
    onNavigateToBug: (bugNumber: string) => void;
}> = ({ message, isCurrentUser, isOnline, users, bugs, onNavigateToBug }) => {
    const alignment = isCurrentUser ? 'items-end' : 'items-start';
    const bubbleColor = isCurrentUser ? 'bg-gray-300 text-black' : 'bg-gray-800 text-white';

    const renderTextWithTags = (text: string) => {
        if (users.length === 0 && bugs.length === 0) {
            return text;
        }

        const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        // Sort by length (descending) to ensure longer names match first (e.g. "Alex" before "Al")
        const sortedUsers = [...users].sort((a, b) => b.name.length - a.name.length);
        const sortedBugs = [...bugs].sort((a, b) => b.bugNumber.length - a.bugNumber.length);

        const userNamesRegex = sortedUsers.map(u => escapeRegex(u.name)).join('|');
        const bugNumbersRegex = sortedBugs.map(b => escapeRegex(b.bugNumber)).join('|');

        const partsForRegex = [];
        if (userNamesRegex) partsForRegex.push(`(@(?:${userNamesRegex}))`);
        if (bugNumbersRegex) partsForRegex.push(`(#(?:${bugNumbersRegex}))`);

        if (partsForRegex.length === 0) {
            return text;
        }
        
        // Use a global regex to find all matches
        const regex = new RegExp(partsForRegex.join('|'), 'g');
        const elements: React.ReactNode[] = [];
        let lastIndex = 0;
        let match;

        // Use exec loop for reliable offset handling regardless of capture group count
        while ((match = regex.exec(text)) !== null) {
            const matchedText = match[0];
            const offset = match.index;

            // Push text before the match
            if (offset > lastIndex) {
                elements.push(text.substring(lastIndex, offset));
            }

            if (matchedText.startsWith('@')) {
                const userName = matchedText.substring(1);
                elements.push(
                    <strong key={offset} className="bg-blue-800/50 text-blue-300 font-semibold rounded px-1 py-0.5">
                        @{userName}
                    </strong>
                );
            } else if (matchedText.startsWith('#')) {
                const bugNumber = matchedText.substring(1);
                elements.push(
                    <strong
                        key={offset}
                        className="bg-purple-800/50 text-purple-300 font-semibold rounded px-1 py-0.5 cursor-pointer hover:underline"
                        onClick={(e) => {
                            e.stopPropagation();
                            onNavigateToBug(bugNumber);
                        }}
                    >
                        #{bugNumber}
                    </strong>
                );
            }

            lastIndex = offset + matchedText.length;
        }

        // Push remaining text
        if (lastIndex < text.length) {
            elements.push(text.substring(lastIndex));
        }

        return <>{elements}</>;
    };

    return (
        <div className={`flex flex-col ${alignment} mb-2`}>
            <div className="flex items-end gap-2 max-w-xs sm:max-w-md">
                {!isCurrentUser && (
                    <UserAvatar user={message.author} className="w-7 h-7 flex-shrink-0 text-xs" isOnline={isOnline} />
                )}
                <div className={`px-4 py-2 rounded-2xl ${bubbleColor}`}>
                    <p className="text-xs whitespace-pre-wrap">{renderTextWithTags(message.text)}</p>
                </div>
            </div>
             <div className={`flex gap-2 items-center text-[10px] text-gray-500 mt-1 ${isCurrentUser ? 'mr-1' : 'ml-9'}`}>
                <span>{message.author.name.split(' ')[0]}</span>
                <span>·</span>
                <span>{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
             </div>
        </div>
    );
};


export const ProjectChat: React.FC<ProjectChatProps> = ({ project, users, messages, currentUser, onlineUsers, onClose, onSendMessage, onNavigateToBug }) => {
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    
    const [suggestionState, setSuggestionState] = useState<{ show: boolean; type: 'user' | 'bug' | null; query: string }>({ show: false, type: null, query: '' });
    const [activeIndex, setActiveIndex] = useState(0);

    const projectMembers = useMemo(() => project.members.map(id => users.find(u => u.id === id)).filter((u): u is User => !!u), [project.members, users]);
    const projectBugs = useMemo(() => Object.values(project.bugs || {}), [project.bugs]);

    const filteredSuggestions = useMemo(() => {
        if (!suggestionState.show || !suggestionState.query) {
            return [];
        }
        const queryLower = suggestionState.query.toLowerCase();
        if (suggestionState.type === 'user') {
            return projectMembers.filter(m => m.name.toLowerCase().includes(queryLower));
        }
        if (suggestionState.type === 'bug') {
            return projectBugs.filter(b => b.bugNumber.toLowerCase().includes(queryLower) || b.title.toLowerCase().includes(queryLower));
        }
        return [];
    }, [suggestionState, projectMembers, projectBugs]);

    useEffect(() => {
      setActiveIndex(0);
    }, [filteredSuggestions]);
    
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleNewMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const text = e.target.value;
        setNewMessage(text);
        
        const cursorPos = e.target.selectionStart;
        const textToCursor = text.substring(0, cursorPos);
        const lastWordMatch = textToCursor.match(/[@#](\w*)$/);

        if (lastWordMatch) {
            const trigger = lastWordMatch[0][0];
            const query = lastWordMatch[1];
            setSuggestionState({
                show: true,
                type: trigger === '@' ? 'user' : 'bug',
                query: query,
            });
        } else {
            setSuggestionState({ show: false, type: null, query: '' });
        }
    };

    const handleSuggestionSelect = (item: User | Bug) => {
        const text = newMessage;
        const cursorPos = textareaRef.current?.selectionStart || 0;
        const textToCursor = text.substring(0, cursorPos);
        const lastTriggerIndex = textToCursor.lastIndexOf(suggestionState.type === 'user' ? '@' : '#');

        if (lastTriggerIndex === -1) return;

        const prefix = text.substring(0, lastTriggerIndex);
        const suffix = text.substring(cursorPos);
        const value = 'name' in item ? item.name : item.bugNumber;
        const newText = `${prefix}${suggestionState.type === 'user' ? '@' : '#'}${value} ${suffix}`;

        setNewMessage(newText);
        setSuggestionState({ show: false, type: null, query: '' });
        
        setTimeout(() => {
            textareaRef.current?.focus();
            const newCursorPos = lastTriggerIndex + value.length + 2;
            textareaRef.current?.setSelectionRange(newCursorPos, newCursorPos);
        }, 0);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (suggestionState.show && filteredSuggestions.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActiveIndex((prev) => (prev + 1) % filteredSuggestions.length);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActiveIndex((prev) => (prev - 1 + filteredSuggestions.length) % filteredSuggestions.length);
            } else if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                handleSuggestionSelect(filteredSuggestions[activeIndex]);
            } else if (e.key === 'Escape') {
                e.preventDefault();
                setSuggestionState({ show: false, type: null, query: '' });
            }
        } else if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };
    
    const handleSubmit = async () => {
        if (newMessage.trim()) {
            await onSendMessage(newMessage.trim());
            setNewMessage('');
        }
    };

    return (
        <div className="fixed top-0 right-0 h-full w-full max-w-md bg-[#131C1B] shadow-2xl z-30 flex flex-col transform transition-transform duration-300 ease-in-out">
             <header className="p-4 border-b border-gray-800 flex justify-between items-center flex-shrink-0">
                <h3 className="text-base font-bold text-white">Project Chat</h3>
                <button onClick={onClose} className="p-2 rounded-full text-gray-400 hover:bg-gray-800 transition-colors">
                    <XIcon className="w-6 h-6" />
                </button>
            </header>
            <div className="flex-grow p-4 overflow-y-auto custom-scrollbar">
                {messages.map((msg, index) => {
                    const currentDate = new Date(msg.createdAt).toDateString();
                    const prevDate = index > 0 ? new Date(messages[index - 1].createdAt).toDateString() : null;
                    const showDate = currentDate !== prevDate;

                    return (
                        <React.Fragment key={msg.id}>
                            {showDate && (
                                <div className="flex justify-center my-6">
                                    <span className="bg-gray-800 text-gray-400 text-[10px] px-3 py-1 rounded-full font-medium">
                                        {formatDateSeparator(msg.createdAt)}
                                    </span>
                                </div>
                            )}
                            <ChatBubble 
                                message={msg} 
                                isCurrentUser={msg.author.id === currentUser.id} 
                                isOnline={onlineUsers.has(msg.author.id)}
                                users={projectMembers}
                                bugs={projectBugs}
                                onNavigateToBug={onNavigateToBug}
                            />
                        </React.Fragment>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>
            <footer className="p-4 border-t border-gray-800 flex-shrink-0 relative">
                {suggestionState.show && filteredSuggestions.length > 0 && (
                    <div className="absolute bottom-full mb-2 w-[calc(100%-2rem)] bg-[#1C2326] border border-gray-700 rounded-md shadow-lg max-h-48 overflow-y-auto custom-scrollbar z-10">
                        <ul>
                            {filteredSuggestions.map((item, index) => (
                                <li key={item.id} onClick={() => handleSuggestionSelect(item)} onMouseEnter={() => setActiveIndex(index)}
                                    className={`px-3 py-2 cursor-pointer flex items-center gap-2 text-xs ${index === activeIndex ? 'bg-gray-700' : 'hover:bg-gray-800/50'}`}>
                                    {suggestionState.type === 'user' && <UserAvatar user={item as User} className="w-6 h-6 flex-shrink-0" />}
                                    {suggestionState.type === 'bug' && <span className="font-mono text-xs bg-gray-800 px-1.5 py-0.5 rounded">{(item as Bug).bugNumber}</span>}
                                    <span className="text-white truncate">{'name' in item ? item.name : item.title}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="flex items-center gap-2">
                     <textarea
                        ref={textareaRef}
                        value={newMessage}
                        onChange={handleNewMessageChange}
                        onKeyDown={handleKeyDown}
                        placeholder="Message... (@mention, #bug)"
                        className="chat-textarea w-full px-4 py-2 border border-gray-800 rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-500 bg-[#1C2326] text-xs text-white resize-none"
                        rows={1}
                        style={{ height: 'auto', maxHeight: '120px' }}
                        onInput={(e) => {
                            const target = e.target as HTMLTextAreaElement;
                            target.style.height = 'auto';
                            target.style.height = `${target.scrollHeight}px`;
                        }}
                    />
                    <button type="submit" className="p-2.5 bg-gray-300 text-black rounded-full hover:bg-gray-400 disabled:bg-gray-500 flex-shrink-0" disabled={!newMessage.trim()} aria-label="Send message">
                        <SendIcon className="w-5 h-5"/>
                    </button>
                </form>
            </footer>
        </div>
    );
};
