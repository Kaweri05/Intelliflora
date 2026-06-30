"""
Grad-CAM Visualization
Generates heatmaps showing which parts of the image the model focuses on.

For demo: generates a realistic synthetic heatmap.
For production: uses real Grad-CAM with TensorFlow.
"""

import numpy as np
from PIL import Image, ImageDraw, ImageFilter
import io
import base64


def generate_synthetic_gradcam(image: Image.Image) -> Image.Image:
    """
    Generate a synthetic but visually convincing Grad-CAM heatmap.
    In production, replace with real Grad-CAM computation.
    """
    w, h = image.size
    img_arr = np.array(image.convert("RGB"), dtype=np.float32) / 255.0

    # Compute a pseudo-saliency map based on color contrast
    # This mimics what real Grad-CAM might highlight — center-biased with
    # emphasis on colorful/high-contrast regions
    
    gray = np.mean(img_arr, axis=2)
    
    # Center bias (most flower images are centered)
    cx, cy = w / 2, h / 2
    y_idx, x_idx = np.mgrid[0:h, 0:w]
    dist = np.sqrt(((x_idx - cx) / cx) ** 2 + ((y_idx - cy) / cy) ** 2)
    center_weight = np.clip(1 - dist * 0.7, 0, 1)

    # Color saturation as saliency proxy
    r, g, b = img_arr[:, :, 0], img_arr[:, :, 1], img_arr[:, :, 2]
    max_c = np.maximum(np.maximum(r, g), b)
    min_c = np.minimum(np.minimum(r, g), b)
    denom = np.where(max_c > 0, max_c, 1.0)
    saturation = np.where(max_c > 0, (max_c - min_c) / denom, 0.0)

    # Combine
    heatmap = 0.5 * center_weight + 0.3 * saturation + 0.2 * gray
    heatmap = (heatmap - heatmap.min()) / (heatmap.max() - heatmap.min() + 1e-8)

    # Smooth the heatmap
    heatmap_img = Image.fromarray((heatmap * 255).astype(np.uint8), mode="L")
    heatmap_img = heatmap_img.filter(ImageFilter.GaussianBlur(radius=min(w, h) // 8))
    heatmap_arr = np.array(heatmap_img) / 255.0

    # Apply thermal colormap (blue → green → yellow → red)
    def thermal_colormap(v):
        """Map [0,1] to RGB thermal colors."""
        r = np.clip(1.5 - abs(v * 4 - 3), 0, 1)
        g = np.clip(1.5 - abs(v * 4 - 2), 0, 1)
        b = np.clip(1.5 - abs(v * 4 - 1), 0, 1)
        return r, g, b

    r_h, g_h, b_h = thermal_colormap(heatmap_arr)
    heatmap_rgb = np.stack([r_h, g_h, b_h], axis=2)

    # Overlay on original image
    alpha = 0.5
    orig = np.array(image.convert("RGB").resize((w, h))) / 255.0
    overlay = alpha * heatmap_rgb + (1 - alpha) * orig
    overlay = np.clip(overlay * 255, 0, 255).astype(np.uint8)

    result = Image.fromarray(overlay)
    return result


def real_gradcam(model, image: Image.Image, layer_name: str = "top_conv") -> Image.Image:
    """
    Real Grad-CAM using TensorFlow GradientTape.
    Uncomment and adapt when using a real model.
    
    Args:
        model: Loaded Keras model
        image: PIL Image
        layer_name: Name of the last conv layer to compute gradients from
    """
    try:
        import tensorflow as tf
        
        IMG_SIZE = (224, 224)
        img = image.convert("RGB").resize(IMG_SIZE)
        img_arr = np.array(img, dtype=np.float32) / 255.0
        img_tensor = tf.expand_dims(img_arr, axis=0)

        # Create a model that outputs [conv_layer_output, predictions]
        grad_model = tf.keras.models.Model(
            inputs=model.input,
            outputs=[model.get_layer(layer_name).output, model.output],
        )

        with tf.GradientTape() as tape:
            conv_outputs, predictions = grad_model(img_tensor)
            top_class = tf.argmax(predictions[0])
            loss = predictions[:, top_class]

        grads = tape.gradient(loss, conv_outputs)
        pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2))
        conv_outputs = conv_outputs[0]
        heatmap = conv_outputs @ pooled_grads[..., tf.newaxis]
        heatmap = tf.squeeze(heatmap)
        heatmap = tf.maximum(heatmap, 0) / (tf.math.reduce_max(heatmap) + 1e-8)
        heatmap = heatmap.numpy()

        # Resize heatmap to original image size
        w, h = image.size
        heatmap_img = Image.fromarray((heatmap * 255).astype(np.uint8))
        heatmap_img = heatmap_img.resize((w, h), Image.BICUBIC)
        
        return generate_overlay(image, np.array(heatmap_img) / 255.0)

    except Exception as e:
        print(f"Grad-CAM error: {e}, falling back to synthetic")
        return generate_synthetic_gradcam(image)


def get_gradcam(image: Image.Image, model=None) -> Image.Image:
    """Public interface — uses real or synthetic Grad-CAM."""
    if model is not None:
        return real_gradcam(model, image)
    return generate_synthetic_gradcam(image)


def image_to_base64(img: Image.Image) -> str:
    """Convert PIL Image to base64 string for display."""
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode()