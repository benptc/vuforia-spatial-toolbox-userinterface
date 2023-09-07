createNameSpace("realityEditor.device.profiling");

import {DebugUI} from '../gui/debugUI.js';

(function(exports) {
    let debugUI = null;
    let activated = false;

    function initService() {
        // debugUI = new DebugUI(document.body);
    }

    // computes the FNV-1a hash of a string - useful as a UUID for a stringified matrix
    function getShortHashForString(str) {
        let hash = 2166136261n; // Initialize to an offset_basis for FNV-1a 32bit
        for(let i = 0; i < str.length; i++) {
            hash ^= BigInt(str.charCodeAt(i));
            hash *= 16777619n;
        }
        return (hash & 0xFFFFFFFFn).toString(16).padStart(8, '0');
    }

    function startTimeProcess(processTitle, options = null) {
        if (!activated) return;
        if (!debugUI) return;
        debugUI.startTimeProcess(processTitle, options);
    }

    function stopTimeProcess(processTitle, category) {
        if (!activated) return;
        if (!debugUI) return;
        debugUI.stopTimeProcess(processTitle, category);
    }
    
    function activate() {
        activated = true;
        if (!debugUI) {
            debugUI = new DebugUI(document.body);
        }
        debugUI.show();
    }
    
    function deactivate() {
        activated = false;
        debugUI.hide();
    }

    exports.initService = initService;
    exports.getShortHashForString = getShortHashForString;
    exports.startTimeProcess = startTimeProcess;
    exports.stopTimeProcess = stopTimeProcess;
    exports.activate = activate;
    exports.deactivate = deactivate;
}(realityEditor.device.profiling));

export const initService = realityEditor.device.profiling.initService;
