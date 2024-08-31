@numbering {
    enable: false
}

{title}Tesseract Act

[*Sergey A Kryukov*](https://www.SAKryukov.org)

A Visual Studio Code *extension*, a convenient UI wrapper for Tesseract OCR — in the VSCode style.
It performs Optical Character Recognition of data found in an image file and opens the recognition result in a text editor.

This tiny plugin is also used to explain the general Visual Studio Code plugin writing techniques for the cases when an external application is used and when non-text input data needs to be processed.

<!-- copy to CodeProject from here ------------------------------------------->

![Tesseract Act Logo](logo.png){id=image-title}

## Contents{no-toc}


@toc

## Motivation

I think we all hate paper documents. But in many cases, we don't have a choice. Stupid financial, legal, insurance and govermnent services keep sending us paper-only documents we cannot ignore. In some countries, so called `digital government` is notoriously week if not disastrous. With the combination of a scanner, OCR and graphical editors, we still can combine paper data and generate maintainable documents in response.

I have started to uses Tesseract OCR very recently, with yet another enrollment. Before that time, I only tried different OCR tools, and I rejected Tesseract because its older versions were not Unicode, which is a big no-no. The recent version, however, is quite usable. When I tested it and found acceptable, I started my practical use of it from crafting a Visual Studio Code plugin. When the pluging matured, I've published it on the [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=sakryukov.tesseract-act).

The plugin turned out to be very useful, convenient and became fairly popular. In this article, I would like to share some finding related to specific issues related to this plugin. They are pretty simple but took time to figure out. They are related to two things: 1) processing of non-textual pages, 2) using an external application.

## Tesseract Introduction

Tesseract can be [installed](https://github.com/tesseract-ocr/tesseract?tab=readme-ov-file#installing-tesseract) on Linux, Windows, and MacOS.

The source code is [available on GitHub](https://github.com/tesseract-ocr/tesseract).

Trained data for additional languages can be installed separately. Trained data for different models can be found in separate `pinned` Git repositories found on the page of the Tesseract OCR account [tesseract-ocr](https://github.com/tesseract-ocr). The simplest way of installing a language pack is copying a single file *.traineddata to the subdirectory "tessdata" of the Tesseract executable directory. The list of currently installed languages can be obtained by the command line:

~~~
tesseract --list-langs
~~~

For further detial, please see the [Tesseract documentation repository](https://github.com/tesseract-ocr/tessdoc).

## Implementation, Issues and Solutions

### Introduction

### Event Deficit

Normally:

~~~{lang=JavaScript}
exports.activate = context => {
    //...
    context.subscriptions.push(
        vscode.workspace.onDidOpenTextDocument(
            textDocument => doSomething(textDocument)));
};
~~~

Additionally, we could use `textDocument.languageId` to do different actions for different languages.

General-case tab:

~~~{lang=JavaScript}
exports.activate = context => {
    //...
    context.subscriptions.push(
        tabGroupSet.onDidChangeTabGroups(() => updateEnablement()));
    context.subscriptions.push(
        tabGroupSet.onDidChangeTabs(() => updateEnablement()));
};
~~~

### Enablement

### Recognition of an External Application

### One-Way Default

### Asynchronous I/O

## Conclusions
 
I 