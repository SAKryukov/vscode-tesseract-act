@numbering {
    enable: false
}

{title}Tesseract Act

[*Sergey A Kryukov*](https://www.SAKryukov.org)

A Visual Studio Code *extension*, a convenient UI wrapper for Tesseract OCR — in the VSCode style.
It performs Optical Character Recognition of data found in an image file and opens the recognition result in a text editor.

The article on this tiny product explains less-then-obvious problems and solutions for the Visual Studio Code extension developement. It turned to be very useful, convenient and became fairly popular.

<!-- copy to CodeProject from here ------------------------------------------->

![Tesseract Act Logo](logo.png){id=image-title}

## Contents{no-toc}


@toc

## Motivation

I think we all hate paper documents. But in many cases, we don't have a choice. Stupid financial, legal, insurance and govermnent services keep sending us paper-only documents we cannot ignore. In some countries, so called `digital government` is notoriously week if not disastrous. With the combination of a scanner, OCR and graphical editors, we still can combine paper data and generate maintainable documents in response.

I have started to uses Tesseract OCR very recently, with yet another enrollment. Before that time, I only tried different OCR tools, and I rejected Tesseract because its older versions were not Unicode, which is a big no-no. The recent version, however, is quite usable. When I tested it and found acceptable, I started my practical use of it from crafting a Visual Studio Code plugin. When the pluging matured, I've published it on the [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=sakryukov.tesseract-act).

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

~~~{lang=JavaScript}
Microsoft Visual Studio Solution File, Format Version 12.00
# Visual Studio Version 16
VisualStudioVersion = 16.0.30309.148
MinimumVisualStudioVersion = 10.0.40219.1
~~~


### Controls

### Asynchronous I/O

## Conclusions


