import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';

interface VoiceCommandConfig {
  onEmergencyTrigger?: (type: string) => void;
  onCancel?: () => void;
  enabled?: boolean;
}

interface VoiceCommandsState {
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
  confidence: number;
}

const EMERGENCY_KEYWORDS = {
  police: ['police', 'pulis', 'help police', 'call police', 'emergency police'],
  medical: ['medical', 'ambulance', 'doctor', 'hospital', 'emergency medical', 'health emergency'],
  fire: ['fire', 'sunog', 'fire emergency', 'call fire department', 'fire station'],
  disaster: ['disaster', 'sakuna', 'earthquake', 'flood', 'typhoon', 'lindol', 'baha'],
  sos: ['sos', 'help', 'emergency', 'tulong', 'saklolo', 'help me', 'emergency help'],
};

const CANCEL_KEYWORDS = ['cancel', 'stop', 'nevermind', 'false alarm', 'cancel emergency'];

export function useVoiceCommands(config: VoiceCommandConfig = {}) {
  const { onEmergencyTrigger, onCancel, enabled = true } = config;
  
  const [state, setState] = useState<VoiceCommandsState>({
    isListening: false,
    isSupported: false,
    transcript: '',
    confidence: 0,
  });
  
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check if Web Speech API is supported
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setState(prev => ({ ...prev, isSupported: !!SpeechRecognition }));
  }, []);

  const processCommand = useCallback((transcript: string, confidence: number) => {
    const lowerTranscript = transcript.toLowerCase().trim();
    
    // Check for cancel commands first
    for (const keyword of CANCEL_KEYWORDS) {
      if (lowerTranscript.includes(keyword)) {
        onCancel?.();
        toast.info('Emergency cancelled via voice command');
        return true;
      }
    }
    
    // Check for emergency keywords
    for (const [type, keywords] of Object.entries(EMERGENCY_KEYWORDS)) {
      for (const keyword of keywords) {
        if (lowerTranscript.includes(keyword)) {
          // Require higher confidence for emergency triggers
          if (confidence > 0.6 || keywords.some(k => lowerTranscript === k)) {
            onEmergencyTrigger?.(type);
            toast.success(`Voice command detected: ${type.toUpperCase()} emergency`);
            return true;
          }
        }
      }
    }
    
    return false;
  }, [onEmergencyTrigger, onCancel]);

  const startListening = useCallback(() => {
    if (!state.isSupported || !enabled) {
      toast.error('Voice commands not supported on this device');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    // Stop any existing recognition
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-PH'; // English Philippines, also understands Tagalog
    recognition.maxAlternatives = 3;

    recognition.onstart = () => {
      setState(prev => ({ ...prev, isListening: true, transcript: '' }));
      toast.info('Voice commands activated - say "Help", "SOS", or emergency type');
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interimTranscript = '';
      let maxConfidence = 0;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;
        const confidence = result[0].confidence;
        
        if (confidence > maxConfidence) {
          maxConfidence = confidence;
        }

        if (result.isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      const currentTranscript = finalTranscript || interimTranscript;
      setState(prev => ({ 
        ...prev, 
        transcript: currentTranscript,
        confidence: maxConfidence 
      }));

      if (finalTranscript) {
        processCommand(finalTranscript, maxConfidence);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      
      if (event.error === 'not-allowed') {
        toast.error('Microphone access denied. Please enable it in settings.');
        setState(prev => ({ ...prev, isListening: false }));
      } else if (event.error === 'no-speech') {
        // Silently restart on no speech
      } else if (event.error !== 'aborted') {
        toast.error(`Voice recognition error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      // Auto-restart if still supposed to be listening
      if (state.isListening && enabled) {
        restartTimeoutRef.current = setTimeout(() => {
          if (recognitionRef.current === recognition) {
            try {
              recognition.start();
            } catch (e) {
              // Ignore if already started
            }
          }
        }, 100);
      } else {
        setState(prev => ({ ...prev, isListening: false }));
      }
    };

    recognitionRef.current = recognition;
    
    try {
      recognition.start();
    } catch (error) {
      console.error('Failed to start recognition:', error);
      toast.error('Failed to start voice recognition');
    }
  }, [state.isSupported, state.isListening, enabled, processCommand]);

  const stopListening = useCallback(() => {
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
    
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    
    setState(prev => ({ ...prev, isListening: false, transcript: '' }));
    toast.info('Voice commands deactivated');
  }, []);

  const toggleListening = useCallback(() => {
    if (state.isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [state.isListening, startListening, stopListening]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  return {
    ...state,
    startListening,
    stopListening,
    toggleListening,
  };
}

// Type declarations for Web Speech API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((event: Event) => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: ((event: Event) => void) | null;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

declare global {
  interface Window {
    SpeechRecognition: SpeechRecognitionConstructor;
    webkitSpeechRecognition: SpeechRecognitionConstructor;
  }
}
