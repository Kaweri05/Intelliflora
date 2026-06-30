"""In-memory session state management for Flask backend."""

_STATE = {
    "prediction_history": [],
    "total_predictions": 0,
    "avg_confidence": 0.0,
    "confidence_history": [],
    "top_flower_predicted": None,
}


def get_state() -> dict:
    """Return current session statistics and logs."""
    return _STATE


def add_to_history(result: dict):
    """Add prediction result to local history cache (max 10)."""
    global _STATE
    
    # Insert new prediction at start of list
    history = _STATE["prediction_history"]
    history.insert(0, result)
    _STATE["prediction_history"] = history[:10]

    # Update counts
    _STATE["total_predictions"] += 1
    
    # Calculate confidence values
    confidences = _STATE["confidence_history"]
    confidences.append(result["confidence"])
    _STATE["confidence_history"] = confidences[-20:]  # Limit memory to last 20 runs
    
    _STATE["avg_confidence"] = round(
        sum(confidences) / len(confidences), 1
    )
    
    # Record top predicted flower
    _STATE["top_flower_predicted"] = _STATE["prediction_history"][0]["flower_name"]