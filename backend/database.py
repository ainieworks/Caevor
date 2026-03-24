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
        CREATE TABLE IF NOT EXISTS tasks (
            task_id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            category TEXT,
            difficulty INTEGER,
            estimated_time INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS session_history (
            session_id INTEGER PRIMARY KEY AUTOINCREMENT,
            task_id INTEGER,
            start_time DATETIME,
            end_time DATETIME,
            duration INTEGER,
            fatigue_level INTEGER,
            score INTEGER,
            streak INTEGER,
            FOREIGN KEY (task_id) REFERENCES tasks(task_id)
        );

        CREATE TABLE IF NOT EXISTS suggestion_logs (
            suggestion_id INTEGER PRIMARY KEY AUTOINCREMENT,
            task_id INTEGER,
            session_id INTEGER,
            suggestion_text TEXT,
            fatigue_level INTEGER,
            score INTEGER,
            streak INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            followed BOOLEAN,
            FOREIGN KEY (task_id) REFERENCES tasks(task_id)
        );

        CREATE TABLE IF NOT EXISTS focus_scores (
            score_id INTEGER PRIMARY KEY AUTOINCREMENT,
            task_id INTEGER,
            session_id INTEGER,
            raw_score INTEGER,
            weighted_score INTEGER,
            streak INTEGER,
            fatigue_level INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (task_id) REFERENCES tasks(task_id)
        );
    """)

    conn.commit()
    conn.close()
    print("Database initialized.")

if __name__ == "__main__":
    init_db()