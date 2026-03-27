// DeepFocus+ – Task logic (cleaned + fixed)
document.addEventListener("DOMContentLoaded", function () {
  // 1) Select elements
  const taskInput = document.getElementById("taskInput");
  const addTaskBtn = document.getElementById("addTaskBtn");
  const smartSortBtn = document.getElementById("smartSortBtn");

  /* =========================
     Smart Sort (Backend + Fallback)
     ========================= */
  smartSortBtn.addEventListener("click", async function () {
    let tasks = JSON.parse(localStorage.getItem("tasks")) || [];

    // Try backend first
    try {
      const response = await fetch("http://127.0.0.1:5000/api/priority", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasks: tasks }),
      });

      if (response.ok) {
        const data = await response.json();
        const scored = data.tasks || [];

        localStorage.setItem("tasks", JSON.stringify(scored));
        loadTasks();
        return;
      }
    } catch (err) {
      console.warn("Backend offline → using local scoring fallback");
    }

    // Fallback: local scoring
    tasks.forEach((t) => (t.score = computePriorityScore(t)));
    tasks.sort((a, b) => b.score - a.score);
    localStorage.setItem("tasks", JSON.stringify(tasks));
    loadTasks();
  });

  /* =========================
     Add Task
     ========================= */
  addTaskBtn.addEventListener("click", function () {
    let taskText = taskInput.value.trim();

    // Empty input guard
    if (taskText === "") {
      const status = document.getElementById("statusMessage");
      if (status) {
        status.textContent = "Please enter a task first!";
        status.style.display = "block";
        setTimeout(() => {
          status.textContent = "";
          status.style.display = "none";
        }, 3000);
      }
      return;
    }

    // Capitalise first letter
    taskText = taskText.charAt(0).toUpperCase() + taskText.slice(1);

    const priority = document.getElementById("priorityInput").value;
    const dueDateInput = document.getElementById("dueDateInput").value;

    let tasks = JSON.parse(localStorage.getItem("tasks")) || [];

    // Due date validation
    const dueDateValue = dueDateInput ? new Date(dueDateInput) : null;
    const today = new Date();

    if (dueDateValue && dueDateValue < today.setHours(0, 0, 0, 0)) {
      const status = document.getElementById("statusMessage");
      if (status) {
        status.textContent = "Due date must be in the future!";
        status.style.display = "block";
        setTimeout(() => {
          status.textContent = "";
          status.style.display = "none";
        }, 3000);
      }
      return;
    }

    // Build new task object
    tasks.push({
      text: taskText,
      importance: priority,
      dueDate: dueDateInput ? dueDateInput.trim() : null,
      createdAt: Date.now(),
      // Adaptive signals
      sessions: 0,
      focusMinutes: 0,
      interruptions: 0,
      completed: false,
      skipped: 0,
      adaptWeight: 0,
    });

    // Persist
    localStorage.setItem("tasks", JSON.stringify(tasks));

    // Clear fields
    taskInput.value = "";
    document.getElementById("dueDateInput").value = "";

    // Status message (safe)
    try {
      const status = document.getElementById("statusMessage");
      if (status) {
        status.textContent = "Task added successfully!";
        status.style.display = "block";
        setTimeout(() => {
          status.style.display = "none";
          status.textContent = "";
        }, 1500);
      }
    } catch (e) {
      console.log("statusMessage error", e);
    }

    // Refresh UI
    loadTasks();
  });

  /* =========================
     CRUD helpers
     ========================= */
  function deleteTask(index) {
    let tasks = JSON.parse(localStorage.getItem("tasks")) || [];
    tasks.splice(index, 1);
    localStorage.setItem("tasks", JSON.stringify(tasks));
    loadTasks();
  }

  function editTask(index) {
    let tasks = JSON.parse(localStorage.getItem("tasks")) || [];
    const isString = typeof tasks[index] === "string";
    const currentText = isString ? tasks[index] : tasks[index].text || "";

    const updatedTask = prompt("Edit your task:", currentText);

    if (updatedTask !== null && updatedTask.trim() !== "") {
      if (isString) {
        tasks[index] = {
          text: updatedTask.trim(),
          importance: "Medium",
          dueDate: null,
          createdAt: Date.now(),
        };
      } else {
        tasks[index].text = updatedTask.trim();
      }

      tasks[index].score = computePriorityScore(tasks[index]);
      localStorage.setItem("tasks", JSON.stringify(tasks));
      loadTasks();
    }
  }

  /* =========================
     Date helpers
     ========================= */
  function isDueToday(task) {
    if (!task.dueDate) return false;
    const today = new Date();
    const dueDate = new Date(task.dueDate);
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate.getTime() === today.getTime();
  }

  function isOverdue(task) {
    if (!task.dueDate) return false;
    const today = new Date();
    const dueDate = new Date(task.dueDate);
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate < today;
  }

  /* =========================
     Focus Session / Adaptive logic
     ========================= */
  function startSession(index) {
    const tasks = JSON.parse(localStorage.getItem("tasks")) || [];
    const t = tasks[index];
    if (!t) return;
    t._sessionStart = Date.now();
    localStorage.setItem("tasks", JSON.stringify(tasks));
  }

  function endSession(
    index,
    { minutes = 0, interruptions = 0, completed = false, skipped = false } = {}
  ) {
    const tasks = JSON.parse(localStorage.getItem("tasks")) || [];
    const t = tasks[index];
    if (!t) return;

    t.sessions = (t.sessions || 0) + 1;
    t.focusMinutes = (t.focusMinutes || 0) + Math.max(0, minutes);
    t.interruptions =
      (t.interruptions || 0) + Math.max(0, interruptions);
    if (completed) t.completed = true;
    if (skipped) t.skipped = (t.skipped || 0) + 1;

    const focusBoost = Math.min(30, minutes);
    const interruptPenalty = Math.min(20, interruptions * 3);
    const skipPenalty = Math.min(15, (t.skipped || 0) * 2);

    t.adaptWeight = clamp(
      (t.adaptWeight || 0) + focusBoost - interruptPenalty - skipPenalty,
      -40,
      40
    );

    localStorage.setItem("tasks", JSON.stringify(tasks));
    autoRerank();
    // Send score to backend
fetch("http://127.0.0.1:5000/tasks/score", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
        task_id: index,
        session_id: index,
        raw_score: minutes * 2,
        fatigue_level: t.interruptions || 0,
        streak: t.sessions || 0
    })
}).then(res => res.json())
  .then(data => console.log("Score saved:", data))
  .catch(err => console.warn("Backend offline:", err));

// Send session end to backend
fetch("http://127.0.0.1:5000/sessions/end", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
        task_id: index,
        session_id: index,
        duration: minutes,
        fatigue_level: t.interruptions || 0
    })
}).then(res => res.json())
  .then(data => console.log("Session saved:", data))
  .catch(err => console.warn("Backend offline:", err));
  }

  function autoRerank() {
    let tasks = JSON.parse(localStorage.getItem("tasks")) || [];
    tasks.forEach((tt) => (tt.score = computePriorityScore(tt)));
    tasks.sort((a, b) => b.score - a.score);
    localStorage.setItem("tasks", JSON.stringify(tasks));
    loadTasks();
  }

  function clamp(x, lo, hi) {
    return Math.max(lo, Math.min(hi, x));
  }

  /* =========================
     Load + Render Tasks
     ========================= */
  function loadTasks() {
    let tasks = JSON.parse(localStorage.getItem("tasks") || "[]");

    // Migrate old string tasks → object shape
    const migrated = tasks.map((item) => {
      if (typeof item === "string") {
        return {
          text: item,
          importance: "Medium",
          dueDate: null,
          createdAt: Date.now(),
          sessions: 0,
          focusMinutes: 0,
          interruptions: 0,
          completed: false,
          skipped: 0,
          adaptWeight: 0,
        };
      }
      return item;
    });

    // Score + sort
    migrated.forEach((t) => (t.score = computePriorityScore(t)));
    migrated.sort((a, b) => b.score - a.score);
    localStorage.setItem("tasks", JSON.stringify(migrated));

    const taskList = document.getElementById("tasklist");
    taskList.innerHTML = "";

    if (migrated.length === 0) {
      const noTaskText = document.createElement("p");
      noTaskText.id = "noTaskText";
      noTaskText.textContent =
        "No tasks available. Add a task to get started!";
      taskList.appendChild(noTaskText);
      return;
    }

    migrated.forEach((taskobj, index) => {
      const taskItem = document.createElement("div");
      taskItem.classList.add("task");

      // Priority styling
      if (taskobj.importance === "High") {
        taskItem.classList.add("high");
      } else if (taskobj.importance === "Medium") {
        taskItem.classList.add("medium");
      } else {
        taskItem.classList.add("low");
      }

      // Overdue / today markers
      if (isOverdue(taskobj)) {
        const dot = document.createElement("span");
        dot.classList.add("overdue-dot");
        taskItem.prepend(dot);
      } else if (isDueToday(taskobj)) {
        const dot = document.createElement("span");
        dot.classList.add("today-dot");
        taskItem.prepend(dot);
      }

      const taskText = document.createElement("span");
      taskText.textContent = taskobj.text + "  ";

      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "Delete";
      deleteBtn.addEventListener("click", function () {
        deleteTask(index);
      });

      const editBtn = document.createElement("button");
      editBtn.textContent = "Edit";
      editBtn.addEventListener("click", function () {
        editTask(index);
      });

      // Session control buttons
      const completeBtn = document.createElement("button");
      completeBtn.textContent = "Done 25m";
      completeBtn.onclick = () =>
        endSession(index, {
          minutes: 25,
          interruptions: 0,
          completed: true,
        });

      const skipBtn = document.createElement("button");
      skipBtn.textContent = "Skip";
      skipBtn.onclick = () =>
        endSession(index, {
          minutes: 0,
          interruptions: 0,
          skipped: true,
        });

      const startBtn = document.createElement("button");
      startBtn.textContent = "Start";
      startBtn.onclick = () => startSession(index);

      const stopBtn = document.createElement("button");
      stopBtn.textContent = "Stop(15m,1i)";
      stopBtn.onclick = () =>
        endSession(index, { minutes: 15, interruptions: 1 });

      // Assemble task item
      taskItem.appendChild(taskText);
      taskItem.appendChild(editBtn);
      taskItem.appendChild(deleteBtn);
      taskItem.appendChild(completeBtn);
      taskItem.appendChild(skipBtn);
      taskItem.appendChild(startBtn);
      taskItem.appendChild(stopBtn);

      taskList.appendChild(taskItem);
    });
  }

  /* =========================
     Scoring
     ========================= */
  function computePriorityScore(t) {
    let score = 0;

    // 1. Importance weighting
    const importanceWeight = {
        High: 5,
        Medium: 3,
        Low: 1
    };
    score += importanceWeight[t.importance] || 0;

    // 2. Deadline scoring
    if (t.dueDate) {
        const due = new Date(t.dueDate);
        const now = new Date();
        const diffDays = (due - now) / (1000 * 60 * 60 * 24);

        if (diffDays <= 1) score += 4;
        else if (diffDays <= 3) score += 3;
        else if (diffDays <= 7) score += 2;
        else score += 1;
    }

    // 3. Task age
    if (t.createdAt) {
        const ageDays =
            (Date.now() - new Date(t.createdAt)) / (1000 * 60 * 60 * 24);

        if (ageDays > 14) score += 3;
        else if (ageDays > 7) score += 2;
        else if (ageDays > 3) score += 1;
    }

    // 4. Incomplete bonus
    if (!t.completed) score += 1;

    // 5. Quick-win boost
    if (t.duration && Number(t.duration) <= 30) {
        score += 10;
    }

    // 6. Adaptive weight (bounded)
    const w = Math.max(-40, Math.min(40, Number(t.adaptWeight || 0)));
    score += w;

    return score;
}


  // Initial load
  loadTasks();
});
