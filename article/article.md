@numbering {
    enable: false
}

{title}Tesseract Act

[*Sergey A Kryukov*](https://www.SAKryukov.org)

A Visual Studio Code *extension*, a convenient UI wrapper for Tesseract OCR — in the VSCode style.
It performs Optical Character Recognition of data found in an image file and opens the recognition result in a text editor.

This tiny extension is also used to explain the general Visual Studio Code extension writing techniques for the cases when an external application is used and when non-text input data needs to be processed.

<!-- URL:
https://www.codeproject.com/Articles/5387592/Tesseract-Act-->
<!-- copy to CodeProject from here ------------------------------------------->

![Tesseract Act Logo](logo.png){id=image-title}

## Contents{no-toc}


@toc

## Motivation

I think we all hate paper documents. But in many cases, we don’t have a choice. Stupid financial, legal, insurance, or government services keep sending us paper-only documents we cannot ignore. In some countries, the so-called *digital government* is notoriously weak if not disastrous. With the combination of a scanner, OCR, and graphical editors, we can still combine paper data and generate maintainable documents in response.

I have started to use Tesseract OCR very recently, with yet another enrollment. Before that time, I only tried different OCR tools, and I rejected Tesseract because its older versions were not Unicode, which is a big no-no. The recent version, however, is quite usable. When I tested it and found it acceptable, I started my practical use of it by crafting a Visual Studio Code extension. When the product matured, I published it on the [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=sakryukov.tesseract-act).

The extension appeared very useful, and convenient, and it became fairly popular. In this article, I would like to share some findings related to specific issues associated with this extension. They are relatively simple but took time to figure out. They are related to two things: 1) processing of non-textual pages, and 2) using an external application.

## Tesseract Introduction

Tesseract can be [installed](https://github.com/tesseract-ocr/tesseract?tab=readme-ov-file#installing-tesseract) on Linux, Windows, and MacOS.

The source code is [available on GitHub](https://github.com/tesseract-ocr/tesseract).

Trained data for additional languages can be installed separately. Trained data for different models can be found in separate `pinned` Git repositories found on the page of the Tesseract OCR account [tesseract-ocr](https://github.com/tesseract-ocr). The simplest way of installing a language pack is copying a single file *.traineddata to the subdirectory "tessdata" of the Tesseract executable directory. The list of currently installed languages can be obtained by the command line:

~~~{lang=Command}
tesseract --list-langs
~~~

For further details, please see the [Tesseract documentation repository](https://github.com/tesseract-ocr/tessdoc).

## Implementation, Issues, and Solutions

### Introduction

The extension Tesseract Act is really a tiny product. It makes it convenient for explanations of some issues. I don't want to explain the entire Visual Studio extension writing concepts but I want to rely on the general reader's knowledge of them. It can better be found in the [original documentation](https://code.visualstudio.com/api). The complete current source code of my extension can always be found in the [code repository](https://github.com/SAKryukov/vscode-tesseract-act).

The user-level documentation can be found on the [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=sakryukov.tesseract-act) or the [code repository](https://github.com/SAKryukov/vscode-tesseract-act).

The extension has only two commands, "Tesseract: Recognize Text" and "Tesseract: Language" and only one parameter in the Settings: "tesseract.executableFileLocation". The user's choice of a language is persistently remembered for the current workspace.

### Event Deficit

A first pretty trivial problem took the most investigation. The problem is that we need to capture the event when an image file of a file type Tesseract OCR can handle is loaded or selected in the editor. We always need such a thing at least to enable or disable the commands related to the application.

The problem is that Visual Studio Code is well-sharpened for text editing but it does not provide the event analogous to the appropriate event for a text file. Here is what can be done quite conveniently for the text files:

~~~{lang=JavaScript}
exports.activate = context =&gt; {
    //...
    // not applicable to the present extension:
    context.subscriptions.push(
        vscode.workspace.onDidOpenTextDocument(
            textDocument =&gt; doSomething(textDocument)));
};
~~~

Additionally, we could use `textDocument.languageId` to do different actions for different languages.

We cannot do the same thing for an arbitrary file. The solution is a bit more complicated. We need to handle the combination of two events, `onDidChangeTabGroups`, and `onDidChangeTabs` --- only the combination covers all the cases. This is how the magic works:

~~~{lang=JavaScript}
exports.activate = context =&gt; {
    //...
    const tabGroupSet = vscode.window.tabGroups;
    context.subscriptions.push(
        tabGroupSet.onDidChangeTabGroups(() =&gt; updateEnablement()));
    context.subscriptions.push(
        tabGroupSet.onDidChangeTabs(() =&gt; updateEnablement()));
};
~~~

I think it is pretty much obvious what `updateEnablement` should do. Please see the [source code](https://github.com/SAKryukov/vscode-tesseract-act) for the comprehensive information. However, I need to clarify how to find the active file and figure out if it applies to the OCR operation.

### Enablement

This is the skeleton of the function `updateEnablement`:

~~~{lang=JavaScript}
exports.activate = context =&gt; {
    vscode.commands.executeCommand(
        definitionSet.commands.setContext,
        definitionSet.commands.setLanguageContext,
        tesseractExecutableFound);
    const isGoodImage = () =&gt; {
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
const activeUri = () =&gt;
    vscode.window?.tabGroups?.activeTabGroup?.activeTab?.input?.uri?.fsPath;
~~~

We also need to find out that the file is supported by Tesseract OCR. We have nothing to do but read the Tesseract documentation listing the set of suffixes indicating compatible file types:

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

Finally, the commands are enabled or disabled using the special command `"setContext"`. This is a string, predefined in the Visual Studio Code API, and `definitionSet.commands.setContext` is equal to this value. The contexts work via the `when` clause declared in "package.json". Please find the lines `"when": "tesseract.act.recognize.enabled"` and `"when": "tesseract.act.language.enabled"` in ["package.json"](https://github.com/SAKryukov/vscode-tesseract-act/blob/main/package.json).

### Recognition of an External Application

The default for the Settings parameter "tesseract.executableFileLocation" is the string `"tesseract"`. It is not necessarily an executable file location, but it can be a `command`. Usually, it works by including the location of an executable part in the system `PATH` for all or certain users. In many cases, I personally avoid `PATH` modifications. Note that the content of the `PATH` is unknown to the Visual Studio Code application, so we cannot directly check the existence of the executable path. Besides, this is not enough.

The Tesseract application is recognized on the activation events (please see `"activationEvents"` in ["package.json"](https://github.com/SAKryukov/vscode-tesseract-act/blob/main/package.json) and on the event triggered when the Settings are changed. This is done by the function `changeConfigurationHandle(context)`, please see its code.

The presence of the Tesseract OCR application does not rely on the existence of the executable file, because the user may enter the name of an unrelated file. Instead, the checkup relies on `childProcess.execSync`. The application is executed and the exceptions are caught to check if it is successful:

~~~{lang=JavaScript}
const commandExists = fileOrCommand =&gt; {
    try {
        childProcess.execSync(
            definitionSet.tesseract.commandLineLanguages(
                fileOrCommand));
    } catch { // all cases
        return false;
    } //exception
    return true;
}; //commandExists
~~~

The Tesseract OCR process is executed synchronously, because the OCR is not actually performed, and it makes the execution fast.

Sometimes this approach is called *offensive* in contrast to not very informative in this case *defensive*.

### One-Way Default

Note that the function `commandExists` works with the command-line parameter passed to Tesseract OCR used to report the installed languages. One of the languages reported can be used as a parameter passed to the application to specify the language for text recognition.

There is one subtle case here: when the language parameter is omitted, the default language is used. This is English. There is no language choice in the UI of the extension because the default means making no choice. When a language is never selected, the status bar item shows: "Tesseract Language: default". When a user chooses any language, there is no way to get back to this condition. The user can only pick a different language, but not get back to the "no choice" condition. Why is it so and how does it work?

Actually, it is possible to get back to the "no choice" situation, but to achieve that, the user needs to delete the workspace cache data. When the user picks up any language from the list, the choice is stored in the workspace state:

~~~{lang=JavaScript}
const setState = (context, language) =&gt; {
    context.workspaceState.update(definitionSet.tesseractLanguageKey, language);
}; //setState
const getState = context =&gt;
    context.workspaceState.get(definitionSet.tesseractLanguageKey);
~~~

A state can be removed by calling `context.workspaceState.update(definitionSet.tesseractLanguageKey, undefined)`, but why?

According to the general VSCode style, I also show the choice in a status bar item created using `vscode.window.createStatusBarItem` and also working as a choice command. When a choice is not yet made, it shows "Tesseract Language: default". When a choice is made at least once, it shows the chosen language, and getting back to the default is not possible. Also, when a user makes the choice, I show the list of available languages, placing an already chosen language on top, and I also make it selected. Please see the function `selectLanguage` for more details.

I could not see any point in showing the default again. It would require an additional redundant UI element, and it would be hard to explain to the user. I can imagine only two kinds of users. One would never choose a language, always working with the default English. A user who changed a language at least once probably knows what language should be used and may need to change the choice consciously, at least for the given workspace. All the currently installed languages are there anyway.

Also, it would make no sense to store the choice per user. Obviously enough, the languages of the documents are only relevant to the workspace where the user works with those documents.

If someone has a different opinion on my decisions related to the default, I would like to know the motivation for it.

### Pathological Cases

The issues with the language selection raise a question: what happens when a user installs or uninstalls the language during the operation?

First of all, changing Tesseract data cannot send any notification to Visual Studio Code when the editor and even the input image files are loaded. The modified list of the installed Tesseract languages will only appear when the user changes the active workspace or reloads the editor.

What can happen when the user uninstalls the language already chosen by the user from Tesseract? It is even possible to uninstall the default language, English, by removing the trained data files.

Let's test it. The missing language is chosen, and the image recognition command is enabled, so let's activate it. We can see the error message:

~~~{lang=Error}
Error opening data file {absolute path to} eng.traineddata
~~~

I think this behavior is fair enough. Of course, it happens because the error information is captured from the child process and transparently represented as a VSCode error message. By the way, for a final point, let's take a quick look at the child process used for the recognition.

### Asynchronous OCR

Finally, let's consider a very well-known, trivial, but quite important aspect: the asynchronous execution of the Tesseract OCR. It is only required when the image is being recognized, as it may take noticeable time. At the same time, it is not very important when the recognition result appears in the editor --- the user may need to do something else during the operation, and it requires the editor's UI to be always responsive.

~~~{lang=JavaScript}
const recognizeText = (context, configuration) =&gt; {
    //...
    const act = () =&gt; {
        childProcess.exec(commandLine, (error, stdout, stderr) =&gt; {
            // examine stdout and strerr for errors,
            // handle them, etc.
            // ...
            if (!error && fileSystem.existsSync(outputFileName))
                vscode.workspace.openTextDocument(outputFileName).
                then(document =&gt;
                    vscode.window.showTextDocument(
                        document, { preview: true }));
        });
    }; //act
    // Figure out if the user's confirmation for file overwrite
    // is required, call act(...) with or without confirmation,
    // or cancel...
}; // recognizeText
~~~

Note the combination of synchronous and asynchronous operation and the two-step callback-*promise* chain, the callback accepted by `childProcess.exec` as a parameter, and the promise created by `vscode.workspace.openTextDocument`.

## Conclusions

I hope that the descriptions of the simple subtleties described in this article cover a wide set of extensions using an external application.

I will gladly try to answer any questions related to Visual Studio Code extension writing in general. I’ll also be much grateful for any questions, comments, suggestions, and especially for criticism.
