import { useCallback, useRef } from 'react';

export type VoiceEventType = 
  | 'process_created'
  | 'cpu_scheduled'
  | 'parent_waiting'
  | 'process_exit'
  | 'zombie_created'
  | 'process_reaped'
  | 'orphan_adopted';

interface VoiceNarratorOptions {
  enabled: boolean;
  rate?: number;
  pitch?: number;
  volume?: number;
}

export interface VoiceNarration {
  type: VoiceEventType;
  message: string;
}

const getVoiceMessage = (
  type: VoiceEventType,
  params: {
    pid?: number;
    parentPid?: number;
    childPid?: number;
  }
): string => {
  const { pid, parentPid, childPid } = params;

  switch (type) {
    case 'process_created':
      return parentPid 
        ? `Process PID ${parentPid} created child process PID ${pid}.`
        : `Root process PID ${pid} created.`;
    
    case 'cpu_scheduled':
      return `Process PID ${pid} is currently executing on the CPU.`;
    
    case 'parent_waiting':
      return childPid
        ? `Parent process PID ${pid} is waiting for child process PID ${childPid}.`
        : `Parent process PID ${pid} is waiting for its children.`;
    
    case 'process_exit':
      return `Process PID ${pid} has finished execution and exited normally.`;
    
    case 'zombie_created':
      return parentPid
        ? `Process PID ${pid} has become a zombie because parent PID ${parentPid} did not call wait.`
        : `Process PID ${pid} has become a zombie.`;
    
    case 'process_reaped':
      return parentPid
        ? `Process PID ${pid} was reaped by parent process PID ${parentPid}.`
        : `Process PID ${pid} was reaped.`;
    
    case 'orphan_adopted':
      return `Process PID ${pid} became an orphan and was adopted by init process PID 1.`;
    
    default:
      return '';
  }
};

export const useVoiceNarrator = (options: VoiceNarratorOptions) => {
  const { enabled, rate = 1.0, pitch = 1.0, volume = 1.0 } = options;
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const lastMessageRef = useRef<string>('');

  const speak = useCallback((
    type: VoiceEventType,
    params: {
      pid?: number;
      parentPid?: number;
      childPid?: number;
    }
  ) => {
    if (!enabled) return;
    
    // Check if speech synthesis is available
    if (!window.speechSynthesis) {
      console.warn('Speech synthesis not supported in this browser');
      return;
    }

    const message = getVoiceMessage(type, params);
    
    // Don't repeat the same message
    if (message === lastMessageRef.current) return;
    lastMessageRef.current = message;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    // Create new utterance
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = volume;
    
    // Try to use a natural-sounding voice
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(
      v => v.lang.startsWith('en') && v.name.includes('Google')
    ) || voices.find(
      v => v.lang.startsWith('en')
    );
    
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [enabled, rate, pitch, volume]);

  const speakRaw = useCallback((message: string) => {
    if (!enabled) return;
    
    if (!window.speechSynthesis) {
      console.warn('Speech synthesis not supported in this browser');
      return;
    }

    // Don't repeat the same message
    if (message === lastMessageRef.current) return;
    lastMessageRef.current = message;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(message);
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = volume;
    
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(
      v => v.lang.startsWith('en') && v.name.includes('Google')
    ) || voices.find(
      v => v.lang.startsWith('en')
    );
    
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [enabled, rate, pitch, volume]);

  const stop = useCallback(() => {
    window.speechSynthesis?.cancel();
    lastMessageRef.current = '';
  }, []);

  const clearLastMessage = useCallback(() => {
    lastMessageRef.current = '';
  }, []);

  return {
    speak,
    speakRaw,
    stop,
    clearLastMessage,
    isSupported: typeof window !== 'undefined' && 'speechSynthesis' in window,
  };
};
