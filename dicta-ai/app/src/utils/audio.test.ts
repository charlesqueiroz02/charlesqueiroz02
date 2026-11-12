import { afterEach, describe, expect, it, vi } from 'vitest';
import { setFeedbackPrefs, soundEffects } from './audio';

describe('preferências de feedback', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    setFeedbackPrefs({ sounds: true, haptics: true });
  });

  function stub() {
    const vibrate = vi.fn();
    const AudioContext = vi.fn();
    vi.stubGlobal('navigator', { vibrate });
    vi.stubGlobal('window', { AudioContext });
    return { vibrate, AudioContext };
  }

  it('não vibra nem toca som quando ambos estão desligados', () => {
    const { vibrate, AudioContext } = stub();
    setFeedbackPrefs({ sounds: false, haptics: false });
    soundEffects.playStartSound();
    soundEffects.playSuccessSound();
    expect(vibrate).not.toHaveBeenCalled();
    expect(AudioContext).not.toHaveBeenCalled();
  });

  it('vibra sem som quando só a vibração está ligada', () => {
    const { vibrate, AudioContext } = stub();
    setFeedbackPrefs({ sounds: false, haptics: true });
    soundEffects.playStopSound();
    expect(vibrate).toHaveBeenCalledWith([25, 30, 25]);
    expect(AudioContext).not.toHaveBeenCalled();
  });
});
