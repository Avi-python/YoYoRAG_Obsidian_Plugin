import { App, PluginSettingTab, Setting } from 'obsidian';
import MyPlugin from './main';

export interface MyPluginSettings {
	apiUrl: string;
	historyFilePath: string;
}

export const DEFAULT_SETTINGS: MyPluginSettings = {
	apiUrl: 'http://localhost:8000/query',
	historyFilePath: 'RAG-History.md'
}

export class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('RAG API Endpoint')
			.setDesc('Enter the URL of your RAG API system')
			.addText(text => text
				.setPlaceholder('http://localhost:8000/query')
				.setValue(this.plugin.settings.apiUrl)
				.onChange(async (value) => {
					this.plugin.settings.apiUrl = value;
					await this.plugin.saveSettings();
				}));
	}
}
