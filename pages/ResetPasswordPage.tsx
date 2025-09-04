
import React, { useState, useMemo } from 'react';
import { api } from '../services/api';
import { BotMessageSquareIcon, LoaderCircleIcon } from '../components/Icons';
import { PasswordInput } from '../components/PasswordInput';
import { PasswordStrength } from '../components/PasswordStrength';

interface ResetPasswordPageProps {
    onResetSuccess: () => void;
}

export const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({ onResetSuccess }) => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    const passwordChecks = useMemo(() => ({
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /[0-9]/.test(password),
        specialChar: /[^A-Za-z0-9]/.test(password),
    }), [password]);

    const isPasswordValid = Object.values(passwordChecks).every(Boolean);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }
        if (!isPasswordValid) {
            setError("Password does not meet all requirements.");
            return;
        }

        setLoading(true);
        try {
            await api.auth.updateUserPassword(password);
            setSuccessMessage("Password updated successfully! You will be redirected to the login page shortly.");
            setTimeout(() => {
                onResetSuccess();
            }, 3000);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to update password.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen font-sans bg-[#1C2326] flex flex-col items-center justify-center p-4">
             <div className="w-full max-w-sm">
                <div className="flex flex-col items-center mb-6">
                    <BotMessageSquareIcon className="w-12 h-12 text-gray-400" />
                    <h1 className="text-2xl font-bold tracking-tight text-white mt-2">
                        Reset Your Password
                    </h1>
                </div>
                <div className="bg-[#131C1B] rounded-xl shadow-lg p-8">
                    {successMessage ? (
                        <p className="text-center text-green-500">{successMessage}</p>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-white mb-1">
                                    New Password
                                </label>
                                <PasswordInput
                                    id="password"
                                    name="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                <PasswordStrength password={password} />
                            </div>

                            <div>
                                <label htmlFor="confirmPassword" className="block text-sm font-medium text-white mb-1">
                                    Confirm New Password
                                </label>
                                <PasswordInput
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    required
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                />
                            </div>

                            {error && <p className="text-sm text-red-500">{error}</p>}

                            <div>
                                <button
                                    type="submit"
                                    disabled={loading || !isPasswordValid || !confirmPassword}
                                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-black bg-gray-300 hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 focus:ring-offset-[#131C1B] disabled:bg-gray-500 disabled:cursor-not-allowed"
                                >
                                    {loading ? <LoaderCircleIcon className="animate-spin h-5 w-5" /> : 'Set New Password'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};
