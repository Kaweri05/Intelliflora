'''Utility functions for image processing used in IntelliFlora.

Provides:
- `compress_image`: Reduces image file size to be under a target size (KB) while preserving
  aspect ratio and reasonable visual quality.
- `resize_image`: Resizes an image to fit within max width/height constraints, maintaining
  aspect ratio.

These helpers are used by the Flask routes handling image uploads before they are passed
to the TensorFlow model for prediction.
'''  
import os
from io import BytesIO
from typing import Tuple

from PIL import Image

def _save_image(img: Image.Image, path: str, quality: int = 85) -> None:
    """Save `img` to `path` with the given JPEG quality.
    PNGs are saved with optimization enabled.
    """
    ext = os.path.splitext(path)[1].lower()
    if ext in {'.jpg', '.jpeg'}:
        img.save(path, format='JPEG', quality=quality, optimize=True)
    else:
        img.save(path, format='PNG', optimize=True)

def compress_image(input_path: str, output_path: str, target_kb: int = 200) -> None:
    """Compress an image so that its file size is under ``target_kb`` kilobytes.

    The function iteratively reduces JPEG quality (or PNG compression) until the
    size constraint is met or a lower bound on quality (30) is reached.
    """
    if not os.path.isfile(input_path):
        raise FileNotFoundError(f"Input image not found: {input_path}")
    img = Image.open(input_path)

    # Ensure output directory exists BEFORE writing (only if there is a dir component).
    out_dir = os.path.dirname(output_path)
    if out_dir:
        os.makedirs(out_dir, exist_ok=True)

    # Start with high quality, then lower if needed.
    quality = 95
    min_quality = 30
    while True:
        # Save to a BytesIO buffer to check size without touching disk.
        buffer = BytesIO()
        ext = os.path.splitext(input_path)[1].lower()
        if ext in {'.jpg', '.jpeg'}:
            img.save(buffer, format='JPEG', quality=quality, optimize=True)
        else:
            img.save(buffer, format='PNG', optimize=True)
        size_kb = len(buffer.getvalue()) / 1024
        if size_kb <= target_kb or quality <= min_quality:
            # Write final file.
            with open(output_path, 'wb') as out_f:
                out_f.write(buffer.getvalue())
            break
        # Decrease quality and try again.
        quality -= 5

def resize_image(input_path: str, output_path: str, max_width: int = 800, max_height: int = 800) -> None:
    """Resize an image to fit within ``max_width`` x ``max_height`` while keeping aspect ratio.

    The resized image is saved to ``output_path`` using the same format as the input.
    """
    if not os.path.isfile(input_path):
        raise FileNotFoundError(f"Input image not found: {input_path}")
    img = Image.open(input_path)
    img.thumbnail((max_width, max_height), Image.LANCZOS)
    # Ensure the output directory exists.
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    _save_image(img, output_path)

def process_upload(input_path: str, output_dir: str, target_kb: int = 200, max_dim: int = 800) -> Tuple[str, str]:
    """Full processing pipeline for an uploaded flower image.

    Returns a tuple ``(compressed_path, resized_path)`` pointing to the generated
    files inside ``output_dir``.
    """
    os.makedirs(output_dir, exist_ok=True)
    base_name = os.path.splitext(os.path.basename(input_path))[0]
    compressed_path = os.path.join(output_dir, f"{base_name}_compressed.jpg")
    resized_path = os.path.join(output_dir, f"{base_name}_resized.jpg")
    compress_image(input_path, compressed_path, target_kb=target_kb)
    resize_image(compressed_path, resized_path, max_width=max_dim, max_height=max_dim)
    return compressed_path, resized_path
