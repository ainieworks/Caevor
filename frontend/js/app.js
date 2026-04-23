import { preprocessImage } from './imagePreprocess.js';

// ═══════════════════════════════════════
//   Caevor — Task Logic (v2 — DB Connected)
// ═══════════════════════════════════════

const BACKEND = "http://127.0.0.1:5000";

document.addEventListener("DOMContentLoaded", async function () {

    const taskInput    = document.getElementById("taskInput");
    const addTaskBtn   = document.getElementById("addTaskBtn");
    const smartSortBtn = document.getElementById("smartSortBtn");

    // ─────────────────────────────────────
    //  LOAD TASKS FROM DATABASE
    // ─────────────────────────────────────
    async function loadTasks() {
        try {
            const res = await fetch(`${BACKEND}/tasks`, {
                credentials: "include"
            });

            if (res.status === 401) {
                // Not logged in — redirect to login
                window.location.href = "login.html";
                return;
            }

            const data  = await res.json();
            const tasks = data.tasks || [];

            renderTasks(tasks);
            updateCount(tasks.length);

            // Update right panel
            if (window.updateRightPanel) window.updateRightPanel(tasks);

        } catch {
            console.warn("Backend offline — cannot load tasks");
            renderEmpty("Cannot connect to server. Is Flask running?");
        }
    }

    // ─────────────────────────────────────
    //  ADD TASK
    // ─────────────────────────────────────
    addTaskBtn.addEventListener("click", async function () {
        let taskText = taskInput.value.trim();

        if (!taskText) {
            showStatus("Please enter a task first!");
            return;
        }

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

        // Map priority to difficulty number
        const difficultyMap = { High: 5, Medium: 3, Low: 1 };

        try {
            const res = await fetch(`${BACKEND}/tasks`, {
                method:      "POST",
                headers:     { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    title:          taskText,
                    category:       "general",
                    difficulty:     difficultyMap[priority] || 3,
                    estimated_time: 25,
                    importance:     priority,
                    dueDate:        dueDateInput || null,
                })
            });

            if (res.status === 401) {
                window.location.href = "login.html";
                return;
            }

            if (res.ok) {
                taskInput.value = "";
                document.getElementById("dueDateInput").value = "";
                showStatus("Task added!", true);
                loadTasks();
            } else {
                const data = await res.json();
                showStatus(data.error || "Failed to add task.");
            }

        } catch {
            showStatus("Cannot connect to server.");
        }
    });

    // ─────────────────────────────────────
    //  SMART SORT (local — backend optional)
    // ─────────────────────────────────────
    smartSortBtn.addEventListener("click", async function () {
        loadTasks(); // For now just reload — scoring comes in later phase
    });

    // ─────────────────────────────────────
    //  STATUS MESSAGE
    // ─────────────────────────────────────
    function showStatus(msg, success = false) {
        const el = document.getElementById("statusMessage");
        if (!el) return;
        el.textContent       = msg;
        el.style.display     = "block";
        el.style.background  = success ? "rgba(62,255,160,0.09)"  : "rgba(255,85,114,0.09)";
        el.style.color       = success ? "#3effa0"                 : "#ff5572";
        el.style.borderColor = success ? "rgba(62,255,160,0.3)"   : "rgba(255,85,114,0.3)";
        setTimeout(() => { el.style.display = "none"; }, 2000);
    }

    // ─────────────────────────────────────
    //  DELETE TASK
    // ─────────────────────────────────────
    async function deleteTask(task_id) {
        try {
            const res = await fetch(`${BACKEND}/tasks/${task_id}`, {
                method:      "DELETE",
                credentials: "include"
            });
            if (res.ok) loadTasks();
        } catch {
            showStatus("Cannot connect to server.");
        }
    }

    // ─────────────────────────────────────
    //  EDIT TASK
    // ─────────────────────────────────────
    async function editTask(task_id, currentTitle) {
        const updated = prompt("Edit task:", currentTitle);
        if (!updated || !updated.trim()) return;

        try {
            const res = await fetch(`${BACKEND}/tasks/${task_id}`, {
                method:      "PUT",
                headers:     { "Content-Type": "application/json" },
                credentials: "include",
                body:        JSON.stringify({ title: updated.trim() })
            });
            if (res.ok) loadTasks();
        } catch {
            showStatus("Cannot connect to server.");
        }
    }

    // ─────────────────────────────────────
    //  SESSION LOGIC
    // ─────────────────────────────────────
    async function endSession(task_id, { minutes = 0, interruptions = 0, completed = false, skipped = false } = {}) {

        // Send score to backend
        try {
            await fetch(`${BACKEND}/tasks/score`, {
                method:      "POST",
                headers:     { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    task_id,
                    session_id:    task_id,
                    raw_score:     minutes * 2,
                    fatigue_level: interruptions,
                    streak:        1,
                })
            });
        } catch { console.warn("Score save failed"); }

        // Send session end to backend
        try {
            await fetch(`${BACKEND}/sessions/end`, {
                method:      "POST",
                headers:     { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    task_id,
                    session_id:    task_id,
                    duration:      minutes,
                    fatigue_level: interruptions,
                })
            });
        } catch { console.warn("Session save failed"); }

        showStatus(completed ? "Session complete! Great work." : "Session recorded.", true);
        loadTasks();
    }

    // ─────────────────────────────────────
    //  RENDER TASKS
    // ─────────────────────────────────────
    function renderTasks(tasks) {
        const taskList = document.getElementById("tasklist");
        taskList.innerHTML = "";

        if (!tasks || tasks.length === 0) {
            renderEmpty("No tasks yet. Add one above to get started.");
            return;
        }

        // Map difficulty back to priority label
        function getPriority(difficulty) {
            if (difficulty >= 5) return "High";
            if (difficulty <= 1) return "Low";
            return "Medium";
        }

        tasks.forEach((task) => {
            const priority = getPriority(task.difficulty);
            const item     = document.createElement("div");
            item.classList.add("task", priority.toLowerCase());

            // Priority dot
            const dot = document.createElement("div");
            dot.classList.add("task-priority-dot");

            // Task text
            const taskText = document.createElement("span");
            taskText.classList.add("task-text");
            taskText.textContent = task.title;

            // Score tag — show estimated time
            const scoreTag = document.createElement("span");
            scoreTag.classList.add("task-score");
            scoreTag.textContent = `${task.estimated_time || 25}m`;

            // Actions
            const actions = document.createElement("div");
            actions.classList.add("task-actions");

            const editBtn = document.createElement("button");
            editBtn.classList.add("task-btn");
            editBtn.textContent = "edit";
            editBtn.onclick = () => editTask(task.task_id, task.title);

            const doneBtn = document.createElement("button");
            doneBtn.classList.add("task-btn", "success");
            doneBtn.textContent = "done 25m";
            doneBtn.onclick = () => endSession(task.task_id, { minutes: 25, completed: true });

            const stopBtn = document.createElement("button");
            stopBtn.classList.add("task-btn");
            stopBtn.textContent = "stop 15m";
            stopBtn.onclick = () => endSession(task.task_id, { minutes: 15, interruptions: 1 });

            const skipBtn = document.createElement("button");
            skipBtn.classList.add("task-btn");
            skipBtn.textContent = "skip";
            skipBtn.onclick = () => endSession(task.task_id, { skipped: true });

            const deleteBtn = document.createElement("button");
            deleteBtn.classList.add("task-btn", "danger");
            deleteBtn.textContent = "delete";
            deleteBtn.onclick = () => deleteTask(task.task_id);

            actions.appendChild(editBtn);
            actions.appendChild(doneBtn);
            actions.appendChild(stopBtn);
            actions.appendChild(skipBtn);
            actions.appendChild(deleteBtn);

            item.appendChild(dot);
            item.appendChild(taskText);
            item.appendChild(scoreTag);
            item.appendChild(actions);

            taskList.appendChild(item);
        });
    }

    function renderEmpty(msg) {
        const taskList = document.getElementById("tasklist");
        taskList.innerHTML = "";
        const empty = document.createElement("p");
        empty.id          = "noTaskText";
        empty.textContent = msg;
        taskList.appendChild(empty);
    }

    function updateCount(count) {
        const el = document.getElementById("taskCount");
        if (el) el.textContent = `${count} task${count !== 1 ? "s" : ""}`;
    }

    // ─────────────────────────────────────
    //  IMAGE PROCESSING (utility — kept)
    // ─────────────────────────────────────
    const imageInput      = document.getElementById("imageInput");
    const processImageBtn = document.getElementById("processImageBtn");
    const previewCanvas   = document.getElementById("previewCanvas");

    if (processImageBtn) {
        processImageBtn.addEventListener("click", async function () {
            const file = imageInput?.files[0];
            if (!file) { alert("Please select an image first."); return; }
            try {
                const result = await preprocessImage(file, {
                    size: 256, cropSquare: true, grayscale: false, output: "canvas"
                });
                if (previewCanvas) {
                    previewCanvas.style.display = "block";
                    previewCanvas.getContext("2d").drawImage(result.canvas, 0, 0);
                }
            } catch (err) {
                console.error("Image processing failed:", err);
            }
        });
    }

    // ─────────────────────────────────────
    //  INIT
    // ─────────────────────────────────────
    loadTasks();

}); // end DOMContentLoaded