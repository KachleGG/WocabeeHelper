/**
 * WocabeeHelper Popup Script
 * Controls the browser toolbar popup
 */

// Storage keys (same as in config.js)
const STORAGE_KEYS = {
    wordDatabase: 'wh_word_database',
    settings: 'wh_settings',
    stats: 'wh_stats'
};

// Default settings
const DEFAULT_SETTINGS = {
    autoHighlight: true,
    showHints: true,
    autoAnswer: false
};

/**
 * Initialize popup
 */
async function init() {
    await loadSettings();
    await loadStats();
    await checkStatus();
    setupEventListeners();
}

/**
 * Load settings from storage
 */
async function loadSettings() {
    try {
        const data = await chrome.storage.local.get(STORAGE_KEYS.settings);
        const settings = data[STORAGE_KEYS.settings] 
            ? JSON.parse(data[STORAGE_KEYS.settings]) 
            : DEFAULT_SETTINGS;

        document.getElementById('setting-highlight').checked = settings.autoHighlight ?? true;
        document.getElementById('setting-hints').checked = settings.showHints ?? true;
        document.getElementById('setting-auto').checked = settings.autoAnswer ?? false;
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

/**
 * Save settings to storage
 */
async function saveSettings() {
    const settings = {
        autoHighlight: document.getElementById('setting-highlight').checked,
        showHints: document.getElementById('setting-hints').checked,
        autoAnswer: document.getElementById('setting-auto').checked
    };

    try {
        await chrome.storage.local.set({
            [STORAGE_KEYS.settings]: JSON.stringify(settings)
        });
        
        // Notify content script
        sendToContentScript({ action: 'updateSettings', settings });
    } catch (error) {
        console.error('Error saving settings:', error);
    }
}

/**
 * Load statistics
 */
async function loadStats() {
    try {
        const data = await chrome.storage.local.get([
            STORAGE_KEYS.wordDatabase,
            STORAGE_KEYS.stats
        ]);

        // Word count
        let wordCount = 0;
        if (data[STORAGE_KEYS.wordDatabase]) {
            const db = JSON.parse(data[STORAGE_KEYS.wordDatabase]);
            wordCount = Object.keys(db).length;
        }
        document.getElementById('stat-words').textContent = wordCount;

        // Helped count
        let helpedCount = 0;
        if (data[STORAGE_KEYS.stats]) {
            const stats = JSON.parse(data[STORAGE_KEYS.stats]);
            helpedCount = stats.answersHelped || 0;
        }
        document.getElementById('stat-helped').textContent = helpedCount;
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

/**
 * Check if we're on a Wocabee page
 */
async function checkStatus() {
    const statusEl = document.getElementById('status');
    const statusText = statusEl.querySelector('.status-text');

    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (tab && tab.url && (
            tab.url.includes('wocabee.app') || 
            tab.url.includes('app.wocabee')
        )) {
            statusEl.classList.add('active');
            statusEl.classList.remove('inactive');
            statusText.textContent = 'Active on Wocabee';
        } else {
            statusEl.classList.add('inactive');
            statusEl.classList.remove('active');
            statusText.textContent = 'Not on Wocabee site';
        }
    } catch (error) {
        statusEl.classList.add('inactive');
        statusText.textContent = 'Unable to check';
    }
}

/**
 * Send message to content script
 */
async function sendToContentScript(message) {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab && tab.id) {
            await chrome.tabs.sendMessage(tab.id, message);
        }
    } catch (error) {
        console.log('Could not send message to content script:', error);
    }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Settings toggles
    document.getElementById('setting-highlight').addEventListener('change', saveSettings);
    document.getElementById('setting-hints').addEventListener('change', saveSettings);
    document.getElementById('setting-auto').addEventListener('change', saveSettings);

    // Toggle panel button
    document.getElementById('btn-toggle-panel').addEventListener('click', async () => {
        await sendToContentScript({ action: 'togglePanel' });
    });

    // Refresh button
    document.getElementById('btn-refresh').addEventListener('click', async () => {
        await sendToContentScript({ action: 'refresh' });
        await loadStats();
    });

    // Export button
    document.getElementById('btn-export').addEventListener('click', async () => {
        try {
            const data = await chrome.storage.local.get(STORAGE_KEYS.wordDatabase);
            const db = data[STORAGE_KEYS.wordDatabase] || '{}';
            
            // Create download
            const blob = new Blob([db], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `wocabee-words-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Export error:', error);
        }
    });

    // Clear database button
    document.getElementById('btn-clear').addEventListener('click', async () => {
        if (confirm('Are you sure you want to clear all saved words?')) {
            try {
                await chrome.storage.local.remove([
                    STORAGE_KEYS.wordDatabase,
                    STORAGE_KEYS.stats
                ]);
                
                document.getElementById('stat-words').textContent = '0';
                document.getElementById('stat-helped').textContent = '0';
                
                await sendToContentScript({ action: 'clearDatabase' });
            } catch (error) {
                console.error('Clear error:', error);
            }
        }
    });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);
