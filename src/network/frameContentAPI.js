createNameSpace("realityEditor.network.frameContentAPI");

/**
 * @fileOverview realityEditor.network.frameContentAPI.js
 * Provides a central interface for transmitting data to the Frames and Nodes
 * @todo: finish moving other functionality here
 */

(function(exports) {
    
    let lastSentMatrices = {};

    /**
     * Public init method sets up module by registering callbacks when important events happen in other modules
     */
    function initService() {
        realityEditor.device.keyboardEvents.registerCallback('keyUpHandler', keyUpHandler);
        realityEditor.device.keyboardEvents.registerCallback('keyboardHidden', onKeyboardHidden);
        
        realityEditor.gui.pocket.registerCallback('frameAdded', onFrameAdded);

        realityEditor.device.registerCallback('vehicleDeleted', onVehicleDeleted);
        realityEditor.network.registerCallback('vehicleDeleted', onVehicleDeleted);

        realityEditor.gui.ar.draw.registerCallback('fullScreenEjected', onFullScreenEjected);

        realityEditor.sceneGraph.network.onObjectLocalized(worldIdUpdated);

        setupInternalPostMessageListeners();
    }

    function setupInternalPostMessageListeners() {
        realityEditor.network.addPostMessageHandler('sendCoordinateSystems', (msgContent, fullMessage) => {
            let frame = realityEditor.getFrame(fullMessage.object, fullMessage.frame);
            if (!frame) return;
            frame.sendCoordinateSystems = msgContent;
            console.log('frame was told to send coordinate systems', frame.sendCoordinateSystems);
        });

        // add handler for tools to programmatically store the current camera position/direction
        realityEditor.network.addPostMessageHandler('requestTextInput', (msgContent, fullMessageData) => {
            try {
                let existingCard = document.getElementById('apiTextInputCard');
                if (existingCard) {
                    // throw new Error('There is already a text input pending, cant ask for another yet.');

                    // send error message into the frame that requested the capture
                    realityEditor.network.postMessageIntoFrame(fullMessageData.frame, {
                        textInputError: {
                            reason: 'There is already a text input pending, cant ask for another yet.'
                        }
                    });
                    return;
                }

                // let cameraPerspective = getCameraPositionDirection();
                addInputNameCard(msgContent.modalTitle, msgContent.modalDescription, (textResult) => {
                    // send texture and depth texture to the frame that requested the capture
                    realityEditor.network.postMessageIntoFrame(fullMessageData.frame, {
                        textInputData: textResult
                    });
                    removeTextInputCard();
                }, () => {
                    // throw new Error('The user cancelled the text input.');

                    // send error message into the frame that requested the capture
                    realityEditor.network.postMessageIntoFrame(fullMessageData.frame, {
                        textInputError: {
                            reason: 'The user cancelled the text input.'
                        }
                    });
                    removeTextInputCard();
                });

            } catch (e) {
                // send error message into the frame that requested the capture
                realityEditor.network.postMessageIntoFrame(fullMessageData.frame, {
                    textInputError: {
                        reason: e.message
                    }
                });
                removeTextInputCard();
            }
        });
    }

    function removeTextInputCard() {
        let existingCard = document.getElementById('text-input-view-card-container');
        if (existingCard) {
            existingCard.parentElement.removeChild(existingCard);
        }
    }

    let viewCardContainer = null;
    function addInputNameCard(modalTitle = 'Enter Text', modalDescription = '', onConfirm, onCancel) {
        if (!viewCardContainer) {
            viewCardContainer = document.createElement('div');
            viewCardContainer.id = 'text-input-view-card-container';
        }
        viewCardContainer.innerHTML = '';
        document.body.appendChild(viewCardContainer);

        let innerHTML = `
            <h3>${modalTitle}</h3>
            ${modalDescription ? `<p>${modalDescription}</p>` : ''}
<!--            <p>Set a name to identify this metaverse.</p>-->
        `;
        // const defaultName = this.getDefaultName();
        let card = constructCardDom(innerHTML, 'Confirm', 'Cancel'); //new PopUpModal(innerHTML, 'Set Metaverse Name', 'Use Default Name');
        card.id = 'apiTextInputCard';
        // card.style.position = 'absolute';
        
        function addViewCard() {
            let card = document.createElement('div');
            card.classList.add('viewCard');
            return card;
        }

        function addCardDarkButton(id, innerText, parent, onPointerDown) {
            if (innerText !== null) {
                let button = document.createElement('div');
                button.id = id;
                button.classList.add('cardButtonDark');
                button.innerText = innerText;
                // this.addClickEventListener(button, onPointerDown);
                button.addEventListener('pointerdown', onPointerDown);
                parent.appendChild(button);
                return button;
            }
        }
        function addCardLightButton(id, innerText, parent, onPointerDown) {
            if (innerText !== null) {
                let button = document.createElement('div');
                button.id = id;
                button.classList.add('cardButtonLight');
                button.innerText = innerText;
                // this.addClickEventListener(button, onPointerDown);
                button.addEventListener('pointerdown', onPointerDown);
                parent.appendChild(button);
                return button;
            }
        }
        
        function constructCardDom(innerHTML, confirmLabel, cancelLabel) {
            let card = addViewCard();
            card.classList.add('center', 'popUpModal');

            let cardText = document.createElement('div');
            cardText.classList.add('popUpModalText');
            cardText.innerHTML = innerHTML;
            card.appendChild(cardText);

            /* Added div for 'children' and other elements for modal. In the future the input element of
             TextInputModal.js could be added here */
            let cardChildElements = document.createElement('div');
            cardChildElements.classList.add('popUpModalElementsDiv');
            card.appendChild(cardChildElements);

            if (confirmLabel !== null) {
                let confirmButton = addCardDarkButton('confirmModalButton', confirmLabel, card, () => {
                    // this.triggerButtonCallbacks('confirmModalButton', { button: exitButton });
                    console.log('confirm');
                    onConfirm(input.value);
                    // viewCardContainer.removeChild(card);
                    removeTextInputCard();
                });
                // this.setupButtonVisualFeedback(exitButton, 'introButtonPressed');
                confirmButton.style.pointerEvents = 'auto';
            }

            if (cancelLabel !== null) {
                let cancelButton = addCardLightButton('cancelModalButton', cancelLabel, card, () => {
                    // this.triggerButtonCallbacks('cancelModalButton', { button: cancelButton });
                    console.log('cancel');
                    onCancel();
                    // viewCardContainer.removeChild(card);
                    removeTextInputCard();
                });
                // this.setupButtonVisualFeedback(cancelButton, 'introButtonPressed');
                cancelButton.style.pointerEvents = 'auto';
            }
            return card;
        }

        //Create an input element
        let input = document.createElement('input');
        input.setAttribute('type', 'text');
        input.setAttribute('placeholder', 'Enter text...');
        input.classList.add('popUpModalTextInput');

        input.addEventListener('keydown', function(event) {
            // Do something with the event, for example, log the key
            // console.log('Input field key:', event.key);
            // Stop the event from propagating to the document
            event.stopPropagation();
        });

        //Add the input element to the child elements div in PopUpModal.js
        let cardBody = card.querySelector('.popUpModalElementsDiv'); //card.dom.getElementsByClassName('popUpModalElementsDiv');
        cardBody.appendChild(input);

        // card.registerButtonCallback('confirmModalButton', () => {
        //     if (input.value.length > 0) {
        //         // this.tryUpload(input.value);
        //         // this.currentState = this.STATES.UPLOAD_IMAGE;
        //         // this.render();
        //         console.log('confirm');
        //     }
        // });
        // card.registerButtonCallback('cancelModalButton', () => {
        //     // if (input.value === defaultName) {
        //     //     this.tryUpload(input.value);
        //     //     this.currentState = this.STATES.UPLOAD_IMAGE;
        //     //     this.render();
        //     // } else {
        //     //     input.value = defaultName;
        //     // }
        //     console.log('cancel');
        // });
        viewCardContainer.appendChild(card);
    }

    function sendCoordinateSystemsToIFrame(objectKey, frameKey) {
        let frame = realityEditor.getFrame(objectKey, frameKey);
        if (!frame) return;
        if (!frame.sendCoordinateSystems) return;

        if (typeof lastSentMatrices[frameKey] === 'undefined') {
            lastSentMatrices[frameKey] = {};
        }

        let coordinateSystems = {};

        if (frame.sendCoordinateSystems.camera) {
            coordinateSystems.camera = realityEditor.sceneGraph.getCameraNode().worldMatrix;
        }
        if (frame.sendCoordinateSystems.projectionMatrix) {
            coordinateSystems.projectionMatrix = globalStates.realProjectionMatrix;
        }
        if (frame.sendCoordinateSystems.toolOrigin) {
            coordinateSystems.toolOrigin = realityEditor.sceneGraph.getSceneNodeById(frameKey).worldMatrix;
        }
        if (frame.sendCoordinateSystems.groundPlaneOrigin) {
            coordinateSystems.groundPlaneOrigin = realityEditor.sceneGraph.getGroundPlaneNode().worldMatrix;
        }
        if (frame.sendCoordinateSystems.worldOrigin) {
            coordinateSystems.worldOrigin = realityEditor.sceneGraph.getSceneNodeById(realityEditor.sceneGraph.getWorldId()).worldMatrix;
        }

        // only calculate the more complex ones if the tool origin has also changed, otherwise skip the computation
        // because they can't have changed without the tool origin also changing
        if (frame.sendCoordinateSystems.toolGroundPlaneShadow || frame.sendCoordinateSystems.toolSurfaceShadow) {
            let toolOriginChecksum = matrixChecksum(realityEditor.sceneGraph.getSceneNodeById(frameKey).worldMatrix);
            if (!lastSentMatrices[frameKey].toolOrigin || lastSentMatrices[frameKey].toolOrigin !== toolOriginChecksum) {
                if (frame.sendCoordinateSystems.toolGroundPlaneShadow) {
                    coordinateSystems.toolGroundPlaneShadow = realityEditor.gui.threejsScene.getToolGroundPlaneShadowMatrix(objectKey, frameKey);
                }
                if (frame.sendCoordinateSystems.toolSurfaceShadow) {
                    coordinateSystems.toolSurfaceShadow = realityEditor.gui.threejsScene.getToolSurfaceShadowMatrix(objectKey, frameKey);
                }
            }
        }

        let keysThatDidntChange = [];
        Object.keys(coordinateSystems).forEach(coordSystem => {
            let checksum = matrixChecksum(coordinateSystems[coordSystem]);
            if (lastSentMatrices[frameKey][coordSystem] && lastSentMatrices[frameKey][coordSystem] === checksum) {
                keysThatDidntChange.push(coordSystem);
            }
        });

        keysThatDidntChange.forEach(key => {
            delete coordinateSystems[key];
        });

        if (Object.keys(coordinateSystems).length === 0) return;

        globalDOMCache["iframe" + frameKey].contentWindow.postMessage(JSON.stringify({
            coordinateSystems: coordinateSystems
        }), '*');

        Object.keys(coordinateSystems).forEach(coordSystem => {
            lastSentMatrices[frameKey][coordSystem] = matrixChecksum(coordinateSystems[coordSystem]);
        });

        // if using toolGroundPlaneShadow or toolSurfaceShadow, but not toolOrigin, store the tool origin checksum to help with the above shortcut
        if ((frame.sendCoordinateSystems.toolSurfaceShadow || frame.sendCoordinateSystems.toolGroundPlaneShadow) && !frame.sendCoordinateSystems.toolOrigin) {
            lastSentMatrices[frameKey].toolOrigin = matrixChecksum(realityEditor.sceneGraph.getSceneNodeById(frameKey).worldMatrix);
        }
    }

    // Quick and dirty checksum should efficiently and correctly identify changes *almost* all of the time
    // There is a chance that the sum of a matrix elements could stay the same when the matrix changes,
    // but in practice this is unlikely to happen due to the many digits of precision we're working with.
    function matrixChecksum(matrix) {
        return matrix.reduce((acc, val) => acc + val, 0);
    }

    /**
     * Sends a frameCreatedEvent into all visible frames, which they can listen for via the object.js API
     * @param {{objectKey: string, frameKey: string, frameType: string}} params
     */
    function onFrameAdded(params) {
        sendMessageToAllVisibleFrames({
            frameCreatedEvent: {
                objectId: params.objectKey,
                frameId: params.frameKey,
                frameType: params.frameType
            }
        });
    }

    /**
     * If this comes from a frame, not a node, sends a frameDeletedEvent into all visible frames, which they can listen for via the object.js API
     * @param {{objectKey: string, frameKey: string, additionalInfo: {frameType: string|undefined}}} params
     */
    function onVehicleDeleted(params) {
        if (params.objectKey && params.frameKey && !params.nodeKey) { // only send message about frames, not nodes
            sendMessageToAllVisibleFrames({
                frameDeletedEvent: {
                    objectId: params.objectKey,
                    frameId: params.frameKey,
                    frameType: params.additionalInfo.frameType
                }
            });
        }
    }

    /**
     * Gets triggered when a fullscreen frame, which had requested exclusive fullscreen access, was kicked out by a new exclusive fullscreen frame
     * Sends a fullScreenEjectedEvent message to the frame that got kicked out, so it can update its UI in response
     * @param {{objectKey: string, frameKey: string}} params
     */
    function onFullScreenEjected(params) {
        realityEditor.network.postMessageIntoFrame(params.frameKey, {
            fullScreenEjectedEvent: {
                objectId: params.objectKey,
                frameId: params.frameKey
            }
        });
    }

    /**
     * Helper function to post a message into all iframes on visible objects
     * @param {*} msgContent
     */
    function sendMessageToAllVisibleFrames(msgContent) {
        for (var visibleObjectKey in realityEditor.gui.ar.draw.visibleObjects) {
            sendMessageToAllFramesOnObject(visibleObjectKey, msgContent);
        }
    }

    /**
     * Helper function to post a message into all iframes on visible objects
     * @param {string} objectKey
     * @param {*} msgContent
     */
    function sendMessageToAllFramesOnObject(objectKey, msgContent) {
        realityEditor.forEachFrameInObject(objectKey, function(objectKey, frameKey) {
            realityEditor.network.postMessageIntoFrame(frameKey, msgContent);
        });
    }

    /**
     * Receives key up events from the keyboardEvents module, and forwards them to active frames
     * @param {{event: KeyboardEvent}} params
     */
    function keyUpHandler(params) {
        var acyclicEventObject = getMutablePointerEventCopy(params.event); // can't stringify a cyclic object, which the event might be
        sendMessageToAllVisibleFrames({keyboardUpEvent: acyclicEventObject});
    }

    function onKeyboardHidden() {
        sendMessageToAllVisibleFrames({keyboardHiddenEvent: true});
    }

    /**
     * Reusable function to strip out the cyclic properties of a PointerEvent (or other event) and clone it so the result can be modified or stringified
     * @param {PointerEvent|*} event
     * @return {*} - a shallow copy of the event, without ('currentTarget', 'srcElement', 'target', 'view', or 'path')
     */
    function getMutablePointerEventCopy(event) {
        // we need to strip out the referenced DOM elements in order to JSON.stringify it
        var keysToExclude = ['currentTarget', 'srcElement', 'target', 'view', 'path'];
        var acyclicEventObject = copyObject(event, keysToExclude);
        return acyclicEventObject;
    }

    /**
     * Creates a shallow clone of a JSON object (key-by-key), with the option to exclude certain keys from the new copy.
     * Useful for creating an acyclic version of the original so that it can be JSON.stringified
     * @param {object} jsonObject
     * @param {Array.<string>|undefined} keysToExclude
     * @return {object}
     * @todo: move to a more reusable utility collection
     */
    function copyObject(jsonObject, keysToExclude) {
        var newObject = {};
        for (var key in jsonObject) {
            if (typeof keysToExclude === 'undefined' || keysToExclude.indexOf(key) === -1) { // copy over all the keys that don't match the excluded ones
                newObject[key] = jsonObject[key];
            }
        }
        return newObject;
    }

    /**
     * Gets triggered whenever an object's worldId get loaded or changed
     * @param objectId
     * @param worldId
     */
    function worldIdUpdated(objectId, worldId) {
        sendMessageToAllFramesOnObject(objectId, {
            updateWorldId: {
                objectId: objectId,
                worldId: worldId
            }
        });
    }

    exports.initService = initService;
    exports.getMutablePointerEventCopy = getMutablePointerEventCopy;
    exports.sendCoordinateSystemsToIFrame = sendCoordinateSystemsToIFrame;

})(realityEditor.network.frameContentAPI);
