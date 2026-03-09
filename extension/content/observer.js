/**
 * WocabeeHelper DOM Observer
 * Watches for DOM changes and triggers learning + exercise processing
 */

const WocabeeObserver = {
    observer: null,
    debounceTimer: null,
    lastExerciseType: null,
    lastQuestion: null,
    lastLearnedPair: null,
    locWordsIngested: false,
    checkInterval: null,

    init() {
        if (this.observer) this.observer.disconnect();

        this.observer = new MutationObserver(() => {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = setTimeout(() => this.processChanges(), WocabeeConfig.timing.observerDebounce);
        });

        this.observer.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true,
            attributes: true,
            attributeFilter: ['class', 'style', 'disabled', 'value']
        });

        // Initial ingestion of $locWords + intro elements
        this.tryIngestLocWords();
        this.learnFromIntroElements();

        // Periodic check (catches content changes without mutations)
        this.checkInterval = setInterval(() => {
            this.tryIngestLocWords();
            this.learnFromIntroElements();
            this.learnFromHiddenAnswer();
        }, WocabeeConfig.timing.indexingInterval);

        // On Enter key: capture question, wait for result, learn
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.lastQuestion = WocabeeDom.findCurrentQuestion();
                setTimeout(() => this.afterSubmission(), 600);
            }
        });

        // On click: same flow
        document.addEventListener('click', (e) => {
            // Ignore clicks on our own panel
            if (e.target.closest('.wh-panel, .wh-notification, .wh-learning-indicator')) return;
            this.lastQuestion = WocabeeDom.findCurrentQuestion();
            setTimeout(() => this.afterSubmission(), 600);
        });

        this.log('Observer initialized');
    },

    /**
     * Called after user submits an answer (click or Enter)
     */
    afterSubmission() {
        this.learnFromCorrectWordAnswer();
        this.learnFromIntroElements();
        this.learnFromHiddenAnswer();
        this.lastLearnedPair = null;
        if (window.WocabeeHelper) window.WocabeeHelper.processExercise();
    },

    /**
     * Process DOM changes
     */
    processChanges() {
        this.tryIngestLocWords();
        this.learnFromIntroElements();
        this.learnFromHiddenAnswer();

        const exerciseType = WocabeeDom.detectExerciseType();
        if (exerciseType && exerciseType !== this.lastExerciseType) {
            this.lastExerciseType = exerciseType;
            this.log('Exercise type:', exerciseType);
            if (window.WocabeeHelper) window.WocabeeHelper.processExercise();
        }
    },

    /**
     * Ingest all words from the global $locWords array (the goldmine)
     */
    tryIngestLocWords() {
        if (this.locWordsIngested) return;
        try {
            if (typeof $locWords !== 'undefined' && Array.isArray($locWords) && $locWords.length > 0) {
                const count = WocabeeState.ingestLocWords($locWords);
                if (count > 0) {
                    this.locWordsIngested = true;
                    this.log(`Ingested ${count} pairs from $locWords (${$locWords.length} words)`);
                    if (window.WocabeeHelper) {
                        window.WocabeeHelper.showNotification(`Loaded ${$locWords.length} words!`, 'success');
                        window.WocabeeHelper.updateStats();
                    }
                }
            }
        } catch (e) {}
    },

    /**
     * Learn from #introWord / #introTranslation pair (learning phase)
     */
    learnFromIntroElements() {
        const introWord = document.getElementById('introWord');
        const introTranslation = document.getElementById('introTranslation');
        if (!introWord || !introTranslation) return;

        const word = WocabeeDom.getText(introWord);
        const translation = WocabeeDom.getText(introTranslation);
        if (!word || !translation) return;

        const pairKey = `${word}|${translation}`;
        if (this.lastLearnedPair === pairKey) return;
        this.lastLearnedPair = pairKey;

        const added1 = WocabeeState.addWord(word, translation);
        const added2 = WocabeeState.addWord(translation, word);
        if (added1 || added2) {
            this.log(`Learned intro: "${word}" -> "${translation}"`);
            this.showLearningNotification(word, translation, 'correct');
        }
    },

    /**
     * Learn from the hidden #a_word field (populated by practice_local.js)
     */
    learnFromHiddenAnswer() {
        const answer = WocabeeDom.getHiddenAnswer();
        const question = WocabeeDom.findCurrentQuestion();
        if (!answer || !question) return;

        WocabeeState.addWord(question, answer);
        WocabeeState.addWord(answer, question);
    },

    /**
     * Learn from .correctWordAnswer element (shown after wrong answer)
     */
    learnFromCorrectWordAnswer() {
        const el = document.querySelector('.correctWordAnswer');
        const questionEl = document.querySelector('.correctWordQuestion');
        if (!el) return;

        const correctAnswer = WocabeeDom.getText(el);
        const questionWord = questionEl ? WocabeeDom.getText(questionEl) : this.lastQuestion;

        if (questionWord && correctAnswer) {
            const added1 = WocabeeState.addWord(questionWord, correctAnswer);
            const added2 = WocabeeState.addWord(correctAnswer, questionWord);
            if (added1 || added2) {
                this.log(`Learned from correction: "${questionWord}" -> "${correctAnswer}"`);
                this.showLearningNotification(questionWord, correctAnswer, 'correction');
            }
        }
    },

    /**
     * Show learning notification
     */
    showLearningNotification(question, answer, type) {
        const existing = document.querySelector('.wh-notification');
        if (existing) existing.remove();

        const icon = type === 'correct' ? '✓' : '📝';
        const label = type === 'correct' ? 'Learned' : 'Noted';

        const notification = WocabeeDom.create('div', {
            className: `wh-notification wh-notification-${type === 'correct' ? 'success' : 'info'}`,
            html: `${icon} ${label}: <strong>"${question}"</strong> → <strong>"${answer}"</strong>`
        });
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.classList.add('wh-fade-out');
            setTimeout(() => notification.remove(), 500);
        }, 2500);

        if (window.WocabeeHelper) {
            window.WocabeeHelper.hideLearningModeIndicator();
            window.WocabeeHelper.updateStats();
        }
    },

    reprocess() {
        this.lastExerciseType = null;
        this.lastLearnedPair = null;
        this.locWordsIngested = false;
        this.tryIngestLocWords();
        this.learnFromIntroElements();
        this.learnFromHiddenAnswer();
        const type = WocabeeDom.detectExerciseType();
        if (type && window.WocabeeHelper) window.WocabeeHelper.processExercise();
    },

    stop() {
        if (this.observer) { this.observer.disconnect(); this.observer = null; }
        if (this.checkInterval) { clearInterval(this.checkInterval); this.checkInterval = null; }
        clearTimeout(this.debounceTimer);
    },

    log(...args) {
        if (WocabeeConfig.debug) {
            console.log(`%c[${WocabeeConfig.name}:Observer]`, 'color: #FF9800; font-weight: bold;', ...args);
        }
    }
};

window.WocabeeObserver = WocabeeObserver;
