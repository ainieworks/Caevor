# DeepFocus+ – API Endpoints (v2)

## 1. POST /tasks/score

**Purpose:**  
Submit a score for a task and store session performance.

**Input (JSON):**  
- task_id  
- session_id  
- raw_score  
- fatigue_level  
- streak  

**Output (JSON):**  
- weighted_score  
- message: "score saved"
