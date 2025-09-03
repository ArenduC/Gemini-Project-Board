import React from 'react';
import { User } from '../types';

interface UserAvatarProps {
  user?: User | null;
  className?: string;
  title?: string;
  isOnline?: boolean;
}

const colors = [
  'bg-[#A56F5A]', // Muted Terracotta
  'bg-[#5A8DA5]', // Muted Slate Blue
  'bg-[#5AA58A]', // Muted Teal
  'bg-[#A5A05A]', // Muted Gold/Green
  'bg-[#8A5AA5]', // Muted Plum
  'bg-[#A55A73]', // Muted Rose
];

const getColor = (name: string): string => {
  const charCodeSum = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[charCodeSum % colors.length];
};

export const UserAvatar: React.FC<UserAvatarProps> = ({ user, className, title, isOnline = false }) => {
  if (!user) {
    return (
      <div
        className={`flex items-center justify-center rounded-full bg-gray-700 text-white font-bold ${className}`}
        title={title || "Unassigned"}
      >
        ?
      </div>
    );
  }

  const initial = user.name ? user.name.charAt(0).toUpperCase() : '?';
  const color = getColor(user.name);
  
  return (
    <div
      className={`relative flex items-center justify-center rounded-full text-white font-bold ${color} ${className}`}
      title={title || user.name}
    >
      {initial}
      {isOnline && (
        <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-[#131C1B]" title="Online"></span>
      )}
    </div>
  );
};