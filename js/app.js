// app.js - Main Application Logic

import { auth, database } from './firebase-config.js';
import { signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { ref, update, remove, onValue } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

import { initSearch } from './search.js';
import { initFolders } from './folders.js';
import { initMessages } from './messages.js';
import { initDevices, getDeviceInfo } from './devices.js';
import { initQR } from './qr.js';
import { initGlobal, cleanupGlobal } from './global.js';
import { initNotifications } from './notifications.js';

export let currentUser = auth.currentUser;
export let currentFolder = 'all';

// ==========================
// Custom confirm modal helper
// ==========================
export function showConfirm(message) {
  return new Promise((resolve) => {
    const modal = document.getElementById('confirmModal');
    const textEl = document.getElementById('confirmMessage');
    const okBtn = document.getElementById('confirmActionBtn');
    const cancelBtn = document.getElementById('confirmCancelBtn');

    if (!modal || !textEl || !okBtn || !cancelBtn) {
      const result = window.confirm(message);
      resolve(result);
      return;
    }

    textEl.textContent = message;
    modal.classList.add('active');

    const cleanup = () => {
      modal.classList.remove('active');
      okBtn.onclick = null;
      cancelBtn.onclick = null;
    };

    okBtn.onclick = () => {
      cleanup();
      resolve(true);
    };

    cancelBtn.onclick = () => {
      cleanup();
      resolve(false);
    };
  });
}

// ✅ SAFE: Get user ID with proper Firebase Auth detection
export function getUserId() {
  // PRIORITY 1: Firebase Auth user (regular login)
  if (auth.currentUser && auth.currentUser.uid) {
    return auth.currentUser.uid;
  }

  // PRIORITY 2: QR login (only if Firebase Auth is null)
  const linkedUserId = localStorage.getItem('linkedUserId');
  const loginMethod = localStorage.getItem('loginMethod');

  if (linkedUserId && loginMethod === 'qr' && !auth.currentUser) {
    return linkedUserId; // QR login
  }

  return null;
}

// ✅ SAFE: Check if this is a QR login session
export function isQRLogin() {
  // Only true if NO Firebase Auth AND has QR login data
  return (
    !auth.currentUser &&
    localStorage.getItem('loginMethod') === 'qr' &&
    localStorage.getItem('linkedUserId')
  );
}

// Dynamic getter for device ID
export function getDeviceId() {
  let deviceId = localStorage.getItem('deviceId');
  if (!deviceId) {
    deviceId =
      'device_' + Math.random().toString(36).substr(2, 9) + Date.now();
    localStorage.setItem('deviceId', deviceId);
  }
  return deviceId;
}

// Auto-detect device name if not present
export let deviceName = localStorage.getItem('deviceName');

if (!deviceName) {
  const detectedInfo = getDeviceInfo();
  deviceName = detectedInfo.deviceName;
  localStorage.setItem('deviceName', deviceName);
  console.log('📱 Device auto-detected:', deviceName);
}

// Helper to update all device/user name displays
function updateDeviceNameDisplay() {
  let userLabel = 'You';

  const linkedName = localStorage.getItem('linkedUserName');
  const linkedEmail = localStorage.getItem('linkedUserEmail');

  if (linkedName && linkedName !== 'null' && linkedName !== 'undefined') {
    userLabel = linkedName;
  } else if (
    linkedEmail &&
    linkedEmail !== 'null' &&
    linkedEmail !== 'undefined'
  ) {
    userLabel = linkedEmail.split('@')[0];
  } else {
    const user = auth.currentUser;
    if (user) {
      userLabel = user.displayName || user.email || 'You';
    }
  }

  document.querySelectorAll('.userName').forEach((el) => {
    el.textContent = userLabel;
  });

  const deviceLabel = deviceName || 'My Device';
  document
    .querySelectorAll('.deviceName, .deviceNameLabel')
    .forEach((el) => {
      el.textContent = deviceLabel;
    });
}

// Execute when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', updateDeviceNameDisplay);
} else {
  updateDeviceNameDisplay();
}

// 🔹 Force-logout watcher: listens on this device node
let forceLogoutUnsub = null;

function startForceLogoutWatcher() {
  const userId = getUserId();
  const deviceId = getDeviceId();
  if (!userId || !deviceId) return;

  const isQR = isQRLogin();
  const devicePath = isQR
    ? `qr-devices/${userId}/${deviceId}`
    : `users/${userId}/devices/${deviceId}`;

  const deviceRef = ref(database, devicePath);

  if (forceLogoutUnsub) {
    forceLogoutUnsub();
    forceLogoutUnsub = null;
  }

  const unsubscribe = onValue(deviceRef, async (snap) => {
    const data = snap.val();
    if (!data || !data.forceLogout) return;

    console.log('🚨 Force logout triggered on this device');

    try {
      await remove(deviceRef); // always remove so device disappears
    } catch (e) {
      console.warn('Failed to remove device after forceLogout', e);
    }

    try {
      await signOut(auth);
    } catch (e) {
      console.warn('signOut after forceLogout failed', e);
    }

    localStorage.removeItem('linkedUserId');
    localStorage.removeItem('linkedUserEmail');
    localStorage.removeItem('linkedUserName');
    localStorage.removeItem('loginMethod');
    localStorage.removeItem('deviceName');
    localStorage.removeItem('deviceId');
    localStorage.removeItem('currentFolder');

    currentUser = null;
    currentFolder = 'all';

    window.location.replace('login.html');
  });

  forceLogoutUnsub = unsubscribe;
}

// Wait for auth to be ready
auth.onAuthStateChanged((user) => {
  if (user) {
    currentUser = user;

    if (localStorage.getItem('loginMethod') === 'qr') {
      console.log('🔄 Converting QR session to Firebase Auth session');
      localStorage.removeItem('loginMethod');
      localStorage.removeItem('linkedUserId');
      localStorage.removeItem('linkedUserEmail');
    }

    updateDeviceNameDisplay();

    initApp();
    updateDeviceStatus(true);
    startForceLogoutWatcher();
  } else {
    const userId = getUserId();
    if (userId && isQRLogin()) {
      console.log('✅ QR login active for user:', userId);
      updateDeviceNameDisplay();
      initApp();
      updateDeviceStatus(true);
      startForceLogoutWatcher();
    } else {
      initGlobal();
    }
  }
});

function initApp() {
  setupUI();
  initDevices();
  initFolders();
  initMessages();
  initGlobal();
  initSearch();
  initQR();
  initNotifications();
}

function setupUI() {
  const menuToggle = document.getElementById('menuToggle');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('overlay');

  menuToggle?.addEventListener('click', () => {
    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
  });

  overlay?.addEventListener('click', () => {
    sidebar.classList.remove('active');
    overlay.classList.remove('active');
  });

  document.addEventListener('click', (e) => {
    if (e.target.closest('.folder-item') && window.innerWidth <= 768) {
      sidebar.classList.remove('active');
      overlay.classList.remove('active');
    }
  });

  const foldersList = document.getElementById('foldersList');
  const devicesList = document.getElementById('devicesList');
  const toggleFolders = document.getElementById('toggleFolders');
  const toggleDevices = document.getElementById('toggleDevices');

  toggleFolders?.addEventListener('click', () => {
    const collapsed = foldersList.classList.toggle('collapsed');
    toggleFolders.classList.toggle('collapsed', collapsed);
    toggleFolders.title = collapsed ? 'Expand folders' : 'Collapse folders';
  });

  toggleDevices?.addEventListener('click', () => {
    const collapsed = devicesList.classList.toggle('collapsed');
    toggleDevices.classList.toggle('collapsed', collapsed);
    toggleDevices.title = collapsed ? 'Expand devices' : 'Collapse devices';
  });

  document.getElementById('mobileLogoutBtn')?.addEventListener('click', logout);
  document.getElementById('sidebarLogoutBtn')?.addEventListener('click', logout);

  document.getElementById('mobileQRBtn')?.addEventListener('click', () => {
    document.getElementById('qrModal').style.display = 'flex';
  });
  document.getElementById('sidebarQRBtn')?.addEventListener('click', () => {
    document.getElementById('qrModal').style.display = 'flex';
  });

  document.getElementById('globalBtn')?.addEventListener('click', () => {
    console.log('🌍 Global Share button clicked');
    document.getElementById('globalModal').style.display = 'flex';
  });

  document.querySelectorAll('.modal').forEach((modal) => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.style.display = 'none';
      }
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal').forEach((modal) => {
        if (modal.style.display === 'flex') {
          modal.style.display = 'none';
        }
      });
    }
  });
}

async function logout() {
  const ok = await showConfirm('Logout from this device?');
  if (!ok) return;

  try {
    cleanupGlobal();

    const deviceId = getDeviceId();
    const userId = getUserId();
    const isQR = isQRLogin();

    if (userId && deviceId) {
      try {
        const devicePath = isQR
          ? `qr-devices/${userId}/${deviceId}`
          : `users/${userId}/devices/${deviceId}`;
        await remove(ref(database, devicePath));
        console.log('✅ Device removed from Firebase');
      } catch (err) {
        console.warn('Failed to remove device:', err);
      }
    }

    if (auth.currentUser) {
      await signOut(auth);
    }

    localStorage.removeItem('linkedUserId');
    localStorage.removeItem('linkedUserEmail');
    localStorage.removeItem('linkedUserName');
    localStorage.removeItem('loginMethod');
    localStorage.removeItem('deviceName');
    localStorage.removeItem('deviceId');
    localStorage.removeItem('currentFolder');

    currentUser = null;
    currentFolder = 'all';
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    window.location.replace('login.html');
  }
}

export async function updateDeviceStatus(online) {
  const userId = getUserId();
  if (!userId) return;

  const deviceId = getDeviceId();
  if (!deviceId) return;

  try {
    const isQR = isQRLogin();
    const devicePath = isQR
      ? `qr-devices/${userId}/${deviceId}`
      : `users/${userId}/devices/${deviceId}`;

    await update(ref(database, devicePath), {
      isOnline: online,
      lastSeen: Date.now()
    });
  } catch (err) {
    console.error('Failed to update device status:', err);
  }
}

export function setCurrentFolder(folder) {
  currentFolder = folder;
}

export function getCurrentFolder() {
  return currentFolder;
}

document.addEventListener('visibilitychange', () => {
  if (getUserId()) {
    updateDeviceStatus(!document.hidden);
  }
});

window.addEventListener('beforeunload', () => {
  if (getUserId()) {
    updateDeviceStatus(false);
  }
});

export function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
    <span>${message}</span>
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// Device Rename Feature
export function openRenameDeviceModal() {
  const modal = document.getElementById('renameDeviceModal');
  const input = document.getElementById('renameDeviceInput');

  if (modal && input) {
    input.value = deviceName;
    input.focus();
    input.select();
    modal.style.display = 'flex';
  }

  document
    .getElementById('closeRenameDeviceModal')
    ?.addEventListener('click', () => {
      document.getElementById('renameDeviceModal').style.display = 'none';
    });

  document
    .getElementById('cancelRenameBtn')
    ?.addEventListener('click', () => {
      document.getElementById('renameDeviceModal').style.display = 'none';
    });

  document
    .getElementById('confirmRenameBtn')
    ?.addEventListener('click', async () => {
      const inputEl = document.getElementById('renameDeviceInput');
      const newName = inputEl?.value.trim();

      if (!newName) {
        showToast('Device name cannot be empty', 'error');
        return;
      }

      const userId = getUserId();
      if (!userId) {
        showToast('Not authenticated', 'error');
        return;
      }

      try {
        const deviceId = getDeviceId();
        const isQR = isQRLogin();
        const devicePath = isQR
          ? `qr-devices/${userId}/${deviceId}`
          : `users/${userId}/devices/${deviceId}`;

        await update(ref(database, devicePath), {
          name: newName,
          lastUpdated: Date.now()
        });

        localStorage.setItem('deviceName', newName);
        deviceName = newName;

        updateDeviceNameDisplay();

        showToast('Device name updated', 'success');
        document.getElementById('renameDeviceModal').style.display = 'none';
      } catch (error) {
        console.error('Rename device error:', error);
        showToast('Failed to rename device', 'error');
      }
    });

  document
    .getElementById('renameDeviceInput')
    ?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        document.getElementById('confirmRenameBtn').click();
      }
    });
}
