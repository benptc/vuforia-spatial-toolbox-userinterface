/*
* Created by Ben Reynolds on 06/10/20.
*
* Copyright (c) 2020 PTC Inc
* 
* This Source Code Form is subject to the terms of the Mozilla Public
* License, v. 2.0. If a copy of the MPL was not distributed with this
* file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

createNameSpace("realityEditor.gui.ar.surfaces");

/**
 * @fileOverview
 * Contains code relevant to calculating, providing visual feedback for, and positioning content
 * relative to surfaces, such as the ground plane or walls.
 */

(function(exports) {
    
    // the matrix of the surface currently being tested, relative to the world origin
    // centered at the screen x,y it was tested at
    let tempSurfaceMatrix = null;
    
    // each time saveCurrentSurfaceIsCalled, the tempSurfaceMatrix gets added to this array
    // so that multiple surfaces can be added to the world
    let savedSurfaces = [];

    /**
     * Sets up the surfaces module
     */
    function initService() {
        console.log('init surfaces module');
    }

    /**
     * Check once if a surface is detected in the current viewport, and return its matrix relative
     * to the world origin
     * @param {number?} _screenX - if provided, ray casts from that (x, y) position
     * @param {number?} _screenY - defaults to screen center
     */
    function testForSurfaceOnce(_screenX, _screenY) {
        
    }

    /**
     * Starts continuously ray casting from the screen center. Whenever a surface is detected, the
     * tempSurfaceMatrix will be updated to its matrix relative to the world origin. Stops when
     * stopTestingForSurfaces is called.
     * @param _screenX
     * @param _screenY
     */
    function startTestingForSurfaces(_screenX, _screenY) {
        
    }

    /**
     * Stops the process initiated by startTestingForSurfaces
     */
    function stopTestingForSurfaces() {
        
    }

    /**
     * Stores the tempSurfaceMatrix detected by startTestingForSurfaces into the savedSurfaces array
     * so that its position relative to the world origin is preserved even if more or
     * different surfaces are detected
     */
    function saveCurrentSurface() {
        
    }

    /**
     * Manually adds a matrix (relative to the world origin) to the savedSurfaces array. This matrix
     * can be obtained, for example, using testForSurfaceOnce 
     * @param {Array.<number>} _matrix
     */
    function saveSurfaceWithMatrix(_matrix) {
        
    }

    /**
     * Returns the savedSurfaces array, so that another module can, for example, render UI for each
     */
    function getAllSavedSurfaces() {
        
    }

    /**
     * Reset the savedSurfaces array so that a new set of surfaces can be detected
     */
    function clearSavedSurfaces() {
        
    }
    
    exports.initService = initService;
    
})(realityEditor.gui.ar.surfaces);
