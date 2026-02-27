// ClipSynq PWA Installation Handler
// Manages app installation on desktop and mobile devices

let deferredPrompt;
let isInstalled = false;

// Check if app is already installed
if (window.matchMedia('(display-mode: standalone)').matches) {
    isInstalled = true;
    console.log('[PWA] App is running in standalone mode');
}

// Listen for beforeinstallprompt event
window.addEventListener('beforeinstallprompt', (event) => {
    console.log('[PWA] beforeinstallprompt fired');
    event.preventDefault();
    deferredPrompt = event;
    
    // Show install button on both pages
    showInstallPrompt();
});

// Handle app installed event
window.addEventListener('appinstalled', () => {
    console.log('[PWA] App installed successfully');
    isInstalled = true;
    hideInstallPrompt();
    showNotification('ClipSynq installed successfully!');
});

// Show install button
function showInstallPrompt() {
    const installBtn = document.getElementById('installAppBtn');
    if (installBtn && !isInstalled) {
        installBtn.style.display = 'flex';
        installBtn.addEventListener('click', handleInstallClick);
    }
}

// Hide install button
function hideInstallPrompt() {
    const installBtn = document.getElementById('installAppBtn');
    if (installBtn) {
        installBtn.style.display = 'none';
    }
}

// Handle install button click
async function handleInstallClick() {
    if (!deferredPrompt) {
        console.log('[PWA] Deferred prompt not available');
        return;
    }
    
    try {
        deferredPrompt.prompt();
        const userChoice = await deferredPrompt.userChoice;
        
        if (userChoice.outcome === 'accepted') {
            console.log('[PWA] User accepted installation');
            hideInstallPrompt();
            showNotification('ClipSynq is being installed...', 'success');
        } else {
            console.log('[PWA] User dismissed installation');
            showNotification('Installation cancelled', 'info');
        }
        
        deferredPrompt = null;
    } catch (error) {
        console.error('[PWA] Installation error:', error);
        
        // Fallback for iOS and other browsers
        if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
            showIOSInstallGuide();
        }
    }
}

// Show iOS installation guide
function showIOSInstallGuide() {
    const guide = `
        <div style="padding: 20px; text-align: center; background: #f0f9ff; border-radius: 8px; margin: 16px 0;">
            <h3 style="margin-bottom: 12px;">Install ClipSynq on iOS</h3>
            <p style="font-size: 14px; margin-bottom: 12px;">
                <strong>1.</strong> Tap the Share button at the bottom<br>
                <strong>2.</strong> Select "Add to Home Screen"<br>
                <strong>3.</strong> Tap "Add"
            </p>
            <p style="font-size: 12px; color: #666;">ClipSynq will appear as an app on your home screen</p>
        </div>
    `;
    
    const container = document.querySelector('.login-right') || document.querySelector('.main-content');
    if (container) {
        const temp = document.createElement('div');
        temp.innerHTML = guide;
        container.insertBefore(temp.firstElementChild, container.firstChild);
    }
}

// Show notification
function showNotification(message, type = 'info') {
    console.log(`[PWA] ${type.toUpperCase()}: ${message}`);
    
    // Create notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 70px;
        right: 16px;
        background: ${
            type === 'success' ? '#22c55e' :
            type === 'error' ? '#ef4444' :
            '#0ea5e9'
        };
        color: white;
        padding: 12px 16px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        z-index: 9999;
        animation: slideInRight 0.3s ease;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    `;
    notification.textContent = message;
    
    // Add animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from {
                opacity: 0;
                transform: translateX(400px);
            }
            to {
                opacity: 1;
                transform: translateX(0);
            }
        }
    `;
    if (!document.querySelector('style[data-pwa]')) {
        style.setAttribute('data-pwa', 'true');
        document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    
    // Remove notification after 4 seconds
    setTimeout(() => {
        notification.style.animation = 'slideInRight 0.3s ease reverse';
        setTimeout(() => notification.remove(), 300);
    }, 4000);
}

// Register service worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(registration => {
                console.log('[PWA] Service Worker registered:', registration);
                
                // Check for updates periodically
                setInterval(() => {
                    registration.update();
                }, 60000); // Check every minute
            })
            .catch(error => {
                console.error('[PWA] Service Worker registration failed:', error);
            });
    });
}

// Handle online/offline status
window.addEventListener('online', () => {
    console.log('[PWA] App is online');
    showNotification('Back online!', 'success');
});

window.addEventListener('offline', () => {
    console.log('[PWA] App is offline');
    showNotification('You are offline. Some features may be limited.', 'warning');
});

// Request notification permission
function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                console.log('[PWA] Notification permission granted');
            }
        });
    }
}

// Initialize PWA features
document.addEventListener('DOMContentLoaded', () => {
    console.log('[PWA] Initializing PWA features');
    
    // Request notification permission
    requestNotificationPermission();
    
    // Show install prompt if available
    if (deferredPrompt && !isInstalled) {
        showInstallPrompt();
    }
    
    // Listen for display mode changes
    if (window.matchMedia) {
        window.matchMedia('(display-mode: standalone)').addEventListener('change', (e) => {
            if (e.matches) {
                console.log('[PWA] App entered standalone mode');
                isInstalled = true;
                hideInstallPrompt();
            }
        });
    }
});

// Export functions for use in other scripts
export { showInstallPrompt, hideInstallPrompt, showNotification, requestNotificationPermission };
