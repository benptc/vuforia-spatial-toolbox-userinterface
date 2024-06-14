// TODO: Note for Ben for Monday morning - this is working except it re-updates all the spans' attribute to be the
//  newest value anytime you add a new match for a particular regex. I tried to fix that, but that introduced problems
//  with the caret management inside the spans. Find a way to preserve individual "frozen" attributes per span,
//  without messing with how the caret is currently managed (since that part is finally working correctly).

import { uuidTimeShort } from '../utilities/uuid.js';

class CaretManager {
    static saveCaretPosition(context) {
        let selection = window.getSelection();
        if (selection.rangeCount === 0) return () => {};

        let range = selection.getRangeAt(0);
        let selectedText = range.toString();
        let preCaretRange = range.cloneRange();
        preCaretRange.selectNodeContents(context);
        preCaretRange.setEnd(range.startContainer, range.startOffset);
        let start = preCaretRange.toString().length;

        return {
            restore() {
                let position = CaretManager.getNodeAtPosition(context, start + selectedText.length);
                selection.removeAllRanges();
                let newRange = new Range();
                newRange.setStart(position.node, position.position);
                newRange.setEnd(position.node, position.position);
                selection.addRange(newRange);
            }
        };
    }

    static getNodeAtPosition(root, index) {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
        let node, accumulatedLength = 0;

        while (node = walker.nextNode()) {
            accumulatedLength += node.textContent.length;
            if (accumulatedLength >= index) {
                return { node: node, position: node.textContent.length + index - accumulatedLength };
            }
        }

        return { node: root, position: 0 };
    }
}

class WordMetadataManager {
    constructor() {
        this.metadata = {};
        this.metadataByUuid = {};
    }

    clearMetadata() {
        this.metadata = {};
        this.metadataByUuid = {};
    }

    addMetadata(index, data, textReplacement) {
        if (typeof this.metadata[index] !== 'undefined') return false; // don't replace existing metadata for old matches

        // don't replace existing metadata for something with a matching uuid but different index
        
        let { updatedHtml, uuid, error } = this.addUuidToHtml(textReplacement);
        this.metadata[index] = {
            data: data,
            textReplacement: updatedHtml,
            matchUuid: uuid
        };
        return true;
    }

    addUuidToHtml(htmlString) {
        const uuid = uuidTimeShort();
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlString, 'text/html');
            const element = doc.body.firstChild;

            element.setAttribute('data-match-uuid', uuid);

            return {
                updatedHtml: doc.body.innerHTML,
                uuid: uuid
            };
        } catch (e) {
            console.warn(e);
            return {
                updatedHtml: htmlString,
                uuid: uuid,
                error: e
            };
        }
    }

    removeMetadata(index) {
        delete this.metadata[index];
    }

    removeMetadataNotPartOfIndexSet(indices) {
        Object.keys(this.metadata).forEach(metadataIndex => {
            if (!indices.includes(metadataIndex)) {
                this.removeMetadata(metadataIndex);
            }
        });
    }

    getMetadata(index) {
        return this.metadata[index];
    }
}

class SyntaxHighlightingTextInput {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.wordMetadataManager = new WordMetadataManager();
        this.rules = [];
        this.initEditableDiv();
    }

    initEditableDiv() {
        this.editableDiv = document.createElement('div');
        this.editableDiv.contentEditable = true;
        // this.editableDiv.style.minHeight = '200px';
        // this.editableDiv.style.border = '1px solid #ccc';
        this.editableDiv.style.padding = '10px';
        this.container.appendChild(this.editableDiv);

        this.editableDiv.addEventListener('input', () => this.handleInput());
    }

    addSyntaxRule(regex, replaceFunction) {
        this.rules.push({ regex, replaceFunction });
        this.applySyntaxHighlighting(); // Re-apply highlighting with new rule
    }

    handleInput() {
        const caret = CaretManager.saveCaretPosition(this.editableDiv);
        this.applySyntaxHighlighting();
        caret.restore();
    }

    applySyntaxHighlighting() {
        let text = this.editableDiv.innerText;
        this.editableDiv.innerHTML = this.highlightText(text);
    }

    highlightText(text) {
        let offset = 0; // Offset to handle changes in string length due to replacements
        
        let positionsMatched = new Set();

        for (let rule of this.rules) {
            text = text.replace(rule.regex, (match, ...args) => {
                let position = args[args.length - 2] + offset;
                positionsMatched.add(position);
                
                let replacementData = rule.replaceFunction(match);

                // Update metadata and adjust offset
                let didNewlyAddData = this.wordMetadataManager.addMetadata(position, replacementData.metadata, replacementData.textReplacement);
                if (didNewlyAddData) {
                    console.log(`didNewlyAddData for position: ${position}`);
                }
                let textReplacement = this.wordMetadataManager.getMetadata(position).textReplacement;
                let originalLength = match.length;
                
                let replacementLength = textReplacement.replace(/<[^>]+>/g, "").length;
                offset += replacementLength - originalLength;

                return textReplacement;
            });
        }
        
        console.log(...positionsMatched);
        console.log(this.wordMetadataManager.metadata);
        // this.wordMetadataManager.removeMetadataNotPartOfIndexSet(...positionsMatched);
        
        return text;
    }

    clear() {
        this.editableDiv.innerHTML = '';
        this.wordMetadataManager.clearMetadata();
    }
}

export {
    SyntaxHighlightingTextInput
}
