// Global variables
let currentFiles = [];
let currentFileId = null;
let isLoading = false;
let currentTest = null;
let currentTestAnswers = [];
let testTimer = null;
let testTimeRemaining = 0;
let currentDoubt = null;
let currentQuestionIndex = 0;

// DOM elements
const uploadForm = document.getElementById('uploadForm');
const fileInput = document.getElementById('fileInput');
const uploadArea = document.getElementById('uploadArea');
const searchForm = document.getElementById('searchForm');
const searchInput = document.getElementById('searchInput');
const resultsGrid = document.getElementById('resultsGrid');
const filesGrid = document.getElementById('filesGrid');
const modal = document.getElementById('fileModal');
const loadingSpinner = document.getElementById('loadingSpinner');
const toastContainer = document.getElementById('toastContainer');
const loginForm = document.getElementById('loginForm');

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    loadInitialData();
    restoreAuthAndInitUI();
});

// Initialize application
function initializeApp() {
    // Load statistics
    loadStatistics();
    
    // Load subjects for filter dropdown
    loadSubjects();
    
    // Load initial files
    loadFiles();
    
    // Setup navigation
    setupNavigation();
}

// Setup event listeners
function setupEventListeners() {
    // Upload form
    uploadForm.addEventListener('submit', handleFileUpload);
    
    // File input
    fileInput.addEventListener('change', handleFileSelect);

    // Intercept upload area click to prompt for semester and subject first
    uploadArea.addEventListener('click', async (e) => {
        // Only act when clicking the area, not when file already selected
        if (fileInput.files && fileInput.files.length > 0) return;
        const selection = await promptForSemesterAndSubject();
        if (!selection) return;
        // Pre-fill the form fields
        const semesterSelect = document.getElementById('semester');
        const subjectSelect = document.getElementById('subject');
        semesterSelect.value = selection.semester || '';
        await loadSubjectsForUpload();
        subjectSelect.value = selection.subject || '';
        // Now open file chooser
        fileInput.click();
    }, { capture: true });
    
    // Upload area drag and drop
    uploadArea.addEventListener('click', () => fileInput.click());
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleFileDrop);
    
    // Search form
    searchForm.addEventListener('submit', handleSearch);

    // Login form
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Filter changes
    document.getElementById('filterSubject').addEventListener('change', performSearch);
    document.getElementById('filterSemester').addEventListener('change', performSearch);
    document.getElementById('filterType').addEventListener('change', performSearch);
    
    // Browse filters
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            filterFiles(e.target.dataset.filter);
        });
    });
    
    // Load more button
    document.getElementById('loadMoreBtn').addEventListener('click', loadMoreFiles);
    
    // Modal
    document.querySelector('.modal-close').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
    
    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = e.target.getAttribute('href').substring(1);
            // If navigating to profile but not logged in, go to login
            if (section === 'profile' && !isLoggedIn()) {
                showSection('login');
                return;
            }
            showSection(section);
        });
    });
}

// Navigation functions
function setupNavigation() {
    const navToggle = document.querySelector('.nav-toggle');
    const navMenu = document.querySelector('.nav-menu');
    
    navToggle.addEventListener('click', () => {
        navMenu.classList.toggle('active');
    });
}

function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.style.display = 'none';
    });
    
    // Show target section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.style.display = 'block';
        targetSection.scrollIntoView({ behavior: 'smooth' });
    }
    
    // Update active nav link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    document.querySelector(`[href="#${sectionId}"]`).classList.add('active');
    
    // Load section-specific data
    if (sectionId === 'browse') {
        loadFiles();
    }

    // Keep navbar visibility in sync
    updateNavForAuth();
}

// File upload functions
function handleFileUpload(e) {
    e.preventDefault();
    
    const formData = new FormData(uploadForm);
    const file = fileInput.files[0];
    
    if (!file) {
        showToast('Please select a file to upload', 'error');
        return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
        showToast('File size must be less than 10MB', 'error');
        return;
    }
    
    showLoading(true);
    
    fetch('/upload', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            throw new Error(data.error);
        }
        
        showToast('File uploaded successfully!', 'success');
        uploadForm.reset();
        updateUploadArea();
        loadStatistics();
        
        // Switch to browse section to show the uploaded file
        setTimeout(() => {
            showSection('browse');
            loadFiles();
        }, 1000);
    })
    .catch(error => {
        console.error('Upload error:', error);
        showToast(error.message || 'Upload failed', 'error');
    })
    .finally(() => {
        showLoading(false);
    });
}

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        updateUploadArea(file);
        // If subject not chosen yet, prompt now, then submit automatically
        const subject = document.getElementById('subject').value;
        const semester = document.getElementById('semester').value;
        if (!subject) {
            promptForSemesterAndSubject().then(async (selection) => {
                if (!selection) return;
                const semesterSelect = document.getElementById('semester');
                const subjectSelect = document.getElementById('subject');
                semesterSelect.value = selection.semester || '';
                await loadSubjectsForUpload();
                subjectSelect.value = selection.subject || '';
                // Auto-submit upload
                uploadForm.requestSubmit();
            });
        } else {
            // Auto-submit upload directly
            uploadForm.requestSubmit();
        }
    }
}

function handleDragOver(e) {
    e.preventDefault();
    uploadArea.classList.add('dragover');
}

function handleDragLeave(e) {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
}

function handleFileDrop(e) {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        fileInput.files = files;
        updateUploadArea(files[0]);
    }
}

function updateUploadArea(file = null) {
    const uploadContent = uploadArea.querySelector('.upload-content');
    
    if (file) {
        uploadContent.innerHTML = `
            <i class="fas fa-file-upload upload-icon" style="color: #667eea;"></i>
            <h3>${file.name}</h3>
            <p>Ready to upload</p>
            <p class="upload-info">Size: ${formatFileSize(file.size)}</p>
        `;
    } else {
        uploadContent.innerHTML = `
            <i class="fas fa-cloud-upload-alt upload-icon"></i>
            <h3>Drag & Drop Files Here</h3>
            <p>or <span class="upload-link">browse files</span></p>
            <p class="upload-info">Supports PDF, DOC, DOCX, TXT, JPG, PNG (Max 10MB)</p>
        `;
    }
}

// Search functions
function handleSearch(e) {
    e.preventDefault();
    performSearch();
}

function performSearch() {
    const query = searchInput.value.trim();
    const subject = document.getElementById('filterSubject').value;
    const semester = document.getElementById('filterSemester').value;
    const type = document.getElementById('filterType').value;
    
    const params = new URLSearchParams();
    if (query) params.append('q', query);
    if (subject) params.append('subject', subject);
    if (semester) params.append('semester', semester);
    if (type) params.append('type', type);
    
    showLoading(true);
    
    fetch(`/search?${params}`)
    .then(response => response.json())
    .then(files => {
        currentFiles = files;
        displaySearchResults(files);
        updateResultsCount(files.length);
    })
    .catch(error => {
        console.error('Search error:', error);
        showToast('Search failed', 'error');
    })
    .finally(() => {
        showLoading(false);
    });
}

function displaySearchResults(files) {
    resultsGrid.innerHTML = '';
    
    if (files.length === 0) {
        resultsGrid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: #718096;">
                <i class="fas fa-search" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                <h3>No files found</h3>
                <p>Try adjusting your search criteria or upload some files!</p>
            </div>
        `;
        return;
    }
    
    files.forEach(file => {
        const fileCard = createFileCard(file);
        resultsGrid.appendChild(fileCard);
    });
}

function updateResultsCount(count) {
    const resultsCount = document.getElementById('resultsCount');
    resultsCount.textContent = `${count} result${count !== 1 ? 's' : ''}`;
}

// File loading functions
function loadFiles() {
    showLoading(true);
    
    fetch('/files')
    .then(response => response.json())
    .then(files => {
        currentFiles = files;
        displayFiles(files);
    })
    .catch(error => {
        console.error('Error loading files:', error);
        showToast('Failed to load files', 'error');
    })
    .finally(() => {
        showLoading(false);
    });
}

function displayFiles(files) {
    filesGrid.innerHTML = '';
    
    if (files.length === 0) {
        filesGrid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: #718096;">
                <i class="fas fa-folder-open" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                <h3>No files available</h3>
                <p>Be the first to upload study materials!</p>
            </div>
        `;
        return;
    }
    
    files.forEach(file => {
        const fileCard = createFileCard(file);
        filesGrid.appendChild(fileCard);
    });
}

function createFileCard(file) {
    const card = document.createElement('div');
    card.className = 'file-card';
    card.onclick = () => showFileModal(file);
    
    const fileType = file.file_type.toLowerCase();
    const fileIcon = getFileIcon(fileType);
    const fileSize = formatFileSize(file.file_size);
    const uploadDate = formatDate(file.upload_date);
    
    card.innerHTML = `
        <div class="file-header">
            <div class="file-icon ${fileType.replace('.', '')}">
                <i class="${fileIcon}"></i>
            </div>
            <div class="file-info">
                <h4>${file.original_name}</h4>
                <div class="file-meta">${fileSize} • ${uploadDate}</div>
            </div>
        </div>
        <div class="file-details">
            <p><strong>Subject:</strong> ${file.subject}</p>
            ${file.semester ? `<p><strong>Semester:</strong> ${file.semester}</p>` : ''}
            ${file.year ? `<p><strong>Year:</strong> ${file.year}</p>` : ''}
            ${file.description ? `<p><strong>Description:</strong> ${file.description}</p>` : ''}
        </div>
        <div class="file-tags">
            <span class="tag">${file.subject}</span>
            ${file.semester ? `<span class="tag">Sem ${file.semester}</span>` : ''}
            <span class="tag">${fileType.toUpperCase()}</span>
        </div>
    `;
    
    return card;
}

function getFileIcon(fileType) {
    const icons = {
        '.pdf': 'fas fa-file-pdf',
        '.doc': 'fas fa-file-word',
        '.docx': 'fas fa-file-word',
        '.txt': 'fas fa-file-alt',
        '.jpg': 'fas fa-file-image',
        '.jpeg': 'fas fa-file-image',
        '.png': 'fas fa-file-image'
    };
    return icons[fileType] || 'fas fa-file';
}

function showFileModal(file) {
    currentFileId = file.id;
    
    document.getElementById('modalTitle').textContent = file.original_name;
    
    const modalBody = document.getElementById('modalBody');
    modalBody.innerHTML = `
        <div class="file-details">
            <p><strong>Subject:</strong> ${file.subject}</p>
            ${file.semester ? `<p><strong>Semester:</strong> ${file.semester}</p>` : ''}
            ${file.year ? `<p><strong>Year:</strong> ${file.year}</p>` : ''}
            ${file.description ? `<p><strong>Description:</strong> ${file.description}</p>` : ''}
            <p><strong>File Type:</strong> ${file.file_type.toUpperCase()}</p>
            <p><strong>File Size:</strong> ${formatFileSize(file.file_size)}</p>
            <p><strong>Upload Date:</strong> ${formatDate(file.upload_date)}</p>
        </div>
    `;
    
    document.getElementById('downloadBtn').onclick = () => downloadFile(file.id);
    
    modal.style.display = 'block';
}

function closeModal() {
    modal.style.display = 'none';
    currentFileId = null;
}

function downloadFile(fileId) {
    window.open(`/download/${fileId}`, '_blank');
}

// Filter functions
function filterFiles(filter) {
    let filteredFiles = [...currentFiles];
    
    switch (filter) {
        case 'recent':
            filteredFiles.sort((a, b) => new Date(b.upload_date) - new Date(a.upload_date));
            break;
        case 'popular':
            // For now, just sort by upload date (could be enhanced with download counts)
            filteredFiles.sort((a, b) => new Date(b.upload_date) - new Date(a.upload_date));
            break;
        default:
            // Keep original order
            break;
    }
    
    displayFiles(filteredFiles);
}

function clearFilters() {
    document.getElementById('filterSubject').value = '';
    document.getElementById('filterSemester').value = '';
    document.getElementById('filterType').value = '';
    searchInput.value = '';
    performSearch();
}

// Data loading functions
function loadStatistics() {
    fetch('/stats')
    .then(response => response.json())
    .then(stats => {
        document.getElementById('totalFiles').textContent = stats.totalFiles;
        document.getElementById('totalSubjects').textContent = stats.totalSubjects;
    })
    .catch(error => {
        console.error('Error loading statistics:', error);
    });
}

function loadSubjects() {
    fetch('/subjects')
    .then(response => response.json())
    .then(subjects => {
        const subjectSelect = document.getElementById('filterSubject');
        subjectSelect.innerHTML = '<option value="">All Subjects</option>';
        
        subjects.forEach(subject => {
            const option = document.createElement('option');
            option.value = subject;
            option.textContent = subject;
            subjectSelect.appendChild(option);
        });
    })
    .catch(error => {
        console.error('Error loading subjects:', error);
    });
}

function loadInitialData() {
    // Load initial files for browse section
    loadFiles();
}

function loadMoreFiles() {
    // For now, just reload all files
    // Could be enhanced with pagination
    loadFiles();
}

// Utility functions
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function showLoading(show) {
    if (show) {
        loadingSpinner.style.display = 'block';
        isLoading = true;
    } else {
        loadingSpinner.style.display = 'none';
        isLoading = false;
    }
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.5rem;">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;
    
    toastContainer.appendChild(toast);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 5000);
}

// Auth state
function restoreAuthAndInitUI() {
    try {
        const authRaw = localStorage.getItem('studentAuth');
        if (authRaw) {
            const auth = JSON.parse(authRaw);
            if (auth && auth.hall_ticket && auth.university) {
                setProfile(auth);
                updateNavForAuth();
                return;
            }
        }
    } catch {}
    updateNavForAuth();
}

function handleLogin(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const name = formData.get('name')?.toString().trim();
    const hall_ticket = formData.get('hall_ticket')?.toString().trim();
    const university = formData.get('university')?.toString().trim();
    const password = formData.get('password')?.toString();
    if (!name || !hall_ticket || !university || !password) {
        showToast('Please fill all required fields', 'error');
        return;
    }
    // For now, accept any non-empty credentials on client-side
    const auth = { name, hall_ticket, university };
    localStorage.setItem('studentAuth', JSON.stringify(auth));
    setProfile(auth);
    updateNavForAuth();
    showToast('Login successful', 'success');
    // Redirect to main site (home)
    showSection('home');
}

function logout() {
    localStorage.removeItem('studentAuth');
    updateNavForAuth();
    showToast('Logged out', 'info');
    showSection('login');
}

function isLoggedIn() {
    try {
        const authRaw = localStorage.getItem('studentAuth');
        if (!authRaw) return false;
        const auth = JSON.parse(authRaw);
        return !!(auth && auth.hall_ticket && auth.university);
    } catch { return false; }
}

function getAuth() {
    try {
        return JSON.parse(localStorage.getItem('studentAuth')) || null;
    } catch { return null; }
}

function updateNavForAuth() {
    const navProfile = document.getElementById('navProfile');
    const navLogin = document.getElementById('navLogin');
    const logged = isLoggedIn();
    if (navProfile) navProfile.style.display = logged ? '' : 'none';
    if (navLogin) navLogin.style.display = logged ? 'none' : '';
}

function setProfile(auth) {
    const { name, hall_ticket, university } = auth;
    const profileName = document.getElementById('profileName');
    const profileHall = document.getElementById('profileHallTicket');
    const profileUnivA = document.getElementById('profileUniversity');
    const profileUnivB = document.getElementById('profileUniversityDetail');
    if (profileName) profileName.textContent = name || '-';
    if (profileHall) profileHall.textContent = hall_ticket || '-';
    if (profileUnivA) profileUnivA.textContent = university || '-';
    if (profileUnivB) profileUnivB.textContent = university || '-';
}

// Prompt utilities
async function promptForSemesterAndSubject() {
    try {
        // Prompt for semester
        const semesters = (typeof getAllSemesters !== 'undefined') ? getAllSemesters() : ['1','2','3','4','5','6','7','8'];
        const semester = await simplePromptSelect('Select Semester', semesters.map(s => ({ value: s, label: `Semester ${s}` })), true);
        if (!semester) return null;
        // Prompt for subject filtered by semester
        let subjects = [];
        if (typeof getSubjectsForSemester !== 'undefined') {
            subjects = getSubjectsForSemester(semester);
        }
        if (!subjects || subjects.length === 0) {
            // Fallback to all subjects
            subjects = (typeof ALL_SUBJECTS !== 'undefined') ? ALL_SUBJECTS : [];
        }
        if (!subjects || subjects.length === 0) return { semester, subject: '' };
        const subject = await simplePromptSelect('Select Subject', subjects.map(s => ({ value: s, label: s })), true);
        if (!subject) return null;
        return { semester, subject };
    } catch (e) {
        return null;
    }
}

function simplePromptSelect(title, options, required = false) {
    return new Promise((resolve) => {
        // Build a minimal modal
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.left = '0';
        overlay.style.top = '0';
        overlay.style.right = '0';
        overlay.style.bottom = '0';
        overlay.style.background = 'rgba(0,0,0,0.35)';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.zIndex = '10000';

        const box = document.createElement('div');
        box.style.background = '#fff';
        box.style.borderRadius = '10px';
        box.style.padding = '1rem';
        box.style.minWidth = '280px';
        box.style.boxShadow = '0 10px 25px rgba(0,0,0,0.15)';

        const h = document.createElement('h3');
        h.textContent = title;
        h.style.marginTop = '0';
        h.style.marginBottom = '0.75rem';

        const select = document.createElement('select');
        select.style.width = '100%';
        select.style.padding = '0.5rem';
        select.style.border = '1px solid #e2e8f0';
        select.style.borderRadius = '6px';

        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = 'Select';
        select.appendChild(placeholder);

        options.forEach(opt => {
            const o = document.createElement('option');
            o.value = opt.value;
            o.textContent = opt.label;
            select.appendChild(o);
        });

        const actions = document.createElement('div');
        actions.style.display = 'flex';
        actions.style.justifyContent = 'flex-end';
        actions.style.gap = '0.5rem';
        actions.style.marginTop = '0.75rem';

        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'btn btn-outline';
        cancelBtn.textContent = 'Cancel';
        cancelBtn.onclick = () => { document.body.removeChild(overlay); resolve(null); };

        const okBtn = document.createElement('button');
        okBtn.className = 'btn btn-primary';
        okBtn.textContent = 'OK';
        okBtn.onclick = () => {
            if (required && !select.value) return;
            const value = select.value;
            document.body.removeChild(overlay);
            resolve(value);
        };

        box.appendChild(h);
        box.appendChild(select);
        actions.appendChild(cancelBtn);
        actions.appendChild(okBtn);
        box.appendChild(actions);
        overlay.appendChild(box);
        document.body.appendChild(overlay);
        select.focus();
    });
}

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Escape key to close modal
    if (e.key === 'Escape' && modal.style.display === 'block') {
        closeModal();
    }
    
    // Ctrl/Cmd + K to focus search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInput.focus();
    }
});

// Auto-save search query in localStorage
searchInput.addEventListener('input', function() {
    localStorage.setItem('lastSearchQuery', this.value);
});

// Restore last search query
window.addEventListener('load', function() {
    const lastQuery = localStorage.getItem('lastSearchQuery');
    if (lastQuery) {
        searchInput.value = lastQuery;
    }
});

// Mock Tests Functions

function loadMockTests() {
    const subject = document.getElementById('testSubject').value;
    const semester = document.getElementById('testSemester').value;
    
    const params = new URLSearchParams();
    if (subject) params.append('subject', subject);
    if (semester) params.append('semester', semester);
    
    showLoading(true);
    
    fetch(`/api/mock-tests?${params}`)
    .then(response => response.json())
    .then(tests => {
        displayMockTests(tests);
    })
    .catch(error => {
        console.error('Error loading mock tests:', error);
        showToast('Failed to load mock tests', 'error');
    })
    .finally(() => {
        showLoading(false);
    });
}

function displayMockTests(tests) {
    const testsGrid = document.getElementById('testsGrid');
    testsGrid.innerHTML = '';
    
    if (tests.length === 0) {
        testsGrid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: #718096;">
                <i class="fas fa-clipboard-check" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                <h3>No mock tests available</h3>
                <p>Check back later for new tests!</p>
            </div>
        `;
        return;
    }
    
    tests.forEach(test => {
        const testCard = createTestCard(test);
        testsGrid.appendChild(testCard);
    });
}

function createTestCard(test) {
    const card = document.createElement('div');
    card.className = 'test-card';
    card.onclick = () => showTestModal(test);
    
    const createdDate = formatDate(test.created_date);
    
    card.innerHTML = `
        <div class="test-header">
            <div class="test-icon">
                <i class="fas fa-clipboard-check"></i>
            </div>
            <div class="test-info">
                <h4>${test.title}</h4>
                <div class="test-meta">${test.subject} • ${createdDate}</div>
            </div>
        </div>
        <div class="test-details">
            ${test.description ? `<p><strong>Description:</strong> ${test.description}</p>` : ''}
            ${test.semester ? `<p><strong>Semester:</strong> ${test.semester}</p>` : ''}
            ${test.year ? `<p><strong>Year:</strong> ${test.year}</p>` : ''}
        </div>
        <div class="test-stats">
            <div class="test-stat">
                <span class="test-stat-number">${test.total_questions}</span>
                <span class="test-stat-label">Questions</span>
            </div>
            <div class="test-stat">
                <span class="test-stat-number">${test.duration_minutes}</span>
                <span class="test-stat-label">Minutes</span>
            </div>
        </div>
        <div class="test-tags">
            <span class="tag">${test.subject}</span>
            ${test.semester ? `<span class="tag">Sem ${test.semester}</span>` : ''}
        </div>
    `;
    
    return card;
}

function showTestModal(test) {
    currentTest = test;
    
    document.getElementById('testModalTitle').textContent = test.title;
    
    const modalBody = document.getElementById('testModalBody');
    modalBody.innerHTML = `
        <div class="test-details">
            <p><strong>Subject:</strong> ${test.subject}</p>
            ${test.semester ? `<p><strong>Semester:</strong> ${test.semester}</p>` : ''}
            ${test.year ? `<p><strong>Year:</strong> ${test.year}</p>` : ''}
            ${test.description ? `<p><strong>Description:</strong> ${test.description}</p>` : ''}
            <p><strong>Questions:</strong> ${test.total_questions}</p>
            <p><strong>Duration:</strong> ${test.duration_minutes} minutes</p>
            <p><strong>Created:</strong> ${formatDate(test.created_date)}</p>
        </div>
    `;
    
    document.getElementById('testModal').style.display = 'block';
}

function closeTestModal() {
    document.getElementById('testModal').style.display = 'none';
    currentTest = null;
}

function startTest() {
    if (!currentTest) return;
    
    showLoading(true);
    
    fetch(`/api/mock-tests/${currentTest.id}`)
    .then(response => response.json())
    .then(testData => {
        currentTest = testData;
        currentTestAnswers = new Array(testData.questions.length).fill('');
        testTimeRemaining = testData.duration_minutes * 60;
        currentQuestionIndex = 0;
        
        showTestTakingModal();
        startTestTimer();
    })
    .catch(error => {
        console.error('Error loading test:', error);
        showToast('Failed to load test', 'error');
    })
    .finally(() => {
        showLoading(false);
    });
}

function showTestTakingModal() {
    document.getElementById('testTakingTitle').textContent = currentTest.title;
    
    const modalBody = document.getElementById('testTakingBody');
    modalBody.innerHTML = '';
    
    currentTest.questions.forEach((question, index) => {
        const questionDiv = document.createElement('div');
        questionDiv.className = 'question-container';
        questionDiv.setAttribute('data-question-index', index);
        questionDiv.innerHTML = `
            <div class="question-number">Question ${index + 1} of ${currentTest.questions.length}</div>
            <div class="question-text">${question.question_text}</div>
            <div class="options-container">
                <div class="option" onclick="selectOption(${index}, 'A')">
                    <input type="radio" name="q${index}" value="A" ${currentTestAnswers[index] === 'A' ? 'checked' : ''}>
                    <span class="option-label">A) ${question.option_a}</span>
                </div>
                <div class="option" onclick="selectOption(${index}, 'B')">
                    <input type="radio" name="q${index}" value="B" ${currentTestAnswers[index] === 'B' ? 'checked' : ''}>
                    <span class="option-label">B) ${question.option_b}</span>
                </div>
                <div class="option" onclick="selectOption(${index}, 'C')">
                    <input type="radio" name="q${index}" value="C" ${currentTestAnswers[index] === 'C' ? 'checked' : ''}>
                    <span class="option-label">C) ${question.option_c}</span>
                </div>
                <div class="option" onclick="selectOption(${index}, 'D')">
                    <input type="radio" name="q${index}" value="D" ${currentTestAnswers[index] === 'D' ? 'checked' : ''}>
                    <span class="option-label">D) ${question.option_d}</span>
                </div>
            </div>
        `;
        modalBody.appendChild(questionDiv);
    });
    
    document.getElementById('testModal').style.display = 'none';
    document.getElementById('testTakingModal').style.display = 'block';
    updateQuestionNavButtons();
    scrollToQuestion(0);
}

function selectOption(questionIndex, option) {
    currentTestAnswers[questionIndex] = option;
    
    // Update visual selection
    const questionContainer = document.querySelectorAll('.question-container')[questionIndex];
    const options = questionContainer.querySelectorAll('.option');
    options.forEach(opt => opt.classList.remove('selected'));
    
    const selectedOption = options[option.charCodeAt(0) - 65]; // A=0, B=1, C=2, D=3
    selectedOption.classList.add('selected');
    
    // Update radio button
    const radio = selectedOption.querySelector('input[type="radio"]');
    radio.checked = true;
}

function startTestTimer() {
    updateTimerDisplay();
    
    testTimer = setInterval(() => {
        testTimeRemaining--;
        updateTimerDisplay();
        
        if (testTimeRemaining <= 0) {
            clearInterval(testTimer);
            submitTest();
        }
    }, 1000);
}

function updateTimerDisplay() {
    const minutes = Math.floor(testTimeRemaining / 60);
    const seconds = testTimeRemaining % 60;
    const timerElement = document.getElementById('testTimer');
    
    timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    // Change color based on time remaining
    const timerContainer = timerElement.parentElement;
    timerContainer.className = 'test-timer';
    
    if (testTimeRemaining <= 300) { // 5 minutes
        timerContainer.classList.add('danger');
    } else if (testTimeRemaining <= 600) { // 10 minutes
        timerContainer.classList.add('warning');
    }
}

function closeTestTakingModal() {
    if (testTimer) {
        clearInterval(testTimer);
        testTimer = null;
    }
    
    document.getElementById('testTakingModal').style.display = 'none';
    currentTest = null;
    currentTestAnswers = [];
    testTimeRemaining = 0;
}

function exitTest() {
    // Confirm exit
    const confirmExit = confirm('Are you sure you want to exit the test? Your progress will be lost.');
    if (!confirmExit) return;
    closeTestTakingModal();
    showToast('Exited the test', 'info');
}

function scrollToQuestion(index) {
    const containers = document.querySelectorAll('.question-container');
    if (index < 0 || index >= containers.length) return;
    const target = containers[index];
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function updateQuestionNavButtons() {
    const prevBtn = document.getElementById('prevQuestionBtn');
    const nextBtn = document.getElementById('nextQuestionBtn');
    if (!prevBtn || !nextBtn) return;
    prevBtn.disabled = currentQuestionIndex <= 0;
    nextBtn.disabled = currentQuestionIndex >= (currentTest?.questions.length - 1);
}

function prevQuestion() {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        scrollToQuestion(currentQuestionIndex);
        updateQuestionNavButtons();
    }
}

function nextQuestion() {
    if (currentTest && currentQuestionIndex < currentTest.questions.length - 1) {
        currentQuestionIndex++;
        scrollToQuestion(currentQuestionIndex);
        updateQuestionNavButtons();
    }
}

function submitTest() {
    if (testTimer) {
        clearInterval(testTimer);
        testTimer = null;
    }
    
    const studentName = prompt('Enter your name:');
    if (!studentName) return;
    
    const timeTaken = (currentTest.duration_minutes * 60) - testTimeRemaining;
    
    const submitData = {
        student_name: studentName,
        answers: currentTestAnswers,
        time_taken: timeTaken
    };
    
    showLoading(true);
    
    fetch(`/api/mock-tests/${currentTest.id}/attempt`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(submitData)
    })
    .then(response => response.json())
    .then(result => {
        showTestResults(result);
    })
    .catch(error => {
        console.error('Error submitting test:', error);
        showToast('Failed to submit test', 'error');
    })
    .finally(() => {
        showLoading(false);
    });
}

function showTestResults(result) {
    const modalBody = document.getElementById('testTakingBody');
    modalBody.innerHTML = `
        <div class="test-results">
            <div class="score-display">${result.score}/${result.totalQuestions}</div>
            <div class="score-percentage">${result.percentage}%</div>
            <div class="results-details">
                <div class="result-item">
                    <h4>Correct Answers</h4>
                    <p>${result.score}</p>
                </div>
                <div class="result-item">
                    <h4>Total Questions</h4>
                    <p>${result.totalQuestions}</p>
                </div>
                <div class="result-item">
                    <h4>Percentage</h4>
                    <p>${result.percentage}%</p>
                </div>
            </div>
            <p>Great job! Your test has been submitted successfully.</p>
        </div>
    `;
    
    document.getElementById('submitTestBtn').style.display = 'none';
    
    setTimeout(() => {
        closeTestTakingModal();
        showToast('Test submitted successfully!', 'success');
    }, 3000);
}

// Doubt Clarification Functions

function loadDoubts() {
    const subject = document.getElementById('doubtSubject').value;
    const status = document.getElementById('doubtStatus').value;
    
    const params = new URLSearchParams();
    if (subject) params.append('subject', subject);
    if (status) params.append('status', status);
    
    showLoading(true);
    
    fetch(`/api/doubts?${params}`)
    .then(response => response.json())
    .then(doubts => {
        displayDoubts(doubts);
    })
    .catch(error => {
        console.error('Error loading doubts:', error);
        showToast('Failed to load doubts', 'error');
    })
    .finally(() => {
        showLoading(false);
    });
}

function displayDoubts(doubts) {
    const doubtsList = document.getElementById('doubtsList');
    doubtsList.innerHTML = '';
    
    if (doubts.length === 0) {
        doubtsList.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: #718096;">
                <i class="fas fa-question-circle" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                <h3>No questions found</h3>
                <p>Be the first to ask a question!</p>
            </div>
        `;
        return;
    }
    
    doubts.forEach(doubt => {
        const doubtCard = createDoubtCard(doubt);
        doubtsList.appendChild(doubtCard);
    });
}

function createDoubtCard(doubt) {
    const card = document.createElement('div');
    card.className = `doubt-card ${doubt.status}`;
    card.onclick = () => showDoubtModal(doubt);
    
    const createdDate = formatDate(doubt.created_date);
    
    card.innerHTML = `
        <div class="doubt-header">
            <div>
                <div class="doubt-title">${doubt.title}</div>
                <div class="doubt-meta">
                    <span><i class="fas fa-user"></i> ${doubt.student_name}</span>
                    <span><i class="fas fa-calendar"></i> ${createdDate}</span>
                    ${doubt.semester ? `<span><i class="fas fa-graduation-cap"></i> Sem ${doubt.semester}</span>` : ''}
                </div>
            </div>
            <div class="doubt-status ${doubt.status}">${doubt.status}</div>
        </div>
        <div class="doubt-description">${doubt.description}</div>
        <div class="doubt-footer">
            <div class="doubt-author">Asked by ${doubt.student_name}</div>
            <div class="doubt-responses">
                <i class="fas fa-comments"></i>
                ${doubt.response_count || 0} responses
            </div>
        </div>
    `;
    
    return card;
}

function showAskDoubtForm() {
    document.getElementById('askDoubtModal').style.display = 'block';
}

function closeAskDoubtModal() {
    document.getElementById('askDoubtModal').style.display = 'none';
    document.getElementById('askDoubtForm').reset();
}

function submitDoubt() {
    const form = document.getElementById('askDoubtForm');
    const formData = new FormData(form);
    
    const doubtData = {
        title: formData.get('title'),
        description: formData.get('description'),
        subject: formData.get('subject'),
        semester: formData.get('semester'),
        student_name: formData.get('student_name'),
        student_email: formData.get('student_email')
    };
    
    if (!doubtData.title || !doubtData.description || !doubtData.subject || !doubtData.student_name) {
        showToast('Please fill in all required fields', 'error');
        return;
    }
    
    showLoading(true);
    
    fetch('/api/doubts', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(doubtData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            throw new Error(data.error);
        }
        
        showToast('Question posted successfully!', 'success');
        closeAskDoubtForm();
        loadDoubts();
    })
    .catch(error => {
        console.error('Error posting doubt:', error);
        showToast(error.message || 'Failed to post question', 'error');
    })
    .finally(() => {
        showLoading(false);
    });
}

function showDoubtModal(doubt) {
    currentDoubt = doubt;
    
    showLoading(true);
    
    fetch(`/api/doubts/${doubt.id}`)
    .then(response => response.json())
    .then(doubtData => {
        document.getElementById('doubtModalTitle').textContent = doubtData.title;
        
        const modalBody = document.getElementById('doubtModalBody');
        modalBody.innerHTML = `
            <div class="doubt-details">
                <h4>Question Details</h4>
                <p><strong>Subject:</strong> ${doubtData.subject}</p>
                ${doubtData.semester ? `<p><strong>Semester:</strong> ${doubtData.semester}</p>` : ''}
                <p><strong>Asked by:</strong> ${doubtData.student_name}</p>
                <p><strong>Date:</strong> ${formatDate(doubtData.created_date)}</p>
                <p><strong>Status:</strong> <span class="doubt-status ${doubtData.status}">${doubtData.status}</span></p>
                <p><strong>Description:</strong></p>
                <p>${doubtData.description}</p>
            </div>
            <div class="responses-section">
                <h4>Responses (${doubtData.responses.length})</h4>
                ${doubtData.responses.length === 0 ? 
                    '<p style="color: #718096; font-style: italic;">No responses yet. Be the first to help!</p>' :
                    doubtData.responses.map(response => `
                        <div class="response-item ${response.is_solution ? 'solution' : ''}">
                            <div class="response-header">
                                <div class="response-author">${response.responder_name}</div>
                                <div>
                                    ${response.is_solution ? '<span class="solution-badge">Solution</span>' : ''}
                                    <span class="response-date">${formatDate(response.created_date)}</span>
                                </div>
                            </div>
                            <div class="response-text">${response.response_text}</div>
                        </div>
                    `).join('')
                }
            </div>
        `;
        
        document.getElementById('doubtModal').style.display = 'block';
    })
    .catch(error => {
        console.error('Error loading doubt details:', error);
        showToast('Failed to load question details', 'error');
    })
    .finally(() => {
        showLoading(false);
    });
}

function closeDoubtModal() {
    document.getElementById('doubtModal').style.display = 'none';
    currentDoubt = null;
}

function showResponseForm() {
    document.getElementById('responseModal').style.display = 'block';
}

function closeResponseModal() {
    document.getElementById('responseModal').style.display = 'none';
    document.getElementById('responseForm').reset();
}

function submitResponse() {
    const form = document.getElementById('responseForm');
    const formData = new FormData(form);
    
    const responseData = {
        responder_name: formData.get('responder_name'),
        responder_email: formData.get('responder_email'),
        response_text: formData.get('response_text'),
        is_solution: formData.get('is_solution') === 'on'
    };
    
    if (!responseData.responder_name || !responseData.response_text) {
        showToast('Please fill in all required fields', 'error');
        return;
    }
    
    showLoading(true);
    
    fetch(`/api/doubts/${currentDoubt.id}/responses`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(responseData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            throw new Error(data.error);
        }
        
        showToast('Response posted successfully!', 'success');
        closeResponseModal();
        showDoubtModal(currentDoubt); // Refresh the doubt modal
        loadDoubts(); // Refresh the doubts list
    })
    .catch(error => {
        console.error('Error posting response:', error);
        showToast(error.message || 'Failed to post response', 'error');
    })
    .finally(() => {
        showLoading(false);
    });
}

// Initialize new sections
function initializeNewSections() {
    // Load subjects for test filters
    loadSubjectsForTests();
    
    // Load subjects for doubt filters
    loadSubjectsForDoubts();
    
    // Load subjects for upload form
    loadSubjectsForUpload();
    
    // Load subjects for doubt form
    loadSubjectsForDoubtForm();
    
    // Load initial data
    loadMockTests();
    loadDoubts();
    
    // Setup event listeners for new sections
    document.getElementById('testSubject').addEventListener('change', loadMockTests);
    document.getElementById('testSemester').addEventListener('change', function() {
        loadSubjectsForTests(); // Update subjects when semester changes
        loadMockTests(); // Reload tests
    });
    document.getElementById('doubtSubject').addEventListener('change', loadDoubts);
    document.getElementById('doubtSemester').addEventListener('change', function() {
        loadSubjectsForDoubts(); // Update subjects when semester changes
        loadDoubts(); // Reload doubts
    });
    document.getElementById('doubtStatus').addEventListener('change', loadDoubts);
    
    // Setup event listener for upload form semester change
    document.getElementById('semester').addEventListener('change', loadSubjectsForUpload);
    
    // Setup event listener for doubt form semester change
    document.getElementById('doubtFormSemester').addEventListener('change', loadSubjectsForDoubtForm);
}

function loadSubjectsForTests() {
    const subjectSelect = document.getElementById('testSubject');
    const semesterSelect = document.getElementById('testSemester');
    
    // Clear existing options
    subjectSelect.innerHTML = '<option value="">All Subjects</option>';
    
    // Get selected semester
    const selectedSemester = semesterSelect.value;
    
    if (selectedSemester && typeof getSubjectsForSemester !== 'undefined') {
        // Show only subjects for selected semester
        const semesterSubjects = getSubjectsForSemester(selectedSemester);
        semesterSubjects.forEach(subject => {
            const option = document.createElement('option');
            option.value = subject;
            option.textContent = subject;
            subjectSelect.appendChild(option);
        });
    } else if (typeof ALL_SUBJECTS !== 'undefined') {
        // Show all subjects if no semester selected
        ALL_SUBJECTS.forEach(subject => {
            const option = document.createElement('option');
            option.value = subject;
            option.textContent = subject;
            subjectSelect.appendChild(option);
        });
    } else {
        // Fallback to API call
        fetch('/subjects')
        .then(response => response.json())
        .then(subjects => {
            subjects.forEach(subject => {
                const option = document.createElement('option');
                option.value = subject;
                option.textContent = subject;
                subjectSelect.appendChild(option);
            });
        })
        .catch(error => {
            console.error('Error loading subjects for tests:', error);
        });
    }
}

function loadSubjectsForDoubts() {
    const subjectSelect = document.getElementById('doubtSubject');
    const semesterSelect = document.getElementById('doubtSemester');
    
    // Clear existing options
    subjectSelect.innerHTML = '<option value="">All Subjects</option>';
    
    // Get selected semester (if doubt semester selector exists)
    const selectedSemester = semesterSelect ? semesterSelect.value : null;
    
    if (selectedSemester && typeof getSubjectsForSemester !== 'undefined') {
        // Show only subjects for selected semester
        const semesterSubjects = getSubjectsForSemester(selectedSemester);
        semesterSubjects.forEach(subject => {
            const option = document.createElement('option');
            option.value = subject;
            option.textContent = subject;
            subjectSelect.appendChild(option);
        });
    } else if (typeof ALL_SUBJECTS !== 'undefined') {
        // Show all subjects if no semester selected
        ALL_SUBJECTS.forEach(subject => {
            const option = document.createElement('option');
            option.value = subject;
            option.textContent = subject;
            subjectSelect.appendChild(option);
        });
    } else {
        // Fallback to API call
        fetch('/subjects')
        .then(response => response.json())
        .then(subjects => {
            subjects.forEach(subject => {
                const option = document.createElement('option');
                option.value = subject;
                option.textContent = subject;
                subjectSelect.appendChild(option);
            });
        })
        .catch(error => {
            console.error('Error loading subjects for doubts:', error);
        });
    }
}

function loadSubjectsForUpload() {
    const subjectSelect = document.getElementById('subject');
    const semesterSelect = document.getElementById('semester');
    
    // Clear existing options
    subjectSelect.innerHTML = '<option value="">Select Subject</option>';
    
    // Get selected semester
    const selectedSemester = semesterSelect.value;
    
    if (selectedSemester && typeof getSubjectsForSemester !== 'undefined') {
        // Show only subjects for selected semester
        const semesterSubjects = getSubjectsForSemester(selectedSemester);
        semesterSubjects.forEach(subject => {
            const option = document.createElement('option');
            option.value = subject;
            option.textContent = subject;
            subjectSelect.appendChild(option);
        });
    } else if (typeof ALL_SUBJECTS !== 'undefined') {
        // Show all subjects if no semester selected
        ALL_SUBJECTS.forEach(subject => {
            const option = document.createElement('option');
            option.value = subject;
            option.textContent = subject;
            subjectSelect.appendChild(option);
        });
    } else {
        // Fallback to API call
        fetch('/subjects')
        .then(response => response.json())
        .then(subjects => {
            subjects.forEach(subject => {
                const option = document.createElement('option');
                option.value = subject;
                option.textContent = subject;
                subjectSelect.appendChild(option);
            });
        })
        .catch(error => {
            console.error('Error loading subjects for upload:', error);
        });
    }
}

function loadSubjectsForDoubtForm() {
    const subjectSelect = document.getElementById('doubtFormSubject');
    const semesterSelect = document.getElementById('doubtFormSemester');
    
    // Clear existing options
    subjectSelect.innerHTML = '<option value="">Select Subject</option>';
    
    // Get selected semester
    const selectedSemester = semesterSelect.value;
    
    if (selectedSemester && typeof getSubjectsForSemester !== 'undefined') {
        // Show only subjects for selected semester
        const semesterSubjects = getSubjectsForSemester(selectedSemester);
        semesterSubjects.forEach(subject => {
            const option = document.createElement('option');
            option.value = subject;
            option.textContent = subject;
            subjectSelect.appendChild(option);
        });
    } else if (typeof ALL_SUBJECTS !== 'undefined') {
        // Show all subjects if no semester selected
        ALL_SUBJECTS.forEach(subject => {
            const option = document.createElement('option');
            option.value = subject;
            option.textContent = subject;
            subjectSelect.appendChild(option);
        });
    } else {
        // Fallback to API call
        fetch('/subjects')
        .then(response => response.json())
        .then(subjects => {
            subjects.forEach(subject => {
                const option = document.createElement('option');
                option.value = subject;
                option.textContent = subject;
                subjectSelect.appendChild(option);
            });
        })
        .catch(error => {
            console.error('Error loading subjects for doubt form:', error);
        });
    }
}

// Update the main initialization function
const originalInitializeApp = initializeApp;
initializeApp = function() {
    originalInitializeApp();
    initializeNewSections();
};

// Quick actions and navigation helpers that prompt for semester/subject
function promptAndSearch(mode) {
    promptForSemesterAndSubject().then(selection => {
        if (!selection) return;
        showSection('search');
        // Pre-fill filters
        document.getElementById('filterSemester').value = selection.semester || '';
        // Populate subjects dropdown based on semester
        if (typeof getSubjectsForSemester !== 'undefined') {
            const subjectSelect = document.getElementById('filterSubject');
            subjectSelect.innerHTML = '<option value="">All Subjects</option>';
            const subs = selection.semester ? getSubjectsForSemester(selection.semester) : (typeof ALL_SUBJECTS !== 'undefined' ? ALL_SUBJECTS : []);
            subs.forEach(s => {
                const o = document.createElement('option');
                o.value = s; o.textContent = s; subjectSelect.appendChild(o);
            });
        }
        document.getElementById('filterSubject').value = selection.subject || '';

        // Optionally constrain by type for question papers
        if (mode === 'question-paper') {
            document.getElementById('filterType').value = '.pdf';
        } else {
            document.getElementById('filterType').value = '';
        }
        performSearch();
    });
}

function goToMockTestsWithPrompt() {
    promptForSemesterAndSubject().then(selection => {
        if (!selection) return;
        showSection('mocktests');
        document.getElementById('testSemester').value = selection.semester || '';
        loadSubjectsForTests();
        document.getElementById('testSubject').value = selection.subject || '';
        loadMockTests();
    });
}
