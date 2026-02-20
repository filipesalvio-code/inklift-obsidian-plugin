# InkLift — Obsidian Plugin

Sync AI-transcribed handwritten notes from e-ink tablets (reMarkable, Boox, Supernote) into your Obsidian vault.

## Features

- **Automatic sync** — Notes flow from your tablet to your vault in the background
- **AI OCR** — Google Gemini converts handwriting to searchable text
- **Markdown + frontmatter** — Notes include metadata for Dataview and organization
- **Source images** — Original page images embedded alongside transcribed text

## Installation

### Manual installation

1. Download the latest release from [GitHub Releases](https://github.com/filipesalvio-code/inklift-obsidian-plugin/releases)
2. Extract `main.js` and `manifest.json` into your vault's `.obsidian/plugins/inklift/` folder
3. Reload Obsidian and enable InkLift in Community plugins

### BRAT (for development builds)

1. Install the [BRAT plugin](https://github.com/TfTHacker/obsidian42-brat)
2. Add this repo: `filipesalvio-code/inklift-obsidian-plugin`
3. Enable InkLift in Community plugins

## Configuration

Open **Settings → InkLift** to configure:

| Setting | Default | Description |
|---------|---------|-------------|
| API URL | `https://inklift.ai` | InkLift server URL |
| Sync folder | `InkLift` | Vault folder for synced notes |
| Sync interval | 15 min | How often to check for new notes |
| Source images | On | Embed original handwriting images |

## Usage

- Click the pencil icon in the ribbon to sync manually
- Or use the command palette: **InkLift: Sync handwritten notes**
- Notes sync automatically on the configured interval

## License

MIT
