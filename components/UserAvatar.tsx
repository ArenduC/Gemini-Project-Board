import React from 'react';
import { User } from '../types';

interface UserAvatarProps {
  user?: User | null;
  className?: string;
  title?: string;
}

const colors = [
  'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-500', 
  'bg-lime-500', 'bg-green-500', 'bg-emerald-500', 'bg-teal-500', 
  'bg-cyan-500', 'bg-sky-500', 'bg-blue-500', 'bg-indigo-500', 
  'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500', 'bg-pink-500', 'bg-rose-500'
];

// Simple hash function to get a consistent color for a user
const getColorFromString = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash % colors.length);
  return colors[index];
};

export const UserAvatar: React.FC<UserAvatarProps> = ({ user, className, title }) => {
  if (!user) {
    return (
      <div
        className={`flex items-center justify-center rounded-full bg-slate-300 dark:bg-slate-600 text-white font-bold ${className}`}
        title={title || "Unassigned"}
      >
        ?
      </div>
    );
  }

  const initial = user.name ? user.name.charAt(0).toUpperCase() : '?';
  const color = getColorFromString(user.name || '');
  
  return (
    <div
      className={`flex items-center justify-center rounded-full text-white font-bold ${color} ${className}`}
      title={title || user.name}
    >
      {initial}
    </div>
  );
};
