"""
Detect frame changes in 'strong bad email songs.mov' and write timestamps to CSV.
Skips the first 5 seconds. Compares consecutive frames by mean absolute pixel
difference — when it exceeds the threshold, that's a new picture.

Usage:
    python detect_scenes.py
    python detect_scenes.py --threshold 20   # adjust sensitivity (default 15)
    python detect_scenes.py --video "other_file.mov"

Outputs: scene_timestamps.csv
"""

import argparse
import csv

import cv2
import numpy as np
from tqdm import tqdm


def detect_scenes(video_path, threshold=15.0, skip_seconds=5.0):
    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    timestamps = []
    prev_frame = None

    for frame_num in tqdm(range(total_frames), unit="frames", desc="Scanning"):
        ret, frame = cap.read()
        if not ret:
            break

        if prev_frame is not None:
            # Mean absolute difference per pixel across all channels (0-255 scale)
            diff = np.mean(np.abs(frame.astype(float) - prev_frame.astype(float)))
            if diff > threshold:
                timestamp = round(frame_num / fps, 3)
                if timestamp >= skip_seconds:
                    timestamps.append(timestamp)

        prev_frame = frame.copy()

    cap.release()
    return timestamps


def write_csv(timestamps, output_path="scene_timestamps.csv"):
    with open(output_path, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["timestamp_seconds"])
        for ts in timestamps:
            writer.writerow([ts])
    print(f"Wrote {len(timestamps)} timestamps to {output_path}")


def main():
    parser = argparse.ArgumentParser(description="Detect frame changes and output CSV timestamps")
    parser.add_argument("--video", default="strong bad email songs.mov", help="Video file path")
    parser.add_argument("--threshold", type=float, default=15.0, help="Mean pixel diff threshold (default 15, lower = more sensitive)")
    parser.add_argument("--output", default="scene_timestamps.csv", help="Output CSV file path")
    parser.add_argument("--skip", type=float, default=5.0, help="Skip first N seconds (default 5)")
    args = parser.parse_args()

    print(f"Detecting frame changes in: {args.video}")
    print(f"Threshold: {args.threshold}, Skipping first {args.skip}s")

    timestamps = detect_scenes(args.video, threshold=args.threshold, skip_seconds=args.skip)

    print(f"Found {len(timestamps)} frame changes after {args.skip}s:")
    for ts in timestamps:
        mins, secs = divmod(ts, 60)
        print(f"  {int(mins)}:{secs:06.3f}")

    write_csv(timestamps, args.output)


if __name__ == "__main__":
    main()
