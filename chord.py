import numpy as np
import sounddevice as sd

def generate_tone(frequency, duration, sample_rate=44100):
    """Generate a sine wave tone."""
    t = np.linspace(0, duration, int(sample_rate * duration), endpoint=False)
    return 0.5 * np.sin(2 * np.pi * frequency * t)

def apply_fade(audio, sample_rate, fade_duration):
    """Apply fade-in and fade-out to the audio."""
    fade_samples = int(sample_rate * fade_duration)
    fade_in = np.linspace(0, 1, fade_samples)
    fade_out = np.linspace(1, 0, fade_samples)
    
    audio[:fade_samples] *= fade_in  # Fade-in
    audio[-fade_samples:] *= fade_out  # Fade-out
    return audio

def play_chord(chord_frequencies, duration=2, sample_rate=44100, fade_duration=0.5):
    """Play a chord with fade-in and fade-out."""
    chord = sum(generate_tone(freq, duration, sample_rate) for freq in chord_frequencies)
    chord = chord / len(chord_frequencies)  # Normalize amplitude
    chord = apply_fade(chord, sample_rate, fade_duration)  # Apply fade effects
    sd.play(chord, samplerate=sample_rate)
    sd.wait()

if __name__ == "__main__":
    # Frequencies for Fsus4 chord: F (174.61 Hz), Bb (233.08 Hz), C (261.63 Hz)
    fsus4_frequencies = [174.61, 233.08, 261.63]
    fsus4_frequencies = [i * 2 for i in fsus4_frequencies]  # Octave higher
    play_chord(fsus4_frequencies, duration=2, fade_duration=0.5)  # Play the chord with fades
