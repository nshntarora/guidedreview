"""Generate Chrome extension PNG icons from the brand mark in public/icon.png.

Requires ImageMagick (`magick` or `convert`) on PATH. Falls back to a solid
primary-color square if the source mark is missing.
"""
import os
import shutil
import struct
import subprocess
import zlib

ROOT = os.path.join(os.path.dirname(__file__), "..")
OUT_DIR = os.path.join(ROOT, "public", "icons")
SOURCE = os.path.join(ROOT, "public", "icon.png")

# Brand primary — used only for the solid-color fallback
PRIMARY = (0xCA, 0xFF, 0x57)  # #CAFF57


def make_png(path: str, size: int, rgb: tuple[int, int, int]) -> None:
    width = height = size
    r, g, b = rgb

    def chunk(tag: bytes, data: bytes) -> bytes:
        return (
            struct.pack(">I", len(data))
            + tag
            + data
            + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
        )

    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)

    raw = bytearray()
    for _y in range(height):
        raw.append(0)  # no filter
        for _x in range(width):
            raw += bytes([r, g, b])

    idat = zlib.compress(bytes(raw), 9)
    png = sig + chunk(b"IHDR", ihdr) + chunk(b"IDAT", idat) + chunk(b"IEND", b"")

    with open(path, "wb") as f:
        f.write(png)


def find_magick() -> list[str] | None:
    for name in ("magick", "convert"):
        path = shutil.which(name)
        if path:
            return [path]
    return None


def resize_with_magick(magick: list[str], size: int, dest: str) -> None:
    cmd = magick + [SOURCE, "-resize", f"{size}x{size}", dest]
    subprocess.check_call(cmd)


def main() -> None:
    os.makedirs(OUT_DIR, exist_ok=True)
    magick = find_magick() if os.path.isfile(SOURCE) else None

    for size in (16, 48, 128):
        dest = os.path.join(OUT_DIR, f"icon{size}.png")
        if magick:
            resize_with_magick(magick, size, dest)
        else:
            make_png(dest, size, PRIMARY)

    print("wrote icons to", OUT_DIR)


if __name__ == "__main__":
    main()
