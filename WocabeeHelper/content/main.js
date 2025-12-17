/**
 * WocabeeHelper Main Content Script
 * The main logic for helping with Wocabee exercises
 */

const WocabeeHelper = {
    isInitialized: false,
    controlPanel: null,
    
    /**
     * Initialize the helper
     */
    async init() {
        if (this.isInitialized) return;
        
        this.log('Initializing WocabeeHelper...');
        
        // Initialize state
        await WocabeeState.init();
        
        // Create control panel
        this.createControlPanel();
        
        // Start observer
        WocabeeObserver.init();
        
        // Initial processing
        this.processExercise();
        
        // Setup message listener for popup communication
        this.setupMessageListener();
        
        // Mark as initialized
        this.isInitialized = true;
        this.log('WocabeeHelper ready!', WocabeeState.getStats());
        
        // Show welcome message
        this.showNotification('🐝 WocabeeHelper Active!', 'success');
    },

    /**
     * Process the current exercise
     */
    processExercise() {
        const type = WocabeeDom.detectExerciseType();
        
        if (!type) {
            this.log('No exercise detected');
            return;
        }
        
        // Clear previous highlights
        WocabeeDom.clearHighlights();
        
        // Get current question
        const question = WocabeeDom.findCurrentQuestion();
        WocabeeState.currentWord = question;
        
        if (!question) {
            this.log('No question found');
            return;
        }
        
        this.log(`Processing ${type} exercise:`, question);
        
        // Find translation
        const translations = WocabeeState.findTranslation(question);
        
        if (!translations || translations.length === 0) {
            this.log('No translation found for:', question);
            this.updatePanel(`👀 Learning: "${question}" - waiting for answer...`);
            this.showLearningModeIndicator(question);
            return;
        }
        
        this.log('Found translations:', translations);
        
        // Handle based on exercise type
        switch (type) {
            case 'selection':
                this.handleSelectionExercise(translations);
                break;
            case 'typing':
                this.handleTypingExercise(translations);
                break;
            case 'game':
            case 'test':
                this.handleGameExercise(translations);
                break;
        }
    },

    /**
     * Process a word that was spoken via TTS
     * This is called when we detect Wocabee speaking a word
     */
    processSpokenWord(word) {
        this.log('Processing spoken word:', word);
        
        // Update state
        WocabeeState.currentWord = word;
        
        // Try to find translation
        const translations = WocabeeState.findTranslation(word);
        
        if (!translations || translations.length === 0) {
            this.log('No translation for spoken word:', word);
            this.updatePanel(`👂 Heard: "${word}" - waiting for answer...`);
            this.showLearningModeIndicator(word);
            return;
        }
        
        this.log('Found translations for spoken word:', translations);
        
        // Detect exercise type and show answer
        const type = WocabeeDom.detectExerciseType();
        
        if (type === 'typing') {
            this.handleTypingExercise(translations);
        } else if (type === 'selection') {
            this.handleSelectionExercise(translations);
        } else {
            // Just show the answer in the panel
            this.updatePanel(`🔊 "${word}" → ${translations.join(' / ')}`);
        }
    },

    /**
     * Handle selection/multiple choice exercise
     */
    handleSelectionExercise(translations) {
        const options = WocabeeDom.findAnswerOptions();
        let foundMatch = false;
        
        options.forEach(option => {
            const optionText = WocabeeDom.getText(option).toLowerCase();
            
            // Check if this option matches any translation
            const isCorrect = translations.some(t => {
                const translation = t.toLowerCase();
                return optionText === translation || 
                       optionText.includes(translation) || 
                       translation.includes(optionText);
            });
            
            if (isCorrect) {
                // Highlight the correct answer
                WocabeeDom.highlightCorrect(option);
                foundMatch = true;
                
                // Add tooltip with answer
                WocabeeDom.addTooltip(option, '✓ Correct!');
                
                // Auto-click if enabled
                if (WocabeeState.settings.autoAnswer) {
                    setTimeout(() => {
                        WocabeeDom.click(option);
                    }, WocabeeConfig.timing.autoAnswerDelay);
                }
            }
        });
        
        if (foundMatch) {
            WocabeeState.stats.answersHelped++;
            this.updatePanel(`✓ Answer: ${translations[0]}`);
        } else {
            this.updatePanel(`💡 Try: ${translations.join(' / ')}`);
        }
    },

    /**
     * Handle typing/translation exercise
     */
    handleTypingExercise(translations) {
        const input = WocabeeDom.findAnswerInput();
        
        if (!input) {
            this.log('Input field not found');
            return;
        }
        
        // Show hint near input
        const hintText = translations.join(' / ');
        WocabeeDom.showInputHint(input, hintText);
        
        // Update panel
        this.updatePanel(`💡 Answer: ${hintText}`);
        
        // Auto-fill if enabled
        if (WocabeeState.settings.autoAnswer) {
            WocabeeDom.setInputValue(input, translations[0]);
            WocabeeState.stats.answersHelped++;
        }
    },

    /**
     * Handle game exercises
     */
    handleGameExercise(translations) {
        // For games, show the answer in the panel
        const hintText = translations.join(' / ');
        this.updatePanel(`🎮 Answer: ${hintText}`);
        
        // Try to highlight matching elements
        const options = WocabeeDom.findAnswerOptions();
        options.forEach(option => {
            const optionText = WocabeeDom.getText(option).toLowerCase();
            const isCorrect = translations.some(t => 
                optionText.includes(t.toLowerCase()) || 
                t.toLowerCase().includes(optionText)
            );
            
            if (isCorrect) {
                WocabeeDom.highlightCorrect(option);
            }
        });
    },

    /**
     * Show learning mode indicator for unknown words
     */
    showLearningModeIndicator(word) {
        // Remove existing indicator
        const existing = document.querySelector('.wh-learning-indicator');
        if (existing) existing.remove();
        
        const indicator = WocabeeDom.create('div', {
            className: 'wh-learning-indicator',
            html: `
                <div class="wh-learning-icon">👀</div>
                <div class="wh-learning-text">
                    <strong>Learning Mode</strong>
                    <span>Answer this question - I'll remember it!</span>
                </div>
            `
        });
        
        document.body.appendChild(indicator);
        
        // Add pulsing effect to panel
        this.controlPanel?.classList.add('wh-learning-mode');
    },

    /**
     * Remove learning mode indicator
     */
    hideLearningModeIndicator() {
        const indicator = document.querySelector('.wh-learning-indicator');
        if (indicator) {
            indicator.classList.add('wh-fade-out');
            setTimeout(() => indicator.remove(), 500);
        }
        this.controlPanel?.classList.remove('wh-learning-mode');
    },

    /**
     * Create the floating control panel
     */
    createControlPanel() {
        // Remove existing panel
        const existing = document.querySelector('.wh-panel');
        if (existing) existing.remove();
        
        this.controlPanel = WocabeeDom.create('div', {
            className: 'wh-panel',
            html: `
                <div class="wh-panel-header">
                    <span class="wh-panel-title">🐝 WocabeeHelper</span>
                    <button class="wh-panel-toggle" title="Toggle panel">−</button>
                </div>
                <div class="wh-panel-content">
                    <div class="wh-panel-status">Ready</div>
                    <div class="wh-panel-stats"></div>
                    <div class="wh-panel-controls">
                        <label class="wh-toggle">
                            <input type="checkbox" id="wh-auto-highlight" checked>
                            <span>Auto Highlight</span>
                        </label>
                        <label class="wh-toggle">
                            <input type="checkbox" id="wh-show-hints" checked>
                            <span>Show Hints</span>
                        </label>
                        <label class="wh-toggle">
                            <input type="checkbox" id="wh-auto-answer">
                            <span>Auto Answer</span>
                        </label>
                    </div>
                    <div class="wh-panel-buttons">
                        <button class="wh-btn" id="wh-reprocess">🔄 Refresh</button>
                        <button class="wh-btn" id="wh-export">📥 Export</button>
                        <button class="wh-btn wh-btn-danger" id="wh-clear">🗑️ Clear DB</button>
                    </div>
                </div>
            `
        });
        
        document.body.appendChild(this.controlPanel);
        
        // Setup panel interactions
        this.setupPanelInteractions();
        
        // Update stats display
        this.updateStats();
    },

    /**
     * Setup panel button handlers
     */
    setupPanelInteractions() {
        // Toggle panel
        const toggleBtn = this.controlPanel.querySelector('.wh-panel-toggle');
        const content = this.controlPanel.querySelector('.wh-panel-content');
        
        toggleBtn.addEventListener('click', () => {
            content.classList.toggle('wh-collapsed');
            toggleBtn.textContent = content.classList.contains('wh-collapsed') ? '+' : '−';
        });
        
        // Auto highlight toggle
        const autoHighlight = this.controlPanel.querySelector('#wh-auto-highlight');
        autoHighlight.checked = WocabeeState.settings.autoHighlight;
        autoHighlight.addEventListener('change', (e) => {
            WocabeeState.settings.autoHighlight = e.target.checked;
            WocabeeState.saveToStorage();
        });
        
        // Show hints toggle
        const showHints = this.controlPanel.querySelector('#wh-show-hints');
        showHints.checked = WocabeeState.settings.showHints;
        showHints.addEventListener('change', (e) => {
            WocabeeState.settings.showHints = e.target.checked;
            WocabeeState.saveToStorage();
            if (!e.target.checked) {
                WocabeeDom.clearHighlights();
            }
        });
        
        // Auto answer toggle
        const autoAnswer = this.controlPanel.querySelector('#wh-auto-answer');
        autoAnswer.checked = WocabeeState.settings.autoAnswer;
        autoAnswer.addEventListener('change', (e) => {
            WocabeeState.settings.autoAnswer = e.target.checked;
            WocabeeState.saveToStorage();
            if (e.target.checked) {
                this.showNotification('⚠️ Auto-answer enabled!', 'warning');
            }
        });
        
        // Reprocess button
        this.controlPanel.querySelector('#wh-reprocess').addEventListener('click', () => {
            WocabeeObserver.reprocess();
            this.processExercise();
            this.showNotification('🔄 Refreshed!');
        });
        
        // Export button
        this.controlPanel.querySelector('#wh-export').addEventListener('click', () => {
            this.exportDatabase();
        });
        
        // Clear button
        this.controlPanel.querySelector('#wh-clear').addEventListener('click', () => {
            if (confirm('Are you sure you want to clear the word database?')) {
                WocabeeState.clearDatabase();
                this.updateStats();
                this.showNotification('🗑️ Database cleared!', 'warning');
            }
        });
        
        // Make panel draggable
        this.makeDraggable(this.controlPanel);
    },

    /**
     * Make an element draggable
     */
    makeDraggable(element) {
        const header = element.querySelector('.wh-panel-header');
        let isDragging = false;
        let offsetX, offsetY;
        
        header.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('wh-panel-toggle')) return;
            isDragging = true;
            offsetX = e.clientX - element.offsetLeft;
            offsetY = e.clientY - element.offsetTop;
            header.style.cursor = 'grabbing';
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            element.style.left = (e.clientX - offsetX) + 'px';
            element.style.top = (e.clientY - offsetY) + 'px';
            element.style.right = 'auto';
            element.style.bottom = 'auto';
        });
        
        document.addEventListener('mouseup', () => {
            isDragging = false;
            header.style.cursor = 'grab';
        });
    },

    /**
     * Update panel status text
     */
    updatePanel(message) {
        const status = this.controlPanel?.querySelector('.wh-panel-status');
        if (status) {
            status.textContent = message;
        }
        this.updateStats();
    },

    /**
     * Update statistics display
     */
    updateStats() {
        const statsEl = this.controlPanel?.querySelector('.wh-panel-stats');
        if (!statsEl) return;
        
        const stats = WocabeeState.getStats();
        statsEl.innerHTML = `
            📚 Words: ${stats.totalWords} | 
            ✓ Helped: ${stats.answersHelped}
        `;
    },

    /**
     * Export database to file
     */
    exportDatabase() {
        const data = WocabeeState.exportDatabase();
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `wocabee-words-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
        this.showNotification('📥 Database exported!', 'success');
    },

    /**
     * Setup message listener for popup communication
     */
    setupMessageListener() {
        if (typeof chrome !== 'undefined' && chrome.runtime) {
            chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
                this.log('Received message:', message);
                
                switch (message.action) {
                    case 'togglePanel':
                        this.controlPanel?.classList.toggle('wh-hidden');
                        sendResponse({ success: true });
                        break;
                        
                    case 'refresh':
                        WocabeeObserver.reprocess();
                        this.processExercise();
                        sendResponse({ success: true });
                        break;
                        
                    case 'updateSettings':
                        if (message.settings) {
                            WocabeeState.settings = { ...WocabeeState.settings, ...message.settings };
                            this.syncPanelSettings();
                            WocabeeState.saveToStorage();
                        }
                        sendResponse({ success: true });
                        break;
                        
                    case 'clearDatabase':
                        WocabeeState.clearDatabase();
                        this.updateStats();
                        this.showNotification('🗑️ Database cleared!', 'warning');
                        sendResponse({ success: true });
                        break;
                        
                    default:
                        sendResponse({ success: false, error: 'Unknown action' });
                }
                
                return true; // Keep channel open for async response
            });
        }
    },

    /**
     * Sync panel checkboxes with current settings
     */
    syncPanelSettings() {
        const autoHighlight = this.controlPanel?.querySelector('#wh-auto-highlight');
        const showHints = this.controlPanel?.querySelector('#wh-show-hints');
        const autoAnswer = this.controlPanel?.querySelector('#wh-auto-answer');
        
        if (autoHighlight) autoHighlight.checked = WocabeeState.settings.autoHighlight;
        if (showHints) showHints.checked = WocabeeState.settings.showHints;
        if (autoAnswer) autoAnswer.checked = WocabeeState.settings.autoAnswer;
        
        // Apply auto mode styling
        if (WocabeeState.settings.autoAnswer) {
            this.controlPanel?.classList.add('wh-auto-mode');
        } else {
            this.controlPanel?.classList.remove('wh-auto-mode');
        }
    },

    /**
     * Show a notification
     */
    showNotification(message, type = 'info') {
        const existing = document.querySelector('.wh-notification');
        if (existing) existing.remove();
        
        const notification = WocabeeDom.create('div', {
            className: `wh-notification wh-notification-${type}`,
            text: message
        });
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('wh-fade-out');
            setTimeout(() => notification.remove(), 500);
        }, 2500);
    },

    /**
     * Log helper
     */
    log(...args) {
        if (WocabeeConfig.debug) {
            console.log(`%c[${WocabeeConfig.name}]`, 'color: #9C27B0; font-weight: bold;', ...args);
        }
    },

    /**
     * Debug helper - call from console: WocabeeHelper.debug()
     */
    debug() {
        console.log('%c=== WocabeeHelper Debug ===', 'color: #E91E63; font-weight: bold; font-size: 16px;');
        
        // State info
        console.log('State:', {
            isActive: WocabeeState.isActive,
            currentWord: WocabeeState.currentWord,
            exerciseType: WocabeeState.currentExerciseType,
            wordsInDatabase: WocabeeState.wordDatabase.size,
            settings: WocabeeState.settings
        });
        
        // Try to find question
        const question = WocabeeDom.findCurrentQuestion();
        console.log('Current question found:', question);
        
        // Find input
        const input = WocabeeDom.findAnswerInput();
        console.log('Answer input found:', input);
        
        // Find options
        const options = WocabeeDom.findAnswerOptions();
        console.log('Answer options found:', options.length, options.map(o => WocabeeDom.getText(o)));
        
        // Page debug
        WocabeeDom.debugPage();
        
        return 'Debug info logged above';
    }
};

// Make it available globally
window.WocabeeHelper = WocabeeHelper;

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => WocabeeHelper.init());
} else {
    WocabeeHelper.init();
}

// Also reinitialize on page navigation (for SPAs)
let lastUrl = location.href;
new MutationObserver(() => {
    if (location.href !== lastUrl) {
        lastUrl = location.href;
        setTimeout(() => {
            WocabeeObserver.reprocess();
            WocabeeHelper.processExercise();
        }, 500);
    }
}).observe(document.body, { childList: true, subtree: true });
