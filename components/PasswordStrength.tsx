
import React, { useMemo } from 'react';
import { CheckIcon, XIcon } from './Icons';

interface PasswordStrengthProps {
    password?: string;
}

const Requirement: React.FC<{ met: boolean; children: React.ReactNode }> = ({ met, children }) => (
    <li className={`flex items-center gap-2 text-xs ${met ? 'text-green-500' : 'text-gray-400'}`}>
        {met ? <CheckIcon className="w-4 h-4" /> : <XIcon className="w-4 h-4 text-gray-600" />}
        <span>{children}</span>
    </li>
);

export const PasswordStrength: React.FC<PasswordStrengthProps> = ({ password = '' }) => {
    const checks = useMemo(() => ({
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /[0-9]/.test(password),
        specialChar: /[^A-Za-z0-9]/.test(password),
    }), [password]);

    return (
        <ul className="space-y-1 mt-2">
            <Requirement met={checks.length}>At least 8 characters</Requirement>
            <Requirement met={checks.lowercase}>At least one lowercase letter</Requirement>
            <Requirement met={checks.uppercase}>At least one uppercase letter</Requirement>
            <Requirement met={checks.number}>At least one number</Requirement>
            <Requirement met={checks.specialChar}>At least one special character</Requirement>
        </ul>
    );
};
