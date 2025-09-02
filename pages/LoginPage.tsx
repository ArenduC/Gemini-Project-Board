import React, { useState } from 'react';
import { api } from '../services/api';
import { BotMessageSquareIcon, UsersIcon, LoaderCircleIcon } from '../components/Icons';

// Demo users for UI hints
const demoUsers = [
    { name: 'Alice', email: 'alice@example.com' },
    { name: 'Bob', email: 'bob@example.com' },
    { name: 'Charlie', email: 'charlie@example.com' },
]

type AuthMode = 'signIn' | 'signUp';

export const LoginPage: React.FC = () => {
    const [mode, setMode] = useState<AuthMode>('signIn');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('password123'); // Pre-fill for demo convenience
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccessMessage('');

        if (mode === 'signIn') {
            const { error } = await api.auth.signInWithPassword({ email, password });
            if (error) {
                setError(error.message);
            }
        } else {
            const { error } = await api.auth.signUp({ email, password, name });
            if (error) {
                setError(error.message);
            } else {
                setSuccessMessage("Success! Please check your email for a confirmation link.");
                setMode('signIn');
            }
        }
        
        setLoading(false);
    };

    const toggleMode = () => {
        setMode(prev => prev === 'signIn' ? 'signUp' : 'signIn');
        setError('');
        setSuccessMessage('');
        setPassword(mode === 'signUp' ? 'password123' : ''); // Clear or prefill password on mode toggle
    }

    return (
        <div className="min-h-screen font-sans bg-slate-100 dark:bg-slate-900 flex flex-col items-center justify-center p-4">
             <div className="w-full max-w-sm">
                <div className="flex flex-col items-center mb-6">
                    <BotMessageSquareIcon className="w-12 h-12 text-indigo-500" />
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-2">
                        Gemini Project Board
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">
                        {mode === 'signIn' ? 'Sign in to your account' : 'Create a new account'}
                    </p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {mode === 'signUp' && (
                             <div>
                                <label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Full Name
                                </label>
                                <div className="mt-1">
                                    <input
                                        id="name"
                                        name="name"
                                        type="text"
                                        autoComplete="name"
                                        required
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                                    />
                                </div>
                            </div>
                        )}
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                Email Address
                            </label>
                            <div className="mt-1">
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                Password
                            </label>
                            <div className="mt-1">
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete="current-password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                                />
                            </div>
                        </div>

                        {error && <p className="text-sm text-red-500">{error}</p>}
                        {successMessage && <p className="text-sm text-green-500">{successMessage}</p>}

                        <div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-slate-800 disabled:bg-indigo-400"
                            >
                                {loading ? <LoaderCircleIcon className="animate-spin h-5 w-5 text-white" /> : (mode === 'signIn' ? 'Sign in' : 'Sign up')}
                            </button>
                        </div>
                    </form>
                     <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
                        {mode === 'signIn' ? "Don't have an account?" : "Already have an account?"}{' '}
                        <button onClick={toggleMode} className="font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500">
                            {mode === 'signIn' ? 'Sign Up' : 'Sign In'}
                        </button>
                    </p>
                </div>
                 <div className="mt-6 bg-slate-200/50 dark:bg-slate-800/50 p-4 rounded-lg">
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2"><UsersIcon className="w-4 h-4"/> Available Demo Users</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">You can log in as any of these users. The password for all is `password123`.</p>
                    <div className="flex flex-wrap gap-2">
                        {demoUsers.map(user => (
                            <button key={user.email} onClick={() => {setEmail(user.email); setMode('signIn');}} className="text-xs font-medium bg-slate-300 dark:bg-slate-700 text-slate-600 dark:text-slate-200 px-2 py-1 rounded-full hover:bg-indigo-200 dark:hover:bg-indigo-700">
                                {user.name}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};