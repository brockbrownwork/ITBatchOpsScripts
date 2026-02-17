"""
Detect frame changes in 'strong bad email songs.mov' and write timestamps to CSV.
Skips the first 5 seconds. Uses a jump-and-bisect strategy: since each clip is at
least 3 seconds, we jump ahead ~2 seconds at a time comparing against a reference
frame. When a change is detected, binary search narrows down the exact frame.

Usage:
    python detect_scenes.py
    python detect_scenes.py --threshold 0.5
    python detect_scenes.py --debug
    python detect_scenes.py --video "other_file.mov"

Outputs: scene_timestamps.csv
"""

import argparse
import csv

import cv2
import cupy as cp
from tqdm import tqdm


def read_frame(cap, frame_num):
    """Seek to a frame number and read it. Returns the frame or None."""
    cap.set(cv2.CAP_PROP_POS_FRAMES, frame_num)
    ret, frame = cap.read()
    return frame if ret else None


def frames_differ(frame_a, frame_b, noise_floor, threshold):
    """Compare two frames on GPU. Returns (changed: bool, pct: float)."""
    gpu_a = cp.asarray(frame_a)
    gpu_b = cp.asarray(frame_b)
    diff = cp.abs(gpu_a.astype(cp.int16) - gpu_b.astype(cp.int16))
    max_channel_diff = cp.max(diff, axis=2)
    pct = float((max_channel_diff > noise_floor).sum() / max_channel_diff.size * 100)
    return pct > threshold, pct


def bisect_change(cap, left, right, noise_floor, threshold):
    """Binary search for the exact frame where the change happens between left and right."""
    ref_frame = read_frame(cap, left)
    if ref_frame is None:
        return right

    while right - left > 1:
        mid = (left + right) // 2
        mid_frame = read_frame(cap, mid)
        if mid_frame is None:
            right = mid
            continue

        changed, _ = frames_differ(ref_frame, mid_frame, noise_floor, threshold)
        if changed:
            right = mid
        else:
            left = mid

    return right


def detect_scenes(video_path, threshold=0.5, noise_floor=3, skip_seconds=5.0,
                  min_clip_seconds=3.0, debug=False):
    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    # Jump size: ~2 seconds (safely under the 3-second minimum clip length)
    jump = int(fps * min_clip_seconds * 0.66)
    if jump < 1:
        jump = 1

    skip_frame = int(skip_seconds * fps)
    timestamps = []
    max_pct = 0.0

    # Estimate how many jumps we'll do for the progress bar
    estimated_jumps = (total_frames - skip_frame) // jump
    progress = tqdm(total=estimated_jumps, unit="jumps", desc="Scanning")
    progress.set_postfix(found=0)

    pos = skip_frame
    ref_frame = read_frame(cap, pos)
    if ref_frame is None:
        cap.release()
        return timestamps

    while pos < total_frames:
        next_pos = pos + jump
        if next_pos >= total_frames:
            next_pos = total_frames - 1
        if next_pos <= pos:
            break

        sample_frame = read_frame(cap, next_pos)
        if sample_frame is None:
            break

        changed, pct = frames_differ(ref_frame, sample_frame, noise_floor, threshold)
        if pct > max_pct:
            max_pct = pct

        if changed:
            # Binary search for exact change frame between pos and next_pos
            change_frame = bisect_change(cap, pos, next_pos, noise_floor, threshold)
            timestamp = round(change_frame / fps, 3)
            timestamps.append(timestamp)
            mins, secs = divmod(timestamp, 60)
            progress.set_postfix(found=len(timestamps), latest=f"{int(mins)}:{secs:06.3f}")

            if debug:
                tqdm.write(f"  {pct:6.2f}% changed — bisected to frame {change_frame} ({int(mins)}:{secs:06.3f})")

            # Move past this change and grab a new reference frame
            ref_frame = read_frame(cap, change_frame)
            if ref_frame is None:
                break
            pos = change_frame
        else:
            pos = next_pos

        progress.update(1)

    progress.close()
    cap.release()
    print(f"Max % pixels changed seen: {max_pct:.2f}%")
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
    parser.add_argument("--threshold", type=float, default=0.5,
                        help="Percent of pixels that must change to count as new scene (default 0.5)")
    parser.add_argument("--noise-floor", type=int, default=3,
                        help="Per-pixel difference below this is ignored as compression noise (default 3)")
    parser.add_argument("--min-clip", type=float, default=3.0,
                        help="Minimum clip length in seconds (default 3)")
    parser.add_argument("--debug", action="store_true",
                        help="Print details when changes are found")
    parser.add_argument("--output", default="scene_timestamps.csv", help="Output CSV file path")
    parser.add_argument("--skip", type=float, default=5.0, help="Skip first N seconds (default 5)")
    args = parser.parse_args()

    print(f"Detecting frame changes in: {args.video}")
    print(f"Threshold: {args.threshold}%, noise floor: {args.noise_floor}, min clip: {args.min_clip}s, skipping first {args.skip}s")

    timestamps = detect_scenes(args.video, threshold=args.threshold, noise_floor=args.noise_floor,
                               skip_seconds=args.skip, min_clip_seconds=args.min_clip, debug=args.debug)

    print(f"\nFound {len(timestamps)} frame changes after {args.skip}s:")
    for ts in timestamps:
        mins, secs = divmod(ts, 60)
        print(f"  {int(mins)}:{secs:06.3f}")

    write_csv(timestamps, args.output)


if __name__ == "__main__":
    main()
