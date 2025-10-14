// Create a single AudioContext to be reused.
let audioContext: AudioContext | null = null;
let isAudioInitialized = false;

const getAudioContext = (): AudioContext | null => {
    if (typeof window !== 'undefined' && (window.AudioContext || (window as any).webkitAudioContext)) {
        if (!audioContext || audioContext.state === 'closed') {
            try {
                audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            } catch (e) {
                console.error("Web Audio API is not supported in this browser.");
                return null;
            }
        }
        return audioContext;
    }
    return null;
};

const playTone = (freq: number, duration: number, type: OscillatorType = 'sine') => {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
        // Don't play if not yet initialized by user gesture.
        // The sound will be missed but it avoids console errors.
        return;
    }

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(freq, ctx.currentTime);
    
    // Use a gentle attack and release to avoid clicking sounds
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration / 1000);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration / 1000);
};

/**
 * A short, crisp sound for when the user sends a message.
 */
export const playSentSound = () => {
    playTone(880, 70, 'triangle');
};

/**
 * A soft, rounded sound for an incoming message when the chat is open.
 */
export const playReceiveSound = () => {
    playTone(620, 100, 'sine');
};

/**
 * A more noticeable two-tone sound for notifications when the chat is closed.
 */
export const playNotificationSound = () => {
    const ctx = getAudioContext();
    if (!ctx) return;
    
    // Play two tones in sequence
    playTone(900, 120, 'sine');
    setTimeout(() => playTone(1200, 120, 'sine'), 150);
};

/**
 * Initializes the AudioContext. Should be called on the first user interaction
 * to comply with browser autoplay policies.
 */
export const initAudio = () => {
    if (isAudioInitialized) return;
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
        ctx.resume().then(() => {
            isAudioInitialized = true;
        });
    } else if (ctx) {
        isAudioInitialized = true;
    }
};
