/**
 * WocabeeHelper State Management
 * Handles word database, settings, and runtime state
 */

const WocabeeState = {
    isActive: false,
    currentExerciseType: null,
    currentWord: null,

    // Word database: source -> [translations]
    wordDatabase: new Map(),
    // Reverse lookup: translation -> [sources]
    reverseDatabase: new Map(),

    stats: {
        wordsIndexed: 0,
        answersHelped: 0,
        sessionStart: Date.now()
    },

    settings: {},

    async init() {
        this.settings = { ...WocabeeConfig.defaults };
        try {
            await this.loadFromStorage();
            this.isActive = true;
            this.log('State initialized', { wordsInDatabase: this.wordDatabase.size });
        } catch (error) {
            this.log('Error initializing state:', error);
        }
    },

    async loadFromStorage() {
        if (typeof chrome !== 'undefined' && chrome.storage) {
            try {
                const data = await chrome.storage.local.get([
                    WocabeeConfig.storage.wordDatabase,
                    WocabeeConfig.storage.settings,
                    WocabeeConfig.storage.stats
                ]);
                if (data[WocabeeConfig.storage.wordDatabase]) {
                    const savedWords = JSON.parse(data[WocabeeConfig.storage.wordDatabase]);
                    this.wordDatabase = new Map(Object.entries(savedWords));
                    this.rebuildReverseDatabase();
                }
                if (data[WocabeeConfig.storage.settings]) {
                    this.settings = { ...WocabeeConfig.defaults, ...JSON.parse(data[WocabeeConfig.storage.settings]) };
                }
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

    async saveToStorage() {
        if (typeof chrome !== 'undefined' && chrome.storage) {
            try {
                const wordDbObject = Object.fromEntries(this.wordDatabase);
                await chrome.storage.local.set({
                    [WocabeeConfig.storage.wordDatabase]: JSON.stringify(wordDbObject),
                    [WocabeeConfig.storage.settings]: JSON.stringify(this.settings),
                    [WocabeeConfig.storage.stats]: JSON.stringify(this.stats)
                });
            } catch (error) {
                this.log('Storage save error:', error);
            }
        }
    },

    rebuildReverseDatabase() {
        this.reverseDatabase.clear();
        for (const [source, targets] of this.wordDatabase) {
            const arr = Array.isArray(targets) ? targets : [targets];
            arr.forEach(target => {
                const lk = target.toLowerCase();
                if (!this.reverseDatabase.has(lk)) this.reverseDatabase.set(lk, []);
                const list = this.reverseDatabase.get(lk);
                if (!list.some(s => s.toLowerCase() === source.toLowerCase())) list.push(source);
            });
        }
    },

    /**
     * Ingest all words from $locWords into the database
     */
    ingestLocWords(locWords) {
        if (!Array.isArray(locWords)) return 0;
        let count = 0;
        for (const w of locWords) {
            if (w.word && w.translation) {
                if (this.addWord(w.word, w.translation)) count++;
                // Also add reverse so both directions work
                if (this.addWord(w.translation, w.word)) count++;
            }
        }
        if (count > 0) this.log(`Ingested ${count} word pairs from $locWords`);
        return count;
    },

    /**
     * Find the translation for a word from $locWords by word_id
     */
    findByWordId(wordId) {
        try {
            if (typeof $locWords !== 'undefined' && Array.isArray($locWords)) {
                const entry = $locWords.find(w => String(w.word_id) === String(wordId));
                if (entry) return { word: entry.word, translation: entry.translation };
            }
        } catch (e) {}
        return null;
    },

    addWord(source, target) {
        if (!source || !target) return false;
        if (typeof source !== 'string' || typeof target !== 'string') return false;
        source = source.trim().replace(/\s+/g, ' ');
        target = target.trim().replace(/\s+/g, ' ');
        if (!source || !target || source.length < 1 || target.length < 1) return false;
        if (source.toLowerCase() === target.toLowerCase()) return false;
        if (/^\d+$/.test(source) || /^\d+$/.test(target)) return false;

        const lowerSource = source.toLowerCase();

        // Case-insensitive key lookup
        let existingKey = null;
        for (const key of this.wordDatabase.keys()) {
            if (key.toLowerCase() === lowerSource) { existingKey = key; break; }
        }

        const dbKey = existingKey || source;
        if (!this.wordDatabase.has(dbKey)) this.wordDatabase.set(dbKey, []);

        const translations = this.wordDatabase.get(dbKey);
        const lowerTarget = target.toLowerCase();
        if (translations.some(t => t.toLowerCase() === lowerTarget)) return false;

        translations.push(target);
        this.stats.wordsIndexed++;

        // Reverse database
        if (!this.reverseDatabase.has(lowerTarget)) this.reverseDatabase.set(lowerTarget, []);
        const reverseSources = this.reverseDatabase.get(lowerTarget);
        if (!reverseSources.some(s => s.toLowerCase() === lowerSource)) reverseSources.push(dbKey);

        this.saveToStorage();
        return true;
    },

    addWords(wordPairs) {
        let count = 0;
        wordPairs.forEach(([s, t]) => { if (this.addWord(s, t)) count++; });
        return count;
    },

    findTranslation(word) {
        if (!word) return null;
        const lookup = word.trim().toLowerCase();

        // Direct lookup
        for (const [key, translations] of this.wordDatabase) {
            if (key.toLowerCase() === lookup) return translations;
        }
        // Reverse lookup
        for (const [key, sources] of this.reverseDatabase) {
            if (key === lookup) return sources;
        }
        return null;
    },

    getStats() {
        return {
            totalWords: this.wordDatabase.size,
            wordsIndexed: this.stats.wordsIndexed,
            answersHelped: this.stats.answersHelped,
            sessionDuration: Date.now() - this.stats.sessionStart
        };
    },

    async clearDatabase() {
        this.wordDatabase.clear();
        this.reverseDatabase.clear();
        this.stats.wordsIndexed = 0;
        this.stats.answersHelped = 0;
        await this.saveToStorage();
    },

    exportDatabase() {
        return JSON.stringify(Object.fromEntries(this.wordDatabase), null, 2);
    },

    importDatabase(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            let imported = 0;
            for (const [source, targets] of Object.entries(data)) {
                const arr = Array.isArray(targets) ? targets : [targets];
                arr.forEach(t => { if (this.addWord(source, t)) imported++; });
            }
            return imported;
        } catch (error) {
            this.log('Import error:', error);
            return 0;
        }
    },

    log(...args) {
        if (WocabeeConfig.debug) {
            console.log(`%c[${WocabeeConfig.name}]`, 'color: #4CAF50; font-weight: bold;', ...args);
        }
    }
};

window.WocabeeState = WocabeeState;
