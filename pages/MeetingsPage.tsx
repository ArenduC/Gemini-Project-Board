import React, { useState } from 'react';
import { User } from '../types';
import { VideoIcon } from '../components/Icons';
import { MeetingModal } from '../components/MeetingModal';

interface MeetingsPageProps {
  currentUser: User;
}

export const MeetingsPage: React.FC<MeetingsPageProps> = ({ currentUser }) => {
  const [isMeetingModalOpen, setMeetingModalOpen] = useState(false);

  return (
    <>
      <div className="flex flex-col items-center justify-center pt-16">
        <div className="w-full max-w-2xl text-center">
           <div className="bg-[#131C1B] p-8 sm:p-12 rounded-xl shadow-lg border border-gray-800">
             <VideoIcon className="mx-auto h-16 w-16 text-gray-500 mb-6" />
             <h1 className="text-3xl font-bold text-white">Instant Meetings</h1>
             <p className="mt-2 text-gray-400 max-w-md mx-auto">
               Start a secure video call with your team instantly. No setup required.
             </p>
             <div className="mt-8">
               <button
                 onClick={() => setMeetingModalOpen(true)}
                 className="inline-flex items-center gap-3 px-8 py-3 bg-green-600 text-white text-lg font-semibold rounded-lg shadow-sm hover:bg-green-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-[#131C1B] transition-all"
               >
                 <VideoIcon className="w-6 h-6" />
                 Start Instant Meeting
               </button>
             </div>
           </div>
           
           <div className="mt-8 text-sm text-gray-500">
             <p>Scheduled meetings from your calendar will appear here in a future update.</p>
           </div>
        </div>
      </div>
      
      {isMeetingModalOpen && (
        <MeetingModal
          isOpen={isMeetingModalOpen}
          onClose={() => setMeetingModalOpen(false)}
          currentUser={currentUser}
        />
      )}
    </>
  );
};
