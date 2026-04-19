import sqlite3

DB_PATH = "caevor.db"

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.executescript("""

        -- Users table (NEW)
        CREATE TABLE IF NOT EXISTS users (
            user_id   INTEGER PRIMARY KEY AUTOINCREMENT,
            email     TEXT NOT NULL UNIQUE,
            password  TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- Tasks table (updated with user_id)
        CREATE TABLE IF NOT EXISTS tasks (
            task_id        INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id        INTEGER,
            title          TEXT NOT NULL,
            category       TEXT,
            difficulty     INTEGER,
            estimated_time INTEGER,
            created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(user_id)
        );

        -- Session history
        CREATE TABLE IF NOT EXISTS session_history (
            session_id    INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id       INTEGER,
            task_id       INTEGER,
            start_time    DATETIME,
            end_time      DATETIME,
            duration      INTEGER,
            fatigue_level INTEGER,
            score         INTEGER,
            streak        INTEGER,
            FOREIGN KEY (user_id) REFERENCES users(user_id),
            FOREIGN KEY (task_id) REFERENCES tasks(task_id)
        );

        -- Suggestion logs
        CREATE TABLE IF NOT EXISTS suggestion_logs (
            suggestion_id   INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id         INTEGER,
            task_id         INTEGER,
            session_id      INTEGER,
            suggestion_text TEXT,
            fatigue_level   INTEGER,
            score           INTEGER,
            streak          INTEGER,
            created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
            followed        BOOLEAN,
            FOREIGN KEY (user_id) REFERENCES users(user_id)
        );

        -- Focus scores
        CREATE TABLE IF NOT EXISTS focus_scores (
            score_id       INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id        INTEGER,
            task_id        INTEGER,
            session_id     INTEGER,
            raw_score      INTEGER,
            weighted_score INTEGER,
            streak         INTEGER,
            fatigue_level  INTEGER,
            created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(user_id)
        );

        -- Roadmaps (for Phase 2 AI mentor)
        CREATE TABLE IF NOT EXISTS roadmaps (
            roadmap_id   INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id      INTEGER,
            goal         TEXT,
            timeline     TEXT,
            roadmap_json TEXT,
            created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(user_id)
        );

    """)

    conn.commit()
    conn.close()
    print("Database initialized.")

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

if __name__ == "__main__":
    init_db()