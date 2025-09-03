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
        <div className="min-h-screen font-sans bg-[#1C2326] flex flex-col items-center justify-center p-4">
             <div className="w-full max-w-sm">
                <div className="flex flex-col items-center mb-6">
                    <BotMessageSquareIcon className="w-12 h-12 text-gray-400" />
                    <h1 className="text-2xl font-bold tracking-tight text-white mt-2">
                        Gemini Project Board
                    </h1>
                    <p className="text-gray-400 mt-1 text-sm">
                        {mode === 'signIn' ? 'Sign in to your account' : 'Create a new account'}
                    </p>
                </div>
                <div className="bg-[#131C1B] rounded-xl shadow-lg p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {mode === 'signUp' && (
                             <div>
                                <label htmlFor="name" className="block text-sm font-medium text-white">
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
                                        className="w-full px-3 py-2 border border-gray-800 rounded-md shadow-sm focus:outline-none focus:ring-gray-500 focus:border-gray-500 bg-[#1C2326] text-white text-sm"
                                    />
                                </div>
                            </div>
                        )}
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-white">
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
                                    className="w-full px-3 py-2 border border-gray-800 rounded-md shadow-sm focus:outline-none focus:ring-gray-500 focus:border-gray-500 bg-[#1C2326] text-white text-sm"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-white">
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
                                    className="w-full px-3 py-2 border border-gray-800 rounded-md shadow-sm focus:outline-none focus:ring-gray-500 focus:border-gray-500 bg-[#1C2326] text-white text-sm"
                                />
                            </div>
                        </div>

                        {error && <p className="text-sm text-red-500">{error}</p>}
                        {successMessage && <p className="text-sm text-green-500">{successMessage}</p>}

                        <div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-black bg-gray-300 hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 focus:ring-offset-[#131C1B] disabled:bg-gray-500"
                            >
                                {loading ? <LoaderCircleIcon className="animate-spin h-5 w-5" /> : (mode === 'signIn' ? 'Sign in' : 'Sign up')}
                            </button>
                        </div>
                    </form>
                     <p className="mt-6 text-center text-sm text-gray-400">
                        {mode === 'signIn' ? "Don't have an account?" : "Already have an account?"}{' '}
                        <button onClick={toggleMode} className="font-medium text-white hover:text-gray-300">
                            {mode === 'signIn' ? 'Sign Up' : 'Sign In'}
                        </button>
                    </p>
                </div>
                 <div className="mt-6 bg-[#131C1B] p-4 rounded-lg">
                    <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2"><UsersIcon className="w-4 h-4"/> Available Demo Users</h3>
                    <p className="text-xs text-gray-400 mb-3">You can log in as any of these users. The password for all is `password123`.</p>
                    <div className="flex flex-wrap gap-2">
                        {demoUsers.map(user => (
                            <button key={user.email} onClick={() => {setEmail(user.email); setMode('signIn');}} className="text-xs font-medium bg-gray-700 text-white px-2 py-1 rounded-full hover:bg-gray-600">
                                {user.name}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};