// image_grabber
// Jim Spring (jmspring@gmail.com)
//
// Grabs an image from a specified URL and stores it to the desired 
// assure blob store.
//
// Required environment variables:
//
// AZURE_STORAGE_ACCOUNT_NAME
// AZURE_STORAGE_ACCOUNT_KEY
// AZURE_STORAGE_ACCOUNT_CONTAINER_NAME
// IMAGE_CAPTURE_URL
//
// Optional environment variables:
// CAPTURE_FREQUENCY (default 10s)

var request = require('request');
var storageApi = require('azure-storage');
var stream = require('stream');

console.log("here 1");

// verify required environment variables are set
if((process.env.AZURE_STORAGE_ACCOUNT_NAME == undefined) ||
        (process.env.AZURE_STORAGE_ACCOUNT_KEY == undefined) ||
        (process.env.AZURE_STORAGE_ACCOUNT_CONTAINER_NAME == undefined) ||
        (process.env.IMAGE_CAPTURE_URL == undefined)) {
    console.log("The following environment variables must be set:")
    console.log("    AZURE_STORAGE_ACCOUNT_NAME");
    console.log("    AZURE_STORAGE_ACCOUNT_KEY");
    console.log("    AZURE_STORAGE_ACCOUNT_CONTAINER_NAME");
    console.log("    IMAGE_CAPTURE_URL");
    process.exit(1);
}

// storage account information
console.log("here 2");
var storageAccount = process.env.AZURE_STORAGE_ACCOUNT_NAME;
var storageAccountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
var storageAccountContainer = process.env.AZURE_STORAGE_ACCOUNT_CONTAINER_NAME;

// image capture information
var imageUrl = process.env.IMAGE_CAPTURE_URL;
console.log("here 3 -- " + imageUrl);
var captureFrequency = 10;
if(process.env.CAPTURE_FREQUNCY != undefined) {
    captureFrequency = parseInt(process.env.CAPTURE_FREQUNCY);
    if(captureFrequnce <= 0) {
        console.log("CAPTURE_FREQUENCY must be greater than 0");
    }
}

// Allow for graceful shutdown
var shutdown = false;
process.on('SIGTERM', function () {
  shutdown = true;
});

function timestamp() {
    return Math.floor(Date.now() / 1000);
}

function captureImageLoop(lastRetrieval, captureFrequency, blobService) {
console.log("here 8");
    if(shutdown == true) {
        console.log("Shutdown requested.");
        process.exit(0);
    }

    var now = timestamp();
console.log("here 9");
    if((now - lastRetrieval) >= captureFrequency) {
console.log("here 9");
        lastRetrieval = now;
        var requestSettings = {
           method: 'GET',
           url: imageUrl,
           encoding: null
        };
        request(requestSettings, function (error, response, body) {
console.log("here 10");
            if (!error && response.statusCode == 200) {
                var imageStream = new stream.PassThrough();
                imageStream.end(body);
                var blobname = '' + now + '.jpg';
                var imageLength = response.headers['content-length'];
                blobService.createBlockBlobFromStream(storageAccountContainer, 
                                                     blobname,
                                                     imageStream,
                                                     imageLength,
                                                     function(error, result, response) {
console.log("here 11");
                    if(error) {
                        // TODO - consider logging the failure
                    }

                    setTimeout(function() {
                        captureImageLoop(lastRetrieval, captureFrequency, blobService);
                    }, 250);
                });
            } else {
                // Assume a blip in the retrieval of the image and just go onto try again.
                setTimeout(function() {
                    captureImageLoop(lastRetrieval, captureFrequency, blobService);
                }, 250);
            }
        });
    } else {
        setTimeout(function() {
            captureImageLoop(lastRetrieval, captureFrequency, blobService);
        }, 250);
    }
}

console.log("here 5");
// setup, if necessary, the Azure Storage account, creating the container.
var blobService = storageApi.createBlobService(storageAccount, storageAccountKey);
blobService.createContainerIfNotExists(storageAccountContainer, {publicAccessLevel : 'blob'}, function(error, result, response) {
console.log("here 6");
    if (error) {
        console.log("Unable to create storage account container: " + storageAccountContainer + ", error: " + error);
        process.exit(1);
    }

    var lastRetrieval = 0;
console.log("here 7");

    // enter capture loop
    setTimeout(function() {
        captureImageLoop(lastRetrieval, captureFrequency, blobService);
    }, 250);
});
