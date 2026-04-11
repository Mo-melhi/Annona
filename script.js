// ==================== DATA ====================
const AVATARS = {
    Mohammed: 'avatar.jpg',
    Ali: 'avatar.jpg',
    Sara: 'avatar.jpg',
    Fatima: 'avatar.jpg'
};

const teamMembers = [
    { name: 'Mohammed', role: 'Team Lead', tasksCompleted: 12, hoursLogged: 24, activityActions: 15, avatar: AVATARS.Mohammed },
    { name: 'Ali', role: 'Developer', tasksCompleted: 9, hoursLogged: 18, activityActions: 12, avatar: AVATARS.Ali },
    { name: 'Sara', role: 'Designer', tasksCompleted: 11, hoursLogged: 22, activityActions: 18, avatar: AVATARS.Sara },
    { name: 'Fatima', role: 'Researcher', tasksCompleted: 7, hoursLogged: 14, activityActions: 8, avatar: AVATARS.Fatima }
];

let tasks = [
    { id: 1, title: 'Design login page UI', assignee: 'Sara', due: '2026-04-12', status: 'done' },
    { id: 2, title: 'Set up project structure', assignee: 'Mohammed', due: '2026-04-10', status: 'done' },
    { id: 3, title: 'Create database schema', assignee: 'Ali', due: '2026-04-14', status: 'inprogress' },
    { id: 4, title: 'Write API documentation', assignee: 'Fatima', due: '2026-04-15', status: 'inprogress' },
    { id: 5, title: 'Implement task board', assignee: 'Mohammed', due: '2026-04-16', status: 'inprogress' },
    { id: 6, title: 'Design team dashboard', assignee: 'Sara', due: '2026-04-18', status: 'todo' },
    { id: 7, title: 'User authentication flow', assignee: 'Ali', due: '2026-04-17', status: 'todo' },
    { id: 8, title: 'Research analytics tools', assignee: 'Fatima', due: '2026-04-19', status: 'todo' },
    { id: 9, title: 'Create contribution algorithm', assignee: 'Mohammed', due: '2026-04-11', status: 'done' },
    { id: 10, title: 'Design notification system', assignee: 'Sara', due: '2026-04-13', status: 'done' },
    { id: 11, title: 'Build activity log component', assignee: 'Ali', due: '2026-04-20', status: 'todo' },
    { id: 12, title: 'Write unit tests', assignee: 'Mohammed', due: '2026-04-12', status: 'done' }
];

const activityLog = [
    { user: 'Mohammed', action: 'completed task', target: 'Write unit tests', type: 'completed', time: '2 minutes ago' },
    { user: 'Sara', action: 'completed task', target: 'Design notification system', type: 'completed', time: '15 minutes ago' },
    { user: 'Ali', action: 'moved task to In Progress', target: 'Create database schema', type: 'updated', time: '30 minutes ago' },
    { user: 'Fatima', action: 'created a new task', target: 'Research analytics tools', type: 'created', time: '1 hour ago' },
    { user: 'Mohammed', action: 'completed task', target: 'Create contribution algorithm', type: 'completed', time: '2 hours ago' },
    { user: 'Sara', action: 'updated task status', target: 'Design login page UI', type: 'updated', time: '3 hours ago' },
    { user: 'Ali', action: 'created a new task', target: 'Build activity log component', type: 'created', time: '4 hours ago' },
    { user: 'Mohammed', action: 'completed task', target: 'Set up project structure', type: 'completed', time: '5 hours ago' },
    { user: 'Fatima', action: 'moved task to In Progress', target: 'Write API documentation', type: 'updated', time: '6 hours ago' },
    { user: 'Sara', action: 'completed task', target: 'Design login page UI', type: 'completed', time: '1 day ago' }
];

let nextTaskId = 13;
let isLoginMode = true;
let draggedTaskId = null;

// ==================== AUTH ====================
function toggleAuth(e) {
    e.preventDefault();
    isLoginMode = !isLoginMode;
    const title = document.getElementById('auth-title');
    const subtitle = document.getElementById('auth-subtitle');
    const nameField = document.getElementById('name-field');
    const btn = document.getElementById('auth-btn');
    const toggleText = document.getElementById('auth-toggle-text');
    const toggleLink = document.getElementById('auth-toggle-link');

    if (isLoginMode) {
        title.textContent = 'Welcome Back';
        subtitle.textContent = 'Sign in to your account';
        nameField.classList.add('hidden');
        btn.textContent = 'Sign In';
        toggleText.textContent = "Don't have an account?";
        toggleLink.textContent = 'Register';
    } else {
        title.textContent = 'Create Account';
        subtitle.textContent = 'Join your team on Annona';
        nameField.classList.remove('hidden');
        btn.textContent = 'Register';
        toggleText.textContent = 'Already have an account?';
        toggleLink.textContent = 'Sign In';
    }
}

function handleAuth() {
    document.getElementById('auth-page').classList.remove('active');
    document.getElementById('auth-page').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    initApp();
}

function logout(e) {
    e.preventDefault();
    document.getElementById('app').classList.add('hidden');
    document.getElementById('auth-page').classList.remove('hidden');
    document.getElementById('auth-page').classList.add('active');
    document.getElementById('user-dropdown').classList.add('hidden');
}

// ==================== NAVIGATION ====================
function navigateTo(page, element) {
    document.querySelectorAll('.content-page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));

    document.getElementById('page-' + page).classList.add('active');
    if (element) element.classList.add('active');

    if (page === 'analytics') {
        setTimeout(renderCharts, 100);
    }

    // Close sidebar on mobile
    if (window.innerWidth <= 768) {
        document.getElementById('sidebar').classList.remove('open');
    }
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
}

function toggleUserMenu() {
    document.getElementById('user-dropdown').classList.toggle('hidden');
}

// Close dropdown on outside click
document.addEventListener('click', function(e) {
    const userMenu = document.querySelector('.nav-user');
    const dropdown = document.getElementById('user-dropdown');
    if (dropdown && !userMenu.contains(e.target)) {
        dropdown.classList.add('hidden');
    }
});

// ==================== INIT APP ====================
function initApp() {
    renderTasks();
    renderTeam();
    renderLeaderboard();
    renderActivityLog();
    renderDashboard();
    updateStats();
}

// ==================== DASHBOARD ====================
function renderDashboard() {
    const recentList = document.getElementById('recent-tasks-list');
    const miniActivity = document.getElementById('mini-activity-list');

    const recentTasks = tasks.slice(0, 5);
    recentList.innerHTML = recentTasks.map(t => `
        <div class="recent-task-item">
            <span class="task-name">${t.title}</span>
            <span class="status-badge status-${t.status}">${formatStatus(t.status)}</span>
        </div>
    `).join('');

    const recentActivities = activityLog.slice(0, 5);
    miniActivity.innerHTML = recentActivities.map(a => `
        <div class="mini-activity-item">
            <span class="activity-dot"></span>
            <div>
                <div><strong>${a.user}</strong> ${a.action} '${a.target}'</div>
                <div class="activity-time">${a.time}</div>
            </div>
        </div>
    `).join('');
}

function formatStatus(status) {
    const map = { todo: 'To Do', inprogress: 'In Progress', done: 'Done' };
    return map[status] || status;
}

function updateStats() {
    const completed = tasks.filter(t => t.status === 'done').length;
    const inProgress = tasks.filter(t => t.status === 'inprogress').length;
    document.getElementById('stat-completed').textContent = completed;
    document.getElementById('stat-progress').textContent = inProgress;

    const mohammed = teamMembers.find(m => m.name === 'Mohammed');
    const score = calculateScore(mohammed);
    document.getElementById('stat-score').textContent = score;
}

function calculateScore(member) {
    return (member.tasksCompleted * 5) + (member.hoursLogged * 2) + (member.activityActions * 1);
}

// ==================== TASK BOARD ====================
function renderTasks() {
    const columns = { todo: [], inprogress: [], done: [] };
    tasks.forEach(t => {
        if (columns[t.status]) columns[t.status].push(t);
    });

    Object.keys(columns).forEach(status => {
        const container = document.getElementById('tasks-' + status);
        const count = document.getElementById('count-' + status);
        count.textContent = columns[status].length;

        container.innerHTML = columns[status].map(t => `
            <div class="task-card" draggable="true" data-id="${t.id}" data-status="${t.status}"
                 ondragstart="dragStart(event, ${t.id})" ondragend="dragEnd(event)">
                <div class="task-card-title">${t.title}</div>
                <div class="task-card-meta">
                    <div class="task-card-assignee">
                        <img src="${AVATARS[t.assignee] || AVATARS.Mohammed}" alt="${t.assignee}">
                        <span>${t.assignee}</span>
                    </div>
                    <span class="task-card-due">📅 ${formatDate(t.due)}</span>
                </div>
                <div class="task-card-actions">
                    ${t.status !== 'done' ? `<button onclick="moveTask(${t.id}, '${getNextStatus(t.status)}')">Move →</button>` : ''}
                    <button onclick="deleteTask(${t.id})">Delete</button>
                </div>
            </div>
        `).join('');
    });
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[date.getMonth()] + ' ' + date.getDate();
}

function getNextStatus(status) {
    const flow = { todo: 'inprogress', inprogress: 'done' };
    return flow[status] || status;
}

function moveTask(id, newStatus) {
    const task = tasks.find(t => t.id === id);
    if (task) {
        const oldStatus = task.status;
        task.status = newStatus;
        renderTasks();
        updateStats();
        renderDashboard();

        activityLog.unshift({
            user: task.assignee,
            action: `moved task to ${formatStatus(newStatus)}`,
            target: task.title,
            type: 'updated',
            time: 'Just now'
        });
        renderActivityLog();
    }
}

function deleteTask(id) {
    tasks = tasks.filter(t => t.id !== id);
    renderTasks();
    updateStats();
    renderDashboard();
}

// ==================== DRAG AND DROP ====================
function dragStart(e, id) {
    draggedTaskId = id;
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
}

function dragEnd(e) {
    e.target.classList.remove('dragging');
    draggedTaskId = null;
    document.querySelectorAll('.kanban-column').forEach(col => col.classList.remove('drag-over'));
}

function allowDrop(e) {
    e.preventDefault();
}

function dragEnter(e) {
    e.preventDefault();
    const column = e.currentTarget;
    column.classList.add('drag-over');
}

function dragLeave(e) {
    const column = e.currentTarget;
    if (!column.contains(e.relatedTarget)) {
        column.classList.remove('drag-over');
    }
}

function dropTask(e, newStatus) {
    e.preventDefault();
    const column = e.currentTarget;
    column.classList.remove('drag-over');

    if (draggedTaskId !== null) {
        moveTask(draggedTaskId, newStatus);
        draggedTaskId = null;
    }
}

// ==================== TASK MODAL ====================
function openTaskModal() {
    document.getElementById('task-modal').classList.remove('hidden');
    document.getElementById('task-title').value = '';
    document.getElementById('task-assignee').value = 'Mohammed';
    document.getElementById('task-due').value = '';
    document.getElementById('task-status').value = 'todo';
    document.getElementById('task-title').focus();
}

function closeTaskModal() {
    document.getElementById('task-modal').classList.add('hidden');
}

function addTask() {
    const title = document.getElementById('task-title').value.trim();
    const assignee = document.getElementById('task-assignee').value;
    const due = document.getElementById('task-due').value;
    const status = document.getElementById('task-status').value;

    if (!title) {
        document.getElementById('task-title').style.borderColor = '#ef4444';
        return;
    }

    tasks.push({
        id: nextTaskId++,
        title: title,
        assignee: assignee,
        due: due || '2026-04-20',
        status: status
    });

    activityLog.unshift({
        user: assignee,
        action: 'created a new task',
        target: title,
        type: 'created',
        time: 'Just now'
    });

    closeTaskModal();
    renderTasks();
    updateStats();
    renderDashboard();
    renderActivityLog();
}

// Close modal on overlay click
document.addEventListener('click', function(e) {
    if (e.target.id === 'task-modal') {
        closeTaskModal();
    }
});

// ==================== TEAM ====================
function renderTeam() {
    const grid = document.getElementById('team-grid');
    const sorted = [...teamMembers].sort((a, b) => calculateScore(b) - calculateScore(a));
    const topName = sorted[0].name;

    grid.innerHTML = teamMembers.map(m => {
        const score = calculateScore(m);
        const totalScore = teamMembers.reduce((sum, mem) => sum + calculateScore(mem), 0);
        const percentage = Math.round((score / totalScore) * 100);
        const isTop = m.name === topName;

        return `
            <div class="team-card ${isTop ? 'top-contributor' : ''}">
                <img src="${m.avatar}" alt="${m.name}" class="team-avatar">
                <h4>${m.name}</h4>
                <p class="team-role">${m.role}</p>
                <div class="team-stats">
                    <div class="team-stat">
                        <div class="stat-value">${m.tasksCompleted}</div>
                        <div class="stat-label">Tasks</div>
                    </div>
                    <div class="team-stat">
                        <div class="stat-value">${percentage}%</div>
                        <div class="stat-label">Contribution</div>
                    </div>
                    <div class="team-stat">
                        <div class="stat-value">${score}</div>
                        <div class="stat-label">Score</div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function renderLeaderboard() {
    const board = document.getElementById('leaderboard');
    const sorted = [...teamMembers].sort((a, b) => calculateScore(b) - calculateScore(a));
    const maxScore = calculateScore(sorted[0]);

    board.innerHTML = sorted.map((m, i) => {
        const score = calculateScore(m);
        const barWidth = Math.round((score / maxScore) * 100);
        const rankClass = i === 0 ? 'rank-1' : '';
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i + 1);

        return `
            <div class="leaderboard-row ${rankClass}">
                <span class="leaderboard-rank">${medal}</span>
                <img src="${m.avatar}" alt="${m.name}" class="leaderboard-avatar">
                <div class="leaderboard-info">
                    <div class="leaderboard-name">${m.name}</div>
                    <div class="leaderboard-tasks">${m.tasksCompleted} tasks completed</div>
                </div>
                <div class="leaderboard-bar">
                    <div class="leaderboard-bar-fill" style="width: ${barWidth}%"></div>
                </div>
                <span class="leaderboard-score">${score}</span>
            </div>
        `;
    }).join('');
}

// ==================== ANALYTICS ====================
let pieChartInstance = null;
let barChartInstance = null;

function renderCharts() {
    renderPieChart();
    renderBarChart();
    renderFormulaBreakdown();
}

function renderPieChart() {
    const ctx = document.getElementById('pieChart');
    if (!ctx) return;

    if (pieChartInstance) pieChartInstance.destroy();

    const labels = teamMembers.map(m => m.name);
    const scores = teamMembers.map(m => calculateScore(m));
    const totalScore = scores.reduce((a, b) => a + b, 0);
    const percentages = scores.map(s => Math.round((s / totalScore) * 100));

    pieChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: percentages,
                backgroundColor: ['#0b2e53', '#3b82f6', '#22c55e', '#f59e0b'],
                borderWidth: 3,
                borderColor: '#ffffff',
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 16,
                        usePointStyle: true,
                        font: { family: 'Poppins', size: 12 }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.label + ': ' + context.raw + '%';
                        }
                    }
                }
            }
        }
    });
}

function renderBarChart() {
    const ctx = document.getElementById('barChart');
    if (!ctx) return;

    if (barChartInstance) barChartInstance.destroy();

    barChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: teamMembers.map(m => m.name),
            datasets: [{
                label: 'Tasks Completed',
                data: teamMembers.map(m => m.tasksCompleted),
                backgroundColor: ['#0b2e53', '#3b82f6', '#22c55e', '#f59e0b'],
                borderRadius: 8,
                borderSkipped: false,
                barThickness: 40
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 2,
                        font: { family: 'Poppins', size: 12 }
                    },
                    grid: { color: '#f0f0f0' }
                },
                x: {
                    ticks: {
                        font: { family: 'Poppins', size: 12 }
                    },
                    grid: { display: false }
                }
            }
        }
    });
}

function renderFormulaBreakdown() {
    const container = document.getElementById('formula-breakdown');
    container.innerHTML = teamMembers.map(m => {
        const score = calculateScore(m);
        return `
            <div class="formula-member">
                <div class="member-name">${m.name}</div>
                <div class="member-calc">
                    Tasks: ${m.tasksCompleted} × 5 = ${m.tasksCompleted * 5}<br>
                    Hours: ${m.hoursLogged} × 2 = ${m.hoursLogged * 2}<br>
                    Actions: ${m.activityActions} × 1 = ${m.activityActions}
                </div>
                <div class="member-total">Total: ${score}</div>
            </div>
        `;
    }).join('');
}

// ==================== ACTIVITY LOG ====================
function renderActivityLog() {
    const timeline = document.getElementById('activity-timeline');
    timeline.innerHTML = activityLog.map(a => `
        <div class="timeline-item type-${a.type}">
            <div class="timeline-content">
                <div class="timeline-text"><strong>${a.user}</strong> ${a.action} '${a.target}'</div>
                <div class="timeline-time">${a.time}</div>
            </div>
        </div>
    `).join('');
}

// ==================== KEYBOARD SHORTCUTS ====================
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeTaskModal();
    }
});

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', function() {
    // Set default date for task modal
    const today = new Date().toISOString().split('T')[0];
    const dueInput = document.getElementById('task-due');
    if (dueInput) dueInput.value = today;
});