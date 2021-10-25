const cdk = require("@aws-cdk/core");
const targets =  require("@aws-cdk/aws-events-targets");
const events = require("@aws-cdk/aws-events");
const { EventConstruct } = require("./constructs/event-construct");
const { LambdaConstruct } = require("./constructs/lambda-construct");
const { DatabaseConstruct } = require("./constructs/dynamodb-construct");
const { S3Construct } = require("./constructs/s3-construct");
const { DashConstruct } = require("./constructs/cloudwatch-construct");
const { HttpApiConstruct } = require("./constructs/http-apig-construct");
class CdkWatchStack extends cdk.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);
    const {bucket, website, s3PutEventSource} = new S3Construct(this, 'S3Resource');
    const {database} = new DatabaseConstruct(this, 'DBResource');
    const {eventDBWriter, eventS3Writer, imageUploader, quickMl, listFiles} = new LambdaConstruct(
      this,
      "LambdaResource",
      {database, bucket, website}
    );
    
    const {httpApi} = new HttpApiConstruct(this, 'HttpAPIResource', {
      imageUploader,
      listFiles,
      website,
    });

    quickMl.addEventSource(s3PutEventSource);
    
    const eventRule = new EventConstruct(this, "EventResource");

    // add the Lambda function as a target for the Event Rule
    eventRule.eventRule1min.addTarget(
      new targets.LambdaFunction(eventDBWriter, {
        event: events.RuleTargetInput.fromObject({ message: "Hello Lambda" }),
      })
    );

    // add the Lambda function as a target for the Event Rule
    eventRule.eventRule5min.addTarget(
      new targets.LambdaFunction(eventS3Writer, {
        event: events.RuleTargetInput.fromObject({ message: "Hello s3" }),
      })
    );

    // allow the Event Rule to invoke the Lambda function
    targets.addLambdaPermission(eventRule.eventRule1min, eventDBWriter);
    targets.addLambdaPermission(eventRule.eventRule5min, eventS3Writer);

    new DashConstruct(this, 'DashResource', {eventDBWriter, 
      eventS3Writer, imageUploader, quickMl, listFiles, httpApi, database})
  }
}

module.exports = { CdkWatchStack }
