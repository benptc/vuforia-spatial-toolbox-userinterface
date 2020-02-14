/**
 * @preserve
 *
 *                                      .,,,;;,'''..
 *                                  .'','...     ..',,,.
 *                                .,,,,,,',,',;;:;,.  .,l,
 *                               .,',.     ...     ,;,   :l.
 *                              ':;.    .'.:do;;.    .c   ol;'.
 *       ';;'                   ;.;    ', .dkl';,    .c   :; .'.',::,,'''.
 *      ',,;;;,.                ; .,'     .'''.    .'.   .d;''.''''.
 *     .oxddl;::,,.             ',  .'''.   .... .'.   ,:;..
 *      .'cOX0OOkdoc.            .,'.   .. .....     'lc.
 *     .:;,,::co0XOko'              ....''..'.'''''''.
 *     .dxk0KKdc:cdOXKl............. .. ..,c....
 *      .',lxOOxl:'':xkl,',......'....    ,'.
 *           .';:oo:...                        .
 *                .cd,      ╔═╗┌┬┐┬┌┬┐┌─┐┬─┐    .
 *                  .l;     ║╣  │││ │ │ │├┬┘    '
 *                    'l.   ╚═╝─┴┘┴ ┴ └─┘┴└─   '.
 *                     .o.                   ...
 *                      .''''','.;:''.........
 *                           .'  .l
 *                          .:.   l'
 *                         .:.    .l.
 *                        .x:      :k;,.
 *                        cxlc;    cdc,,;;.
 *                       'l :..   .c  ,
 *                       o.
 *                      .,
 *
 *      ╦═╗┌─┐┌─┐┬  ┬┌┬┐┬ ┬  ╔═╗┌┬┐┬┌┬┐┌─┐┬─┐  ╔═╗┬─┐┌─┐ ┬┌─┐┌─┐┌┬┐
 *      ╠╦╝├┤ ├─┤│  │ │ └┬┘  ║╣  │││ │ │ │├┬┘  ╠═╝├┬┘│ │ │├┤ │   │
 *      ╩╚═└─┘┴ ┴┴─┘┴ ┴  ┴   ╚═╝─┴┘┴ ┴ └─┘┴└─  ╩  ┴└─└─┘└┘└─┘└─┘ ┴
 *
 *
 * Created by Valentin on 10/22/14.
 *
 * Copyright (c) 2015 Valentin Heun
 * Modified by Valentin Heun 2014, 2015, 2016, 2017
 * Modified by Benjamin Reynholds 2016, 2017
 * Modified by James Hobin 2016, 2017
 *
 * All ascii characters above must be included in any redistribution.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

createNameSpace("realityEditor.device");

/**
 * @fileOverview realityEditor.device.onLoad.js
 * Sets the application's window.onload function to trigger this init method, which sets up the GUI and networking.
 */

/**
 * When the index.html first finishes loading, set up the:
 * Sidebar menu buttons,
 * Pocket and memory bars,
 * Background canvas,
 * Touch Event Listeners,
 * Network callback function,
 * ... and notify the native iOS code that the user interface finished loading
 */
realityEditor.device.onload = function () {

    // Initialize some global variables for the device session
    this.cout('Running on platform: ' + globalStates.platform);
    if (globalStates.platform !== 'iPad' && globalStates.platform !== 'iPhone' && globalStates.platform !== 'iPod touch') {
        globalStates.platform = false;
    }

    // desktop adapter needs to load first to modify namespace if needed
    realityEditor.device.desktopAdapter.initService();

    // load persistent state from disk
    realityEditor.app.getExternalText('realityEditor.app.callbacks.onExternalText');
    realityEditor.app.getDiscoveryText('realityEditor.app.callbacks.onDiscoveryText');
    realityEditor.app.getZoneState('realityEditor.app.callbacks.onZoneState');
    realityEditor.app.getZoneText('realityEditor.app.callbacks.onZoneText');
    realityEditor.app.getRealtimeState('realityEditor.app.callbacks.onRealtimeState');
    realityEditor.app.getTutorialState('realityEditor.app.callbacks.onTutorialState');
    
    realityEditor.gui.settings.addToggle('Extended Tracking', '', 'extendedTracking', 'SETUP:EXTENDED_TRACKING', '../../../svg/extended.svg', false, function(newValue) {
        console.log('extended tracking was set to ' + newValue);
        this.enableExtendedTracking(newValue);
    });

    realityEditor.gui.settings.addToggle('Grouping', 'double-tap background to draw group around frames', 'groupingEnabled', 'SETUP:GROUPING', '../../../svg/grouping.svg', false, function(newValue) {
        console.log('grouping was set to ' + newValue);
        realityEditor.gui.ar.grouping.toggleGroupingMode(newValue);
    });

    realityEditor.gui.settings.addToggle('Realtime Collaboration', 'constantly synchronizes with other users', 'realtimeEnabled', 'SETUP:REALTIME', '../../../svg/realtime.svg', false, function(newValue) {
        console.log('realtime was set to ' + newValue);
        if (newValue) {
            realityEditor.network.realtime.initService();
        }
        // TODO: turning this off currently doesn't actually end the realtime mode unless you restart the app
    });

    realityEditor.gui.settings.addToggle('Video Recording', 'show recording button to create video frames', 'videoRecordingEnabled', 'SETUP:VIDEO_RECORDING', '../../../svg/video.svg', false, function(newValue) {
        console.log('video recording was set to ' + newValue);
        if (!newValue) {
            realityEditor.device.videoRecording.stopRecording(); // ensure recording is stopped when mode is turned off
        }
    });

    // TODO: move each of these into their respective modules, e.g. this should go in desktopAdapter.js
    realityEditor.gui.settings.addToggle('Connect to Desktop', 'sends matrices to Desktop Editor', 'matrixBroadcastEnabled', 'SETUP:CONNECT_TO_DESKTOP', '../../../svg/desktopConnect.svg', false, function(newValue) {
        console.log('connect to desktop was set to ' + newValue);
        if (newValue) {
            // if enabled, forwards the matrix stream to a connected desktop editor via UDP messages
            realityEditor.device.desktopAdapter.startBroadcast();
        } else {
            realityEditor.device.desktopAdapter.stopBroadcast();
        }
    });

    realityEditor.gui.settings.addToggle('Holo-Mode', 'adjusts UI foor HMD viewer (desktop only)', 'hololensModeEnabled', 'SETUP:HOLO_MODE', '../../../svg/holo.svg', false, function(newValue) {
        console.log('hololens mode was set to ' + newValue);
        realityEditor.device.hololensAdapter.toggleHololensMode(newValue);
    });

    realityEditor.gui.settings.addToggle('Instant Connect', 'if available with prepared objects', 'instantState', 'SETUP:INSTANT_CONNECT', '../../../svg/instantLink.svg', false, function(newValue) {
        console.log('instant connect was set to ' + newValue);
    });
    
    realityEditor.gui.settings.addToggle('Speech Controls', 'must enable microphone', 'speechState', 'SETUP:SPEECH', '../../../svg/speech.svg', false, function(newValue) {
        console.log('speech controls was set to ' + newValue);
        
        if (newValue) { // TODO: if default value is true, how will these get triggered?
            if (globalStates.debugSpeechConsole) {
                document.getElementById('speechConsole').style.display = 'inline';
            }
            realityEditor.app.addSpeechListener("realityEditor.device.speechProcessor.speechRecordingCallback");
            realityEditor.app.startSpeechRecording();
        } else {
            document.getElementById('speechConsole').style.display = 'none';
            realityEditor.app.stopSpeechRecording();
        }
        
    });

    realityEditor.gui.settings.addToggle('Show Logger', 'prints debug information in the corner', 'loggerState', 'SETUP:SHOW_LOGGER', 'undefined.svg', false, function(e) {
        console.log('show logger was set to ' + e);
    });

    realityEditor.gui.settings.addToggle('Read-only', 'prevents user from making changes', 'readOnlyMode', 'SETUP:READ_ONLY', 'undefined.svg', false, function(e) {
        console.log('read-only mode was set to ' + e);
    });
    
    // initialize additional services
    realityEditor.device.initService();
    realityEditor.device.touchInputs.initService();
    realityEditor.device.videoRecording.initService();
    realityEditor.gui.ar.frameHistoryRenderer.initService();
    realityEditor.gui.ar.grouping.initService();
    realityEditor.device.touchPropagation.initService();
    realityEditor.device.speechPerformer.initService(); // TODO: service is internally disabled
    realityEditor.device.security.initService(); // TODO: service is internally disabled
    realityEditor.network.realtime.initService();
    realityEditor.device.hololensAdapter.initService(); // TODO: disable this
    realityEditor.gui.ar.desktopRenderer.initService();
    realityEditor.device.desktopCamera.initService();
    realityEditor.gui.crafting.initService();
    realityEditor.worldObjects.initService();
    realityEditor.device.distanceScaling.initService();
    realityEditor.device.keyboardEvents.initService();
    realityEditor.network.frameContentAPI.initService();
    realityEditor.envelopeManager.initService();
    realityEditor.network.availableFrames.initService();
    
    // on desktop, the desktopAdapter adds a different update loop, but on mobile we set up the default one here
    // if (!realityEditor.device.utilities.isDesktop()) {
    //     realityEditor.gui.ar.draw.updateLoop();
    // }

    realityEditor.app.getDeviceReady('realityEditor.app.callbacks.getDeviceReady');

    globalStates.realityState = false;
    globalStates.tempUuid = realityEditor.device.utilities.uuidTimeShort();
    this.cout("This editor's session UUID: " + globalStates.tempUuid);

    // assign global pointers to frequently used UI elements
    overlayDiv = document.getElementById('overlay');

    // adds touch handlers for each of the menu buttons
    realityEditor.gui.menus.init();
    
    // center the menu vertically if the screen is taller than 320 px
    var MENU_HEIGHT = 320;
    var menuHeightDifference = globalStates.width - MENU_HEIGHT;
    document.getElementById('UIButtons').style.top = menuHeightDifference/2 + 'px';
    CRAFTING_GRID_HEIGHT = globalStates.width - menuHeightDifference;

    // set active buttons and preload some images
    realityEditor.gui.menus.switchToMenu("main", ["gui"], ["reset","unconstrained"]);
	realityEditor.gui.buttons.initButtons();
	
	// set up the pocket and memory bars
    if (!TEMP_DISABLE_MEMORIES) {
        realityEditor.gui.memory.initMemoryBar();
    } else {
        var pocketMemoryBar = document.querySelector('.memoryBar');
        pocketMemoryBar.parentElement.removeChild(pocketMemoryBar);
    }
	realityEditor.gui.memory.nodeMemories.initMemoryBar();
	realityEditor.gui.pocket.pocketInit();

	// set up the global canvas for drawing the links
	globalCanvas.canvas = document.getElementById('canvas');
    globalCanvas.canvas.width = globalStates.height; // TODO: fix width vs height mismatch once and for all
    globalCanvas.canvas.height = globalStates.width;
	globalCanvas.context = globalCanvas.canvas.getContext('2d');

    // add a callback for messages posted up to the application from children iframes
	window.addEventListener("message", realityEditor.network.onInternalPostMessage.bind(realityEditor.network), false);
		
	// adds all the event handlers for setting up the editor
    realityEditor.device.addDocumentTouchListeners();
    
    // adjust for iPhoneX size if needed
    realityEditor.device.layout.adjustForScreenSize();

    // prevent touch events on overlayDiv
    overlayDiv.addEventListener('touchstart', function (e) {
        e.preventDefault();
    });

    // var stats=new Stats();
    // // stats.showPanel( 2 );
    // document.body.appendChild(stats.dom);
    
    // start TWEEN library for animations
    (function animate(time) {
        realityEditor.gui.ar.draw.frameNeedsToBeRendered = true;
        // TODO This is a hack to keep the crafting board running
        if (globalStates.freezeButtonState && !realityEditor.device.utilities.isDesktop()) {
            realityEditor.gui.ar.draw.update(realityEditor.gui.ar.draw.visibleObjectsCopy); 
        }
        requestAnimationFrame(animate);
        TWEEN.update(time);
        // stats.update();
        
        // TODO: implement separated render and recalculate functions for the rendering engine
        // realityEditor.gui.ar.draw.render();
    })();
    
    // start the AR framework in native iOS
    targetDownloadStates = {}; // reset downloads
    realityEditor.app.getVuforiaReady('realityEditor.app.callbacks.vuforiaIsReady');
    
    // window.addEventListener('resize', function(event) {
    //     console.log(window.innerWidth, window.innerHeight);
    // });
    
    // this is purely for debugging purposes, can be removed in production.
    // re-purposes the speechConsole from an old experiment into an on-screen message display for debug messages
    // TODO: implement a clean system for logging info or debug messages to an on-screen display
    if (!realityEditor.device.utilities.isDesktop()) {
        if (globalStates.debugSpeechConsole) {
            document.getElementById('speechConsole').style.display = 'inline';
            
            var DEBUG_SHOW_CLOSEST_OBJECT = false;
            if (DEBUG_SHOW_CLOSEST_OBJECT) {
                setInterval(function() {
                    var closestObjectKey = realityEditor.gui.ar.getClosestObject()[0];
                    if (closestObjectKey) {
                        var mat = realityEditor.getObject(closestObjectKey).matrix; //realityEditor.gui.ar.draw.visibleObjects[closestObjectKey];
                        if (realityEditor.gui.ar.draw.worldCorrection !== null) {
                            console.warn('Should never get here until we fix worldCorrection');
                            document.getElementById('speechConsole').innerText = 'object ' + closestObjectKey + ' is at (' + mat[12]/mat[15] + ', ' + mat[13]/mat[15] + ', ' + mat[14]/mat[15] + ')';
                        }
                    }
                }, 500);
            }
        }
    }


    // initWorldObject();

    this.cout("onload");
};

window.onload = realityEditor.device.onload;
