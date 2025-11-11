

import React, { useState, useMemo, useEffect } from 'react';
import { api } from '../services/api';
import { BotMessageSquareIcon, UsersIcon, LoaderCircleIcon, CheckIcon } from '../components/Icons';
import { PasswordInput } from '../components/PasswordInput';
import { PasswordStrength } from '../components/PasswordStrength';

type AuthMode = 'signIn' | 'signUp' | 'forgotPassword' | 'awaitingConfirmation';

interface LoginPageProps {
    onShowPrivacy: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onShowPrivacy }) => {
    const [mode, setMode] = useState<AuthMode>('signIn');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [hasInvite, setHasInvite] = useState(false);

    useEffect(() => {
        if (localStorage.getItem('project_invite_token')) {
            setHasInvite(true);
        }
    }, []);

    const passwordChecks = useMemo(() => ({
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /[0-9]/.test(password),
        specialChar: /[^A-Za-z0-9]/.test(password),
    }), [password]);

    const isPasswordValid = Object.values(passwordChecks).every(Boolean);

    const handleResendConfirmation = async () => {
        if (!email) {
            setError('Please enter your email address to resend the confirmation link.');
            return;
        }
        setLoading(true);
        setError('');
        setSuccessMessage('');

        const { error } = await api.auth.resendConfirmationEmail(email);

        if (error) {
            setError(error.message);
        } else {
            setSuccessMessage('A new confirmation link has been sent to your email.');
        }
        setLoading(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccessMessage('');

        if (mode === 'forgotPassword') {
            const { error } = await api.auth.sendPasswordResetEmail(email);
            if (error) {
                setError(error.message);
            } else {
                setSuccessMessage("Password reset link sent! Please check your email.");
            }
        } else if (mode === 'signIn') {
            const { error } = await api.auth.signInWithPassword({ email, password });
            if (error) {
                if (error.message.toLowerCase().includes('email not confirmed')) {
                    setMode('awaitingConfirmation');
                    setSuccessMessage('');
                    setError('');
                } else {
                    setError(error.message);
                }
            }
        } else { // signUp
            if (!isPasswordValid) {
                setError("Please ensure your password meets all requirements.");
                setLoading(false);
                return;
            }
            const { error } = await api.auth.signUp({ email, password, name });
            if (error) {
                setError(error.message);
            } else {
                setSuccessMessage(`A confirmation link has been sent to ${email}.`);
                setMode('awaitingConfirmation');
            }
        }
        
        setLoading(false);
    };

    const handleModeChange = (newMode: AuthMode) => {
        setMode(newMode);
        setError('');
        setSuccessMessage('');
        setName('');
        setPassword('');
    };

    const getTitle = () => {
        if (mode === 'signIn') return 'Sign in to your account';
        if (mode === 'signUp') return 'Create a new account';
        return 'Reset your password';
    };

    if (mode === 'awaitingConfirmation') {
        return (
            <div className="min-h-screen font-sans bg-[#1C2326] flex flex-col items-center justify-center p-4">
                <div className="w-full max-w-sm text-center">
                    <div className="flex flex-col items-center mb-6">
                        <div className="relative mb-6">
                            <BotMessageSquareIcon className="w-16 h-16 text-gray-400" />
                             <div className="absolute -bottom-2 -right-2 bg-green-500 rounded-full p-1 border-2 border-[#1C2326]">
                                <CheckIcon className="w-5 h-5 text-white" />
                            </div>
                        </div>
                        <h1 className="text-xl font-bold tracking-tight text-white mt-2">
                            Check your email
                        </h1>
                    </div>
                    <div className="bg-[#131C1B] rounded-xl shadow-lg p-8 space-y-4">
                        <p className="text-xs text-gray-300">
                            {successMessage || `We've sent a confirmation link to ${email}. Please check your inbox (and spam folder) to complete your registration.`}
                        </p>
                        
                        {error && <p className="text-xs text-red-500">{error}</p>}
                        
                        <button
                            onClick={handleResendConfirmation}
                            disabled={loading}
                            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-xs font-medium text-black bg-gray-300 hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 focus:ring-offset-[#131C1B] disabled:bg-gray-500"
                        >
                            {loading ? <LoaderCircleIcon className="animate-spin h-5 w-5" /> : 'Resend confirmation link'}
                        </button>

                        <button onClick={() => handleModeChange('signIn')} className="text-xs font-medium text-white hover:text-gray-300">
                           Back to Sign In
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen font-sans bg-[#1C2326] flex flex-col items-center justify-center p-4">
             <div className="w-full max-w-sm">
                <div className="flex flex-col items-center mb-6">
                    <BotMessageSquareIcon className="w-12 h-12 text-gray-400" />
                    <h1 className="text-xl font-bold tracking-tight text-white mt-2">
                        Gemini Project Board
                    </h1>
                    <p className="text-gray-400 mt-1 text-xs">{getTitle()}</p>
                </div>
                {hasInvite && (
                    <div className="mb-4 text-center text-xs text-green-300 bg-green-900/30 p-3 rounded-lg border border-green-700">
                        You've been invited to a project!
                        <br />
                        Please sign in or create an account to join.
                    </div>
                )}
                <div className="bg-[#131C1B] rounded-xl shadow-lg p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {mode === 'signUp' && (
                             <div>
                                <label htmlFor="name" className="block text-xs font-medium text-white mb-1">
                                    Full Name
                                </label>
                                <input
                                    id="name"
                                    name="name"
                                    type="text"
                                    autoComplete="name"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-800 rounded-md shadow-sm focus:outline-none focus:ring-gray-500 focus:border-gray-500 bg-[#1C2326] text-white text-xs"
                                />
                            </div>
                        )}
                        {mode === 'signIn' || mode === 'signUp' ? (
                            <div>
                                <label htmlFor="email" className="block text-xs font-medium text-white mb-1">
                                    Email Address
                                </label>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-800 rounded-md shadow-sm focus:outline-none focus:ring-gray-500 focus:border-gray-500 bg-[#1C2326] text-white text-xs"
                                />
                            </div>
                        ) : null}
                         {mode === 'forgotPassword' && (
                            <div>
                                <label htmlFor="email-forgot" className="block text-xs font-medium text-white mb-1">
                                    Email Address
                                </label>
                                <input
                                    id="email-forgot"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-800 rounded-md shadow-sm focus:outline-none focus:ring-gray-500 focus:border-gray-500 bg-[#1C2326] text-white text-xs"
                                />
                            </div>
                        )}
                        {mode !== 'forgotPassword' && (
                            <div>
                                <div className="flex justify-between items-center">
                                    <label htmlFor="password" className="block text-xs font-medium text-white mb-1">
                                        Password
                                    </label>
                                    {mode === 'signIn' && (
                                        <button type="button" onClick={() => handleModeChange('forgotPassword')} className="text-xs text-gray-400 hover:text-white">
                                            Forgot password?
                                        </button>
                                    )}
                                </div>
                                <PasswordInput
                                    id="password"
                                    name="password"
                                    autoComplete="current-password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                {mode === 'signUp' && <PasswordStrength password={password} />}
                            </div>
                        )}

                        {error && <p className="text-xs text-red-500">{error}</p>}
                        {successMessage && <p className="text-xs text-green-500">{successMessage}</p>}

                        <div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-xs font-medium text-black bg-gray-300 hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 focus:ring-offset-[#131C1B] disabled:bg-gray-500"
                            >
                                {loading ? <LoaderCircleIcon className="animate-spin h-5 w-5" /> : 
                                 mode === 'signIn' ? 'Sign in' : 
                                 mode === 'signUp' ? 'Sign up' : 'Send Reset Link'}
                            </button>
                        </div>
                    </form>
                     <p className="mt-6 text-center text-xs text-gray-400">
                        {mode === 'signIn' && "Don't have an account?"}
                        {mode === 'signUp' && "Already have an account?"}
                        {mode === 'forgotPassword' && "Remembered your password?"}
                        {' '}
                        <button onClick={() => handleModeChange(mode === 'signIn' || mode === 'forgotPassword' ? 'signUp' : 'signIn')} className="font-medium text-white hover:text-gray-300">
                           {mode === 'signIn' || mode === 'forgotPassword' ? 'Sign Up' : 'Sign In'}
                        </button>
                    </p>
                </div>
                <div className="mt-6 text-center text-xs text-gray-500">
                    <button onClick={onShowPrivacy} className="hover:text-white hover:underline">
                        Privacy Policy
                    </button>
                </div>
            </div>
        </div>
    );
};
