// Custom Metrics
const { metricScope, Unit } = require("aws-embedded-metrics");

// Deps
const AWSXRay = require('aws-xray-sdk-core');
const AWS = AWSXRay.captureAWS(require('aws-sdk'));

const docClient = new AWS.DynamoDB.DocumentClient();
const ml = new AWS.Rekognition();


exports.handler = metricScope(metrics => async function(event) {
  console.log("request:", JSON.stringify(event, undefined, 2));
  metrics.putMetric('InvocationCount', 1, Unit.Count);
  metrics.putMetric('ProcessedImgCount', event.Records.length, Unit.Count);
  try {
    for (let i = 0; i < event.Records.length; i++) {
      console.log('Event Name: %s', event.Records[i].eventName);
      console.log('S3 Request: %j', event.Records[i].s3);
      const t1 = Date.now();
      const params = {
        Image: {
          S3Object: {
            Bucket: event.Records[i].s3.bucket.name,
            Name: event.Records[i].s3.object.key
          },
        },
        MaxLabels: 10
      };
      const response = await ml.detectLabels(params).promise();
      const data = await docClient.put({
        TableName: process.env.TABLE_NAME,
        Item: {
          pk: `${new Date().toISOString().split('T')[0]}`,
          sk: `${event.Records[i].s3.object.key}`,
          labels: response.Labels,
        },
        ReturnConsumedCapacity: 'TOTAL'
      }).promise();
      metrics.putMetric("DBCapacityConsumed", data.ConsumedCapacity, Unit.Count);
      metrics.putMetric("ProcessLatency", Date.now()-t1, Unit.Milliseconds);
    }
    return {
      statusCode: 200,
      body: 'Operation Successful!'
    };
  }
  catch (e) {
    console.error(e);
    return {
      statusCode: 500,
      body: JSON.stringify(e)
    };
  }
});