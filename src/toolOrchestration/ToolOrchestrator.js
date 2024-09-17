import ToolInitializer from './ToolInitializer.js';

class ToolOrchestrator {
    constructor() {
        this.toolInitializer = new ToolInitializer();
        this.spatialTools = {}

        realityEditor.network.addPostMessageHandler('sidebarToViewport', (msgContent, fullMessage) => {
            let frame = realityEditor.getFrame(fullMessage.object, fullMessage.frame);
            if (!frame) return;
            this.handleMessageFromIframe('sidebarToViewport', fullMessage.object, fullMessage.frame, msgContent);
        });
    }
    
    hasSpatialTool(objectId, frameId) {
        return this.spatialTools[frameId] && this.spatialTools[frameId].objectId === objectId;
    }
    
    getSpatialTool(objectId, frameId) {
        if (!this.hasSpatialTool(objectId, frameId)) return null;
        return this.spatialTools[frameId];
    }

    initializeDomElementsForTool(objectId, frameId) {
        return this.toolInitializer.initializeDomElements(objectId, frameId, this.spatialTools[frameId]);
    }

    async registerDownloadedFrame(objectId, frameId) {
        let object = realityEditor.getObject(objectId);
        let frame = realityEditor.getFrame(objectId, frameId);
        
        if (frame.location !== 'global') {
            return false;
        }

        // let basePath = realityEditor.network.getURL(object.ip, realityEditor.network.getPort(object), '/obj/' + object.name + '/frames/' + frame.src);
        let basePath = realityEditor.network.getURL(object.ip, realityEditor.network.getPort(object), '/frames/' + frame.src);

        // var frameUrl = realityEditor.network.getURL(this.activeObject.ip, realityEditor.network.getPort(objects[objectKey]), "/obj/" + this.activeObject.name + "/frames/" + this.activeFrame.name + "/");

        let manifestUrl = `${basePath}/app-manifest.json`;

        const placeholders = {
            // APP_ID: 'drawing-tool',
            PARENT_DOMAIN: window.location.hostname,
            APP_DOMAIN: window.location.hostname, // Assuming the app is on the same domain
            // VIEWPORT_URL: `/apps/drawing-tool/viewport.html`,
            // SIDEBAR_URL: `/apps/drawing-tool/sidebar.html`,
            // UPDATE_URL: `/apps/drawing-tool/update.json`
        };

        try {
            const manifestJson = await this.loadAppManifest(manifestUrl, placeholders);

            // TODO: validate the manifest against a schema before proceeding

            if (manifestJson) {
                // let appInfo = this.initializeApp(manifestJson, basePath);
                // let appInfo = this.toolInitializer.initializeApp(objectId, manifestJson, basePath, {
                //     noUserInteraction: true,
                //     pageX: screenX,
                //     pageY: screenY,
                //     initialMatrix: undefined,
                //     onUploadComplete: () => {
                //         let addedFrame = realityEditor.getFrame(appInfo.objectId, appInfo.frameId);
                //         realityEditor.network.postVehiclePosition(addedFrame);
                //     }
                // });
                
                let appInfo = this.toolInitializer.createSpatialToolInfo(objectId, frameId, manifestJson);

                this.spatialTools[appInfo.frameId] = appInfo;
                console.log(this.spatialTools);

                // realityEditor.gui.pocket.callbackHandler.triggerCallbacks('frameAdded', {
                //     objectKey: objectId,
                //     frameKey: appInfo.frameId,
                //     frameType: appInfo.src
                // });

                this.setupIframeMessaging(manifestJson);

                console.log('Initialized app', appInfo);
                return appInfo;
            } else {
                throw new Error(`Couldn't load app-manifest.json for: ${frame.src}`);
            }
        } catch (e) {
            return false;
        }
    }

    async createTool(objectId, toolName, basePath) {
        let manifestUrl = `${basePath}/app-manifest.json`;

        const placeholders = {
            // APP_ID: 'drawing-tool',
            PARENT_DOMAIN: window.location.hostname,
            APP_DOMAIN: window.location.hostname, // Assuming the app is on the same domain
            // VIEWPORT_URL: `/apps/drawing-tool/viewport.html`,
            // SIDEBAR_URL: `/apps/drawing-tool/sidebar.html`,
            // UPDATE_URL: `/apps/drawing-tool/update.json`
        };

        try {
            const manifestJson = await this.loadAppManifest(manifestUrl, placeholders);

            // TODO: validate the manifest against a schema before proceeding

            if (manifestJson) {

                let spatialCursorMatrix = null;
                // const moveToCursor = false;
                // if (moveToCursor) {
                //     spatialCursorMatrix = realityEditor.spatialCursor.getOrientedCursorRelativeToWorldObject();
                // } else {
                    let info = await realityEditor.spatialCursor.getOrientedCursorIfItWereAtScreenCenter();
                    if (info.didFindCenterPoint) {
                        spatialCursorMatrix = info.matrix;
                    }
                // }

                // verify that the matrix is valid, otherwise tool can init with NaN values
                if (!realityEditor.gui.ar.utilities.isValidMatrix4x4(spatialCursorMatrix)) {
                    spatialCursorMatrix = null;
                }
                
                let viewportCenter = realityEditor.device.layout.getViewportCenter();
                // let appInfo = this.initializeApp(manifestJson, basePath);
                let appInfo = this.toolInitializer.initializeApp(objectId, manifestJson, basePath, {
                    noUserInteraction: true,
                    pageX: viewportCenter.x,
                    pageY: viewportCenter.y,
                    initialMatrix: (spatialCursorMatrix) ? spatialCursorMatrix : undefined,
                    onUploadComplete: () => {
                        let addedFrame = realityEditor.getFrame(appInfo.objectId, appInfo.frameId);
                        realityEditor.network.postVehiclePosition(addedFrame);
                        addedFrame.registeredWithOrchestrator = true;
                    }
                });

                this.spatialTools[appInfo.frameId] = appInfo;

                realityEditor.gui.pocket.callbackHandler.triggerCallbacks('frameAdded', {
                    objectKey: objectId,
                    frameKey: appInfo.frameId,
                    frameType: appInfo.src
                });

                this.setupIframeMessaging(manifestJson);

                console.log('Initialized app', appInfo);
                return appInfo;
            } else {
                throw new Error(`Couldn't load app-manifest.json for: ${toolName}`);
            }
        } catch (e) {
            return false;
        }
    }

    // Function to fetch and parse the manifest
    async loadAppManifest(manifestUrl, placeholders = {}) {
        try {
            const response = await fetch(manifestUrl);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            let manifestText = await response.text();

            // Replace placeholders in the manifest
            for (const [key, value] of Object.entries(placeholders)) {
                const regex = new RegExp(`\\$\\{${key}\\}`, 'g');
                manifestText = manifestText.replace(regex, value);
            }

            return JSON.parse(manifestText);
        } catch (error) {
            console.error('Error loading manifest:', error);
        }
    }

    // initializeApp(manifest, basePath) {
    //     if (!manifest) return;
    //     if (!manifest.entryPoints) return;
    //
    //     // Containers for the viewport and sidebar iframes
    //     // const viewportContainer = document.getElementById('viewport-container');
    //     const viewportContainer = document.getElementById('GUI');
    //     const sidebarContainer = document.querySelector('.content-container'); //document.getElementById('sidebar-container');
    //
    //     // Create the viewport iframe
    //     if (manifest.entryPoints.viewport) {
    //         let safeAppId = manifest.packageName.replace(/\./g, '-');
    //         const viewportIframe = this.toolInitializer.createIframe(safeAppId, basePath, manifest.entryPoints.viewport, 'viewport');
    //         viewportContainer.appendChild(viewportIframe);
    //     }
    //
    //     // Create the sidebar iframe
    //     if (manifest.entryPoints.sidebar) {
    //         let safeAppId = manifest.packageName.replace(/\./g, '-');
    //         const sidebarIframe = this.toolInitializer.createIframe(safeAppId, basePath, manifest.entryPoints.sidebar, 'sidebar');
    //         // if (manifest.entryPoints.sidebar.defaultState === 'closed') {
    //         //     sidebarContainer.style.display = 'none';
    //         // }
    //         sidebarContainer.appendChild(sidebarIframe);
    //     }
    //
    //     // Set up messaging between iframes
    //     this.setupIframeMessaging(manifest);
    // }

    getFullPath(basePath, filePath) {
        return `${basePath}/${filePath}`;
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

    setupIframeMessaging(manifest) {
        // TODO: register the manifest routes so we can validate future sidebarToViewport messages

        // const iframeMap = {
        //     viewport: {
        //         iframe: document.getElementById('iframe-viewport'),
        //         origin: new URL(manifest.entryPoints.viewport.url, window.location.origin).origin
        //     },
        //     sidebar: {
        //         iframe: document.getElementById('iframe-sidebar'),
        //         origin: new URL(manifest.entryPoints.sidebar.url, window.location.origin).origin
        //     }
        // };

        // window.addEventListener('message', (event) => {
        //     this.handleMessageFromIframe(event, iframeMap, manifest);
        // });
    }

    handleMessageFromIframe(messagePath, objectId, frameId, msgContent) { /*event, iframeMap, manifest*/
        // this.handleMessageFromIframe('sidebarToViewport', fullMessage.object, fullMessage.frame, msgContent);

        let frame = realityEditor.getFrame(objectId, frameId);
        let appInfo = this.spatialTools[frameId];
        let manifest = appInfo.manifest;
        
        if (messagePath === 'sidebarToViewport') {
            console.log(`got sidebarToViewport message from ${frameId}`, msgContent);
            
            let allowedMessages = manifest.messages.sidebarToViewport;
            let validatedMessageObject = {
                sidebarToViewport: {}
            };
            Object.keys(msgContent).forEach(unvalidatedKey => {
                if (allowedMessages.includes(unvalidatedKey)) {
                    validatedMessageObject.sidebarToViewport[unvalidatedKey] = msgContent[unvalidatedKey];
                }
            });

            realityEditor.network.postMessageIntoFrame(frameId, validatedMessageObject);
        }

        // const sourceIframe = Object.entries(iframeMap).find(([role, iframeInfo]) =>
        //     iframeInfo.origin === event.origin && iframeInfo.iframe.contentWindow === event.source
        // );
        //
        // if (!sourceIframe) {
        //     // Unknown source, ignore the message
        //     return;
        // }
        //
        // const [senderRole] = sourceIframe;
        // const message = event.data;
        //
        // // Validate the message
        // if (this.validateMessage(message, senderRole, manifest)) {
        //     this.relayMessage(message, senderRole, iframeMap, manifest);
        // }
    }

    validateMessage(message, senderRole, manifest) {
        const recipientRole = senderRole === 'viewport' ? 'sidebar' : 'viewport';
        const allowedMessages = manifest.messages[`${senderRole}To${this.capitalizeFirstLetter(recipientRole)}`];

        return allowedMessages && allowedMessages.includes(message.type);
    }

    relayMessage(message, senderRole, iframeMap, manifest) {
        const recipientRole = senderRole === 'viewport' ? 'sidebar' : 'viewport';
        const recipientIframeInfo = iframeMap[recipientRole];

        if (recipientIframeInfo) {
            recipientIframeInfo.iframe.contentWindow.postMessage(message, recipientIframeInfo.origin);
        }
    }

    capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }
}

// This variable will hold the singleton instance so that only one copy is created
let instance = null;

// First call this to initialize and get the singleton instance
function initToolOrchestrator() {
    if (!instance) {
        instance = new ToolOrchestrator();
    }
    return instance;
}

// After it's initialized, any module can use this to get the singleton instance
export default function getToolOrchestrator() {
    if (!instance) {
        initToolOrchestrator();
    }
    return instance;
}
