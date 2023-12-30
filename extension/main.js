"use strict";

const vscode = require("vscode");
const childProcess = require("child_process");
const fileSystem = require("fs");
const path = require("path");

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
    isImageFileSupported: function(file) {
        if (!file) return false;
        file = file.toLowerCase();
        for (let suffix of this.supportedInputFileTypes)
            if (file.endsWith(`.${suffix}`))
                return true;
        return false;
    }, //isImageFileSupported
    tesseract: { //careful! specific to Tesseract-OCR:
        outputFile: inputFile =>
            `${inputFile}.txt`, //to match specific automatic file naming
        commandLine: (executableFile, fileName, language) =>
            `${executableFile} ${fileName} ${fileName} ${language == null ? "" : "-l " + language}`,
        commandLineLanguages: executable => `${executable} --list-langs`,
    },
    quote: text =>
        `${String.fromCodePoint(0x201C)}${text}${String.fromCodePoint(0x201D)}`,
    empty: "",
}; //definitionSet

const commandExists = fileOrCommand => {
    if (fileSystem.existsSync(fileOrCommand)) return true;
    try {
        childProcess.execSync(definitionSet.tesseract.commandLineLanguages(fileOrCommand));
    } catch {
        return false;
    } //exception
    return true;
}; //commandExists

const activeUri = () =>
    vscode.window?.tabGroups?.activeTabGroup?.activeTab?.input?.uri?.fsPath;

let statusBarItem = null, tesseractExecutableFound = false, languages = [], continueWithoutConfirmation = false;

const updateEnablement = () => {
    vscode.commands.executeCommand(
        definitionSet.commands.setContext,
        definitionSet.commands.setLanguageContext,
        tesseractExecutableFound);
    const isGoodImage = () => {
        if (!statusBarItem) return false;
        const file = activeUri();
        if (!file) return false;
        return definitionSet.isImageFileSupported(file);
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

const parseLanguages = configuration => {
    const list = [];
    childProcess.exec(definitionSet.tesseract.commandLineLanguages(
        configuration.executableFileLocation), (_, stdout) => {
        stdout = stdout.replaceAll("\r", definitionSet.empty);
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
    continueWithoutConfirmation = false;
    const configuration = vscode.workspace.getConfiguration().tesseract;
    tesseractExecutableFound = commandExists(configuration.executableFileLocation);
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
            "tesseract.act.language.statusBarItem", // unused
            vscode.StatusBarAlignment.Left); // SA!!! I don't like vscode.StatusBarAlignment.Right,
                                             // because it requires pretty stupid "priority" argument
    context.subscriptions.push(statusBarItem);
    const language = getState(context);
    statusBarItem.text = definitionSet.statusBarItemLanguage(language);
    statusBarItem.tooltip = definitionSet.commands.setLanguageHint();
    statusBarItem.command = definitionSet.commands.setLanguage;
    updateEnablement();
}; //changeConfigurationHandle

const recognizeText = (context, configuration) => {
    const inputfileName = activeUri();
    const outputFileName = definitionSet.tesseract.outputFile(inputfileName);
    const language = getState(context);
    const commandLine = definitionSet.tesseract.commandLine(configuration.executableFileLocation, inputfileName, language);
    const act = () => {
        childProcess.exec(commandLine, (error, stdout, stderr) => {
            if (stdout)
                vscode.window.showInformationMessage(stdout);
            if (stderr && stderr.startsWith("Error")) //SA???
                vscode.window.showErrorMessage(stderr);
            if (!error && fileSystem.existsSync(outputFileName))
                vscode.workspace.openTextDocument(outputFileName).then(document =>
                    vscode.window.showTextDocument(document, { preview: true }));
        });
    }; //act
    const actWithConfirmation = () => {
        const request = [
            "Overwrite and continue",
            "Overwrite, continue, and don't ask me again during the current workspace session",
            "Cancel"];
        const noAsk = request[1];
        const cancel = request[2];
        vscode.window.showQuickPick(request, {
            placeHolder: `Output file ${definitionSet.quote(path.basename(outputFileName))} already exists. What to do?`,
        }).then(answer => {
            if (!answer || answer == cancel) return; // answer is undefined (!answer) if the user hits Cancel button
            if (answer == noAsk) continueWithoutConfirmation = true;
            act();
        });    
    }; //actWithConfirmation
    if (fileSystem.existsSync(outputFileName) && !continueWithoutConfirmation)
        actWithConfirmation();
    else
        act();
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
    context.subscriptions.push(vscode.workspace.onDidChangeWorkspaceFolders(() => continueWithoutConfirmation = false));
    const tabGroupSet = vscode.window.tabGroups;
    context.subscriptions.push(tabGroupSet.onDidChangeTabGroups(() => updateEnablement()));
    context.subscriptions.push(tabGroupSet.onDidChangeTabs(() => updateEnablement()));
}; //exports.activate

exports.deactivate = () => { };
