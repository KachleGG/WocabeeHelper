/**
 * WocabeeHelper DOM Utilities
 * Helper functions for DOM manipulation and element finding
 */

const WocabeeDom = {
    /**
     * Query selector with multiple fallback selectors
     */
    find(selectors, parent = document) {
        if (typeof selectors === 'string') {
            selectors = selectors.split(',').map(s => s.trim());
        }
        
        for (const selector of selectors) {
            try {
                const element = parent.querySelector(selector);
                if (element) return element;
            } catch (e) {
                // Invalid selector, continue
            }
        }
        return null;
    },

    /**
     * Query selector all with multiple fallback selectors
     */
    findAll(selectors, parent = document) {
        if (typeof selectors === 'string') {
            selectors = selectors.split(',').map(s => s.trim());
        }
        
        const results = [];
        for (const selector of selectors) {
            try {
                const elements = parent.querySelectorAll(selector);
                results.push(...elements);
            } catch (e) {
                // Invalid selector, continue
            }
        }
        return [...new Set(results)];
    },

    /**
     * Get text content from element, cleaned up
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
            if (key === 'className' || key === 'class') {
                element.className = value;
            } else if (key === 'style' && typeof value === 'object') {
                Object.assign(element.style, value);
            } else if (key.startsWith('on') && typeof value === 'function') {
                element.addEventListener(key.slice(2).toLowerCase(), value);
            } else if (key === 'text') {
                element.textContent = value;
            } else if (key === 'html') {
                element.innerHTML = value;
            } else {
                element.setAttribute(key, value);
            }
        });
        
        children.forEach(child => {
            if (typeof child === 'string') {
                element.appendChild(document.createTextNode(child));
            } else if (child instanceof Node) {
                element.appendChild(child);
            }
        });
        
        return element;
    },

    /**
     * Add a tooltip to an element
     */
    addTooltip(element, text) {
        const tooltip = this.create('div', {
            className: WocabeeConfig.classes.tooltip,
            text: text
        });
        
        element.style.position = 'relative';
        element.appendChild(tooltip);
        element.classList.add(WocabeeConfig.classes.hint);
        
        return tooltip;
    },

    /**
     * Highlight an element as the correct answer
     */
    highlightCorrect(element) {
        if (!element) return;
        element.classList.add(WocabeeConfig.classes.highlighted, WocabeeConfig.classes.correct);
    },

    /**
     * Remove all helper highlights from elements
     */
    clearHighlights(parent = document) {
        const highlighted = parent.querySelectorAll(`.${WocabeeConfig.classes.highlighted}`);
        highlighted.forEach(el => {
            el.classList.remove(
                WocabeeConfig.classes.highlighted,
                WocabeeConfig.classes.correct,
                WocabeeConfig.classes.hint
            );
        });
        
        // Remove tooltips
        const tooltips = parent.querySelectorAll(`.${WocabeeConfig.classes.tooltip}`);
        tooltips.forEach(t => t.remove());
    },

    /**
     * Show hint text near an input field
     */
    showInputHint(input, hintText) {
        if (!input || !hintText) return null;
        
        // Remove existing hint
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

    /**
     * Find the current question/word being asked
     * Uses multiple strategies to find the word being tested
     */
    findCurrentQuestion() {
        const selectors = WocabeeConfig.selectors;
        
        // Strategy 1: Look for large/prominent text elements that likely contain the word
        const prominentSelectors = [
            'h1', 'h2', 'h3', 
            '.word', '.question', '.vocab', 
            '[class*="word"]', '[class*="question"]',
            '.big', '.large', '.main', '.primary',
            'strong', 'b', 'em'
        ];
        
        for (const sel of prominentSelectors) {
            try {
                const elements = document.querySelectorAll(sel);
                for (const el of elements) {
                    // Skip if it's an input, button, or has many children (likely a container)
                    if (el.tagName === 'INPUT' || el.tagName === 'BUTTON' || el.tagName === 'A') continue;
                    if (el.children.length > 3) continue;
                    
                    const text = this.getText(el);
                    // Word should be reasonable length (1-100 chars) and not be common UI text
                    if (text && text.length >= 1 && text.length < 100) {
                        const lowerText = text.toLowerCase();
                        // Skip common UI elements
                        if (this.isUIText(lowerText)) continue;
                        
                        // Check if element is visible
                        const rect = el.getBoundingClientRect();
                        if (rect.width > 0 && rect.height > 0) {
                            this.log('Found question via prominent element:', text, el);
                            return text;
                        }
                    }
                }
            } catch (e) {}
        }
        
        // Strategy 2: Look for the largest visible text element in the main content area
        const allText = document.querySelectorAll('*');
        let bestCandidate = null;
        let bestScore = 0;
        
        for (const el of allText) {
            if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE' || el.tagName === 'INPUT' || 
                el.tagName === 'BUTTON' || el.tagName === 'A' || el.tagName === 'HTML' || 
                el.tagName === 'BODY' || el.tagName === 'HEAD') continue;
            
            // Only consider leaf nodes or elements with just text
            if (el.children.length > 2) continue;
            
            const text = this.getText(el);
            if (!text || text.length < 2 || text.length > 100) continue;
            if (this.isUIText(text.toLowerCase())) continue;
            
            const rect = el.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) continue;
            
            // Score based on font size and position
            const style = window.getComputedStyle(el);
            const fontSize = parseFloat(style.fontSize) || 12;
            const isInViewport = rect.top >= 0 && rect.top < window.innerHeight / 2;
            
            let score = fontSize;
            if (isInViewport) score *= 2;
            if (el.tagName.match(/^H[1-6]$/)) score *= 1.5;
            if (el.className && el.className.toString().match(/word|question|vocab/i)) score *= 2;
            
            if (score > bestScore) {
                bestScore = score;
                bestCandidate = text;
            }
        }
        
        if (bestCandidate) {
            this.log('Found question via scoring:', bestCandidate);
            return bestCandidate;
        }
        
        // Strategy 3: Try the configured selectors as fallback
        let question = this.find(selectors.questionWord);
        if (question) {
            const text = this.getText(question);
            if (text && !this.isUIText(text.toLowerCase())) {
                return text;
            }
        }
        
        return null;
    },

    /**
     * Check if text is common UI text (not a vocabulary word)
     */
    isUIText(text) {
        if (!text || typeof text !== 'string') return true;
        
        const lowerText = text.toLowerCase().trim();
        
        // Reject pure numbers or timestamps
        if (/^\d+$/.test(text.trim())) return true;
        if (/^\d{10,}$/.test(text.trim())) return true; // Timestamps
        
        // Reject very short text (less than 2 actual letters)
        const letterCount = (text.match(/[a-zA-ZáčďéěíňóřšťúůýžÁČĎÉĚÍŇÓŘŠŤÚŮÝŽäöüßÄÖÜ]/g) || []).length;
        if (letterCount < 2) return true;
        
        // Reject if it's mostly numbers
        const digitCount = (text.match(/\d/g) || []).length;
        if (digitCount > letterCount) return true;
        
        // UI patterns to reject
        const uiPatterns = [
            'next', 'continue', 'skip', 'submit', 'check', 'ok', 'cancel',
            'correct', 'wrong', 'right', 'error', 'success',
            'loading', 'please wait', 'score', 'points', 'progress',
            'login', 'logout', 'sign', 'register', 'password',
            'menu', 'home', 'back', 'settings', 'help',
            'wocabee', 'copyright', '©', 'cookie', 'privacy',
            'click', 'tap', 'press', 'select', 'choose',
            // Extension's own UI text
            'learning mode', 'wocabeehelper', 'indexed', 'words known',
            'hint', 'answer', 'translation',
            // Czech UI text
            'seznam', 'balíků', 'balík', 'nastavení', 'odhlásit',
            'přihlásit', 'pokračovat', 'zpět', 'další', 'hotovo',
            'správně', 'špatně', 'chyba', 'body', 'skóre'
        ];
        
        // Exact match rejection
        if (uiPatterns.includes(lowerText)) return true;
        
        // Partial match rejection
        return uiPatterns.some(pattern => lowerText.includes(pattern));
    },

    /**
     * Debug function to analyze the page and find elements
     */
    debugPage() {
        console.log('%c[WocabeeHelper] Page Debug Info:', 'color: #E91E63; font-weight: bold; font-size: 14px;');
        
        // Find all text elements
        const textElements = [];
        document.querySelectorAll('*').forEach(el => {
            if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE') return;
            const text = (el.textContent || '').trim();
            if (text && text.length > 1 && text.length < 100 && el.children.length <= 2) {
                const rect = el.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) {
                    const style = window.getComputedStyle(el);
                    textElements.push({
                        text: text.substring(0, 50),
                        tag: el.tagName,
                        class: el.className?.toString().substring(0, 30) || '',
                        id: el.id,
                        fontSize: style.fontSize,
                        top: Math.round(rect.top),
                        visible: rect.top >= 0 && rect.top < window.innerHeight
                    });
                }
            }
        });
        
        // Sort by font size (largest first)
        textElements.sort((a, b) => parseFloat(b.fontSize) - parseFloat(a.fontSize));
        
        console.log('Top text elements by size (visible in viewport):');
        console.table(textElements.filter(e => e.visible).slice(0, 20));
        
        console.log('All large text elements:');
        console.table(textElements.slice(0, 30));
        
        // Find inputs
        const inputs = document.querySelectorAll('input:not([type="hidden"])');
        console.log('Input fields found:', inputs.length);
        inputs.forEach(inp => {
            console.log('  Input:', inp.type, inp.id, inp.className, inp.placeholder);
        });
        
        // Find buttons
        const buttons = document.querySelectorAll('button, .btn, [role="button"]');
        console.log('Buttons found:', buttons.length);
        
        return textElements;
    },

    /**
     * Find all answer options in a selection exercise
     */
    findAnswerOptions() {
        const selectors = WocabeeConfig.selectors;
        const options = this.findAll(selectors.answerOptions);
        
        // Filter to only clickable elements with text
        return options.filter(opt => {
            const text = this.getText(opt);
            return text && text.length > 0 && text.length < 200;
        });
    },

    /**
     * Find the answer input field
     */
    findAnswerInput() {
        return this.find(WocabeeConfig.selectors.answerInput);
    },

    /**
     * Extract word pairs from vocabulary lists
     */
    extractWordPairs() {
        const pairs = [];
        const selectors = WocabeeConfig.selectors;
        
        // Try to find word pair elements
        const wordItems = this.findAll(selectors.wordPair);
        
        wordItems.forEach(item => {
            // Try different structures
            const source = this.find(selectors.sourceWord, item);
            const target = this.find(selectors.targetWord, item);
            
            if (source && target) {
                const sourceText = this.getText(source);
                const targetText = this.getText(target);
                if (sourceText && targetText) {
                    pairs.push([sourceText, targetText]);
                }
            } else {
                // Try to get from table cells or divs
                const cells = item.querySelectorAll('td, .cell, .word');
                if (cells.length >= 2) {
                    const sourceText = this.getText(cells[0]);
                    const targetText = this.getText(cells[1]);
                    if (sourceText && targetText) {
                        pairs.push([sourceText, targetText]);
                    }
                }
            }
        });
        
        return pairs;
    },

    /**
     * Get the exercise type (selection, typing, game, etc.)
     */
    detectExerciseType() {
        const selectors = WocabeeConfig.selectors;
        
        // Check for selection exercise (multiple choice)
        const options = this.findAnswerOptions();
        if (options.length >= 2) {
            return 'selection';
        }
        
        // Check for typing exercise
        const input = this.findAnswerInput();
        if (input) {
            return 'typing';
        }
        
        // Check for game
        if (this.find(selectors.gameContainer)) {
            return 'game';
        }
        
        // Check for test
        if (this.find(selectors.testContainer)) {
            return 'test';
        }
        
        // Check for vocabulary list (for indexing)
        const pairs = this.extractWordPairs();
        if (pairs.length > 0) {
            return 'vocabulary';
        }
        
        return null;
    },

    /**
     * Simulate a click on an element
     */
    click(element) {
        if (!element) return false;
        
        try {
            element.click();
            return true;
        } catch (e) {
            // Try dispatching events manually
            try {
                element.dispatchEvent(new MouseEvent('click', {
                    bubbles: true,
                    cancelable: true,
                    view: window
                }));
                return true;
            } catch (e2) {
                return false;
            }
        }
    },

    /**
     * Set value in an input field (with proper event triggering)
     */
    setInputValue(input, value) {
        if (!input) return false;
        
        // Set the value
        input.value = value;
        input.setAttribute('value', value);
        
        // Trigger input events so React/Vue/Angular detect the change
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        input.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
        
        return true;
    },

    /**
     * Wait for an element to appear
     */
    waitFor(selector, timeout = 5000) {
        return new Promise((resolve, reject) => {
            const element = this.find(selector);
            if (element) {
                resolve(element);
                return;
            }
            
            const observer = new MutationObserver((mutations, obs) => {
                const element = this.find(selector);
                if (element) {
                    obs.disconnect();
                    resolve(element);
                }
            });
            
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
            
            setTimeout(() => {
                observer.disconnect();
                reject(new Error(`Timeout waiting for ${selector}`));
            }, timeout);
        });
    },

    /**
     * Check if we're on an exercise page
     */
    isExercisePage() {
        return !!this.find(WocabeeConfig.selectors.exerciseContainer);
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

// Make it available globally
window.WocabeeDom = WocabeeDom;
