// ===========================
// QR CODE v3.0 - COMPLETE FIX
// ✅ Permission errors fixed
// ✅ QR generation working
// ✅ Proper error handling
// ✅ Sends userName + userPhoto for QR login
// ===========================

import { database, auth } from './firebase-config.js';
import { ref, push, onValue, set, remove } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

let qrCodeInstance = null;
let sessionListener = null;
let currentSessionId = null;

export function initQR() {
    setupQRModal();
}

function setupQRModal() {
    const sidebarQRBtn = document.getElementById('sidebarQRBtn');
    if (sidebarQRBtn) {
        sidebarQRBtn.addEventListener('click', openQRModal);
    }

    const closeBtn = document.getElementById('closeQRModal');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeQRModal);
    }

    const modal = document.getElementById('qrModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeQRModal();
        });
    }

    // Help button tooltip toggle
    const helpBtn = document.getElementById('qrHelpBtn');
    const tooltip = document.getElementById('qrInstructions');

    if (helpBtn && tooltip) {
        helpBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isVisible = tooltip.style.display === 'block';

            if (isVisible) {
                tooltip.style.display = 'none';
                helpBtn.classList.remove('active');
            } else {
                tooltip.style.display = 'block';
                helpBtn.classList.add('active');
            }
        });

        modal.addEventListener('click', (e) => {
            if (
                tooltip.style.display === 'block' &&
                !tooltip.contains(e.target) &&
                !helpBtn.contains(e.target)
            ) {
                tooltip.style.display = 'none';
                helpBtn.classList.remove('active');
            }
        });
    }
}

function openQRModal() {
    const modal = document.getElementById('qrModal');
    if (modal) {
        modal.style.display = 'flex';
        setTimeout(() => generateQRCode(), 100);
    }
}

function closeQRModal() {
    const modal = document.getElementById('qrModal');
    if (modal) {
        modal.style.display = 'none';
    }

    const helpBtn = document.getElementById('qrHelpBtn');
    const tooltip = document.getElementById('qrInstructions');
    if (helpBtn && tooltip) {
        tooltip.style.display = 'none';
        helpBtn.classList.remove('active');
    }

    cleanupQRSession();
}

async function generateQRCode() {
    const qrDisplay = document.getElementById('qrDisplay');
    const qrStatus = document.getElementById('qrStatus');

    if (!qrDisplay || !qrStatus) {
        console.error('QR display elements not found');
        return;
    }

    qrDisplay.innerHTML = `
        <div style="text-align: center; padding: 40px;">
            <i class="fas fa-spinner fa-spin" style="font-size: 32px; color: #0ea5e9;"></i>
            <p style="margin-top: 15px; color: #64748b;">Generating QR code...</p>
        </div>
    `;

    try {
        // Check if QRCode library is loaded
        if (typeof QRCode === 'undefined') {
            throw new Error('QRCode library not loaded');
        }

        // Wait for auth to be ready
        const currentUser = auth.currentUser;
        if (!currentUser) {
            await new Promise((resolve, reject) => {
                const unsubscribe = auth.onAuthStateChanged((user) => {
                    unsubscribe();
                    if (user) {
                        resolve(user);
                    } else {
                        reject(new Error('User not authenticated'));
                    }
                });

                setTimeout(() => {
                    unsubscribe();
                    reject(new Error('Authentication timeout'));
                }, 5000);
            });
        }

        const user = auth.currentUser;
        console.log('✓ Creating QR for user:', user.uid);

        // Derive name + photo once
        const displayName =
            user.displayName || (user.email ? user.email.split('@')[0] : '');
        const photo = user.photoURL || '';

        // Create QR session with proper structure
        const sessionRef = push(ref(database, 'qr-sessions'));
        currentSessionId = sessionRef.key;

        const sessionData = {
            userId: user.uid,
            userEmail: user.email || '',
            userName: displayName,
            userPhoto: photo,
            createdAt: Date.now(),
            expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
            status: 'pending'
        };

        // Set the session data
        await set(sessionRef, sessionData);
        console.log('✓ QR session created:', currentSessionId);

        // QR code data (what the phone scans)
        const qrData = JSON.stringify({
            type: 'ClipSynq-login',
            userId: user.uid,
            userEmail: user.email || '',
            userName: displayName,
            userPhoto: photo,
            sessionId: currentSessionId,
            timestamp: Date.now()
        });

        // Clear and create QR code
        qrDisplay.innerHTML = '';
        qrCodeInstance = new QRCode(qrDisplay, {
            text: qrData,
            width: 220,
            height: 220,
            colorDark: '#0ea5e9',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.H
        });

        qrStatus.className = 'qr-status-premium';
        qrStatus.innerHTML = `
            <i class="fas fa-mobile-alt" style="color: #0ea5e9;"></i>
            <span>Scan to link your mobile device</span>
        `;

        // Listen for QR login
        listenForQRLogin(currentSessionId);

        // Auto-expire after 5 minutes
        setTimeout(() => {
            if (currentSessionId === sessionRef.key) {
                cleanupQRSession();
                qrStatus.className = 'qr-status-premium error';
                qrStatus.innerHTML = `
                    <i class="fas fa-exclamation-circle" style="color: #ef4444;"></i>
                    <span>QR code expired. Close and reopen to generate new code.</span>
                `;
            }
        }, 300000);
    } catch (error) {
        console.error('QR generation error:', error);

        let errorMessage = 'Failed to generate QR code.';

        if (error.code === 'PERMISSION_DENIED') {
            errorMessage = 'Database permission denied. Please check Firebase rules.';
        } else if (error.message.includes('not authenticated')) {
            errorMessage = 'Please log in first.';
        } else if (error.message.includes('not loaded')) {
            errorMessage = 'QR library not loaded. Please refresh the page.';
        } else {
            errorMessage = error.message;
        }

        qrDisplay.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: #ef4444; margin-bottom: 15px;"></i>
                <p style="color: #dc2626; font-weight: 600; margin-bottom: 8px;">Error</p>
                <p style="color: #64748b; font-size: 13px;">${errorMessage}</p>
            </div>
        `;
    }
}

function listenForQRLogin(sessionId) {
    const sessionRef = ref(database, `qr-sessions/${sessionId}`);

    if (sessionListener) {
        sessionListener();
    }

    sessionListener = onValue(sessionRef, async (snapshot) => {
        const session = snapshot.val();
        if (!session) return;

        const qrStatus = document.getElementById('qrStatus');

        if (session.status === 'scanned') {
            qrStatus.className = 'qr-status-premium';
            qrStatus.innerHTML = `
                <i class="fas fa-check-circle" style="color: #10b981;"></i>
                <span>QR code scanned! Linking device...</span>
            `;
        }

        if (session.status === 'authenticated') {
            qrStatus.className = 'qr-status-premium success';
            qrStatus.innerHTML = `
                <i class="fas fa-check-circle" style="color: #10b981;"></i>
                <span>✓ Mobile device linked successfully!</span>
            `;

            setTimeout(() => {
                cleanupQRSession();
                closeQRModal();
            }, 2000);
        }
    });
}

function cleanupQRSession() {
    if (sessionListener) {
        sessionListener();
        sessionListener = null;
    }

    if (currentSessionId) {
        const sessionRef = ref(database, `qr-sessions/${currentSessionId}`);
        remove(sessionRef).catch((err) => console.error('Cleanup error:', err));
        currentSessionId = null;
    }

    if (qrCodeInstance) {
        qrCodeInstance = null;
    }
}
