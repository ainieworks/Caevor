from flask import Flask, jsonify, request
from datetime import date, datetime

app = Flask(__name__)
@app.route("/")
def index():
    return "DeepFocus+ backend is running"

@app.post("/api/priority")
def priority():
    """
    Priority Scoring API (v1)
    --------------------------------
    Backend endpoint that receives a list of tasks and returns
    a sorted list with computed scores.

    Why this exists:
    - Frontend gives fast, local results (offline-friendly)
    - Backend gives consistent, validated, long-term logic
    - Future analytics & adaptive learning depend on backend scoring

    Expected JSON:
    {
      "tasks": [
        {
          "text": "IELTS Writing",
          "importance": "High",
          "dueDate": "2025-11-16"   # optional
        }
      ]
    }
    """

    # -----------------------------------------
    # Safely read JSON from request
    # -----------------------------------------
    data = request.get_json(silent=True) or {}
    tasks = [normalize_task(t) for t in data.get("tasks", [])]

    if not isinstance(tasks, list):
        return jsonify(error="Invalid payload: 'tasks' list required"), 400


    if not isinstance(tasks, list):
        return jsonify(error="Invalid payload: 'tasks' list required"), 400

    today = date.today()
    scored = []

    # -----------------------------------------
    # Compute score for each task
    # -----------------------------------------
    for raw in tasks:
        task = raw or {}
        score = 0

        # ---------- Importance weight ----------
        imp = (task.get("importance") or "Medium").lower()

        if imp == "high":
            score += 40
        elif imp == "medium":
            score += 20
        elif imp == "low":
            score += 5

        # ---------- Deadline proximity ----------
        due_str = task.get("dueDate")
        if due_str:
            try:
                due = datetime.fromisoformat(due_str).date()
                days_left = (due - today).days

                if days_left <= 1:
                    score += 50
                elif days_left <= 3:
                    score += 30
                elif days_left <= 7:
                    score += 15
                elif days_left <= 14:
                    score += 10

            except ValueError:
                pass  # Ignore invalid dates safely

        # Build enriched task result
        scored.append({
            **task,
            "score": score
        })
    
    # -----------------------------------------
    # Sort highest → lowest score
    # -----------------------------------------
    scored.sort(key=lambda t: t.get("score", 0), reverse=True)

    # -----------------------------------------
    # Standardised API response
    # -----------------------------------------
    return jsonify(
        result="ok",
        count=len(scored),
        tasks=scored
    ), 200
# -------------------------------------
# Task Schema (Backend Internal Model)
# -------------------------------------

def normalize_task(task):
    return {
        "text": task.get("text", "").strip(),
        "importance": task.get("importance", "Medium"),
        "dueDate": task.get("dueDate", None),
        "createdAt": task.get("createdAt", None),
        "completed": task.get("completed", False)
    }
def compute_momentum(streak: int, avg_score: float, fatigue: int) -> str:
    """
    Determine the user's momentum level based on recent streak, focus score,
    and fatigue. Returns: 'high', 'medium', or 'low'.
    """

    # High momentum: good streak, strong scores, low fatigue
    if streak >= 3 and avg_score >= 75 and fatigue <= 4:
        return "high"

    # Low momentum: tired, low score, or almost no streak
    if streak <= 1 or avg_score <= 50 or fatigue >= 7:
        return "low"

    # Otherwise → medium
    return "medium"
def build_adaptive_plan(fatigue: int, streak: int, avg_score: float):
    """
    Generate a simple adaptive plan based on momentum.
    Returns:
        - recommended_session (minutes)
        - intensity ('light', 'balanced', 'deep')
        - note (short explanation)
    """

    momentum = compute_momentum(streak, avg_score, fatigue)

    if momentum == "high":
        return {
            "recommended_session": 40,
            "intensity": "deep",
            "note": "High momentum detected — continue deep work while maintaining flow."
        }

    elif momentum == "medium":
        return {
            "recommended_session": 25,
            "intensity": "balanced",
            "note": "Moderate momentum — keep a balanced session with stable focus."
        }

    else:  # low momentum
        return {
            "recommended_session": 15,
            "intensity": "light",
            "note": "Low momentum — take a lighter session to recover and rebuild focus."
        }

@app.route("/health", methods=["GET"])
def health_check():
    return {"status": "ok", "message": "Backend running"}, 200
# ----------------------------------------
# Dynamic Study Session Generator (v1)
# ----------------------------------------

def generate_dynamic_session(fatigue, streak, recent_scores):
    """
    # ---------------------------
    # Phase 1: Base Rules
    # ---------------------------

    # Rule A: If fatigue is high (>= 7), reduce duration
    # Rule B: If streak is strong (>= 5), increase duration
    # Rule C: Use last 3 scores to detect performance trend
    # Rule D: If scores are dropping, suggest short recovery session
    # Rule E: If scores are stable or rising, suggest deep focus session
    # Rule F: Minimum session = 10 min, Maximum = 50 min

    Purpose:
        Calculate the ideal session duration and type
        based on fatigue, streak, and performance history.

    Inputs:
        fatigue (int)
        streak (int)
        recent_scores (list)

    Returns:
        {
            "session_type": None,
            "recommended_duration": None,
            "reasoning": None
        }
    """
        # Base duration and reasoning list
    base = 30  # default session duration (minutes)
    duration = base
    reason_list = []
        # Rule A: High fatigue reduces duration
    if fatigue is not None and fatigue >= 7:
        duration -= 10
        reason_list.append("High fatigue level detected")
        # Rule B: Strong streak increases duration
    if streak is not None and streak >= 5:
        duration += 5
        reason_list.append("Strong focus streak detected")
        # Rule C & D: Score trend analysis
    if recent_scores and len(recent_scores) >= 3:
        avg_score = sum(recent_scores[-3:]) / 3

        if avg_score < 60:
            duration -= 5
            reason_list.append("Recent performance dropping")
        elif avg_score >= 80:
            duration += 5
            reason_list.append("Recent performance strong")
        # Rule E: Clamp duration to safe limits
    if duration < 10:
        duration = 10
        reason_list.append("Adjusted to minimum safe duration")

    if duration > 50:
        duration = 50
        reason_list.append("Adjusted to maximum safe duration")


    # TODO: Implement logic in v2
        # Final output
    return {
        "session_type": "focus" if duration >= 30 else "light",
        "recommended_duration": duration,
        "reasoning": reason_list
    }


# -------------------------------
#   NEW API ENDPOINT STUBS (v2)
# -------------------------------

@app.route('/tasks/score', methods=['POST'])
def submit_score():
    # TODO: Add score processing logic
    data = request.get_json()
    return {"message": "score saved", "weighted_score": None}


@app.route('/suggestions/next', methods=['GET'])
def get_next_suggestion():
    # TODO: Add adaptive suggestion logic
    return {
        "suggestion_text": None,
        "reason": None,
        "recommended_duration": None
    }


@app.route('/sessions/end', methods=['POST'])
def end_session():
    # TODO: Add session ending and save logic
    data = request.get_json()
    return {
        "message": "session saved",
        "session_summary": data
    }
@app.get("/plan/adaptive")
def get_adaptive_plan():
    """
    Generate an adaptive study plan based on user inputs.
    Query parameters expected:
        - streak (int)
        - avg_score (float)
        - fatigue (int)
    """

    try:
        streak = int(request.args.get("streak", 0))
        avg_score = float(request.args.get("avg_score", 50))
        fatigue = int(request.args.get("fatigue", 5))
    except ValueError:
        return {"error": "Invalid input types"}, 400

    plan = build_adaptive_plan(fatigue=fatigue, streak=streak, avg_score=avg_score)
    return plan

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)





