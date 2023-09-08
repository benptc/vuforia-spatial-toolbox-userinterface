createNameSpace("realityEditor.network.frameContentAPI");

/**
 * @fileOverview realityEditor.network.frameContentAPI.js
 * Provides a central interface for transmitting data to the Frames and Nodes
 * @todo: finish moving other functionality here
 */

(function(exports) {
    
    let lastSentMatrices = {};
    
    // exports.didCameraMatrixChange = (frameKey) => {
    //    
    // }
    
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

        realityEditor.network.addPostMessageHandler('startTimeProcess', (msgContent, fullMessage) => {
            realityEditor.device.profiling.startTimeProcess(msgContent.name);
        });

        realityEditor.network.addPostMessageHandler('stopTimeProcess', (msgContent, fullMessage) => {
            let showMessage = msgContent.showMessage || false;
            let showAggregate = msgContent.showAggregate || true;
            let displayTimeout = msgContent.displayTimeout || 3000;
            let exactTimestamp = msgContent.exactTimestamp || null;
            realityEditor.device.profiling.stopTimeProcess(msgContent.name, msgContent.category, { showMessage, showAggregate, displayTimeout, exactTimestamp });
        });
    }
    
    function sendCoordinateSystemsToIFrame(objectKey, frameKey) {
        let frame = realityEditor.getFrame(objectKey, frameKey);
        if (!frame) return;
        if (!frame.sendCoordinateSystems) return;
        // console.log(`send coordinate systems to ${frameKey}`, frame.sendCoordinateSystems);

        if (typeof lastSentMatrices[frameKey] === 'undefined') {
            lastSentMatrices[frameKey] = {};
        }
        
        const TIME_PROCESS = false;

        let frameKeyWithoutObjectKey = frameKey.slice(objectKey.length);
        let processTitle = `sendSystems::${frameKeyWithoutObjectKey}`;

        if (TIME_PROCESS) {
            realityEditor.device.profiling.startTimeProcess(processTitle);
        }

        let sendCamera = frame.sendCoordinateSystems.camera;
        let sendGroundPlaneOrigin = frame.sendCoordinateSystems.groundPlaneOrigin;
        let sendProjectionMatrix = frame.sendCoordinateSystems.projectionMatrix;
        let sendToolGroundPlaneShadow = frame.sendCoordinateSystems.toolGroundPlaneShadow;
        let sendToolOrigin = frame.sendCoordinateSystems.toolOrigin;
        let sendToolSurfaceShadow = frame.sendCoordinateSystems.toolSurfaceShadow;
        let sendWorldOrigin = frame.sendCoordinateSystems.worldOrigin;
        
        let coordinateSystems = {};
        
        if (sendCamera) {
            coordinateSystems.camera = realityEditor.sceneGraph.getCameraNode().worldMatrix;
        }
        if (sendProjectionMatrix) {
            coordinateSystems.projectionMatrix = globalStates.realProjectionMatrix;
        }
        if (sendToolOrigin) {
            coordinateSystems.toolOrigin = realityEditor.sceneGraph.getSceneNodeById(frameKey).worldMatrix;
        }
        if (sendGroundPlaneOrigin) {
            coordinateSystems.groundPlaneOrigin = realityEditor.sceneGraph.getGroundPlaneNode().worldMatrix;
        }
        if (sendWorldOrigin) {
            coordinateSystems.worldOrigin = realityEditor.sceneGraph.getSceneNodeById(realityEditor.sceneGraph.getWorldId()).worldMatrix;
        }
        
        if (!lastSentMatrices[frameKey].toolOrigin || lastSentMatrices[frameKey].toolOrigin !== matrixChecksum(coordinateSystems.toolOrigin)) {
            // only calculate the more complex ones if the tool origin has also changed
            if (sendToolGroundPlaneShadow) {
                coordinateSystems.toolGroundPlaneShadow = realityEditor.gui.threejsScene.getToolGroundPlaneShadowMatrix(objectKey, frameKey);
            }
            if (sendToolSurfaceShadow) {
                coordinateSystems.toolSurfaceShadow = realityEditor.gui.threejsScene.getToolSurfaceShadowMatrix(objectKey, frameKey);
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
        // console.log('changes:', coordinateSystems);

        // try {
        //     coordinateSystems.timestamp = Date.now();
        // } catch (e) {
        //     console.warn(e);
        // }

        // globalDOMCache["iframe" + frameKey].contentWindow.postMessage(JSON.stringify({
        //     coordinateSystems: coordinateSystems
        // }), '*');

        // console.log(`send coordinate systems to ${frameKey}`);

        window.postIntoIframe(globalDOMCache["iframe" + frameKey].contentWindow, JSON.stringify({
            coordinateSystems: coordinateSystems
        }));

        Object.keys(coordinateSystems).forEach(coordSystem => {
            lastSentMatrices[frameKey][coordSystem] = matrixChecksum(coordinateSystems[coordSystem]);
        });

        if (TIME_PROCESS) {
            realityEditor.device.profiling.stopTimeProcess(processTitle, 'sendCoordsIntoIframe', { showMessage: false, showAggregate: true });
        }
        
        const END_BEFORE_SENDING_INTO_IFRAME = false;
        if (END_BEFORE_SENDING_INTO_IFRAME) {
            if (sendCamera && coordinateSystems.camera) {
                // coordinateSystems.camera = realityEditor.sceneGraph.getCameraNode().worldMatrix;

                let hash = realityEditor.device.profiling.getShortHashForString(JSON.stringify(coordinateSystems.camera));
                realityEditor.device.profiling.stopTimeProcess(`cameraUpdated__${hash}`);
            }
        }
    }
    
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
