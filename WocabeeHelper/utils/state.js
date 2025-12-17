/**
 * WocabeeHelper State Management
 * Handles word database, settings, and runtime state
 */

const WocabeeState = {
    // Runtime state
    isActive: false,
    currentExerciseType: null,
    currentWord: null,
    
    // Word database - maps source words to translations
    wordDatabase: new Map(),
    
    // Reverse lookup - maps translations back to source
    reverseDatabase: new Map(),
    
    // Session statistics
    stats: {
        wordsIndexed: 0,
        answersHelped: 0,
        sessionStart: Date.now()
    },

    // User settings
    settings: { ...WocabeeConfig.defaults },

    /**
     * Initialize state from storage
     */
    async init() {
        try {
            await this.loadFromStorage();
            this.isActive = true;
            this.log('State initialized', { 
                wordsInDatabase: this.wordDatabase.size,
                settings: this.settings 
            });
        } catch (error) {
            this.log('Error initializing state:', error);
        }
    },

    /**
     * Load saved data from chrome.storage
     */
    async loadFromStorage() {
        if (typeof chrome !== 'undefined' && chrome.storage) {
            try {
                const data = await chrome.storage.local.get([
                    WocabeeConfig.storage.wordDatabase,
                    WocabeeConfig.storage.settings,
                    WocabeeConfig.storage.stats
                ]);

                // Load word database
                if (data[WocabeeConfig.storage.wordDatabase]) {
                    const savedWords = JSON.parse(data[WocabeeConfig.storage.wordDatabase]);
                    this.wordDatabase = new Map(Object.entries(savedWords));
                    this.rebuildReverseDatabase();
                }

                // Load settings
                if (data[WocabeeConfig.storage.settings]) {
                    this.settings = { 
                        ...WocabeeConfig.defaults, 
                        ...JSON.parse(data[WocabeeConfig.storage.settings]) 
                    };
                }

                // Load stats
                if (data[WocabeeConfig.storage.stats]) {
                    const savedStats = JSON.parse(data[WocabeeConfig.storage.stats]);
                    this.stats.wordsIndexed = savedStats.wordsIndexed || 0;
                    this.stats.answersHelped = savedStats.answersHelped || 0;
                }
            } catch (error) {
                this.log('Storage load error:', error);
            }
        }
    },

    /**
     * Save data to chrome.storage
     */
    async saveToStorage() {
        if (typeof chrome !== 'undefined' && chrome.storage) {
            try {
                const wordDbObject = Object.fromEntries(this.wordDatabase);
                await chrome.storage.local.set({
                    [WocabeeConfig.storage.wordDatabase]: JSON.stringify(wordDbObject),
                    [WocabeeConfig.storage.settings]: JSON.stringify(this.settings),
                    [WocabeeConfig.storage.stats]: JSON.stringify(this.stats)
                });
                this.log('Data saved to storage');
            } catch (error) {
                this.log('Storage save error:', error);
            }
        }
    },

    /**
     * Rebuild reverse lookup database
     */
    rebuildReverseDatabase() {
        this.reverseDatabase.clear();
        for (const [source, targets] of this.wordDatabase) {
            if (Array.isArray(targets)) {
                targets.forEach(target => {
                    if (!this.reverseDatabase.has(target)) {
                        this.reverseDatabase.set(target, []);
                    }
                    this.reverseDatabase.get(target).push(source);
                });
            } else {
                if (!this.reverseDatabase.has(targets)) {
                    this.reverseDatabase.set(targets, []);
                }
                this.reverseDatabase.get(targets).push(source);
            }
        }
    },

    /**
     * Add a word pair to the database
     */
    addWord(source, target) {
        // Validate inputs
        if (!source || !target) return false;
        if (typeof source !== 'string' || typeof target !== 'string') return false;
        
        source = this.normalizeWord(source);
        target = this.normalizeWord(target);
        
        // Must have at least 1 character each
        if (!source || !target || source.length < 1 || target.length < 1) return false;
        
        // Don't add if source equals target
        if (source === target) return false;
        
        // Reject pure numbers or timestamps
        if (/^\d+$/.test(source) || /^\d+$/.test(target)) return false;
        if (/^\d{10,}/.test(source) || /^\d{10,}/.test(target)) return false;
        
        // Reject if too few letters (at least 2 letters required)
        const letterRegex = /[a-zA-ZáčďéěíňóřšťúůýžÁČĎÉĚÍŇÓŘŠŤÚŮÝŽäöüßÄÖÜ]/g;
        const sourceLetters = (source.match(letterRegex) || []).length;
        const targetLetters = (target.match(letterRegex) || []).length;
        if (sourceLetters < 2 || targetLetters < 2) return false;
        
        // Reject common UI words
        const uiWords = ['learning mode', 'wocabee', 'seznam', 'balíků', 'settings', 'menu', 'next', 'back', 'indexed', 'words known'];
        const lowerSource = source.toLowerCase();
        const lowerTarget = target.toLowerCase();
        if (uiWords.some(w => lowerSource.includes(w) || lowerTarget.includes(w))) return false;

        // Add to main database
        if (!this.wordDatabase.has(source)) {
            this.wordDatabase.set(source, []);
        }
        
        const translations = this.wordDatabase.get(source);
        if (!translations.includes(target)) {
            translations.push(target);
            this.stats.wordsIndexed++;
            
            // Add to reverse database
            if (!this.reverseDatabase.has(target)) {
                this.reverseDatabase.set(target, []);
            }
            if (!this.reverseDatabase.get(target).includes(source)) {
                this.reverseDatabase.get(target).push(source);
            }

            this.log(`Added word: "${source}" -> "${target}"`);
            this.saveToStorage();
            return true;
        }
        
        return false;
    },

    /**
     * Add multiple word pairs at once
     */
    addWords(wordPairs) {
        let addedCount = 0;
        wordPairs.forEach(([source, target]) => {
            if (this.addWord(source, target)) {
                addedCount++;
            }
        });
        if (addedCount > 0) {
            this.log(`Indexed ${addedCount} new words`);
        }
        return addedCount;
    },

    /**
     * Find translation for a word
     */
    findTranslation(word) {
        word = this.normalizeWord(word);
        
        // Check direct lookup
        if (this.wordDatabase.has(word)) {
            return this.wordDatabase.get(word);
        }
        
        // Check reverse lookup
        if (this.reverseDatabase.has(word)) {
            return this.reverseDatabase.get(word);
        }
        
        // Try partial matching
        return this.findPartialMatch(word);
    },

    /**
     * Find partial matches for a word
     */
    findPartialMatch(word) {
        const matches = [];
        const lowerWord = word.toLowerCase();
        
        // Search in main database
        for (const [source, targets] of this.wordDatabase) {
            if (source.toLowerCase().includes(lowerWord) || 
                lowerWord.includes(source.toLowerCase())) {
                matches.push(...targets);
            }
        }
        
        // Search in reverse database
        for (const [target, sources] of this.reverseDatabase) {
            if (target.toLowerCase().includes(lowerWord) || 
                lowerWord.includes(target.toLowerCase())) {
                matches.push(...sources);
            }
        }
        
        return matches.length > 0 ? [...new Set(matches)] : null;
    },

    /**
     * Normalize a word for consistent lookup
     */
    normalizeWord(word) {
        if (!word || typeof word !== 'string') return '';
        return word.trim().toLowerCase().replace(/\s+/g, ' ');
    },

    /**
     * Get database statistics
     */
    getStats() {
        return {
            totalWords: this.wordDatabase.size,
            totalTranslations: [...this.wordDatabase.values()].reduce((sum, arr) => sum + arr.length, 0),
            wordsIndexed: this.stats.wordsIndexed,
            answersHelped: this.stats.answersHelped,
            sessionDuration: Date.now() - this.stats.sessionStart
        };
    },

    /**
     * Clear all stored data
     */
    async clearDatabase() {
        this.wordDatabase.clear();
        this.reverseDatabase.clear();
        this.stats.wordsIndexed = 0;
        this.stats.answersHelped = 0;
        await this.saveToStorage();
        this.log('Database cleared');
    },

    /**
     * Export database as JSON
     */
    exportDatabase() {
        return JSON.stringify(Object.fromEntries(this.wordDatabase), null, 2);
    },

    /**
     * Import database from JSON
     */
    importDatabase(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            let imported = 0;
            for (const [source, targets] of Object.entries(data)) {
                const targetArray = Array.isArray(targets) ? targets : [targets];
                targetArray.forEach(target => {
                    if (this.addWord(source, target)) imported++;
                });
            }
            this.log(`Imported ${imported} word pairs`);
            return imported;
        } catch (error) {
            this.log('Import error:', error);
            return 0;
        }
    },

    /**
     * Logging helper
     */
    log(...args) {
        if (WocabeeConfig.debug) {
            console.log(`%c[${WocabeeConfig.name}]`, 'color: #4CAF50; font-weight: bold;', ...args);
        }
    }
};

// Make it available globally
window.WocabeeState = WocabeeState;
