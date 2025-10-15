import React, { useState, useEffect, useRef } from 'react';
import { User } from '../types';
import { XIcon, MicrophoneIcon, MicOffIcon, VideoIcon, VideoOffIcon, ScreenShareIcon, PhoneOffIcon, LoaderCircleIcon } from './Icons';
import { UserAvatar } from './UserAvatar';

interface MeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
}

export const MeetingModal: React.FC<MeetingModalProps> = ({ isOpen, onClose, currentUser }) => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [screenShareError, setScreenShareError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const mainVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!isOpen) {
        // Cleanup function
        [localStream, screenStream].forEach(stream => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        });
        setLocalStream(null);
        setScreenStream(null);
        setIsLoading(true);
        setError(null);
        setScreenShareError(null);
        setIsMuted(false);
        setIsVideoOff(false);
        return;
    }

    const startMedia = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setLocalStream(stream);
        setIsMuted(false);
        setIsVideoOff(false);
      } catch (err) {
        console.warn("Could not get audio and video together, trying separately.", err);

        if (err instanceof Error && err.name === 'NotAllowedError') {
          setError("Permission denied. Please allow access to your camera and microphone in browser settings.");
          setIsLoading(false);
          return;
        }

        // Try getting devices separately
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true }).catch(e => { console.warn('Could not get audio', e); return null; });
        const videoStream = await navigator.mediaDevices.getUserMedia({ video: true }).catch(e => { console.warn('Could not get video', e); return null; });

        if (audioStream && videoStream) {
          const combinedStream = new MediaStream([...videoStream.getVideoTracks(), ...audioStream.getAudioTracks()]);
          setLocalStream(combinedStream);
          setIsMuted(false);
          setIsVideoOff(false);
        } else if (audioStream) {
          setLocalStream(audioStream);
          setIsMuted(false);
          setIsVideoOff(true); // Video is off because we couldn't get it
        } else if (videoStream) {
          setLocalStream(videoStream);
          setIsMuted(true); // Muted because we couldn't get audio
          setIsVideoOff(false);
        } else {
          setError("No camera or microphone found. Please check your device and browser permissions.");
        }
      } finally {
        setIsLoading(false);
      }
    };

    startMedia();

    // Cleanup on component unmount (if modal is closed abruptly)
    return () => {
       [localStream, screenStream].forEach(stream => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        });
    };
  }, [isOpen]); // Main effect for handling media streams

  // Effect to attach local stream to the small preview video element
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      const videoTracks = localStream.getVideoTracks();
      if (videoTracks.length > 0) {
        // Create a new stream with only video for the preview to avoid audio feedback
        const videoOnlyStream = new MediaStream([videoTracks[0]]);
        localVideoRef.current.srcObject = videoOnlyStream;
      } else {
        localVideoRef.current.srcObject = null;
      }
    }
  }, [localStream]);

  // Effect to attach the correct stream to the main video element
  useEffect(() => {
    if (mainVideoRef.current) {
        mainVideoRef.current.srcObject = screenStream || localStream;
    }
  }, [screenStream, localStream]);


  const hasAudioTrack = localStream?.getAudioTracks().length > 0;
  const hasVideoTrack = localStream?.getVideoTracks().length > 0;

  const toggleMute = () => {
    if (!hasAudioTrack) return;
    localStream.getAudioTracks().forEach(track => {
      track.enabled = !track.enabled;
    });
    setIsMuted(prev => !prev);
  };

  const toggleVideo = () => {
    if (!hasVideoTrack) return;
    localStream.getVideoTracks().forEach(track => {
      track.enabled = !track.enabled;
    });
    setIsVideoOff(prev => !prev);
  };
  
  const toggleScreenShare = async () => {
    setScreenShareError(null);
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
      setScreenStream(null);
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        stream.getVideoTracks()[0].addEventListener('ended', () => {
            setScreenStream(null);
        });
        setScreenStream(stream);
      } catch (err) {
        console.error("Error starting screen share.", err);
        let message = "Could not start screen share. Please try again.";
        if (err instanceof Error && (err.name === 'NotAllowedError' || err.message.includes('permission'))) {
            message = "Screen share permission was denied. Please check browser settings.";
        }
        setScreenShareError(message);
        setTimeout(() => setScreenShareError(null), 5000); // Clear error after 5 seconds
      }
    }
  };

  if (!isOpen) return null;

  const MainViewContent = () => {
    if (isLoading) {
      return <div className="text-white flex items-center gap-2"><LoaderCircleIcon className="w-6 h-6 animate-spin"/> Connecting...</div>;
    }
    if (error) {
      return <div className="text-red-500 max-w-md text-center">{error}</div>;
    }
    if ((!hasVideoTrack && !screenStream) || (isVideoOff && !screenStream)) {
        return <UserAvatar user={currentUser} className="w-48 h-48 text-6xl" />;
    }
    return <video ref={mainVideoRef} autoPlay playsInline className={`w-full h-full object-contain ${screenStream ? '' : 'transform -scale-x-100'}`}></video>;
  };
  
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex flex-col p-4" onClick={onClose}>
      <div className="flex-grow relative flex items-center justify-center bg-black/30 rounded-lg overflow-hidden" onClick={e => e.stopPropagation()}>
        <MainViewContent />

        <div className="absolute top-4 right-4 flex items-center gap-4">
          <div className="relative w-48 h-28 rounded-md overflow-hidden border-2 border-gray-700 bg-black/50">
             <video ref={localVideoRef} autoPlay playsInline muted className={`w-full h-full object-cover transform -scale-x-100 ${!hasVideoTrack || isVideoOff ? 'hidden' : 'block'}`}></video>
             {(!hasVideoTrack || isVideoOff) && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <UserAvatar user={currentUser} className="w-12 h-12 text-2xl"/>
                </div>
             )}
             <p className="absolute bottom-1 left-2 text-white text-xs font-semibold drop-shadow">{currentUser.name}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full text-gray-400 bg-black/30 hover:bg-gray-800"><XIcon className="w-6 h-6" /></button>
        </div>
      </div>
      
      <div className="flex-shrink-0 flex flex-col items-center gap-4 p-4" onClick={e => e.stopPropagation()}>
         {screenShareError && <p className="text-red-500 text-sm mb-2">{screenShareError}</p>}
         <div className="flex justify-center items-center gap-4">
            <button onClick={toggleMute} disabled={!hasAudioTrack} className={`p-3 rounded-full transition-colors ${isMuted ? 'bg-white text-black' : 'bg-gray-700 text-white hover:bg-gray-600'} disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed`}>{isMuted ? <MicOffIcon className="w-6 h-6"/> : <MicrophoneIcon className="w-6 h-6"/>}</button>
            <button onClick={toggleVideo} disabled={!hasVideoTrack} className={`p-3 rounded-full transition-colors ${isVideoOff ? 'bg-white text-black' : 'bg-gray-700 text-white hover:bg-gray-600'} disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed`}>{isVideoOff ? <VideoOffIcon className="w-6 h-6"/> : <VideoIcon className="w-6 h-6"/>}</button>
            <button onClick={toggleScreenShare} className={`p-3 rounded-full ${screenStream ? 'bg-green-500 text-white' : 'bg-gray-700 text-white hover:bg-gray-600'}`}><ScreenShareIcon className="w-6 h-6"/></button>
            <button onClick={onClose} className="p-3 rounded-full bg-red-600 text-white hover:bg-red-500"><PhoneOffIcon className="w-6 h-6"/></button>
         </div>
      </div>
    </div>
  );
};