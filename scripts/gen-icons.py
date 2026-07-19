"""Generate simple solid-color placeholder PNG icons (no external deps)."""
import struct
import zlib
import os

def make_png(path, size, rgb):
    width = height = size
    r, g, b = rgb

    def chunk(tag, data):
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


out_dir = os.path.join(os.path.dirname(__file__), "..", "public", "icons")
os.makedirs(out_dir, exist_ok=True)

# A calm indigo square as the placeholder mark
COLOR = (79, 70, 229)  # #4F46E5

for size in (16, 48, 128):
    make_png(os.path.join(out_dir, f"icon{size}.png"), size, COLOR)

print("wrote icons to", out_dir)
