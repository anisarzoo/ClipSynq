// devices.js - Device Management with AUTO-CLEANUP & FALLBACK
import { database } from './firebase-config.js';
import {
  getUserId,
  getDeviceId,
  deviceName,
  showToast,
  isQRLogin,
  showConfirm
} from './app.js';
import {
  ref,
  onValue,
  remove,
  update,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

export function initDevices() {
  console.log('🔧 Initializing devices...');
  registerCurrentDevice(); // CRITICAL: Register THIS device first
  loadDevices();
}

// CRITICAL: Register current device to Firebase
async function registerCurrentDevice() {
  const userId = getUserId();
  if (!userId) {
    console.warn('⚠️ No user ID - skipping device registration');
    return;
  }

  const deviceId = getDeviceId();
  if (!deviceId) {
    console.warn('⚠️ No device ID - skipping device registration');
    return;
  }

  try {
    // Respect QR / normal structure used by app.js
    const qr = isQRLogin();
    const devicePath = qr
      ? `qr-devices/${userId}/${deviceId}`
      : `users/${userId}/devices/${deviceId}`;

    const deviceRef = ref(database, devicePath);
    const deviceData = {
      name: deviceName || 'My Device',
      type: getDeviceInfo().deviceType,
      isOnline: true,
      lastActive: Date.now(),
      lastSeen: Date.now(),
      userAgent: navigator.userAgent,
      addedAt: serverTimestamp(),
      forceLogout: false
    };

    await update(deviceRef, deviceData);
    console.log('✅ Device registered:', deviceName, 'QR?', qr);
  } catch (error) {
    console.error('❌ Failed to register device:', error);
    showToast('Failed to register device', 'error');
  }
}

export function getDeviceInfo() {
  const userAgent = navigator.userAgent;
  let deviceName = 'Unknown Device';
  let deviceType = 'desktop';

  // Detect mobile devices
  if (/Android/i.test(userAgent)) {
    const match = userAgent.match(/Android ([0-9.]+)/);
    const version = match ? match[1] : '';
    deviceName = `Android ${version.trim()}`;
    deviceType = 'mobile';

    const modelMatch = userAgent.match(/\(([^)]+)\)/);
    if (modelMatch) {
      const parts = modelMatch[1].split(';');
      if (parts.length > 1) {
        const model = parts[parts.length - 1].trim();
        if (model && !model.includes('Build') && model.length < 30) {
          deviceName = model;
        }
      }
    }
  } else if (/iPhone|iPad|iPod/i.test(userAgent)) {
    if (/iPad/i.test(userAgent)) {
      deviceName = 'iPad';
    } else if (/iPhone/i.test(userAgent)) {
      deviceName = 'iPhone';
    } else {
      deviceName = 'iPod';
    }
    deviceType = 'mobile';

    const match = userAgent.match(/OS ([0-9_]+)/);
    if (match) {
      const version = match[1].replace(/_/g, '.');
      deviceName += ` (iOS ${version})`;
    }
  } else if (/Windows/i.test(userAgent)) {
    deviceName = 'Windows PC';
    if (/Windows NT 10/i.test(userAgent)) {
      deviceName = 'Windows 10/11 PC';
    } else if (/Windows NT 6.3/i.test(userAgent)) {
      deviceName = 'Windows 8.1 PC';
    } else if (/Windows NT 6.2/i.test(userAgent)) {
      deviceName = 'Windows 8 PC';
    } else if (/Windows NT 6.1/i.test(userAgent)) {
      deviceName = 'Windows 7 PC';
    }
    deviceType = 'desktop';
  } else if (/Mac/i.test(userAgent)) {
    deviceName = 'Mac';
    const match = userAgent.match(/Mac OS X ([0-9_]+)/);
    if (match) {
      const version = match[1].replace(/_/g, '.');
      const parts = version.split('.');
      if (parts.length >= 2) {
        deviceName = `macOS ${parts[0]}.${parts[1]}`;
      }
    }
    deviceType = 'desktop';
  } else if (/Linux/i.test(userAgent)) {
    deviceName = 'Linux PC';
    deviceType = 'desktop';
  } else if (/CrOS/i.test(userAgent)) {
    deviceName = 'Chromebook';
    deviceType = 'desktop';
  }

  // Add browser info
  let browser = '';
  if (/Edg/i.test(userAgent)) {
    browser = 'Edge';
  } else if (/Chrome/i.test(userAgent)) {
    browser = 'Chrome';
  } else if (/Firefox/i.test(userAgent)) {
    browser = 'Firefox';
  } else if (/Safari/i.test(userAgent) && !/Chrome/i.test(userAgent)) {
    browser = 'Safari';
  } else if (/Opera|OPR/i.test(userAgent)) {
    browser = 'Opera';
  }

  if (browser && !deviceName.includes(browser)) {
    deviceName += ` (${browser})`;
  }

  return { deviceName, deviceType };
}

// Load both normal and QR devices and merge them
function loadDevices() {
  const userId = getUserId();
  if (!userId) {
    console.warn('⚠️ No user ID - cannot load devices');
    return;
  }

  const devicesList = document.getElementById('devicesList');
  if (!devicesList) return;

  let normalDevices = {};
  let qrDevices = {};

  const render = () => {
    const list = document.getElementById('devicesList');
    if (!list) return;

    const devices = [];
    const devicesToClean = [];

    const collect = (obj, isQR) => {
      Object.entries(obj).forEach(([devId, dev]) => {
        const device = dev;
        if (!device || !device.name) {
          devicesToClean.push({ devId, isQR });
          return;
        }
        devices.push({ id: devId, data: device, isQR });
      });
    };

    collect(normalDevices, false);
    collect(qrDevices, true);

    list.innerHTML = '';

    if (devicesToClean.length > 0) {
      devicesToClean.forEach(({ devId, isQR }) => {
        const path = isQR
          ? `qr-devices/${userId}/${devId}`
          : `users/${userId}/devices/${devId}`;
        remove(ref(database, path)).catch(() => { });
      });
    }

    if (devices.length === 0) {
      list.innerHTML =
        `<p class="no-devices"><i class="fas fa-info-circle"></i> No devices found</p>`;
      return;
    }

    devices.sort((a, b) => {
      if (a.data.isOnline && !b.data.isOnline) return -1;
      if (!a.data.isOnline && b.data.isOnline) return 1;
      return (b.data.lastActive || 0) - (a.data.lastActive || 0);
    });

    devices.forEach(({ id: devId, data: device, isQR }) => {
      const isThis = devId === getDeviceId();
      const div = document.createElement('div');
      div.className = 'device-item';
      if (isThis) div.classList.add('current-device');

      const lastActiveText = getLastActiveText(
        device.lastActive,
        device.isOnline
      );

      div.innerHTML = `
        <div class="device-info">
          <div class="device-header">
            <span class="device-name">
              <i class="fas fa-${getDeviceIcon(device.name || 'Unknown')}"></i>
              ${escapeHtml(device.name || 'Unknown Device')}
            </span>
            ${isThis ? '<span class="this-device-badge">Active</span>' : ''}
            <span class="device-status ${device.isOnline ? 'online' : 'offline'}"
                  title="${device.isOnline ? 'Online' : 'Offline'}"></span>
          </div>
          <div class="device-meta">
            <span class="device-time">
              <i class="far fa-clock"></i> ${lastActiveText}
            </span>
            ${isQR ? '<span class="device-tag">QR</span>' : ''}
          </div>
        </div>
        <div class="device-actions">
          ${isThis ? `
            <button class="device-rename-btn" title="Rename this device">
              <i class="fas fa-pen"></i>
              <span>Rename</span>
            </button>
          ` : ''}
          <button class="device-logout-btn"
                  data-device-id="${devId}"
                  data-is-qr="${isQR ? '1' : '0'}"
                  title="Logout this device">
            <i class="fas fa-sign-out-alt"></i>
            <span>Logout</span>
          </button>
        </div>
      `;

      list.appendChild(div);
    });

    attachDeviceLogoutHandlers();
  };

  const userDevicesRef = ref(database, `users/${userId}/devices`);
  const qrDevicesRef = ref(database, `qr-devices/${userId}`);

  onValue(
    userDevicesRef,
    (snap) => {
      normalDevices = snap.exists() ? snap.val() || {} : {};
      render();
    },
    () => {
      normalDevices = {};
      render();
    }
  );

  onValue(
    qrDevicesRef,
    (snap) => {
      qrDevices = snap.exists() ? snap.val() || {} : {};
      render();
    },
    () => {
      qrDevices = {};
      render();
    }
  );
}

// AUTO-CLEANUP: legacy helper (still used for old users/* devices)
async function cleanupCorruptedDevices(userId, deviceIds) {
  console.log(`🗑️ Cleaning up ${deviceIds.length} corrupted device(s)...`);

  for (const devId of deviceIds) {
    try {
      await remove(ref(database, `users/${userId}/devices/${devId}`));
      console.log('✅ Removed corrupted device:', devId);
    } catch (error) {
      console.error('❌ Failed to remove device:', devId, error);
    }
  }

  console.log('✅ Cleanup complete!');
}

function getDeviceIcon(deviceName) {
  if (!deviceName || typeof deviceName !== 'string') return 'desktop';

  const name = deviceName.toLowerCase();
  if (name.includes('iphone') || name.includes('android') || name.includes('mobile')) {
    return 'mobile-alt';
  } else if (name.includes('ipad') || name.includes('tablet')) {
    return 'tablet-alt';
  } else if (name.includes('mac')) {
    return 'laptop';
  } else if (name.includes('windows') || name.includes('linux')) {
    return 'desktop';
  } else if (name.includes('chrome')) {
    return 'chrome';
  } else {
    return 'desktop';
  }
}

function getLastActiveText(timestamp, isOnline) {
  if (isOnline) return 'Active now';
  if (!timestamp) return 'Unknown';

  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) {
    return 'Just now';
  } else if (minutes < 60) {
    return `${minutes} min${minutes > 1 ? 's' : ''} ago`;
  } else if (hours < 24) {
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else if (days < 7) {
    return `${days} day${days > 1 ? 's' : ''} ago`;
  } else if (days < 30) {
    const weeks = Math.floor(days / 7);
    return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  } else {
    return new Date(timestamp).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }
}

function attachDeviceLogoutHandlers() {
  document.querySelectorAll('.device-logout-btn').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();

      const devId = btn.dataset.deviceId;
      const isQR = btn.dataset.isQr === '1';
      const deviceNameText = btn
        .closest('.device-item')
        .querySelector('.device-name')
        .textContent.trim();

      const ok = await showConfirm(
        `Logout "${deviceNameText}"?\nThis will disconnect it from your account.`
      );
      if (!ok) return;

      try {
        btn.disabled = true;
        btn.innerHTML =
          '<i class="fas fa-spinner fa-spin"></i> Logging out...';

        const userId = getUserId();
        if (!userId) {
          throw new Error('Not authenticated');
        }

        const path = isQR
          ? `qr-devices/${userId}/${devId}`
          : `users/${userId}/devices/${devId}`;

        await update(ref(database, path), {
          forceLogout: true,
          isOnline: false,
          lastActive: Date.now()
        });

        showToast('Device will be logged out shortly', 'success');
      } catch (error) {
        console.error('❌ Logout failed:', error);
        showToast('Failed to logout device', 'error');

        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-sign-out-alt"></i> Logout';
      }
    });
  });

  document.querySelectorAll('.device-rename-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      import('./app.js').then((module) => {
        module.openRenameDeviceModal();
      });
    });
  });
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
