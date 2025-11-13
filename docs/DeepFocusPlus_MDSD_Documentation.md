# **DeepFocus+ — Model-Driven Software Development (MDSD) Documentation**

### *Core Architectural & Modelling Document for FYP — Version 1.0*

This document outlines the **MDSD foundation** of DeepFocus+, including the models, meta-models, adaptive logic, and mapping from models to implementation. It ensures our project aligns fully with **Model-Driven Software Development principles** while also maintaining our AI‑based adaptive system architecture.

---

# **1. Project Overview (Context Model)**

DeepFocus+ is an **AI-based self‑adaptive productivity system** that adjusts task recommendations based on priority, user history, and behavioural patterns. It acts as an **adaptive decision‑making engine** integrated with a simple user interface.

MDSD captures:

- The **domain model** (tasks, priority, adaptive states)
- The **behaviour model** (state changes, adaptive rules)
- The **process model** (sequence of interaction)
- The **meta-model** (formal abstraction layer)
- The **mapping model** (model → backend logic)

---

# **2. Domain Model (Conceptual Model)**

The core entities of DeepFocus+ are:

```
Task
 ├─ Title
 ├─ Description
 ├─ TaskType
 │    ├─ Academic
 │    ├─ Learning
 │    ├─ Productivity
 │    └─ Custom
 ├─ PriorityTag
 │    ├─ High
 │    ├─ Medium
 │    └─ Low
 ├─ DurationEstimate
 └─ UserHistoryLink
```

```
AdaptiveEngine
 ├─ Input Layer
 ├─ Weight Assignment Module
 ├─ Scoring Logic
 ├─ Adaptive Output Layer
 └─ Feedback Loop
```

---

# **3. Meta-Model (MDSD Requirement)**

Below is the **MDSD Meta‑Model** describing DeepFocus+ at an abstract level.

```
                     ┌──────────────┐
                     │   MetaModel  │
                     └──────┬───────┘
                            │
                 ┌──────────┴───────────┐
                 ▼                      ▼
          ┌────────────┐         ┌──────────────┐
          │   Task     │         │ AdaptiveRule │
          └────┬───────┘         └──────┬───────┘
               │                        │
    ┌──────────┴─────────┐   ┌──────────┴──────────┐
    ▼                    ▼   ▼                     ▼
PriorityTag        TaskType  Condition        OutputAction
```

### Description:

- **Task**: Core element with properties (title, type, priority, duration)
- **TaskType**: A classification model
- **PriorityTag**: Meta‑attribute used in adaptation
- **AdaptiveRule**: The main MDSD behavioural model entity
- **Condition**: Triggers (priority high? long task? history match?)
- **OutputAction**: Adjust score, assign badge, set recommended time

This meta-model fully satisfies MDSD modelling requirements.

---

# **4. Activity Diagram (Behavioural Model)**

```
┌────────────────────────────┐
│        Start Task          │
└──────────────┬─────────────┘
               ▼
      [User Inputs Task]
               ▼
   Validate & Preprocess Input
               ▼
     Check TaskType & Priority
               ▼
       Assign Base Weight
               ▼
   Apply Adaptive Rule Conditions
               ▼
       Compute Final Score
               ▼
 Generate Badge / Colour / Time
               ▼
        Display to User
               ▼
     Wait for Task Completion
               ▼
   Update UserHistory + Weights
               ▼
            End
```

---

# **5. State Machine Diagram (Adaptive Engine States)**

```
        ┌────────────┐
        │    Idle     │
        └──────┬─────┘
               │ User adds task
               ▼
        ┌────────────┐
        │ Processing │
        └──────┬─────┘
               │ Run scoring logic
               ▼
     ┌──────────────────────┐
     │ Generating Response │
     └──────┬───────┬──────┘
            │       │
     badge/colour   time suggestion
            ▼       ▼
       ┌────────────────┐
       │  Output Ready │
       └──────┬────────┘
              │ User completes / skips task
              ▼
       ┌────────────────┐
       │ Adjust Weights │
       └──────┬────────┘
              ▼
        ┌────────────┐
        │   Idle     │
        └────────────┘
```

---

# **6. Sequence Diagram (System Interaction)**

```
User → Frontend → Backend → AdaptiveEngine → Backend → Frontend → User
```

Detailed Sequence:

```
User enters task
      ↓
Frontend sends JSON → Backend
      ↓
Backend validates → forwards to AdaptiveEngine
      ↓
AdaptiveEngine computes score
      ↓
Backend returns {score, badge, colour, time}
      ↓
Frontend renders adaptive UI
      ↓
User marks task done
      ↓
Backend updates history
```

---

# **7. Model-to-Implementation Mapping**

| Model Element | Backend Component  | Frontend Component |
| ------------- | ------------------ | ------------------ |
| Task          | app.py TaskModel   | task input form    |
| AdaptiveRule  | scoring function   | colour bar display |
| Condition     | rule checks        | dynamic UI update  |
| OutputAction  | response builder   | UX rendering       |
| History       | local JSON history | badge/time change  |

This mapping completes the **MDSD requirement** of explaining how models → code.

---

# **8. Next Steps for Version 1.1**

- Convert ASCII diagrams into visuals&#x20;
- Add meta‑model to GitHub Wiki
- Add a model‑to‑model transformation description
- Expand state machine with error states
- Integrate adaptive logic test cases

---

# **9. Conclusion**

DeepFocus+ fully satisfies **Model-Driven Software Development principles** while maintaining its AI‑driven adaptive system foundation. This document establishes all required models for academic evaluation and for future implementation work.



