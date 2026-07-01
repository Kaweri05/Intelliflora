# 🌸 IntelliFlora — AI Botanical Companion

> **Identify any flower instantly with AI. Explore 107 species. Track your botanical journey.**

[![Python](https://img.shields.io/badge/Python-3.11+-blue?logo=python)](https://python.org)
[![Flask](https://img.shields.io/badge/Flask-2.3.3-lightgrey?logo=flask)](https://flask.palletsprojects.com)
[![Gemini](https://img.shields.io/badge/Google-Gemini%20Vision-orange?logo=google)](https://aistudio.google.com)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-black?logo=vercel)](https://vercel.com)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

---

## 🔗 Live Demo

> **[https://intelliflora.vercel.app](https://intelliflora.vercel.app)**

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [System Architecture](#diagram-1--system-architecture)
- [Prediction Pipeline](#diagram-2--prediction-pipeline)
- [Frontend Page Routing](#diagram-3--frontend-page-routing)
- [API Endpoints](#diagram-4--api-endpoint-map)
- [Database Structure](#diagram-5--flower-database-structure)
- [Deployment Pipeline](#diagram-6--deployment-pipeline)
- [User Guide Flowchart](#user-guide-flowchart)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [Tech Stack](#tech-stack)

---

## Overview

IntelliFlora is a full-stack AI web application that identifies flowers from uploaded photos using a 3-tier prediction engine: Google Gemini Vision API → Local TensorFlow CNN → Colour Heuristic Fallback. It also provides a 107-species botanical encyclopedia, a personal herbarium (saved flowers), analytics dashboard, and voice assistant.

---

## Features

| Feature | Description |
|---|---|
| 📸 **AI Identification** | Upload or capture any flower photo for instant AI classification |
| 🔬 **Gemini Vision** | Google Gemini 2.5 Flash multimodal API for accurate species detection |
| 📚 **Encyclopedia** | 107 flower species with care guides, toxicity, fun facts |
| 🌿 **My Herbarium** | Personal collection — save and revisit identified flowers |
| 📊 **Analytics** | Confidence history, scan count, prediction distribution charts |
| 🎙️ **Voice Assistant** | Web Speech API voice commands for hands-free navigation |
| 🎨 **6 Themes** | Garden Green, Dark Floral, Lavender Soft, Sunset Rose, Deep Forest, Minimal White |
| 🔥 **Grad-CAM** | Heatmap overlay showing which image regions influenced the prediction |
| 📱 **Mobile Ready** | Responsive layout with bottom navigation on small screens |

---

## Diagram 1 — System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER'S BROWSER                           │
│                                                                 │
│  ┌──────────┐  ┌──────────────┐  ┌────────────┐  ┌─────────┐  │
│  │  index   │  │   main.js    │  │  style.css │  │Chart.js │  │
│  │  .html   │  │ (JS logic)   │  │(stylesheet)│  │  (CDN)  │  │
│  └────┬─────┘  └──────┬───────┘  └────────────┘  └─────────┘  │
│       │               │                                         │
│       │         fetch() calls                                   │
└───────┼───────────────┼─────────────────────────────────────────┘
        │               │  HTTP / REST
        ▼               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FLASK BACKEND  (app.py)                       │
│                                                                 │
│  ┌────────────┐  ┌──────────────┐  ┌───────────────────────┐   │
│  │GET /       │  │POST /api/    │  │GET /api/library       │   │
│  │serves HTML │  │predict       │  │GET /api/stats         │   │
│  └────────────┘  └──────┬───────┘  │GET /api/flower-details│   │
│                         │          └───────────┬───────────┘   │
│                         ▼                      ▼               │
│                  ┌─────────────┐      ┌────────────────┐       │
│                  │ predictor   │      │  flower_data   │       │
│                  │    .py      │      │     .py        │       │
│                  └──────┬──────┘      └────────────────┘       │
│                         │                                       │
│                  ┌──────┴──────┐                                │
│                  │  gradcam.py │                                │
│                  └─────────────┘                                │
└─────────────────────────────────────────────────────────────────┘
        │
        ▼
┌───────────────────────┐    ┌──────────────────────────────────┐
│  Google Gemini API    │    │  Local flower_model.h5           │
│  (external — cloud)  │    │  (optional — TensorFlow/Keras)   │
└───────────────────────┘    └──────────────────────────────────┘
```

---

## Diagram 2 — Prediction Pipeline

```
                    ┌─────────────────────┐
                    │  User Uploads Image  │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  POST /api/predict  │
                    │  (Flask route)      │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Image pre-process   │
                    │ PIL → RGB → resize  │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │  TIER 1             │
                    │  gemini_predict()   │
                    │  Gemini 2.5 Flash   │
                    │  Vision API         │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │ GEMINI_API_KEY set? │
                    │  API reachable?     │
                    └──────┬──────┬───────┘
                        YES│      │NO / Error
                           │      ▼
                           │  ┌─────────────────────┐
                           │  │  TIER 2             │
                           │  │  real_predict()     │
                           │  │  Local TF CNN Model │
                           │  │  (flower_model.h5)  │
                           │  └──────┬──────┬───────┘
                           │      YES│      │File not found
                           │         │      ▼
                           │         │  ┌─────────────────────┐
                           │         │  │  TIER 3             │
                           │         │  │  mock_predict()     │
                           │         │  │  Colour heuristic   │
                           │         │  │  Center-crop + RGB  │
                           │         │  │  analysis (demo)    │
                           │         │  └──────────┬──────────┘
                           │         │             │
                    ┌──────▼─────────▼─────────────▼──────────┐
                    │         Prediction Result JSON           │
                    │  flower_name, confidence, top5,          │
                    │  scientific_name, care_tips, fun_facts   │
                    └──────────────────┬──────────────────────┘
                                       │
                    ┌──────────────────▼──────────────────────┐
                    │  get_flower_info()                       │
                    │  Enrich with FLOWER_DATABASE data        │
                    └──────────────────┬──────────────────────┘
                                       │
                    ┌──────────────────▼──────────────────────┐
                    │  get_gradcam()                           │
                    │  Generate attention heatmap overlay      │
                    └──────────────────┬──────────────────────┘
                                       │
                    ┌──────────────────▼──────────────────────┐
                    │  JSON Response → Browser → Result Page  │
                    └─────────────────────────────────────────┘
```

---

## Diagram 3 — Frontend Page Routing

```
┌─────────────────────────────────────────────────────────────────┐
│                    index.html  (Single Page)                    │
│                                                                 │
│   SIDEBAR NAV (desktop)          BOTTOM NAV (mobile)            │
│   ┌──────────┐                   ┌───────────────────────────┐  │
│   │ 🏠 Home  │                   │ 🏠 │ 📚 │ 🌿 │ 📊        │  │
│   │ 📚 Encyc │                   └───────────────────────────┘  │
│   │ 🌿 Herb  │                                                  │
│   │ 📊 Stats │   data-target-page attribute triggers            │
│   └──────────┘   navigateToPage() in main.js                   │
│                                                                 │
│  navigateToPage(pageId)                                         │
│       │                                                         │
│       ├── removes .active from ALL .page-view divs             │
│       ├── adds .active to #page-{pageId}                       │
│       └── triggers page-specific data loader                   │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  #page-home          (default .active on load)           │  │
│  │  Upload card, Camera, Theme picker, Recent history       │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │  #page-result        (shown after prediction completes)  │  │
│  │  Flower name, confidence bar, Grad-CAM, top-5, care tips │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │  #page-encyclopedia  (loads /api/library on navigate)    │  │
│  │  Search bar, 107 flower cards grid                       │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │  #page-favorites     (reads localStorage bookmarks)      │  │
│  │  Saved / bookmarked flower cards                         │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │  #page-analytics     (loads /api/stats on navigate)      │  │
│  │  Scan count, avg confidence, Chart.js graphs             │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Diagram 4 — API Endpoint Map

```
┌────────────────────────────────────────────────────────────────┐
│                    IntelliFlora REST API                       │
├──────────┬─────────────────────────────┬──────────────────────┤
│ Method   │ Endpoint                    │ Returns              │
├──────────┼─────────────────────────────┼──────────────────────┤
│ GET      │ /                           │ index.html           │
│          │                             │ (Jinja2 template)    │
├──────────┼─────────────────────────────┼──────────────────────┤
│ POST     │ /api/predict                │ Prediction JSON      │
│          │ body: multipart/form-data   │ {                    │
│          │ field: file (image)         │   flower_name,       │
│          │                             │   confidence,        │
│          │                             │   top5[],            │
│          │                             │   scientific_name,   │
│          │                             │   care_tips[],       │
│          │                             │   fun_facts[],       │
│          │                             │   gradcam_image,     │
│          │                             │   processing_time,   │
│          │                             │   model,             │
│          │                             │   is_mock            │
│          │                             │ }                    │
├──────────┼─────────────────────────────┼──────────────────────┤
│ GET      │ /api/library?q=             │ FLOWER_DATABASE      │
│          │ ?q= (optional search query) │ filtered JSON dict   │
│          │ searches: name, scientific, │ (107 entries max)    │
│          │ family, origin              │                      │
├──────────┼─────────────────────────────┼──────────────────────┤
│ GET      │ /api/stats                  │ Session statistics   │
│          │                             │ {                    │
│          │                             │   total_predictions, │
│          │                             │   avg_confidence,    │
│          │                             │   confidence_history,│
│          │                             │   top_flower_predicted│
│          │                             │ }                    │
├──────────┼─────────────────────────────┼──────────────────────┤
│ GET      │ /api/flower-details/<name>  │ Single flower detail │
│          │ e.g. /api/flower-details/   │ JSON (full database  │
│          │      Rose                   │ entry + related      │
│          │                             │ species)             │
└──────────┴─────────────────────────────┴──────────────────────┘
```

---

## Diagram 5 — Flower Database Structure

```
FLOWER_DATABASE  (flower_data.py)
│
│  107 entries — keyed by lowercase flower name
│  e.g. FLOWER_DATABASE["rose"], FLOWER_DATABASE["sunflower"]
│
├── 12 Hand-crafted entries (full detail)
│   rose, sunflower, tulip, daisy, dandelion,
│   orchid, lavender, lotus, iris, cherry blossom,
│   hibiscus, marigold
│   │
│   └── Each entry contains:
│       ├── common_name        "Rose"
│       ├── scientific_name    "Rosa rubiginosa"
│       ├── family             "Rosaceae"
│       ├── bloom_season       "Late Spring – Fall"
│       ├── origin             "Asia, Europe, North America"
│       ├── description        editorial paragraph
│       ├── rarity             "Common / Uncommon / Rare"
│       ├── toxicity           "Non-toxic to pets"
│       ├── color              "#FF6B9D"  (hex for UI badge)
│       ├── emoji              "🌹"
│       ├── uses[]             ["Ornamental", "Perfumery", ...]
│       ├── care_tips[]        ["Full sun", "Water 2-3x/week", ...]
│       ├── care_guide{}       sunlight, watering, fertilizer,
│       │                      pruning, diseases, pests
│       ├── fun_facts[]        ["5,000 years cultivated", ...]
│       └── related_flowers[]  ["Wild Rose", "Cherry Blossom", ...]
│
└── 95 Auto-generated entries (Oxford 102 remaining classes)
    Generated from scientific_names{} + families{} lookups
    Same schema as above, with templated descriptions
    │
    └── get_flower_info(name) lookup function
        ├── Step 1: exact key match
        ├── Step 2: common_name field match
        ├── Step 3: substring fuzzy match (shortest wins)
        └── Step 4: DEFAULT_FLOWER_INFO fallback
```

---

## Diagram 6 — Deployment Pipeline

```
  LOCAL DEVELOPMENT               CLOUD DEPLOYMENT (Vercel)
  ─────────────────               ────────────────────────────
                                  
  $ python app.py                 Push to GitHub
        │                               │
        │                               ▼
        │                    Vercel auto-detects vercel.json
        │                               │
        ▼                               ▼
  Flask dev server            @vercel/python builder runs
  host: 0.0.0.0                         │
  port: 5000                            ▼
        │                    pip install -r requirements.txt
        │                    (Flask, Pillow, numpy,
        │                     google-generativeai)
        ▼                               │
  http://127.0.0.1:5000                 ▼
  http://<local-ip>:5000     Serverless function wraps app.py
  (mobile on same WiFi)                 │
                                        ▼
                             https://intelliflora.vercel.app
                                        │
                             ┌──────────▼──────────┐
                             │ Environment Vars     │
                             │ GEMINI_API_KEY = ... │
                             │ (set in Vercel dash) │
                             └─────────────────────┘

  ─────────────────────────────────────────────────────────────
  NOT deployed (too large / incompatible):
  ✗ tensorflow (500MB, needs Python ≤3.11)
  ✗ flower_model.h5 (13MB model file)
  → These only run locally. Cloud always uses Gemini API.
  ─────────────────────────────────────────────────────────────
```

---

## User Guide Flowchart

```
                        ┌─────────────────────┐
                        │  Open IntelliFlora  │
                        │  in your browser    │
                        └──────────┬──────────┘
                                   │
                                   ▼
                        ┌─────────────────────┐
                        │   HOME PAGE loads   │
                        │   Upload card shown │
                        └──────────┬──────────┘
                                   │
                        ┌──────────▼──────────┐
                        │  How do you want    │
                        │  to add a flower?   │
                        └──┬───────────────┬──┘
                           │               │
                  ┌────────▼──────┐ ┌──────▼────────────┐
                  │ Upload Photo  │ │  Use Live Camera  │
                  │ (drag & drop  │ │  (click "Enable   │
                  │  or browse)   │ │   System Lens")   │
                  └────────┬──────┘ └──────┬────────────┘
                           │               │
                           └───────┬───────┘
                                   │
                                   ▼
                        ┌─────────────────────┐
                        │  Image preview      │
                        │  appears on screen  │
                        └──────────┬──────────┘
                                   │
                                   ▼
                        ┌─────────────────────┐
                        │ Click              │
                        │ "Identify Flower"  │
                        │ button             │
                        └──────────┬──────────┘
                                   │
                                   ▼
                        ┌─────────────────────┐
                        │  AI analyses image  │
                        │  (spinner shown)    │
                        └──────────┬──────────┘
                                   │
                        ┌──────────▼──────────┐
                        │  Result page opens  │
                        │  automatically      │
                        └──────────┬──────────┘
                                   │
               ┌───────────────────┼────────────────────┐
               │                   │                    │
               ▼                   ▼                    ▼
   ┌───────────────────┐ ┌──────────────────┐ ┌────────────────────┐
   │  View flower name │ │  See confidence  │ │  Read care guide,  │
   │  + Grad-CAM       │ │  score + top-5   │ │  fun facts,        │
   │  heatmap          │ │  predictions     │ │  toxicity info     │
   └─────────┬─────────┘ └──────────────────┘ └─────────┬──────────┘
             │                                           │
             └─────────────────┬─────────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │  What next?         │
                    └──┬──────┬───────┬───┘
                       │      │       │
              ┌────────▼─┐ ┌──▼────┐ ┌▼──────────────────┐
              │ Save to  │ │ Scan  │ │ Explore more info  │
              │Herbarium │ │another│ │ in Encyclopedia    │
              │(bookmark)│ │flower │ │ (sidebar nav)      │
              └────┬─────┘ └──┬────┘ └───────┬────────────┘
                   │          │               │
                   ▼          ▼               ▼
         ┌──────────────┐  ┌──────┐  ┌──────────────────────┐
         │ My Herbarium │  │ Home │  │ Encyclopedia page    │
         │ page shows   │  │ page │  │ Search by name,      │
         │ all saved    │  │      │  │ family, or origin    │
         │ flowers      │  │      │  │ Click any card for   │
         └──────────────┘  └──────┘  │ full details         │
                                     └──────────────────────┘

  ──────────────────────────────────────────────────────────────────
  VOICE ASSISTANT  (click the 🎙️ button, bottom-left)
  ──────────────────────────────────────────────────────────────────
  Say:  "Go to encyclopedia"   →  opens Encyclopedia page
        "Go to herbarium"      →  opens My Herbarium
        "Go to analytics"      →  opens Analytics page
        "Go home"              →  returns to Home page
        "Identify flower"      →  triggers upload prompt
  ──────────────────────────────────────────────────────────────────
  TIPS
  ──────────────────────────────────────────────────────────────────
  • Use clear, well-lit photos for best accuracy
  • Centre the flower in the frame
  • Works on mobile at http://<your-PC-IP>:5000 (same WiFi)
  • Set GEMINI_API_KEY for AI-powered results (vs. demo mode)
  • Check Analytics page to track your identification history
  ──────────────────────────────────────────────────────────────────
```

---

## Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/intelliflora.git
cd intelliflora

# 2. Create and activate virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
source venv/bin/activate     # Mac / Linux

# 3. Install dependencies
pip install -r requirements.txt

# 4. Set Gemini API key (optional but recommended)
set GEMINI_API_KEY=your_key_here        # Windows CMD
$env:GEMINI_API_KEY="your_key_here"    # Windows PowerShell
export GEMINI_API_KEY=your_key_here    # Mac / Linux

# 5. Run the app
python app.py

# 6. Open in browser
# Desktop: http://127.0.0.1:5000
# Mobile (same WiFi): http://172.19.x.x:5000  (see terminal output)
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | Recommended | Google Gemini Vision API key. Get free at [aistudio.google.com](https://aistudio.google.com) |

Without `GEMINI_API_KEY`, the app runs in demo mode using a colour-heuristic predictor (5 flower classes only: Rose, Sunflower, Tulip, Daisy, Dandelion).

---

## Project Structure

```
intelliflora/
├── app.py                 # Flask backend + API routes
├── predictor.py           # 3-tier prediction engine
├── flower_data.py         # 107-species database + lookup
├── gradcam.py             # Grad-CAM heatmap generation
├── session_state.py       # In-memory session statistics
├── requirements.txt       # Python dependencies
├── vercel.json            # Vercel deployment config
├── templates/
│   └── index.html         # Single-page app HTML
└── static/
    ├── main.js            # Frontend JavaScript
    ├── style.css          # Main stylesheet
    └── responsive.css     # Mobile breakpoints
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | Python 3.11, Flask 2.3.3 |
| **AI — Primary** | Google Gemini 2.5 Flash (Vision API) |
| **AI — Secondary** | TensorFlow/Keras + EfficientNetB0 (local) |
| **Image Processing** | Pillow, NumPy |
| **Frontend** | Vanilla JavaScript (ES6+) |
| **Charts** | Chart.js (CDN) |
| **Fonts** | Lora + Outfit (Google Fonts) |
| **Voice** | Web Speech API (browser native) |
| **Deployment** | Vercel (serverless Python) |
| **Version Control** | Git + GitHub |

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m 'Add some feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License.

---

<p align="center">Made with 🌸 by the IntelliFlora Team</p>
