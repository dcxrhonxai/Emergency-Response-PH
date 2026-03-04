import { useState, useCallback, useEffect } from 'react';

export interface SoundPreferences {
  medical: string;
  fire: string;
  police: string;
  accident: string;
  natural_disaster: string;
  enabled: boolean;
  volume: number;
}

export const AVAILABLE_SOUNDS = [
  { id: 'default', name: 'Default Alert', frequency: 800 },
  { id: 'urgent', name: 'Urgent Siren', frequency: 1200 },
  { id: 'gentle', name: 'Gentle Chime', frequency: 523 },
  { id: 'alarm', name: 'Alarm Bell', frequency: 1000 },
  { id: 'warning', name: 'Warning Tone', frequency: 660 },
] as const;

const DEFAULT_SOUND_PREFERENCES: SoundPreferences = {
  medical: 'urgent',
  fire: 'alarm',
  police: 'default',
  accident: 'warning',
  natural_disaster: 'urgent',
  enabled: true,
  volume: 0.7,
};

const EMERGENCY_SOUND_MAP: Record<string, keyof Omit<SoundPreferences, 'enabled' | 'volume'>> = {
  medical: 'medical',
  health: 'medical',
  fire: 'fire',
  police: 'police',
  crime: 'police',
  accident: 'accident',
  vehicle: 'accident',
  natural_disaster: 'natural_disaster',
  earthquake: 'natural_disaster',
  flood: 'natural_disaster',
  typhoon: 'natural_disaster',
};

export const useNotificationSounds = () => {
  const [soundPreferences, setSoundPreferences] = useState<SoundPreferences>(() => {
    const saved = localStorage.getItem('soundPreferences');
    return saved ? JSON.parse(saved) : DEFAULT_SOUND_PREFERENCES;
  });

  useEffect(() => {
    localStorage.setItem('soundPreferences', JSON.stringify(soundPreferences));
  }, [soundPreferences]);

  const updateSoundPreference = useCallback((type: keyof Omit<SoundPreferences, 'enabled' | 'volume'>, soundId: string) => {
    setSoundPreferences(prev => ({ ...prev, [type]: soundId }));
  }, []);

  const updateSoundEnabled = useCallback((enabled: boolean) => {
    setSoundPreferences(prev => ({ ...prev, enabled }));
  }, []);

  const updateVolume = useCallback((volume: number) => {
    setSoundPreferences(prev => ({ ...prev, volume }));
  }, []);

  const playSound = useCallback((soundId: string, volume?: number) => {
    const sound = AVAILABLE_SOUNDS.find(s => s.id === soundId);
    if (!sound || !soundPreferences.enabled) return;

    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = sound.frequency;
      oscillator.type = soundId === 'urgent' ? 'sawtooth' : soundId === 'alarm' ? 'square' : 'sine';
      gainNode.gain.value = volume ?? soundPreferences.volume;

      oscillator.start();
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.8);
      oscillator.stop(audioContext.currentTime + 0.8);
    } catch (e) {
      console.warn('Could not play notification sound:', e);
    }
  }, [soundPreferences.enabled, soundPreferences.volume]);

  const playEmergencySound = useCallback((emergencyType: string) => {
    if (!soundPreferences.enabled) return;
    const normalized = emergencyType.toLowerCase();
    let soundKey: keyof Omit<SoundPreferences, 'enabled' | 'volume'> = 'medical';

    for (const [keyword, key] of Object.entries(EMERGENCY_SOUND_MAP)) {
      if (normalized.includes(keyword)) {
        soundKey = key;
        break;
      }
    }

    const soundId = soundPreferences[soundKey];
    playSound(soundId as string);
  }, [soundPreferences, playSound]);

  const previewSound = useCallback((soundId: string) => {
    playSound(soundId, 0.5);
  }, [playSound]);

  return {
    soundPreferences,
    updateSoundPreference,
    updateSoundEnabled,
    updateVolume,
    playEmergencySound,
    previewSound,
  };
};
