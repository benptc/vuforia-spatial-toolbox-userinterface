import { uuidTimeShort } from '../utilities/uuid.js';
import * as THREE from "../../thirdPartyCode/three/three.module.js";

class LinkedWord {
    constructor(word, userInput, textReplacer) {
        this.word = word;
        this.userInput = userInput;
        this.id = LinkedWord.generateId();
        this.textReplacer = textReplacer;
    }

    static generateId() {
        LinkedWord.counter = (LinkedWord.counter || 0) + 1;
        return `linked-${LinkedWord.counter}_${uuidTimeShort()}`;
    }
}

export class WordLinker {
    constructor(inputAreaId, displayAreaId) {
        this.inputArea = document.getElementById(inputAreaId);
        this.displayArea = document.getElementById(displayAreaId);
        this.dataStructure = [];
        this.init();
        this.spanEventListeners = {};
        this.animations = {};

        this.displayArea.addEventListener('mouseover', (e) => {
            if (!e.target) return;
            if (!e.target.classList.contains('wordLinker-link')) return;

            console.log(e.target);
            let rect = e.target.getBoundingClientRect();
            this.setHighlight(e.target.id, true, {x: rect.x + rect.width / 2, y: rect.y + rect.height / 2});
            e.target.addEventListener('mousedown', this.onSpanMouseDown.bind(this));
            e.target.addEventListener('mouseleave', this.onSpanMouseLeave.bind(this));
        });

        // this.monitorCaretForHighlights();
    }

    // TODO: this is experimental and not working yet. goals is to activate the highlight line when caret is on the word
    monitorCaretForHighlights() {
        // Assuming `textInput` is your input element and `displayArea` contains your spans
        // const textInput = document.getElementById('yourTextInputId');

        const handleCaretPosition = () => {
            const caretPos = this.inputArea.selectionStart;

            // Reset highlights for all spans initially
            this.displayArea.querySelectorAll('.wordLinker-link').forEach(span => {
                let spanIndices = getSpanIndices(this.displayArea.id, span.id);
                // Check if the caret is within this span's text
                if (caretPos >= spanIndices.start && caretPos <= spanIndices.end) {
                    // activeSpans.push(span);
                    const rect = span.getBoundingClientRect();
                    this.setHighlight(span.id, true, {x: rect.x + rect.width / 2, y: rect.y + rect.height / 2});
                } else {
                    this.setHighlight(span.id, false);
                }
            });
        };

        const getSpanIndices = (divId, spanId) => {
            const div = document.getElementById(divId);
            const span = document.getElementById(spanId);

            // Create a range for the entire contents of the div
            const range = document.createRange();
            range.selectNodeContents(div);

            // Create a range for the span
            const spanRange = document.createRange();
            spanRange.selectNode(span);

            // Calculate the start and end positions of the span within the div
            const startPosition = range.toString().indexOf(spanRange.toString());
            const endPosition = startPosition + spanRange.toString().length;

            return { start: startPosition, end: endPosition };
        }

        this.inputArea.addEventListener('keyup', handleCaretPosition);
        this.inputArea.addEventListener('input', handleCaretPosition);
    }

    setHighlight(highlightId, isHighlighted, startPos) {
        let animation = this.animations[highlightId];
        if (!isHighlighted) {
            if (!animation) return;
            animation.hoveredFrameId = null;
            realityEditor.gui.recentlyUsedBar.removeAnimation(animation);
            delete this.animations[highlightId];
            return;
        }

        if (!animation) {
            animation = realityEditor.gui.recentlyUsedBar.createAnimation(highlightId, false, true, startPos);
            this.animations[highlightId] = animation;
        } else {
            animation.hoveredFrameId = highlightId;
        }
    }

    onSpanMouseDown(e) {
        console.log(`clicked on ${e.target.id}`)
        // realityEditor.ai.focusOnFrame(e.target.id);
    }

    onSpanMouseLeave(e) {
        this.setHighlight(e.target.id, false);
        e.target.removeEventListener('mousedown', this.onSpanMouseDown);
        e.target.removeEventListener('mouseleave', this.onSpanMouseLeave);
    }

    init() {
        this.inputArea.addEventListener('input', this.handleInput.bind(this));
    }

    async handleInput() {
        const text = this.inputArea.value;
        // this.rebuildDataStructure(text);
        await this.processText(text);
        // this.addSpanEventListenersWhereNeeded();
    }

    addSpanEventListenersWhereNeeded() {
        Array.from(this.displayArea.querySelectorAll('.wordLinker-link')).forEach(span => {
            if (typeof this.spanEventListeners[span.id] !== 'undefined') return;

            // span.addEventListener('')

            // dialogueContainer.addEventListener('mouseover', (e) => {
            //     currentDiv = e.target;
            //     if (currentDiv.classList.contains('ai-highlight')) {
            //         if (currentDiv.dataset.id.includes('_part_')) {
            //             // console.log('mouseover part', currentDiv);
            //         }
            //         if (currentDiv.dataset.id.match(avatarRegex)) {
            //             // todo Steve: make a line link to the corresponding avatar icon? Or turn camera to the avatar cube?
            //         } else if (currentDiv.dataset.id.match(toolRegex)) {
            //             let rect = currentDiv.getBoundingClientRect();
            //             setFrameHighlight(currentDiv.dataset.id, true, {x: rect.x + rect.width / 2, y: rect.y + rect.height / 2});
            //
            //             currentDiv.addEventListener('mousedown', onMouseDown);
            //
            //             currentDiv.addEventListener('mouseleave', onMouseLeave);
            //         }
            //     }
            // })
        });
    }

    async processText(text) {
        const words = text.split(/\s+/);
        // let newHTML = '';

        // let positions = new Map();  // Keeps track of word positions for uniqueness
        // words.forEach(async (word, index) => {
        //     let count = positions.get(word) || 0;
        //     positions.set(word, count + 1);  // Increment position count for this word
        //    
        //     let addedSensor = await this.linkToSensorIfNeeded(word, count);
        //    
        //     if (addedSensor) {
        //         console.log('added sensor', addedSensor);
        //     }
        //
        //     const entry = this.dataStructure.find(entry => entry.word === word && entry.count === count);
        //     newHTML += entry ? `<span class="wordLinker-link" id="wordLinker-span-${entry.linkedWord.id}" style="color: cyan;" data-id="${entry.linkedWord.id}" data-user-input="${entry.linkedWord.userInput}">${word}</span> ` : `${word} `;
        // });

        let newHTML = await this.processWordsIntoHTML(words);

        this.displayArea.innerHTML = newHTML.trim();
    }

    async processWordsIntoHTML(words) {
        let positions = new Map();  // Keeps track of word positions for uniqueness
        let newHTML = '';
    
        for (let word of words) {
            let count = positions.get(word) || 0;
            positions.set(word, count + 1);  // Increment position count for this word
    
            let addedSensor = await this.linkToSensorIfNeeded(word, count);
    
            if (addedSensor) {
                console.log('added sensor', addedSensor);
            }
    
            const entry = this.dataStructure.find(entry => entry.word === word && entry.count === count);
            newHTML += entry ? `<span class="wordLinker-link" id="wordLinker-span-${entry.linkedWord.id}" style="color: cyan;" data-id="${entry.linkedWord.id}" data-user-input="${entry.linkedWord.userInput}">${word}</span> ` : `${word} `;
        }
        
        return newHTML;
    }

    async linkToSensorIfNeeded(word, count) {
        return new Promise(async (resolve, reject) => {
            const WORDS_TO_MATCH = ['here']; // ['here', 'there'];
            if (WORDS_TO_MATCH.includes(word) && !this.isAlreadyLinked(word, count)) {
                // const userInput = prompt(`Please enter data for "${word}"`);
                let userInput = this.getMyCursorPosition();
                if (userInput) {
                    let spatialSensorFrame = await this.addSpatialSensorHere(JSON.parse(userInput));
                    // const linkedWord = new LinkedWord(word, userInput);
                    const linkedWord = new LinkedWord(word, spatialSensorFrame.uuid);
                    this.dataStructure.push({ word: word, linkedWord: linkedWord, count: count });
                    realityEditor.ai.chatInterface.spatialUuidMapper.updateSimpleSpatialReference(`wordLinker-span-${linkedWord.id}`, JSON.parse(userInput));
                    resolve(spatialSensorFrame);
                }
            }
            resolve(null);
        });
    }

    async addSpatialSensorHere(_position3d) {
        return new Promise((resolve, reject) => {
            // noinspection JSCheckFunctionSignatures
            realityEditor.spatialCursor.addToolAtScreenCenter('spatialSensor', {
                moveToCursor: true,
                onToolUploadComplete: (frame) => {
                    console.log('spatial sensor added', frame);
                    resolve(frame);
                }
            });
        });
    }

    isAlreadyLinked(word, count) {
        return this.dataStructure.some(entry => entry.word === word && entry.count === count);
    }

    getMyCursorPosition() {
        let myAvatarId = realityEditor.avatar.getMyAvatarId();
        let myAvatarObject = realityEditor.getObject(myAvatarId);
        if (!myAvatarObject) return null;
        let avatarNodePath = realityEditor.avatar.utils.getAvatarNodeInfo(myAvatarObject);
        let node = realityEditor.getNode(avatarNodePath.objectKey, avatarNodePath.frameKey, avatarNodePath.nodeKey);
        let userProfile = node.publicData.userProfile;
        let cursorState = node.publicData.cursorState;
        // return realityEditor.avatar.utils.getAvatarName();
        return JSON.stringify([Math.round(cursorState.matrix.elements[12]),
            Math.round(cursorState.matrix.elements[13]),
            Math.round(cursorState.matrix.elements[14])]);
    }

    clearAll() {
        // Reset highlights for all spans initially
        this.displayArea.querySelectorAll('.wordLinker-link').forEach(span => {
            this.setHighlight(span.id, false);
        });

        // Clear both the input area and the display area
        this.inputArea.value = '';
        this.displayArea.innerHTML = '';

        // Reset the data structure
        this.dataStructure = [];

        // Optionally, reset other internal states if necessary
    }
}
