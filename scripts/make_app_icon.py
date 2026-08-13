#!/usr/bin/env python3
"""Draw The Barbarian's app icon and write every size iOS and Android need.

The mark is the app's own signature element: the 180-degree blade gauge from
the Cash or Trash verdict and the 52-week range, on the website's deep indigo,
with the lit blades running violet to brand blue. Blade count is reduced from
the interface's 56 to 24 so the arc still reads as an arc at 40pt.

Pure Python — no PIL, no ImageMagick. Writes PNG directly with zlib.

Usage:
    python3 scripts/make_app_icon.py
"""

from __future__ import annotations

import math
import pathlib
import struct
import subprocess
import zlib

REPO = pathlib.Path(__file__).resolve().parent.parent
APP = REPO / "app"

# The website's palette: deep indigo ink, brand blue, violet.
INK = (0x22, 0x1B, 0x3D)
BLUE = (0x5A, 0x74, 0xFF)
VIOLET = (0x7C, 0x3A, 0xED)
DIM = (0x39, 0x30, 0x5C)

SIZE = 1024
BLADES = 24
LIT = 17  # a reading a little past the middle — the arc is clearly partial


def blend(bg, fg, a):
    return tuple(round(b + (f - b) * a) for b, f in zip(bg, fg))


def render(size: int) -> bytearray:
    """Returns raw RGB rows for a `size`x`size` image."""
    outer = size * 0.385
    inner = size * 0.235
    # The arc spans y from cy-outer to cy, so this centres the mark in the
    # square rather than leaving it floating above a dead lower half.
    cx, cy = size / 2, size / 2 + outer / 2
    half_w = size * 0.014  # constant blade half-width, as in the real gauge

    # Supersample 2x2 per pixel; the arc is all curves and would alias badly.
    ss = 2
    px = bytearray(size * size * 3)

    for y in range(size):
        row = y * size * 3
        for x in range(size):
            acc = [0.0, 0.0, 0.0]
            for sy in range(ss):
                for sx in range(ss):
                    fx = x + (sx + 0.5) / ss
                    fy = y + (sy + 0.5) / ss
                    dx, dy = fx - cx, fy - cy
                    colour = INK
                    if dy <= half_w:
                        ang = math.degrees(math.atan2(dx, -dy))
                        step = 180 / (BLADES - 1)
                        idx = round((ang + 90) / step)
                        if 0 <= idx < BLADES:
                            theta = math.radians(idx * step - 90)
                            # Blades are rectangles along the ray, not wedges:
                            # measure distance along it and perpendicular to it.
                            ux, uy = math.sin(theta), -math.cos(theta)
                            along = dx * ux + dy * uy
                            perp = abs(dx * uy - dy * ux)
                            if inner <= along <= outer and perp <= half_w:
                                if idx < LIT:
                                    # Violet at the start of the arc easing to
                                    # brand blue at the tip, as the site's own
                                    # gradients do.
                                    t = idx / max(LIT - 1, 1)
                                    colour = tuple(
                                        round(v + (b - v) * t)
                                        for v, b in zip(VIOLET, BLUE)
                                    )
                                else:
                                    colour = DIM
                    acc[0] += colour[0]
                    acc[1] += colour[1]
                    acc[2] += colour[2]
            n = ss * ss
            i = row + x * 3
            px[i] = round(acc[0] / n)
            px[i + 1] = round(acc[1] / n)
            px[i + 2] = round(acc[2] / n)
    return px


def write_png(path: pathlib.Path, size: int, rgb: bytearray) -> None:
    raw = bytearray()
    for y in range(size):
        raw.append(0)  # filter type 0
        raw += rgb[y * size * 3 : (y + 1) * size * 3]

    def chunk(tag: bytes, data: bytes) -> bytes:
        return (
            struct.pack(">I", len(data))
            + tag
            + data
            + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
        )

    png = (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(bytes(raw), 9))
        + chunk(b"IEND", b"")
    )
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(png)


def resize(src: pathlib.Path, dst: pathlib.Path, size: int) -> None:
    dst.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        ["sips", "-z", str(size), str(size), str(src), "--out", str(dst)],
        check=True,
        capture_output=True,
    )


IOS = {
    "Icon-App-20x20@1x.png": 20, "Icon-App-20x20@2x.png": 40,
    "Icon-App-20x20@3x.png": 60, "Icon-App-29x29@1x.png": 29,
    "Icon-App-29x29@2x.png": 58, "Icon-App-29x29@3x.png": 87,
    "Icon-App-40x40@1x.png": 40, "Icon-App-40x40@2x.png": 80,
    "Icon-App-40x40@3x.png": 120, "Icon-App-60x60@2x.png": 120,
    "Icon-App-60x60@3x.png": 180, "Icon-App-76x76@1x.png": 76,
    "Icon-App-76x76@2x.png": 152, "Icon-App-83.5x83.5@2x.png": 167,
    "Icon-App-1024x1024@1x.png": 1024,
}

ANDROID = {
    "mipmap-mdpi": 48, "mipmap-hdpi": 72, "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144, "mipmap-xxxhdpi": 192,
}


def main() -> int:
    print(f"rendering {SIZE}x{SIZE} …")
    master = REPO / "design" / "app-icon-1024.png"
    write_png(master, SIZE, render(SIZE))
    print(f"  {master.relative_to(REPO)}")

    ios_dir = APP / "ios/Runner/Assets.xcassets/AppIcon.appiconset"
    for name, size in IOS.items():
        resize(master, ios_dir / name, size)
    print(f"  {len(IOS)} iOS sizes")

    for folder, size in ANDROID.items():
        target = APP / "android/app/src/main/res" / folder / "ic_launcher.png"
        resize(master, target, size)
    print(f"  {len(ANDROID)} Android densities")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
