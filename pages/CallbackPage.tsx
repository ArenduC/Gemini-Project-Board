import React from 'react';
import { LoaderCircleIcon, BotMessageSquareIcon, CheckIcon } from '../components/Icons';

const CallbackPage: React.FC = () => {
    // The Supabase client library will automatically handle the auth token from the URL fragment.
    // onAuthStateChange in App.tsx will detect the new session and redirect to the dashboard.
    // This page is a visual confirmation for the user.

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#1C2326] text-white p-4">
            <div className="flex flex-col items-center text-center">
                <div className="relative mb-6">
                    <BotMessageSquareIcon className="w-16 h-16 text-gray-400" />
                    <div className="absolute -bottom-2 -right-2 bg-green-500 rounded-full p-1 border-2 border-[#1C2326]">
                        <CheckIcon className="w-5 h-5 text-white" />
                    </div>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold">Email Confirmed!</h1>
                <p className="text-gray-400 mt-2 max-w-sm">
                    Thank you for confirming your email address. You are now being redirected to your dashboard.
                </p>
                <LoaderCircleIcon className="w-8 h-8 animate-spin text-gray-400 mt-8" />
            </div>
        </div>
    );
};

export default CallbackPage;
