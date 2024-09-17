export default class ToolInitializer {
    constructor() {
        // this.spatialTools = {}
    }

    initializeApp(objectId, manifest, basePath, options = {}) {
        // const utils = realityEditor.gui.ar.utilities;

        let object = realityEditor.getObject(objectId);
        if (!object) return;
        
        const frame = new Frame();
        let frameSrc = manifest.src;

        // name the frame "gauge1xyz", "gauge2asd", "gauge3qwe", etc... 
        let numberOfSameFrames = Object.keys(object.frames).map(existingFrameKey => {
            return object.frames[existingFrameKey].src;
        }).filter(src => {
            return src === frameSrc;
        }).length;

        frame.name = frameSrc + (numberOfSameFrames+1) + realityEditor.device.utilities.uuidTime();
        frame.objectId = objectId;
        frame.uuid = frame.objectId + frame.name;
        object.frames[frame.uuid] = frame;

        frame.location = 'global';
        frame.src = frameSrc;

        if (manifest.entryPoints.viewport && manifest.entryPoints.viewport.defaultScale) {
            frame.ar.scale = manifest.entryPoints.viewport.defaultScale;
        } else {
            frame.ar.scale = globalStates.defaultScale;
        }
        // populate properties not contained on server (not in constructor)
        // frame.begin = utils.newIdentityMatrix(); // TODO: try removing this
        frame.loaded = false;
        frame.screenZ = 1000;
        // frame.temp = utils.newIdentityMatrix(); // TODO: remove this?
        frame.fullScreen = false;
        frame.sendMatrix = false;
        frame.sendMatrices = {}; // todo: can this be unpopulated like this?
        // todo: fully remove sendAcceleration, or implement it
        // frame.sendAcceleration = false;
        frame.integerVersion = 300;

        // tell the iframe that it was just created, not reloaded
        realityEditor.network.toBeInitialized[frame.uuid] = true;

        if (options.initialMatrix) {
            frame.ar.matrix = options.initialMatrix;
        }

        realityEditor.sceneGraph.addFrame(frame.objectId, frame.uuid, frame, frame.ar.matrix);
        realityEditor.gui.ar.groundPlaneAnchors.sceneNodeAdded(frame.objectId, frame.uuid, frame, frame.ar.matrix);
        realityEditor.network.postNewFrame(object.ip, objectId, frame, options.onUploadComplete);

        if (!options.noUserInteraction) {
            // allows you to drag the frame around as soon as it loads
            realityEditor.gui.pocket.setPocketFrame(frame, {
                pageX: options.pageX || 0,
                pageY: options.pageY || 0
            }, objectId);
        }

            // pageX: screenX,
            // pageY: screenY,
            // initialMatrix: undefined,

        let tool = this.createSpatialToolInfo(objectId, frame.uuid, manifest); // new SpatialTool(objectId, frame.uuid, manifest);
        // this.spatialTools[frame.uuid] = tool;

        return tool;
    }
    
    createSpatialToolInfo(objectId, frameId, manifest) {
        return new SpatialTool(objectId, frameId, manifest);
    }

    initializeDomElements(objectId, frameId, appInfo) {
        let frame = realityEditor.getFrame(objectId, frameId);
        let manifest = appInfo.manifest;

        if (!frame || !manifest || !manifest.entryPoints) return;
        
        if (manifest.entryPoints.viewport) {
            // const viewportIframe = this.createIframe(safeAppId, basePath, manifest.entryPoints.viewport, 'viewport');
            let {
                addContainer,
                addIframe,
                addOverlay,
                addSVG
            } = this.createViewportElements(objectId, frameId, manifest.entryPoints.viewport);

            console.log('created viewport elements');

            // }

            // Create DOM elements for everything associated with this frame/node
            // var domElements = this.createSubElements(thisUrl, objectKey, frameKey, nodeKey, activeVehicle);
            // var addContainer = domElements.addContainer;
            // var addIframe = domElements.addIframe;
            // var addOverlay = domElements.addOverlay;
            // var addSVG = domElements.addSVG;

            addOverlay.objectId = objectId;
            addOverlay.frameId = frameId;
            addOverlay.nodeId = null;
            addOverlay.type = 'ui';

            // todo the event handlers need to be bound to non animated ui elements for fast movements.
            // todo the lines need to end at the center of the square.

            // if (activeType === "logic") {
            //
            //     // add the 4-quadrant animated SVG overlay for the logic nodes
            //     var addLogic = this.createLogicElement(activeVehicle, activeKey);
            //     addOverlay.appendChild(addLogic);
            //     globalDOMCache["logic" + activeKey] = addLogic;
            // }

            // TODO: try adding to var documentFragment = document.createDocumentFragment(); while constructing, for performance

            // append all the created elements to the DOM in the correct order...
            document.getElementById("GUI").appendChild(addContainer);
            addContainer.appendChild(addIframe);
            addContainer.appendChild(addOverlay);
            addOverlay.appendChild(addSVG);

            // cache references to these elements to more efficiently retrieve them in the future
            globalDOMCache[addContainer.id] = addContainer;
            globalDOMCache[addIframe.id] = addIframe;
            globalDOMCache[addOverlay.id] = addOverlay;
            globalDOMCache[addSVG.id] = addSVG;

            // wrapping div in corners can only be done after it has been added
            // the width and height don't matter as much here because it will get recalculated when frame contents load
            const padding = 24;
            realityEditor.gui.moveabilityCorners.wrapDivWithCorners(addOverlay, padding, false, {
                width: frame.width + padding * 2 + 'px',
                height: frame.height + padding * 2 + 'px',
                visibility: 'hidden'
            }, null, 4, 30);

            // add touch event listeners
            realityEditor.device.addTouchListenersForElement(addOverlay, frame);

        }
        
        let sidebarContainer = document.querySelector('.sidebar-iframe-container');
        if (manifest.entryPoints.sidebar && sidebarContainer) {
            let {
                addContainer,
                addIframe,
                addOverlay,
                addSVG
            } = this.createSidebarElements(objectId, frameId, manifest.entryPoints.sidebar);

            console.log('created sidebar elements');

            addIframe.classList.remove('hiddenFrame');
            addIframe.classList.add('visibleFrame');

            let sidebarWidth = manifest.entryPoints.sidebar.minWidth + 'px';
            addContainer.style.width = sidebarWidth;
            addContainer.style.height = '100%';
            addIframe.style.left = '0';
            addIframe.style.top = '0';
            addIframe.style.width = sidebarWidth;
            addIframe.style.height = '100%';
            addOverlay.style.left = '0';
            addOverlay.style.top = '0';
            addOverlay.style.width = sidebarWidth;
            addOverlay.style.height = '100%';

            addOverlay.objectId = objectId;
            addOverlay.frameId = frameId;
            addOverlay.nodeId = null;
            addOverlay.type = 'ui';

            addOverlay.style.display = 'none';

            sidebarContainer.appendChild(addContainer);
            addContainer.appendChild(addIframe);
            addContainer.appendChild(addOverlay);
            addOverlay.appendChild(addSVG);
            
            // let suffix = '_sidebar';

            // cache references to these elements to more efficiently retrieve them in the future
            globalDOMCache[addContainer.id] = addContainer;
            globalDOMCache[addIframe.id] = addIframe;
            globalDOMCache[addOverlay.id] = addOverlay;
            globalDOMCache[addSVG.id] = addSVG;

            // // wrapping div in corners can only be done after it has been added
            // // the width and height don't matter as much here because it will get recalculated when frame contents load
            // const padding = 24;
            // realityEditor.gui.moveabilityCorners.wrapDivWithCorners(addOverlay, padding, false, {
            //     width: frame.width + padding * 2 + 'px',
            //     height: frame.height + padding * 2 + 'px',
            //     visibility: 'hidden'
            // }, null, 4, 30);

            // add touch event listeners
            realityEditor.device.addTouchListenersForElement(addOverlay, frame);
        }
    }

    createSidebarElements(objectId, frameId, entryPoint) {
        let frame = realityEditor.getFrame(objectId, frameId);
        if (!frame) return;

        // let object = realityEditor.getObject(objectId);
        // let iframeUrl =  realityEditor.network.getURL(object.ip, realityEditor.network.getPort(object), '/obj/' + object.name + '/target/target.glb');
        // var frameUrl = realityEditor.network.getURL(this.activeObject.ip, realityEditor.network.getPort(objects[objectKey]), "/obj/" + this.activeObject.name + "/frames/" + this.activeFrame.name + "/");
        let iframeUrl = realityEditor.network.availableFrames.getFrameSrc(objectId, frame.src).replace('index.html', entryPoint.url);
        // let id = frameId + '_sidebar';
        return realityEditor.gui.ar.draw.createSubElements(iframeUrl, objectId, frameId, null, frame, 'sidebar');

        // return {
        //     addContainer: null,
        //     addIframe: null,
        //     addOverlay: null,
        //     addSVG: null
        // };
    }
    
    createViewportElements(objectId, frameId, entryPoint) {
        let frame = realityEditor.getFrame(objectId, frameId);
        if (!frame) return;

        // let object = realityEditor.getObject(objectId);
        // let iframeUrl =  realityEditor.network.getURL(object.ip, realityEditor.network.getPort(object), '/obj/' + object.name + '/target/target.glb');
        // var frameUrl = realityEditor.network.getURL(this.activeObject.ip, realityEditor.network.getPort(objects[objectKey]), "/obj/" + this.activeObject.name + "/frames/" + this.activeFrame.name + "/");
        let iframeUrl = realityEditor.network.availableFrames.getFrameSrc(objectId, frame.src).replace('index.html', entryPoint.url);
        return realityEditor.gui.ar.draw.createSubElements(iframeUrl, objectId, frameId, null, frame);
        
        // return {
        //     addContainer: null,
        //     addIframe: null,
        //     addOverlay: null,
        //     addSVG: null
        // };
    }

    createIframe(appId, basePath, entryPoint, role) {
        const iframe = document.createElement('iframe');
        iframe.src = this.getFullPath(basePath, entryPoint.url);

        // Apply sandbox attributes
        // Exclude 'allow-same-origin' unless necessary
        // iframe.setAttribute('sandbox', 'allow-scripts allow-forms allow-pointer-lock');
        let allowPopups = realityEditor.device.environment.isWithinToolboxApp() ? '' : 'allow-popups';
        iframe.setAttribute("sandbox", `allow-forms allow-pointer-lock allow-same-origin allow-scripts ${allowPopups}`);

        // Set dimensions
        iframe.style.width = entryPoint.width || '100%';
        iframe.style.height = entryPoint.height || '100%';

        // Assign a unique ID to the iframe
        iframe.id = `iframe-${role}`;

        // Add any other necessary attributes
        iframe.setAttribute('allow', 'fullscreen'); // If needed

        return iframe;
    }
}

class SpatialTool {
    constructor(objectId, frameId, manifest) {
        this.objectId = objectId;
        this.frameId = frameId;
        this.src = manifest.src;
        this.manifest = manifest;
    }
}
