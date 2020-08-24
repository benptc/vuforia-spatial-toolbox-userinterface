createNameSpace("realityEditor.gui.ar.ocr");

/**
 * @fileOverview
 */

(function(exports) {
    let interval = null;
    
    let ocrAlgorithm = {
        processImage: function(imageData) {
            return 'text';
        }
    };

    function initService() {
        console.log('OCR module initialized');

        realityEditor.gui.settings.addToggle('OCR Mode', 'enable text recognition mode', 'ocrMode',  '../../../svg/powerSave.svg', false, function(newValue) {

            if (newValue) {
                interval = setInterval(updateLoop, 300); // use 33 for 30fps
                document.querySelector('#screenshotHolder').style.display ='inline';

            } else {
                clearInterval(interval);
                document.querySelector('#screenshotHolder').style.display ='none';

            }
        });
    }

    function updateLoop() {
        console.log('ocr update loop');

        realityEditor.app.getScreenshot("S", function(base64String) {
            var screenshotBlobUrl = realityEditor.device.utilities.decodeBase64JpgToBlobUrl(base64String);
            // to show the screenshot, you would:
            document.querySelector('#screenshotHolder').src = screenshotBlobUrl;
            
            let detectedText = ocrAlgorithm.processImage(screenshotBlobUrl);
        });
    }

    exports.initService = initService;
})(realityEditor.gui.ar.ocr);
