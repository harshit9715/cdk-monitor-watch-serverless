// Custom Metrics
const { metricScope, Unit } = require("aws-embedded-metrics");

// Deps
const AWSXRay = require('aws-xray-sdk-core');
const AWS = AWSXRay.captureAWS(require('aws-sdk'));

const docClient = new AWS.DynamoDB.DocumentClient();

exports.handler = metricScope(metrics => async function (event) {
  console.log("request:", JSON.stringify(event, undefined, 2));

  const t1 = Date.now();
  const key = `${new Date().toISOString().split('T')[0]}`;
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
  metrics.putMetric('InvocationCount', 1, Unit.Count);
  metrics.setProperty("RequestId", event?.requestContext?.requestId);
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data.Items),
  };
});