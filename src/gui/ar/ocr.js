createNameSpace("realityEditor.gui.ar.ocr");

/**
 * @fileOverview
 */

(function(exports) {
    let updateInterval = null;
    
    // let ocrAlgorithm = {
    //     processImage: function(_imageData) {
    //         return 'text';
    //     }
    // };

    function initService() {
        console.log('OCR module initialized');

        realityEditor.gui.settings.addToggle('OCR Mode', 'enable text recognition mode', 'ocrMode',  '../../../svg/powerSave.svg', false, function(newValue) {

            if (newValue) {
                
                document.querySelector('#screenshotHolder').style.display ='inline';

                realityEditor.app.subscribeToScreenshots('S', 'realityEditor.gui.ar.ocr.processScreenshot');

            } else {
                clearInterval(updateInterval);
                document.querySelector('#screenshotHolder').style.display ='none';

            }
        });
    }
    
    function processScreenshot(base64String) {
        var screenshotBlobUrl = realityEditor.device.utilities.decodeBase64JpgToBlobUrl(base64String);
        // // to show the screenshot, you would:
        document.querySelector('#screenshotHolder').src = screenshotBlobUrl;

        // let detectedText = ocrAlgorithm.processImage(screenshotBlobUrl);
    }
    
    exports.initService = initService;
    exports.processScreenshot = processScreenshot;
})(realityEditor.gui.ar.ocr);
