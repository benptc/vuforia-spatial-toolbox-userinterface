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

/**********************************************************************************************************************
 ******************************************** constant settings *******************************************************
 **********************************************************************************************************************/

var disp = {};
var uiButtons;
var httpPort = 8080;
var timeForContentLoaded = 100; // temporary set to 10000 with the UI Recording mode for video recording
var timeCorrection = {delta: 0, now: 0, then: 0};
var boundListeners = {};

var TEMP_DISABLE_MEMORIES = true;
var mmToMeterScale = 1000; // used to be 1000, but this improves overall scale / initial position of frames

// noinspection JSSuspiciousNameCombination - (width is based on innerHeight and vice versa)
/**********************************************************************************************************************
 ******************************************** global variables  *******************************************************
 **********************************************************************************************************************/

var globalStates = {
	craftingMoveDelay : 400,
	tempUuid : "0000",
	debug: false,
    debugSpeechConsole: false,
	overlay: 0,
	device: "",
	// drawWithLines
	ballDistance: 14,
	ballSize: 6,
	ballAnimationCount: 0,
    nodeSpeechHighlightCounter: 0,
    
    width: window.innerHeight,
    height: window.innerWidth,
	guiState: "ui",
	UIOffMode: false,
	settingsButtonState: false,
	extendedTracking: false,
    zoneText: "",
    zoneState: false,
	currentLogic: null,

	extendedTrackingState: false,
	developerState: false,
	clearSkyState: false,
    realityState: false,
	externalState: "",
    discoveryState: "",
    speechState: false,
	sendMatrix3d: false,
	sendAcl: false,
    
    lockingMode: false,
    //authenticatedUser: null,
    lockPassword: null,

    videoRecordingEnabled: false,
    // videoRecordingMode: true,
    renderFrameGhostsInNodeViewEnabled: true,

    // if enabled, forwards the matrix stream to a connected desktop editor via UDP messages
    matrixBroadcastEnabled: false,
    hololensModeEnabled: false,

	pocketButtonState: false,
    
	freezeButtonState: false,
	logButtonState: false,
	editingMode: false,
    tempEditingMode: false,
	editingNode: false,
    editingFrame: false,
	guiURL: "",
	newURLText: "",
	platform: navigator.platform,
	lastLoop: 0,
	notLoading: "",
	drawDotLine: false,
	drawDotLineX: 0,
	drawDotLineY: 0,
	pointerPosition: [0, 0],
	projectionMatrix: [
		1, 0, 0, 0,
		0, 1, 0, 0,
		0, 0, 1, 0,
		0, 0, 0, 1
	],
	realProjectionMatrix: [
		1, 0, 0, 0,
		0, 1, 0, 0,
		0, 0, 1, 0,
		0, 0, 0, 1
	],
	acceleration:{
		x : 0,
		y : 0,
		z : 0,
		alpha: 0,
		beta: 0,
		gamma: 0,
		motion:0
	},
	sendAcceleration : false,
	angX: 0,
	angY: 0,
	angZ: 0,
	unconstrainedPositioning: false,
    distanceEditingMode: false,
    
	thisAndthat : {
		interval: undefined,
		timeout: undefined
	},
    // constants for screen extension
    framePullThreshold: 50,
    
    // default scale for new frames and nodes
    defaultScale: 0.5,
    
	// retail
	reality: false,
	interface: "gui",

    /**
     * @type {Array.<string>} list of frameKeys that have been edited at any point. later in array = more recently edited.
     */
    mostRecentlyEditedFrames: [],

    /**
     * @type {Array.<string>} list of nodeKeys that have been edited at any point. later in array = more recently edited.
     */
    mostRecentlyEditedNodes: [],

    rightEdgeOffset: (window.innerWidth === 856 && window.innerHeight === 375) ? (74) : (0) // if iPhone X, offset the right edge by 74px
};

var globalCanvas = {};

var globalLogic ={
	size:0,
	x:0,
	y:0,
	rectPoints: [],
	farFrontElement:"",
	frontDepth: 1000000
};

var publicDataCache = {};

var pocketItem  = {"pocket" : new Objects()};
pocketItem["pocket"].frames["pocket"] = new Frame();
var pocketItemId = "";

/**
 * @typedef {Object} PocketContainer
 * @desc A data structure holding the frame or node to be dropped in from the pocket, with additional state.
 * @property {string} type
 * @property {Frame|Node} vehicle
 * @property {string} closestObjectKey
 * @property {{pageX: number, pageY: number}} positionOnLoad
 * @property {boolean} waitingToRender
 */

/**
 * Holds a frame when it is being dropped in from the pocket
 * @type {PocketContainer}
 */
var pocketFrame = {
    type: 'ui',
    vehicle: null,
    closestObjectKey: null,
    positionOnLoad: null,
    waitingToRender: false
};

/**
 * Holds a logic node when it is being dropped in from the pocket
 * @type {PocketContainer}
 */
var pocketNode = {
    type: 'logic',
    vehicle: null,
    positionOnLoad: null,
    closestObjectKey: null,
    closestFrameKey: null,
    waitingToRender: false
};

var globalDOMCache = {};
var shadowObjects = {};

var globalProgram = {
	objectA: false,
    frameA: false,
	nodeA: false,
	logicA:false,
	objectB: false,
    frameB: false,
	nodeB: false,
	logicB:false,
	logicSelector:4
};
var globalMatrix = {
	temp: [
		1, 0, 0, 0,
		0, 1, 0, 0,
		0, 0, 1, 0,
		0, 0, 0, 1
	],
	begin: [
		1, 0, 0, 0,
		0, 1, 0, 0,
		0, 0, 1, 0,
		0, 0, 0, 1
	],
	end: [
		1, 0, 0, 0,
		0, 1, 0, 0,
		0, 0, 1, 0,
		0, 0, 0, 1
	],
	r: [
		1, 0, 0, 0,
		0, 1, 0, 0,
		0, 0, 1, 0,
		0, 0, 0, 1
	],
	r2: [
		1, 0, 0, 0,
		0, 1, 0, 0,
		0, 0, 1, 0,
		0, 0, 0, 1
	],
	copyStillFromMatrixSwitch: false
};

var consoleText = "";

var rotateX = [
	1, 0, 0, 0,
	0, 1, 0, 0,
	0, 0, 1, 0,
	0, 0, 0, 1
];

var editingAnimationsMatrix = [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
];

var pocketDropAnimation = null;

// var pocketBegin = [957.8799965328,14.08087319936,-0.010595169148000001,-0.010574,-14.111489845951999,956.3419195071999,-0.0006352692680000001,-0.000634,-10.408501976832,-1.08562603904, -2.0039759439440004, -1.999972, -2403.635924829311, 4583.42312003328, 2500, 2500];

var pocketBegin = [957.3665564299057, 1.7409374242911637, -0.04205859900475823, -0.04197456592377882, -2.061978731652602, 956.4420738063579, -0.0009198180263892395, -0.0009179802299690101, -31.779574955938326, -1.4650280344646907, -2.003986095420891, -1.9999821311942394, -61760.6504307418, 11001.215652648178, 790.4361984955037, 793.8519069777337];

var visibleObjectTapInterval = null;

var testInterlink = {};

var overlayDiv;
//var overlayImg;
//var overlayImage = [];

var CRAFTING_GRID_WIDTH = 506;
var CRAFTING_GRID_HEIGHT = 320;

/**********************************************************************************************************************
 ***************************************** datacrafting variables  ****************************************************
 **********************************************************************************************************************/

// var blockColorMap = {
//    bright:["#2DFFFE", "#29FD2F", "#FFFD38", "#FC157D"], // blue, green, yellow, red
//    faded:["#EAFFFF", "#EAFFEB", "#FFFFEB", "#FFE8F2"] // lighter: blue, green, yellow, red
//}

var menuBarWidth = 62;
var blockColorMap = ["#00FFFF", "#00FF00", "#FFFF00", "#FF007C"];
var columnHighlightColorMap = ["rgba(0,255,255,0.15)", "rgba(0,255,0,0.15)", "rgba(255,255,0,0.15)", "rgba(255,0,124,0.15)"];
//var activeBlockColor = "#E6E6E6"; // added blocks are grey
//var movingBlockColor = "#FFFFFF"; // blocks turn white when you start to drag them

var DEBUG_DATACRAFTING = false; // when TRUE -> shows crafting board just by tapping on first menu item (DEBUG mode)

var blockIconCache = {};

