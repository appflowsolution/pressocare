import { initializeApp } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-app.js";
import {
    getAuth,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut
} from "https://www.gstatic.com/firebasejs/10.10.0/firebase-auth.js";
import {
    getFirestore,
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    onSnapshot,
    query,
    orderBy
} from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCMgoC1JY18qfdaM-NQgjM9hkxSZs5_B80",
    authDomain: "pressocare-15b7d.firebaseapp.com",
    projectId: "pressocare-15b7d",
    storageBucket: "pressocare-15b7d.firebasestorage.app",
    messagingSenderId: "607877875266",
    appId: "1:607877875266:web:6c8b605fe2905cec7fcfdb"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// State Variables
let currentUser = null;
let activeProfileId = null;
let editingProfileId = null; // Used for "Edit Profile" feature
let editingLogId = null;     // Used for "Edit Measurement" feature
let chartTimeframe = 'all';  // Used for Chart filtering

let allLogs = [];
let profiles = [];
let filteredLogs = [];

let bpChartInstance = null;
let unsubscribeLogs = null;
let unsubscribeProfiles = null;

// --- AUTHENTICATION UI & LOGIC ---
let isLoginMode = true;
const authScreen = document.getElementById('auth-screen');
const mainApp = document.getElementById('main-app');
const authForm = document.getElementById('auth-form');
const authSubmitBtn = document.getElementById('auth-submit-btn');
const authToggleBtn = document.getElementById('auth-toggle-btn');
const authErrorMsg = document.getElementById('auth-error-msg');

authToggleBtn.addEventListener('click', () => {
    isLoginMode = !isLoginMode;
    authSubmitBtn.textContent = isLoginMode ? 'Log In' : 'Sign Up';
    authToggleBtn.textContent = isLoginMode ? 'Sign Up' : 'Log In';
    document.querySelector('#auth-screen p').textContent = isLoginMode ? 'Sign in to sync your data' : 'Create an account to save your data';
    authErrorMsg.classList.add('hidden');
});

authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;

    authErrorMsg.classList.add('hidden');
    const originalText = authSubmitBtn.innerHTML;
    authSubmitBtn.innerHTML = '<div class="loader mr-2 !w-5 !h-5 !border-2"></div> Loading...';
    authSubmitBtn.disabled = true;

    try {
        if (isLoginMode) {
            await signInWithEmailAndPassword(auth, email, password);
        } else {
            const userCred = await createUserWithEmailAndPassword(auth, email, password);
            await addDoc(collection(db, `users/${userCred.user.uid}/profiles`), {
                name: "Me",
                gender: "",
                age: "",
                weight: "",
                createdAt: new Date().toISOString()
            });
        }
    } catch (error) {
        console.error("Auth error:", error);
        authErrorMsg.textContent = "Error: " + (error.code === 'auth/invalid-credential' ? 'Incorrect credentials' : 'User already exists or connection error');
        authErrorMsg.classList.remove('hidden');
    } finally {
        authSubmitBtn.innerHTML = originalText;
        authSubmitBtn.disabled = false;
    }
});

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;

        authScreen.classList.add('opacity-0');
        setTimeout(() => {
            authScreen.classList.add('hidden');
            mainApp.classList.remove('hidden');
            setTimeout(() => mainApp.classList.remove('opacity-0'), 50);
        }, 300);

        subscribeToProfiles(user.uid);
        subscribeToLogs(user.uid);
    } else {
        currentUser = null;
        activeProfileId = null;
        if (unsubscribeLogs) { unsubscribeLogs(); unsubscribeLogs = null; }
        if (unsubscribeProfiles) { unsubscribeProfiles(); unsubscribeProfiles = null; }
        allLogs = [];
        profiles = [];

        mainApp.classList.add('opacity-0');
        setTimeout(() => {
            mainApp.classList.add('hidden');
            authScreen.classList.remove('hidden');
            setTimeout(() => authScreen.classList.remove('opacity-0'), 50);
        }, 300);
    }
});

// --- FIRESTORE SUBSCRIPTIONS ---
function subscribeToProfiles(uid) {
    const q = query(collection(db, `users/${uid}/profiles`), orderBy("createdAt", "asc"));

    unsubscribeProfiles = onSnapshot(q, (snapshot) => {
        profiles = [];
        snapshot.forEach((doc) => {
            profiles.push({ id: doc.id, ...doc.data() });
        });

        updateUIForProfiles();
    }, (error) => console.error("Error fetching profiles:", error));
}

function subscribeToLogs(uid) {
    document.getElementById('data-loading').classList.remove('hidden');
    document.getElementById('history-list').classList.add('hidden');
    document.getElementById('empty-history').classList.add('hidden');

    const q = query(collection(db, `users/${uid}/measurements`), orderBy("datetime", "desc"));

    unsubscribeLogs = onSnapshot(q, (snapshot) => {
        allLogs = [];
        snapshot.forEach((doc) => {
            allLogs.push({ id: doc.id, ...doc.data() });
        });

        document.getElementById('data-loading').classList.add('hidden');
        refreshDataView();
    }, (error) => {
        console.error("Error fetching logs:", error);
        document.getElementById('data-loading').classList.add('hidden');
        document.getElementById('empty-history').innerHTML = `<h3 class="text-danger-2 font-bold">Error fetching data</h3><p class="text-xs text-slate-400">Check Firestore security rules</p>`;
        document.getElementById('empty-history').classList.remove('hidden');
        document.getElementById('empty-history').classList.add('flex');
    });
}

// --- MULTI-PROFILE LOGIC ---

function updateUIForProfiles() {
    const selectEl = document.getElementById('active-profile-select');
    const modalSelectEl = document.getElementById('input-profile-id');
    const noProfileWarn = document.getElementById('no-profiles-warning');

    selectEl.innerHTML = '';
    modalSelectEl.innerHTML = '';

    if (profiles.length === 0) {
        selectEl.innerHTML = '<option value="">No Profiles</option>';
        modalSelectEl.innerHTML = '<option value="" disabled selected>Add a profile in Profiles tab first</option>';
        activeProfileId = null;
        noProfileWarn.classList.remove('hidden');
    } else {
        noProfileWarn.classList.add('hidden');

        profiles.forEach(p => {
            selectEl.innerHTML += `<option value="${p.id}">${p.name}</option>`;
            modalSelectEl.innerHTML += `<option value="${p.id}">${p.name}</option>`;
        });

        if (!activeProfileId || !profiles.find(p => p.id === activeProfileId)) {
            activeProfileId = profiles[0].id;
        }

        selectEl.value = activeProfileId;
    }

    renderProfilesTab();
    refreshDataView();
}

function refreshDataView() {
    if (!activeProfileId) {
        filteredLogs = [];
    } else {
        filteredLogs = allLogs.filter(log => log.profileId === activeProfileId);
    }
    renderHistory();
    renderStats();
    updateChart();
}

// --- DOM RENDERERS ---

function renderProfilesTab() {
    const listEl = document.getElementById('profiles-list');
    const emptyEl = document.getElementById('empty-profiles');

    listEl.innerHTML = '';

    if (profiles.length === 0) {
        listEl.classList.add('hidden');
        emptyEl.classList.remove('hidden');
        emptyEl.classList.add('flex');
        return;
    }

    listEl.classList.remove('hidden');
    emptyEl.classList.add('hidden');
    emptyEl.classList.remove('flex');

    profiles.forEach(p => {
        const pLogs = allLogs.filter(l => l.profileId === p.id).length;

        listEl.innerHTML += `
        <div class="bg-card-dark p-4 rounded-xl border border-slate-800/60 card-shadow flex items-center justify-between">
            <div class="flex items-center gap-4">
                <div class="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-lg">
                    ${p.name.charAt(0).toUpperCase()}
                </div>
                <div>
                    <h3 class="font-bold text-white">${p.name}</h3>
                    <p class="text-xs text-slate-400 mt-0.5">${p.gender || 'N/A'} • ${p.age ? p.age + ' yrs' : 'Age N/A'}</p>
                    <p class="text-[10px] text-primary mt-1">${pLogs} records</p>
                </div>
            </div>
            <div class="flex gap-2">
                <button onclick="window.appActions.editProfile('${p.id}')" class="p-2 text-slate-500 hover:text-primary transition-colors focus:outline-none" title="Edit Profile">
                    <span class="material-symbols-outlined">edit</span>
                </button>
                <button onclick="window.appActions.deleteProfile('${p.id}')" class="p-2 text-slate-500 hover:text-danger-2 transition-colors focus:outline-none" title="Delete Profile">
                    <span class="material-symbols-outlined">delete</span>
                </button>
            </div>
        </div>`;
    });
}

function renderHistory() {
    const listEl = document.getElementById('history-list');
    const emptyEl = document.getElementById('empty-history');
    listEl.innerHTML = '';

    if (filteredLogs.length === 0) {
        listEl.classList.add('hidden');
        emptyEl.classList.remove('hidden');
        emptyEl.classList.add('flex');
        return;
    }

    listEl.classList.remove('hidden');
    emptyEl.classList.add('hidden');
    emptyEl.classList.remove('flex');

    filteredLogs.forEach(log => {
        const status = getBPStatus(log.sys, log.dia);
        const profileName = profiles.find(p => p.id === log.profileId)?.name || 'Unknown';
        let dashOffset = 138;
        if (status.key === 'crisis') dashOffset = 20;
        else if (status.key === 'fase2') dashOffset = 45;
        else if (status.key === 'fase1') dashOffset = 70;
        else if (status.key === 'elevated') dashOffset = 95;
        else dashOffset = 120;

        const cardHtml = `
        <div class="bg-card-dark p-4 sm:p-5 rounded-[20px] border border-slate-800/60 flex items-center justify-between card-shadow relative overflow-hidden">
            <div class="absolute left-0 top-0 bottom-0 w-1 ${status.bg.replace('/20', '')}"></div>
            <div class="flex items-center gap-3 sm:gap-4 pl-2">
                <div class="relative w-10 h-10 sm:w-12 sm:h-12 hidden xs:block">
                    <svg class="w-full h-full -rotate-90">
                        <circle cx="50%" cy="50%" fill="transparent" r="45%" stroke="rgba(255,255,255,0.05)" stroke-width="4"></circle>
                        <circle cx="50%" cy="50%" fill="transparent" r="45%" class="${status.ring} transition-all duration-1000" stroke-dasharray="138" stroke-dashoffset="${dashOffset}" stroke-linecap="round" stroke-width="4"></circle>
                    </svg>
                    <div class="absolute inset-0 flex items-center justify-center">
                        <span class="text-[12px] font-bold ${status.color}">${log.pulse}</span>
                    </div>
                </div>
                <div>
                    <div class="flex items-baseline gap-1">
                        <span class="text-lg sm:text-xl font-bold text-white leading-none">${log.sys}/${log.dia}</span>
                        <span class="text-[10px] font-medium text-slate-500 uppercase tracking-tighter">mmHg</span>
                    </div>
                    <div class="flex flex-wrap items-center gap-2 mt-1">
                        <p class="text-[11px] font-medium text-slate-400">${formatDateTime(log.datetime)}</p>
                        <span class="text-[9px] bg-slate-800/80 px-1.5 py-0.5 rounded text-slate-300 font-bold border border-slate-700/50">${profileName}</span>
                    </div>
                    ${log.notes ? `<p class="text-[10px] text-slate-500 mt-1 italic max-w-[120px] sm:max-w-xs truncate">${log.notes}</p>` : ''}
                </div>
            </div>
            <div class="flex flex-col items-end gap-2">
                <span class="text-[9px] font-black ${status.color} uppercase tracking-[0.1em] border ${status.border} ${status.bg} px-2 py-0.5 rounded-full whitespace-nowrap">${status.label}</span>
                <div class="flex gap-1">
                    <button onclick="window.appActions.editLog('${log.id}')" class="p-1 text-slate-600 hover:text-primary transition-colors rounded-full focus:outline-none" title="Edit Measurement">
                        <span class="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                    <button onclick="window.appActions.deleteLog('${log.id}')" class="p-1 text-slate-600 hover:text-danger-2 transition-colors rounded-full focus:outline-none" title="Delete Measurement">
                        <span class="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                </div>
            </div>
        </div>`;
        listEl.insertAdjacentHTML('beforeend', cardHtml);
    });
}

function renderStats() {
    if (filteredLogs.length === 0) {
        document.getElementById('stat-avg').textContent = '-/-';
        document.getElementById('stat-pulse').textContent = '-';
        document.getElementById('stat-min').textContent = '-/-';
        document.getElementById('stat-max').textContent = '-/-';
        document.getElementById('distribution-list').innerHTML = '<p class="text-sm text-slate-500 text-center py-4">No data for selected profile</p>';
        return;
    }

    let sumSys = 0, sumDia = 0, sumPulse = 0;
    let minSys = 999, minDia = 999, maxSys = 0, maxDia = 0;
    let dist = { normal: 0, elevated: 0, fase1: 0, fase2: 0, crisis: 0 };

    filteredLogs.forEach(log => {
        sumSys += log.sys;
        sumDia += log.dia;
        sumPulse += log.pulse;
        if (log.sys < minSys) minSys = log.sys;
        if (log.dia < minDia) minDia = log.dia;
        if (log.sys > maxSys) maxSys = log.sys;
        if (log.dia > maxDia) maxDia = log.dia;

        const st = getBPStatus(log.sys, log.dia).key;
        if (dist[st] !== undefined) dist[st]++;
    });

    const count = filteredLogs.length;
    document.getElementById('stat-avg').textContent = `${Math.round(sumSys / count)}/${Math.round(sumDia / count)}`;
    document.getElementById('stat-pulse').textContent = Math.round(sumPulse / count);
    document.getElementById('stat-min').textContent = `${minSys}/${minDia}`;
    document.getElementById('stat-max').textContent = `${maxSys}/${maxDia}`;

    const distLabels = {
        normal: { label: 'Normal', color: 'bg-success', text: 'text-success' },
        elevated: { label: 'Elevated', color: 'bg-warning', text: 'text-warning' },
        fase1: { label: 'High S1', color: 'bg-danger-1', text: 'text-danger-1' },
        fase2: { label: 'High S2', color: 'bg-danger-2', text: 'text-danger-2' },
        crisis: { label: 'Crisis', color: 'bg-crisis', text: 'text-crisis' }
    };

    let distHtml = '';
    Object.keys(dist).forEach(key => {
        if (dist[key] > 0) {
            const percent = Math.round((dist[key] / count) * 100);
            distHtml += `
            <div class="flex items-center gap-3">
                <div class="w-16 text-[10px] font-bold ${distLabels[key].text} uppercase">${distLabels[key].label}</div>
                <div class="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div class="h-full ${distLabels[key].color} rounded-full" style="width: ${percent}%"></div>
                </div>
                <div class="w-8 text-right text-xs text-slate-400 font-bold">${percent}%</div>
            </div>`;
        }
    });
    document.getElementById('distribution-list').innerHTML = distHtml;
}

function updateChart() {
    if (filteredLogs.length === 0) {
        if (bpChartInstance) bpChartInstance.destroy();
        return;
    }

    let sorted = [...filteredLogs].sort((a, b) => new Date(a.datetime) - new Date(b.datetime));

    if (chartTimeframe !== 'all') {
        const now = new Date();
        const days = chartTimeframe === '7d' ? 7 : 30;
        const cutoff = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
        sorted = sorted.filter(log => new Date(log.datetime) >= cutoff);
    }

    if (sorted.length === 0) {
        if (bpChartInstance) bpChartInstance.destroy();
        return;
    }

    const chartData = chartTimeframe === 'all' ? sorted.slice(-30) : sorted;

    const labels = chartData.map(log => {
        const d = new Date(log.datetime);
        return `${d.getMonth() + 1}/${d.getDate()}`;
    });
    const sysData = chartData.map(log => log.sys);
    const diaData = chartData.map(log => log.dia);

    if (bpChartInstance) {
        bpChartInstance.destroy();
    }

    const ctx = document.getElementById('bpChart').getContext('2d');
    const sysGrad = ctx.createLinearGradient(0, 0, 0, 200);
    sysGrad.addColorStop(0, 'rgba(58, 185, 248, 0.4)');
    sysGrad.addColorStop(1, 'rgba(58, 185, 248, 0)');

    const diaGrad = ctx.createLinearGradient(0, 0, 0, 200);
    diaGrad.addColorStop(0, 'rgba(139, 92, 246, 0.4)');
    diaGrad.addColorStop(1, 'rgba(139, 92, 246, 0)');

    Chart.defaults.color = '#64748b';
    Chart.defaults.font.family = 'Inter';

    bpChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Systolic', data: sysData, borderColor: '#3ab9f8', backgroundColor: sysGrad, borderWidth: 2, tension: 0.4, fill: true, pointBackgroundColor: '#1E293B', pointBorderColor: '#3ab9f8', pointBorderWidth: 2, pointRadius: 4, pointHoverRadius: 6
                },
                {
                    label: 'Diastolic', data: diaData, borderColor: '#8b5cf6', backgroundColor: diaGrad, borderWidth: 2, tension: 0.4, fill: true, pointBackgroundColor: '#1E293B', pointBorderColor: '#8b5cf6', pointBorderWidth: 2, pointRadius: 4, pointHoverRadius: 6
                }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: { legend: { display: false }, tooltip: { backgroundColor: 'rgba(15, 23, 42, 0.9)', titleColor: '#fff', bodyColor: '#cbd5e1', borderColor: 'rgba(51, 65, 85, 0.5)', borderWidth: 1, padding: 10, boxPadding: 4, usePointStyle: true } },
            scales: {
                x: { grid: { display: false, drawBorder: false }, ticks: { font: { size: 10, weight: 'bold' } } },
                y: { grid: { color: 'rgba(51, 65, 85, 0.3)', borderDash: [5, 5], drawBorder: false }, min: 40, suggestedMax: 180, ticks: { font: { size: 10 }, stepSize: 20 } }
            }
        }
    });
}

// --- HELPERS ---
function getBPStatus(sys, dia) {
    sys = parseInt(sys);
    dia = parseInt(dia);
    if (sys > 180 || dia > 120) return { key: 'crisis', label: 'Crisis', color: 'text-crisis', bg: 'bg-crisis/20', border: 'border-crisis/30', ring: 'stroke-crisis' };
    if (sys >= 140 || dia >= 90) return { key: 'fase2', label: 'Stage 2', color: 'text-danger-2', bg: 'bg-danger-2/20', border: 'border-danger-2/30', ring: 'stroke-danger-2' };
    if ((sys >= 130 && sys <= 139) || (dia >= 80 && dia <= 89)) return { key: 'fase1', label: 'Stage 1', color: 'text-danger-1', bg: 'bg-danger-1/20', border: 'border-danger-1/30', ring: 'stroke-danger-1' };
    if ((sys >= 120 && sys <= 129) && dia < 80) return { key: 'elevated', label: 'Elevated', color: 'text-warning', bg: 'bg-warning/20', border: 'border-warning/30', ring: 'stroke-warning' };
    if (sys < 120 && dia < 80) return { key: 'normal', label: 'Normal', color: 'text-success', bg: 'bg-success/20', border: 'border-success/30', ring: 'stroke-success' };
    return { key: 'unknown', label: '...', color: 'text-slate-500', bg: 'bg-slate-500/20', border: 'border-slate-500/30' };
}

function formatDateTime(isoString) {
    const date = new Date(isoString);
    const today = new Date();
    const isToday = date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
    const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    if (isToday) return `Today, ${timeStr}`;
    return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${timeStr}`;
}
function formatDbDateTime(dateStr, timeStr) { return new Date(`${dateStr}T${timeStr}`).toISOString(); }

// --- UI Interactions exposed to Window ---

window.appActions = {
    switchTab: function (tabId) {
        document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
        document.getElementById(`tab-${tabId}`).classList.add('active');

        ['history', 'stats', 'profiles'].forEach(tid => {
            document.getElementById(`nav-${tid}`).classList.replace('text-primary', 'text-slate-500');
            document.querySelector(`#nav-${tid} .nav-icon`).classList.remove('fill-1');
        });

        const activeBtn = document.getElementById(`nav-${tabId}`);
        activeBtn.classList.replace('text-slate-500', 'text-primary');
        activeBtn.querySelector('.nav-icon').classList.add('fill-1');

        if (tabId === 'stats') updateChart();
    },

    onActiveProfileChange: function () {
        activeProfileId = document.getElementById('active-profile-select').value;
        refreshDataView();
    },

    // --- Chart Actions ---
    setChartTimeframe: function (tf) {
        chartTimeframe = tf;

        const inactiveClass = "px-3 py-1 text-[10px] font-bold uppercase rounded-md text-slate-400 hover:text-white transition-colors focus:outline-none";
        const activeClass = "px-3 py-1 text-[10px] font-bold uppercase rounded-md bg-slate-700 text-white shadow-sm transition-colors focus:outline-none";

        ['7d', '30d', 'all'].forEach(val => {
            const btn = document.getElementById(`chart-filter-${val}`);
            if (btn) btn.className = val === tf ? activeClass : inactiveClass;
        });

        updateChart();
    },

    // --- Measurements Modal ---
    openModal: function () {
        if (profiles.length === 0) {
            alert('You must add a profile first.');
            window.appActions.switchTab('profiles');
            return;
        }

        editingLogId = null;
        document.getElementById('measurement-modal-title').textContent = "New Measurement";

        document.getElementById('input-profile-id').value = activeProfileId;

        const now = new Date();
        document.getElementById('input-date').value = now.toISOString().split('T')[0];
        document.getElementById('input-time').value = now.toTimeString().slice(0, 5);
        document.getElementById('input-sys').value = '';
        document.getElementById('input-dia').value = '';
        document.getElementById('input-pulse').value = '';
        document.getElementById('input-notes').value = '';

        const modal = document.getElementById('addModal');
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    },
    editLog: function (id) {
        editingLogId = id;
        const log = allLogs.find(l => l.id === id);
        if (!log) return;

        document.getElementById('measurement-modal-title').textContent = "Edit Measurement";
        document.getElementById('input-profile-id').value = log.profileId;

        const d = new Date(log.datetime);
        document.getElementById('input-date').value = d.toISOString().split('T')[0];
        document.getElementById('input-time').value = d.toTimeString().slice(0, 5);
        document.getElementById('input-sys').value = log.sys;
        document.getElementById('input-dia').value = log.dia;
        document.getElementById('input-pulse').value = log.pulse;
        document.getElementById('input-notes').value = log.notes || '';

        const modal = document.getElementById('addModal');
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    },
    closeModal: function () {
        editingLogId = null;
        document.getElementById('addModal').classList.add('hidden');
        document.getElementById('addModal').classList.remove('flex');
    },

    handleSave: async function (e) {
        e.preventDefault();
        if (!currentUser) return;

        const btn = document.getElementById('save-reading-btn');
        const origHtml = btn.innerHTML;
        btn.innerHTML = '<div class="loader mr-2 !w-5 !h-5 !border-2"></div> Saving...';
        btn.disabled = true;

        const profId = document.getElementById('input-profile-id').value;

        const newLog = {
            profileId: profId,
            datetime: formatDbDateTime(document.getElementById('input-date').value, document.getElementById('input-time').value),
            sys: parseInt(document.getElementById('input-sys').value),
            dia: parseInt(document.getElementById('input-dia').value),
            pulse: parseInt(document.getElementById('input-pulse').value),
            notes: document.getElementById('input-notes').value
        };

        try {
            if (editingLogId) {
                await updateDoc(doc(db, `users/${currentUser.uid}/measurements`, editingLogId), newLog);
            } else {
                newLog.createdAt = new Date().toISOString();
                await addDoc(collection(db, `users/${currentUser.uid}/measurements`), newLog);
            }

            window.appActions.closeModal();

            if (activeProfileId !== profId) {
                activeProfileId = profId;
                document.getElementById('active-profile-select').value = profId;
                refreshDataView();
            }

            window.appActions.switchTab('stats');
        } catch (error) {
            console.error("Error", error);
            alert("Error saving measurement.");
        } finally {
            btn.innerHTML = origHtml;
            btn.disabled = false;
        }
    },
    deleteLog: async function (id) {
        if (confirm("Are you sure you want to delete this record?")) {
            try { await deleteDoc(doc(db, `users/${currentUser.uid}/measurements`, id)); }
            catch (error) { console.error(error); alert("Error"); }
        }
    },

    // --- Profiles Modal ---
    openProfileModal: function () {
        editingProfileId = null;
        document.getElementById('profile-modal-title').textContent = "New Profile";
        document.getElementById('profile-modal-subtitle').textContent = "Add a family member or patient";

        document.getElementById('profile-name').value = '';
        document.getElementById('profile-gender').value = '';
        document.getElementById('profile-age').value = '';
        document.getElementById('profile-weight').value = '';

        document.getElementById('profileModal').classList.remove('hidden');
        document.getElementById('profileModal').classList.add('flex');
    },
    editProfile: function (id) {
        editingProfileId = id;
        const profile = profiles.find(p => p.id === id);
        if (!profile) return;

        document.getElementById('profile-modal-title').textContent = "Edit Profile";
        document.getElementById('profile-modal-subtitle').textContent = "Update details";

        document.getElementById('profile-name').value = profile.name;
        document.getElementById('profile-gender').value = profile.gender;
        document.getElementById('profile-age').value = profile.age;
        document.getElementById('profile-weight').value = profile.weight || '';

        document.getElementById('profileModal').classList.remove('hidden');
        document.getElementById('profileModal').classList.add('flex');
    },
    closeProfileModal: function () {
        editingProfileId = null;
        document.getElementById('profileModal').classList.add('hidden');
        document.getElementById('profileModal').classList.remove('flex');
    },
    saveProfile: async function (e) {
        e.preventDefault();
        if (!currentUser) return;
        const btn = document.getElementById('save-profile-btn');
        btn.disabled = true; btn.textContent = 'Saving...';

        try {
            const profileData = {
                name: document.getElementById('profile-name').value,
                gender: document.getElementById('profile-gender').value,
                age: parseInt(document.getElementById('profile-age').value),
                weight: parseFloat(document.getElementById('profile-weight').value) || null
            };

            if (editingProfileId) {
                await updateDoc(doc(db, `users/${currentUser.uid}/profiles`, editingProfileId), profileData);
            } else {
                profileData.createdAt = new Date().toISOString();
                await addDoc(collection(db, `users/${currentUser.uid}/profiles`), profileData);
            }
            window.appActions.closeProfileModal();
        } catch (err) {
            console.error(err); alert("Error saving profile");
        } finally {
            btn.disabled = false; btn.textContent = 'Save Profile';
        }
    },
    deleteProfile: async function (id) {
        if (confirm("Are you sure you want to delete this profile? Associated records will not be deleted from the database, but this profile will disappear.")) {
            try { await deleteDoc(doc(db, `users/${currentUser.uid}/profiles`, id)); }
            catch (e) { console.error(e); }
        }
    },

    signOutUser: async function () { await signOut(auth); }
};
