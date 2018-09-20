createNameSpace("realityEditor.device.videoRecording");

/**
 * @fileOverview realityEditor.device.videoRecording.js
 * Contains the feature code to interact with the native API for recording
 * the camera feed and adding video frames to objects.
 * Shows visual feedback while recording.
 */


(function(exports) {

    var privateState = {
        isRecording: false,
        visibleObjects: {},
        recordingObjectKey: null,
        startMatrix: null
    };
    
    function initFeature() {
        
        realityEditor.gui.ar.draw.addUpdateListener(function(visibleObjects) {

            // highlight or dim the video record button if there are visible objects, to show that it is able to be used
            var noVisibleObjects = Object.keys(visibleObjects).length === 0;
            if (globalStates.videoRecordingEnabled) {
                var buttonOpacity = (noVisibleObjects && !privateState.isRecording) ? 0.2 : 1.0;
                var recordButton = document.querySelector('#recordButton');
                if (recordButton) {
                    recordButton.style.opacity = buttonOpacity;
                }
            }
            
            privateState.visibleObjects = visibleObjects;
            
        });
    }
    
    /**
     * Starts or stops recording, and returns whether the recording is newly turned on (true) or off (false)
     * @return {boolean}
     */
    function toggleRecording() {
        if (privateState.isRecording) {
            stopRecording();
            return false;
        } else {
            startRecordingOnClosestObject();
            return true;
        }
    }
    
    /**
     * Starts a camera recording that will attach itself as a frame to the closest object when finished
     */
    function startRecordingOnClosestObject() {
        if (privateState.isRecording) {
            console.log('cannot start new recording until previous is finished');
            return;
        }
        var closestObjectKey = realityEditor.gui.ar.getClosestObject()[0];
        if (closestObjectKey) {
            // var startingMatrix = realityEditor.getObject(closestObjectKey)
            var startingMatrix = privateState.visibleObjects[closestObjectKey] || realityEditor.gui.ar.utilities.newIdentityMatrix();
            realityEditor.app.startVideoRecording(closestObjectKey, startingMatrix); // TODO: don't need to send in starting matrix anymore
            privateState.isRecording = true;
            privateState.recordingObjectKey = closestObjectKey;
            privateState.startMatrix = realityEditor.gui.ar.utilities.copyMatrix(privateState.visibleObjects[closestObjectKey]);
            getRecordingIndicator().style.display = 'inline';
        }
    }
    
    /**
     * Stops recording a current video and sends it to server to add as a frame
     */
    function stopRecording() {
        if (!privateState.isRecording) {
            console.log('cannot stop a recording because a recording was not started');
            return;
        }
        
        var videoId = realityEditor.device.utilities.uuidTime();
        
        createVideoFrame(privateState.recordingObjectKey, videoId, privateState.visibleObjects[privateState.recordingObjectKey]);
        
        realityEditor.app.stopVideoRecording(videoId);
        privateState.isRecording = false;
        privateState.recordingObjectKey = null;
        getRecordingIndicator().style.display = 'none';
    }
    
    function createVideoFrame(objectKey, videoId, objectMatrix) {
        if (typeof objectMatrix === 'undefined') {
            objectMatrix = privateState.startMatrix;
        } 
        
        var object = realityEditor.getObject(objectKey);

        var frameType = 'videoRecording';
        var frameKey = objectKey + frameType + videoId;

        var frame = new Frame();

        frame.objectId = objectKey;
        frame.uuid = frameKey;
        frame.name = frameType + videoId;
        console.log('created video frame with name ' + frame.name);

        frame.ar.x = 0;
        frame.ar.y = 0;
        frame.ar.scale = globalStates.defaultScale;
        frame.frameSizeX = 760; //globalStates.height;
        frame.frameSizeY = 460; //globalStates.width;

        // console.log("closest Frame", closestObject.averageScale);

        frame.location = 'global';
        frame.src = frameType;

        // set other properties

        frame.animationScale = 0;
        frame.begin = realityEditor.gui.ar.utilities.newIdentityMatrix();
        frame.width = frame.frameSizeX;
        frame.height = frame.frameSizeY;
        console.log('created video frame with width/height' + frame.width + '/' + frame.height);
        frame.loaded = false;
        // frame.objectVisible = true;
        frame.screen = {
            x: frame.ar.x,
            y: frame.ar.y,
            scale: frame.ar.scale
        };
        // frame.screenX = 0;
        // frame.screenY = 0;
        frame.screenZ = 1000;
        frame.temp = realityEditor.gui.ar.utilities.newIdentityMatrix();

        // thisFrame.objectVisible = false; // gets set to false in draw.setObjectVisible function
        frame.fullScreen = false;
        frame.sendMatrix = false;
        frame.sendAcceleration = false;
        frame.integerVersion = 300; //parseInt(objects[objectKey].version.replace(/\./g, ""));
        // thisFrame.visible = false;

        // add each node with a non-empty name

        var videoPath = 'http://' + object.ip + ':' + httpPort + '/obj/' + object.name + '/videos/' + videoId + '.mp4';

        var nodes = [
            {name: 'play', type: 'node'},
            {name: 'progress', type: 'node'},
            {name: 'storage', type: 'storeData', publicData: {data: videoPath}}
        ];
        
        nodes.forEach( function (nodeData) {

            var nodeName = nodeData.name;
            var nodeType = nodeData.type;
            var nodeUuid = frameKey + nodeName;
            
            frame.nodes[nodeUuid] = new Node();
            var addedNode = frame.nodes[nodeUuid];
            
            addedNode.objectId = objectKey;
            addedNode.frameId = frameKey;
            addedNode.name = nodeName;
            addedNode.type = nodeType;
            addedNode.frameSizeX = 220;
            addedNode.frameSizeY = 220;
            addedNode.x = realityEditor.device.utilities.randomIntInc(0, 200) - 100;
            addedNode.y = realityEditor.device.utilities.randomIntInc(0, 200) - 100;
            addedNode.scale = globalStates.defaultScale;
            
            if (typeof nodeData.publicData !== 'undefined') {
                addedNode.publicData = nodeData.publicData;
            }
            
        });
        
        // var nodeName = 'storage';
        // var nodeType = 'storeData';
        // var nodeUuid = frameKey + nodeName;
        // frame.nodes[nodeUuid] = new Node();
        // var addedNode = frame.nodes[nodeUuid];
        // addedNode.objectId = objectKey;
        // addedNode.frameId = frameKey;
        // addedNode.name = nodeName;
        // addedNode.type = nodeType;
        // addedNode.frameSizeX = 220;
        // addedNode.frameSizeY = 220;
        // addedNode.scale = globalStates.defaultScale;
        
        // frame.nodes[frameKey + 'storage'].publicData = {
        //     data: videoPath
        // };

        object.frames[frameKey] = frame;
        console.log(frame);

        moveFrameToCameraForObjectMatrix(objectKey, frameKey, objectMatrix);
        
        // send it to the server
        realityEditor.network.postNewFrame(object.ip, objectKey, frame);
    }

    // TODO: turn into a cleaner, more reusable function in a better location
    function moveFrameToCamera(objectKey, frameKey) {
        
        frame = realityEditor.getFrame(objectKey, frameKey);
// recompute frame.temp for the new object
        var res1 = [];
        realityEditor.gui.ar.utilities.multiplyMatrix(realityEditor.gui.ar.draw.visibleObjects[objectKey], globalStates.projectionMatrix, res1);
        console.log(rotateX, res1, frame.temp);
        realityEditor.gui.ar.utilities.multiplyMatrix(rotateX, res1, frame.temp);
        console.log('temp', frame.temp);
        frame.begin = realityEditor.gui.ar.utilities.copyMatrix(pocketBegin);
// compute frame.matrix based on new object
        var resultMatrix = [];
        realityEditor.gui.ar.utilities.multiplyMatrix(frame.begin, realityEditor.gui.ar.utilities.invertMatrix(frame.temp), resultMatrix);
        realityEditor.gui.ar.positioning.setPositionDataMatrix(frame, resultMatrix); // TODO: fix this somehow, make it more understandable

        // reset frame.begin
        frame.begin = realityEditor.gui.ar.utilities.newIdentityMatrix();
        
    }

    // TODO: turn into a cleaner, more reusable function in a better location
    function moveFrameToCameraForObjectMatrix(objectKey, frameKey, objectMatrix) {
        frame = realityEditor.getFrame(objectKey, frameKey);
// recompute frame.temp for the new object
        var res1 = [];
        realityEditor.gui.ar.utilities.multiplyMatrix(objectMatrix, globalStates.projectionMatrix, res1);
        console.log(rotateX, res1, frame.temp)
        realityEditor.gui.ar.utilities.multiplyMatrix(rotateX, res1, frame.temp);
        console.log('temp', frame.temp);
        frame.begin = realityEditor.gui.ar.utilities.copyMatrix(pocketBegin);
// compute frame.matrix based on new object
        var resultMatrix = [];
        realityEditor.gui.ar.utilities.multiplyMatrix(frame.begin, realityEditor.gui.ar.utilities.invertMatrix(frame.temp), resultMatrix);
        realityEditor.gui.ar.positioning.setPositionDataMatrix(frame, resultMatrix); // TODO: fix this somehow, make it more understandable

        // reset frame.begin
        frame.begin = realityEditor.gui.ar.utilities.newIdentityMatrix();
    }
    
    /**
     * Lazy instantiation and getter of a red dot element to indicate that a recording is in process
     * @return {Element}
     */
    function getRecordingIndicator() {
        var recordingIndicator = document.querySelector('#recordingIndicator');
        if (!recordingIndicator) {
            recordingIndicator = document.createElement('div');
            recordingIndicator.id = 'recordingIndicator';
            recordingIndicator.style.position = 'absolute';
            recordingIndicator.style.left = '10px';
            recordingIndicator.style.top = '10px';
            recordingIndicator.style.width = '30px';
            recordingIndicator.style.height = '30px';
            recordingIndicator.style.backgroundColor = 'red';
            recordingIndicator.style.borderRadius = '15px';
            document.body.appendChild(recordingIndicator);
        }
        return recordingIndicator;
    }
    
    //////////////////////////////////////////
    //     Video Recording Within Frame     //
    //////////////////////////////////////////
    
    // function triggerVideoStoppedCallback(objectKey, frameKey) {
    //     var object = realityEditor.getObject(objectKey);
    //     var thisMsg = {
    //         videoFilePath: 'http://' + object.ip + ':' + httpPort + '/obj/' + object.name + '/videos/test.mp4'
    //     };
    //     globalDOMCache["iframe" + frameKey].contentWindow.postMessage(JSON.stringify(thisMsg), '*');
    // }

    function startRecordingForFrame(objectKey, frameKey) {
        var startingMatrix = privateState.visibleObjects[objectKey] || realityEditor.gui.ar.utilities.newIdentityMatrix();
        realityEditor.app.startVideoRecording(objectKey, startingMatrix); // TODO: don't need to send in starting matrix anymore
    }
    
    function stopRecordingForFrame(objectKey, frameKey) {
        var videoId = realityEditor.device.utilities.uuidTime();
        realityEditor.app.stopVideoRecording(videoId);
        // triggerVideoStoppedCallback(objectKey, frameKey); // TODO: this isnt working yet
        
        var object = realityEditor.getObject(objectKey);
        var thisMsg = {
            videoFilePath: 'http://' + object.ip + ':' + httpPort + '/obj/' + object.name + '/videos/' + videoId + '.mp4'
        };
        globalDOMCache["iframe" + frameKey].contentWindow.postMessage(JSON.stringify(thisMsg), '*');
    }

    //////////////////////////////////////////

    exports.toggleRecording = toggleRecording;
    exports.startRecordingOnClosestObject = startRecordingOnClosestObject;
    exports.stopRecording = stopRecording;
    exports.initFeature = initFeature;
    exports.moveFrameToCamera = moveFrameToCamera;

    exports.startRecordingForFrame = startRecordingForFrame;
    exports.stopRecordingForFrame = stopRecordingForFrame;


}(realityEditor.device.videoRecording));
