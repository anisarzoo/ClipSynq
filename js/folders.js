import { auth, database } from './firebase-config.js';
import { getUserId, getCurrentFolder, setCurrentFolder, escapeHtml } from './app.js';
import { ref, push, onValue, remove, serverTimestamp, get, update } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { loadMessages } from './messages.js';

export let messageCount = {};

export function initFolders() {
    loadFolders();
    setupFolderEvents();
    setupFolderCountListener();
}

// Real-time listener for message count updates
function setupFolderCountListener() {
    const userId = getUserId();
    if (!userId) return;

    const msgsRef = ref(database, `users/${userId}/messages`);
    onValue(msgsRef, () => {
        // Recompute counts whenever messages change
        recomputeAllFolderCounts();
    });
}

// -------- events --------
function setupFolderEvents() {
    document.getElementById('addFolderBtn')?.addEventListener('click', () => {
        document.getElementById('folderModal').style.display = 'flex';
        document.getElementById('folderNameInput').value = '';
        document.querySelectorAll('.icon-option').forEach(o => o.classList.remove('active'));
        document.querySelector('.icon-option[data-icon="folder"]')?.classList.add('active');
        setTimeout(() => document.getElementById('folderNameInput').focus(), 100);
    });

    document.getElementById('iconPicker')?.addEventListener('click', (e) => {
        const opt = e.target.closest('.icon-option');
        if (!opt) return;
        document.querySelectorAll('.icon-option').forEach(o => o.classList.remove('active'));
        opt.classList.add('active');
    });

    document.getElementById('createFolderBtn')?.addEventListener('click', createFolder);
    document.getElementById('cancelFolderBtn')?.addEventListener('click', () => {
        document.getElementById('folderModal').style.display = 'none';
    });
    document.getElementById('closeFolderModal')?.addEventListener('click', () => {
        document.getElementById('folderModal').style.display = 'none';
    });

    document.getElementById('folderNameInput')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') createFolder();
    });

    document.getElementById('foldersList')?.addEventListener('click', (e) => {
        const item = e.target.closest('.folder-item');
        if (!item) return;

        if (e.target.closest('.delete-folder-btn')) {
            e.stopPropagation();
            const id = item.dataset.id;
            deleteFolder(id);
            return;
        }

        if (e.target.closest('.edit-folder-btn')) {
            e.stopPropagation();
            const id = item.dataset.id;
            const name = item.dataset.name;
            editFolder(id, name);
            return;
        }

        const folderId = item.dataset.folder || item.dataset.id;
        const icon = item.dataset.icon || 'inbox';
        const name = item.dataset.name || 'All Messages';
        switchFolder(folderId, name, icon);
    });
}

// -------- CRUD folders --------
async function createFolder() {
    const name = document.getElementById('folderNameInput').value.trim();
    if (!name) {
        alert('Please enter a folder name');
        return;
    }

    if (name.length > 30) {
        alert('Folder name must be less than 30 characters');
        return;
    }

    const icon = document.querySelector('.icon-option.active')?.dataset.icon || 'folder';

    const userId = getUserId();
    if (!userId) return;

    const foldersRef = ref(database, `users/${userId}/folders`);
    await push(foldersRef, {
        name,
        icon,
        createdAt: serverTimestamp()
    });

    document.getElementById('folderModal').style.display = 'none';
}

function loadFolders() {
    const userId = getUserId();
    if (!userId) return;

    const foldersRef = ref(database, `users/${userId}/folders`);

    onValue(foldersRef, (snap) => {
        const list = document.getElementById('foldersList');
        if (!list) return;

        list.innerHTML = '';

        // "All messages" item
        const allItem = document.createElement('div');
        allItem.className = 'folder-item active';
        allItem.dataset.folder = 'all';
        allItem.dataset.name = 'All Messages';
        allItem.dataset.icon = 'inbox';
        allItem.innerHTML = `
            <div class="folder-info">
                <i class="fas fa-inbox folder-icon"></i>
                <span class="folder-name">All Messages</span>
            </div>
            <div class="folder-right">
                <span class="folder-count" id="count-all">0</span>
            </div>
        `;
        list.appendChild(allItem);

        if (snap.exists()) {
            snap.forEach(child => {
                const id = child.key;
                const folder = child.val();
                const div = document.createElement('div');
                div.className = 'folder-item';
                div.dataset.id = id;
                div.dataset.folder = id;
                div.dataset.name = folder.name;
                div.dataset.icon = folder.icon || 'folder';

                const iconClass = folder.icon || 'folder';

                div.innerHTML = `
                    <div class="folder-info">
                        <i class="fas fa-${iconClass} folder-icon"></i>
                        <span class="folder-name">${escapeHtml(folder.name)}</span>
                    </div>
                    <div class="folder-right">
                        <span class="folder-count" id="count-${id}">0</span>
                        <button class="edit-folder-btn" title="Edit folder">
                            <i class="fas fa-pen"></i>
                        </button>
                        <button class="delete-folder-btn" title="Delete folder">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                `;

                list.appendChild(div);
            });
        }

        recomputeAllFolderCounts();
        loadMessages();
    });
}

async function deleteFolder(id) {
    if (!confirm('Delete this folder?\n\nMessages stay, only folder is removed.')) return;

    const userId = getUserId();
    if (!userId) return;

    await remove(ref(database, `users/${userId}/folders/${id}`));

    // Remove folder reference from messages
    const msgsRef = ref(database, `users/${userId}/messages`);
    const snap = await get(msgsRef);

    if (snap.exists()) {
        const updates = {};
        snap.forEach(child => {
            const msg = child.val();
            if (msg.folder === id) {
                updates[`${child.key}/folder`] = null;
            }
        });

        if (Object.keys(updates).length) {
            await update(msgsRef, updates);
        }
    }

    recomputeAllFolderCounts();
}

// -------- counting --------
export async function recomputeAllFolderCounts() {
    const userId = getUserId();
    if (!userId) return;

    const msgsRef = ref(database, `users/${userId}/messages`);
    const snap = await get(msgsRef);

    const counts = {};
    counts['all'] = 0;

    if (snap.exists()) {
        snap.forEach(child => {
            const msg = child.val();
            counts['all']++;
            if (msg.folder) {
                counts[msg.folder] = (counts[msg.folder] || 0) + 1;
            }
        });
    }

    messageCount = counts;
    updateFolderBadges();
}

function updateFolderBadges() {
    const allEl = document.getElementById('count-all');
    if (allEl) {
        allEl.textContent = messageCount['all'] || 0;
    }

    Object.keys(messageCount).forEach(folderId => {
        if (folderId === 'all') return;

        const el = document.getElementById(`count-${folderId}`);
        if (el) {
            el.textContent = messageCount[folderId] || 0;
        }
    });
}

// -------- switching folder --------
function switchFolder(folderId, name, icon) {
    setCurrentFolder(folderId);

    document.querySelectorAll('.folder-item').forEach(i => i.classList.remove('active'));
    const active = document.querySelector(`.folder-item[data-folder="${folderId}"]`) ||
                   document.querySelector(`.folder-item[data-id="${folderId}"]`);
    if (active) active.classList.add('active');

    const title = document.getElementById('folderTitle');
    const iconEl = document.getElementById('folderIcon');

    if (title) title.textContent = name;
    if (iconEl) iconEl.className = `fas fa-${icon || 'inbox'}`;

    loadMessages();
}

// -------- edit folder --------
async function editFolder(folderId, currentName) {
    const newName = prompt('Edit folder name:', currentName);
    if (!newName || newName === currentName) return;

    if (!newName.trim()) {
        alert('Folder name cannot be empty');
        return;
    }

    const user = auth.currentUser;
    const userId = getUserId();
    if (!userId) return;

    try {
        const folderRef = ref(database, `users/${userId}/folders/${folderId}`);
        await update(folderRef, {
            name: newName.trim()
        });
    } catch (error) {
        console.error('Error updating folder:', error);
        alert('Failed to update folder name');
    }
}
