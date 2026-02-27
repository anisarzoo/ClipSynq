// auth.js - Authentication Handler with SAFE QR Login Support
// ✅ SAFE VERSION: Only sets QR loginMethod during actual QR login

import { auth, database } from './firebase-config.js';
import {
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import {
  ref,
  set,
  onValue,
  update,
  get,
  remove
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

const googleProvider = new GoogleAuthProvider();
let html5QrCode = null;

function generateDeviceId() {
  return 'device_' + Math.random().toString(36).substr(2, 9) + Date.now();
}

// Dynamic getter for current device ID - reads from localStorage
export function getCurrentDeviceId() {
  let deviceId = localStorage.getItem('deviceId');
  if (!deviceId) {
    deviceId = generateDeviceId();
    localStorage.setItem('deviceId', deviceId);
  }
  return deviceId;
}

// Get device info without importing from devices.js (avoid circular dependency)
function getDeviceInfo() {
  const userAgent = navigator.userAgent;
  let deviceName = 'Unknown Device';
  let deviceType = 'desktop';

  if (/Android/i.test(userAgent)) {
    const match = userAgent.match(/Android\s([0-9\.]*)/);
    deviceName = `Android ${match ? match[1] : ''}`.trim();
    deviceType = 'mobile';
  } else if (/iPhone/i.test(userAgent)) {
    deviceName = 'iPhone';
    deviceType = 'mobile';
  } else if (/iPad/i.test(userAgent)) {
    deviceName = 'iPad';
    deviceType = 'mobile';
  } else if (/Windows/i.test(userAgent)) {
    deviceName = 'Windows PC';
    deviceType = 'desktop';
  } else if (/Mac/i.test(userAgent)) {
    deviceName = 'Mac';
    deviceType = 'desktop';
  } else if (/Linux/i.test(userAgent)) {
    deviceName = 'Linux PC';
    deviceType = 'desktop';
  }

  // Add browser
  if (/Edg/i.test(userAgent)) deviceName += ' (Edge)';
  else if (/Chrome/i.test(userAgent)) deviceName += ' (Chrome)';
  else if (/Firefox/i.test(userAgent)) deviceName += ' (Firefox)';
  else if (/Safari/i.test(userAgent) && !/Chrome/i.test(userAgent))
    deviceName += ' (Safari)';

  return { deviceName, deviceType };
}

// Simple auth state - only handle device naming
onAuthStateChanged(auth, (user) => {
  if (user) {
    const deviceName = localStorage.getItem('deviceName');
    if (deviceName && deviceName !== 'undefined') {
      console.log('Device name exists, redirecting to app');
      window.location.replace('index.html');
    }
  }
});

// Tab switching
document.querySelectorAll('.tab-btn')?.forEach((btn) => {
  btn.addEventListener('click', () => {
    const tabName = btn.dataset.tab;

    document
      .querySelectorAll('.tab-btn')
      .forEach((b) => b.classList.remove('active'));
    document
      .querySelectorAll('.tab-content')
      .forEach((c) => c.classList.remove('active'));

    btn.classList.add('active');
    document.getElementById(tabName + 'Tab')?.classList.add('active');

    if (tabName === 'qr' && !html5QrCode) {
      initQRScanner();
    } else if (tabName === 'login' && html5QrCode) {
      html5QrCode.stop().catch(() => {});
    }
  });
});

// Password strength indicator
function updatePasswordStrength(password) {
  const strengthFill = document.getElementById('passwordStrengthFill');
  const strengthText = document.getElementById('passwordStrengthText');
  const strengthWrapper = document.querySelector('.password-strength-wrapper');

  if (!password) {
    strengthWrapper?.classList.remove('show');
    return;
  }

  strengthWrapper?.classList.add('show');

  let strength = 0;
  let text = 'Weak';
  let color = '#ef4444';

  if (password.length >= 8) strength += 25;
  if (password.length >= 12) strength += 25;
  if (/[a-z]/.test(password)) strength += 15;
  if (/[A-Z]/.test(password)) strength += 15;
  if (/[0-9]/.test(password)) strength += 15;
  if (/[^a-zA-Z0-9]/.test(password)) strength += 20;

  strength = Math.min(100, strength);

  if (strength < 40) {
    text = 'Weak';
    color = '#ef4444';
  } else if (strength < 60) {
    text = 'Fair';
    color = '#f59e0b';
  } else if (strength < 80) {
    text = 'Good';
    color = '#3b82f6';
  } else {
    text = 'Strong';
    color = '#10b981';
  }

  if (strengthFill) {
    strengthFill.style.width = strength + '%';
    strengthFill.style.backgroundColor = color;
  }
  if (strengthText) {
    strengthText.textContent = text;
    strengthText.style.color = color;
  }
}

document.getElementById('passwordInput')?.addEventListener('input', (e) => {
  updatePasswordStrength(e.target.value);
});

// Toggle password visibility
document.getElementById('togglePasswordBtn')?.addEventListener('click', () => {
  const input = document.getElementById('passwordInput');
  const btn = document.getElementById('togglePasswordBtn');
  const icon = btn.querySelector('i');

  if (input.type === 'password') {
    input.type = 'text';
    icon.className = 'fas fa-eye-slash';
  } else {
    input.type = 'password';
    icon.className = 'fas fa-eye';
  }
});

// Remember me functionality
const rememberCheckbox = document.getElementById('rememberMe');
const emailInput = document.getElementById('emailInput');

if (rememberCheckbox && emailInput) {
  const rememberedEmail = localStorage.getItem('rememberedEmail');
  if (rememberedEmail) {
    emailInput.value = rememberedEmail;
    rememberCheckbox.checked = true;
  }
}

rememberCheckbox?.addEventListener('change', (e) => {
  if (e.target.checked && emailInput) {
    localStorage.setItem('rememberedEmail', emailInput.value);
  } else {
    localStorage.removeItem('rememberedEmail');
  }
});

// Forgot password button
document
  .getElementById('forgotPasswordBtn')
  ?.addEventListener('click', () => {
    const email = document.getElementById('emailInput').value.trim();
    if (!email || !isValidEmail(email)) {
      showError('Please enter a valid email address');
      return;
    }
    alert(
      'Password reset instructions have been sent to:\n\n' +
        email +
        '\n\nPlease check your inbox.'
    );
  });

// Google Login
document
  .getElementById('googleLoginBtn')
  ?.addEventListener('click', async () => {
    const btn = document.getElementById('googleLoginBtn');
    try {
      btn.disabled = true;
      btn.innerHTML = '<i class="fab fa-google"></i> Signing in...';

      const result = await signInWithPopup(auth, googleProvider);
      await handleSuccessfulLogin(result.user);
    } catch (error) {
      console.error('Google login error:', error);
      showError(getErrorMessage(error));
      btn.disabled = false;
      btn.innerHTML = `<i class="fab fa-google"></i> Continue with Google`;
    }
  });

// Email Login
document.getElementById('loginBtn')?.addEventListener('click', async () => {
  const email = document.getElementById('emailInput').value.trim();
  const password = document.getElementById('passwordInput').value;

  if (!email || !password) {
    showError('Please enter email and password');
    return;
  }

  if (!isValidEmail(email)) {
    showError('Please enter a valid email address');
    return;
  }

  const btn = document.getElementById('loginBtn');
  try {
    btn.disabled = true;
    btn.innerHTML =
      '<i class="fas fa-spinner fa-spin"></i> Logging in...';

    const result = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    await handleSuccessfulLogin(result.user);
  } catch (error) {
    console.error('Login error:', error);
    showError(getErrorMessage(error));
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
  }
});

// Sign Up
document.getElementById('signupBtn')?.addEventListener('click', async () => {
  const email = document.getElementById('emailInput').value.trim();
  const password = document.getElementById('passwordInput').value;

  if (!email || !password) {
    showError('Please enter email and password');
    return;
  }

  if (!isValidEmail(email)) {
    showError('Please enter a valid email address');
    return;
  }

  if (password.length < 6) {
    showError('Password must be at least 6 characters');
    return;
  }

  const btn = document.getElementById('signupBtn');
  try {
    btn.disabled = true;
    btn.innerHTML =
      '<i class="fas fa-spinner fa-spin"></i> Creating account...';

    const result = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    await handleSuccessfulLogin(result.user);
  } catch (error) {
    console.error('Signup error:', error);
    showError(getErrorMessage(error));
    btn.disabled = false;
    btn.innerHTML =
      '<i class="fas fa-user-plus"></i> Create Account';
  }
});

// Enter key handlers
document.getElementById('emailInput')?.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    document.getElementById('passwordInput').focus();
  }
});

document.getElementById('passwordInput')?.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    document.getElementById('loginBtn').click();
  }
});

/* 🔹 NEW: helper to write unified profile */
async function upsertUserProfile(user) {
  const displayName =
    user.displayName ||
    (user.email ? user.email.split('@')[0] : 'User');

  const profileRef = ref(database, `users/${user.uid}/profile`);

  await update(profileRef, {
    displayName,
    email: user.email || null,
    photoURL: user.photoURL || null,
    updatedAt: Date.now()
  });
}

// Handle successful login - REGULAR AUTH (not QR)
async function handleSuccessfulLogin(user) {
  const deviceInfo = getDeviceInfo();

  // 🔹 ensure profile is stored for all regular logins
  try {
    await upsertUserProfile(user);
  } catch (e) {
    console.warn('Failed to update user profile', e);
  }

  const preRegistered = localStorage.getItem('qr-pre-registered');
  const qrDeviceName = localStorage.getItem('qr-device-name');

  if (preRegistered === 'true' && qrDeviceName) {
    document.getElementById('modalDeviceInput').value = qrDeviceName;
    localStorage.removeItem('qr-pre-registered');
    localStorage.removeItem('qr-device-name');
  } else {
    document.getElementById('modalDeviceInput').value =
      deviceInfo.deviceName;
  }

  // Do NOT overwrite QR name if this is already a QR session
  if (localStorage.getItem('loginMethod') !== 'qr') {
    // Also store profile name for QR-linked usage later (desktop side)
    if (user.displayName) {
      localStorage.setItem('linkedUserName', user.displayName);
    } else if (user.email) {
      localStorage.setItem(
        'linkedUserName',
        user.email.split('@')[0]
      );
    }
    // Also store profile photo for reuse on QR devices
    if (user.photoURL) {
      localStorage.setItem('linkedUserPhoto', user.photoURL);
    }
  }

  showDeviceNameModal();
}

// Device Name Modal
function showDeviceNameModal() {
  const modal = document.getElementById('deviceModal');
  if (modal) {
    modal.style.display = 'flex';
    modal.classList.add('active');
    setTimeout(() => {
      const input = document.getElementById('modalDeviceInput');
      if (input) {
        input.focus();
        input.select();
      }
    }, 100);
  }
}

document
  .getElementById('modalConfirmBtn')
  ?.addEventListener('click', async () => {
    const deviceNameInput =
      document.getElementById('modalDeviceInput');
    const trimmedName = deviceNameInput?.value?.trim() || '';

    if (!trimmedName) {
      alert('Please enter a device name');
      return;
    }

    if (trimmedName.length > 30) {
      alert('Device name must be less than 30 characters');
      return;
    }

    const btn = document.getElementById('modalConfirmBtn');
    try {
      btn.disabled = true;
      btn.innerHTML =
        '<i class="fas fa-spinner fa-spin"></i> Setting up...';

      await new Promise((resolve) => setTimeout(resolve, 500));

      const user = auth.currentUser;
      if (!user) {
        throw new Error(
          'Authentication failed. Please try logging in again.'
        );
      }

      const deviceId = getCurrentDeviceId();
      console.log(
        'Registering device for user:',
        user.uid,
        'Device ID:',
        deviceId
      );

      // ✅ SAFE: Regular login - always use users/devices path
      await registerDevice(user.uid, deviceId, trimmedName, false);

      // Save device name to localStorage
      localStorage.setItem('deviceName', trimmedName);
      localStorage.setItem('deviceId', deviceId);

      // ✅ SAFE: Clear any QR flags (just in case)
      localStorage.removeItem('loginMethod');
      localStorage.removeItem('linkedUserId');

      console.log('Device registered successfully:', trimmedName);

      const modal = document.getElementById('deviceModal');
      if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
      }

      setTimeout(() => {
        window.location.replace('index.html');
      }, 300);
    } catch (error) {
      console.error('Device registration error:', error);

      let errorMessage = 'Failed to register device. ';
      if (error.code === 'PERMISSION_DENIED') {
        errorMessage +=
          'Database permission denied. Please check Firebase rules.';
      } else if (error.message?.includes('Authentication')) {
        errorMessage += 'Please try logging in again.';
      } else {
        errorMessage += error.message || 'Please try again.';
      }

      alert(errorMessage);
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-check"></i> Continue';
    }
  });

document
  .getElementById('modalDeviceInput')
  ?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      document.getElementById('modalConfirmBtn').click();
    }
  });

// ✅ SAFE: Register device with explicit isQR flag
async function registerDevice(userId, deviceId, deviceName, isQRLogin) {
  console.log('Starting device registration...', {
    userId,
    deviceId,
    deviceName,
    isQRLogin
  });

  if (!userId || !deviceId || !deviceName) {
    throw new Error('Missing required parameters for device registration');
  }

  const deviceInfo = getDeviceInfo();
  const deviceData = {
    name: deviceName,
    type: deviceInfo.deviceType,
    createdAt: Date.now(),
    lastActive: Date.now(),
    online: true,
    userAgent: navigator.userAgent,
    browser: getBrowserInfo(),
    platform: navigator.platform
  };

  if (isQRLogin) {
    deviceData.linkedViaQR = true;
  }

  console.log('Device data:', deviceData);

  try {
    const devicePath = isQRLogin
      ? `qr-devices/${userId}/${deviceId}`
      : `users/${userId}/devices/${deviceId}`;

    console.log('✅ Using device path:', devicePath);

    await set(ref(database, devicePath), deviceData);
    console.log('✅ Device registered successfully');
  } catch (error) {
    console.error('❌ Firebase set error:', error);
    throw error;
  }
}

function getBrowserInfo() {
  const ua = navigator.userAgent;
  if (ua.includes('Edg')) return 'Edge';
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
  if (ua.includes('Opera') || ua.includes('OPR')) return 'Opera';
  return 'Unknown';
}

// QR Scanner
function initQRScanner() {
  const qrReader = document.getElementById('qrReader');
  const scanStatus = document.getElementById('scanStatus');

  if (!qrReader) return;

  scanStatus.innerHTML =
    '<i class="fas fa-spinner fa-spin"></i> Starting camera...';
  scanStatus.style.color = '#0ea5e9';

  html5QrCode = new Html5Qrcode('qrReader');

  html5QrCode
    .start(
      { facingMode: 'environment' },
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
      },
      async (decodedText) => {
        try {
          const qrData = JSON.parse(decodedText);

          if (qrData.type === 'ClipSynq-login') {
            scanStatus.innerHTML =
              '<i class="fas fa-check-circle"></i> QR code detected! Requesting access...';
            scanStatus.style.color = '#10b981';
            await handleQRLogin(qrData);
          } else {
            scanStatus.innerHTML =
              '<i class="fas fa-exclamation-circle"></i> Invalid QR code';
            scanStatus.style.color = '#ef4444';
          }
        } catch (err) {
          console.error('Invalid QR code:', err);
          scanStatus.innerHTML =
            '<i class="fas fa-exclamation-circle"></i> Invalid QR code format';
          scanStatus.style.color = '#ef4444';
        }
      }
    )
    .then(() => {
      scanStatus.innerHTML =
        '<i class="fas fa-camera"></i> Camera ready. Point at QR code...';
      scanStatus.style.color = '#0ea5e9';
    })
    .catch((err) => {
      console.error('QR Scanner error:', err);
      scanStatus.innerHTML =
        '<i class="fas fa-exclamation-triangle"></i> Camera access denied';
      scanStatus.style.color = '#ef4444';
      qrReader.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <i class="fas fa-video-slash" style="font-size: 48px; color: #ef4444; margin-bottom: 16px;"></i>
                <h3 style="color: #ef4444;">Camera permission required</h3>
                <p style="color: #64748b;">Please allow camera access in your browser settings</p>
            </div>
        `;
    });
}

// ✅ SAFE: QR Login handler - ONLY sets loginMethod here
async function handleQRLogin(qrData) {
  try {
    // Expect qrData to contain userName and userPhoto as well
    const { sessionId, userId, userEmail, userName, userPhoto } = qrData;

    if (!sessionId || !userId) {
      throw new Error('Invalid QR data');
    }

    await update(ref(database, `qr-sessions/${sessionId}`), {
      status: 'pending',
      scannedAt: Date.now()
    });

    const sessionRef = ref(database, `qr-sessions/${sessionId}`);
    const unsubscribe = onValue(sessionRef, async (snapshot) => {
      const session = snapshot.val();
      if (!session) return;

      if (session.status === 'approved') {
        unsubscribe();

        const deviceId = getCurrentDeviceId();
        const deviceInfo = getDeviceInfo();

        console.log('✅ Registering QR device:', deviceId);

        // ✅ SAFE: Register device with explicit QR flag
        await registerDevice(
          userId,
          deviceId,
          deviceInfo.deviceName,
          true
        );

        // ✅ SAFE: NOW set loginMethod (after successful QR registration)
        localStorage.setItem('linkedUserId', userId);
        localStorage.setItem('linkedUserEmail', userEmail || '');

        // Name: prefer QR payload, then session, then email prefix
        const effectiveName =
          userName ||
          (session && session.userName) ||
          (userEmail ? userEmail.split('@')[0] : '');
        localStorage.setItem('linkedUserName', effectiveName);

        // Photo: prefer QR payload, then session
        const effectivePhoto =
          userPhoto || (session && session.userPhoto) || '';
        localStorage.setItem('linkedUserPhoto', effectivePhoto);

        localStorage.setItem('loginMethod', 'qr'); // Only set here!
        localStorage.setItem('deviceId', deviceId);
        localStorage.setItem('deviceName', deviceInfo.deviceName);

        await remove(ref(database, `qr-sessions/${sessionId}`));

        if (html5QrCode) {
          await html5QrCode.stop();
        }

        alert('✅ Successfully connected! Redirecting...');
        window.location.replace('index.html');
      } else if (session.status === 'denied') {
        unsubscribe();
        alert('❌ Access denied by the device owner');

        await remove(ref(database, `qr-sessions/${sessionId}`));

        const scanStatus = document.getElementById('scanStatus');
        if (scanStatus) {
          scanStatus.innerHTML =
            '<i class="fas fa-camera"></i> Ready to scan';
          scanStatus.style.color = '#0ea5e9';
        }
      }
    });

    setTimeout(() => {
      unsubscribe();
    }, 60000);
  } catch (error) {
    console.error('QR login error:', error);
    alert('Failed to process QR code. Please try again.');
  }
}

// Helper functions
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function showError(message) {
  const errorDiv = document.getElementById('authError');
  if (errorDiv) {
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    setTimeout(() => {
      errorDiv.style.display = 'none';
    }, 5000);
  } else {
    alert(message);
  }
}

function getErrorMessage(error) {
  const errorMessages = {
    'auth/invalid-email': 'Invalid email address',
    'auth/user-disabled': 'This account has been disabled',
    'auth/user-not-found': 'No account found with this email',
    'auth/wrong-password': 'Incorrect password',
    'auth/email-already-in-use':
      'An account already exists with this email',
    'auth/weak-password': 'Password should be at least 6 characters',
    'auth/network-request-failed': 'Network error. Check your connection',
    'auth/too-many-requests': 'Too many attempts. Try again later',
    'auth/popup-closed-by-user': 'Sign-in cancelled',
    'auth/cancelled-popup-request': 'Sign-in cancelled'
  };

  return (
    errorMessages[error.code] ||
    error.message ||
    'An error occurred. Please try again.'
  );
}
