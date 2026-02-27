import { database } from './firebase-config.js';
import { getUserId } from './app.js';
import { ref, get } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

let searchQuery = '';
let allMatches = []; // Array of {element, matchElement, messageIndex}
let currentMatchIndex = 0;

export function initSearch() {
    const searchInput = document.getElementById('searchInput');
    const clearSearchBtn = document.getElementById('clearSearch');

    searchInput?.addEventListener('input', debounce((e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        
        if (searchQuery) {
            clearSearchBtn.style.display = 'block';
            performSearch(searchQuery);
        } else {
            clearSearchBtn.style.display = 'none';
            clearSearchResults();
        }
    }, 300));

    clearSearchBtn?.addEventListener('click', clearSearchUI);

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Ctrl+K or Cmd+K to focus search
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            searchInput.focus();
        }

        // Escape to clear search
        if (e.key === 'Escape' && searchQuery) {
            clearSearchUI();
        }

        // Arrow keys to navigate results
        if (searchQuery && allMatches.length > 0) {
            if (e.key === 'ArrowDown' || e.key === 'Enter') {
                e.preventDefault();
                navigateMatches('next');
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                navigateMatches('prev');
            }
        }
    });
}

function performSearch(query) {
    const messageItems = document.querySelectorAll('.message-item');
    allMatches = [];
    let matchingMessages = 0;

    messageItems.forEach((item, messageIndex) => {
        const content = item.querySelector('.message-content');
        const originalText = content.dataset.originalText || content.textContent;

        // Store original text
        if (!content.dataset.originalText) {
            content.dataset.originalText = originalText;
        }

        const device = item.querySelector('.message-device')?.textContent.toLowerCase() || '';
        const lowerContent = originalText.toLowerCase();

        // Check if query matches
        if (lowerContent.includes(query) || device.includes(query)) {
            item.style.display = 'block';
            item.classList.add('search-match');
            matchingMessages++;

            // Highlight matches and collect all match elements
            const { html, matches } = highlightTextAndCollect(originalText, query, item);
            content.innerHTML = html;

            // Store all match positions for this message
            matches.forEach((matchIndex) => {
                allMatches.push({
                    messageElement: item,
                    messageIndex: messageIndex,
                    matchIndex: matchIndex
                });
            });
        } else {
            item.style.display = 'none';
            item.classList.remove('search-match');
            content.textContent = originalText;
        }
    });

    // Update search UI
    updateSearchUI(allMatches.length, matchingMessages);

    // Focus first match
    if (allMatches.length > 0) {
        currentMatchIndex = 0;
        highlightCurrentMatch();
    }
}

function highlightTextAndCollect(text, query) {
    if (!query) return { html: escapeHtml(text), matches: [] };

    const escapedText = escapeHtml(text);
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();

    let html = '';
    let lastIndex = 0;
    let matchIndex = 0;
    const matches = [];

    let pos = lowerText.indexOf(lowerQuery);
    while (pos !== -1) {
        // Add text before match
        html += escapedText.substring(lastIndex, pos);

        // Add highlighted match with unique ID
        const matchId = `match-${Date.now()}-${matchIndex}`;
        html += `<mark class="search-highlight" data-match-id="${matchId}">${escapedText.substring(pos, pos + query.length)}</mark>`;
        
        matches.push(matchIndex);
        matchIndex++;
        lastIndex = pos + query.length;
        pos = lowerText.indexOf(lowerQuery, lastIndex);
    }

    // Add remaining text
    html += escapedText.substring(lastIndex);

    return { html, matches };
}

function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function updateSearchUI(totalMatches, matchingMessages) {
    const messagesList = document.getElementById('messagesList');

    // Remove old search info
    const oldInfo = document.querySelector('.search-info-banner');
    if (oldInfo) oldInfo.remove();

    // Add search info banner
    if (searchQuery) {
        const banner = document.createElement('div');
        banner.className = 'search-info-banner';
        banner.innerHTML = `
            <div class="search-info-content">
                <i class="fas fa-search"></i>
                <span class="search-count">
                    ${totalMatches > 0 
                        ? `${totalMatches} match${totalMatches > 1 ? 'es' : ''} in ${matchingMessages} message${matchingMessages > 1 ? 's' : ''}`
                        : 'No results found'
                    }
                </span>
            </div>
            ${totalMatches > 0 ? `
                <div class="search-navigation">
                    <button class="search-nav-btn" id="prevMatch" title="Previous" ${totalMatches <= 1 ? 'disabled' : ''}>
                        <i class="fas fa-chevron-up"></i>
                    </button>
                    <span class="search-position">${currentMatchIndex + 1}/${totalMatches}</span>
                    <button class="search-nav-btn" id="nextMatch" title="Next" ${totalMatches <= 1 ? 'disabled' : ''}>
                        <i class="fas fa-chevron-down"></i>
                    </button>
                </div>
            ` : ''}
        `;

        const firstMessage = messagesList.querySelector('.message-item');
        if (firstMessage) {
            messagesList.insertBefore(banner, firstMessage);
        } else {
            messagesList.appendChild(banner);
        }

        // Attach navigation events
        document.getElementById('prevMatch')?.addEventListener('click', () => navigateMatches('prev'));
        document.getElementById('nextMatch')?.addEventListener('click', () => navigateMatches('next'));
    }

    // Show empty state if no results
    if (totalMatches === 0 && document.querySelectorAll('.message-item').length === 0) {
        const emptyState = document.createElement('div');
        emptyState.className = 'empty-state search-empty-state';
        emptyState.innerHTML = `
            <i class="fas fa-search"></i>
            <p>No messages found</p>
            <p style="font-size: 14px; color: var(--text-muted); margin-top: 8px;">
                Try different keywords
            </p>
        `;
        messagesList.appendChild(emptyState);
    }
}

function navigateMatches(direction) {
    if (allMatches.length === 0) return;

    // Remove current active highlight
    document.querySelectorAll('.search-highlight').forEach(mark => {
        mark.classList.remove('active-match');
    });

    // Calculate new index
    if (direction === 'next') {
        currentMatchIndex = (currentMatchIndex + 1) % allMatches.length;
    } else {
        currentMatchIndex = (currentMatchIndex - 1 + allMatches.length) % allMatches.length;
    }

    // Highlight and scroll to new match
    highlightCurrentMatch();

    // Update position counter
    const positionSpan = document.querySelector('.search-position');
    if (positionSpan) {
        positionSpan.textContent = `${currentMatchIndex + 1}/${allMatches.length}`;
    }
}

function highlightCurrentMatch() {
    if (allMatches.length === 0) return;

    const currentMatch = allMatches[currentMatchIndex];
    const messageElement = currentMatch.messageElement;

    // Remove active class from all messages and highlights
    document.querySelectorAll('.message-item').forEach(item => {
        item.classList.remove('search-active');
    });
    document.querySelectorAll('.search-highlight').forEach(mark => {
        mark.classList.remove('active-match');
    });

    // Add active class to current message
    messageElement.classList.add('search-active');

    // Find and highlight the specific match
    const allHighlights = messageElement.querySelectorAll('.search-highlight');
    if (allHighlights[currentMatch.matchIndex]) {
        const activeHighlight = allHighlights[currentMatch.matchIndex];
        activeHighlight.classList.add('active-match');

        // Scroll to the specific highlight
        setTimeout(() => {
            activeHighlight.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center',
                inline: 'nearest'
            });
        }, 100);
    }
}

function clearSearchUI() {
    const searchInput = document.getElementById('searchInput');
    const clearSearchBtn = document.getElementById('clearSearch');

    searchInput.value = '';
    searchQuery = '';
    clearSearchBtn.style.display = 'none';
    allMatches = [];
    currentMatchIndex = 0;

    showAllMessages();

    // Remove search banner
    const banner = document.querySelector('.search-info-banner');
    if (banner) banner.remove();

    searchInput.focus();
}

function clearSearchResults() {
    showAllMessages();

    // Remove search banner
    const banner = document.querySelector('.search-info-banner');
    if (banner) banner.remove();
}

function showAllMessages() {
    const messageItems = document.querySelectorAll('.message-item');

    messageItems.forEach(item => {
        item.style.display = 'block';
        item.classList.remove('search-match', 'search-active');

        // Restore original text
        const content = item.querySelector('.message-content');
        if (content.dataset.originalText) {
            content.textContent = content.dataset.originalText;
        }
    });

    // Remove search empty state
    const searchEmptyState = document.querySelector('.search-empty-state');
    if (searchEmptyState) searchEmptyState.remove();
}

// Debounce function for better performance
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

export function getSearchQuery() {
    return searchQuery;
}

export function clearSearch() {
    clearSearchUI();
}
