import { database, auth } from './firebase-config.js';
import { ref, push, onValue, remove, serverTimestamp, get, update } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { currentUser } from './app.js';

let linksUnsubscribe = null;

// URL detection regex
const URL_REGEX = /(https?:\/\/[^\s<>"\)]+)/gi;

/**
 * Extract links from text
 */
export function extractLinks(text) {
    const links = [];
    let match;
    const regex = new RegExp(URL_REGEX);
    while ((match = regex.exec(text)) !== null) {
        links.push({
            url: match[0],
            text: match[0]
        });
    }
    return links;
}

/**
 * Convert links in text to clickable HTML
 */
export function linkifyText(text) {
    return text.replace(URL_REGEX, (url) => {
        const domain = new URL(url).hostname.replace('www.', '');
        return `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="message-link" title="${escapeHtml(url)}">
            <i class="fas fa-external-link-alt"></i> ${escapeHtml(domain)}
        </a>`;
    });
}

/**
 * Get category for a URL
 */
export function categorizeLink(url) {
    try {
        const domain = new URL(url).hostname.toLowerCase();
        
        if (domain.includes('youtube.com') || domain.includes('youtu.be')) return 'Video';
        if (domain.includes('instagram.com') || domain.includes('facebook.com') || domain.includes('twitter.com') || domain.includes('x.com') || domain.includes('linkedin.com')) return 'Social Media';
        if (domain.includes('github.com') || domain.includes('gitlab.com') || domain.includes('bitbucket.org')) return 'Code';
        if (domain.includes('stackoverflow.com') || domain.includes('reddit.com')) return 'Q&A';
        if (domain.includes('medium.com') || domain.includes('dev.to') || domain.includes('hashnode.com')) return 'Articles';
        if (domain.includes('drive.google.com') || domain.includes('dropbox.com') || domain.includes('onedrive.live.com')) return 'Cloud Storage';
        if (domain.includes('docs.google.com') || domain.includes('notion.so') || domain.includes('confluence.atlassian.net')) return 'Documents';
        if (domain.includes('amazon.com') || domain.includes('ebay.com') || domain.includes('flipkart.com')) return 'Shopping';
        if (domain.includes('netflix.com') || domain.includes('spotify.com') || domain.includes('twitch.tv')) return 'Entertainment';
        
        return 'Links';
    } catch (e) {
        return 'Links';
    }
}

/**
 * Save link to global links collection (separate global feature)
 */
export async function addLinkToGlobal(url, category = null, description = '') {
    if (!currentUser) return;
    
    try {
        const finalCategory = category || categorizeLink(url);
        const linksRef = ref(database, `users/${currentUser.uid}/globalLinks`);
        
        await push(linksRef, {
            url: url,
            category: finalCategory,
            description: description,
            createdAt: serverTimestamp(),
            domain: new URL(url).hostname
        });
    } catch (error) {
        console.error('Error saving link:', error);
    }
}

/**
 * Initialize global links feature
 */
export function initLinks() {
    loadGlobalLinks();
    setupLinksModal();
}

/**
 * Load all global links categorized
 */
function loadGlobalLinks() {
    if (!currentUser) return;
    
    if (linksUnsubscribe) {
        linksUnsubscribe();
        linksUnsubscribe = null;
    }
    
    const linksRef = ref(database, `users/${currentUser.uid}/globalLinks`);
    linksUnsubscribe = onValue(linksRef, (snapshot) => {
        const links = {};
        
        if (snapshot.exists()) {
            snapshot.forEach(child => {
                const link = child.val();
                const category = link.category || 'Links';
                
                if (!links[category]) {
                    links[category] = [];
                }
                
                links[category].push({
                    id: child.key,
                    ...link
                });
            });
        }
        
        // Sort categories and links by date
        Object.keys(links).forEach(category => {
            links[category].sort((a, b) => {
                const aTime = getTimestamp(a.createdAt);
                const bTime = getTimestamp(b.createdAt);
                return bTime - aTime;
            });
        });
        
        renderLinksModal(links);
    });
}

/**
 * Extract timestamp from Firebase server timestamp or number
 */
function getTimestamp(value) {
    if (typeof value === 'object' && value.seconds) {
        return value.seconds * 1000;
    }
    return typeof value === 'number' ? value : 0;
}

/**
 * Render links in modal
 */
function renderLinksModal(linksByCategory) {
    const linksContent = document.getElementById('linksContent');
    if (!linksContent) return;
    
    if (Object.keys(linksByCategory).length === 0) {
        linksContent.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-link"></i>
                <p>No links saved yet</p>
                <small>Add links from the link sharing panel</small>
            </div>
        `;
        return;
    }
    
    let html = '';
    const sortedCategories = Object.keys(linksByCategory).sort();
    
    sortedCategories.forEach(category => {
        html += `
            <div class="links-category">
                <h3 class="links-category-title">
                    <i class="fas fa-folder"></i> ${escapeHtml(category)}
                    <span class="links-count">${linksByCategory[category].length}</span>
                </h3>
                <div class="links-list">
        `;
        
        linksByCategory[category].forEach(link => {
            // Handle both server timestamp objects and milliseconds
            let timestamp = link.createdAt;
            if (typeof timestamp === 'object' && timestamp.seconds) {
                timestamp = timestamp.seconds * 1000; // Firebase server timestamp
            }
            const date = timestamp ? new Date(timestamp).toLocaleString('en-IN', {
                month: 'short',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            }) : 'Unknown';
            
            html += `
                <div class="link-item">
                    <div class="link-info">
                        <a href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer" class="link-url">
                            <i class="fas fa-external-link-alt"></i>
                            <span class="link-domain">${escapeHtml(link.domain)}</span>
                        </a>
                        ${link.description ? `<span class="link-description">${escapeHtml(link.description)}</span>` : ''}
                        <span class="link-date">${date}</span>
                    </div>
                    <button class="delete-link-btn" data-id="${escapeHtml(link.id)}" title="Delete link">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
    });
    
    linksContent.innerHTML = html;
    
    // Attach delete handlers
    linksContent.querySelectorAll('.delete-link-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const linkId = btn.dataset.id;
            deleteLink(linkId);
        });
    });
}

/**
 * Delete a link
 */
async function deleteLink(linkId) {
    if (!currentUser) return;
    
    try {
        await remove(ref(database, `users/${currentUser.uid}/globalLinks/${linkId}`));
    } catch (error) {
        console.error('Error deleting link:', error);
    }
}

/**
 * Setup links modal and sharing panel
 */
function setupLinksModal() {
    const linksBtn = document.getElementById('linksBtn');
    if (!linksBtn) return;
    
    linksBtn.addEventListener('click', () => {
        const modal = document.getElementById('linksModal');
        if (modal) modal.style.display = 'flex';
    });
    
    const closeLinksModal = document.getElementById('closeLinksModal');
    if (closeLinksModal) {
        closeLinksModal.addEventListener('click', () => {
            const modal = document.getElementById('linksModal');
            if (modal) modal.style.display = 'none';
        });
    }
    
    // Setup sharing panel
    setupLinkSharingPanel();
}

/**
 * Setup link sharing input panel
 */
function setupLinkSharingPanel() {
    const shareLinkBtn = document.getElementById('shareLinkBtn');
    const linkInput = document.getElementById('linkInput');
    const linkCategory = document.getElementById('linkCategory');
    const linkDescription = document.getElementById('linkDescription');
    
    if (!shareLinkBtn) return;
    
    shareLinkBtn.addEventListener('click', async () => {
        const url = linkInput?.value.trim();
        const category = linkCategory?.value || null;
        const description = linkDescription?.value.trim() || '';
        
        if (!url) {
            alert('Please enter a URL');
            return;
        }
        
        // Validate URL format
        try {
            new URL(url);
        } catch {
            alert('Please enter a valid URL (e.g., https://example.com)');
            return;
        }
        
        try {
            await addLinkToGlobal(url, category, description);
            linkInput.value = '';
            linkDescription.value = '';
            linkCategory.value = '';
            alert('Link saved to global library!');
        } catch (error) {
            console.error('Error saving link:', error);
            alert('Error saving link');
        }
    });
    
    // Allow Enter to share
    linkInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') shareLinkBtn.click();
    });
}

/**
 * Export cleanup function
 */
export function cleanupLinks() {
    if (linksUnsubscribe) {
        linksUnsubscribe();
        linksUnsubscribe = null;
    }
}

/**
 * Escape HTML function
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}


