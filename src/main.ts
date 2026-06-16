import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, requestUrl } from 'obsidian';

// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	mySetting: string;
	apiUrl: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: 'default',
	apiUrl: 'http://localhost:8000/query'
}

export default class MyPlugin extends Plugin {
	settings!: MyPluginSettings;

	async onload() {
		await this.loadSettings();

		const query = () => {
			new QueryModal(this.app, async (query) => {
				if (!query) return;
		
				new Notice('正在向您的 RAG 系統提問...');
		
				try {
					const response = await requestUrl({
						url: this.settings.apiUrl,
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
							'Accept': 'application/json',
						},
						body: JSON.stringify({ query: query }),
					});
		
					if (!response.status || response.status < 200 || response.status >= 300) {
						throw new Error(`API 請求失敗: ${response.status} ${response.text}`);
					}
		
					const data = await response.json;
		
					// 將答案插入到當前筆記中
					const editor = this.app.workspace.getActiveViewOfType(MarkdownView)?.editor;
					if (editor) {
						const formattedAnswer = `\n\n---\n**問題:** ${query}\n\n**答案:** ${data.answer}\n\n**參考資料:**\n${data.sources.map((s: any) => `- ${s}`).join('\n')}\n---\n`;
						editor.replaceSelection(formattedAnswer);
					} else {
						new Notice("沒有活動的編輯器可供插入答案。");
					}
		
				} catch (error) {
					console.error("RAG Plugin Error:", error);
					new Notice(`錯誤: ${error.message}`, 5000);
				}
			}).open();
		}

		// This creates an icon in the left ribbon.
		this.addRibbonIcon('dice', 'Sample', (_evt: MouseEvent) => {
			// Called when the user clicks the icon.
			query();
		});

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Status Bar Text');

		this.addCommand({
            id: 'ask-rag-system',
            name: 'Ask YoYoRAG',
            callback: query
		});

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'open-modal-simple',
			name: 'Open modal (simple)',
			callback: () => {
				new SampleModal(this.app).open();
			},
		});
		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: 'replace-selected',
			name: 'Replace selected content',
			editorCallback: (
				editor: Editor,
				_ctx: MarkdownView | MarkdownFileInfo,
			) => {
				editor.replaceSelection('Sample editor command');
			},
		});
		// This adds a complex command that can check whether the current state of the app allows execution of the command
		this.addCommand({
			id: 'open-modal-complex',
			name: 'Open modal (complex)',
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const markdownView =
					this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						new SampleModal(this.app).open();
					}

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
				return false;
			},
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(activeDocument, 'click', (_evt: MouseEvent) => {
			new Notice('Click');
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(
			window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000),
		);
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<MyPluginSettings>,
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

// 用於顯示輸入框的 Modal
class QueryModal extends Modal {
    query: string;
    onSubmit: (query: string) => void;

    constructor(app: App, onSubmit: (query: string) => void) {
        super(app);
        this.onSubmit = onSubmit;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.createEl("h2", { text: "詢問您的筆記" });

        const input = contentEl.createEl("input", { type: "text" });
        input.style.width = "100%";
        input.placeholder = "輸入您的問題...";

        input.addEventListener("keydown", (evt) => {
            if (evt.key === "Enter") {
                this.query = input.value;
                this.close();
                this.onSubmit(this.query);
            }
        });
    }

    onClose() {
        let { contentEl } = this;
        contentEl.empty();
    }
}


class SampleModal extends Modal {
	onOpen() {
		const { contentEl } = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

class SampleSettingTab extends PluginSettingTab {
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

		new Setting(containerEl)
			.setName('Setting #1')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.mySetting)
				.onChange(async (value) => {
					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();
				}));
	}
}
