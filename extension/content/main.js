/**
 * WocabeeHelper Main Content Script
 * Handles all WocaBee exercise types with proper selectors
 */

const WocabeeHelper = {
  isInitialized: false,
  controlPanel: null,

  async init() {
    if (this.isInitialized) return;
    this.log('Initializing WocabeeHelper...');

    await WocabeeState.init();
    this.createControlPanel();
    WocabeeObserver.init();
    this.processExercise();
    this.setupMessageListener();

    this.isInitialized = true;
    this.log('WocabeeHelper ready!', WocabeeState.getStats());
    this.showNotification('WocabeeHelper Active!', 'success');
  },

  // ===== MAIN EXERCISE PROCESSOR =====

  processExercise() {
    const type = WocabeeDom.detectExerciseType();
    if (!type) return;

    WocabeeDom.clearHighlights();
    this.hideLearningModeIndicator();

    WocabeeState.currentExerciseType = type;
    this.log('Processing exercise type:', type);

    // The hidden #a_word field always has the correct answer
    const hiddenAnswer = WocabeeDom.getHiddenAnswer();
    const question = WocabeeDom.findCurrentQuestion();
    WocabeeState.currentWord = question;

    // Also try to find translation from our database
    const dbTranslations = question ? WocabeeState.findTranslation(question) : null;

    // Combine: prefer hidden answer, fallback to database
    let answer = hiddenAnswer;
    let allAnswers = [];
    if (hiddenAnswer) allAnswers.push(hiddenAnswer);
    if (dbTranslations) allAnswers.push(...dbTranslations);
    allAnswers = [...new Set(allAnswers)];

    switch (type) {
      case 'intro':
        this.handleIntro();
        break;
      case 'chooseWord':
        this.handleChooseWord(answer, allAnswers);
        break;
      case 'oneOutOfMany':
        this.handleOneOutOfMany(answer, allAnswers);
        break;
      case 'translateWord':
        this.handleTranslateWord(answer, allAnswers);
        break;
      case 'completeWord':
        this.handleCompleteWord(answer, allAnswers);
        break;
      case 'pexeso':
        this.handlePexeso();
        break;
      case 'findPair':
        this.handleFindPair();
        break;
      case 'matchPair':
        this.handleMatchPair();
        break;
      case 'transcribe':
        this.handleTranscribe(answer, allAnswers);
        break;
      case 'translateFallingWord':
        this.handleTranslateFallingWord(answer, allAnswers);
        break;
      case 'arrangeWords':
        this.handleArrangeWords(answer, allAnswers);
        break;
      case 'addMissingWord':
        this.handleAddMissingWord(answer, allAnswers);
        break;
      case 'describePicture':
      case 'choosePicture':
        this.handleDescribePicture(answer, allAnswers);
        break;
      case 'completed':
        this.updatePanel('Exercise completed!');
        break;
      default:
        if (question && allAnswers.length > 0) {
          this.updatePanel(`"${question}" → ${allAnswers.join(' / ')}`);
        }
        break;
    }
  },

  // ===== EXERCISE HANDLERS =====

  handleIntro() {
    const word = WocabeeDom.getText(document.getElementById('introWord'));
    const translation = WocabeeDom.getText(document.getElementById('introTranslation'));
    if (word && translation) {
      this.updatePanel(`Intro: "${word}" → "${translation}"`);
    } else {
      this.updatePanel('Intro mode — learning words...');
    }
  },

  /**
   * Choose Word (multiple choice with buttons)
   */
  handleChooseWord(answer, allAnswers) {
    const options = WocabeeDom.findChooseWordOptions();
    this.highlightMatchingOption(options, answer, allAnswers);
  },

  /**
   * One Out Of Many (grid of options)
   */
  handleOneOutOfMany(answer, allAnswers) {
    const options = WocabeeDom.findOneOutOfManyOptions();
    this.highlightMatchingOption(options, answer, allAnswers);
  },

  /**
   * Highlight the correct option in a list of buttons
   */
  highlightMatchingOption(options, answer, allAnswers) {
    if (!options.length) return;
    let found = false;

    for (const opt of options) {
      const optText = WocabeeDom.getText(opt).trim();
      if (!optText) continue;

      const isCorrect = allAnswers.some(a => {
        const al = a.toLowerCase();
        const ol = optText.toLowerCase();
        return ol === al || ol.includes(al) || al.includes(ol);
      });

      if (isCorrect) {
        WocabeeDom.highlightCorrect(opt);
        found = true;

        if (WocabeeState.settings.autoAnswer) {
          setTimeout(() => WocabeeDom.click(opt), WocabeeConfig.timing.autoAnswerDelay);
        }
      }
    }

    if (found) {
      WocabeeState.stats.answersHelped++;
      this.updatePanel(`Answer: ${answer || allAnswers[0]}`);
    } else if (allAnswers.length > 0) {
      this.updatePanel(`Try: ${allAnswers.join(' / ')}`);
    }
  },

  /**
   * Translate Word (type the translation)
   */
  handleTranslateWord(answer, allAnswers) {
    const input = WocabeeDom.find(WocabeeConfig.selectors.translateWordInput);
    this.handleTypingExercise(input, answer, allAnswers);
  },

  /**
   * Transcribe (listen & type)
   */
  handleTranscribe(answer, allAnswers) {
    const input = WocabeeDom.find(WocabeeConfig.selectors.transcribeInput);
    this.handleTypingExercise(input, answer, allAnswers);
  },

  /**
   * Translate Falling Word (timed typing)
   */
  handleTranslateFallingWord(answer, allAnswers) {
    const input = WocabeeDom.find(WocabeeConfig.selectors.fallingWordInput);
    this.handleTypingExercise(input, answer, allAnswers);
  },

  /**
   * Add Missing Word (fill in blank)
   */
  handleAddMissingWord(answer, allAnswers) {
    const input = WocabeeDom.find(WocabeeConfig.selectors.missingWordInput);
    this.handleTypingExercise(input, answer, allAnswers);
  },

  /**
   * Generic typing exercise handler
   */
  handleTypingExercise(input, answer, allAnswers) {
    const hintText = allAnswers.length > 0 ? allAnswers.join(' / ') : answer;
    if (!hintText) {
      this.updatePanel('Waiting for answer...');
      return;
    }

    if (input && WocabeeState.settings.showHints) {
      WocabeeDom.showInputHint(input, hintText);
    }

    this.updatePanel(`Answer: ${hintText}`);

    if (input && WocabeeState.settings.autoAnswer && answer) {
      setTimeout(() => {
        WocabeeDom.setInputValue(input, answer);
        WocabeeState.stats.answersHelped++;
      }, WocabeeConfig.timing.autoAnswerDelay);
    }
  },

  /**
   * Complete Word (fill in missing letters by clicking characters)
   */
  handleCompleteWord(answer, allAnswers) {
    const hintText = allAnswers.length > 0 ? allAnswers.join(' / ') : answer;
    if (hintText) {
      this.updatePanel(`Answer: ${hintText}`);
    }

    // Highlight the hidden character buttons that need to be clicked
    if (answer) {
      const chars = WocabeeDom.findCompleteWordChars();
      const answerEl = WocabeeDom.find(WocabeeConfig.selectors.completeWordAnswer);
      if (answerEl && chars.length > 0) {
        const partial = WocabeeDom.getText(answerEl);
        // Find which chars are missing (underscores)
        const neededChars = [];
        for (let i = 0; i < answer.length; i++) {
          if (i < partial.length && partial[i] === '_') {
            neededChars.push(answer[i].toLowerCase());
          }
        }

        // Highlight matching char buttons
        for (const charBtn of chars) {
          const ch = WocabeeDom.getText(charBtn).toLowerCase();
          if (neededChars.includes(ch) && charBtn.getAttribute('is_hidden') === '0') {
            WocabeeDom.highlightCorrect(charBtn);
          }
        }

        if (WocabeeState.settings.autoAnswer) {
          this.autoCompleteWord(chars, neededChars);
        }
      }
    }
  },

  /**
   * Auto-click the correct characters for completeWord
   */
  autoCompleteWord(chars, neededChars) {
    const remaining = [...neededChars];
    let delay = WocabeeConfig.timing.autoAnswerDelay;
    for (const charBtn of chars) {
      const ch = WocabeeDom.getText(charBtn).toLowerCase();
      const idx = remaining.indexOf(ch);
      if (idx !== -1 && charBtn.getAttribute('is_hidden') === '0') {
        remaining.splice(idx, 1);
        setTimeout(() => WocabeeDom.click(charBtn), delay);
        delay += 200;
      }
    }
    WocabeeState.stats.answersHelped++;
  },

  /**
   * Pexeso (memory matching game)
   * Shows which cards contain which words using $locWords data
   */
  handlePexeso() {
    const cards = WocabeeDom.findPexesoCards();
    if (!cards.length) return;

    // Build a map of w_id -> word/translation from $locWords
    const wordMap = new Map();
    try {
      if (typeof $locWords !== 'undefined') {
        for (const w of $locWords) {
          wordMap.set(String(w.word_id), { word: w.word, translation: w.translation });
        }
      }
    } catch (e) {}

    // Build match pairs from cards
    const matchInfo = [];
    for (const card of cards) {
      const wId = card.getAttribute('w_id');
      const pexesoId = card.getAttribute('pexeso_id');
      const marked = card.getAttribute('marked');
      if (marked === '1') continue; // Already matched

      const backEl = card.querySelector('.pexesoBack');
      const backText = backEl ? WocabeeDom.getText(backEl).replace(/[◀▶❯❮]/g, '').trim() : '';

      const info = wordMap.get(wId);
      matchInfo.push({
        element: card,
        wId,
        pexesoId,
        backText,
        word: info?.word,
        translation: info?.translation
      });
    }

    // Group by w_id to find matching pairs
    const groups = new Map();
    for (const info of matchInfo) {
      if (!groups.has(info.wId)) groups.set(info.wId, []);
      groups.get(info.wId).push(info);
    }

    // Show pair info in panel
    const pairTexts = [];
    for (const [wId, group] of groups) {
      if (group.length >= 2) {
        const w = group[0].word || '?';
        const t = group[0].translation || '?';
        pairTexts.push(`${w} ↔ ${t}`);
      }
    }

    this.updatePanel(`Pexeso pairs:\n${pairTexts.join('\n')}`);
  },

  /**
   * Find Pair (match words with translations)
   */
  handleFindPair() {
    const { questions, answers } = WocabeeDom.findPairElements();
    if (!questions.length || !answers.length) return;

    // Build matching info
    const pairs = [];
    for (const qBtn of questions) {
      const qText = WocabeeDom.getText(qBtn);
      const translations = WocabeeState.findTranslation(qText);
      if (translations) {
        for (const aBtn of answers) {
          const aText = WocabeeDom.getText(aBtn);
          if (translations.some(t => t.toLowerCase() === aText.toLowerCase())) {
            pairs.push({ q: qText, a: aText, qBtn, aBtn });
          }
        }
      }
    }

    // Highlight matching pairs with same color
    const colors = ['#4CAF50', '#2196F3', '#FF9800', '#E91E63', '#9C27B0'];
    pairs.forEach((pair, i) => {
      const color = colors[i % colors.length];
      pair.qBtn.style.borderLeft = `4px solid ${color}`;
      pair.aBtn.style.borderLeft = `4px solid ${color}`;
      WocabeeDom.highlightCorrect(pair.qBtn);
      WocabeeDom.highlightCorrect(pair.aBtn);
    });

    const pairTexts = pairs.map(p => `${p.q} → ${p.a}`);
    this.updatePanel(`Pairs: ${pairTexts.join(', ')}`);
  },

  /**
   * Match Pair (grid matching)
   */
  handleMatchPair() {
    const buttons = WocabeeDom.findMatchPairButtons();
    if (!buttons.length) return;

    // Group buttons into word/translation pairs using database
    const info = [];
    for (const btn of buttons) {
      const text = WocabeeDom.getText(btn);
      const translations = WocabeeState.findTranslation(text);
      info.push({ text, translations, btn });
    }

    // Find matching buttons
    for (const item of info) {
      if (!item.translations) continue;
      for (const other of info) {
        if (other === item) continue;
        if (item.translations.some(t => t.toLowerCase() === other.text.toLowerCase())) {
          WocabeeDom.highlightCorrect(item.btn);
          WocabeeDom.highlightCorrect(other.btn);
        }
      }
    }

    this.updatePanel('Match pairs highlighted');
  },

  /**
   * Arrange Words (sentence ordering)
   */
  handleArrangeWords(answer, allAnswers) {
    const hintText = allAnswers.length > 0 ? allAnswers.join(' / ') : answer;
    if (hintText) {
      this.updatePanel(`Arrange: ${hintText}`);
    }
  },

  /**
   * Describe Picture / Choose Picture
   */
  handleDescribePicture(answer, allAnswers) {
    const hintText = allAnswers.length > 0 ? allAnswers.join(' / ') : answer;
    if (hintText) {
      this.updatePanel(`Answer: ${hintText}`);
    }
  },

  // ===== UI ELEMENTS =====

  showLearningModeIndicator(word) {
    const existing = document.querySelector('.wh-learning-indicator');
    if (existing) existing.remove();

    const indicator = WocabeeDom.create('div', {
      className: 'wh-learning-indicator',
      html: `<div class="wh-learning-text"><strong>Learning Mode</strong><span>Answer this question — I'll remember it!</span></div>`
    });
    document.body.appendChild(indicator);
    this.controlPanel?.classList.add('wh-learning-mode');
  },

  hideLearningModeIndicator() {
    const indicator = document.querySelector('.wh-learning-indicator');
    if (indicator) {
      indicator.classList.add('wh-fade-out');
      setTimeout(() => indicator.remove(), 500);
    }
    this.controlPanel?.classList.remove('wh-learning-mode');
  },

  createControlPanel() {
    const existing = document.querySelector('.wh-panel');
    if (existing) existing.remove();

    this.controlPanel = WocabeeDom.create('div', {
      className: 'wh-panel',
      html: `
        <div class="wh-panel-header">
          <span class="wh-panel-title">WocabeeHelper</span>
          <button class="wh-panel-toggle" title="Toggle panel">−</button>
        </div>
        <div class="wh-panel-content">
          <div class="wh-panel-status">Ready</div>
          <div class="wh-panel-stats"></div>
          <div class="wh-panel-controls">
            <label class="wh-toggle">
              <input type="checkbox" id="wh-auto-highlight" checked>
              <span>Selection Highlight</span>
            </label>
            <label class="wh-toggle">
              <input type="checkbox" id="wh-show-hints" checked>
              <span>Show Hints</span>
            </label>
            <label class="wh-toggle">
              <input type="checkbox" id="wh-auto-answer">
              <span>Auto-Answer</span>
            </label>
          </div>
          <div style="padding-bottom: 10px;">Database</div>
          <div class="wh-panel-buttons">
            <button class="wh-btn" id="wh-reprocess">Refresh</button>
            <button class="wh-btn" id="wh-export">Export</button>
            <button class="wh-btn" id="wh-import">Import</button>
            <button class="wh-btn wh-btn-danger" id="wh-clear">Clear DB</button>
          </div>
        </div>
      `
    });

    document.body.appendChild(this.controlPanel);
    this.setupPanelInteractions();
    this.updateStats();
  },

  setupPanelInteractions() {
    const toggleBtn = this.controlPanel.querySelector('.wh-panel-toggle');
    const content = this.controlPanel.querySelector('.wh-panel-content');
    toggleBtn.addEventListener('click', () => {
      content.classList.toggle('wh-collapsed');
      toggleBtn.textContent = content.classList.contains('wh-collapsed') ? '+' : '−';
    });

    const autoHighlight = this.controlPanel.querySelector('#wh-auto-highlight');
    autoHighlight.checked = WocabeeState.settings.autoHighlight;
    autoHighlight.addEventListener('change', (e) => {
      WocabeeState.settings.autoHighlight = e.target.checked;
      WocabeeState.saveToStorage();
    });

    const showHints = this.controlPanel.querySelector('#wh-show-hints');
    showHints.checked = WocabeeState.settings.showHints;
    showHints.addEventListener('change', (e) => {
      WocabeeState.settings.showHints = e.target.checked;
      WocabeeState.saveToStorage();
      if (!e.target.checked) WocabeeDom.clearHighlights();
    });

    const autoAnswer = this.controlPanel.querySelector('#wh-auto-answer');
    autoAnswer.checked = WocabeeState.settings.autoAnswer;
    autoAnswer.addEventListener('change', (e) => {
      WocabeeState.settings.autoAnswer = e.target.checked;
      WocabeeState.saveToStorage();
      if (e.target.checked) this.showNotification('Auto-answer enabled!', 'warning');
    });

    this.controlPanel.querySelector('#wh-reprocess').addEventListener('click', () => {
      WocabeeObserver.reprocess();
      this.processExercise();
      this.showNotification('Refreshed!');
    });

    this.controlPanel.querySelector('#wh-export').addEventListener('click', () => this.exportDatabase());
    this.controlPanel.querySelector('#wh-import').addEventListener('click', () => this.importDatabase());
    this.controlPanel.querySelector('#wh-clear').addEventListener('click', () => {
      if (confirm('Are you sure you want to clear the word database?')) {
        WocabeeState.clearDatabase();
        this.updateStats();
        this.showNotification('Database cleared!', 'warning');
      }
    });

    this.makeDraggable(this.controlPanel);
  },

  makeDraggable(element) {
    const header = element.querySelector('.wh-panel-header');
    let isDragging = false, offsetX, offsetY;
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
    });
    document.addEventListener('mouseup', () => {
      isDragging = false;
      header.style.cursor = 'grab';
    });
  },

  updatePanel(message) {
    const status = this.controlPanel?.querySelector('.wh-panel-status');
    if (status) status.textContent = message;
    this.updateStats();
  },

  updateStats() {
    const statsEl = this.controlPanel?.querySelector('.wh-panel-stats');
    if (!statsEl) return;
    const stats = WocabeeState.getStats();
    statsEl.innerHTML = `Words: ${stats.totalWords} | Helped: ${stats.answersHelped}`;
  },

  exportDatabase() {
    const data = WocabeeState.exportDatabase();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wocabee-words-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.showNotification('Database exported!', 'success');
  },

  importDatabase() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const imported = WocabeeState.importDatabase(ev.target.result);
        this.updateStats();
        this.showNotification(`Imported ${imported} words!`, 'success');
      };
      reader.readAsText(file);
    });
    input.click();
  },

  setupMessageListener() {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
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
            sendResponse({ success: true });
            break;
          default:
            sendResponse({ success: false, error: 'Unknown action' });
        }
        return true;
      });
    }
  },

  syncPanelSettings() {
    const autoHighlight = this.controlPanel?.querySelector('#wh-auto-highlight');
    const showHints = this.controlPanel?.querySelector('#wh-show-hints');
    const autoAnswer = this.controlPanel?.querySelector('#wh-auto-answer');
    if (autoHighlight) autoHighlight.checked = WocabeeState.settings.autoHighlight;
    if (showHints) showHints.checked = WocabeeState.settings.showHints;
    if (autoAnswer) autoAnswer.checked = WocabeeState.settings.autoAnswer;
    if (WocabeeState.settings.autoAnswer) {
      this.controlPanel?.classList.add('wh-auto-mode');
    } else {
      this.controlPanel?.classList.remove('wh-auto-mode');
    }
  },

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

  log(...args) {
    if (WocabeeConfig.debug) {
      console.log(`%c[${WocabeeConfig.name}]`, 'color: #9C27B0; font-weight: bold;', ...args);
    }
  }
};

window.WocabeeHelper = WocabeeHelper;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => WocabeeHelper.init());
} else {
  WocabeeHelper.init();
}

// Reinitialize on SPA navigation
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
