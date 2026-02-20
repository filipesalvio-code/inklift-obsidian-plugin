import { App, Notice, Plugin, PluginSettingTab, Setting } from "obsidian";
import { InkLiftAPI } from "./api";
import { SyncEngine } from "./sync";
export interface InkLiftSettings { apiUrl: string; accessToken: string; refreshToken: string; syncFolder: string; syncIntervalMinutes: number; includeSourceImages: boolean; }
const DEFAULT_SETTINGS: InkLiftSettings = { apiUrl: "http://localhost:8000", accessToken: "", refreshToken: "", syncFolder: "InkLift", syncIntervalMinutes: 15, includeSourceImages: true };
export default class InkLiftPlugin extends Plugin {
  settings: InkLiftSettings;
  private syncInterval: number | null = null;
  api: InkLiftAPI = new InkLiftAPI();
  async onload() {
    await this.loadSettings();
    this.api = new InkLiftAPI(this.settings.apiUrl);
    this.api.onTokenRefresh = (access, refresh) => { this.settings.accessToken = access; this.settings.refreshToken = refresh; this.saveSettings(); };
    if (this.settings.accessToken && this.settings.refreshToken) this.api.setTokens(this.settings.accessToken, this.settings.refreshToken);
    this.addSettingTab(new InkLiftSettingTab(this.app, this));
    this.addRibbonIcon("pencil", "InkLift: Sync now", () => this.syncNotes());
    this.addCommand({ id: "inklift-sync", name: "Sync handwritten notes", callback: () => this.syncNotes() });
    if (this.settings.accessToken) this.startPeriodicSync();
  }
  onunload() { if (this.syncInterval) window.clearInterval(this.syncInterval); }
  async syncNotes() {
    if (!this.settings.accessToken) { new Notice("InkLift: Log in via settings first."); return; }
    this.api.setTokens(this.settings.accessToken, this.settings.refreshToken);
    new Notice("InkLift: Syncing...");
    const engine = new SyncEngine(this.app, this.api, this.settings.syncFolder, this.settings.includeSourceImages);
    try {
      const { synced, errors } = await engine.run();
      if (errors.length > 0) new Notice("InkLift: Synced " + synced + ", " + errors.length + " errors.");
      else new Notice("InkLift: Synced " + synced + " note(s).");
    } catch (e) { new Notice("InkLift: Sync failed - " + String(e)); }
  }
  private startPeriodicSync() {
    const intervalMs = this.settings.syncIntervalMinutes * 60 * 1000;
    this.syncInterval = window.setInterval(() => this.syncNotes(), intervalMs);
    this.registerInterval(this.syncInterval);
  }
  async loadSettings() {
    const saved = await this.loadData();
    this.settings = Object.assign({}, DEFAULT_SETTINGS, saved);
    if (saved?.apiToken && !this.settings.accessToken) { this.settings.accessToken = saved.apiToken; this.settings.refreshToken = ""; await this.saveSettings(); }
  }
  async saveSettings() { await this.saveData(this.settings); }
}
class InkLiftSettingTab extends PluginSettingTab {
  plugin: InkLiftPlugin;
  constructor(app: App, plugin: InkLiftPlugin) { super(app, plugin); this.plugin = plugin; }
  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "InkLift Settings" });
    new Setting(containerEl).setName("API URL").setDesc("InkLift server URL").addText((t) => t.setPlaceholder("http://localhost:8000").setValue(this.plugin.settings.apiUrl).onChange(async (v) => { this.plugin.settings.apiUrl = v; await this.plugin.saveSettings(); }));
    containerEl.createEl("h3", { text: "Account" });
    if (this.plugin.settings.accessToken) {
      new Setting(containerEl).setName("Status").setDesc("Logged in").addButton((b) => b.setButtonText("Log out").onClick(async () => { this.plugin.settings.accessToken = ""; this.plugin.settings.refreshToken = ""; this.plugin.api.clearTokens(); await this.plugin.saveSettings(); this.display(); }));
    } else {
      let emailValue = "", passwordValue = "";
      new Setting(containerEl).setName("Email").addText((t) => t.setPlaceholder("you@example.com").onChange((v) => { emailValue = v; }));
      new Setting(containerEl).setName("Password").addText((t) => t.setPlaceholder("Password").then((x) => { x.inputEl.type = "password"; }).onChange((v) => { passwordValue = v; }));
      new Setting(containerEl).addButton((b) => b.setButtonText("Log in").setCta().onClick(async () => {
        if (!emailValue || !passwordValue) { new Notice("InkLift: Enter email and password."); return; }
        try { const api = new InkLiftAPI(this.plugin.settings.apiUrl); const tokens = await api.login(emailValue, passwordValue); this.plugin.settings.accessToken = tokens.access_token; this.plugin.settings.refreshToken = tokens.refresh_token; this.plugin.api.setTokens(tokens.access_token, tokens.refresh_token); await this.plugin.saveSettings(); new Notice("InkLift: Logged in."); this.display(); } catch (e) { new Notice("InkLift: Login failed - " + String(e)); }
      }));
    }
    containerEl.createEl("h3", { text: "Advanced" });
    new Setting(containerEl).setName("Access token").addText((t) => t.setValue(this.plugin.settings.accessToken).onChange(async (v) => { this.plugin.settings.accessToken = v; await this.plugin.saveSettings(); }));
    new Setting(containerEl).setName("Refresh token").addText((t) => t.setValue(this.plugin.settings.refreshToken).onChange(async (v) => { this.plugin.settings.refreshToken = v; await this.plugin.saveSettings(); }));
    containerEl.createEl("h3", { text: "Sync" });
    new Setting(containerEl).setName("Sync folder").addText((t) => t.setPlaceholder("InkLift").setValue(this.plugin.settings.syncFolder).onChange(async (v) => { this.plugin.settings.syncFolder = v; await this.plugin.saveSettings(); }));
    new Setting(containerEl).setName("Sync interval (min)").addText((t) => t.setValue(String(this.plugin.settings.syncIntervalMinutes)).onChange(async (v) => { const n = parseInt(v, 10); if (!isNaN(n) && n >= 1) { this.plugin.settings.syncIntervalMinutes = n; await this.plugin.saveSettings(); } }));
    new Setting(containerEl).setName("Include source images").addToggle((t) => t.setValue(this.plugin.settings.includeSourceImages).onChange(async (v) => { this.plugin.settings.includeSourceImages = v; await this.plugin.saveSettings(); }));
  }
}