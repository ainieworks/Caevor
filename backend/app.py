import os
from dotenv import load_dotenv

load_dotenv()

from flask import Flask, jsonify, request, session
from flask_cors import CORS
from datetime import date, datetime
from werkzeug.security import generate_password_hash, check_password_hash
from database import get_connection, init_db, insert_data, fetch_data
from dotenv import load_dotenv
import os

load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY", "fallback_secret_key")
CORS(app, supports_credentials=True)
init_db()

# ─────────────────────────────────────
# AUTH — SIGNUP
# ─────────────────────────────────────
@app.route("/auth/signup", methods=["POST"])
def signup():
    data     = request.get_json() or {}
    email    = data.get("email", "").strip().lower()
    password = data.get("password", "")

    # Basic validation
    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400

    # Check if email already exists
    existing = fetch_data("SELECT user_id FROM users WHERE email = ?", (email,))
    if existing:
        return jsonify({"error": "Email already registered"}), 409

    # Hash password and save user
    hashed = generate_password_hash(password)
    insert_data(
        "INSERT INTO users (email, password) VALUES (?, ?)",
        (email, hashed)
    )

    return jsonify({"message": "Account created successfully"}), 201


# ─────────────────────────────────────
# AUTH — LOGIN
# ─────────────────────────────────────
@app.route("/auth/login", methods=["POST"])
def login():
    data     = request.get_json() or {}
    email    = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    # Find user
    rows = fetch_data("SELECT user_id, password FROM users WHERE email = ?", (email,))
    if not rows:
        return jsonify({"error": "Invalid email or password"}), 401

    user = rows[0]

    # Verify password
    if not check_password_hash(user["password"], password):
        return jsonify({"error": "Invalid email or password"}), 401

    # Save user in session
    session["user_id"] = user["user_id"]
    session["email"]   = email

    return jsonify({
        "message": "Login successful",
        "user_id": user["user_id"],
        "email":   email
    }), 200


# ─────────────────────────────────────
# AUTH — LOGOUT
# ─────────────────────────────────────
@app.route("/auth/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"message": "Logged out"}), 200
# ─────────────────────────────────────
# AUTH — GET CURRENT USER
# ─────────────────────────────────────
@app.route("/auth/me", methods=["GET"])
def get_me():
    if "user_id" not in session:
        return jsonify({"error": "Not logged in"}), 401

    return jsonify({
        "user_id": session["user_id"],
        "email":   session["email"]
    }), 200

@app.route("/")
def index():
    return "DeepFocus+ backend is running"
# ─────────────────────────────────────
# HELPER — Get current logged in user
# ─────────────────────────────────────
def get_current_user():
    """Returns user_id if logged in, None if not."""
    return session.get("user_id")


# ─────────────────────────────────────
# TASKS — Get all tasks for logged in user
# ─────────────────────────────────────
@app.route("/tasks", methods=["GET"])
def get_tasks():
    user_id = get_current_user()
    if not user_id:
        return jsonify({"error": "Not logged in"}), 401

    rows = fetch_data("""
        SELECT task_id, title, category, difficulty,
               estimated_time, created_at
        FROM tasks
        WHERE user_id = ?
        ORDER BY created_at DESC
    """, (user_id,))

    tasks = [dict(row) for row in rows]
    return jsonify({"tasks": tasks}), 200


# ─────────────────────────────────────
# TASKS — Create a new task
# ─────────────────────────────────────
@app.route("/tasks", methods=["POST"])
def create_task():
    user_id = get_current_user()
    if not user_id:
        return jsonify({"error": "Not logged in"}), 401

    data           = request.get_json() or {}
    title          = data.get("title", "").strip()
    category       = data.get("category", "general")
    difficulty     = data.get("difficulty", 3)
    estimated_time = data.get("estimated_time", 25)

    if not title:
        return jsonify({"error": "Task title is required"}), 400

    insert_data("""
        INSERT INTO tasks (user_id, title, category, difficulty, estimated_time)
        VALUES (?, ?, ?, ?, ?)
    """, (user_id, title, category, difficulty, estimated_time))

    # Fetch the newly created task to return it
    rows = fetch_data("""
        SELECT task_id, title, category, difficulty, estimated_time, created_at
        FROM tasks
        WHERE user_id = ? ORDER BY task_id DESC LIMIT 1
    """, (user_id,))

    return jsonify({"message": "Task created", "task": dict(rows[0])}), 201


# ─────────────────────────────────────
# TASKS — Delete a task
# ─────────────────────────────────────
@app.route("/tasks/<int:task_id>", methods=["DELETE"])
def delete_task(task_id):
    user_id = get_current_user()
    if not user_id:
        return jsonify({"error": "Not logged in"}), 401

    # Make sure task belongs to this user
    rows = fetch_data("""
        SELECT task_id FROM tasks WHERE task_id = ? AND user_id = ?
    """, (task_id, user_id))

    if not rows:
        return jsonify({"error": "Task not found"}), 404

    insert_data("DELETE FROM tasks WHERE task_id = ?", (task_id,))
    return jsonify({"message": "Task deleted"}), 200


# ─────────────────────────────────────
# TASKS — Update a task title
# ─────────────────────────────────────
@app.route("/tasks/<int:task_id>", methods=["PUT"])
def update_task(task_id):
    user_id = get_current_user()
    if not user_id:
        return jsonify({"error": "Not logged in"}), 401

    data  = request.get_json() or {}
    title = data.get("title", "").strip()

    if not title:
        return jsonify({"error": "Title is required"}), 400

    rows = fetch_data("""
        SELECT task_id FROM tasks WHERE task_id = ? AND user_id = ?
    """, (task_id, user_id))

    if not rows:
        return jsonify({"error": "Task not found"}), 404

    insert_data("""
        UPDATE tasks SET title = ? WHERE task_id = ?
    """, (title, task_id))

    return jsonify({"message": "Task updated"}), 200
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
def compute_focus_score(recent_scores, streak):
    """
    Compute a simple focus score based on:
    - recent performance scores (list of integers)
    - current streak value
    """

    if not recent_scores:
        base = 50   # neutral
    else:
        base = sum(recent_scores) / len(recent_scores)

    # streak impact (mild)
    streak_boost = min(streak * 2, 20)   # max +20 boost

    focus_score = base + streak_boost

    # keep score within valid range
    return max(0, min(focus_score, 100))
def generate_recommended_next_task(tasks, focus_score):
    """
    Pick the next task based on current focus_score and task metadata.

    tasks: list of dicts coming from frontend or database.
    focus_score: 0–100 value from compute_focus_score().
    """

    if not tasks:
        return None, "No available tasks.", 0

    # Filter out completed tasks if you have such a flag
    active_tasks = [
        t for t in tasks
        if str(t.get("status", "")).lower() not in {"done", "completed"}
    ] or tasks  # fallback if no status field

    # Decide intensity band from focus_score
    if focus_score >= 75:
        target_difficulty = "high"
    elif focus_score <= 40:
        target_difficulty = "low"
    else:
        target_difficulty = "medium"

    # Helper: convert any numeric difficulty to a band
    def difficulty_band(task):
        diff = task.get("difficulty", 3)  # 1–5 expected
        if diff >= 4:
            return "high"
        elif diff <= 2:
            return "low"
        return "medium"

    # Score each task for this moment
    best_task = None
    best_score = -1

    for t in active_tasks:
        score = 0

        # 1) Match difficulty with current focus
        if difficulty_band(t) == target_difficulty:
            score += 40

        # 2) Prefer tasks with nearer due dates (optional)
        # (Safe: ignores errors if date missing)
        due_str = t.get("dueDate")
        if due_str:
            try:
                due = datetime.fromisoformat(due_str).date()
                days_left = (due - date.today()).days
                if days_left <= 1:
                    score += 30
                elif days_left <= 3:
                    score += 20
                elif days_left <= 7:
                    score += 10
            except ValueError:
                pass

        # 3) Slight bonus for shorter tasks when focus is low
        est = t.get("estimatedMinutes") or t.get("estimated_time") or 25
        try:
            est = int(est)
        except (TypeError, ValueError):
            est = 25

        if focus_score <= 40 and est <= 30:
            score += 15
        elif focus_score >= 75 and est >= 30:
            score += 10

        if score > best_score:
            best_score = score
            best_task = t

    # Fallback if something weird happens
    if best_task is None:
        best_task = active_tasks[0]
        reason = "Defaulted to first active task."
    else:
        if target_difficulty == "high":
            reason = "High focus detected — choosing a demanding task."
        elif target_difficulty == "low":
            reason = "Lower focus — selecting a lighter, shorter task."
        else:
            reason = "Moderate focus — choosing a balanced task."

    # Recommended duration: reuse task estimate (or a default)
    recommended_duration = best_task.get("estimatedMinutes") or \
                           best_task.get("estimated_time") or 25

    try:
        recommended_duration = int(recommended_duration)
    except (TypeError, ValueError):
        recommended_duration = 25

    return best_task, reason, recommended_duration
def insert_data(query, params=()):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(query, params)
    conn.commit()
    conn.close()

def fetch_data(query, params=()):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    return rows
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
@app.route("/suggestions/next", methods=["POST"])
def get_next_suggestion():
    data = request.get_json() or {}

    task_id = data.get("task_id")
    session_id = data.get("session_id")
    fatigue_level = data.get("fatigue_level", 5)
    streak = data.get("streak", 0)
    recent_scores = data.get("recent_scores", [])

    avg_score = sum(recent_scores) / len(recent_scores) if recent_scores else 60

    # Generate suggestion based on fatigue and performance
    if fatigue_level >= 7:
        suggestion_text = "Take a 10 minute break. You seem tired."
    elif avg_score >= 75 and streak >= 3:
        suggestion_text = "Great momentum! Start a 40 minute deep work session."
    elif avg_score < 60:
        suggestion_text = "Try a light 15 minute review session to rebuild focus."
    else:
        suggestion_text = "Start a balanced 25 minute focus session."

    # Save suggestion to database
    insert_data("""
        INSERT INTO suggestion_logs (task_id, session_id, suggestion_text, fatigue_level, score, streak)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (task_id, session_id, suggestion_text, fatigue_level, avg_score, streak))

    return jsonify({
        "suggestion": suggestion_text,
        "fatigue_level": fatigue_level,
        "avg_score": avg_score,
        "streak": streak
    }), 200
    data = request.get_json() or {}

    tasks = data.get("tasks", [])
    recent_scores = data.get("recent_scores", [])
    streak = data.get("streak", 0)

    avg_score = sum(recent_scores) / len(recent_scores) if recent_scores else 60
    fatigue = 5  # placeholder until you add real fatigue tracking
    momentum = compute_momentum(streak, avg_score, fatigue)


    # 2) Compute focus score (Step 1)
    focus_score = compute_focus_score(recent_scores, streak)

    # 3) Pick best next task (Step 2)
    best_task, reason, duration = generate_recommended_next_task(tasks, focus_score)

    # 4) Log the suggestion (Part B)
    
    return jsonify({
        "success": True,
        "task": best_task,
        "reason": reason,
        "focus_score": focus_score,
        "momentum": momentum,
        "recommended_duration": duration
    })

@app.route('/tasks/score', methods=['POST'])
def submit_score():
    data = request.get_json() or {}

    task_id = data.get("task_id")
    session_id = data.get("session_id")
    raw_score = data.get("raw_score")
    fatigue_level = data.get("fatigue_level", 5)
    streak = data.get("streak", 0)

    # Simple weighting formula
    weighted_score = raw_score - (fatigue_level * 2) + (streak * 3)
    weighted_score = max(0, min(100, weighted_score))

    insert_data("""
        INSERT INTO focus_scores (task_id, session_id, raw_score, weighted_score, streak, fatigue_level)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (task_id, session_id, raw_score, weighted_score, streak, fatigue_level))

    return jsonify({
        "message": "score saved",
        "weighted_score": weighted_score
    }), 200
@app.route('/sessions/end', methods=['POST'])
def end_session():
    data = request.get_json() or {}

    task_id = data.get("task_id")
    session_id = data.get("session_id")
    start_time = data.get("start_time")
    end_time = data.get("end_time")
    duration = data.get("duration")
    fatigue_level = data.get("fatigue_level", 5)

    # Calculate duration if not provided
    if not duration and start_time and end_time:
        from datetime import datetime
        fmt = "%Y-%m-%d %H:%M:%S"
        duration = (datetime.strptime(end_time, fmt) - datetime.strptime(start_time, fmt)).seconds // 60

    insert_data("""
        INSERT INTO session_history (task_id, start_time, end_time, duration, fatigue_level)
        VALUES (?, ?, ?, ?, ?)
    """, (task_id, start_time, end_time, duration, fatigue_level))

    return jsonify({
        "message": "session saved",
        "session_summary": {
            "task_id": task_id,
            "duration": duration,
            "fatigue_level": fatigue_level
        }
    }), 200
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





