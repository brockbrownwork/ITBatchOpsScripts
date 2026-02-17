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
import random
import time

import pygame


AUDIO_FILE = "strong bad email songs.mp3"
CSV_FILE = "scene_timestamps.csv"

# Cache total duration to avoid reloading
_duration_cache = {}


def _get_duration(audio_path):
    """Get total duration of audio file via pygame.mixer.Sound."""
    if audio_path in _duration_cache:
        return _duration_cache[audio_path]

    pygame.mixer.init()
    sound = pygame.mixer.Sound(audio_path)
    total_seconds = sound.get_length()
    del sound
    pygame.mixer.quit()

    _duration_cache[audio_path] = total_seconds
    return total_seconds


def load_segments(csv_path=CSV_FILE, audio_path=AUDIO_FILE):
    """Load timestamps from CSV and pair them into (start, end) segments."""
    timestamps = []
    with open(csv_path, "r") as f:
        reader = csv.DictReader(f)
        for row in reader:
            timestamps.append(float(row["timestamp_seconds"]))
    timestamps.sort()

    total_seconds = _get_duration(audio_path)

    segments = []
    for i in range(len(timestamps)):
        start = timestamps[i]
        end = timestamps[i + 1] if i + 1 < len(timestamps) else total_seconds
        segments.append((start, end))

    return segments


def play_random_clip(audio_path=AUDIO_FILE, csv_path=CSV_FILE):
    """Play a random segment from the audio file. Returns (index, start, end)."""
    segments = load_segments(csv_path, audio_path)
    idx = random.randrange(len(segments))
    start, end = segments[idx]
    duration = end - start

    pygame.mixer.init()
    pygame.mixer.music.load(audio_path)
    pygame.mixer.music.set_volume(0.85)
    pygame.mixer.music.play(start=start)
    time.sleep(duration)
    pygame.mixer.music.stop()
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
