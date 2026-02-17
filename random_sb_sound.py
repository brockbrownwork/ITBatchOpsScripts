"""
Play a random Strong Bad email sound segment using Pygame.
Reads scene_timestamps.csv to know the segment boundaries, then plays
a random segment directly from the original audio file (no splitting needed).
Uses only pygame for audio loading (supports WAV, MP3, OGG natively).

Usage:
    python random_sb_sound.py              # play one random segment
    python random_sb_sound.py --list       # list all segments with times

Can also be imported:
    from random_sb_sound import play_random_clip
    play_random_clip()
"""

import argparse
import csv
import io
import random
import struct
import time
import wave

import pygame


AUDIO_FILE = "strong bad email songs.mp3"
CSV_FILE = "scene_timestamps.csv"

# Cache the loaded sound to avoid re-reading the file every call
_sound_cache = {}


def _load_sound(audio_path):
    """Load audio file via pygame and cache raw sample data + mixer settings."""
    if audio_path in _sound_cache:
        return _sound_cache[audio_path]

    pygame.mixer.init()
    sound = pygame.mixer.Sound(audio_path)
    raw = sound.get_raw()
    freq, bits, channels = pygame.mixer.get_init()
    total_seconds = sound.get_length()
    pygame.mixer.quit()

    _sound_cache[audio_path] = (raw, freq, bits, channels, total_seconds)
    return raw, freq, bits, channels, total_seconds


def load_segments(csv_path=CSV_FILE, audio_path=AUDIO_FILE):
    """Load timestamps from CSV and pair them into (start, end) segments."""
    timestamps = []
    with open(csv_path, "r") as f:
        reader = csv.DictReader(f)
        for row in reader:
            timestamps.append(float(row["timestamp_seconds"]))
    timestamps.sort()

    _, _, _, _, total_seconds = _load_sound(audio_path)

    segments = []
    for i in range(len(timestamps)):
        start = timestamps[i]
        end = timestamps[i + 1] if i + 1 < len(timestamps) else total_seconds
        segments.append((start, end))

    return segments


def extract_segment(audio_path, start_sec, end_sec):
    """Extract a segment from cached raw audio and return it as a WAV bytes buffer."""
    raw, freq, bits, channels, _ = _load_sound(audio_path)

    sample_width = abs(bits) // 8
    bytes_per_second = freq * channels * sample_width

    start_byte = int(start_sec * bytes_per_second)
    end_byte = int(end_sec * bytes_per_second)

    # Align to frame boundary
    frame_size = channels * sample_width
    start_byte = (start_byte // frame_size) * frame_size
    end_byte = (end_byte // frame_size) * frame_size

    segment_raw = raw[start_byte:end_byte]

    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(channels)
        wf.setsampwidth(sample_width)
        wf.setframerate(freq)
        wf.writeframes(segment_raw)
    buf.seek(0)
    return buf


def play_random_clip(audio_path=AUDIO_FILE, csv_path=CSV_FILE):
    """Play a random segment from the audio file. Returns (index, start, end)."""
    segments = load_segments(csv_path, audio_path)
    idx = random.randrange(len(segments))
    start, end = segments[idx]

    buf = extract_segment(audio_path, start, end)

    pygame.mixer.init()
    sound = pygame.mixer.Sound(buf)
    sound.play()

    while pygame.mixer.get_busy():
        time.sleep(0.1)

    pygame.mixer.quit()
    return idx + 1, start, end


def main():
    parser = argparse.ArgumentParser(description="Play a random Strong Bad email sound segment")
    parser.add_argument("--audio", default=AUDIO_FILE, help="Audio file (WAV or MP3)")
    parser.add_argument("--csv", default=CSV_FILE, help="CSV file with timestamps")
    parser.add_argument("--list", action="store_true", help="List all segments without playing")
    args = parser.parse_args()

    segments = load_segments(args.csv, args.audio)

    if args.list:
        print(f"Segments ({len(segments)} total):")
        for i, (start, end) in enumerate(segments, 1):
            duration = end - start
            print(f"  #{i:3d}: {start:7.3f}s - {end:7.3f}s  ({duration:.2f}s)")
        return

    num, start, end = play_random_clip(args.audio, args.csv)
    print(f"Played segment #{num}: {start:.3f}s - {end:.3f}s ({end - start:.2f}s)")


if __name__ == "__main__":
    main()
