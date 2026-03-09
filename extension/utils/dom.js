/**
 * WocabeeHelper DOM Utilities
 * All methods target real WocaBee DOM elements
 */

const WocabeeDom = {
    /**
     * Query selector helper
     */
    find(selector, parent = document) {
        try { return parent.querySelector(selector); } catch (e) { return null; }
    },

    /**
     * Query selector all helper
     */
    findAll(selector, parent = document) {
        try { return [...parent.querySelectorAll(selector)]; } catch (e) { return []; }
    },

    /**
     * Get clean text content from element
     */
    getText(element) {
        if (!element) return '';
        return (element.textContent || element.innerText || '').trim();
    },

    /**
     * Create an element with attributes
     */
    create(tag, attributes = {}, children = []) {
        const element = document.createElement(tag);
        Object.entries(attributes).forEach(([key, value]) => {
            if (key === 'className' || key === 'class') element.className = value;
            else if (key === 'style' && typeof value === 'object') Object.assign(element.style, value);
            else if (key.startsWith('on') && typeof value === 'function') element.addEventListener(key.slice(2).toLowerCase(), value);
            else if (key === 'text') element.textContent = value;
            else if (key === 'html') element.innerHTML = value;
            else element.setAttribute(key, value);
        });
        children.forEach(child => {
            if (typeof child === 'string') element.appendChild(document.createTextNode(child));
            else if (child instanceof Node) element.appendChild(child);
        });
        return element;
    },

    /**
     * Highlight an element as the correct answer
     */
    highlightCorrect(element) {
        if (!element) return;
        element.classList.add(WocabeeConfig.classes.highlighted, WocabeeConfig.classes.correct);
    },

    /**
     * Remove all helper highlights
     */
    clearHighlights(parent = document) {
        parent.querySelectorAll(`.${WocabeeConfig.classes.highlighted}`).forEach(el => {
            el.classList.remove(WocabeeConfig.classes.highlighted, WocabeeConfig.classes.correct, WocabeeConfig.classes.hint);
        });
        parent.querySelectorAll(`.${WocabeeConfig.classes.tooltip}`).forEach(t => t.remove());
    },

    /**
     * Show hint text near an input field
     */
    showInputHint(input, hintText) {
        if (!input || !hintText) return null;
        const existingHint = input.parentElement?.querySelector(`.${WocabeeConfig.classes.tooltip}`);
        if (existingHint) existingHint.remove();

        const hint = this.create('div', {
            className: `${WocabeeConfig.classes.tooltip} ${WocabeeConfig.classes.hint}`,
            html: `💡 <strong>${hintText}</strong>`
        });
        if (input.parentElement) {
            input.parentElement.style.position = 'relative';
            input.parentElement.appendChild(hint);
        }
        return hint;
    },

    // ===== WocaBee-specific detection =====

    /**
     * Check if an exercise container is currently visible (display !== 'none')
     */
    isVisible(selector) {
        const el = typeof selector === 'string' ? this.find(selector) : selector;
        if (!el) return false;
        return el.style.display !== 'none' && el.offsetParent !== null;
    },

    /**
     * Detect the current exercise type using WocaBee's specific container IDs
     */
    detectExerciseType() {
        const s = WocabeeConfig.selectors;

        // Check completion first
        if (this.isVisible(s.msgCompleted)) return 'completed';

        // Check each exercise container visibility
        if (this.isVisible(s.intro))                return 'intro';
        if (this.isVisible(s.chooseWord))           return 'chooseWord';
        if (this.isVisible(s.oneOutOfMany))         return 'oneOutOfMany';
        if (this.isVisible(s.translateWord))        return 'translateWord';
        if (this.isVisible(s.completeWord))         return 'completeWord';
        if (this.isVisible(s.pexeso))               return 'pexeso';
        if (this.isVisible(s.findPair))             return 'findPair';
        if (this.isVisible(s.matchPair))            return 'matchPair';
        if (this.isVisible(s.transcribe))           return 'transcribe';
        if (this.isVisible(s.translateFallingWord)) return 'translateFallingWord';
        if (this.isVisible(s.arrangeWords))         return 'arrangeWords';
        if (this.isVisible(s.describePicture))      return 'describePicture';
        if (this.isVisible(s.addMissingWord))       return 'addMissingWord';

        return null;
    },

    /**
     * Find the current question word from the page
     */
    findCurrentQuestion() {
        // #q_word is used for quiz/exercise, #introWord for learning intro
        const quizWord = document.getElementById('q_word');
        if (quizWord) {
            const text = this.getText(quizWord);
            if (text) return text;
        }

        // chooseWord question
        const chWord = document.getElementById('ch_word');
        if (chWord) {
            const text = this.getText(chWord);
            if (text) return text;
        }

        // completeWord question
        const cwQuestion = document.getElementById('completeWordQuestion');
        if (cwQuestion) {
            const text = this.getText(cwQuestion);
            if (text) return text;
        }

        // Falling word
        const fwWord = document.getElementById('tfw_word');
        if (fwWord) {
            const text = this.getText(fwWord);
            if (text) return text;
        }

        // introWord
        const introWord = document.getElementById('introWord');
        if (introWord) {
            const text = this.getText(introWord);
            if (text) return text;
        }

        return null;
    },

    /**
     * Get the correct answer from the hidden #a_word field
     * This is the most reliable source — practice_local.js populates it
     */
    getHiddenAnswer() {
        const el = document.getElementById('a_word');
        if (el && el.value) return el.value.trim();
        return null;
    },

    /**
     * Get the answer type from hidden #a_type field ("word" or "translation")
     */
    getAnswerType() {
        const el = document.getElementById('a_type');
        if (el && el.value) return el.value.trim();
        return null;
    },

    /**
     * Get the current word_id from hidden field
     */
    getCurrentWordId() {
        const el = document.getElementById('word_id');
        if (el && el.value) return el.value.trim();
        return null;
    },

    /**
     * Read all word pairs from the global $locWords JS variable
     * This is the goldmine — all words for the session are here
     */
    getLocWords() {
        try {
            if (typeof $locWords !== 'undefined' && Array.isArray($locWords)) {
                return $locWords;
            }
        } catch (e) {}
        return null;
    },

    /**
     * Find the answer input field for the current visible exercise
     */
    findAnswerInput() {
        const s = WocabeeConfig.selectors;
        // Check each exercise-specific input
        if (this.isVisible(s.translateWord)) return this.find(s.translateWordInput);
        if (this.isVisible(s.transcribe)) return this.find(s.transcribeInput);
        if (this.isVisible(s.translateFallingWord)) return this.find(s.fallingWordInput);
        if (this.isVisible(s.addMissingWord)) return this.find(s.missingWordInput);
        // Fallback
        return this.find('#translateWordAnswer, #transcribeAnswerWord, #translateFallingWordAnswer, #missingWordAnswer');
    },

    /**
     * Find answer option buttons for chooseWord exercise
     */
    findChooseWordOptions() {
        const container = this.find(WocabeeConfig.selectors.chooseWordOptions);
        if (!container) return [];
        return this.findAll('button, .btn', container);
    },

    /**
     * Find answer buttons for oneOutOfMany exercise
     */
    findOneOutOfManyOptions() {
        const container = this.find(WocabeeConfig.selectors.oneOutOfManyWords);
        if (!container) return [];
        return this.findAll('button, .btn', container);
    },

    /**
     * Find pexeso cards
     */
    findPexesoCards() {
        return this.findAll(WocabeeConfig.selectors.pexesoCard);
    },

    /**
     * Find findPair question/answer buttons
     */
    findPairElements() {
        const qContainer = this.find(WocabeeConfig.selectors.findPairQuestions);
        const aContainer = this.find(WocabeeConfig.selectors.findPairAnswers);
        return {
            questions: qContainer ? this.findAll('button, .btn', qContainer) : [],
            answers: aContainer ? this.findAll('button, .btn', aContainer) : []
        };
    },

    /**
     * Find matchPair buttons
     */
    findMatchPairButtons() {
        const container = this.find(WocabeeConfig.selectors.matchPairWords);
        if (!container) return [];
        return this.findAll('button, .btn', container);
    },

    /**
     * Get completeWord characters (the clickable letters)
     */
    findCompleteWordChars() {
        const container = this.find(WocabeeConfig.selectors.completeWordChars);
        if (!container) return [];
        return this.findAll('.char', container);
    },

    /**
     * Get the correct answer revealed after an incorrect submission
     */
    findCorrectWordAnswer() {
        const el = this.find(WocabeeConfig.selectors.correctWordAnswer);
        if (el) return this.getText(el);
        return null;
    },

    /**
     * Check if the correct result is currently showing
     */
    isCorrectResultShown() {
        return this.isVisible(WocabeeConfig.selectors.correctResult);
    },

    /**
     * Check if the incorrect result is currently showing
     */
    isIncorrectResultShown() {
        return this.isVisible(WocabeeConfig.selectors.incorrectResult);
    },

    /**
     * Click an element
     */
    click(element) {
        if (!element) return false;
        try {
            element.click();
            return true;
        } catch (e) {
            try {
                element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
                return true;
            } catch (e2) { return false; }
        }
    },

    /**
     * Set value in an input field (triggers events for jQuery/framework detection)
     */
    setInputValue(input, value) {
        if (!input) return false;
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        nativeInputValueSetter.call(input, value);
        input.setAttribute('value', value);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        input.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
        return true;
    },

    /**
     * Submit an answer by clicking the appropriate submit button
     */
    clickSubmit() {
        const s = WocabeeConfig.selectors;
        const btn = this.find(s.translateWordSubmit) ||
                    this.find(s.completeWordSubmit) ||
                    this.find(s.transcribeSubmit);
        if (btn) { this.click(btn); return true; }
        return false;
    },

    /**
     * Log helper
     */
    log(...args) {
        if (WocabeeConfig.debug) {
            console.log(`%c[${WocabeeConfig.name}:DOM]`, 'color: #2196F3; font-weight: bold;', ...args);
        }
    }
};

window.WocabeeDom = WocabeeDom;
