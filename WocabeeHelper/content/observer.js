/**
 * WocabeeHelper DOM Observer
 * Watches for DOM changes and triggers appropriate actions
 */

const WocabeeObserver = {
    observer: null,
    debounceTimer: null,
    lastProcessedContent: '',
    lastQuestion: null,        // Track the current question for learning
    isWaitingForResult: false, // Whether we're waiting to learn from a result
    lastProcessedTime: 0,      // Prevent processing too often
    
    /**
     * Initialize the mutation observer
     */
    init() {
        if (this.observer) {
            this.observer.disconnect();
        }
        
        this.observer = new MutationObserver((mutations) => {
            this.handleMutations(mutations);
        });
        
        // Start observing
        this.observer.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true,
            attributes: true,
            attributeFilter: ['class', 'style', 'disabled']
        });
        
        this.log('Observer initialized');
    },

    /**
     * Handle DOM mutations with debouncing
     */
    handleMutations(mutations) {
        // Debounce to avoid processing too frequently
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
            this.processChanges(mutations);
        }, WocabeeConfig.timing.observerDebounce);
    },

    /**
     * Process DOM changes
     */
    processChanges(mutations) {
        // Prevent processing too often (minimum 500ms between processes)
        const now = Date.now();
        if (now - this.lastProcessedTime < 500) {
            return;
        }
        this.lastProcessedTime = now;
        
        // Check if content actually changed significantly
        const currentContent = document.body.innerText.length;
        if (Math.abs(currentContent - (this.lastContentLength || 0)) < 10) {
            return;
        }
        this.lastContentLength = currentContent;
        
        // Detect exercise type
        const exerciseType = WocabeeDom.detectExerciseType();
        
        // Check for feedback/results to learn from
        this.checkForFeedbackAndLearn();
        
        if (exerciseType !== WocabeeState.currentExerciseType) {
            WocabeeState.currentExerciseType = exerciseType;
            this.log('Exercise type changed:', exerciseType);
            this.onExerciseChange(exerciseType);
        }
    },

    /**
     * Called when exercise type changes
     */
    onExerciseChange(type) {
        // Clear previous highlights
        WocabeeDom.clearHighlights();
        
        switch (type) {
            case 'vocabulary':
                this.indexVocabulary();
                break;
            case 'selection':
            case 'typing':
            case 'game':
            case 'test':
                // Trigger helper update
                if (window.WocabeeHelper) {
                    window.WocabeeHelper.processExercise();
                }
                break;
        }
    },

    /**
     * Process current view regardless of change detection
     */
    processCurrentView() {
        const type = WocabeeDom.detectExerciseType();
        
        if (type === 'vocabulary') {
            this.indexVocabulary();
        } else if (type && window.WocabeeHelper) {
            window.WocabeeHelper.processExercise();
        }
    },

    /**
     * Index vocabulary from the current page
     */
    indexVocabulary() {
        const pairs = WocabeeDom.extractWordPairs();
        
        if (pairs.length > 0) {
            const added = WocabeeState.addWords(pairs);
            if (added > 0) {
                this.log(`Indexed ${added} new word pairs`);
                this.showIndexingNotification(added);
            }
        }
    },

    /**
     * Check for feedback elements and learn from them
     * This is the core of continuous learning
     */
    checkForFeedbackAndLearn() {
        const selectors = WocabeeConfig.selectors;
        
        // Try to find the current question
        let currentQuestion = WocabeeDom.findCurrentQuestion();
        
        // Only update if we found a valid new question
        if (currentQuestion && currentQuestion.length > 0 && currentQuestion !== this.lastQuestion) {
            this.lastQuestion = currentQuestion;
            this.isWaitingForResult = true;
            this.log('Current question for learning:', currentQuestion);
        }
        
        // Don't proceed if we don't have a valid question
        if (!this.lastQuestion || this.lastQuestion.length === 0) {
            return;
        }
        
        // Check for correct feedback (user got it right)
        const correctFeedback = WocabeeDom.find(selectors.correctFeedback);
        if (correctFeedback && this.isWaitingForResult) {
            this.learnFromCorrectAnswer();
        }
        
        // Check for incorrect feedback (user got it wrong - learn from correction)
        const incorrectFeedback = WocabeeDom.find(selectors.incorrectFeedback);
        if (incorrectFeedback && this.isWaitingForResult) {
            this.learnFromIncorrectAnswer();
        }
    },

    /**
     * Learn from a correct answer
     * The user selected/typed the right answer, so we can learn from it
     */
    learnFromCorrectAnswer() {
        if (!this.lastQuestion || this.lastQuestion.length === 0) {
            this.log('No valid question to learn from');
            return;
        }
        
        // Find what was the correct answer
        const correctAnswer = this.findCorrectAnswer();
        
        if (correctAnswer && correctAnswer.length > 0) {
            const added = WocabeeState.addWord(this.lastQuestion, correctAnswer);
            if (added) {
                this.log(`Learned from correct: "${this.lastQuestion}" -> "${correctAnswer}"`);
                this.showLearningNotification(this.lastQuestion, correctAnswer, 'correct');
            }
        }
        
        this.isWaitingForResult = false;
    },

    /**
     * Learn from an incorrect answer
     * The user got it wrong, so we extract the correct answer from the correction
     */
    learnFromIncorrectAnswer() {
        if (!this.lastQuestion || this.lastQuestion.length === 0) {
            this.log('No valid question to learn from');
            return;
        }
        
        // Find the revealed/correct answer from the feedback
        const correctAnswer = this.findRevealedAnswer();
        
        if (correctAnswer && correctAnswer.length > 0) {
            const added = WocabeeState.addWord(this.lastQuestion, correctAnswer);
            if (added) {
                this.log(`Learned from correction: "${this.lastQuestion}" -> "${correctAnswer}"`);
                this.showLearningNotification(this.lastQuestion, correctAnswer, 'correction');
            }
        }
        
        this.isWaitingForResult = false;
    },

    /**
     * Find the correct answer from various sources
     */
    findCorrectAnswer() {
        const selectors = WocabeeConfig.selectors;
        
        // Method 1: Check input field value first (most reliable for typing exercises)
        const input = WocabeeDom.findAnswerInput();
        if (input && input.value && input.value.trim().length > 0) {
            const answer = input.value.trim();
            this.log('Found answer from input field:', answer);
            return answer;
        }
        
        // Method 2: Look for highlighted/selected correct option
        const highlightedCorrect = WocabeeDom.find('.wh-correct, .selected.correct, .correct.selected, [class*="correct"][class*="selected"]');
        if (highlightedCorrect) {
            const answer = WocabeeDom.getText(highlightedCorrect);
            this.log('Found answer from highlighted option:', answer);
            return answer;
        }
        
        // Method 3: Look for the clicked/active answer button
        const activeAnswer = WocabeeDom.find('.active, .selected, [aria-selected="true"], .clicked');
        if (activeAnswer) {
            const answer = WocabeeDom.getText(activeAnswer);
            if (answer && !WocabeeDom.isUIText(answer.toLowerCase())) {
                this.log('Found answer from active element:', answer);
                return answer;
            }
        }
        
        // Method 4: Look in success feedback for the answer text
        const successEl = WocabeeDom.find(selectors.correctFeedback);
        if (successEl) {
            // Try to extract just the word, not "Correct!" text
            const text = WocabeeDom.getText(successEl);
            // Filter out common feedback phrases
            const filtered = text.replace(/(correct|right|good|great|excellent|super|✓|✔|!)/gi, '').trim();
            if (filtered && filtered.length > 0 && filtered.length < 100) {
                this.log('Found answer from success feedback:', filtered);
                return filtered;
            }
        }
        
        return null;
    },

    /**
     * Find the revealed correct answer after a wrong attempt
     */
    findRevealedAnswer() {
        const selectors = WocabeeConfig.selectors;
        
        // Method 1: Look for explicit "correct answer" element
        const revealed = WocabeeDom.find(selectors.revealedAnswer);
        if (revealed) {
            return WocabeeDom.getText(revealed);
        }
        
        // Method 2: Look for the correct option that's now highlighted differently
        const correctOption = WocabeeDom.find('.correct:not(.selected), [class*="correct"]:not([class*="in"]), .right-answer, .solution');
        if (correctOption) {
            return WocabeeDom.getText(correctOption);
        }
        
        // Method 3: Parse the error feedback for the correct answer
        const errorEl = WocabeeDom.find(selectors.incorrectFeedback);
        if (errorEl) {
            const text = WocabeeDom.getText(errorEl);
            
            // Look for patterns like "The correct answer is: X" or "Right answer: X"
            const patterns = [
                /correct\s*(?:answer)?(?:\s*is)?[:\s]+(.+)/i,
                /right\s*(?:answer)?(?:\s*is)?[:\s]+(.+)/i,
                /should\s*(?:be|have been)[:\s]+(.+)/i,
                /answer[:\s]+(.+)/i,
                /solution[:\s]+(.+)/i
            ];
            
            for (const pattern of patterns) {
                const match = text.match(pattern);
                if (match && match[1]) {
                    return match[1].trim();
                }
            }
        }
        
        // Method 4: Look for any newly appeared text that could be the answer
        const allOptions = WocabeeDom.findAnswerOptions();
        for (const opt of allOptions) {
            // Check if this option is marked as the correct one
            if (opt.classList.contains('correct') || 
                opt.getAttribute('data-correct') === 'true' ||
                opt.querySelector('.correct, [class*="correct"]')) {
                return WocabeeDom.getText(opt);
            }
        }
        
        return null;
    },

    /**
     * Show notification when learning a word
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
        
        // Hide learning mode indicator and update panel
        if (window.WocabeeHelper) {
            window.WocabeeHelper.hideLearningModeIndicator();
            window.WocabeeHelper.updateStats();
        }
    },

    /**
     * Show notification when words are indexed
     */
    showIndexingNotification(count) {
        // Remove existing notification
        const existing = document.querySelector('.wh-notification');
        if (existing) existing.remove();
        
        const notification = WocabeeDom.create('div', {
            className: 'wh-notification',
            html: `📚 Indexed <strong>${count}</strong> new words! (Total: ${WocabeeState.wordDatabase.size})`
        });
        
        document.body.appendChild(notification);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            notification.classList.add('wh-fade-out');
            setTimeout(() => notification.remove(), 500);
        }, 3000);
    },

    /**
     * Stop observing
     */
    stop() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
        clearTimeout(this.debounceTimer);
        this.log('Observer stopped');
    },

    /**
     * Force reprocess
     */
    reprocess() {
        this.lastProcessedContent = '';
        this.processCurrentView();
    },

    /**
     * Log helper
     */
    log(...args) {
        if (WocabeeConfig.debug) {
            console.log(`%c[${WocabeeConfig.name}:Observer]`, 'color: #FF9800; font-weight: bold;', ...args);
        }
    }
};

// Make it available globally
window.WocabeeObserver = WocabeeObserver;
