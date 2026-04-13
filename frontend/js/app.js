import { preprocessImage } from './imagePreprocess.js';

// ═══════════════════════════════════════
//   Caevor — Task Logic (v1)
// ═══════════════════════════════════════

document.addEventListener("DOMContentLoaded", function () {

    const taskInput    = document.getElementById("taskInput");
    const addTaskBtn   = document.getElementById("addTaskBtn");
    const smartSortBtn = document.getElementById("smartSortBtn");

    // ─────────────────────────────────────
    //  SMART SORT  (Backend + local fallback)
    // ─────────────────────────────────────
    smartSortBtn.addEventListener("click", async function () {
        let tasks = JSON.parse(localStorage.getItem("tasks")) || [];

        try {
            const response = await fetch("http://127.0.0.1:5000/api/priority", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tasks }),
            });

            if (response.ok) {
                const data = await response.json();
                localStorage.setItem("tasks", JSON.stringify(data.tasks || []));
                loadTasks();
                return;
            }
        } catch {
            console.warn("Backend offline → using local fallback");
        }

        // Local fallback
        tasks.forEach(t => t.score = computePriorityScore(t));
        tasks.sort((a, b) => b.score - a.score);
        localStorage.setItem("tasks", JSON.stringify(tasks));
        loadTasks();
    });

    // ─────────────────────────────────────
    //  ADD TASK
    // ─────────────────────────────────────
    addTaskBtn.addEventListener("click", function () {
        let taskText = taskInput.value.trim();

        if (!taskText) {
            showStatus("Please enter a task first!");
            return;
        }

        // Capitalise first letter
        taskText = taskText.charAt(0).toUpperCase() + taskText.slice(1);

        const priority     = document.getElementById("priorityInput").value;
        const dueDateInput = document.getElementById("dueDateInput").value;

        // Due date validation
        if (dueDateInput) {
            const due   = new Date(dueDateInput);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (due < today) {
                showStatus("Due date must be in the future!");
                return;
            }
        }

        let tasks = JSON.parse(localStorage.getItem("tasks")) || [];

        tasks.push({
            text:          taskText,
            importance:    priority,
            dueDate:       dueDateInput || null,
            createdAt:     Date.now(),
            sessions:      0,
            focusMinutes:  0,
            interruptions: 0,
            completed:     false,
            skipped:       0,
            adaptWeight:   0,
        });

        localStorage.setItem("tasks", JSON.stringify(tasks));
        taskInput.value = "";
        document.getElementById("dueDateInput").value = "";
        showStatus("Task added!", true);
        loadTasks();
    });

    // ─────────────────────────────────────
    //  STATUS MESSAGE
    // ─────────────────────────────────────
    function showStatus(msg, success = false) {
        const el = document.getElementById("statusMessage");
        if (!el) return;
        el.textContent      = msg;
        el.style.display    = "block";
        el.style.background = success ? "rgba(62,255,160,0.09)"  : "rgba(255,85,114,0.09)";
        el.style.color      = success ? "#3effa0"                : "#ff5572";
        el.style.borderColor= success ? "rgba(62,255,160,0.3)"   : "rgba(255,85,114,0.3)";
        setTimeout(() => { el.style.display = "none"; }, 2000);
    }

    // ─────────────────────────────────────
    //  CRUD HELPERS
    // ─────────────────────────────────────
    function deleteTask(index) {
        let tasks = JSON.parse(localStorage.getItem("tasks")) || [];
        tasks.splice(index, 1);
        localStorage.setItem("tasks", JSON.stringify(tasks));
        loadTasks();
    }

    function editTask(index) {
        let tasks = JSON.parse(localStorage.getItem("tasks")) || [];
        const current = tasks[index]?.text || "";
        const updated = prompt("Edit task:", current);
        if (updated && updated.trim()) {
            tasks[index].text  = updated.trim();
            tasks[index].score = computePriorityScore(tasks[index]);
            localStorage.setItem("tasks", JSON.stringify(tasks));
            loadTasks();
        }
    }

    // ─────────────────────────────────────
    //  DATE HELPERS
    // ─────────────────────────────────────
    function isDueToday(task) {
        if (!task.dueDate) return false;
        const today = new Date(); today.setHours(0,0,0,0);
        const due   = new Date(task.dueDate); due.setHours(0,0,0,0);
        return due.getTime() === today.getTime();
    }

    function isOverdue(task) {
        if (!task.dueDate) return false;
        const today = new Date(); today.setHours(0,0,0,0);
        const due   = new Date(task.dueDate); due.setHours(0,0,0,0);
        return due < today;
    }

    // ─────────────────────────────────────
    //  SESSION LOGIC
    // ─────────────────────────────────────
    function startSession(index) {
        const tasks = JSON.parse(localStorage.getItem("tasks")) || [];
        if (tasks[index]) {
            tasks[index]._sessionStart = Date.now();
            localStorage.setItem("tasks", JSON.stringify(tasks));
        }
    }

    function endSession(index, { minutes = 0, interruptions = 0, completed = false, skipped = false } = {}) {
        const tasks = JSON.parse(localStorage.getItem("tasks")) || [];
        const t = tasks[index];
        if (!t) return;

        t.sessions      = (t.sessions      || 0) + 1;
        t.focusMinutes  = (t.focusMinutes  || 0) + Math.max(0, minutes);
        t.interruptions = (t.interruptions || 0) + Math.max(0, interruptions);
        if (completed) t.completed = true;
        if (skipped)   t.skipped = (t.skipped || 0) + 1;

        const focusBoost       = Math.min(30, minutes);
        const interruptPenalty = Math.min(20, interruptions * 3);
        const skipPenalty      = Math.min(15, (t.skipped || 0) * 2);

        t.adaptWeight = clamp(
            (t.adaptWeight || 0) + focusBoost - interruptPenalty - skipPenalty,
            -40, 40
        );

        localStorage.setItem("tasks", JSON.stringify(tasks));
        autoRerank();

        // Refresh right panel stats
        if (window.updateRightPanel) window.updateRightPanel();

        // Send score to backend
        fetch("http://127.0.0.1:5000/tasks/score", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                task_id:       index,
                session_id:    index,
                raw_score:     minutes * 2,
                fatigue_level: t.interruptions || 0,
                streak:        t.sessions      || 0,
            })
        }).then(r => r.json())
          .then(d => console.log("Score saved:", d))
          .catch(() => console.warn("Backend offline"));

        // Send session end to backend
        fetch("http://127.0.0.1:5000/sessions/end", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                task_id:       index,
                session_id:    index,
                duration:      minutes,
                fatigue_level: t.interruptions || 0,
            })
        }).then(r => r.json())
          .then(d => console.log("Session saved:", d))
          .catch(() => console.warn("Backend offline"));
    }

    function autoRerank() {
        let tasks = JSON.parse(localStorage.getItem("tasks")) || [];
        tasks.forEach(t => t.score = computePriorityScore(t));
        tasks.sort((a, b) => b.score - a.score);
        localStorage.setItem("tasks", JSON.stringify(tasks));
        loadTasks();
    }

    function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }

    // ─────────────────────────────────────
    //  LOAD & RENDER TASKS
    // ─────────────────────────────────────
    function loadTasks() {
        let tasks = JSON.parse(localStorage.getItem("tasks") || "[]");

        // Migrate old string tasks
        tasks = tasks.map(item =>
            typeof item === "string"
                ? { text: item, importance: "Medium", dueDate: null, createdAt: Date.now(),
                    sessions: 0, focusMinutes: 0, interruptions: 0, completed: false, skipped: 0, adaptWeight: 0 }
                : item
        );

        // Score + sort
        tasks.forEach(t => t.score = computePriorityScore(t));
        tasks.sort((a, b) => b.score - a.score);
        localStorage.setItem("tasks", JSON.stringify(tasks));

        // Update task count
        const countEl = document.getElementById("taskCount");
        if (countEl) countEl.textContent = `${tasks.length} task${tasks.length !== 1 ? "s" : ""}`;

        const taskList = document.getElementById("tasklist");
        taskList.innerHTML = "";

        if (tasks.length === 0) {
            const empty = document.createElement("p");
            empty.id          = "noTaskText";
            empty.textContent = "No tasks yet. Add one above to get started.";
            taskList.appendChild(empty);
            return;
        }

        tasks.forEach((taskobj, index) => {
            const item = document.createElement("div");
            item.classList.add("task");

            // Priority class
            if      (taskobj.importance === "High")   item.classList.add("high");
            else if (taskobj.importance === "Medium") item.classList.add("medium");
            else                                       item.classList.add("low");

            // Overdue / today dot
            if (isOverdue(taskobj)) {
                const dot = document.createElement("span");
                dot.classList.add("overdue-dot");
                item.appendChild(dot);
            } else if (isDueToday(taskobj)) {
                const dot = document.createElement("span");
                dot.classList.add("today-dot");
                item.appendChild(dot);
            }

            // Priority glow dot
            const priorityDot = document.createElement("div");
            priorityDot.classList.add("task-priority-dot");

            // Task text
            const taskText = document.createElement("span");
            taskText.classList.add("task-text");
            taskText.textContent = taskobj.text;

            // Score tag
            const scoreTag = document.createElement("span");
            scoreTag.classList.add("task-score");
            scoreTag.textContent = `score ${taskobj.score || 0}`;

            // Action buttons container
            const actions = document.createElement("div");
            actions.classList.add("task-actions");

            // Edit
            const editBtn = document.createElement("button");
            editBtn.classList.add("task-btn");
            editBtn.textContent = "edit";
            editBtn.onclick = () => editTask(index);

            // Done 25m
            const doneBtn = document.createElement("button");
            doneBtn.classList.add("task-btn", "success");
            doneBtn.textContent = "done 25m";
            doneBtn.onclick = () => endSession(index, { minutes: 25, completed: true });

            // Start
            const startBtn = document.createElement("button");
            startBtn.classList.add("task-btn");
            startBtn.textContent = "start";
            startBtn.onclick = () => startSession(index);

            // Stop
            const stopBtn = document.createElement("button");
            stopBtn.classList.add("task-btn");
            stopBtn.textContent = "stop 15m";
            stopBtn.onclick = () => endSession(index, { minutes: 15, interruptions: 1 });

            // Skip
            const skipBtn = document.createElement("button");
            skipBtn.classList.add("task-btn");
            skipBtn.textContent = "skip";
            skipBtn.onclick = () => endSession(index, { skipped: true });

            // Delete
            const deleteBtn = document.createElement("button");
            deleteBtn.classList.add("task-btn", "danger");
            deleteBtn.textContent = "delete";
            deleteBtn.onclick = () => deleteTask(index);

            // Assemble
            actions.appendChild(editBtn);
            actions.appendChild(doneBtn);
            actions.appendChild(startBtn);
            actions.appendChild(stopBtn);
            actions.appendChild(skipBtn);
            actions.appendChild(deleteBtn);

            item.appendChild(priorityDot);
            item.appendChild(taskText);
            item.appendChild(scoreTag);
            item.appendChild(actions);

            taskList.appendChild(item);
        });
    }

    // ─────────────────────────────────────
    //  PRIORITY SCORING
    // ─────────────────────────────────────
    function computePriorityScore(t) {
        let score = 0;

        // 1. Importance
        const importanceMap = { High: 5, Medium: 3, Low: 1 };
        score += importanceMap[t.importance] || 0;

        // 2. Deadline proximity
        if (t.dueDate) {
            const diffDays = (new Date(t.dueDate) - new Date()) / (1000 * 60 * 60 * 24);
            if      (diffDays <= 1) score += 4;
            else if (diffDays <= 3) score += 3;
            else if (diffDays <= 7) score += 2;
            else                    score += 1;
        }

        // 3. Task age
        if (t.createdAt) {
            const ageDays = (Date.now() - new Date(t.createdAt)) / (1000 * 60 * 60 * 24);
            if      (ageDays > 14) score += 3;
            else if (ageDays > 7)  score += 2;
            else if (ageDays > 3)  score += 1;
        }

        // 4. Incomplete bonus
        if (!t.completed) score += 1;

        // 5. Quick-win boost
        if (t.duration && Number(t.duration) <= 30) score += 10;

        // 6. Adaptive weight
        score += clamp(Number(t.adaptWeight || 0), -40, 40);

        return score;
    }

    // ─────────────────────────────────────
    //  INIT
    // ─────────────────────────────────────
    loadTasks();

}); // end DOMContentLoaded