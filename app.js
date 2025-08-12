// Use UMD version of Supabase for better compatibility
const script = document.createElement('script');
script.src = 'https://unpkg.com/@supabase/supabase-js@2';
script.onload = function() {
    initializeApp();
};
document.head.appendChild(script);

function initializeApp() {
    // Supabase configuration
    const supabaseUrl = 'https://tuyttwketzbewvqqqdum.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR1eXR0d2tldHpiZXd2cXFxZHVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxODM4MDAsImV4cCI6MjA2ODc1OTgwMH0.3S9meIoh6ULCH2L4-R_wzud2rw70U8lJzs4gj9028fY';
    const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// DOM elements
const emailInput = document.getElementById('emailInput');
const noteInput = document.getElementById('noteInput');
const submitBtn = document.getElementById('submitBtn');
const refreshBtn = document.getElementById('refreshBtn');
const searchToggleBtn = document.getElementById('searchToggleBtn');
const searchContainer = document.getElementById('searchContainer');
const searchInput = document.getElementById('searchInput');
const emailCardsContainer = document.getElementById('emailCardsContainer');
const alertContainer = document.getElementById('alertContainer');
const appToggles = document.querySelectorAll('.app-toggle');
const noteModal = document.getElementById('noteModal');
const modalNoteInput = document.getElementById('modalNoteInput');
const modalCloseBtn = document.getElementById('modalCloseBtn');
const cancelNoteEdit = document.getElementById('cancelNoteEdit');
const saveNoteEdit = document.getElementById('saveNoteEdit');
const quickNoteBtns = document.querySelectorAll('.quick-note-btn');

// App status management
const statusCycle = ['unknown', 'used', 'unused'];
const statusIcons = {
    unknown: '⚪',
    used: '✅',
    unused: '❌'
};

let currentAppStates = {
    shopee: 'unknown',
    gemini: 'unknown',
    chatgpt: 'unknown',
    tiktok: 'unknown'
};

let currentEditingId = null;
let allEmailData = [];
let isSearchVisible = false;

// Particle Animation System
class ParticleSystem {
    constructor() {
        this.container = document.getElementById('particlesContainer');
        this.particles = [];
        this.maxParticles = 50;
        this.init();
    }

    init() {
        this.createParticles();
        this.animate();
    }

    createParticles() {
        for (let i = 0; i < this.maxParticles; i++) {
            this.createParticle();
        }
    }

    createParticle() {
        const particle = document.createElement('div');
        particle.className = 'particle';
        
        // Random starting position
        const startX = Math.random() * window.innerWidth;
        const startY = window.innerHeight + 10;
        
        // Random animation duration
        const duration = 15 + Math.random() * 10; // 15-25 seconds
        
        particle.style.left = startX + 'px';
        particle.style.top = startY + 'px';
        particle.style.animationDuration = duration + 's';
        particle.style.animationDelay = Math.random() * 5 + 's';
        
        this.container.appendChild(particle);
        this.particles.push(particle);
        
        // Remove particle after animation
        setTimeout(() => {
            if (particle.parentNode) {
                particle.parentNode.removeChild(particle);
                this.particles = this.particles.filter(p => p !== particle);
                // Create new particle to maintain count
                this.createParticle();
            }
        }, (duration + 5) * 1000);
    }

    animate() {
        // Continuous particle creation
        setInterval(() => {
            if (this.particles.length < this.maxParticles) {
                this.createParticle();
            }
        }, 1000);
    }
}

// Initialize particle system
const particleSystem = new ParticleSystem();

// Utility Functions
function showAlert(message, type = 'error') {
    const alertEl = document.createElement('div');
    alertEl.className = `alert ${type}`;
    alertEl.textContent = message;
    
    alertContainer.innerHTML = '';
    alertContainer.appendChild(alertEl);

    // Auto-remove alert after 5 seconds
    setTimeout(() => {
        if (alertEl.parentNode) {
            alertEl.style.animation = 'slideOutUp 0.3s ease-in forwards';
            setTimeout(() => alertEl.remove(), 300);
        }
    }, 5000);
}

function updateAppToggle(element, status) {
    element.dataset.status = status;
    const indicator = element.querySelector('.status-indicator');
    indicator.className = `status-indicator ${status}`;
}

function cycleAppStatus(app) {
    const currentStatus = currentAppStates[app];
    const currentIndex = statusCycle.indexOf(currentStatus);
    const nextIndex = (currentIndex + 1) % statusCycle.length;
    const nextStatus = statusCycle[nextIndex];

    currentAppStates[app] = nextStatus;

    const toggle = document.querySelector(`.app-toggle[data-app="${app}"]`);
    if (toggle) {
        updateAppToggle(toggle, nextStatus);
        
        // Add visual feedback
        toggle.style.transform = 'scale(0.95)';
        setTimeout(() => {
            toggle.style.transform = '';
        }, 150);
    }
}

function resetForm() {
    emailInput.value = '';
    noteInput.value = '';
    
    Object.keys(currentAppStates).forEach(app => {
        currentAppStates[app] = 'unknown';
        const toggle = document.querySelector(`.app-toggle[data-app="${app}"]`);
        if (toggle) updateAppToggle(toggle, 'unknown');
    });
    
    // Reset button state
    submitBtn.disabled = false;
    submitBtn.querySelector('.btn-text').style.display = 'block';
    submitBtn.querySelector('.btn-loading').style.display = 'none';
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getStatusIcon(status) {
    return statusIcons[status] || '⚪';
}

// Modal Functions
function openNoteModal(emailId, currentNote) {
    currentEditingId = emailId;
    modalNoteInput.value = currentNote || '';
    noteModal.style.display = 'flex';
    
    // Focus with slight delay for animation
    setTimeout(() => {
        modalNoteInput.focus();
    }, 100);
}

function closeNoteModal() {
    noteModal.style.display = 'none';
    currentEditingId = null;
    modalNoteInput.value = '';
}

async function saveNote() {
    if (!currentEditingId) return;

    const newNote = modalNoteInput.value.trim();

    try {
        const { error } = await supabase
            .from('email_usage')
            .update({ note: newNote || null })
            .eq('id', currentEditingId);

        if (error) throw error;

        showAlert('บันทึกหมายเหตุเรียบร้อยแล้ว!', 'success');
        closeNoteModal();
        await loadData();
    } catch (error) {
        showAlert(`ไม่สามารถบันทึกหมายเหตุ: ${error.message}`);
    }
}

// Email Card Creation
function createEmailCard(row) {
    const card = document.createElement('div');
    card.className = 'email-card';
    card.style.animationDelay = '0.1s';

    card.innerHTML = `
        <div class="card-header">
            <h3 class="card-title">${row.email.replace('@gmail.com', '')}</h3>
            <div class="card-actions">
                <button class="card-action-btn edit" title="แก้ไขหมายเหตุ">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" stroke-width="2"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="2"/>
                    </svg>
                </button>
                <button class="card-action-btn delete" title="ลบอีเมล">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <polyline points="3,6 5,6 21,6" stroke="currentColor" stroke-width="2"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" stroke-width="2"/>
                    </svg>
                </button>
            </div>
        </div>
        <div class="card-date">วันที่สมัคร: ${formatDate(row.created_at)}</div>
        <div class="card-apps">
            <div class="card-apps-title">แอปที่ลงทะเบียน</div>
            <div class="card-apps-grid">
                <div class="card-app-item">
                    <span class="card-app-name">Shopee</span>
                    <span class="card-app-status" data-app="shopee" data-email-id="${row.id}">${getStatusIcon(row.shopee)}</span>
                </div>
                <div class="card-app-item">
                    <span class="card-app-name">Gemini</span>
                    <span class="card-app-status" data-app="gemini" data-email-id="${row.id}">${getStatusIcon(row.gemini)}</span>
                </div>
                <div class="card-app-item">
                    <span class="card-app-name">ChatGPT</span>
                    <span class="card-app-status" data-app="chatgpt" data-email-id="${row.id}">${getStatusIcon(row.chatgpt)}</span>
                </div>
                <div class="card-app-item">
                    <span class="card-app-name">TikTok</span>
                    <span class="card-app-status" data-app="tiktok" data-email-id="${row.id}">${getStatusIcon(row.tiktok)}</span>
                </div>
            </div>
        </div>
        <div class="card-note">
            <div class="card-note-title">หมายเหตุ</div>
            <div class="card-note-content ${row.note ? '' : 'empty'}">${row.note || 'ไม่มีหมายเหตุ'}</div>
        </div>
    `;

    // Event listeners
    const noteContent = card.querySelector('.card-note-content');
    const editBtn = card.querySelector('.edit');
    const deleteBtn = card.querySelector('.delete');

    editBtn.addEventListener('click', () => openNoteModal(row.id, row.note || ''));
    noteContent.addEventListener('click', () => openNoteModal(row.id, row.note || ''));
    deleteBtn.addEventListener('click', () => deleteEmail(row.id));

    // App status toggles
    card.querySelectorAll('.card-app-status').forEach(statusEl => {
        const appName = statusEl.dataset.app;
        const emailId = statusEl.dataset.emailId;
        if (appName && emailId) {
            statusEl.addEventListener('click', () => updateAppStatus(emailId, appName, row[appName]));
        }
    });

    return card;
}

// Data Management
async function updateAppStatus(emailId, app, currentStatus) {
    const currentIndex = statusCycle.indexOf(currentStatus);
    const nextIndex = (currentIndex + 1) % statusCycle.length;
    const nextStatus = statusCycle[nextIndex];

    try {
        const { error } = await supabase
            .from('email_usage')
            .update({ [app]: nextStatus })
            .eq('id', emailId);

        if (error) throw error;

        await loadData();
        showAlert(`อัปเดตสถานะ ${app} เรียบร้อยแล้ว!`, 'success');
    } catch (error) {
        showAlert(`ไม่สามารถอัปเดตสถานะ ${app}: ${error.message}`);
    }
}

async function deleteEmail(emailId) {
    if (confirm('คุณแน่ใจหรือไม่ที่จะลบข้อมูลอีเมลนี้?')) {
        try {
            const { error } = await supabase
                .from('email_usage')
                .delete()
                .eq('id', emailId);

            if (error) throw error;

            showAlert('ลบข้อมูลอีเมลเรียบร้อยแล้ว!', 'success');
            await loadData();
        } catch (error) {
            showAlert(`ไม่สามารถลบข้อมูล: ${error.message}`);
        }
    }
}

async function loadData() {
    try {
        emailCardsContainer.innerHTML = `
            <div class="loading-state">
                <div class="loading-spinner large"></div>
                <span class="loading-text">กำลังโหลดข้อมูล...</span>
            </div>
        `;

        const { data, error } = await supabase
            .from('email_usage')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        allEmailData = data;
        renderEmailCards(data);
    } catch (error) {
        console.error('Error loading data:', error);
        showAlert(`ไม่สามารถโหลดข้อมูล: ${error.message}`);
        emailCardsContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">⚠️</div>
                <h3>ไม่สามารถโหลดข้อมูลได้</h3>
                <p>${error.message}</p>
            </div>
        `;
    }
}

function renderEmailCards(data) {
    emailCardsContainer.innerHTML = '';
    
    if (!data || data.length === 0) {
        emailCardsContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📭</div>
                <h3>ยังไม่มีอีเมลที่ติดตาม</h3>
                <p>เพิ่มอีเมลแรกของคุณเพื่อเริ่มต้น!</p>
            </div>
        `;
        return;
    }

    data.forEach((row, index) => {
        const card = createEmailCard(row);
        card.style.animationDelay = `${index * 0.1}s`;
        emailCardsContainer.appendChild(card);
    });
}

async function addEmail() {
    const username = emailInput.value.trim();
    const note = noteInput.value.trim();

    if (!username) {
        showAlert('กรุณากรอกชื่อผู้ใช้อีเมล');
        emailInput.focus();
        return;
    }

    if (username.includes('@')) {
        showAlert('กรุณากรอกเฉพาะชื่อผู้ใช้ (ก่อน @gmail.com)');
        emailInput.focus();
        return;
    }

    const email = `${username}@gmail.com`;

    try {
        // Show loading state
        submitBtn.disabled = true;
        submitBtn.querySelector('.btn-text').style.display = 'none';
        submitBtn.querySelector('.btn-loading').style.display = 'flex';

        const { data, error } = await supabase
            .from('email_usage')
            .insert([{
                email: email,
                shopee: currentAppStates.shopee,
                gemini: currentAppStates.gemini,
                chatgpt: currentAppStates.chatgpt,
                tiktok: currentAppStates.tiktok,
                note: note || null
            }])
            .select();

        if (error) throw error;

        showAlert('เพิ่มอีเมลเรียบร้อยแล้ว!', 'success');
        resetForm();
        await loadData();
    } catch (error) {
        console.error('Error adding email:', error);
        showAlert(`ไม่สามารถเพิ่มอีเมล: ${error.message}`);
    } finally {
        submitBtn.disabled = false;
        submitBtn.querySelector('.btn-text').style.display = 'block';
        submitBtn.querySelector('.btn-loading').style.display = 'none';
    }
}

// Search functionality
function toggleSearch() {
    isSearchVisible = !isSearchVisible;
    
    if (isSearchVisible) {
        searchContainer.style.display = 'block';
        setTimeout(() => {
            searchInput.focus();
        }, 100);
    } else {
        searchContainer.style.display = 'none';
        searchInput.value = '';
        renderEmailCards(allEmailData);
    }
}

function performSearch() {
    const keyword = searchInput.value.trim().toLowerCase();
    
    if (!keyword) {
        renderEmailCards(allEmailData);
        return;
    }
    
    const filtered = allEmailData.filter(row =>
        row.email.toLowerCase().includes(keyword) ||
        (row.note && row.note.toLowerCase().includes(keyword))
    );
    
    renderEmailCards(filtered);
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // App toggles
    appToggles.forEach(toggle => {
        toggle.addEventListener('click', () => {
            const app = toggle.dataset.app;
            cycleAppStatus(app);
        });
    });

    // Form submission
    submitBtn.addEventListener('click', addEmail);
    
    // Enter key support
    emailInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addEmail();
        }
    });

    // Quick note buttons
    quickNoteBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const note = btn.dataset.note;
            if (noteInput.value.trim() === '') {
                noteInput.value = note;
            } else if (!noteInput.value.includes(note)) {
                noteInput.value += (noteInput.value.trim().endsWith(',') ? ' ' : ', ') + note;
            }
            noteInput.focus();
        });
    });

    // Search functionality
    searchToggleBtn.addEventListener('click', toggleSearch);
    searchInput.addEventListener('input', performSearch);

    // Refresh button
    refreshBtn.addEventListener('click', loadData);

    // Modal events
    modalCloseBtn.addEventListener('click', closeNoteModal);
    cancelNoteEdit.addEventListener('click', closeNoteModal);
    saveNoteEdit.addEventListener('click', saveNote);

    // Modal keyboard shortcuts
    modalNoteInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            saveNote();
        }
        if (e.key === 'Escape') {
            closeNoteModal();
        }
    });

    // Close modal on overlay click
    noteModal.addEventListener('click', (e) => {
        if (e.target === noteModal) {
            closeNoteModal();
        }
    });

    // Add CSS animation for slide out
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideOutUp {
            from {
                opacity: 1;
                transform: translateY(0);
            }
            to {
                opacity: 0;
                transform: translateY(-20px);
            }
        }
    `;
    document.head.appendChild(style);

    // Handle window resize for particles
    window.addEventListener('resize', () => {
        // Recreate particles on resize to adjust to new screen size
        if (typeof particleSystem !== 'undefined') {
            particleSystem.container.innerHTML = '';
            particleSystem.particles = [];
            particleSystem.createParticles();
        }
    });

    // Performance optimization: Reduce particles on mobile
    if (window.innerWidth < 768 && typeof particleSystem !== 'undefined') {
        particleSystem.maxParticles = 25;
    }

    // Initialize data
    loadData();
}

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Script will be loaded and initializeApp will be called
    });
} else {
    // DOM already loaded, load script immediately
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/@supabase/supabase-js@2';
    script.onload = function() {
        initializeApp();
    };
    document.head.appendChild(script);
}

