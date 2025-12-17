/**
 * WocabeeHelper Configuration
 * Contains all selectors, settings, and constants
 */

const WocabeeConfig = {
    // Extension info
    name: 'WocabeeHelper',
    version: '1.0.0',

    // Debug mode - set to true for console logs
    debug: true,

    // Selectors for Wocabee elements
    selectors: {
        // Main app container
        appContainer: '#app, .app-container, [data-app], #content, .content, main, body',
        
        // Exercise containers
        exerciseContainer: '.exercise, .practice, .task, [class*="exercise"], [class*="practice"], [class*="task"], #practice, form, .container',
        
        // Question/Word display - very broad to catch Wocabee's word display
        questionWord: '.word, .question, h1, h2, h3, .big, .large, .main, [class*="word"]:not(input):not(button):not([class*="password"])',
        currentWord: '.current, .active, .highlight, .selected',
        
        // Multiple choice / Selection answers
        answerOptions: '.answer, .choice, .option, .btn, button:not([type="submit"]), [class*="answer"], [class*="choice"], [class*="option"]',
        answerButton: 'button, .btn, [role="button"], a.btn',
        
        // Text input for translation
        answerInput: 'input[type="text"], input[type="search"], input:not([type="hidden"]):not([type="submit"]):not([type="checkbox"]):not([type="radio"]):not([type="password"]), textarea, #answer, [name*="answer"], [id*="answer"]',
        
        // Feedback elements
        correctFeedback: '.correct, .success, .right, .good, .green, [class*="correct"], [class*="success"], [class*="right"], [class*="good"]',
        incorrectFeedback: '.incorrect, .wrong, .error, .bad, .red, [class*="incorrect"], [class*="wrong"], [class*="error"], [class*="bad"]',
        
        // Correct answer reveal (shown after wrong answer)
        revealedAnswer: '.correct-answer, .right-answer, .solution, .reveal, .show-answer, [class*="solution"], [class*="reveal"], [class*="correct-answer"]',
        
        // Word pairs/vocabulary list
        wordPair: '.word-pair, .vocabulary-item, .vocab-item, .pair, tr, li, .row, .item',
        sourceWord: '.source, .original, .from, .left, td:first-child, span:first-child',
        targetWord: '.target, .translation, .to, .right, td:last-child, span:last-child',
        
        // Package/lesson containers
        packageList: '.package-list, .lesson-list, .vocab-list, .packages, .lessons, ul, table',
        packageItem: '.package-item, .lesson-item, .vocab-item, li, tr, .item',
        
        // Navigation
        nextButton: '.next, .continue, .skip, .forward, [class*="next"], [class*="continue"]',
        submitButton: '.submit, .check, .confirm, .ok, button[type="submit"], [class*="submit"], [class*="check"]',
        
        // Score/progress
        scoreDisplay: '.score, .points, .progress, .result, [class*="score"], [class*="progress"], [class*="points"]',
        
        // Game modes
        gameContainer: '.game, [class*="game"], #game',
        testContainer: '.test, .exam, .quiz, [class*="test"], [class*="exam"], [class*="quiz"]'
    },

    // CSS classes for highlighting
    classes: {
        helper: 'wocabee-helper',
        highlighted: 'wh-highlighted',
        correct: 'wh-correct',
        hint: 'wh-hint',
        tooltip: 'wh-tooltip',
        active: 'wh-active',
        indexed: 'wh-indexed',
        autoMode: 'wh-auto-mode'
    },

    // Storage keys
    storage: {
        wordDatabase: 'wh_word_database',
        settings: 'wh_settings',
        stats: 'wh_stats'
    },

    // Timing settings (in ms)
    timing: {
        observerDebounce: 100,
        highlightDelay: 50,
        autoAnswerDelay: 500,
        indexingInterval: 2000
    },

    // Default settings
    defaults: {
        autoHighlight: true,
        showHints: true,
        autoAnswer: false,
        collectWords: true,
        showTooltips: true
    }
};

// Make it available globally
window.WocabeeConfig = WocabeeConfig;

// Log initialization
if (WocabeeConfig.debug) {
    console.log(`%c[${WocabeeConfig.name}] Config loaded v${WocabeeConfig.version}`, 'color: #4CAF50; font-weight: bold;');
}
