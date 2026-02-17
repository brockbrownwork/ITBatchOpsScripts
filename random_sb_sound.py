"""
Play a random Strong Bad email sound segment using Pygame.
Reads scene_timestamps.csv to know the segment boundaries, then plays
a random segment directly from the original WAV file (no splitting needed).

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
import time
import wave

import pygame


AUDIO_FILE = "strong bad email songs.wav"
CSV_FILE = "scene_timestamps.csv"


def load_segments(csv_path=CSV_FILE, audio_path=AUDIO_FILE):
    """Load timestamps from CSV and pair them into (start, end) segments."""
    timestamps = []
    with open(csv_path, "r") as f:
        reader = csv.DictReader(f)
        for row in reader:
            timestamps.append(float(row["timestamp_seconds"]))
    timestamps.sort()

    # Get total duration from WAV header
    with wave.open(audio_path, "rb") as w:
        total_seconds = w.getnframes() / w.getframerate()

    segments = []
    for i in range(len(timestamps)):
        start = timestamps[i]
        end = timestamps[i + 1] if i + 1 < len(timestamps) else total_seconds
        segments.append((start, end))

    return segments


def extract_segment(audio_path, start_sec, end_sec):
    """Extract a segment from a WAV file and return it as a bytes buffer."""
    with wave.open(audio_path, "rb") as w:
        framerate = w.getframerate()
        sampwidth = w.getsampwidth()
        nchannels = w.getnchannels()

        start_frame = int(start_sec * framerate)
        end_frame = int(end_sec * framerate)

        w.setpos(start_frame)
        frames = w.readframes(end_frame - start_frame)

    buf = io.BytesIO()
    with wave.open(buf, "wb") as out:
        out.setnchannels(nchannels)
        out.setsampwidth(sampwidth)
        out.setframerate(framerate)
        out.writeframes(frames)
    buf.seek(0)
    return buf


def play_random_clip(audio_path=AUDIO_FILE, csv_path=CSV_FILE):
    """Play a random segment from the WAV file. Returns (index, start, end)."""
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
    parser.add_argument("--audio", default=AUDIO_FILE, help="WAV audio file")
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


