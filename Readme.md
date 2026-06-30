# 🌸 IntelliFlora

> **AI-Powered Botanical Recognition & Saliency Diagnosis System**

IntelliFlora is an advanced, high-performance web application designed to identify flower species using Convolutional Neural Networks (CNNs). It combines real-time image classification with neural network interpretability (Grad-CAM saliency maps), statistical telemetry, and botanical care guides to create a comprehensive digital botanical assistant.

---

## 🌟 Key Features

- **🧠 Convolutional Classifier**: Processes user-uploaded photos or live camera captures to classify flower species.
- **👁️ Grad-CAM Visualizer**: Projects heatmaps directly onto input images, highlighting exactly which structural patterns (petals, colors, shapes) the model weighed most heavily during inference.
- **📊 Real-time Analytics**: Keeps track of local session metrics, average prediction confidence, and logs a historical audit of previous runs.
- **🌿 Botanical Profiles**: Pulls scientific details, toxicity profiles, bloom seasons, geographic origins, care guides, and fun facts from an integrated database.
- **📚 Interactive Encyclopedia**: Allows users to search and browse plant guidelines, care directives, and facts even without submitting images.
- **🔌 Offline Fallback**: Features a color-biased heuristic mock predictor that activates automatically if the local TensorFlow models fail to load.

---

## 🛠️ Tech Stack

- **Backend API Server**: [Flask](https://flask.palletsprojects.com/) (Python-based REST API engine)
- **Frontend Layout**: Vanilla HTML5 & CSS3 Custom Design System (Glassmorphic dark theme)
- **Logic & Control Layer**: Vanilla ES6 JavaScript (handling async API communication, media capture, and slider math)
- **Neural Network Engine**: [TensorFlow](https://www.tensorflow.org/) & Keras
- **Interpretability Model**: Grad-CAM (Gradient-weighted Class Activation Mapping)
- **Data & Image Preprocessing**: NumPy, Pillow, Scikit-learn

---

## 📁 Repository Structure

```tree
Intelliflora/
├── app.py                # Main Flask API and static web server
├── predictor.py          # Model wrapper, preprocessing, and demo fallback modes
├── gradcam.py            # Real & synthetic Grad-CAM heatmap overlay pipeline
├── flower_data.py        # Species care metrics, scientific profiles, and lists
├── session_state.py      # In-memory session stats logger and database cache
├── Flower_Recog.py       # ML Model training pipeline (EfficientNetB0 transfer learning)
├── flower_model.h5       # Trained neural network weights file (~20 MB)
├── templates/
│   └── index.html        # Glassmorphic dashboard structure
└── static/
    ├── style.css         # Custom stylesheet (buttons, layouts, sliders, badges)
    └── main.js           # Interactive script (drag-drop, camera API, slider comparator)
```

---

## 🚀 Getting Started

### 📋 Prerequisites

Ensure you have a Python environment installed (version `3.9` through `3.11` is recommended). Install the required packages via `pip` (including `google-generativeai` for Gemini Vision):

```bash
pip install flask tensorflow numpy pillow scikit-learn google-generativeai matplotlib seaborn
```

### 🔑 AI Vision Configuration (Optional)

To enable the **Gemini 3 Flash Multimodal Vision** model (which can identify any wild flower species beyond the catalog), set your Google GenAI API key as an environment variable before launching the server:

**Windows PowerShell:**
```powershell
$env:GEMINI_API_KEY="your-api-key-here"
```

**Windows CMD:**
```cmd
set GEMINI_API_KEY=your-api-key-here
```

*Note: If no API key is provided, the application will automatically fall back to the local TensorFlow model or 5-class mock heuristic engine.*

### 🏃 Running the Application

Launch the local Flask application server by running:

```bash
python app.py
```

The server will start locally, typically at `http://localhost:5000` (or `http://127.0.0.1:5000`). Open your browser and navigate to this URL to explore the dashboard.


---

## 🔬 Deep Learning Architecture

The model is trained using **Transfer Learning** on top of **EfficientNetB0** (pretrained on ImageNet), utilizing a custom classification head:

- **Base Layer**: EfficientNetB0 (frozen feature extractor)
- **Pooling Layer**: Global Average Pooling 2D
- **Dense Layer**: 256 Nodes (ReLU activation, with 50% Dropout for regularization)
- **Output Layer**: 5 Nodes (Softmax activation mapping to `daisy`, `dandelion`, `rose`, `sunflower`, `tulip`)

The pipeline can be retrained or customized by editing `Flower_Recog.py` and running it directly to export a new `flower_model.h5` file.

---

## 📄 License & Attributions

Developed using TensorFlow and Streamlit.
- Botanical data sourced from botanical classification references.
- CNN model architectures initialized using Google's Keras applications.
