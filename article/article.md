@numbering {
    enable: false
}

{title}Tesseract Act

[*Sergey A Kryukov*](https://www.SAKryukov.org)

A Visual Studio Code *extension*, a convenient UI wrapper for Tesseract OCR — in the VSCode style.
It performs Optical Character Recognition of data found in an image file and opens the recognition result in a text editor.

This tiny extension is also used to explain the general Visual Studio Code extension writing techniques for the cases when an external application is used and when non-text input data needs to be processed.

<!-- copy to CodeProject from here ------------------------------------------->

![Tesseract Act Logo](logo.png){id=image-title}

## Contents{no-toc}


@toc

## Motivation

I think we all hate paper documents. But in many cases, we don’t have a choice. Stupid financial, legal, insurance or government services keep sending us paper-only documents we cannot ignore. In some countries, the so-called digital government is notoriously weak if not disastrous. With the combination of a scanner, OCR and graphical editors, we still can combine paper data and generate maintainable documents in response.

I have started to use Tesseract OCR very recently, with yet another enrollment. Before that time, I only tried different OCR tools, and I rejected Tesseract because its older versions were not Unicode, which is a big no-no. The recent version, however, is quite usable. When I tested it and found it acceptable, I started my practical use of it by crafting a Visual Studio Code extension. When the product matured, I published it on the [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=sakryukov.tesseract-act).

The extension appeared very useful, and convenient, and it became fairly popular. In this article, I would like to share some findings related to specific issues related to this extension. They are relatively simple but took time to figure out. They are related to two things: 1) processing of non-textual pages, and 2) using an external application.

## Tesseract Introduction

Tesseract can be [installed](https://github.com/tesseract-ocr/tesseract?tab=readme-ov-file#installing-tesseract) on Linux, Windows, and MacOS.

The source code is [available on GitHub](https://github.com/tesseract-ocr/tesseract).

Trained data for additional languages can be installed separately. Trained data for different models can be found in separate `pinned` Git repositories found on the page of the Tesseract OCR account [tesseract-ocr](https://github.com/tesseract-ocr). The simplest way of installing a language pack is copying a single file *.traineddata to the subdirectory "tessdata" of the Tesseract executable directory. The list of currently installed languages can be obtained by the command line:

~~~
tesseract --list-langs
~~~

For further details, please see the [Tesseract documentation repository](https://github.com/tesseract-ocr/tessdoc).

## Implementation, Issues, and Solutions

### Introduction

The extension Tesseract Act is really a tiny product. It makes it convenient for explanations of some issues. I don't want to explain the entire Visual Studio extension writing concepts but I want to rely on the general reader's knowledge of them. It can better be found in the [original documentation](https://code.visualstudio.com/api). The complete current source code of my extension can always be found in the [code repository](https://github.com/SAKryukov/vscode-tesseract-act).

The user-level documentation can be found on the [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=sakryukov.tesseract-act) and also in the [code repository](https://github.com/SAKryukov/vscode-tesseract-act).

The extension has only two commands, "Tesseract: Recognize Text" and "Tesseract: Language" and only one parameter in the Settings: "tesseract.executableFileLocation". The user's choice of a language is persistently remembered for the current workspace.

### Event Deficit

A first pretty trivial problem took the most investigation. The problem is that we need to capture the event when an image file of a file type Tesseract OCR can handle is loaded or selected in the editor. We always need such a thing at least to enable or disable the commands related to the application.

The problem is that Visual Studio Code is well-sharpened for text editing but it does not provide the event analogous to the appropriate event for a text file. Here is what can be done quite conveniently for the text files:

~~~{lang=JavaScript}
exports.activate = context => {
    //...
    // not applicable to the present extension:
    context.subscriptions.push(
        vscode.workspace.onDidOpenTextDocument(
            textDocument => doSomething(textDocument)));
};
~~~

Additionally, we could use `textDocument.languageId` to do different actions for different languages.

We cannot do the same thing for an arbitrary file. The solution is a bit more complicated. We need to handle the combination of two events, `onDidChangeTabGroups`, and `onDidChangeTabs` --- only the combination covers all the cases. This is how the magic works:

~~~{lang=JavaScript}
exports.activate = context => {
    //...
    const tabGroupSet = vscode.window.tabGroups;
    context.subscriptions.push(
        tabGroupSet.onDidChangeTabGroups(() => updateEnablement()));
    context.subscriptions.push(
        tabGroupSet.onDidChangeTabs(() => updateEnablement()));
};
~~~

I think it is pretty much obvious what `updateEnablement` should do. Please see the [source code](https://github.com/SAKryukov/vscode-tesseract-act) for the comprehensive information. However, I need to clarify how to find out the active file and figure out if it is applicable to the OCR operation.

### Enablement

This is the skeleton of the function `updateEnablement`:

~~~{lang=JavaScript}
exports.activate = context => {
    //...
    const isGoodImage = () => {
        if (!statusBarItem) return false;
        const file = activeUri();
        if (!file) return false;
        return definitionSet.isImageFileSupported(file);
    };
    // using isGoodImage...
};
~~~

Note that the `file` is found as `activeUri`, and the file name is tested for compatibility with Tesseract using `definitionSet.isImageFileSupported`.

Here is how to find the active URI:

~~~{lang=JavaScript}
const activeUri = () =>
    vscode.window?.tabGroups?.activeTabGroup?.activeTab?.input?.uri?.fsPath;
~~~

We also need to find out that the file is supported by Tesseract OCR. We have nothing to do but reading the Tesseract documentation listing the set of suffixes indicating compatible file types:

~~~{lang=JavaScript}
const definitionSet = {
    //...
    supportedInputFileTypes: ["png", "jpg", "jpeg", "tif", "tiff", "gif", "webp", "bmp"],
    isImageFileSupported: function(file) {
        if (!file) return false;
        file = file.toLowerCase();
        for (let suffix of this.supportedInputFileTypes)
            if (file.endsWith(`.${suffix}`))
                return true;
        return false;
    }, //isImageFileSupported
    //...
};
~~~

### Recognition of an External Application

### One-Way Default

### Asynchronous I/O

## Conclusions

I hope that the descriptions of the simple subtleties described in this article cover a wide set of extensions using an external application. I will gladly try to answer any questions related to Visual Studio Code extension writing in general.
