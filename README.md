# Caevor

Smart, self-adaptive study & focus planner designed to help learners manage time, priorities, and mental focus.

---

## 🌟 Overview
Caevor is a research and development project exploring how AI-driven logic can adapt to human learning behaviour.  
It integrates an adaptive backend, visual task management UI, and research components for focus and productivity tracking.

---
## 🎯 Model-Driven Software Development (MDSD)

Caevor now includes MDSD-based modelling as part of its FYP structure.  
All MDSD artefacts—including **domain models, meta-models, activity diagrams, state machine diagrams, and sequence mappings**—are now maintained in the `/docs/DeepFocusPlus_MDSD_Documentation.md` file.

This ensures clear alignment with Model-Driven Software Development principles and supports future automated transformations from models to implementation.

## 🧠 Core Features
- Adaptive priority algorithm (AI-based task weighting)
- Responsive interface for task management
- Focus tracking and distraction analysis (planned)
- Research integration on neural interface feedback

---

## ⚙️ Tech Stack
**Frontend:** HTML, CSS, JavaScript  
**Backend:** Python (Flask)  
**Database:** (To be added)  
**Research Tools:** EEG data analysis, Pandas, NumPy  

---

## 🚀 Quick Start
```bash
# Clone the repo
git clone https://github.com/ainieworks/Caevor.git
cd Caevor/backend

# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # (Windows: .venv\Scripts\activate)

# Install dependencies
pip install -r requirements.txt

# Run the server
python app.py
# open http://127.0.0.1:5000/health
# Synced successfully between VS Code and GitHub 🎯
