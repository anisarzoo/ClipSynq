import { auth, database } from './firebase-config.js';
import {
  getUserId,
  getDeviceId,
  deviceName,
  getCurrentFolder,
  escapeHtml,
  showToast
} from './app.js';
import {
  ref,
  push,
  onChildAdded,
  onChildRemoved,
  onChildChanged,
  remove,
  update,
  get,
  off
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { recomputeAllFolderCounts } from './folders.js';

let editingMessageId = null;
let deletingMessageId = null;
let listenersAttached = false;
let messagesListener = null;

const MAX_COLLAPSE_CHARS = 350;

// cache for current user's profile
let cachedProfileName = null;

async function getProfileDisplayName() {
  const userId = getUserId();
  if (!userId) return 'Anonymous';

  if (cachedProfileName) return cachedProfileName;

  try {
    const snap = await get(
      ref(database, `users/${userId}/profile/displayName`)
    );
    const name = snap.exists() ? snap.val() : null;
    cachedProfileName = name || 'Anonymous';
    return cachedProfileName;
  } catch (e) {
    console.warn('Failed to load profile displayName, using fallback', e);
    return 'Anonymous';
  }
}

export function initMessages() {
  if (!listenersAttached) {
    setupMessageEvents();
    listenersAttached = true;
  }

  loadMessages();
  initAutoExpandTextarea();
}

// ------------ textarea auto-expand ------------
function initAutoExpandTextarea() {
  const textarea = document.getElementById('messageInput');
  if (!textarea) return;

  textarea.style.overflowX = 'hidden';
  textarea.style.overflowY = 'auto';
  textarea.style.overflowWrap = 'break-word';
  textarea.style.wordWrap = 'break-word';
  textarea.style.wordBreak = 'break-word';
  textarea.style.whiteSpace = 'pre-wrap';
  textarea.style.width = '100%';
  textarea.style.maxWidth = '100%';
  textarea.style.boxSizing = 'border-box';
  textarea.wrap = 'soft';

  function autoExpand() {
    textarea.style.height = 'auto';
    const newHeight = Math.min(textarea.scrollHeight, 160);
    textarea.style.height = newHeight + 'px';
    textarea.scrollLeft = 0;
  }

  textarea.removeEventListener('input', autoExpand);
  textarea.addEventListener('input', autoExpand);

  textarea.addEventListener('scroll', (e) => {
    if (e.target.scrollLeft !== 0) {
      e.target.scrollLeft = 0;
    }
  });

  const resetTextarea = () => {
    textarea.value = '';
    textarea.style.height = 'auto';
    textarea.scrollTop = 0;
    textarea.scrollLeft = 0;
  };

  window.removeEventListener('message-sent', resetTextarea);
  window.addEventListener('message-sent', resetTextarea);

  autoExpand();
  setTimeout(autoExpand, 100);
}

// ------------ event wiring ------------
function setupMessageEvents() {
  const input = document.getElementById('messageInput');
  const sendBtn = document.getElementById('sendBtn');
  const pasteBtn = document.getElementById('pasteBtn');
  const list = document.getElementById('messagesList');

  const oldSendBtn = sendBtn?.cloneNode(true);
  if (sendBtn && oldSendBtn) {
    sendBtn.parentNode.replaceChild(oldSendBtn, sendBtn);
  }

  document
    .getElementById('sendBtn')
    ?.addEventListener('click', () => sendMessage(input.value));

  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        return;
      }
      e.preventDefault();
      sendMessage(input.value);
    }
  });

  pasteBtn?.addEventListener('click', async () => {
    try {
      if (!navigator.clipboard?.readText) {
        input.focus();
        showToast('Please paste manually using Ctrl+V', 'error');
        return;
      }
      const text = await navigator.clipboard.readText();
      input.value = text;
      input.focus();
      input.dispatchEvent(new Event('input'));
    } catch (err) {
      console.error(err);
      input.focus();
      showToast('Please paste manually using Ctrl+V', 'error');
    }
  });

  list?.addEventListener('click', async (e) => {
    if (e.target.closest('.copy-btn')) {
      await copyMessage(e.target.closest('.copy-btn'));
    }
    if (e.target.closest('.edit-btn')) {
      editMessage(e.target.closest('.edit-btn').dataset.id);
    }
    if (e.target.closest('.delete-btn')) {
      showDeleteModal(e.target.closest('.delete-btn').dataset.id);
    }
    if (e.target.closest('.pin-btn')) {
      togglePin(e.target.closest('.pin-btn').dataset.id);
    }
    if (e.target.closest('.star-btn')) {
      toggleStar(e.target.closest('.star-btn').dataset.id);
    }
  });

  const pinnedBar = document.getElementById('pinnedMessagesBar');
  pinnedBar?.addEventListener('click', (e) => {
    if (e.target.closest('.pinned-badge-item')) {
      const id = e.target.closest('.pinned-badge-item').dataset.id;
      jumpToMessage(id);
    }
    if (e.target.closest('.quick-unpin-btn')) {
      e.stopPropagation();
      const id = e.target.closest('.quick-unpin-btn').dataset.id;
      togglePin(id);
    }
  });

  document.getElementById('saveEditBtn')?.addEventListener('click', saveEdit);
  document
    .getElementById('cancelEditBtn')
    ?.addEventListener('click', () => {
      document.getElementById('editModal').style.display = 'none';
    });
  document
    .getElementById('closeEditModal')
    ?.addEventListener('click', () => {
      document.getElementById('editModal').style.display = 'none';
    });

  document
    .getElementById('confirmDeleteBtn')
    ?.addEventListener('click', confirmDelete);
  document
    .getElementById('cancelDeleteBtn')
    ?.addEventListener('click', () => {
      document.getElementById('deleteModal').style.display = 'none';
      deletingMessageId = null;
    });

  document
    .getElementById('clearAllBtn')
    ?.addEventListener('click', showClearAllModal);
  document
    .getElementById('confirmClearAllBtn')
    ?.addEventListener('click', confirmClearAll);
  document
    .getElementById('cancelClearAllBtn')
    ?.addEventListener('click', () => {
      document.getElementById('clearAllModal').style.display = 'none';
    });
}

// ------------ realtime loading & counts - FIXED ------------
export function loadMessages() {
  const list = document.getElementById('messagesList');
  if (!list) return;

  if (messagesListener) {
    off(messagesListener);
    messagesListener = null;
  }

  list.innerHTML = `
    <div class="empty-state">
      <i class="fas fa-comments"></i>
      <p>No messages yet</p>
      <p style="font-size: 14px; color: var(--text-muted); margin-top: 8px;">
        Start by sending your first message
      </p>
    </div>
  `;

  const userId = getUserId();
  if (!userId) return;

  const messagesRef = ref(database, `users/${userId}/messages`);
  messagesListener = messagesRef;

  let messageCount = 0;
  let initialLoadTimer = null;

  onChildAdded(messagesRef, (snapshot) => {
    const msg = snapshot.val();
    const id = snapshot.key;
    addMessageToDOM(id, msg);
    messageCount++;

    // keep folder counts in sync for new messages (including other devices)
    recomputeAllFolderCounts();

    if (initialLoadTimer) clearTimeout(initialLoadTimer);

    initialLoadTimer = setTimeout(() => {
      updatePinnedBar();
    }, 500);
  });

  onChildRemoved(messagesRef, (snapshot) => {
    const id = snapshot.key;
    removeMessageFromDOM(id);
    updatePinnedBar();
    recomputeAllFolderCounts();
  });

  onChildChanged(messagesRef, (snapshot) => {
    const msg = snapshot.val();
    const id = snapshot.key;
    updateMessageInDOM(id, msg);
    updatePinnedBar();
  });
}

// ------------ Utility functions ------------
// Convert URLs in text to clickable links
export function linkifyText(text) {
  const urlRegex =
    /(?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9][\w\-.]*\.[a-zA-Z]{2,}(?:\/[^\s]*)?/g;
  return text.replace(urlRegex, (url) => {
    let cleanUrl = url.replace(/[.,!?]+$/, '');
    let href = cleanUrl;

    if (!/^https?:\/\//i.test(href)) {
      href = 'https://' + href;
    }

    const display =
      cleanUrl.length > 60 ? cleanUrl.substring(0, 57) + '...' : cleanUrl;
    return `<a href="${href}" target="_blank" rel="noopener noreferrer" class="message-link" title="Open in new tab">${display}</a>`;
  });
}

// Escape HTML and linkify URLs
export function escapeAndLinkify(text) {
  return linkifyText(escapeHtml(text));
}

// ------------ DOM helpers with collapse ------------
function addMessageToDOM(messageId, message) {
  const list = document.getElementById('messagesList');
  const emptyState = list.querySelector('.empty-state');
  if (emptyState) emptyState.remove();

  const currentFolder = getCurrentFolder();
  if (currentFolder !== 'all' && message.folder !== currentFolder) return;

  const div = document.createElement('div');
  div.className = 'message-item';
  if (message.pinned) div.classList.add('pinned');
  if (message.starred) div.classList.add('starred');
  div.dataset.id = messageId;
  div.dataset.folder = message.folder || 'all';
  div.dataset.content = message.content;

  const date = new Date(message.timestamp);
  const timeStr = date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  const edited = message.edited
    ? `<span class="edited-badge">edited</span>`
    : '';

  const statusIcon = 'fas fa-check';
  const pinIcon = message.pinned ? 'fas fa-thumbtack' : 'far fa-thumbtack';
  const starIcon = message.starred ? 'fas fa-star' : 'far fa-star';

  const senderName =
    message.name ||
    message.senderName ||
    'Anonymous';
  const avatar = message.photoURL || 'app.png';

  const rawContent = message.content || '';
  const isLong = rawContent.length > MAX_COLLAPSE_CHARS;
  const previewText = isLong
    ? rawContent.slice(0, MAX_COLLAPSE_CHARS) + '…'
    : rawContent;
  const fullHtml = escapeAndLinkify(rawContent);
  const previewHtml = escapeAndLinkify(previewText);

  div.innerHTML = `
    <div class="message-header">
      <div class="message-sender">
        <img class="message-avatar"
             src="${escapeHtml(avatar)}"
             alt="${escapeHtml(senderName)}"
             onerror="this.src='app.png'">
        <span class="message-sender-name">${escapeHtml(
          senderName
        )}</span>
      </div>
      <span class="message-time">
        <i class="${statusIcon}" title="Message sent"></i>
        ${timeStr} ${edited}
      </span>
    </div>

    <div class="message-content-wrapper">
      <div
        class="message-content message-content-collapsible ${
          isLong ? 'collapsed' : ''
        }"
        data-full="${encodeURIComponent(rawContent)}"
        data-preview="${encodeURIComponent(previewText)}"
      >
        ${isLong ? previewHtml : fullHtml}
      </div>
      ${
        isLong
          ? `<button class="message-toggle-btn" type="button">Show more</button>`
          : ''
      }
    </div>

    <div class="message-actions">
      <button class="action-btn copy-btn" data-id="${messageId}">
        <i class="far fa-copy"></i>
      </button>
      <button class="action-btn edit-btn" data-id="${messageId}">
        <i class="fas fa-edit"></i>
      </button>
      <button class="action-btn delete-btn" data-id="${messageId}">
        <i class="far fa-trash-alt"></i>
      </button>
      <button class="action-btn pin-btn" data-id="${messageId}">
        <i class="${pinIcon}"></i>
      </button>
      <button class="action-btn star-btn" data-id="${messageId}">
        <i class="${starIcon}"></i>
      </button>
    </div>
  `;

  list.appendChild(div);
  list.scrollTop = list.scrollHeight;

  const contentEl = div.querySelector('.message-content-collapsible');
  const toggleBtn = div.querySelector('.message-toggle-btn');

  if (contentEl && toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const collapsed = contentEl.classList.toggle('collapsed');
      const full = decodeURIComponent(contentEl.dataset.full || '');
      const preview = decodeURIComponent(contentEl.dataset.preview || '');
      const html = escapeAndLinkify(collapsed ? preview : full);
      contentEl.innerHTML = html;
      toggleBtn.textContent = collapsed ? 'Show more' : 'Show less';
    });
  }
}

function removeMessageFromDOM(messageId) {
  const item = document.querySelector(
    `.message-item[data-id="${messageId}"]`
  );
  if (item) item.remove();

  const list = document.getElementById('messagesList');
  if (list.children.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-comments"></i>
        <p>No messages</p>
      </div>
    `;
  }
}

function updateMessageInDOM(messageId, message) {
  const item = document.querySelector(
    `.message-item[data-id="${messageId}"]`
  );
  if (!item) return;

  item.dataset.content = message.content;

  const collapsible = item.querySelector('.message-content-collapsible');
  const plainContentDiv = item.querySelector('.message-content');

  if (collapsible) {
    const raw = message.content || '';
    const isLong = raw.length > MAX_COLLAPSE_CHARS;
    const preview = isLong ? raw.slice(0, MAX_COLLAPSE_CHARS) + '…' : raw;

    collapsible.dataset.full = encodeURIComponent(raw);
    collapsible.dataset.preview = encodeURIComponent(preview);

    const wasCollapsed = collapsible.classList.contains('collapsed');
    const html = escapeAndLinkify(wasCollapsed ? preview : raw);
    collapsible.innerHTML = html;

    let toggleBtn = item.querySelector('.message-toggle-btn');

    if (isLong) {
      if (!toggleBtn) {
        toggleBtn = document.createElement('button');
        toggleBtn.type = 'button';
        toggleBtn.className = 'message-toggle-btn';
        toggleBtn.textContent = wasCollapsed ? 'Show more' : 'Show less';
        collapsible.parentElement.appendChild(toggleBtn);

        toggleBtn.addEventListener('click', () => {
          const collapsedNow = collapsible.classList.toggle('collapsed');
          const full = decodeURIComponent(collapsible.dataset.full || '');
          const preview = decodeURIComponent(
            collapsible.dataset.preview || ''
          );
          const htmlNow = escapeAndLinkify(
            collapsedNow ? preview : full
          );
          collapsible.innerHTML = htmlNow;
          toggleBtn.textContent = collapsedNow
            ? 'Show more'
            : 'Show less';
        });
      } else {
        toggleBtn.textContent = wasCollapsed ? 'Show more' : 'Show less';
      }
    } else if (toggleBtn) {
      toggleBtn.remove();
      collapsible.classList.remove('collapsed');
    }
  } else if (plainContentDiv) {
    plainContentDiv.innerHTML = escapeAndLinkify(message.content);
  }

  const timeSpan = item.querySelector('.message-time');
  if (message.edited && !timeSpan.textContent.includes('edited')) {
    timeSpan.innerHTML += `<span class="edited-badge">edited</span>`;
  }

  if (message.pinned) {
    item.classList.add('pinned');
  } else {
    item.classList.remove('pinned');
  }

  if (message.starred) {
    item.classList.add('starred');
  } else {
    item.classList.remove('starred');
  }

  const pinBtn = item.querySelector('.pin-btn');
  if (pinBtn) {
    pinBtn.innerHTML = `<i class="${
      message.pinned ? 'fas' : 'far'
    } fa-thumbtack"></i> ${message.pinned ? 'Unpin' : 'Pin'}`;
  }

  const starBtn = item.querySelector('.star-btn');
  if (starBtn) {
    starBtn.innerHTML = `<i class="${
      message.starred ? 'fas' : 'far'
    } fa-star"></i> ${message.starred ? 'Unstar' : 'Star'}`;
  }
}

// ------------ pinned bar - FIXED ------------
function updatePinnedBar() {
  const bar = document.getElementById('pinnedMessagesBar');
  if (!bar) return;

  const pinnedList = document.getElementById('pinnedBadgesList');
  if (!pinnedList) return;

  const allPinned = document.querySelectorAll('.message-item.pinned');

  if (allPinned.length === 0) {
    bar.classList.remove('show');
    bar.style.display = 'none';
    return;
  }

  bar.classList.add('show');
  bar.style.display = 'flex';
  pinnedList.innerHTML = '';

  allPinned.forEach((item) => {
    const id = item.dataset.id;
    const content = item.dataset.content;
    const preview =
      content.substring(0, 50) + (content.length > 50 ? '...' : '');

    const badge = document.createElement('div');
    badge.className = 'pinned-badge-item';
    badge.dataset.id = id;
    badge.innerHTML = `
      <span class="pinned-preview">${escapeHtml(preview)}</span>
      <button class="quick-unpin-btn" data-id="${id}">
        <i class="fas fa-times"></i>
      </button>
    `;
    pinnedList.appendChild(badge);
  });
}

function jumpToMessage(messageId) {
  const item = document.querySelector(
    `.message-item[data-id="${messageId}"]`
  );
  if (!item) return;

  item.scrollIntoView({ behavior: 'smooth', block: 'center' });
  item.classList.add('jump-highlight');
  setTimeout(() => item.classList.remove('jump-highlight'), 2000);
}

// ------------ actions ------------
async function sendMessage(content) {
  const userId = getUserId();
  if (!userId) {
    showToast('Not authenticated. Please login.', 'error');
    return;
  }

  if (!content || !content.trim()) return;

  try {
    const currentFolder = getCurrentFolder();

    const senderName = await getProfileDisplayName();

    const messagePayload = {
      content: content.trim(),
      deviceId: getDeviceId(),
      deviceName: deviceName,
      name: senderName,
      timestamp: Date.now(),
      folder: currentFolder === 'all' ? null : currentFolder,
      pinned: false,
      starred: false
    };

    if (auth.currentUser && auth.currentUser.photoURL) {
      messagePayload.photoURL = auth.currentUser.photoURL;
    }

    await push(ref(database, `users/${userId}/messages`), messagePayload);

    window.dispatchEvent(new Event('message-sent'));

    recomputeAllFolderCounts();
  } catch (error) {
    console.error('Send error:', error);
    showToast('Failed to send message', 'error');
  }
}

// ------------ copy message - FIXED ------------
async function copyMessage(btn) {
  const messageItem = btn.closest('.message-item');
  const content = messageItem.dataset.content;

  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(content);
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = content;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }

    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-check"></i> Copied!';
    btn.style.background = '#d1fae5';
    btn.style.color = '#065f46';

    setTimeout(() => {
      btn.innerHTML = originalHTML;
      btn.style.background = '';
      btn.style.color = '';
    }, 2000);

    showToast('Copied to clipboard!', 'success');
  } catch (err) {
    console.error('Copy failed:', err);
    showToast('Failed to copy', 'error');
  }
}

function editMessage(messageId) {
  editingMessageId = messageId;
  const messageItem = document.querySelector(
    `.message-item[data-id="${messageId}"]`
  );
  const content = messageItem.dataset.content;

  document.getElementById('editTextarea').value = content;
  document.getElementById('editModal').style.display = 'flex';
  document.getElementById('editTextarea').focus();
}

async function saveEdit() {
  const newContent = document
    .getElementById('editTextarea')
    .value.trim();
  if (!newContent) {
    alert('Message cannot be empty');
    return;
  }

  const userId = getUserId();
  if (!userId) return;

  try {
    await update(
      ref(database, `users/${userId}/messages/${editingMessageId}`),
      {
        content: newContent,
        edited: true,
        editedAt: Date.now()
      }
    );

    document.getElementById('editModal').style.display = 'none';
    showToast('Message updated!', 'success');
  } catch (error) {
    console.error('Edit error:', error);
    showToast('Failed to update message', 'error');
  }
}

function showDeleteModal(messageId) {
  deletingMessageId = messageId;
  document.getElementById('deleteModal').style.display = 'flex';
}

async function confirmDelete() {
  if (!deletingMessageId) return;

  const userId = getUserId();
  if (!userId) return;

  try {
    await remove(
      ref(database, `users/${userId}/messages/${deletingMessageId}`)
    );
    document.getElementById('deleteModal').style.display = 'none';
    deletingMessageId = null;
    showToast('Message deleted', 'success');
  } catch (error) {
    console.error('Delete error:', error);
    showToast('Failed to delete message', 'error');
  }
}

function showClearAllModal() {
  const currentFolder = getCurrentFolder();
  const folderName =
    currentFolder === 'all' ? 'all messages' : 'messages in this folder';

  document.getElementById(
    'clearAllTitle'
  ).textContent = `Clear ${folderName}?`;
  document.getElementById(
    'clearAllSubtitle'
  ).textContent = `This will permanently delete ${folderName}. This action cannot be undone.`;
  document.getElementById('clearAllModal').style.display = 'flex';
}

async function confirmClearAll() {
  const currentFolder = getCurrentFolder();
  const userId = getUserId();
  if (!userId) return;

  try {
    const messagesRef = ref(database, `users/${userId}/messages`);
    const snapshot = await get(messagesRef);

    if (!snapshot.exists()) {
      document.getElementById('clearAllModal').style.display = 'none';
      showToast('No messages to clear', 'error');
      return;
    }

    let deletedCount = 0;
    const promises = [];

    snapshot.forEach((childSnapshot) => {
      const message = childSnapshot.val();
      const messageId = childSnapshot.key;

      if (
        currentFolder === 'all' ||
        message.folder === currentFolder
      ) {
        promises.push(
          remove(
            ref(
              database,
              `users/${userId}/messages/${messageId}`
            )
          )
        );
        deletedCount++;
      }
    });

    await Promise.all(promises);

    document.getElementById('clearAllModal').style.display = 'none';
    showToast(
      `Cleared ${deletedCount} message${
        deletedCount !== 1 ? 's' : ''
      }`,
      'success'
    );
    recomputeAllFolderCounts();
  } catch (error) {
    console.error('Clear error:', error);
    showToast('Failed to clear messages', 'error');
  }
}

async function togglePin(messageId) {
  const messageItem = document.querySelector(
    `.message-item[data-id="${messageId}"]`
  );
  const isPinned = messageItem.classList.contains('pinned');

  const userId = getUserId();
  if (!userId) return;

  try {
    await update(
      ref(database, `users/${userId}/messages/${messageId}`),
      {
        pinned: !isPinned
      }
    );

    showToast(
      isPinned ? 'Message unpinned' : 'Message pinned',
      'success'
    );
  } catch (error) {
    console.error('Pin error:', error);
    showToast('Failed to pin message', 'error');
  }
}

async function toggleStar(messageId) {
  const messageItem = document.querySelector(
    `.message-item[data-id="${messageId}"]`
  );
  const isStarred = messageItem.classList.contains('starred');

  const userId = getUserId();
  if (!userId) return;

  try {
    await update(
      ref(database, `users/${userId}/messages/${messageId}`),
      {
        starred: !isStarred
      }
    );

    showToast(
      isStarred ? 'Message unstarred' : 'Message starred',
      'success'
    );
  } catch (error) {
    console.error('Star error:', error);
    showToast('Failed to star message', 'error');
  }
}

function getDeviceIcon(deviceName) {
  if (!deviceName) return 'desktop';
  const name = deviceName.toLowerCase();
  if (
    name.includes('iphone') ||
    name.includes('android') ||
    name.includes('mobile')
  ) {
    return 'mobile-alt';
  } else if (name.includes('ipad') || name.includes('tablet')) {
    return 'tablet-alt';
  } else if (name.includes('mac')) {
    return 'laptop';
  } else {
    return 'desktop';
  }
}
