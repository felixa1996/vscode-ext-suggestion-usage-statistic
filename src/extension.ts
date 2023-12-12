// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

let statusBarItem: vscode.StatusBarItem;
let statusBarItem2: vscode.StatusBarItem;
let ev: vscode.Disposable | null = null;


let previousText = "";
let suggestionsCount = 0;
let suggestionsWordsCount = 0;

let currentFolderStartTime: Date | null = null;
let currentFolderName: string | null = null;

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "suggestion-usage-counter" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('suggestion-usage-counter.activate', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage('Suggestion Counter Enabled');
	});

	context.subscriptions.push(disposable);

	if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
		const currentFolder = vscode.workspace.workspaceFolders[0];
		const folderName = currentFolder.name;

		currentFolderStartTime = new Date();
		currentFolderName = folderName;
		console.log('Registered folder name', folderName);
	}

	registerSuggestionListener();
}

// This method is called when your extension is deactivated
export function deactivate() { }

function isTabPress(change: vscode.TextDocumentContentChangeEvent): boolean {
	return change.text.length > 1 && change.rangeLength !== 0;
}

function registerSuggestionListener() {

	if (!statusBarItem) {
		statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
		statusBarItem.text = 'Suggestions: 0';
		statusBarItem.tooltip = 'Suggestions Count';
		statusBarItem.show();
	}

	if (ev === null) {
		ev = vscode.workspace.onDidChangeTextDocument(event => {
			const activeEditor = vscode.window.activeTextEditor;
			if (!activeEditor || event.document !== activeEditor.document) {
				return;
			}
			const change = event.contentChanges[0];
			const updatedText = activeEditor.document.getText();
			if (updatedText.length > previousText.length) {

				if (isTabPress(change)) {
					const currentLengthChange = change.text.replace(/\s/g, '').length;

					if (currentLengthChange > 0) {
						suggestionsCount++;
						suggestionsWordsCount += currentLengthChange;
						statusBarItem.text = 'Copilot Suggestions: ' + suggestionsCount + ' (' + suggestionsWordsCount + ' words)';

						updateFolderTime();
					}
				}

			}
			previousText = updatedText;
		});
	}

}

function updateFolderTime() {
	const currentFolderEndTime = new Date();
	if (currentFolderStartTime && currentFolderName) {
		const duration = currentFolderEndTime.getTime() - currentFolderStartTime.getTime();
		if (duration > 0) {
			console.info('Time spend', duration);
			let durationInMinutes = Math.floor(duration * 0.001 / 60);
			// TODO log to file or setup time tracker API
			if (!statusBarItem2) {
				statusBarItem2 = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
				statusBarItem2.text = `Time spend ${durationInMinutes} minutes`;
				statusBarItem2.show();
			}
		}

	}
	currentFolderStartTime = currentFolderEndTime;
	currentFolderName = getCurrentFolderName();
}

function getCurrentFolderName(): string | null {
	if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
		return vscode.workspace.workspaceFolders[0].name;
	}
	return null;
}