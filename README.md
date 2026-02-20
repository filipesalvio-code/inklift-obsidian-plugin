# InkLift — Obsidian Plugin

Sync AI-transcribed handwritten notes from e-ink tablets (reMarkable, Boox, Supernote) into your Obsidian vault.

## Features

- **Automatic sync** — Notes flow from your tablet to your vault in the background
- - **AI OCR** — Google Gemini converts handwriting to searchable text
  - - **Markdown + frontmatter** — Notes include metadata for Dataview and organization
    - - **Source images** — Original page images embedded alongside transcribed text
     
      - ## Installation
     
      - ### Manual installation
     
      - 1. Download the latest release from [GitHub Releases](https://github.com/filipesalvio-code/inklift-obsidian-plugin/releases)
        2. 2. Extract `main.js` and `manifest.json` into your vault's `.obsidian/plugins/inklift/` folder
           3. 3. Reload Obsidian and enable InkLift in Community plugins
             
              4. ### BRAT (for development builds)
             
              5. 1. Install the [BRAT plugin](https://github.com/TfTHacker/obsidian42-brat)
                 2. 2. Add this repo: `filipesalvio-code/inklift-obsidian-plugin`
                    3. 3. BRAT will install the plugin from the repo
                      
                       4. ## Configuration
                      
                       5. 1. Enable the plugin in Settings → Community plugins
                          2. 2. Open InkLift settings (ribbon icon or Settings → InkLift)
                             3. 3. Enter your InkLift server URL (e.g. `https://inklift.ai`)
                                4. 4. Log in with your InkLift account (email + password)
                                   5. 5. Choose sync interval and vault folder
                                      6. 6. Click **Sync now** to pull your first batch of notes
                                        
                                         7. ## Requirements
                                        
                                         8. - An [InkLift](https://inklift.ai) account
                                            - - A connected e-ink device (reMarkable supported; more coming)
                                              - - Obsidian 1.5.0 or later
                                               
                                                - ## Development
                                               
                                                - ```bash
                                                  npm install
                                                  npm run dev    # watch mode
                                                  npm run build  # production build
                                                  ```

                                                  ## Links

                                                  - [InkLift](https://inklift.ai) — Web dashboard and API
                                                  - - [GitHub](https://github.com/filipesalvio-code/inklift-obsidian-plugin) — Source code
