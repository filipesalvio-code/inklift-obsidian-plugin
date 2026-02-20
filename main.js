var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => InkLiftPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");

// src/api.ts
var DEFAULT_BASE = "http://localhost:8000";
var InkLiftAPI = class {
  baseUrl;
  accessToken = null;
  refreshToken = null;
  /** Called when tokens are refreshed, so the plugin can persist them. */
  onTokenRefresh = null;
  constructor(baseUrl = DEFAULT_BASE) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }
  setTokens(access, refresh) {
    this.accessToken = access;
    this.refreshToken = refresh;
  }
  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
  }
  isAuthenticated() {
    return !!this.accessToken;
  }
  async request(method, path, options) {
    const url = `${this.baseUrl}${path}`;
    const headers = {
      "Content-Type": "application/json",
      ...options?.headers
    };
    if (!options?.skipAuth && this.accessToken) {
      headers["Authorization"] = `Bearer ${this.accessToken}`;
    }
    const init = { method, headers };
    if (options?.body) {
      init.body = JSON.stringify(options.body);
    }
    const res = await fetch(url, init);
    if (res.status === 401 && this.refreshToken && !options?.skipAuth) {
      const refreshed = await this.refresh();
      if (refreshed) {
        return this.request(method, path, options);
      }
    }
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`API ${method} ${path}: ${res.status} \u2014 ${text}`);
    }
    const contentType = res.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      return res.json();
    }
    return res.text();
  }
  async login(email, password) {
    const data = await this.request("POST", "/api/auth/login", {
      body: { email, password },
      skipAuth: true
    });
    this.setTokens(data.access_token, data.refresh_token);
    this.onTokenRefresh?.(data.access_token, data.refresh_token);
    return data;
  }
  async refresh() {
    if (!this.refreshToken) return false;
    try {
      const data = await this.request("POST", "/api/auth/refresh", {
        body: { refresh_token: this.refreshToken },
        skipAuth: true
      });
      this.setTokens(data.access_token, data.refresh_token);
      this.onTokenRefresh?.(data.access_token, data.refresh_token);
      return true;
    } catch {
      this.clearTokens();
      return false;
    }
  }
  async getSyncChanges(since) {
    const qs = since ? `?since=${encodeURIComponent(since)}` : "";
    return this.request("GET", `/api/sync/changes${qs}`);
  }
  async getSyncStatus() {
    return this.request("GET", "/api/sync/status");
  }
  getBaseUrl() {
    return this.baseUrl;
  }
  getAccessToken() {
    return this.accessToken;
  }
};

// src/sync.ts
var STORAGE_KEY_LAST_SYNC = "inklift-last-sync";
var SyncEngine = class {
  constructor(app, api, syncFolder, includeSourceImages) {
    this.app = app;
    this.api = api;
    this.syncFolder = syncFolder;
    this.includeSourceImages = includeSourceImages;
  }
  getLastSync() {
    return this.app.loadLocalStorage(STORAGE_KEY_LAST_SYNC);
  }
  setLastSync(iso) {
    this.app.saveLocalStorage(STORAGE_KEY_LAST_SYNC, iso);
  }
  async run() {
    const since = this.getLastSync();
    const response = await this.api.getSyncChanges(since);
    const errors = [];
    let synced = 0;
    let conflicts = 0;
    for (const note of response.notes) {
      try {
        const result = await this.writeNoteToVault(note);
        if (result === "conflict") {
          conflicts++;
        } else if (result !== "skipped") {
          synced++;
        }
      } catch (e) {
        errors.push(`${note.notebook_name} p${note.page_number}: ${String(e)}`);
      }
    }
    this.setLastSync(response.server_time);
    return { synced, conflicts, errors };
  }
  async writeNoteToVault(note) {
    const folder = this.syncFolder.replace(/^\/|\/$/g, "") || "InkLift";
    const safeName = this.sanitizeFilename(note.notebook_name);
    const fileName = `${safeName} - Page ${note.page_number + 1}.md`;
    const path = folder ? `${folder}/${fileName}` : fileName;
    if (this.includeSourceImages && note.source_image_path) {
      await this.downloadSourceImage(note, folder);
    }
    const content = note.markdown;
    const existing = this.app.vault.getAbstractFileByPath(path);
    if (existing instanceof TFile) {
      const existingContent = await this.app.vault.read(existing);
      const lastServerUpdate = this.extractFrontmatterField(
        existingContent,
        "inklift_server_updated_at"
      );
      if (lastServerUpdate && note.server_updated_at && lastServerUpdate === note.server_updated_at) {
        return "skipped";
      }
      const existingBody = this.stripFrontmatter(existingContent);
      const newBody = this.stripFrontmatter(content);
      if (existingBody !== newBody && existingBody.trim() !== "") {
        const dateStr = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
        const conflictPath = path.replace(
          ".md",
          ` (InkLift conflict ${dateStr}).md`
        );
        const conflictExists = this.app.vault.getAbstractFileByPath(conflictPath);
        if (!conflictExists) {
          const dir = this.app.vault.getAbstractFileByPath(folder);
          if (!dir) {
            await this.app.vault.createFolder(folder);
          }
          await this.app.vault.create(conflictPath, content);
        }
        return "conflict";
      }
      await this.app.vault.modify(existing, content);
      return "updated";
    } else {
      const dir = this.app.vault.getAbstractFileByPath(folder);
      if (!dir) {
        await this.app.vault.createFolder(folder);
      }
      await this.app.vault.create(path, content);
      return "created";
    }
  }
  /** Extract a value from YAML frontmatter by field name. */
  extractFrontmatterField(content, field) {
    const match = content.match(new RegExp(`^${field}:\\s*(.+)$`, "m"));
    return match ? match[1].trim().replace(/^['"]|['"]$/g, "") : null;
  }
  /** Strip YAML frontmatter, returning only the body content. */
  stripFrontmatter(content) {
    const match = content.match(/^---\n[\s\S]*?\n---\n([\s\S]*)$/);
    return match ? match[1].trim() : content.trim();
  }
  sanitizeFilename(name) {
    return name.replace(/[<>:"\/\\|?*]/g, "_").trim() || "Untitled";
  }
  async downloadSourceImage(note, folder) {
    if (!note.source_image_path) return;
    const token = this.api.getAccessToken();
    if (!token) return;
    const basename = note.source_image_path.split("/").pop() ?? "source.png";
    const url = `${this.api.getBaseUrl()}/api/sync/image/${note.page_id}`;
    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const imagePath = folder ? `${folder}/${basename}` : basename;
      const arr = await blob.arrayBuffer();
      await this.app.vault.createBinary(imagePath, new Uint8Array(arr));
    } catch {
    }
  }
};

// src/main.ts
var DEFAULT_SETTINGS = {
  apiUrl: "http://localhost:8000",
  accessToken: "",
  refreshToken: "",
  syncFolder: "InkLift",
  syncIntervalMinutes: 15,
  includeSourceImages: true
};
var InkLiftPlugin = class extends import_obsidian.Plugin {
  settings;
  syncInterval = null;
  api = new InkLiftAPI();
  async onload() {
    await this.loadSettings();
    this.api = new InkLiftAPI(this.settings.apiUrl);
    this.api.onTokenRefresh = (access, refresh) => {
      this.settings.accessToken = access;
      this.settings.refreshToken = refresh;
      this.saveSettings();
    };
    if (this.settings.accessToken && this.settings.refreshToken) {
      this.api.setTokens(this.settings.accessToken, this.settings.refreshToken);
    }
    this.addSettingTab(new InkLiftSettingTab(this.app, this));
    this.addRibbonIcon("pencil", "InkLift: Sync now", () => this.syncNotes());
    this.addCommand({
      id: "inklift-sync",
      name: "Sync handwritten notes",
      callback: () => this.syncNotes()
    });
    if (this.settings.accessToken) {
      this.startPeriodicSync();
    }
  }
  onunload() {
    if (this.syncInterval) {
      window.clearInterval(this.syncInterval);
    }
  }
  async syncNotes() {
    if (!this.settings.accessToken) {
      new import_obsidian.Notice("InkLift: Log in via settings first.");
      return;
    }
    this.api.setTokens(this.settings.accessToken, this.settings.refreshToken);
    new import_obsidian.Notice("InkLift: Syncing...");
    const engine = new SyncEngine(
      this.app,
      this.api,
      this.settings.syncFolder,
      this.settings.includeSourceImages
    );
    try {
      const { synced, errors } = await engine.run();
      if (errors.length > 0) {
        new import_obsidian.Notice(`InkLift: Synced ${synced}, ${errors.length} errors.`);
      } else {
        new import_obsidian.Notice(`InkLift: Synced ${synced} note(s).`);
      }
    } catch (e) {
      new import_obsidian.Notice(`InkLift: Sync failed \u2014 ${String(e)}`);
    }
  }
  startPeriodicSync() {
    const intervalMs = this.settings.syncIntervalMinutes * 60 * 1e3;
    this.syncInterval = window.setInterval(
      () => this.syncNotes(),
      intervalMs
    );
    this.registerInterval(this.syncInterval);
  }
  async loadSettings() {
    const saved = await this.loadData();
    this.settings = Object.assign({}, DEFAULT_SETTINGS, saved);
    if (saved?.apiToken && !this.settings.accessToken) {
      this.settings.accessToken = saved.apiToken;
      this.settings.refreshToken = "";
      await this.saveSettings();
    }
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
};
var InkLiftSettingTab = class extends import_obsidian.PluginSettingTab {
  plugin;
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "InkLift Settings" });
    new import_obsidian.Setting(containerEl).setName("API URL").setDesc("InkLift server URL (e.g. http://localhost:8000)").addText(
      (text) => text.setPlaceholder("http://localhost:8000").setValue(this.plugin.settings.apiUrl).onChange(async (value) => {
        this.plugin.settings.apiUrl = value;
        await this.plugin.saveSettings();
      })
    );
    containerEl.createEl("h3", { text: "Account" });
    const isLoggedIn = !!this.plugin.settings.accessToken;
    if (isLoggedIn) {
      new import_obsidian.Setting(containerEl).setName("Status").setDesc("Logged in").addButton(
        (btn) => btn.setButtonText("Log out").onClick(async () => {
          this.plugin.settings.accessToken = "";
          this.plugin.settings.refreshToken = "";
          this.plugin.api.clearTokens();
          await this.plugin.saveSettings();
          this.display();
        })
      );
    } else {
      let emailValue = "";
      let passwordValue = "";
      new import_obsidian.Setting(containerEl).setName("Email").setDesc("Your InkLift account email").addText(
        (text) => text.setPlaceholder("you@example.com").onChange((value) => {
          emailValue = value;
        })
      );
      new import_obsidian.Setting(containerEl).setName("Password").setDesc("Your InkLift account password").addText(
        (text) => text.setPlaceholder("Password").then((t) => {
          t.inputEl.type = "password";
        }).onChange((value) => {
          passwordValue = value;
        })
      );
      new import_obsidian.Setting(containerEl).setName("").addButton(
        (btn) => btn.setButtonText("Log in").setCta().onClick(async () => {
          if (!emailValue || !passwordValue) {
            new import_obsidian.Notice("InkLift: Enter email and password.");
            return;
          }
          try {
            const api = new InkLiftAPI(this.plugin.settings.apiUrl);
            const tokens = await api.login(emailValue, passwordValue);
            this.plugin.settings.accessToken = tokens.access_token;
            this.plugin.settings.refreshToken = tokens.refresh_token;
            this.plugin.api.setTokens(
              tokens.access_token,
              tokens.refresh_token
            );
            await this.plugin.saveSettings();
            new import_obsidian.Notice("InkLift: Logged in successfully.");
            this.display();
          } catch (e) {
            new import_obsidian.Notice(`InkLift: Login failed \u2014 ${String(e)}`);
          }
        })
      );
    }
    containerEl.createEl("h3", { text: "Advanced" });
    new import_obsidian.Setting(containerEl).setName("Access token").setDesc("Paste access token manually (advanced)").addText(
      (text) => text.setPlaceholder("Access token").setValue(this.plugin.settings.accessToken).onChange(async (value) => {
        this.plugin.settings.accessToken = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Refresh token").setDesc("Paste refresh token manually (advanced)").addText(
      (text) => text.setPlaceholder("Refresh token").setValue(this.plugin.settings.refreshToken).onChange(async (value) => {
        this.plugin.settings.refreshToken = value;
        await this.plugin.saveSettings();
      })
    );
    containerEl.createEl("h3", { text: "Sync" });
    new import_obsidian.Setting(containerEl).setName("Sync folder").setDesc("Vault folder for synced notes").addText(
      (text) => text.setPlaceholder("InkLift").setValue(this.plugin.settings.syncFolder).onChange(async (value) => {
        this.plugin.settings.syncFolder = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Sync interval (minutes)").setDesc("How often to check for new notes").addText(
      (text) => text.setPlaceholder("15").setValue(String(this.plugin.settings.syncIntervalMinutes)).onChange(async (value) => {
        const num = parseInt(value, 10);
        if (!isNaN(num) && num >= 1) {
          this.plugin.settings.syncIntervalMinutes = num;
          await this.plugin.saveSettings();
        }
      })
    );
    new import_obsidian.Setting(containerEl).setName("Include source images").setDesc("Embed the original handwriting image alongside text").addToggle(
      (toggle) => toggle.setValue(this.plugin.settings.includeSourceImages).onChange(async (value) => {
        this.plugin.settings.includeSourceImages = value;
        await this.plugin.saveSettings();
      })
    );
  }
};
