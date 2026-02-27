// ===========================
// GLOBAL SHARE v22.3 - STABLE
// ===========================

import { database, auth } from './firebase-config.js';
import {
  ref,
  push,
  onValue,
  remove,
  get,
  off,
  query,
  orderByChild,
  limitToLast,
  set
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

// ✅ Use unified userId logic from app.js (handles Firebase + QR login)
import { getUserId as getAppUserId } from './app.js';

// ✅ Import notifications
import { sendNotification } from './notifications.js';

// ============================================
// GLOBAL VARIABLES
// ============================================
let globalListener = null;
let currentCategory = 'all';
let replyingTo = null;
let isInitialized = false;

// ============================================
// HELPER: GET USER ID (EXPORTED)  ✅ UNIFIED
// ============================================
export function getUserId() {
  const uid = getAppUserId();
  if (uid) return uid;

  let userId = localStorage.getItem('userId');
  if (!userId) {
    userId =
      'user_' +
      Date.now() +
      '_' +
      Math.random().toString(36).substr(2, 9);
    localStorage.setItem('userId', userId);
  }
  return userId;
}

// ============================================
// GET USER NAME (EXPORTED)  ✅ QR-FRIENDLY + MATCHES app.js
// ============================================
export function getUserName() {
  const user = auth.currentUser;

  // 1) Firebase authenticated user (same priority as sidebar/app.js)
  if (user && user.displayName) return user.displayName;
  if (user && user.email) return user.email.split('@')[0];

  // 2) Linked account from QR / auth.js
  const linkedName = localStorage.getItem('linkedUserName');
  const linkedEmail = localStorage.getItem('linkedUserEmail');
  if (linkedName && linkedName !== 'null' && linkedName !== 'undefined') {
    return linkedName;
  }
  if (linkedEmail && linkedEmail !== 'null' && linkedEmail !== 'undefined') {
    return linkedEmail.split('@')[0];
  }

  // 3) Stable anon name
  let anonName = localStorage.getItem('anonUserName');
  if (!anonName || anonName === 'null' || anonName === 'undefined') {
    anonName = 'User ' + Date.now().toString().slice(-4);
    localStorage.setItem('anonUserName', anonName);
  }
  return anonName;
}

// ============================================
// GET USER PHOTO (EXPORTED)
// ============================================
export function getUserPhoto() {
  const user = auth.currentUser;
  if (user && user.photoURL) return user.photoURL;

  const linkedPhoto = localStorage.getItem('linkedUserPhoto');
  if (linkedPhoto && linkedPhoto !== 'null' && linkedPhoto !== 'undefined') {
    return linkedPhoto;
  }

  return null;
}

// ============================================
// HELPER: ESCAPE HTML
// ============================================
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ============================================
// ✅ FIXED LINKIFY - CLEAN RENDERING (v2)
// ============================================
function linkifyText(text) {
  if (!text) return '';

  const tempDiv = document.createElement('div');
  tempDiv.textContent = text;
  let result = tempDiv.innerHTML;

  const fullUrlPattern = /(https?:\/\/[^\s<>"']+)/gi;
  result = result.replace(fullUrlPattern, function (url) {
    return (
      '<a href="' +
      url +
      '" target="_blank" rel="noopener noreferrer" class="message-link">' +
      url +
      '</a>'
    );
  });

  const domainPattern =
    /(?<![\w\/.])((?:www\.)?[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}(?:\/[^\s<>"']*)?)/gi;

  result = result.replace(
    domainPattern,
    function (match, captureGroup, offset, fullString) {
      const before = fullString.substring(0, offset);
      const lastHrefPos = before.lastIndexOf('href="');
      const lastQuotePos = before.lastIndexOf('"');

      if (lastHrefPos > lastQuotePos) {
        return match;
      }

      const lastOpenTag = before.lastIndexOf('>');
      const lastCloseTag = before.lastIndexOf('</a>');
      if (lastOpenTag > lastCloseTag) {
        const after = fullString.substring(offset);
        if (
          after.indexOf('</a>') !== -1 &&
          after.indexOf('</a>') < after.indexOf('<a')
        ) {
          return match;
        }
      }

      const url = 'https://' + match;
      return (
        '<a href="' +
        url +
        '" target="_blank" rel="noopener noreferrer" class="message-link">' +
        match +
        '</a>'
      );
    }
  );

  return result;
}

// ============================================
// HELPER: SHOW TOAST (EXPORTED)
// ============================================
export function showToast(message, type = 'info') {
  if (window.showToast && typeof window.showToast === 'function') {
    window.showToast(message, type);
    return;
  }

  const toast = document.createElement('div');
  toast.textContent = message;
  toast.style.cssText =
    'position: fixed; top: 20px; right: 20px; background: #0ea5e9; color: white; padding: 12px 20px; border-radius: 8px; z-index: 99999; box-shadow: 0 4px 12px rgba(0,0,0,0.2);';
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ============================================
// INITIALIZATION (EXPORTED)
// ============================================
export function initGlobal() {
  if (isInitialized) {
    console.log('⚠️ Global already initialized');
    return;
  }
  console.log('🌍 Initializing Global Share v22.3...');

  setupGlobalUI();
  loadGlobalMessages();
  isInitialized = true;
}

export function cleanupGlobal() {
  if (globalListener) {
    const globalRef = ref(database, 'globalMessages');
    off(globalRef);
    globalListener = null;
  }
  replyingTo = null;
  isInitialized = false;
}

// ============================================
// UI SETUP
// ============================================
function setupGlobalUI() {
  console.log('🔧 Setting up Global UI...');

  const closeBtn = document.getElementById('closeGlobalModal');
  if (closeBtn) {
    closeBtn.onclick = function (e) {
      e.preventDefault();
      e.stopPropagation();
      window.closeGlobalModal();
      return false;
    };
  }

  const refreshBtn = document.getElementById('refreshGlobalBtn');
  if (refreshBtn) {
    refreshBtn.onclick = function (e) {
      e.preventDefault();
      e.stopPropagation();
      loadGlobalMessages();
      showToast('Refreshed!', 'success');
      return false;
    };
  }

  setupCategoryFilters();

  const sendBtn = document.getElementById('sendGlobalBtn');
  const input = document.getElementById('globalMessageInput');
  const categorySelect = document.getElementById('globalCategorySelect');

  if (sendBtn) {
    sendBtn.onclick = async function () {
      const message = input?.value.trim();
      if (!message) {
        showToast('Please enter a message', 'error');
        return;
      }
      if (message.length > 2000) {
        showToast('Message too long (max 2000)', 'error');
        return;
      }

      const category = categorySelect?.value || 'general';

      if (replyingTo) {
        await sendReply(replyingTo, message);
      } else {
        await sendGlobalMessage(message, category);
      }
    };
  }

  if (input) {
    input.onkeydown = function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendBtn?.click();
      }
    };

    input.oninput = function () {
      this.style.height = 'auto';
      this.style.height = Math.min(this.scrollHeight, 100) + 'px';
    };
  }

  const list = document.getElementById('globalMessagesList');
  if (list) {
    list.onclick = async function (e) {
      const target = e.target;

      if (target.closest('.copy-btn')) {
        await copyMessage(target.closest('.copy-btn'));
      } else if (target.closest('.delete-btn')) {
        await deleteMessage(target.closest('.delete-btn').dataset.id);
      } else if (target.closest('.like-btn')) {
        await toggleLike(target.closest('.like-btn').dataset.id);
      } else if (target.closest('.reply-btn')) {
        const btn = target.closest('.reply-btn');
        startReply(btn.dataset.id, btn.dataset.user);
      } else if (target.closest('.expand-message-btn')) {
        toggleExpand(target.closest('.expand-message-btn'));
      } else if (target.closest('.reply-delete-btn')) {
        const btn = target.closest('.reply-delete-btn');
        await deleteReply(btn.dataset.messageId, btn.dataset.replyId);
      }
    };
  }

  const cancelBtn = document.getElementById('cancelReplyBtn');
  if (cancelBtn) {
    cancelBtn.onclick = function () {
      cancelReply();
    };
  }
}

// ============================================
// CATEGORY FILTERS
// ============================================
function setupCategoryFilters() {
  const chips = document.querySelectorAll('.category-chip');
  chips.forEach((chip) => {
    chip.onclick = function () {
      chips.forEach((c) => c.classList.remove('active'));
      this.classList.add('active');
      currentCategory = this.dataset.category || 'all';
      loadGlobalMessages();
    };
  });
}

// ============================================
// LOAD MESSAGES
// ============================================
function loadGlobalMessages() {
  const list = document.getElementById('globalMessagesList');
  if (!list) return;

  list.innerHTML =
    '<div class="global-loading"><i class="fas fa-circle-notch fa-spin"></i><p>Loading...</p></div>';

  const globalRef = ref(database, 'globalMessages');
  const messagesQuery = query(
    globalRef,
    orderByChild('timestamp'),
    limitToLast(50)
  );

  if (globalListener) {
    off(globalRef);
  }

  globalListener = onValue(
    messagesQuery,
    (snapshot) => {
      const messages = [];
      if (snapshot.exists()) {
        snapshot.forEach((childSnapshot) => {
          const msg = childSnapshot.val();
          const id = childSnapshot.key;
          if (
            currentCategory === 'all' ||
            msg.category === currentCategory
          ) {
            messages.push({ id, ...msg });
          }
        });
      }

      messages.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      renderMessages(messages);
      updateMessageCount(messages.length);
    },
    (error) => {
      console.error('Error loading messages:', error);
      list.innerHTML =
        '<div class="global-error"><i class="fas fa-exclamation-circle"></i><p>Failed to load. Refresh.</p></div>';
    }
  );
}

// ============================================
// RENDER MESSAGES
// ============================================
function renderMessages(messages) {
  const list = document.getElementById('globalMessagesList');
  if (!list) return;

  if (messages.length === 0) {
    list.innerHTML =
      '<div class="global-empty-state"><i class="fas fa-comments"></i><p>No messages yet. Be the first!</p></div>';
    return;
  }

  list.innerHTML = '';
  messages.forEach((msg, index) => {
    const card = createMessageCard(msg, index);
    list.appendChild(card);
  });
}

// ============================================
// CREATE MESSAGE CARD
// ============================================
function createMessageCard(msg, index) {
  const div = document.createElement('div');
  div.className = 'global-message-card';
  div.dataset.messageId = msg.id;
  div.style.animationDelay = `${index * 0.05}s`;

  const userId = getUserId();
  const isOwner = msg.userId === userId;
  const timeAgo = getTimeAgo(msg.timestamp);
  const hasLiked = msg.likes && msg.likes[userId];
  const likeCount = msg.likes ? Object.keys(msg.likes).length : 0;
  const isLongMessage = msg.content && msg.content.length > 200;
  const contentClass = isLongMessage
    ? 'global-message-content collapsed'
    : 'global-message-content';

  const userName = msg.userName || 'Anonymous';
  const userPhoto = msg.userPhoto;
  let avatarHTML;

  if (userPhoto) {
    avatarHTML = `<div class="global-avatar"><img src="${userPhoto}" alt="${escapeHtml(
      userName
    )}" onerror="this.parentElement.innerHTML='${userName[0].toUpperCase()}'"></div>`;
  } else {
    avatarHTML = `<div class="global-avatar">${userName[0].toUpperCase()}</div>`;
  }

  const linkedContent = linkifyText(msg.content);

  div.innerHTML = `
        <div class="global-message-header">
            <div class="global-user-info">
                ${avatarHTML}
                <span class="global-username">${escapeHtml(userName)}</span>
            </div>
            <span class="global-category-badge">${msg.category || 'general'}</span>
        </div>
        <div class="${contentClass}">${linkedContent}</div>
        ${
          isLongMessage
            ? '<button class="expand-message-btn">Show more</button>'
            : ''
        }
        <div class="global-message-actions">
            <button class="global-action-btn like-btn ${
              hasLiked ? 'liked' : ''
            }" data-id="${msg.id}" title="Like">
                <i class="fas fa-heart"></i> <span>${likeCount}</span>
            </button>
            <button class="global-action-btn reply-btn" data-id="${msg.id}" data-user="${escapeHtml(
              userName
            )}" title="Reply">
                <i class="fas fa-reply"></i> Reply
            </button>
            <button class="global-action-btn copy-btn" data-content="${escapeHtml(
              msg.content
            )}" title="Copy">
                <i class="fas fa-copy"></i> Copy
            </button>
            ${
              isOwner
                ? `<button class="global-action-btn delete-btn" data-id="${msg.id}" title="Delete"><i class="fas fa-trash"></i> Delete</button>`
                : ''
            }
        </div>
        <div class="global-message-meta">
            <span class="global-message-time"><i class="far fa-clock"></i> ${timeAgo}</span>
            ${
              likeCount > 0
                ? `<span class="global-like-count"><i class="fas fa-heart"></i> ${likeCount}</span>`
                : ''
            }
        </div>
        ${msg.replies ? renderReplies(msg.replies, msg.id) : ''}
    `;

  return div;
}

// ============================================
// RENDER REPLIES
// ============================================
function renderReplies(replies, messageId) {
  if (!replies || Object.keys(replies).length === 0) return '';

  const userId = getUserId();
  const replyArray = Object.entries(replies).map(([id, reply]) => ({
    id,
    ...reply
  }));
  replyArray.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

  let html = '<div class="global-replies">';
  replyArray.forEach((reply) => {
    const timeAgo = getTimeAgo(reply.timestamp);
    const isOwner = reply.userId === userId;
    const userName = reply.userName || 'Anonymous';

    const linkedReply = linkifyText(reply.content);

    html += `
            <div class="global-reply-item">
                <div class="global-reply-header">
                    <span class="global-reply-user">${escapeHtml(
                      userName
                    )}</span>
                    <div class="global-reply-meta">
                        <span class="global-reply-time">${timeAgo}</span>
                        ${
                          isOwner
                            ? `<button class="reply-delete-btn" data-message-id="${messageId}" data-reply-id="${reply.id}"><i class="fas fa-trash"></i></button>`
                            : ''
                        }
                    </div>
                </div>
                <div class="global-reply-content">${linkedReply}</div>
            </div>
        `;
  });
  html += '</div>';

  return html;
}

// ============================================
// DELETE REPLY
// ============================================
async function deleteReply(messageId, replyId) {
  if (!confirm('Delete this reply?')) return;

  try {
    await remove(
      ref(database, `globalMessages/${messageId}/replies/${replyId}`)
    );
    showToast('Reply deleted', 'success');
  } catch (error) {
    console.error('Error deleting reply:', error);
    showToast('Failed to delete reply', 'error');
  }
}

// ============================================
// SEND MESSAGE
// ============================================
async function sendGlobalMessage(content, category) {
  try {
    const userId = getUserId();
    const userName = getUserName();
    const userPhoto = getUserPhoto();

    const messageData = {
      content,
      category,
      userId,
      userName,
      userPhoto: userPhoto || null,
      timestamp: Date.now(),
      likes: {},
      replies: {}
    };

    await push(ref(database, 'globalMessages'), messageData);

    const input = document.getElementById('globalMessageInput');
    if (input) {
      input.value = '';
      input.style.height = 'auto';
    }

    showToast('Message shared!', 'success');

    setTimeout(() => {
      const list = document.getElementById('globalMessagesList');
      if (list) list.scrollTo({ top: 0, behavior: 'smooth' });
    }, 300);
  } catch (error) {
    console.error('Error sending message:', error);
    showToast('Failed to send message', 'error');
  }
}

// ============================================
// TOGGLE LIKE  ✅ SENDS NOTIFICATION
// ============================================
async function toggleLike(messageId) {
  try {
    const userId = getUserId();
    if (!userId || !messageId) return;

    const messageRef = ref(database, `globalMessages/${messageId}`);
    const snapshot = await get(messageRef);

    if (!snapshot.exists()) {
      showToast('Message not found', 'error');
      return;
    }

    const messageData = snapshot.val();
    const likes = messageData.likes || {};

    if (likes[userId]) {
      delete likes[userId];
      await set(
        ref(database, `globalMessages/${messageId}/likes`),
        likes
      );
      showToast('Unliked', 'info');
    } else {
      likes[userId] = { timestamp: Date.now() };
      await set(
        ref(database, `globalMessages/${messageId}/likes`),
        likes
      );
      showToast('Liked!', 'success');

      // ✅ Notify owner
      if (messageData.userId && messageData.userId !== userId) {
        sendNotification(
          messageData.userId,
          'likes',
          getUserName(),
          messageData.content,
          messageId
        );
      }
    }
  } catch (error) {
    console.error('Error toggling like', error);
    showToast('Failed to like', 'error');
  }
}

// ============================================
// REPLY FUNCTIONS  ✅ SENDS NOTIFICATION
// ============================================
function startReply(messageId, userName) {
  replyingTo = messageId;
  const input = document.getElementById('globalMessageInput');
  const cancelBtn = document.getElementById('cancelReplyBtn');

  if (input) {
    input.placeholder = 'Replying to ' + userName + '...';
    input.focus();
  }

  if (cancelBtn) {
    cancelBtn.style.display = 'flex';
  }
}

async function sendReply(messageId, content) {
  try {
    const userId = getUserId();
    const userName = getUserName();
    const userPhoto = getUserPhoto();

    const replyData = {
      content,
      userId,
      userName,
      userPhoto: userPhoto || null,
      timestamp: Date.now()
    };

    await push(
      ref(database, `globalMessages/${messageId}/replies`),
      replyData
    );

    // ✅ Notify original message owner
    const msgSnap = await get(
      ref(database, `globalMessages/${messageId}`)
    );
    if (msgSnap.exists()) {
      const msg = msgSnap.val();
      if (msg.userId && msg.userId !== userId) {
        sendNotification(
          msg.userId,
          'replies',
          userName,
          content,
          messageId
        );
      }
    }

    cancelReply();

    const input = document.getElementById('globalMessageInput');
    if (input) {
      input.value = '';
      input.style.height = 'auto';
    }

    showToast('Reply sent!', 'success');
  } catch (error) {
    console.error('Error sending reply:', error);
    showToast('Failed to send reply', 'error');
  }
}

function cancelReply() {
  replyingTo = null;
  const input = document.getElementById('globalMessageInput');
  const cancelBtn = document.getElementById('cancelReplyBtn');

  if (input) {
    input.placeholder = 'Share something with the world...';
  }

  if (cancelBtn) {
    cancelBtn.style.display = 'none';
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
function toggleExpand(btn) {
  const messageContent = btn.previousElementSibling;
  if (messageContent) {
    if (messageContent.classList.contains('collapsed')) {
      messageContent.classList.remove('collapsed');
      btn.textContent = 'Show less';
    } else {
      messageContent.classList.add('collapsed');
      btn.textContent = 'Show more';
    }
  }
}

async function copyMessage(btn) {
  const content = btn.dataset.content;
  try {
    await navigator.clipboard.writeText(content);
    showToast('Copied!', 'success');
  } catch (error) {
    console.error('Error copying:', error);
    showToast('Failed to copy', 'error');
  }
}

async function deleteMessage(messageId) {
  if (!confirm('Delete this message?')) return;

  try {
    await remove(ref(database, `globalMessages/${messageId}`));
    showToast('Message deleted', 'success');
  } catch (error) {
    console.error('Error deleting:', error);
    showToast('Failed to delete', 'error');
  }
}

function updateMessageCount(count) {
  const countEl = document.getElementById('globalMessageCount');
  if (countEl) {
    countEl.textContent = count;
  }
}

// ============================================
// MODAL CONTROLS
// ============================================
window.openGlobalModal = function () {
  const modal = document.getElementById('globalModal');
  if (modal) {
    modal.classList.add('active');
    modal.style.display = 'flex';
    if (!isInitialized) {
      initGlobal();
    } else {
      loadGlobalMessages();
    }
    setTimeout(() => {
      const inp = document.getElementById('globalMessageInput');
      if (inp) inp.focus();
    }, 300);
  }
};

window.closeGlobalModal = function () {
  const modal = document.getElementById('globalModal');
  if (modal) {
    modal.classList.remove('active');
    cancelReply();

    setTimeout(() => {
      modal.style.display = 'none';
    }, 300);
  }
};

// ============================================
// TIME AGO
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
  if (minutes < 60) return minutes + 'm';
  if (hours < 24) return hours + 'h';
  if (days < 7) return days + 'd';

  const date = new Date(timestamp);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short'
  });
}

// ============================================
// INITIALIZE
// ============================================
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('🌍 Global Share v22.3 ready');
  });
} else {
  console.log('🌍 Global Share v22.3 ready');
}
