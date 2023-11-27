"use strict";

const vscode = require('vscode');
const childProcess = require('child_process');
const fileSystem = require("fs");

const definitionSet = {
    commands: { // keep in sync with package:
        setLanguage: "tesseract.act.language",
        recognize: "tesseract.act.recognize",
        recognizeTitle: "Tesseract: Recognize Text",
        setLanguageContext: "tesseract.act.language.enabled",
        recognizeContext: "tesseract.act.recognize.enabled",
        setContext: "setContext", // predefined, use with recognizeContext
        setLanguageHint: function() {
            return `To recognize as text, use command: ${this.recognizeTitle}`;
        }, //setLanguageHint
    },
    tesseractLanguageKey: "tesseract.Language",
    statusBarItemLanguage: language => language ? `Tesseract Language: ${language}` : "Tesseract Language: default",
    supportedInputFileTypes: ["png", "jpg", "jpeg", "tif", "tiff", "gif", "webp", "bmp"],
    isSupportedImageFile: function(file) {
        if (!file) return false;
        file = file.toLowerCase();
        for (let suffix of this.supportedInputFileTypes)
            if (file.endsWith(`.${suffix}`))
                return true;
        return false;
    }, //isSupportedImageFile
    quote: text =>
        `${String.fromCodePoint(0x201C)}${text}${String.fromCodePoint(0x201D)}`
}; //definitionSet

let statusBarItem = null;
let tesseractExecutableFound = false;

const updateEnablement = () => {
    vscode.commands.executeCommand(
        definitionSet.commands.setContext,
        definitionSet.commands.setLanguageContext,
        tesseractExecutableFound);
    const isGoodImage = () => {
        if (!statusBarItem) return false;
        const file = uri();
        if (!file) return false;
        return definitionSet.isSupportedImageFile(file);
    };
    const goodImage = isGoodImage();
    vscode.commands.executeCommand(
        definitionSet.commands.setContext,
        definitionSet.commands.recognizeContext,
        goodImage && tesseractExecutableFound);
    if (goodImage && tesseractExecutableFound)
        statusBarItem?.show();
    else
        statusBarItem?.hide();
}; // updateEnablement

const setState = (context, language) => {
    context.workspaceState.update(definitionSet.tesseractLanguageKey, language);
}; //setState
const getState = context => 
    context.workspaceState.get(definitionSet.tesseractLanguageKey);

let languages = [];
const parseLanguages = configuration => {
    const list = [];
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
    return list;
}; //parseLanguages

const changeConfigurationHandle = (context) => {
    const configuration = vscode.workspace.getConfiguration().tesseract;
    tesseractExecutableFound = fileSystem.existsSync(configuration.executableFileLocation);
    if (!tesseractExecutableFound) {
        vscode.commands.executeCommand(
            definitionSet.commands.setContext,
            definitionSet.commands.recognizeContext,
            false);
        return vscode.window.showErrorMessage(`File not found: ${definitionSet.quote(configuration.executableFileLocation)}. Please edit VSCode settings, "tesseract.executableFileLocation"`);
    } //if
    languages = parseLanguages(configuration);
    if (statusBarItem == null)
        statusBarItem = vscode.window.createStatusBarItem(
            "tesseract.act.language.statusBarItem",
            vscode.StatusBarAlignment.Left); // SA!!! I don't like vscode.StatusBarAlignment.Right,
                                             // because it requires pretty stupid "priority" argument
    context.subscriptions.push(statusBarItem);
    const language = getState(context);
    statusBarItem.text = definitionSet.statusBarItemLanguage(language);
    statusBarItem.tooltip = definitionSet.commands.setLanguageHint();
    statusBarItem.command = definitionSet.commands.setLanguage;
    updateEnablement();
}; //changeConfigurationHandle

const uri = () => {
    const tabArray = vscode.window.tabGroups?.all;
    if (!tabArray) return null;
    return tabArray[0]?.activeTab?.input?.uri?.fsPath;
} //const uri

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
            statusBarItem.text = definitionSet.statusBarItemLanguage(item);
        }
    });
}; //selectLanguage

exports.activate = context => {
    const configuration = vscode.workspace.getConfiguration().tesseract;
    context.subscriptions.push(vscode.commands.registerCommand(definitionSet.commands.recognize,
        () => recognizeText(context, configuration) ));
    context.subscriptions.push(vscode.commands.registerCommand(definitionSet.commands.setLanguage,
        () => selectLanguage(context)));
    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(() =>
        changeConfigurationHandle(context)));
    changeConfigurationHandle(context);
    const tabGroupSet = vscode.window.tabGroups;
    context.subscriptions.push(tabGroupSet.onDidChangeTabGroups(() => updateEnablement()));
    context.subscriptions.push(tabGroupSet.onDidChangeTabs(() => updateEnablement()));
  console.log(tabGroupSet);
}; //exports.activate

exports.deactivate = () => { };
