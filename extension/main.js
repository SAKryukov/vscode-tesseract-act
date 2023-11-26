"use strict";

const vscode = require('vscode');
const childProcess = require('child_process');
const fileSystem = require("fs");

const definitionSet = {
    commands: { // keep in sync with package:
        setLanguage: "tesseract.act.language",
        recognize: "tesseract.act.recognize",
        recognizeContext: "tesseract.act.recognize.enabled",
        setContext: "setContext", // predefined, use with recognizeContext
    },
    tesseractLanguageKey: "tesseract.Language",
    statusBatItemLanguage: language => language ? `Tesseract Language: ${language}` : "Tesseract Language: default",
    supportedInputFileTypes: ["png", "jpg", "jpeg", "tif", "tiff", "gif", "webp", "bmp", "pnm"],
    isSupportedImageFile: function(file) {
        if (!file) return false;
        file = file.toLowerCase();
        for (let suffix of this.supportedInputFileTypes)
            if (file.endsWith(`.${suffix}`))
                return true;
        return false;
    },
}; //definitionSet

const setState = (context, language) => {
    context.workspaceState.update(definitionSet.tesseractLanguageKey, language);
}; //setState
const getState = context => 
    context.workspaceState.get(definitionSet.tesseractLanguageKey);

const languages = [];
const parseLanguages = (configuration, list) => {
    childProcess.exec(`${configuration.executableFileLocation} --list-langs`, (_, stdout) => {
        stdout = stdout.replaceAll("\r", "");
        const split = stdout.split("\n");
        let started = false;
        for (let line of split) {
            line = line.trim();
            if (line.length < 1) continue;
            if (!started && line.endsWith(":"))
                { started = true; continue; }
            list.push(line);
        } //loop       
    });
}; //parseLanguages

let statusBatItem = null;

const changeConfigurationHandle = (context, configuration) => {
    if (!fileSystem.existsSync(configuration.executableFileLocation))
        return vscode.window.showErrorMessage(`File not found: ${quote(configuration.executableFileLocation)}. Please edit VSCode settings, "tesseract.executableFileLocation"`)
    parseLanguages(configuration, languages);
    if (statusBatItem == null)
        statusBatItem = vscode.window.createStatusBarItem(
            "tesseract.act.language.statusBarItem",
            vscode.StatusBarAlignment.Right,
            1000); //SA???
    const language = getState(context);
    statusBatItem.text = definitionSet.statusBatItemLanguage(language);
    statusBatItem.command = definitionSet.commands.setLanguage;
    statusBatItem.show();
}; //changeConfigurationHandle

const uri = () => {
    const tabArray = vscode.window.tabGroups?.all;
    if (!tabArray) return null;
    return tabArray[0]?.activeTab?.input?.uri?.fsPath;
} //const uri
//
const changeDocumentHandler = () => {
    if (!statusBatItem) return;
    const show = () => {
        if (!statusBatItem) return false;
        const file = uri();
        if (!file) return false;
        return definitionSet.isSupportedImageFile(file);
    };
    const doShow = show();
    if (doShow)
        statusBatItem.show();
    else
        statusBatItem.hide();
    vscode.commands.executeCommand(
        definitionSet.commands.setContext,
        definitionSet.commands.recognizeContext,
        doShow);
}; //changeDocumentHandler

const recognizeText = (context, configuration) => {
    const inputfileName = uri();
    const outputFileName = `${inputfileName}.txt`;
    const stateLanguage = getState(context);
    let language = stateLanguage ? `-l ${stateLanguage}` : "";
    childProcess.exec(`${configuration.executableFileLocation} ${inputfileName} ${inputfileName} ${language}`, (error, stdout, stderr) => {
        if (stdout)
            vscode.window.showInformationMessage(stdout);
        if (stderr && stderr.startsWith("Error")) //SA???
            vscode.window.showErrorMessage(stderr);
        if (!error && fileSystem.existsSync(outputFileName))
            vscode.workspace.openTextDocument(outputFileName).then(document =>
                vscode.window.showTextDocument(document));
    });
}; // recognizeText

const selectLanguage = context => {
    const sortLanguages = (context, list) => {
        const topLanguage = getState(context);
        if (!topLanguage) return;
        const topIndex = (() => {
            for (let index in list)
                if (list[index] == topLanguage)
                    return index;
            return null;
        })(topLanguage);
        if (topIndex == null) return;
        const newList = [];
        newList.push(topLanguage);
        for (let index in list)
            if (index != topIndex)
                newList.push(list[index]);
        for (let index in list)
            list[index] = newList[index];
    }; //sortLanguages
    sortLanguages(context, languages);    
    vscode.window.showQuickPick(languages, {
        placeHolder: "Select Tesseract Language",
        onDidSelectItem: item => {
            setState(context, item);
            statusBatItem.text = definitionSet.statusBatItemLanguage(item);
        }
    });
}; //selectLanguage

const quote = text =>
    `${String.fromCodePoint(0x201C)}${text}${String.fromCodePoint(0x201D)}`;

exports.activate = context => {
    const configuration = vscode.workspace.getConfiguration().tesseract;
    let disposable = vscode.commands.registerCommand(definitionSet.commands.recognize,
        () => recognizeText(context, configuration) );
	context.subscriptions.push(disposable);
    disposable = vscode.commands.registerCommand(definitionSet.commands.setLanguage,
        () => selectLanguage(context));
	context.subscriptions.push(disposable);
    disposable = vscode.workspace.onDidChangeConfiguration(() =>
        changeConfigurationHandle(context, configuration));
    changeConfigurationHandle(context, configuration);
	context.subscriptions.push(disposable);
    disposable = vscode.window.onDidChangeActiveTextEditor(() =>
        changeDocumentHandler());
    changeDocumentHandler();
	context.subscriptions.push(disposable);
}; //exports.activate

exports.deactivate = () => { };
