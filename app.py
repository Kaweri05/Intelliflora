import os
import io
import base64
import numpy as np
from PIL import Image
from flask import Flask, render_template, request, jsonify

# Local modules
import session_state
import predictor
import gradcam
from flower_data import get_flower_info, FLOWER_DATABASE

# Initialize Flask App
app = Flask(
    __name__,
    template_folder=os.path.join(os.path.dirname(__file__), "templates"),
    static_folder=os.path.join(os.path.dirname(__file__), "static")
)

# Core Model reference cache
_model = None

def get_loaded_model():
    """Retrieve model, loading it if not cached."""
    global _model
    if _model is None:
        _model = predictor.load_model()
    return _model


# ─── Botanical Datasets For Redesign ──────────────────────────────────────────

STANDARD_NAME_MAP = {
    "sunflowers": "Sunflower",
    "sunflower": "Sunflower",
    "common sunflower": "Sunflower",
    "roses": "Rose",
    "rose": "Rose",
    "tulips": "Tulip",
    "tulip": "Tulip",
    "daisies": "Daisy",
    "daisy": "Daisy",
    "dandelions": "Dandelion",
    "dandelion": "Dandelion"
}

RELATED_SPECIES_DATABASE = {
    "sunflower": [
        {"name": "Jerusalem Artichoke", "scientific_name": "Helianthus tuberosus", "similarity": 85},
        {"name": "Black-eyed Susan", "scientific_name": "Rudbeckia hirta", "similarity": 80},
        {"name": "Common Daisy", "scientific_name": "Bellis perennis", "similarity": 62}
    ],
    "rose": [
        {"name": "Wild Rose", "scientific_name": "Rosa acicularis", "similarity": 90},
        {"name": "Beach Rose", "scientific_name": "Rosa rugosa", "similarity": 85},
        {"name": "Miniature Rose", "scientific_name": "Rosa chinensis", "similarity": 88}
    ],
    "tulip": [
        {"name": "Garden Tulip", "scientific_name": "Tulipa gesneriana", "similarity": 95},
        {"name": "Wild Tulip", "scientific_name": "Tulipa sylvestris", "similarity": 88},
        {"name": "Lady Tulip", "scientific_name": "Tulipa clusiana", "similarity": 84}
    ],
    "daisy": [
        {"name": "Oxeye Daisy", "scientific_name": "Leucanthemum vulgare", "similarity": 92},
        {"name": "Shasta Daisy", "scientific_name": "Leucanthemum x superbum", "similarity": 89},
        {"name": "Barberton Daisy", "scientific_name": "Gerbera jamesonii", "similarity": 76}
    ],
    "dandelion": [
        {"name": "Red-seeded Dandelion", "scientific_name": "Taraxacum erythrospermum", "similarity": 88},
        {"name": "Hawkbit", "scientific_name": "Leontodon autumnalis", "similarity": 74},
        {"name": "Catsear", "scientific_name": "Hypochaeris radicata", "similarity": 70}
    ]
}

RELATED_IMAGES_DATABASE = {
    "sunflower": [
        "https://images.unsplash.com/photo-1597848212624-a19eb35e2651?w=500&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1470240731273-7821a6eeb6bd?w=500&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1541256996761-85df2eff3139?w=500&auto=format&fit=crop"
    ],
    "rose": [
        "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1496062031456-07b8f162a322?w=500&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1533604131587-35665891eed0?w=500&auto=format&fit=crop"
    ],
    "tulip": [
        "https://images.unsplash.com/photo-1520763185298-1b434c919102?w=500&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1550958252-07c5e393537c?w=500&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1495908381849-45c1f2e2a3cf?w=500&auto=format&fit=crop"
    ],
    "daisy": [
        "https://images.unsplash.com/photo-1560717789-0ac7c58ac90a?w=500&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=500&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1508780709619-79562169bc51?w=500&auto=format&fit=crop"
    ],
    "dandelion": [
        "https://images.unsplash.com/photo-1500627869374-13cd993b1115?w=500&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1473448912268-2022ce9509d8?w=500&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=500&auto=format&fit=crop"
    ]
}


# ─── Helper Functions ─────────────────────────────────────────────────────────

def format_botanical_info(result):
    """
    Produce a structured botanical profile.
    If the prediction resulted from Gemini, it will contain full LLM fields.
    Otherwise, we populate from our local catalog databases and format care guides.
    """
    raw_name = result["flower_name"].lower().strip()
    standardized_name = STANDARD_NAME_MAP.get(raw_name, result["flower_name"])
    flower_key = standardized_name.lower().strip()
    
    base = get_flower_info(standardized_name)
    db_common_name = base.get("common_name", standardized_name.title())

    # 1. Check if Gemini already output custom botanical specs in the result
    if "family" in result and "care_tips" in result:
        tips = result.get("care_tips", [])
        guide = {
            "sunlight": tips[0] if len(tips) > 0 else "Sunlight requirements vary.",
            "watering": tips[1] if len(tips) > 1 else "Water when soil dries out.",
            "pruning": tips[2] if len(tips) > 2 else "Prune to extend blooming.",
            "fertilizer": tips[3] if len(tips) > 3 else "Fertilize during grow seasons.",
            "pests": tips[4] if len(tips) > 4 else "Watch for common garden pests.",
            "diseases": "Watch for powdery mildew or black leaf spots."
        }
        return {
            "common_name": db_common_name,
            "description": result.get("description", base.get("description", "A beautiful flowering plant species characterized by unique structural shapes and colors.")),
            "scientific_name": result.get("scientific_name", base.get("scientific_name", "N/A")),
            "family": result.get("family", base.get("family", "N/A")),
            "origin": result.get("origin", base.get("origin", "N/A")),
            "bloom_season": result.get("bloom_season", base.get("bloom_season", "N/A")),
            "rarity": result.get("rarity", base.get("rarity", "Common")),
            "toxicity": result.get("toxicity", base.get("toxicity", "Unknown")),
            "uses": result.get("uses", base.get("uses", [])),
            "fun_facts": result.get("fun_facts", base.get("fun_facts", [])),
            "habitat": base.get("habitat", "Fields, open meadows, and wild gardens"),
            "native_region": base.get("native_region", result.get("origin", "N/A")),
            "care_guide": guide,
            "color": base.get("color", "#10b981"),
            "emoji": base.get("emoji", "🌸"),
            "related_species": base.get("related_species", RELATED_SPECIES_DATABASE.get(flower_key, [])),
            "related_images": base.get("related_images", RELATED_IMAGES_DATABASE.get(flower_key, []))
        }
        
    # 2. Otherwise load from local flower_data.py
    if "care_guide" in base and isinstance(base["care_guide"], dict):
        guide = base["care_guide"]
    else:
        tips = base.get("care_tips", [])
        guide = {
            "sunlight": tips[0] if len(tips) > 0 else "Full sun to partial shade.",
            "watering": tips[1] if len(tips) > 1 else "Water regularly when top soil is dry.",
            "pruning": tips[2] if len(tips) > 2 else "Deadhead old blooms.",
            "fertilizer": tips[3] if len(tips) > 3 else "Feed monthly with liquid fertilizer.",
            "pests": tips[4] if len(tips) > 4 else "Watch for aphids and powdery mildew.",
            "diseases": "Susceptible to root rot in poorly drained soil."
        }
    
    return {
        "common_name": db_common_name,
        "description": base.get("description", "A beautiful flowering plant species characterized by unique structural shapes and colors."),
        "scientific_name": base.get("scientific_name", "N/A"),
        "family": base.get("family", "N/A"),
        "origin": base.get("origin", "N/A"),
        "bloom_season": base.get("bloom_season", "N/A"),
        "rarity": base.get("rarity", "Common"),
        "toxicity": base.get("toxicity", "Non-toxic"),
        "uses": base.get("uses", []),
        "fun_facts": base.get("fun_facts", []),
        "habitat": base.get("habitat", "Open fields, gardens, and botanical reserves"),
        "native_region": base.get("native_region", base.get("origin", "N/A")),
        "care_guide": guide,
        "color": base.get("color", "#10b981"),
        "emoji": base.get("emoji", "🌸"),
        "related_species": base.get("related_species", RELATED_SPECIES_DATABASE.get(flower_key, [])),
        "related_images": base.get("related_images", RELATED_IMAGES_DATABASE.get(flower_key, []))
    }


# ─── Page Routes ─────────────────────────────────────────────────────────────

@app.route("/")
def index():
    """Serve the main dashboard UI page."""
    return render_template("index.html")


# ─── API Endpoints ───────────────────────────────────────────────────────────

@app.route("/api/library", methods=["GET"])
def get_library():
    """Return filtered flower database dynamically based on query parameter."""
    query = request.args.get("q", "").lower().strip()
    if not query:
        return jsonify(FLOWER_DATABASE)
        
    filtered = {}
    for name, data in FLOWER_DATABASE.items():
        scientific = data.get("scientific_name", "").lower()
        family = data.get("family", "").lower()
        origin = data.get("origin", "").lower()
        if query in name or query in scientific or query in family or query in origin:
            filtered[name] = data
            
    return jsonify(filtered)


@app.route("/api/stats", methods=["GET"])
def get_stats():
    """Return the active session statistics."""
    return jsonify(session_state.get_state())


@app.route("/api/flower-details/<name>", methods=["GET"])
def get_flower_details(name):
    """Return complete result payload for a manually selected flower name."""
    try:
        name_key = name.lower().strip()
        standardized_name = STANDARD_NAME_MAP.get(name_key, name.title())
        base = get_flower_info(standardized_name)
        
        result = {
            "flower_name": base.get("common_name", standardized_name),
            "confidence": 100.0,
            "top5": [[base.get("common_name", standardized_name), 100.0]],
            "processing_time": 0,
            "model": "Manual Selection",
            "is_mock": False
        }
        
        botanical_info = format_botanical_info(result)
        
        # Assemble standard response payload
        response = {
            "prediction": result,
            "images": {
                "original": "data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 100\" width=\"100\" height=\"100\"><rect width=\"100\" height=\"100\" fill=\"%23f4efe6\"/><text x=\"50\" y=\"55\" font-size=\"25\" text-anchor=\"middle\">" + botanical_info.get("emoji", "🌸") + "</text></svg>",
                "gradcam": "data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 100\" width=\"100\" height=\"100\"><rect width=\"100\" height=\"100\" fill=\"%23f4efe6\"/><text x=\"50\" y=\"55\" font-size=\"25\" text-anchor=\"middle\">👁️</text></svg>"
            },
            "botanical": botanical_info,
            "session_stats": session_state.get_state()
        }
        
        # If the flower entry has curated images, use the first one
        if botanical_info.get("related_images") and len(botanical_info["related_images"]) > 0:
            response["images"]["original"] = botanical_info["related_images"][0]
            response["images"]["gradcam"] = botanical_info["related_images"][0]
            
        return jsonify(response)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/predict", methods=["POST"])
def run_prediction():
    """
    Accept image file or base64 string, process classification,
    generate Grad-CAM visualizer overlays, and return response payload.
    """
    try:
        image = None
        
        # 1. Parse Image input (supports form uploads or base64 JSON bodies)
        if request.is_json:
            json_data = request.get_json()
            image_data_url = json_data.get("image", "")
            if "," in image_data_url:
                header, base64_data = image_data_url.split(",", 1)
            else:
                base64_data = image_data_url
            
            image_bytes = base64.b64decode(base64_data)
            image = Image.open(io.BytesIO(image_bytes))
        else:
            if "image" not in request.files:
                return jsonify({"error": "No image file provided in request."}), 400
            file = request.files["image"]
            image_bytes = file.read()
            image = Image.open(io.BytesIO(image_bytes))

        if image is None:
            return jsonify({"error": "Failed to decode image data."}), 400

        # Convert image to RGB (handles transparency in PNGs)
        image = image.convert("RGB")

        # 2. Run Classification Pipeline
        result = predictor.predict(image)
        
        # Standardize prediction name output
        raw_name = result["flower_name"].lower().strip()
        standardized_name = STANDARD_NAME_MAP.get(raw_name, result["flower_name"].title())
        result["flower_name"] = standardized_name

        # 3. Generate Grad-CAM Attention Map Overlay
        model = get_loaded_model()
        gradcam_img = gradcam.get_gradcam(image, model)

        # 4. Convert images to base64 strings to pass inside JSON
        original_b64 = gradcam.image_to_base64(image)
        gradcam_b64 = gradcam.image_to_base64(gradcam_img)

        # 5. Extract Botanical Metadata & care guide details
        botanical_info = format_botanical_info(result)

        # 6. Add results to session logs
        session_state.add_to_history(result)

        # Assemble full API response payload
        common_name = botanical_info.get("common_name", standardized_name)
        
        mapped_top5 = []
        for name_val, conf_val in result["top5"]:
            standardized_top5_name = STANDARD_NAME_MAP.get(name_val.lower().strip(), name_val.title())
            top5_info = get_flower_info(standardized_top5_name)
            mapped_top5.append([top5_info.get("common_name", standardized_top5_name), conf_val])
            
        response = {
            "prediction": {
                "flower_name": common_name,
                "confidence": result["confidence"],
                "top5": mapped_top5,
                "processing_time": result.get("processing_time", 0),
                "model": result.get("model", "CNN Engine"),
                "is_mock": result.get("is_mock", False),
            },
            "images": {
                "original": f"data:image/png;base64,{original_b64}",
                "gradcam": f"data:image/png;base64,{gradcam_b64}",
            },
            "botanical": botanical_info,
            "session_stats": session_state.get_state()
        }

        return jsonify(response)

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Internal pipeline error: {str(e)}"}), 500


@app.route("/health", methods=["GET"])
def health():
    """Simple health check endpoint for debugging"""
    return jsonify({"status": "ok"})
    def health():
        """Simple health check endpoint for debugging"""
        return jsonify({"status": "ok"})

    # ─── Server Launcher ─────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("--------------------------------------------------")
    print("IntelliFlora Backend Server Initialized.")
    print("Visit http://localhost:5000 in your browser.")
    print("--------------------------------------------------")
    app.run(host="0.0.0.0", port=5000, debug=False, use_reloader=False)
