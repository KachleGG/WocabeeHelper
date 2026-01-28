# WocabeeHelper

A browser extension that helps you with Wocabee vocabulary exercises. It automatically indexes words, highlights correct answers in selection exercises, and shows hints for typing exercises.

# The Code is in BETA version so it is not fully functional!!!

> **Disclaimer:** This extension is for educational purposes only. Do NOT show this to your teacher!

## Features

- **Auto Word Indexing** - Automatically learns vocabulary as you browse packages
- **Selection Helper** - Highlights the correct answer in multiple choice exercises
- **Typing Hints** - Shows the correct translation near input fields
- **Auto-Answer Mode** - Can automatically select/type answers (use with caution!)
- **Persistent Storage** - Remembers all learned words across sessions
- **Export/Import** - Export your word database as JSON
- **Beautiful UI** - Draggable control panel with toggleable options
- **Toolbar Button** - Click the extension icon to access all controls

## How to Use

1. Click the **Wocabee Helper** icon in your browser toolbar (next to the extensions button)
2. A popup will appear with all controls:
   - **Toggle Panel** - Show/hide the floating panel on the page
   - **Refresh** - Re-scan the current page
   - **Export DB** - Download your word database
   - **Clear DB** - Delete all saved words
3. Use the toggles to enable/disable features

##  Installation

### Chrome / Edge / Brave

1. Download or clone this repository
2. Go to `chrome://extensions/` (or `edge://extensions/`)
3. Enable **Developer mode** (toggle in top-right)
4. Click **Load unpacked**
5. Select the `extension` folder
6. The extension is now installed!

### Firefox

1. Go to `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on**
3. Select any file in the `extension` folder

## Project Structure

```
WocabeeHelper/
├── manifest.json          # Extension manifest
├── popup/
│   ├── popup.html        # Toolbar popup UI
│   ├── popup.css         # Popup styles
│   └── popup.js          # Popup logic
├── content/
│   ├── main.js           # Main extension logic
│   └── observer.js       # DOM mutation observer
├── utils/
│   ├── config.js         # Configuration & selectors
│   ├── state.js          # State management & word database
│   └── dom.js            # DOM utility functions
├── styles/
│   ├── colors.css        # Color variables
│   └── base.css          # Main styles
└── icons/                # Extension icons
```

## How It Works

1. **Indexing**: When you view vocabulary packages, the extension automatically extracts and stores word pairs
2. **Detection**: It detects when you're in an exercise (selection, typing, game, or test)
3. **Matching**: It finds the current question word and looks up translations in its database
4. **Helping**: Based on exercise type:
   - **Selection**: Highlights the correct answer with a green glow
   - **Typing**: Shows a hint bubble with the correct answer
   - **Games/Tests**: Shows answers in the control panel

## Control Panel Options

- **Auto Highlight**: Automatically highlight correct answers (default: ON)
- **Show Hints**: Display hint tooltips (default: ON)
- **Auto Answer**: Automatically click/type answers (default: OFF ⚠️)

## Customization

Edit `utils/config.js` to:

- Adjust selectors for DOM elements
- Change timing delays
- Enable/disable debug logging

## Notes

- The extension needs to index words first before it can help - browse through your vocabulary packages!
- Selectors may need adjustment if Wocabee updates their website
- Word database is stored locally in browser storage

## License

This project is licensed under the **MIT License**.
