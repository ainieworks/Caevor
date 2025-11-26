# DeepFocus+ – Database Schema v2 (Draft)
1. tasks
| Field          | Type     | Description                          |
| -------------- | -------- | ------------------------------------ |
| task_id        | INT (PK) | Unique ID for each task              |
| title          | VARCHAR  | Task name (e.g., “IELTS Listening”)  |
| category       | VARCHAR  | Type: study, break, deep work, etc.  |
| difficulty     | INT      | 1–5 scale assigned by user or system |
| estimated_time | INT      | Expected minutes                     |
| created_at     | DATETIME | When task was added                  |

2. session_history
| Field         | Type     | Description                              |
| ------------- | -------- | ---------------------------------------- |
| session_id    | INT (PK) | Unique ID for each study session         |
| task_id       | INT (FK) | Links to the task performed              |
| start_time    | DATETIME | When the session started                 |
| end_time      | DATETIME | When the session ended                   |
| duration      | INT      | Total minutes spent                      |
| fatigue_level | INT      | 1–10 scale (user/system estimated)       |
| score         | INT      | Final session score (0–100)              |
| streak        | INT      | User focus streak at the time of session |

3. suggestion_logs
| Field           | Type     | Description                                                                           |
| --------------- | -------- | ------------------------------------------------------------------------------------- |
| suggestion_id   | INT (PK) | Unique ID for each suggestion generated                                               |
| task_id         | INT (FK) | Related task ID                                                                       |
| session_id      | INT (FK) | Session during which suggestion was made                                              |
| suggestion_text | VARCHAR  | What the system suggested (e.g., “Take a short break”, “Start a 20-min deep session”) |
| fatigue_level   | INT      | Fatigue level at suggestion time                                                      |
| score           | INT      | User’s score at that point                                                            |
| streak          | INT      | Streak at that moment                                                                 |
| created_at      | DATETIME | When suggestion was generated                                                         |
| followed        | BOOLEAN  | Whether user accepted/followed the suggestion                                         |

4. focus_scores
| Field          | Type     | Description                                   |
| -------------- | -------- | --------------------------------------------- |
| score_id       | INT (PK) | Unique ID for each score entry                |
| task_id        | INT (FK) | Which task this score relates to              |
| session_id     | INT (FK) | Which session produced this score             |
| raw_score      | INT      | Score from API (0–100)                        |
| weighted_score | INT      | Score after applying fatigue/streak weighting |
| streak         | INT      | Streak used for weighting                     |
| fatigue_level  | INT      | Fatigue used for weighting                    |
| created_at     | DATETIME | When score was recorded                       |

