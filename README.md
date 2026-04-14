# Caevor — Focus Planner

> **"Yes. You can. Look — I did."**  
> An AI-driven, self-adaptive productivity system built for students who want to turn things around.

---

## 🌟 What is Caevor?

Caevor is a smart focus planner that adapts to your behaviour. It tracks your study sessions, scores your performance, and recommends what to work on next — automatically adjusting based on your fatigue, streak, and recent scores.

Built as a Final Year Project (FYP) by a student who used AI to plan her own path abroad — and wants to give that same power to every student who feels lost.

---

## ✅ Current Features (v1.0)

- **Adaptive Priority Scoring** — Tasks are automatically ranked by importance, deadline, age, and session behaviour
- **Focus Session Tracking** — Start, stop, complete or skip sessions. Each action updates your score
- **Weighted Score System** — Raw scores adjusted by fatigue and streak for fair performance tracking
- **Smart Suggestions** — Backend generates next session recommendation based on your recent data
- **Adaptive Plan API** — Recommends session type (light / balanced / deep) and duration
- **Statistics Dashboard** — View completed tasks, total focus minutes, sessions, and priority breakdown
- **Dark / Light Mode** — Full theme toggle, saved to local storage
- **Daily Motivational Quotes** — Refreshable quote strip at the bottom
- **Right Panel** — Live focus score ring, streak, completed count, and AI suggestion
- **Settings Page** — Theme control, data management, app info
- **MDSD Documentation** — Full Model-Driven Software Development architecture documented

---

## ⚙️ Tech Stack

| Layer      | Technology                        |
|------------|-----------------------------------|
| Frontend   | HTML, CSS, JavaScript (Vanilla)   |
| Backend    | Python, Flask                     |
| Database   | SQLite (via `database.py`)        |
| CORS       | Flask-CORS                        |
| Fonts      | Google Fonts (Syne, DM Sans)      |

---

## 🗄️ Database Schema

Four tables — all auto-created on first run:

- `tasks` — task metadata and difficulty
- `session_history` — every study session recorded
- `suggestion_logs` — every suggestion generated and whether followed
- `focus_scores` — raw and weighted scores per session

---

## 🔌 API Endpoints

| Method | Endpoint            | Purpose                          |
|--------|---------------------|----------------------------------|
| POST   | `/api/priority`     | Score and sort tasks by priority |
| POST   | `/tasks/score`      | Submit and save a focus score    |
| POST   | `/sessions/end`     | Record end of a study session    |
| POST   | `/suggestions/next` | Get next session suggestion      |
| GET    | `/plan/adaptive`    | Get adaptive session plan        |
| GET    | `/health`           | Check backend status             |

---

## 🚀 Quick Start

```bash
# 1. Clone the repo
git clone https://github.com/ainieworks/Caevor.git
cd Caevor/backend

# 2. Create virtual environment
python -m venv .venv
source .venv/bin/activate       # Mac/Linux
.venv\Scripts\activate          # Windows

# 3. Install dependencies
pip install -r requirements.txt

# 4. Run the backend
python app.py

# 5. Open frontend
# Open frontend/index_main.html in your browser
# Backend runs at http://127.0.0.1:5000
```

---

## 📁 Project Structure

```
Caevor/
│
├── backend/
│   ├── app.py              # Flask server + all API endpoints
│   ├── database.py         # SQLite setup and helper functions
│   ├── requirements.txt    # Python dependencies
│   └── caevor.db           # Auto-generated SQLite database
│
├── frontend/
│   ├── index_main.html     # Main UI
│   └── js/
│       ├── app.js          # Task logic, session tracking, UI rendering
│       └── imagePreprocess.js  # Image utility module
│
├── docs/
│   ├── DeepFocusPlus_MDSD_Documentation.md
│   ├── api_endpoints_v2.md
│   └── schema_v2.md
│
└── README.md
```

---

## 🎯 MDSD Architecture

Caevor follows **Model-Driven Software Development** principles:

- **Domain Model** — Tasks, sessions, adaptive engine
- **Meta-Model** — AdaptiveRule, Condition, OutputAction
- **Activity Diagram** — Task input → scoring → adaptive output → feedback loop
- **State Machine** — Idle → Processing → Output Ready → Adjust Weights → Idle
- **Model-to-Code Mapping** — Every model element maps to a backend function

Full documentation in `/docs/DeepFocusPlus_MDSD_Documentation.md`

---

## 🔮 Phase 2 Roadmap (Coming Soon)

Caevor v2 will evolve into a full **AI life mentor** — not just a task planner:

- 🤖 AI Chatbot — goal analysis, roadmap generation, university matching
- 📅 Long-term planning — 3 month, 6 month, 1 year roadmaps
- 📊 Weekly auto-generated task schedules based on user goals
- 🌐 Live deployment — accessible at `caevor.com`
- 👤 User accounts — cloud sync, progress history
- 📱 Mobile-friendly UI

---

## 👩‍💻 Built By

**Qurat-ul-Ain**  
Final Year Software Engineering Student  
*"I built the tool I wish existed when I needed it most."*

---

## 📄 License

MIT License — see `LICENSE` for details.