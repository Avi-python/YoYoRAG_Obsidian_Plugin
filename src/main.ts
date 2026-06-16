import { App, Editor, MarkdownView, MarkdownFileInfo, Modal, Notice, Plugin, PluginSettingTab, Setting, requestUrl } from 'obsidian';
import {
	DEFAULT_SETTINGS,
	MyPluginSettings,
	SampleSettingTab,
} from './settings';

export default class MyPlugin extends Plugin {
	settings!: MyPluginSettings;

	async onload() {
		await this.loadSettings();

		const queryPopup = () => {
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
		
					new AnswerModal(this.app, query, data.answer, data.sources).open();
					
					await this.saveHistory(query, data.answer, data.sources);
		
				} catch (error) {
					console.error("RAG Plugin Error:", error);
					if (error instanceof Error) {
						new Notice(`錯誤: ${error.message}`, 5000);
					} else {
						new Notice('未知錯誤', 5000);
					}
				}
			}).open();
		}

		// This creates an icon in the left ribbon.
		this.addRibbonIcon('dice', 'Sample', (_evt: MouseEvent) => {
			// Called when the user clicks the icon.
			queryPopup();
		});

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Status Bar Text');

		this.addCommand({
            id: 'ask-rag-system',
            name: 'Ask YoYoRAG',
            callback: queryPopup
		});


		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));
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

	async saveHistory(query: string, answer: string, sources: string[]) {
        const filePath = this.settings.historyFilePath;
        const historyEntry = `\n\n---\n**時間:** ${new Date().toLocaleString()}\n**問題:** ${query}\n**答案:** ${answer}\n**參考資料:**\n${sources.map((s: any) => `- ${s}`).join('\n')}\n---\n`;
        
        const file = this.app.vault.getAbstractFileByPath(filePath);
        if (file) {
			// @ts-ignore
			const content = await this.app.vault.read(file);
			const header = "# RAG Query History\n";
			let newContent;
			if (content.startsWith(header)) {
				newContent = content.replace(header, header + historyEntry);
			} else {
				newContent = historyEntry + content;
			}
			// @ts-ignore
			await this.app.vault.modify(file, newContent);
        } else {
            await this.app.vault.create(filePath, `# RAG Query History\n${historyEntry}`);
        }
    }
}

// 用於顯示輸入框的 Modal
class QueryModal extends Modal {
	query!: string;
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
            if (evt.key === "Enter" && !evt.isComposing) {
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

class AnswerModal extends Modal {
	query: string;
	answer: string;
	sources: string[];

	constructor(app: App, query: string, answer: string, sources: string[]) {
		super(app);
		this.query = query;
		this.answer = answer;
		this.sources = sources;
	}

	onOpen() {
        const { contentEl } = this;
        contentEl.createEl("h2", { text: "RAG 系統回答" });
        contentEl.createEl("h4", { text: "問題: " + this.query });
        contentEl.createEl("p", { text: this.answer });
        
        if (this.sources && this.sources.length > 0) {
            contentEl.createEl("h4", { text: "參考資料:" });
            const ul = contentEl.createEl("ul");
            this.sources.forEach(source => {
                ul.createEl("li", { text: "[[" + source + "]]"});
            });
        }
    }

    onClose() {
        this.contentEl.empty();
    }
}