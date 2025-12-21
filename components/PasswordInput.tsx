import React, { useState } from 'react';
import { EyeIcon, EyeOffIcon } from './Icons';

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const PasswordInput: React.FC<PasswordInputProps> = (props) => {
    const [isVisible, setIsVisible] = useState(false);

    const toggleVisibility = () => setIsVisible(prev => !prev);

    return (
        <div className="relative">
            <input
                {...props}
                type={isVisible ? 'text' : 'password'}
                className="w-full px-4 py-2.5 border border-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent bg-[#1C2326] text-white text-xs pr-10 transition-all shadow-sm"
            />
            <button
                type="button"
                onClick={toggleVisibility}
                className="absolute inset-y-0 right-0 flex items-center px-4 text-gray-400 hover:text-white transition-colors"
                aria-label={isVisible ? "Hide password" : "Show password"}
            >
                {isVisible ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
            </button>
        </div>
    );
};