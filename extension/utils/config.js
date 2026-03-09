/**
 * WocabeeHelper Configuration
 * All selectors target actual WocaBee DOM elements
 */

const WocabeeConfig = {
    name: 'WocabeeHelper',
    version: '1.0.0',
    debug: true,

    // WocaBee-specific selectors (from real DOM analysis)
    selectors: {
        // Word display
        introWord: '#introWord',
        introTranslation: '#introTranslation',
        quizWord: '#q_word',
        quizNote: '#q_note',

        // Hidden fields populated by practice_local.js with answer data
        hiddenAnswer: '#a_word',
        hiddenWordId: '#word_id',
        hiddenAnswerType: '#a_type',
        hiddenMyAnswer: '#my_a_word',

        // Exercise containers (each type has a unique ID)
        intro: '#intro',
        translateWord: '#translateWord',
        completeWord: '#completeWord',
        chooseWord: '#chooseWord',
        pexeso: '#pexeso',
        findPair: '#findPair',
        oneOutOfMany: '#oneOutOfMany',
        matchPair: '#matchPair',
        transcribe: '#transcribe',
        translateFallingWord: '#translateFallingWord',
        arrangeWords: '#arrangeWords',
        describePicture: '#describePicture',
        addMissingWord: '#addMissingWord',

        // Translate Word exercise
        translateWordInput: '#translateWordAnswer',
        translateWordSubmit: '#translateWordSubmitBtn',

        // Complete Word exercise
        completeWordQuestion: '#completeWordQuestion',
        completeWordAnswer: '#completeWordAnswer',
        completeWordChars: '#characters',
        completeWordSubmit: '#completeWordSubmitBtn',
        completeWordRollback: '#rollbackBtn',

        // Choose Word exercise (multiple choice)
        chooseWordQuestion: '#ch_word',
        chooseWordOptions: '#chooseWords',

        // Pexeso (memory matching)
        pexesoQuestionWords: '#pq_words',
        pexesoAnswerWords: '#pa_words',
        pexesoCard: '.pexesoCardWrapper',
        pexesoFront: '.pexesoFront',
        pexesoBack: '.pexesoBack',

        // Find Pair exercise
        findPairQuestions: '#q_words',
        findPairAnswers: '#a_words',

        // One Out Of Many
        oneOutOfManyWords: '#oneOutOfManyWords',

        // Match Pair
        matchPairWords: '#matchPairWords',

        // Transcribe (listen & type)
        transcribeInput: '#transcribeAnswerWord',
        transcribeSubmit: '#transcribeSubmitBtn',
        transcribeSkip: '#transcribeSkipBtn',

        // Translate Falling Word
        fallingWord: '#tfw_word',
        fallingWordInput: '#translateFallingWordAnswer',

        // Arrange Words
        arrangeSentence: '#def-lang-sentence',
        sortableWords: '#sortableWords',

        // Add Missing Word
        missingWordInput: '#missingWordAnswer',

        // Feedback / result containers
        correctResult: '#correct',
        incorrectResult: '#incorrect',
        correctWordQuestion: '.correctWordQuestion',
        correctWordAnswer: '.correctWordAnswer',

        // Progress
        progressBar: '#progressBar',
        progressValue: '#progressValue',

        // Intro navigation
        introNext: '#introNext',
        introIndex: '#introIndex',
        introWordCount: '#introWordCount',

        // Pictures
        picturesContainer: '#pictures',
        pictureThumbnail: '#pictureThumbnail',

        // Helper keyboard
        helperKeyboard: '.helperKeyboard',
        keyboardChar: '.keyboardChar',

        // Stage / completion
        halfStageReached: '#halfStageReached',
        msgCompleted: '#msgCompleted',
        problemWords: '#problem-words'
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
        observerDebounce: 150,
        highlightDelay: 50,
        autoAnswerDelay: 600,
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

window.WocabeeConfig = WocabeeConfig;

if (WocabeeConfig.debug) {
    console.log(`%c[${WocabeeConfig.name}] Config loaded v${WocabeeConfig.version}`, 'color: #4CAF50; font-weight: bold;');
}
