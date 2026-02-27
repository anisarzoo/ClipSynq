// ===========================
// NOTIFICATION SYSTEM v3.4 - FLOATING POPUP + ANIMATIONS
// ===========================

import { database } from './firebase-config.js';
import {
    ref,
    onValue,
    update,
    remove,
    push
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

import { getUserId, getUserName, getUserPhoto, showToast } from './global.js';

let notificationUnsubscribe = null;
let allNotifications = [];
let previousNotificationCount = 0;

// ============================================
// Initialize Notification System
// ============================================
export function initNotifications() {
    console.log('🔔 Initializing notification system v3.4...');
    setTimeout(() => {
        attachNotificationListeners();
        loadNotifications();
    }, 1500);
}

// ============================================
// Attach Event Listeners
// ============================================
function attachNotificationListeners() {
    const bellBtn = document.getElementById('globalNotificationBtn');

    if (!bellBtn) {
        console.warn('⚠️ Notification bell not found (globalNotificationBtn)');
        return;
    }

    bellBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleNotificationPanel();
    });

    console.log('✅ Notification listeners attached');
}

// ============================================
// Toggle Notification Panel (floating popup)
// ============================================
function toggleNotificationPanel() {
    let panel = document.getElementById('notificationPanel');

    if (!panel) {
        panel = createNotificationPanel();
        const globalModal = document.getElementById('globalModal');
        if (globalModal) {
            globalModal.appendChild(panel);
        } else {
            document.body.appendChild(panel);
        }
    }

    const isHidden = panel.classList.contains('hidden');

    if (isHidden) {
        panel.classList.remove('hidden');
        markAllAsRead();
        renderNotifications('all');

        setTimeout(() => {
            document.addEventListener('click', closeOnClickOutside);
        }, 100);
    } else {
        closeNotificationPanel();
    }
}

function closeOnClickOutside(e) {
    const panel = document.getElementById('notificationPanel');
    const bellBtn = document.getElementById('globalNotificationBtn');

    if (!panel || !bellBtn) return;

    if (!panel.contains(e.target) && !bellBtn.contains(e.target)) {
        closeNotificationPanel();
    }
}

function closeNotificationPanel() {
    const panel = document.getElementById('notificationPanel');
    if (panel) {
        panel.classList.add('hidden');
    }
    document.removeEventListener('click', closeOnClickOutside);
}

// ============================================
// Create Notification Panel DOM
// ============================================
function createNotificationPanel() {
    const panel = document.createElement('div');
    panel.className = 'notification-panel hidden';
    panel.id = 'notificationPanel';

    panel.innerHTML = `
        <div class="notification-header">
            <h3><i class="fas fa-bell"></i> Notifications</h3>
            <div class="notification-filter-tabs">
                <button class="notif-tab active" data-filter="all">All</button>
                <button class="notif-tab" data-filter="likes">Likes</button>
                <button class="notif-tab" data-filter="replies">Replies</button>
            </div>
        </div>
        <div class="notification-list" id="notificationList">
            <div class="notification-empty">
                <i class="fas fa-bell-slash"></i>
                <p>No notifications yet</p>
                <span>You'll be notified when someone<br>likes or replies to your messages</span>
            </div>
        </div>
    `;

    const tabs = panel.querySelectorAll('.notif-tab');
    tabs.forEach((tab) => {
        tab.addEventListener('click', () => {
            tabs.forEach((t) => t.classList.remove('active'));
            tab.classList.add('active');
            const filter = tab.dataset.filter;
            filterNotifications(filter);
        });
    });

    return panel;
}

// ============================================
// Load Notifications from Firebase
// ============================================
function loadNotifications() {
    const userId = getUserId();
    if (!userId) {
        console.warn('⚠️ User ID not found for notifications');
        return;
    }

    const notifRef = ref(database, `notifications/${userId}`);

    if (notificationUnsubscribe) {
        notificationUnsubscribe();
    }

    notificationUnsubscribe = onValue(
        notifRef,
        (snapshot) => {
            const newNotifications = [];

            if (snapshot.exists()) {
                snapshot.forEach((childSnapshot) => {
                    const notif = childSnapshot.val();
                    newNotifications.push({ id: childSnapshot.key, ...notif });
                });
            }

            newNotifications.sort(
                (a, b) => (b.timestamp || 0) - (a.timestamp || 0)
            );

            const currentUnreadCount = newNotifications.filter(
                (n) => !n.read
            ).length;
            const previousUnreadCount = allNotifications.filter(
                (n) => !n.read
            ).length;

            if (
                currentUnreadCount > previousUnreadCount &&
                previousNotificationCount > 0
            ) {
                animateNewNotification();
                playNotificationSound();
            }

            allNotifications = newNotifications;
            previousNotificationCount = allNotifications.length;
            updateBadgeCount();
        },
        (error) => {
            console.error('❌ Error loading notifications:', error);
        }
    );

    console.log('✅ Notification listener attached');
}

// ============================================
// Animations on New Notification
// ============================================
function animateNewNotification() {
    const bellBtn = document.getElementById('globalNotificationBtn');
    const badge = document.getElementById('globalNotificationBadge');

    if (bellBtn) {
        bellBtn.classList.add('notification-shake');
        setTimeout(() => bellBtn.classList.remove('notification-shake'), 500);
    }

    if (badge) {
        badge.classList.add('notification-pulse');
        setTimeout(() => badge.classList.remove('notification-pulse'), 1000);
    }

    showToast('🔔 New notification!', 'info');
}

// ============================================
// Simple Notification Sound
// ============================================
function playNotificationSound() {
    try {
        const AudioCtx =
            window.AudioContext || window.webkitAudioContext;
        const audioContext = new AudioCtx();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 800;
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(
            0.01,
            audioContext.currentTime + 0.2
        );

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2);
    } catch (err) {
        console.warn('Notification sound failed:', err);
    }
}

// ============================================
// Render Notifications
// ============================================
function renderNotifications(filter = 'all') {
    const listEl = document.getElementById('notificationList');
    if (!listEl) return;

    let filteredNotifs = allNotifications;
    if (filter !== 'all') {
        filteredNotifs = allNotifications.filter(
            (n) => n.type === filter
        );
    }

    if (filteredNotifs.length === 0) {
        listEl.innerHTML = `
            <div class="notification-empty">
                <i class="fas fa-bell-slash"></i>
                <p>No ${filter === 'all' ? '' : filter} notifications</p>
                <span>You'll be notified when someone<br>interacts with your messages</span>
            </div>
        `;
        return;
    }

    listEl.innerHTML = '';
    filteredNotifs.forEach((notif) => {
        const item = createNotificationItem(notif);
        listEl.appendChild(item);
    });
}

// ============================================
// Create Single Notification Item
// ============================================
function createNotificationItem(notif) {
    const div = document.createElement('div');
    div.className = `notification-item ${notif.read ? 'read' : 'unread'}`;
    div.dataset.notifId = notif.id;

    let iconHtml = '';
    let message = '';

    if (notif.type === 'likes') {
        iconHtml = '<i class="fas fa-heart"></i>';
        message = `<strong>${notif.fromUserName || 'Someone'}</strong> liked your message`;
    } else if (notif.type === 'replies') {
        iconHtml = '<i class="fas fa-reply"></i>';
        message = `<strong>${notif.fromUserName || 'Someone'}</strong> replied to your message`;
    }

    const timeAgo = getTimeAgo(notif.timestamp);

    div.innerHTML = `
        <div class="notification-icon">${iconHtml}</div>
        <div class="notification-content">
            <p class="notification-message">${message}</p>
            <p class="notification-preview">${notif.messagePreview || ''}</p>
            <span class="notification-time">${timeAgo}</span>
        </div>
        <button class="notification-delete" data-notif-id="${notif.id}" title="Delete">
            <i class="fas fa-times"></i>
        </button>
    `;

    div.addEventListener('click', (e) => {
        if (!e.target.closest('.notification-delete')) {
            closeNotificationPanel();
        }
    });

    const deleteBtn = div.querySelector('.notification-delete');
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteNotification(notif.id);
    });

    return div;
}

// ============================================
// Filter Wrapper
// ============================================
function filterNotifications(filter) {
    renderNotifications(filter);
}

// ============================================
// Badge Count
// ============================================
function updateBadgeCount() {
    const badge = document.getElementById('globalNotificationBadge');
    if (!badge) return;

    const unreadCount = allNotifications.filter(
        (n) => !n.read
    ).length;

    if (unreadCount > 0) {
        badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
        badge.style.display = 'inline-block';
    } else {
        badge.style.display = 'none';
    }
}

// ============================================
// Mark All as Read
// ============================================
function markAllAsRead() {
    const userId = getUserId();
    if (!userId) return;

    const unreadNotifs = allNotifications.filter((n) => !n.read);

    unreadNotifs.forEach((notif) => {
        const notifRef = ref(
            database,
            `notifications/${userId}/${notif.id}`
        );
        update(notifRef, { read: true });
    });
}

// ============================================
// Delete Notification
// ============================================
function deleteNotification(notifId) {
    const userId = getUserId();
    if (!userId) return;

    const notifRef = ref(database, `notifications/${userId}/${notifId}`);
    remove(notifRef)
        .then(() => {
            showToast('Notification deleted', 'info');
        })
        .catch((error) => {
            console.error('❌ Error deleting notification:', error);
            showToast('Failed to delete notification', 'error');
        });
}

// ============================================
// Time Ago Helper
// ============================================
function getTimeAgo(timestamp) {
    if (!timestamp) return 'Unknown';

    const now = Date.now();
    const diff = now - timestamp;

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    const date = new Date(timestamp);
    return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short'
    });
}

// ============================================
// Cleanup
// ============================================
export function cleanupNotifications() {
    if (notificationUnsubscribe) {
        notificationUnsubscribe();
        notificationUnsubscribe = null;
    }
    document.removeEventListener('click', closeOnClickOutside);
}

// ============================================
// PUBLIC: Send Notification to User
// ============================================
export function sendNotification(
    toUserId,
    type,
    fromUserName,
    messagePreview,
    messageId
) {
    const currentUserId = getUserId();
    if (!toUserId || toUserId === currentUserId) return;

    const notifData = {
        type, // 'likes' or 'replies'
        fromUserId: currentUserId,
        fromUserName: fromUserName || getUserName(),
        messagePreview: messagePreview
            ? messagePreview.substring(0, 50) + '...'
            : '',
        messageId,
        timestamp: Date.now(),
        read: false
    };

    const notifRef = ref(database, `notifications/${toUserId}`);
    push(notifRef, notifData);
}

console.log('🔔 Notification system v3.4 loaded');
