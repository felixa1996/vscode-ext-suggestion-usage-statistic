// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

let statusBarItem: vscode.StatusBarItem;
let statusBarItem2: vscode.StatusBarItem;
let ev: vscode.Disposable | null = null;

// Flag to track if the selection was auto-selected after pasting
let autoSelected: boolean = false;
let manualMouseSelected: boolean = false;
let manualKeyboardSelected: boolean = false;
let enableAutoSelection = true;
let enableManualSelection = true;


let previousText = "";
let suggestionsCount = 0;
let suggestionsWordsCount = 0;

let currentFolderStartTime: Date | null = null;
let currentFolderName: string | null = null;

let oc = vscode.window.createOutputChannel("Suggestion Usage");

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

	context.subscriptions.push(registerPasteListener());

	registerSuggestionListener();
}

// This method is called when your extension is deactivated
export function deactivate() { }

function isTabPress(change: vscode.TextDocumentContentChangeEvent): boolean {
	return change.text.length > 1 && change.rangeLength !== 0;
}

function registerPasteListener(): vscode.Disposable {
	let pasteCommandDisposable = vscode.commands.registerCommand('editor.action.clipboardPasteAction', async () => {
		if (manualMouseSelected || manualKeyboardSelected) {
			autoSelected = false;
		}

		// Read content from clipboard
		const clipboardContent = await vscode.env.clipboard.readText();

		if (clipboardContent) {
			const editor = vscode.window.activeTextEditor;
			if (editor) {
				let targetSelection: vscode.Selection;

				// Determine the target for the paste: either append after the current selection or replace it
				if (autoSelected || enableManualSelection) {
					const currentPosition = editor.selection.end;
					targetSelection = new vscode.Selection(currentPosition, currentPosition);
				} else {
					targetSelection = editor.selection;
				}

				// Split content by lines to calculate the selection end position later
				const linesPasted = clipboardContent.split('\n');
				const lastLineLength = linesPasted[linesPasted.length - 1].length;

				editor.edit((editBuilder) => {
					// Replace the determined target selection with the clipboard content
					editBuilder.replace(targetSelection, clipboardContent);
				}).then((success) => {
					if (success) {
						let currentDate = new Date();
						oc.appendLine(`[${currentDate.toISOString()}]::paste-text ${clipboardContent}`);

						// Determine the end position for the selection post-paste
						const endLine = targetSelection.start.line + linesPasted.length - 1;
						const endCharacter = (linesPasted.length === 1) ? (targetSelection.start.character + lastLineLength) : lastLineLength;
						const endPosition = new vscode.Position(endLine, endCharacter);

						if (enableAutoSelection) {
							// Adjust the selection to cover the pasted content
							editor.selection = new vscode.Selection(targetSelection.start, endPosition);
							autoSelected = true;
						}
						// Reveal the pasted content in the editor
						editor.revealRange(new vscode.Range(targetSelection.start, endPosition), vscode.TextEditorRevealType.Default);
					} else {
						oc.appendLine('Clipboard is empty.');
					}
				});
			}
		}
		// At the end of this command, reset the manual selection flags:
		manualMouseSelected = false;
		manualKeyboardSelected = false;
	});

	return pasteCommandDisposable;
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
						let currentDate = new Date();
						suggestionsCount++;
						suggestionsWordsCount += currentLengthChange;
						statusBarItem.text = 'Copilot Suggestions: ' + suggestionsCount + ' (' + suggestionsWordsCount + ' words)';
						oc.appendLine(`[${currentDate.toISOString()}]::from-tab ${change.text}`);

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