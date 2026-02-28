# InkLift — Obsidian Plugin

Sync AI-transcribed handwritten notes from e-ink tablets (reMarkable, Boox, Supernote) into your Obsidian vault.

## Features

- **Automatic sync** — Notes flow from your tablet to your vault in the background
- **AI OCR** — Google Gemini converts handwriting to searchable text
- **Markdown + frontmatter** — Notes include metadata for Dataview and organization
- **Source images** — Original page images embedded alongside transcribed text

## Installation

### From Obsidian Community Plugin Store (when available)

1. Open Obsidian Settings → Community plugins
2. Disable Safe Mode
3. Browse Community plugins
4. Search for "InkLift" and install

### Manual installation

1. Download the latest release from [GitHub Releases](https://github.com/filipesalvio-code/inklift/releases)
2. Extract `main.js`, `manifest.json`, and `styles.css` (if present) into your vault's `.obsidian/plugins/inklift/` folder
3. Reload Obsidian and enable InkLift in Community plugins

### BRAT (for development builds)

1. Install the [BRAT plugin](https://github.com/TfTHacker/obsidian42-brat)
2. Add this repo: `filipesalvio-code/inklift`
3. BRAT will install the plugin from the repo

## Configuration

1. Enable the plugin in Settings → Community plugins
2. Open InkLift settings (ribbon icon or Settings → InkLift)
3. Enter your InkLift server URL (e.g. `https://inklift.ai` or `http://localhost:8000` for dev)
4. Log in with your InkLift account (email + password)
5. Choose sync interval and vault folder
6. Click **Sync now** to pull your first batch of notes

## Requirements

- An [InkLift](https://inklift.ai) account
- A connected e-ink device (reMarkable supported; more coming)
- Obsidian 1.5.0 or later

## Links

- [InkLift](https://inklift.ai) — Web dashboard and API
- [GitHub](https://github.com/filipesalvio-code/inklift) — Source code
