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

    if (mode === 'awaitingConfirmation') {
        return (
            <div className="text-center">
                <div className="flex flex-col items-center mb-6">
                    <div className="relative mb-6">
                        <BotMessageSquareIcon className="w-16 h-16 text-gray-400" />
                        <div className="absolute -bottom-2 -right-2 bg-green-500 rounded-full p-1 border-2 border-[#131C1B]">
                            <CheckIcon className="w-5 h-5 text-white" />
                        </div>
                    </div>
                    <h1 className="text-xl font-bold tracking-tight text-white mt-2">
                        Check your email
                    </h1>
                </div>
                <div className="space-y-4">
                    <p className="text-xs text-gray-300">
                        {successMessage || `We've sent a confirmation link to ${email}. Please check your inbox (and spam folder) to complete your registration.`}
                    </p>
                    
                    {error && <p className="text-xs text-red-500">{error}</p>}
                    
                    <button
                        onClick={handleResendConfirmation}
                        disabled={loading}
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-xs font-medium text-black bg-gray-300 hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#131C1B] disabled:bg-gray-500"
                    >
                        {loading ? <LoaderCircleIcon className="animate-spin h-5 w-5" /> : 'Resend confirmation link'}
                    </button>

                    <button onClick={() => handleModeChange('signIn')} className="text-xs font-medium text-white hover:text-gray-300">
                       Back to Sign In
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full">
            {hasInvite && (
                <div className="mb-6 text-center text-xs text-green-300 bg-green-900/30 p-3 rounded-lg border border-green-700">
                    You've been invited to a project!
                    <br />
                    Please sign in or create an account to join.
                </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-5">
                {mode === 'signUp' && (
                     <div>
                        <label htmlFor="name" className="block text-xs font-medium text-white mb-1.5 uppercase tracking-wider opacity-70">
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
                            className="w-full px-4 py-2.5 border border-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent bg-[#1C2326] text-white text-xs transition-all"
                        />
                    </div>
                )}
                {mode === 'signIn' || mode === 'signUp' ? (
                    <div>
                        <label htmlFor="email" className="block text-xs font-medium text-white mb-1.5 uppercase tracking-wider opacity-70">
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
                            className="w-full px-4 py-2.5 border border-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent bg-[#1C2326] text-white text-xs transition-all"
                        />
                    </div>
                ) : null}
                 {mode === 'forgotPassword' && (
                    <div>
                        <label htmlFor="email-forgot" className="block text-xs font-medium text-white mb-1.5 uppercase tracking-wider opacity-70">
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
                            className="w-full px-4 py-2.5 border border-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent bg-[#1C2326] text-white text-xs transition-all"
                        />
                    </div>
                )}
                {mode !== 'forgotPassword' && (
                    <div>
                        <div className="flex justify-between items-center mb-1.5">
                            <label htmlFor="password" className="block text-xs font-medium text-white uppercase tracking-wider opacity-70">
                                Password
                            </label>
                            {mode === 'signIn' && (
                                <button type="button" onClick={() => handleModeChange('forgotPassword')} className="text-[10px] text-gray-400 hover:text-white transition-colors">
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

                {error && (
                    <div className="p-3 bg-red-900/20 border border-red-800/50 rounded-lg">
                        <p className="text-xs text-red-400 text-center">{error}</p>
                    </div>
                )}
                {successMessage && (
                    <div className="p-3 bg-green-900/20 border border-green-800/50 rounded-lg">
                        <p className="text-xs text-green-400 text-center">{successMessage}</p>
                    </div>
                )}

                <div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg text-xs font-bold text-black bg-white hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 focus:ring-offset-[#131C1B] disabled:bg-gray-700 disabled:text-gray-500 transition-all transform active:scale-[0.98]"
                    >
                        {loading ? <LoaderCircleIcon className="animate-spin h-5 w-5" /> : 
                         mode === 'signIn' ? 'Sign in' : 
                         mode === 'signUp' ? 'Sign up' : 'Send Reset Link'}
                    </button>
                </div>
            </form>
            <p className="mt-8 text-center text-xs text-gray-500">
                {mode === 'signIn' && "Don't have an account?"}
                {mode === 'signUp' && "Already have an account?"}
                {mode === 'forgotPassword' && "Remembered your password?"}
                {' '}
                <button onClick={() => handleModeChange(mode === 'signIn' || mode === 'forgotPassword' ? 'signUp' : 'signIn')} className="font-bold text-white hover:text-gray-300 transition-colors">
                   {mode === 'signIn' || mode === 'forgotPassword' ? 'Sign Up' : 'Sign In'}
                </button>
            </p>
        </div>
    );
};