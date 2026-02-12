# letsmeet.link Browser Extension

Chrome Manifest V3 extension for quick meeting scheduling from Gmail, LinkedIn, or any page.

## Features

- **Popup** — View your booking link, copy/share it, see event types, open dashboard
- **Gmail** — "Schedule with letsmeet.link" button in compose windows inserts your booking link
- **LinkedIn** — "Schedule a meeting" button on profile pages opens your booking page
- **Context menu** — Right-click anywhere → "Schedule with letsmeet.link"

## Installation (Developer Mode)

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right)
3. Click **Load unpacked**
4. Select the `browser-extension/` directory
5. The extension icon appears in your toolbar

## Setup

1. Click the extension icon
2. Click ⚙️ Settings
3. Enter your **API Key** (from letsmeet.link settings) and **booking slug** (your username)
4. Click Save

## Usage

- **Copy link**: Click 📋 in the popup
- **Gmail**: Open a compose window → click the blue "📅 letsmeet.link" button
- **LinkedIn**: Visit any profile → click "📅 Schedule a meeting"
- **Anywhere**: Right-click → "Schedule with letsmeet.link"
