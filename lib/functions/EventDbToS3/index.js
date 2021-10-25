// Custom Metrics
const { metricScope, Unit } = require("aws-embedded-metrics");

// Deps
const AWSXRay = require('aws-xray-sdk-core');
const AWS = AWSXRay.captureAWS(require('aws-sdk'));

const docClient = new AWS.DynamoDB.DocumentClient();
const s3 = new AWS.S3();

exports.handler = metricScope(metrics => async function (event) {
  console.log("request:", JSON.stringify(event, undefined, 2));

  const t1 = Date.now();
  const round_min = Math.ceil((new Date().getUTCMinutes() - 3) / 5) * 5;
  const key = `${new Date().toISOString().split(':')[0]}:${round_min}`
  const data = await docClient.query({
    TableName: process.env.TABLE_NAME,
    KeyConditionExpression: 'pk = :pk',
    ExpressionAttributeValues: {
      ':pk': key
    },
    ReturnConsumedCapacity: 'TOTAL',
  }).promise();
  console.log(data);
  metrics.putMetric("DBCapacityConsumed", data.ConsumedCapacity, Unit.Count);
  metrics.putMetric("DBQueryLatency", Date.now()-t1, Unit.Milliseconds);
  const t2 = Date.now();
  s3.putObject({
    Bucket: process.env.BUCKET_NAME,
    Key: `raw/${key}.json`,
    Body: JSON.stringify(data),
    ContentType: 'application/json'
  }).promise()
  metrics.putMetric("S3PutLatency", Date.now()-t2, Unit.Milliseconds);
  metrics.putMetric('InvocationCount', 1, Unit.Count);
  metrics.setProperty("RequestId", event?.requestContext?.requestId);
  return {
    statusCode: 200,
    headers: { "Content-Type": "text/plain" },
    body: `Hello World`,
  };
});