// Custom Metrics
const { metricScope, Unit } = require("aws-embedded-metrics");
const {v4: uuid4} = require('uuid');
// Deps
const AWSXRay = require('aws-xray-sdk-core');
const AWS = AWSXRay.captureAWS(require('aws-sdk'));

const docClient = new AWS.DynamoDB.DocumentClient();

exports.handler = metricScope(metrics => async function (event) {
  console.log("request:", JSON.stringify(event, undefined, 2));
  const eventId = uuid4();
  const t1 = Date.now();
  const round_min = Math.ceil(new Date().getUTCMinutes() / 5) * 5
  const data = await docClient.put({
    TableName: process.env.TABLE_NAME,
    Item: {
      pk: `${new Date().toISOString().split(':')[0]}:${round_min}`,
      sk: `EID#${eventId}`,
      ...event,
    },
    ReturnConsumedCapacity: 'TOTAL'
  }).promise()
  metrics.putMetric("DBCapacityConsumed", data.ConsumedCapacity, Unit.Count);
  metrics.putMetric("DBPutLatency", Date.now()-t1, Unit.Milliseconds);
  metrics.putMetric('InvocationCount', 1, Unit.Count);
  metrics.setProperty("RequestId", eventId);
  return {
    statusCode: 200,
    headers: { "Content-Type": "text/plain" },
    body: `Hello World`,
  };
});