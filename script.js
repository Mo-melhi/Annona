import { auth, db } from "./firebase.js";
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
    collection,
    addDoc,
    doc,
    updateDoc,
    deleteDoc,
    onSnapshot,
    serverTimestamp,
    query,
    orderBy,
    setDoc,
    getDocs,
    getDoc,
    where
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


let tasks = [];
let isLoginMode = true;
let currentUser = null;
let currentTeamId = null;
let userTeams = [];
let currentUserName = "User";
let unsubscribeTasks = null;
let unsubscribeActivity = null;
let teamUsers = [];
let activityData = [];
let isTeamOwner = false;

async function removeMember(userId, userName) {
    if (!isTeamOwner) return;

    const confirmDelete = confirm(`Remove ${userName} from team?`);
    if (!confirmDelete) return;

    if (userId === currentUser.uid) {
    alert("You cannot remove yourself");
    return;
}

    try {
        
        // 🔥 1. Remove from teamMembers
        const q = query(
            collection(db, "teamMembers"),
            where("userId", "==", userId),
            where("teamId", "==", currentTeamId)
        );

        const snapshot = await getDocs(q);

        for (const docSnap of snapshot.docs) {
            await deleteDoc(doc(db, "teamMembers", docSnap.id));
        }

        // 🔥 2. Delete their tasks
        const taskQuery = query(
            collection(db, "tasks"),
            where("assigneeId", "==", userId),
            where("teamId", "==", currentTeamId)
        );

        const taskSnap = await getDocs(taskQuery);

        for (const docSnap of taskSnap.docs) {
            await deleteDoc(doc(db, "tasks", docSnap.id));
        }

        // 🔥 3. Delete their activity
        const activityQuery = query(
            collection(db, "activity"),
            where("user", "==", userName),
            where("teamId", "==", currentTeamId)
        );

        const activitySnap = await getDocs(activityQuery);

        for (const docSnap of activitySnap.docs) {
            await deleteDoc(doc(db, "activity", docSnap.id));
        }

        alert(`${userName} removed from team`);

        // 🔄 Refresh UI
        await loadTeamUsers();
        renderTeam();
        renderLeaderboard();

    } catch (error) {
        console.error("Error removing member:", error);
    }
}

async function checkIfOwner() {
    if (!currentUser || !currentTeamId) return;

    const teamDoc = await getDoc(doc(db, "teams", currentTeamId));
    const teamData = teamDoc.data();

    isTeamOwner = teamData.ownerId === currentUser.uid;
}

async function saveTeam() {
    const newName = document.getElementById("settings-team-name").value.trim();

    if (!newName) {
        alert("Team name cannot be empty");
        return;
    }

    await updateDoc(doc(db, "teams", currentTeamId), {
        name: newName
    });

    alert("Team updated!");

    // refresh dropdown
    await loadUserTeams(currentUser.uid);
}

async function saveProfile() {
    const newName = document.getElementById("settings-name").value.trim();

    if (!newName) {
        alert("Name cannot be empty");
        return;
    }

    await updateDoc(doc(db, "users", currentUser.uid), {
        name: newName
    });

    currentUserName = newName;

    // update UI instantly
    document.querySelector('.nav-username').textContent = newName;
    document.getElementById("welcome-name").textContent = newName;

    alert("Profile updated!");
}

async function loadSettings() {
    if (!currentUser) return;

    // 🔥 User data
    const userDoc = await getDoc(doc(db, "users", currentUser.uid));
    const userData = userDoc.data();

    document.getElementById("settings-name").value = userData.name || "";
    document.getElementById("settings-email").value = userData.email || "";

    // 🔥 Team data
    if (currentTeamId) {
        const teamDoc = await getDoc(doc(db, "teams", currentTeamId));
        const teamData = teamDoc.data();

        document.getElementById("settings-team-name").value = teamData.name || "";
    }
}

function getUserTaskStats(userId) {
    const userTasks = tasks.filter(t => t.assigneeId === userId);

    const completed = userTasks.filter(t => t.status === "done").length;
    const inProgress = userTasks.filter(t => t.status === "inprogress").length;
    const total = userTasks.length;

    return {
        completed,
        inProgress,
        total
    };
}

function renderAssigneeOptions() {
    const select = document.getElementById("task-assignee");

    select.innerHTML = teamUsers.map(user => `
        <option value="${user.id}">${user.name}</option>
    `).join('');
}

async function loadTeamUsers() {
    if (!currentTeamId) return;

    const q = query(
        collection(db, "teamMembers"),
        where("teamId", "==", currentTeamId)
    );

    const snapshot = await getDocs(q);

    teamUsers = [];

    for (const docSnap of snapshot.docs) {
        const data = docSnap.data();

        const userDoc = await getDoc(doc(db, "users", data.userId));
        const userData = userDoc.data();

        teamUsers.push({
            id: data.userId,
            name: userData.name
        });
    }

    renderAssigneeOptions();
}

function switchTeam(teamId) {
    if (teamId === currentTeamId) return;

    currentTeamId = teamId;

    listenToTasks();
    listenToActivity();
    showInviteCode();
    loadTeamUsers().then(() => {
        renderTeam();
        renderLeaderboard(); // 🔥
    });
    checkIfOwner();
}

function renderTeamSelector() {
    const select = document.getElementById("team-selector");

    if (!select) return;

    select.innerHTML = userTeams.map(team => `
        <option value="${team.id}" ${team.id === currentTeamId ? 'selected' : ''}>
            ${team.name}
        </option>
    `).join('');
}

async function joinTeam() {
    const code = document.getElementById("invite-input").value.trim();

    if (!code) {
        alert("Enter invite code");
        return;
    }

    const q = query(
        collection(db, "teams"),
        where("inviteCode", "==", code)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
        alert("Invalid invite code");
        return;
    }

    const teamDoc = snapshot.docs[0];
    const teamId = teamDoc.id;

    // 🔥 Add membership
    await addDoc(collection(db, "teamMembers"), {
        userId: currentUser.uid,
        teamId: teamId,
        role: "member"
    });

    alert("Joined team successfully!");

    // reload teams
    await loadUserTeams(currentUser.uid);
}

async function showInviteCode() {
    if (!currentTeamId) return;

    const teamDoc = await getDoc(doc(db, "teams", currentTeamId));
    const teamData = teamDoc.data();

    document.getElementById("invite-code").textContent = teamData.inviteCode;
}

function toggleInviteModal() {
    document.getElementById("invite-modal").classList.remove("hidden");
    showInviteCode();
}

function closeInviteModal() {
    document.getElementById("invite-modal").classList.add("hidden");
}

function generateInviteCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

async function loadUserTeams(userId) {
    console.log("Loading teams for:", userId);

    const q = query(
        collection(db, "teamMembers"),
        where("userId", "==", userId)
    );

    const snapshot = await getDocs(q);

    console.log("Docs found:", snapshot.size); // 👈 ADD THIS

    userTeams = [];

    for (const docSnap of snapshot.docs) {
        console.log("TeamMember:", docSnap.data()); // 👈 ADD THIS

        const data = docSnap.data();

        const teamDoc = await getDoc(doc(db, "teams", data.teamId));
        const teamData = teamDoc.data();

        userTeams.push({
            id: data.teamId,
            name: teamData.name
        });
    }

    currentTeamId = userTeams[0]?.id;
    renderTeamSelector();
}

function getCurrentUserName() {
    const user = auth.currentUser;

    if (!user) return "User";

    return user.email.split("@")[0];
}

function getDisplayName(email) {
    return email.split("@")[0];
}

function listenToActivity() {
    if (!currentTeamId) return;

    // 🔥 STOP old listener
    if (unsubscribeActivity) unsubscribeActivity();

    const q = query(
        collection(db, "activity"),
        where("teamId", "==", currentTeamId),
        orderBy("timestamp", "desc")
    );

    unsubscribeActivity = onSnapshot(q, (snapshot) => {
        activityData = [];

        snapshot.forEach((doc) => {
            const data = doc.data();

            activityData.push({
                ...data,
                time: formatTimeAgo(data.timestamp)
            });
        });

        renderActivityLog(activityData);
        renderDashboard(); // 🔥 IMPORTANT
    });
}

function listenToTasks() {
    if (!currentTeamId) return;

    // 🔥 STOP old listener
    if (unsubscribeTasks) unsubscribeTasks();

    const q = query(
        collection(db, "tasks"),
        where("teamId", "==", currentTeamId)
    );

    unsubscribeTasks = onSnapshot(q, (snapshot) => {
        tasks = [];

        snapshot.forEach((doc) => {
            tasks.push({
                id: doc.id,
                ...doc.data()
            });
        });

        renderTasks();
        updateStats();
        renderDashboard();
        renderTeam();
        renderLeaderboard();
    });
}




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
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;

    if (!email || !password) {
        alert("Please enter email and password");
        return;
    }

    if (isLoginMode) {
        // LOGIN
        signInWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                enterApp(userCredential.user);
            })
            .catch((error) => {
                alert(error.message);
            });

    } else {
        // REGISTER


        const name = document.getElementById('auth-name').value;

        createUserWithEmailAndPassword(auth, email, password)
            .then(async (userCredential) => {

                const user = userCredential.user;

                // 🔥 1. Create team
                const teamRef = doc(collection(db, "teams"));
                const teamId = teamRef.id;

                const inviteCode = generateInviteCode();

                await setDoc(teamRef, {
                    name: name + "'s Team",
                    ownerId: user.uid,
                    inviteCode: inviteCode
                });

                // 🔥 2. Save user
                await setDoc(doc(db, "users", user.uid), {
                    uid: user.uid,
                    name: name,
                    email: email
                });

                // 🔥 3. Add membership
                await addDoc(collection(db, "teamMembers"), {
                    userId: user.uid,
                    teamId: teamId,
                    role: "owner"
                });

                // 🔥 4. Enter app
                enterApp(user);
            })
            .catch((error) => {
                alert(error.message);
            })
            .catch((error) => {
                alert(error.message);
            });
    }
}

async function enterApp(user) {
    currentUser = user;

    document.getElementById('auth-page').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');

    // 🔥 Get user info
    const userDoc = await getDoc(doc(db, "users", user.uid));
    const userData = userDoc.data();

    currentUserName = userData.name || "User";

    document.querySelector('.nav-username').textContent = currentUserName;
    document.getElementById("welcome-name").textContent = currentUserName;

    // 🔥 Load teams
    await loadUserTeams(user.uid);
    await loadTeamUsers(); // 🔥 ADD THIS
    await loadUserTeams(user.uid);
    await showInviteCode();
    await checkIfOwner();
    listenToTasks();
    listenToActivity();
    renderTeam();
    renderLeaderboard();
    renderTeam(); // 🔥 ADD THIS

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
    if (page === 'settings') {
        loadSettings();
    }
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
}

function toggleUserMenu() {
    document.getElementById('user-dropdown').classList.toggle('hidden');
}

// Close dropdown on outside click
document.addEventListener('click', function (e) {
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
    renderDashboard();
    updateStats();
}

// ==================== DASHBOARD ====================
function renderDashboard() {
    const recentList = document.getElementById('recent-tasks-list');

    const recentTasks = tasks.slice(0, 5);
    recentList.innerHTML = recentTasks.map(t => `
        <div class="recent-task-item">
            <span class="task-name">${t.title}</span>
            <span class="status-badge status-${t.status}">${formatStatus(t.status)}</span>
        </div>
    `).join('');

    const recentActivityList = document.getElementById('mini-activity-list');
    const recentActivity = activityData.slice(0, 5);
    recentActivityList.innerHTML = recentActivity.map(a => `
    <div class="recent-task-item">
        <span class="task-name">
            <strong>${a.user}</strong> ${a.action}
        </span>
        <span class="status-badge">${a.time}</span>
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

    // 🔥 TOTAL TEAM SCORE
    const totalScore = teamUsers.reduce((sum, user) => {
        return sum + calculateUserScore(user.id);
    }, 0);

    document.getElementById('stat-score').textContent = totalScore;
}

function calculateUserScore(userId) {
    const stats = getUserTaskStats(userId);

    return (stats.completed * 5) + (stats.inProgress * 2);
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


        container.innerHTML = columns[status].map(t => {
            const user = teamUsers.find(u => u.id === t.assigneeId);
            const assigneeName = user ? user.name : "Unknown";

            return `
        <div class="task-card" draggable="true" data-id="${t.id}" data-status="${t.status}"
             ondragstart="dragStart(event, '${t.id}')" ondragend="dragEnd(event)">
            <div class="task-card-title">${t.title}</div>
            <div class="task-card-meta">
                <div class="task-card-assignee">
                    <img src="avatar.jpg" alt="${assigneeName}">
                    <span>${assigneeName}</span>
                </div>
                <span class="task-card-due">📅 ${formatDate(t.due)}</span>
            </div>
            <div class="task-card-actions">
                ${t.status !== 'done' ? `<button onclick="moveTask('${t.id}', '${getNextStatus(t.status)}')">Move →</button>` : ''}
                <button onclick="deleteTask('${t.id}')">Delete</button>
            </div>
        </div>
    `;
        }).join('');
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

async function moveTask(id, newStatus) {
    try {
        const taskRef = doc(db, "tasks", id);

        await updateDoc(taskRef, {
            status: newStatus
        });

        const task = tasks.find(t => t.id === id);

        await logActivity(
            getCurrentUserName(),
            `moved task to ${formatStatus(newStatus)}`,
            task?.title || "Task",
            "updated"
        );

        listenToTasks(); // reload from Firebase

    } catch (error) {
        console.error("Error updating task:", error);
    }
}
async function deleteTask(id) {
    try {
        await deleteDoc(doc(db, "tasks", id));

        await logActivity(
            getCurrentUserName(),
            "deleted task",
            "Task",
            "deleted"
        );

    } catch (error) {
        console.error("Error deleting task:", error);
    }
}

// ==================== DRAG AND DROP ====================
function dragStart(e, id) {
    e.dataTransfer.setData("text/plain", id);
    e.target.classList.add("dragging");
}

function dragEnd(e) {
    e.target.classList.remove("dragging");
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

    const id = e.dataTransfer.getData("text/plain");

    if (!id) return;

    moveTask(id, newStatus);
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

async function logActivity(user, action, target, type) {
    await addDoc(collection(db, "activity"), {
        user,
        action,
        target,
        type,
        teamId: currentTeamId, // 🔥 IMPORTANT
        timestamp: serverTimestamp()
    });
}

async function addTask() {
    const title = document.getElementById('task-title').value.trim();
    const assigneeId = document.getElementById('task-assignee').value;
    const due = document.getElementById('task-due').value;
    const status = document.getElementById('task-status').value;

    if (!title) {
        document.getElementById('task-title').style.borderColor = '#ef4444';
        return;
    }

    const user = teamUsers.find(u => u.id === assigneeId);
    const assigneeName = user ? user.name : "Unknown";

    await addDoc(collection(db, "tasks"), {
        title,
        assigneeId,
        due,
        status,
        teamId: currentTeamId
    });

    await logActivity(
        currentUserName,
        "assigned task to " + assigneeName,
        title,
        "created"
    );

    closeTaskModal();
}

// Close modal on overlay click
document.addEventListener('click', function (e) {
    if (e.target.id === 'task-modal') {
        closeTaskModal();
    }
});

// ==================== TEAM ====================
function renderTeam() {
    const grid = document.getElementById('team-grid');
    if (!grid) return;

    const totalScore = teamUsers.reduce((sum, user) => {
        return sum + calculateUserScore(user.id);
    }, 0);

    grid.innerHTML = teamUsers.map(user => {
        const stats = getUserTaskStats(user.id);
        const score = calculateUserScore(user.id);

        const percentage = totalScore > 0
            ? Math.round((score / totalScore) * 100)
            : 0;

        return `
            <div class="team-card">
                <img src="avatar.jpg" class="team-avatar">
                <h4>${user.name}</h4>
                <p class="team-role">Team Member</p>

                <div class="team-stats">
                    <div class="team-stat">
                        <div class="stat-value">${stats.completed}</div>
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
                <div class="team-card-actions">
                    <button 
                        class="btn btn-danger remove-btn"
                        ${!isTeamOwner ? 'disabled title="Only team leaders can remove members"' : ''}
                        onclick="removeMember('${user.id}', '${user.name}')">
                        Remove
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function renderLeaderboard() {
    const board = document.getElementById('leaderboard');
    if (!board) return;

    // 🔥 Calculate scores for each user
    const usersWithScore = teamUsers.map(user => {
        const stats = getUserTaskStats(user.id);
        const score = calculateUserScore(user.id);

        return {
            ...user,
            score,
            tasksCompleted: stats.completed
        };
    });

    // 🔥 Sort by score descending
    const sorted = usersWithScore.sort((a, b) => b.score - a.score);

    const maxScore = sorted[0]?.score || 1;

    board.innerHTML = sorted.map((user, i) => {
        const barWidth = Math.round((user.score / maxScore) * 100);

        const medal =
            i === 0 ? '🥇' :
                i === 1 ? '🥈' :
                    i === 2 ? '🥉' :
                        (i + 1);

        const rankClass = i === 0 ? 'rank-1' : '';

        return `
            <div class="leaderboard-row ${rankClass}">
                <span class="leaderboard-rank">${medal}</span>

                <img src="avatar.jpg" class="leaderboard-avatar">

                <div class="leaderboard-info">
                    <div class="leaderboard-name">${user.name}</div>
                    <div class="leaderboard-tasks">
                        ${user.tasksCompleted} tasks completed
                    </div>
                </div>

                <div class="leaderboard-bar">
                    <div class="leaderboard-bar-fill"
                         style="width: ${barWidth}%"></div>
                </div>

                <span class="leaderboard-score">${user.score}</span>
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

    const labels = teamUsers.map(u => u.name);
    const scores = teamUsers.map(u => calculateUserScore(u.id));

    const totalScore = scores.reduce((a, b) => a + b, 0);
    const percentages = scores.map(s =>
        totalScore > 0 ? Math.round((s / totalScore) * 100) : 0
    );

    pieChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data: percentages,
                backgroundColor: ['#0b2e53', '#3b82f6', '#22c55e', '#f59e0b'],
                borderWidth: 3
            }]
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
            labels: teamUsers.map(u => u.name),
            datasets: [{
                label: 'Tasks Completed',
                data: teamUsers.map(u => getUserTaskStats(u.id).completed),
                backgroundColor: '#0b2e53'
            }]
        }
    });
}

function renderFormulaBreakdown() {
    const container = document.getElementById('formula-breakdown');

    container.innerHTML = teamUsers.map(u => {
        const stats = getUserTaskStats(u.id);
        const score = calculateUserScore(u.id);

        return `
            <div class="formula-member">
                <div class="member-name">${u.name}</div>
                <div class="member-calc">
                    Tasks: ${stats.completed} × 5 = ${stats.completed * 5}<br>
                    In Progress: ${stats.inProgress} × 2 = ${stats.inProgress * 2}
                </div>
                <div class="member-total">Total: ${score}</div>
            </div>
        `;
    }).join('');
}


function formatTimeAgo(timestamp) {
    if (!timestamp) return "Just now";

    const now = new Date();
    const time = timestamp.toDate();
    const diff = Math.floor((now - time) / 1000);

    if (diff < 60) return "Just now";
    if (diff < 3600) return Math.floor(diff / 60) + " min ago";
    if (diff < 86400) return Math.floor(diff / 3600) + " hrs ago";

    return Math.floor(diff / 86400) + " days ago";
}

// ==================== ACTIVITY LOG ====================
function renderActivityLog(activityLog) {
    const timeline = document.getElementById('activity-timeline');

    timeline.innerHTML = activityLog.map(a => `
        <div class="timeline-item type-${a.type}">
            <div class="timeline-content">
                <div class="timeline-text">
                    <strong>${a.user}</strong> ${a.action} '${a.target}'
                </div>
                <div class="timeline-time">${a.time}</div>
            </div>
        </div>
    `).join('');
}

// ==================== KEYBOARD SHORTCUTS ====================
document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        closeTaskModal();
    }
});


// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', function () {
    // Set default date for task modal
    const today = new Date().toISOString().split('T')[0];
    const dueInput = document.getElementById('task-due');
    if (dueInput) dueInput.value = today;
});

window.handleAuth = handleAuth;
window.toggleAuth = toggleAuth;
window.logout = logout;
window.navigateTo = navigateTo;
window.toggleSidebar = toggleSidebar;
window.toggleUserMenu = toggleUserMenu;
window.openTaskModal = openTaskModal;
window.closeTaskModal = closeTaskModal;
window.addTask = addTask;
window.moveTask = moveTask;
window.deleteTask = deleteTask;
window.dragStart = dragStart;
window.getNextStatus = getNextStatus;
window.getDisplayName = getDisplayName;
window.allowDrop = allowDrop;
window.dragEnter = dragEnter;
window.dragLeave = dragLeave;
window.dropTask = dropTask;
window.dragEnd = dragEnd;
window.currentTeamId = currentTeamId;
window.userTeams = userTeams;
window.toggleInviteModal = toggleInviteModal;
window.closeInviteModal = closeInviteModal;
window.joinTeam = joinTeam;
window.switchTeam = switchTeam;
window.saveProfile = saveProfile;
window.saveTeam = saveTeam;
window.removeMember = removeMember;
window.checkIfOwner = checkIfOwner;