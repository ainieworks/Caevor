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

## 2. GET /suggestions/next

**Purpose:**  
Provide the next recommended action or study session based on user’s recent performance.

**Inputs (Query Params):**  
- task_id (optional)  
- session_id (optional)

**Internal Logic (high-level):**  
Uses latest:  
- fatigue_level  
- streak  
- recent scores  
- session history  
to generate the next suggestion.

**Output (JSON):**  
- suggestion_text  
- reason  
- recommended_duration (minutes)  

## 3. POST /sessions/end

**Purpose:**  
Record the end of a study session and store session summary in the database.

**Input (JSON):**  
- session_id  
- task_id  
- start_time  
- end_time  
- duration  
- fatigue_level (optional)  

**Internal Logic (high-level):**  
- Calculate duration if not provided  
- Store the session summary in `session_history`  
- Update streak logic  
- Return saved session info

**Output (JSON):**  
- message: "session saved"  
- session_summary (object)

## 4. GET /plan/adaptive

**Purpose:**  
Generate an adaptive study plan or next session length based on user's recent performance, fatigue, streak, and historical data.

**Inputs (Query Params):**  
- user_id (optional)  
- last_session_id (optional)

**Internal Logic (high-level):**  
- Analyze last 3–5 sessions  
- Use:
  - fatigue trends  
  - streak length  
  - weighted scores  
  - time of day  
- Predict ideal session:
  - type (focus / break / revision)  
  - recommended duration  
  - suggested task category

**Output (JSON):**  
- recommended_session_type  
- recommended_duration  
- recommended_category  
- reasoning
