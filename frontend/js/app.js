// 1: Select elements from input

const taskInput = document.getElementById('taskInput');
const priority = document.getElementById('priorityInput').value;
const addTaskBtn = document.getElementById('addTaskBtn');
const smartSortBtn = document.getElementById('smartSortBtn');
// Add event listener for smart Sort Button
smartSortBtn.addEventListener('click',function(){
    let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    // Recompute score for each task
    tasks.forEach(t => t.score = computePriorityScore(t));
    //Sort By Score )highest first
    tasks.sort((a,b) => b.score - a.score);
    // Save sorted list back to storage
    localStorage.setItem('tasks',JSON.stringify(tasks));
    //Reload UI
    loadTasks();
});
// 2: Add event listener for button click and define add task function
addTaskBtn.addEventListener('click', function () {
    // 3: Read input value
    let taskText = taskInput.value.trim();
    if (taskText == '') {
    const status = document.getElementById('statusMessage');
    status.textContent = 'Please enter a task first!';
    status.style.display = 'block';
setTimeout(() => {
  status.textContent = '';
  status.style.display = 'none';
}, 3000);

    return;
}

    taskText= taskText.charAt(0).toUpperCase()+ taskText.slice(1);
    // 4: Check if input isn't empty
    if (taskText !== '') {
        // 5: Save to localStorage
        let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
        const dueDateInput = document.getElementById('dueDateInput').value;
        // Convert input to Date object
const dueDateValue = dueDateInput ? new Date(dueDateInput) : null;
const today = new Date();

// Check if the date is valid and not in the past
if (dueDateValue && dueDateValue < today.setHours(0,0,0,0)) {
    const status = document.getElementById('statusMessage');
    status.textContent = 'Due date must be in the future!';
    status.style.display = 'block';
    setTimeout(() => { status.textContent = ''; }, 3000);
    return;
}

// this part runs only if the date is valid
const priority = document.getElementById('priorityInput').value;

tasks.push({
  text: taskText,
  importance: priority,
  dueDate: dueDateInput ? dueDateInput.trim() : null,
  createdAt: Date.now(),
  // NEW (adaptive signals)
  sessions: 0,              // how many focus sessions
  focusMinutes: 0,          // total focused minutes
  interruptions: 0,         // total distractions
  completed: false,         // toggled on finish
  skipped: 0,               // times you opened but didn’t work
  adaptWeight: 0            // learned weight added to score
});


// 6: Clear input fields
taskInput.value = '';
const status = document.getElementById('statusMessage');
status.textContent = 'Task added successfully!';
setTimeout(() => {
   status.textContent = '';
},3000)
document.getElementById('dueDateInput').value = '';


// Reload the task list to show new task
loadTasks();

    } else {
        alert('Please enter a task!');
    }
});
// Function to delete task
function deleteTask(index) {
    let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    tasks.splice(index,1); //Removes 1 item at the given index
    localStorage.setItem('tasks',JSON.stringify(tasks));
    loadTasks()    // Refresh the tasks by calling load tasks function
}
// Function to edit task
function editTask(index) {
    let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    // Handle both shapes
    const isString = (typeof tasks[index] === 'string');
    const currentText = isString ? tasks[index] : (tasks[index].text || '');
    const updatedTask = prompt("Edit your task : ",currentText );

    // Check if user updated task and new input is not empty
    if (updatedTask !== null && updatedTask.trim() !== '') {
        if (isString) {
            //upgrade to object on Edit
            tasks[index] = {
                text : updatedTask.trim(),
                importance: 'Medium',
                dueDate: null,
                createdAt : Date.now()
            };
        }
        else {
            tasks[index].text = updatedTask.trim();
        }
        // Recompute score after edit
        tasks[index].score = computePriorityScore(tasks[index]);
        
        // Save the updated tasks
        localStorage.setItem('tasks',JSON.stringify(tasks));
        loadTasks();
    
    }
    
}
function isDueToday(task) {
  if (!task.dueDate) return false;
  const today = new Date();
  const dueDate = new Date(task.dueDate);
  today.setHours(0,0,0,0);
  dueDate.setHours(0,0,0,0);
  return dueDate.getTime() === today.getTime();
}

function isOverdue(task) {
    if (!task.dueDate) { return false; }; //Skip if task has no due date
    const today = new Date();
    const dueDate = new Date(task.dueDate);
    //Remove hours and minutes as we only care about the task date
    today.setHours(0,0,0,0);
    dueDate.setHours(0,0,0,0);
    return dueDate < today; //True if due date is before today
}
function startSession(index) {
  const tasks = JSON.parse(localStorage.getItem('tasks')) || [];
  const t = tasks[index]; if (!t) return;
  t._sessionStart = Date.now();      // temp marker
  localStorage.setItem('tasks', JSON.stringify(tasks));
}

function endSession(index, { minutes=0, interruptions=0, completed=false, skipped=false } = {}) {
  const tasks = JSON.parse(localStorage.getItem('tasks')) || [];
  const t = tasks[index]; if (!t) return;

  // accumulate signals
  t.sessions = (t.sessions||0) + 1;
  t.focusMinutes = (t.focusMinutes||0) + Math.max(0, minutes);
  t.interruptions = (t.interruptions||0) + Math.max(0, interruptions);
  if (completed) t.completed = true;
  if (skipped)   t.skipped = (t.skipped||0) + 1;

  // lightweight adaptive rule-of-thumb:
  // + focus time boosts, interruptions/skip penalise
  const focusBoost = Math.min(30, minutes);     // cap boost
  const interruptPenalty = Math.min(20, interruptions * 3);
  const skipPenalty = Math.min(15, (t.skipped||0) * 2);

  // keep adaptWeight bounded (-40..+40)
  t.adaptWeight = clamp((t.adaptWeight||0) + focusBoost - interruptPenalty - skipPenalty, -40, 40);

  // persist and re-rank
  localStorage.setItem('tasks', JSON.stringify(tasks));
  autoRerank(); // re-sort UI after each session
}

function autoRerank() {
  let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
  tasks.forEach(tt => tt.score = computePriorityScore(tt));
  tasks.sort((a,b) => b.score - a.score);
  localStorage.setItem('tasks', JSON.stringify(tasks));
  loadTasks();
}

function clamp(x, lo, hi){ return Math.max(lo, Math.min(hi, x)); }

// 7: Function to load and display tasks
function loadTasks() {
  
    let tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    
    // Migrate old tasks strings into objects (once
    const migrated = tasks.map( item => {
        if (typeof item === 'string') {
            return {
                text : item , 
                importance : 'Medium', //default for now
                dueDate : null , // default value is null
                createdAt : Date.now()
            };
        } return item;
    });
    
    // 2: Compute a score for each task and sort high to low
    migrated.forEach(t=>t.score = computePriorityScore(t));
    migrated.sort((a,b) => b.score - a.score);

    // 3) Save back (so indices match your buttons after sorting)
    localStorage.setItem('tasks',JSON.stringify(migrated));
    // 4) Render
    const taskList = document.getElementById('tasklist');
    taskList.innerHTML = '';
    if (migrated.length === 0) {
    const noTaskText = document.createElement('p'); // create <p> element
    noTaskText.id = 'noTaskText';                   // set id
    noTaskText.textContent = 'No tasks available. Add a task to get started!';
    taskList.appendChild(noTaskText);               // append to taskList
    return;                                         // stop function
}


    migrated.forEach((taskobj,index) => {
        const taskItem = document.createElement('div');
        taskItem.classList.add('task'); // base style for all

        if (taskobj.importance === 'High') {
        taskItem.classList.add('high');
        } else if (taskobj.importance === 'Medium') {
        taskItem.classList.add('medium');
        } else {
        taskItem.classList.add('low');
       }

        if (isOverdue(taskobj)) {
            console.log(taskobj.text + 'is overdue!');
        }
         // show text + (optional) quick hint of score
         const taskText = document.createElement('span');
         taskText.textContent = taskobj.text + '  ';
         // const scoreBadge = document.createElement('small');
         // scoreBadge.textContent = `(score :${taskobj.score})`;

         const deleteBtn = document.createElement('button');
         deleteBtn.textContent = 'Delete';
         deleteBtn.addEventListener('click',function(){
            deleteTask(index);
         });
        const editBtn = document.createElement('button');
        editBtn.textContent = 'Edit';
        editBtn.addEventListener('click',function(){
            editTask(index);
        const completeBtn = document.createElement('button');
        completeBtn.textContent = 'Done 25m';
        completeBtn.onclick = () => endSession(index, { minutes: 25, interruptions: 0, completed: true });

        const skipBtn = document.createElement('button');
        skipBtn.textContent = 'Skip';
        skipBtn.onclick = () => endSession(index, { minutes: 0, interruptions: 0, skipped: true });

        taskItem.appendChild(completeBtn);
        taskItem.appendChild(skipBtn);
        const startBtn = document.createElement('button');
        startBtn.textContent = 'Start';
        startBtn.onclick = () => startSession(index);

        const stopBtn = document.createElement('button');
        stopBtn.textContent = 'Stop(15m,1i)';
        stopBtn.onclick = () => endSession(index, { minutes: 15, interruptions: 1 });

        taskItem.appendChild(startBtn);
        taskItem.appendChild(stopBtn);

        });
        
        // Add overdue or today dot
        if (isOverdue(taskobj)) {
        const dot = document.createElement('span');
        dot.classList.add('overdue-dot');
        taskItem.prepend(dot);
        } else if (isDueToday(taskobj)) {
        const dot = document.createElement('span');
        dot.classList.add('today-dot');
        taskItem.prepend(dot);
    }



        taskItem.appendChild(taskText);
        // taskItem.appendChild(scoreBadge);
        taskItem.appendChild(editBtn);
        taskItem.appendChild(deleteBtn);
        taskList.appendChild(taskItem);
    });
}
function computePriorityScore(taskobj) {
    // 1) Normalize if we received a plain string, wrap it
    const t = (typeof taskobj === 'string')
    ? {text : taskobj , importance: 'Medium' , dueDate : null , createdAt : Date.now()}
    : taskobj;

    let score = 0;
    // 2) Importance points
    const imp = (t.importance || 'Medium').toLowerCase();
    if (imp === 'high') score += 40;
    if (imp === 'medium') score +=20;
    if (imp === 'low') score +=5;

     // 3) Deadline proximity points (if dueDate exists, format yyyy-mm-dd)
     if (t.dueDate) {
        const today = new Date();
        const due = new Date(t.dueDate);
        const msPerDay = 24 * 60 * 60 * 1000;
        const daysLeft = Math.ceil((due - today) / msPerDay);
        
        if (daysLeft <= 1) score += 50;
        else if (daysLeft <= 3) score += 30;
        else if (daysLeft <= 7) score += 15;
        else if (daysLeft <= 14) score +=10;
        else if (daysLeft < 14) score +=5;

    
     }
     // Quick win bonus if duration (in minutes) is small
     if (t.duration && Number(t.duration) <= 30) score += 10;

     return score;
    // Quick win bonus for short-duration tasks
  if (t.duration && Number(t.duration) <= 30) score += 10;

  // NEW: add learned adaptive weight (bounded)
  const w = Math.max(-40, Math.min(40, Number(t.adaptWeight || 0)));
  score += w;

  return score;
}

// Call loadTasks when page loads
window.onload = loadTasks;
