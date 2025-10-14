import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { Notification } from '../types';
import { BellIcon, XIcon } from './Icons';
import { UserAvatar } from './UserAvatar';

interface NotificationToastProps {
  notification: Notification;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({ notification }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    const timer = setTimeout(() => {
      handleClose();
    }, 4500); // Auto-dismiss after 4.5 seconds

    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsClosing(true);
  };

  const notificationRoot = document.getElementById('notification-root');
  if (!notificationRoot) return null;

  return ReactDOM.createPortal(
    <div
      className={`bg-[#131C1B] shadow-lg rounded-xl w-80 p-4 border border-gray-800 transition-all duration-300 ease-in-out
        ${isVisible && !isClosing ? 'transform translate-y-0 opacity-100' : 'transform translate-y-4 opacity-0 pointer-events-none'}`}
      onAnimationEnd={() => {
        if (isClosing) setIsVisible(false);
      }}
    >
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 pt-1">
          <BellIcon className="w-6 h-6 text-gray-500" />
        </div>
        <div className="flex-grow min-w-0">
          <p className="text-sm font-semibold text-white">
            New message in <span className="font-bold">{notification.project.name}</span>
          </p>
          <div className="flex items-center gap-2 mt-2">
            <UserAvatar user={notification.author} className="w-6 h-6 text-xs flex-shrink-0" />
            <p className="text-sm text-white truncate min-w-0">
              <strong>{notification.author.name.split(' ')[0]}:</strong> {notification.message}
            </p>
          </div>
        </div>
        <button
          onClick={handleClose}
          className="p-1.5 rounded-full text-gray-400 hover:bg-gray-800"
          aria-label="Close notification"
        >
          <XIcon className="w-4 h-4" />
        </button>
      </div>
    </div>,
    notificationRoot
  );
};