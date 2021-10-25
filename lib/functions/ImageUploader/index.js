"use strict";

const AWSXRay = require('aws-xray-sdk-core');
const AWS = AWSXRay.captureAWS(require('aws-sdk'));
const s3 = new AWS.S3();
// Deps
const {v4:uuid4} = require('uuid');
const parser = require('lambda-multipart-parser');

exports.handler = async (event) => {

    let eventHeaders = event.headers;

    const fileId = uuid4();
    let filePath = `${process.env.FILE_PATH}/${fileId}`;
    let type = eventHeaders["Content-Type"] || eventHeaders['content-type'];
    let image = Buffer.from(event.body, 'base64');

    if (type.startsWith("multipart/")) {
        const result = await parser.parse(event);
        console.log("parser", result);
        image = result.files[0].content;
        type = result.files[0].contentType;
    }

    /**
     * Calculation of the size of the body passed.
     */
    let pad = 0;
    if (event.body.endsWith('==')) {
        pad = 2;
    } else if (event.body.endsWith('=')) {
        pad = 1;
    }

    const sizeInMB = ((event.body.length / 4 * 3 - pad) / 1000000).toFixed(2);
    const maxImageSize = +process.env.MAX_IMAGE_SIZE_MB;

    const isImage = type.startsWith("image/");
    let output;
    /**
     * @description Check the type of body to be image 
     *             and size to be less than maxSize
     */
    filePath = `${filePath}.${type}`.replace('image/','');
    if (isImage) {
        if (sizeInMB < maxImageSize) {
            var params = {
                "Body": image,
                "Bucket": process.env.BUCKET_NAME,
                "Key": filePath,
                "Metadata": {
                    "filename": fileId,
                    "Content-Type": type
                    // "fileExt": ext[1]
                }
            };

            // console.log(`params`, params);

            /**
             * Asynchronus function to upload the image to s3
             * @params image
             * @return Response
             */
            await s3.putObject(params)
                .promise()
                .then(response => {
                    console.log(`response ${JSON.stringify(response)}`);
                    output = {
                        statusCode: 200,
                        body: JSON.stringify({
                            "message": `Image ${fileId} uploaded successfully`,
                            "imageId": filePath,
                        }),
                    };
                })
                .catch(err => {
                    console.log(`Error ${err}`);
                    output = {
                        statusCode: 500,
                        body: JSON.stringify({
                            "error": "There was error uploading the image. Please try again."
                        }),
                    };
                });
        } else output = {
            statusCode: 400,
            body: JSON.stringify({
                "error": `Size of the image is ${sizeInMB}MB.the size should be less than ${maxImageSize} MB`
            })
        };
    } else
        output = {
            statusCode: 400,
            body: JSON.stringify({
                "error": "File should be type: image"
            })
        };

    /**
     * @type {Object JSON}
     */
     output.headers = { 'Content-Type': 'application/json' };
    return output;
};

