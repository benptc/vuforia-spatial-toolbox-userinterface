createNameSpace("realityEditor.ai");

import { ChatInterface } from './ChatInterface.js';
import { WordLinker } from './WordLinker.js';
// import { SyntaxHighlightingTextInput } from './SyntaxHighlightingTextInput.js';

/**
 * @fileOverview - Note: most of the AI system has been refactored to ChatInterface.js and associated classes
 * This file currently contains some code that connects the logic of the ChatInterface with the actual GUI of
 * the chat DOM elements, and some helper functions for interacting with those DOM elements.
 * @todo: Most of this can probably eventually be refactored out of here and into additional AI classes.
 */
(function(exports) {
    
    let callbackHandler = new realityEditor.moduleCallbacks.CallbackHandler('ai');
    let chatInterface = null;
    let wordLinker = null;
    // let syntaxHighlightingTextInput = null;

    function registerCallback(functionName, callback) {
        if (!callbackHandler) {
            callbackHandler = new realityEditor.moduleCallbacks.CallbackHandler('ai');
        }
        callbackHandler.registerCallback(functionName, callback);
    }

    function focusOnFrame(frameKey) {

        let spatialReference = chatInterface.spatialUuidMapper.spatialReferenceMap[frameKey];
        if (spatialReference) {
            // console.log(`found ${this.hoveredFrameId} in spatialReferenceMap`);
            let position3d = realityEditor.gui.threejsScene.convertToVector3(spatialReference.position);

            // console.log(partInfo);
            let floorOffset = realityEditor.gui.ar.areaCreator.calculateFloorOffset();
            // let partPosition = new THREE.Vector3(partInfo.position.x, partInfo.position.y - floorOffset, partInfo.position.z);
            // let framePosition = realityEditor.gui.threejsScene.getToolPosition(frameKey);

            position3d.y -= floorOffset; // TODO: is this correction always necessary? is there a cleaner place to add it?
            
            let cameraPosition = realityEditor.gui.threejsScene.getCameraPosition();
            let cameraDirection = cameraPosition.clone().sub(position3d).normalize();
            callbackHandler.triggerCallbacks('shouldFocusVirtualCamera', {
                pos: {x: position3d.x, y: position3d.y, z: position3d.z},
                dir: {x: cameraDirection.x, y: cameraDirection.y, z: cameraDirection.z},
                zoomDistanceMm: 1000
            });

        } else {
            let framePosition = realityEditor.gui.threejsScene.getToolPosition(frameKey);
            let cameraPosition = realityEditor.gui.threejsScene.getCameraPosition();
            let frameDirection = cameraPosition.clone().sub(framePosition).normalize();
            callbackHandler.triggerCallbacks('shouldFocusVirtualCamera', {
                pos: {x: framePosition.x, y: framePosition.y, z: framePosition.z},
                dir: {x: frameDirection.x, y: frameDirection.y, z: frameDirection.z},
                zoomDistanceMm: 3000
            });
        }
    }
    
    function onAvatarChangeName(oldName, _newName) {
        // todo Steve: after switching from getavatarIdFromSessionId() to getAvatarObjectKeyFromSessionId(), this still stays the old way. Need to change later
        let _timestamp = getFormattedTime();
        if (oldName === null) {
            // let newInfo = `User ${newName} joined the space at ${timestamp}`;
            // aiPrompt += `\n${newInfo}`;
        } else {
            // let newInfo = `User ${oldName} has changed their name to ${newName}`;
            // aiPrompt += `\n${newInfo}`;
        }
    }
    
    function getFormattedTime() {
        return new Date().toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    }

    let aiContainer;
    let endpointArea, apiKeyArea;
    let searchTextArea;
    let aiInputArea;
    let dialogueContainer;
    
    let keyPressed = {
        'Shift': false,
        'Enter': false,
    };
    let map;
    
    function initService() {
        aiContainer = document.getElementById('ai-chat-tool-container');
        endpointArea = document.getElementById('ai-endpoint-text-area');
        apiKeyArea = document.getElementById('ai-api-key-text-area');
        searchTextArea = document.getElementById('searchTextArea');
        searchTextArea.style.display = 'none'; // initially, before inputting endpoint and api key, hide the search text area
        aiInputArea = document.getElementById('aiInputArea');
        dialogueContainer = document.getElementById('ai-chat-tool-dialogue-container');

        map = realityEditor.ai.mapping;
        map.setupEventListeners();
        
        scrollToBottom();
        initTextAreaSize();
        adjustTextAreaSize();
        setupEventListeners();
        // setupSystemEventListeners();
        hideEndpointApiKeyAndShowSearchTextArea();

        // This is where the magic happens
        chatInterface = new ChatInterface();

        // Note: temporarily exposed as global variable for experimental purposes.
        // If possible, minimize the use of directly accessing this outside of the ai modules.
        realityEditor.ai.chatInterface = chatInterface;
    }

    /**
     * This provides an alternative way to update the AI system's knowledge of the state of a tool.
     * The primary method is using the languageInterface.updateSummarizedState API within iframes.
     *
     * @param {string} toolId
     * @param {string} stateSummary - While JSON would work (or JSON.stringified object), I hypothesize that it works
     *                                best wrapped in a bit of natural language, e.g. `The tool has ${numLines} lines.`
     */
    function updateSummarizedState(toolId, stateSummary) {
        if (!chatInterface) {
            console.warn('updateSummarizedState: chatInterface not initialized yet');
            return;
        }
        
        if (!chatInterface.objectDataModelSource) {
            console.warn('updateSummarizedState: chatInterface doesnt have a objectDataModelSource');
            return;
        }

        chatInterface.objectDataModelSource.updateSummarizedState({
            applicationId: toolId,
            summarizedState: stateSummary
        });
    }
    
    function displayAnswer(answer) {
        // let html = map.postprocess(answer);
        // console.log(map.postprocessBen(answer));

        // let html = map.postprocessBen(answer);
        // pushAIDialogue(html);

        let html = answer.replace(/\n/g, '<br>');
        let d = document.createElement('div');
        d.classList.add('ai-chat-tool-dialogue', 'ai-chat-tool-dialogue-ai');
        d.innerHTML = html;
        pushAIDialogue(d);
    }

    function showDialogue() {
        aiContainer.style.animation = `slideToRight 0.2s ease-in forwards`;
        setTimeout(() => {
            // let searchArea = document.getElementById('searchTextArea');
            // searchArea.focus();
            aiInputArea.focus();
        }, 500);
    }
    
    function hideDialogue() {
        aiContainer.style.animation = `slideToLeft 0.2s ease-in forwards`;
    }
    
    function hideEndpointApiKeyAndShowSearchTextArea() {
        endpointArea.style.display = 'none';
        apiKeyArea.style.display = 'none';
        searchTextArea.style.display = 'block';
        adjustTextAreaSize();
    }

    function setupEventListeners() {
        // endpointArea.addEventListener('keydown', (e) => {
        //     e.stopPropagation();
        //     if (e.key === 'Enter') {
        //         e.preventDefault();
        //         if (endpointArea.value === '' || apiKeyArea.value === '') return;
        //         realityEditor.network.postAiApiKeys(endpointArea.value, apiKeyArea.value, true);
        //     }
        // })
        // apiKeyArea.addEventListener('keydown', (e) => {
        //     e.stopPropagation();
        //     if (e.key === 'Enter') {
        //         e.preventDefault();
        //         if (endpointArea.value === '' || apiKeyArea.value === '') return;
        //         realityEditor.network.postAiApiKeys(endpointArea.value, apiKeyArea.value, true);
        //     }
        // })
        //
        // searchTextArea.addEventListener('input', function() {
        //     // adjustTextAreaSize();
        // });
        
        [aiInputArea].forEach(area => {
            area.addEventListener('pointerdown', (e) => {e.stopPropagation();});
        });
        [aiInputArea].forEach(area => {
            area.addEventListener('pointerup', (e) => {e.stopPropagation();});
        });
        [aiInputArea].forEach(area => {
            area.addEventListener('pointermove', (e) => {e.stopPropagation();});
        });
        [aiInputArea].forEach(area => {
            area.addEventListener('contextmenu', (e) => {e.stopPropagation();});
        });

        [aiInputArea].forEach(area => {
            area.addEventListener('keydown', (e) => {
                e.stopPropagation();
                adjustTextAreaSize();

                if (e.key === 'Enter') {
                    e.preventDefault();
                    keyPressed['Enter'] = true;

                    if (keyPressed['Shift'] === true) {
                        // searchTextArea.innerHTML += '\n';
                        // searchTextArea.value += '\n';
                        adjustTextAreaSize();
                        return;
                    }

                    // pushMyDialogue(searchTextArea.value);

                    let processedInput = replaceSpansWithUserData(searchTextArea);
                    // let processedInput = replaceSpansWithUserData(aiInputArea.firstChild);

                    pushMyDialogue(processedInput);
                    // pushMyDialogue(searchTextArea.innerHTML);
                    clearMyDialogue();
                    adjustTextAreaSize();
                } else if (e.key === 'Shift') {
                    e.preventDefault();
                    keyPressed['Shift'] = true;

                    if (keyPressed['Enter'] === true) {
                        adjustTextAreaSize();
                    }
                }
            });
        });

        [aiInputArea].forEach(area => {
            area.addEventListener('keyup', (e) => {
                e.stopPropagation();

                if (e.key === 'Enter') {
                    keyPressed['Enter'] = false;
                } else if (e.key === 'Shift') {
                    keyPressed['Shift'] = false;
                }
            });
        });

        window.addEventListener('blur', () => {
            keyPressed['Enter'] = false;
            keyPressed['Shift'] = false;
        });

        dialogueContainer.addEventListener('wheel', (e) => {
            e.stopPropagation();
        });

        window.addEventListener('resize', () => {
            adjustTextAreaSize();
        });
        
        // addLinkingFunctionalityToUserInput();

        // document.getElementById('searchTextArea').addEventListener('click', function() {
        //     document.getElementById('aiInputArea').focus();
        // });

        // Usage
        // let _hereAndThereLinker = new WordLinker('searchTextArea');
        wordLinker = new WordLinker('aiInputArea', 'searchTextArea');

        // syntaxHighlightingTextInput = new SyntaxHighlightingTextInput('aiInputArea');
        //
        // syntaxHighlightingTextInput.addSyntaxRule(/\b(now)\b/gi, (match) => {
        //     console.log(`process rule for ${match}`);
        //     return {
        //         textReplacement: `<span style="color: greenyellow;" data-user-input="${new Date().toISOString()}">${match}</span>`,
        //         metadata: { timestamp: new Date().toISOString() }
        //     };
        // });
        //
        // syntaxHighlightingTextInput.addSyntaxRule(/\b(here|there)\b/gi, (match) => {
        //     let cursorPosition = getMyCursorPosition();
        //     return {
        //         textReplacement: `<span style="color: cyan;" data-user-input="${cursorPosition}">${match}</span>`,
        //         metadata: {position: cursorPosition}
        //     };
        // });
        //
        // syntaxHighlightingTextInput.addSyntaxRule(/\b(communication|spatialDraw|thingview)\b/gi, (match) => {
        //     let toolPosition = JSON.stringify([0,0,0]); // TODO: get tool position or toolID //getMyCursorPosition();
        //     return {
        //         textReplacement: `<span style="color: yellow;" data-user-input="${toolPosition}">${match}</span>`,
        //         metadata: {position: toolPosition}
        //     };
        // });
        // window.textInput = syntaxHighlightingTextInput;
    }

    function getMyCursorPosition() {
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
    
    // let dataStructure = [];
    //
    // function addLinkingFunctionalityToUserInput() {
    //     const searchTextArea = document.getElementById('searchTextArea');
    //
    //     // Initial content load (if there's initial content to process)
    //     searchTextArea.innerHTML = recomputeInnerHTML(searchTextArea.innerText, dataStructure);
    //
    //     searchTextArea.addEventListener('keyup', function(e) {
    //         const text = this.innerText;
    //         const words = text.split(' ');
    //         const lastWord = words[words.length - 1];
    //
    //         if (e.key === ' ' && (lastWord.trim() === 'here' || lastWord.trim() === 'there')) {
    //             const previousElement = this.childNodes[this.childNodes.length - 1];
    //             if (previousElement.nodeType === 3) {  // Node.TEXT_NODE is 3
    //                 const userInput = prompt('Please enter data for "' + lastWord.trim() + '"');
    //                 if (userInput) {
    //                     const span = document.createElement('span');
    //                     span.style.color = 'cyan';
    //                     span.dataset.userInput = userInput;
    //                     span.innerText = lastWord.trim() + ' ';
    //                     words[words.length - 1] = span.outerHTML;
    //                     this.innerHTML = words.join(' ') + ' ';  // Ensure space after span
    //                     placeCaretAtEnd(this);
    //
    //                     // Update dataStructure
    //                     dataStructure = updateDataStructure(this.innerHTML, dataStructure);
    //                 }
    //             }
    //         }
    //     });
    //
    //     searchTextArea.addEventListener('input', function(e) {
    //         // Update dataStructure
    //         dataStructure = updateDataStructure(this.innerHTML, dataStructure);
    //         // Remove spans if their content is modified
    //         removeInvalidSpans(this);
    //     });
    //
    //     function placeCaretAtEnd(el) {
    //         el.focus();
    //         if (typeof window.getSelection != "undefined" && typeof document.createRange != "undefined") {
    //             const range = document.createRange();
    //             range.selectNodeContents(el);
    //             range.collapse(false);
    //             const sel = window.getSelection();
    //             sel.removeAllRanges();
    //             sel.addRange(range);
    //         } else if (typeof document.body.createTextRange != "undefined") {
    //             const textRange = document.body.createTextRange();
    //             textRange.moveToElementText(el);
    //             textRange.collapse(false);
    //             textRange.select();
    //         }
    //     }
    //
    //     function updateDataStructure(innerHTML, dataStructure) {
    //         const tempDiv = document.createElement('div');
    //         tempDiv.innerHTML = innerHTML;
    //
    //         let newDataStructure = [];
    //         let idCounters = { 'here': 0, 'there': 0 };
    //
    //         tempDiv.childNodes.forEach(node => {
    //             if (node.nodeType === 3) {  // Node.TEXT_NODE is 3
    //                 const words = node.textContent.split(' ');
    //                 words.forEach(word => {
    //                     if (word === 'here' || word === 'there') {
    //                         const id = word + idCounters[word]++;
    //                         newDataStructure.push({ id: id, wordMatch: word, associatedData: '' });
    //                     }
    //                 });
    //             } else if (node.nodeType === 1 && node.tagName === 'SPAN') {  // Node.ELEMENT_NODE is 1
    //                 const wordMatch = node.innerText.trim();
    //                 const associatedData = node.dataset.userInput;
    //                 const id = wordMatch + idCounters[wordMatch]++;
    //                 newDataStructure.push({ id: id, wordMatch: wordMatch, associatedData: associatedData });
    //             }
    //         });
    //
    //         return newDataStructure;
    //     }
    //
    //     function recomputeInnerHTML(rawUserText, dataStructure) {
    //         const words = rawUserText.split(' ');
    //         let html = '';
    //         let idCounters = { 'here': 0, 'there': 0 };
    //
    //         words.forEach(word => {
    //             if (word === 'here' || word === 'there') {
    //                 const id = word + idCounters[word]++;
    //                 const entry = dataStructure.find(e => e.id === id);
    //                 if (entry) {
    //                     html += `<span style="color: cyan;" data-user-input="${entry.associatedData}">${word}</span> `;
    //                 } else {
    //                     html += word + ' ';
    //                 }
    //             } else {
    //                 html += word + ' ';
    //             }
    //         });
    //
    //         return html.trim();
    //     }
    //
    //     function removeInvalidSpans(el) {
    //         const spans = el.querySelectorAll('span[data-user-input]');
    //         spans.forEach(span => {
    //             const word = span.innerText.trim();
    //             if (word !== 'here' && word !== 'there') {
    //                 // Replace span with its text content
    //                 span.outerHTML = span.innerText;
    //             }
    //         });
    //     }
    // }

    let originalHeight = null;
    function initTextAreaSize() {
        originalHeight = aiInputArea.scrollHeight;
    }
    
    function adjustTextAreaSize() {
        // aiInputArea.style.flexShrink = '1';
        // aiInputArea.style.height = 'auto';
        if (aiInputArea.scrollHeight > window.innerHeight / 4) {
            aiInputArea.style.height = (window.innerHeight / 4) + 'px';
        } else {
            aiInputArea.style.height = (aiInputArea.scrollHeight) + 'px';
            // todo Steve: this function is buggy, doesn't return the smallest scroll height of the text box
        }
        // aiInputArea.style.flexShrink = '0';
    }
    
    function resetTextAreaSize() {
        if (originalHeight === null) {
            originalHeight = aiInputArea.scrollHeight;
            aiInputArea.style.height = originalHeight + 'px';
        } else {
            aiInputArea.style.height = originalHeight + 'px';
        }
    }

    function getMostRecentMessage() {
        if (dialogueContainer.childElementCount === 0) return null;
        let mostRecentMessageDiv = dialogueContainer.lastChild;

        return {
            role: "user",
            content: `${map.preprocess(mostRecentMessageDiv.innerHTML)}`
        }
    }

    function replaceSpansWithUserData(divContainingFormattedText) {
        let htmlContent = divContainingFormattedText.innerHTML;

        // Regular expression to match each span with its data-user-input attribute
        const regex = /<span[^>]*data-user-input="([^"]*)"[^>]*>([^<]*)<\/span>/g;

        // Replace each span with the value of its data-user-input attribute
        htmlContent = htmlContent.replace(regex, (match, userData) => `location of ${userData}`);

        return htmlContent;
    }

    function pushMyDialogue(text) {
        if (!text.trim()) {
            console.log('error');
            return;
        }
        let d = document.createElement('div');
        d.classList.add('ai-chat-tool-dialogue', 'ai-chat-tool-dialogue-my');
        d.innerText = text;
        dialogueContainer.append(d);
        realityEditor.avatar.network.sendAiDialogue(realityEditor.avatar.getMyAvatarNodeInfo(), d.outerHTML);
        scrollToBottom();

        chatInterface.askQuestion(getMostRecentMessage().content);
    }

    function pushAIDialogue(html) {
        dialogueContainer.append(html);
        realityEditor.avatar.network.sendAiDialogue(realityEditor.avatar.getMyAvatarNodeInfo(), html.outerHTML);
        scrollToBottom();
    }

    // TODO: adapt multi-user conversations to ensure compatibility with new ChatHistory class
    function pushDialogueFromOtherUser(html) {
        dialogueContainer.insertAdjacentHTML('beforeend', html);
    }

    function scrollToBottom() {
        dialogueContainer.scrollTop = dialogueContainer.scrollHeight;
    }

    function clearMyDialogue() {
        // syntaxHighlightingTextInput.clear();
        // aiInputArea.innerHTML = '';
        // aiInputArea.innerHTML = '';
        wordLinker.clearAll();
        resetTextAreaSize();
    }

    exports.initService = initService;
    exports.registerCallback = registerCallback;
    exports.displayAnswer = displayAnswer;
    exports.pushDialogueFromOtherUser = pushDialogueFromOtherUser;
    exports.onAvatarChangeName = onAvatarChangeName;
    exports.showDialogue = showDialogue;
    exports.hideDialogue = hideDialogue;
    exports.hideEndpointApiKeyAndShowSearchTextArea = hideEndpointApiKeyAndShowSearchTextArea;
    exports.focusOnFrame = focusOnFrame;
    exports.updateSummarizedState = updateSummarizedState;
    
}(realityEditor.ai));
