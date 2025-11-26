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
@app.route("/health", methods=["GET"])
def health_check():
    return {"status": "ok", "message": "Backend running"}, 200

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


@app.route('/plan/adaptive', methods=['GET'])
def get_adaptive_plan():
    # TODO: Add adaptive session planning logic
    return {
        "recommended_session_type": None,
        "recommended_duration": None,
        "recommended_category": None,
        "reasoning": None
    }

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)




