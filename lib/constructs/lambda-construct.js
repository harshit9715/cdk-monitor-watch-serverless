
const cdk = require("@aws-cdk/core");
const iam = require('@aws-cdk/aws-iam');
const lambda = require("@aws-cdk/aws-lambda");
const {NodejsFunction} = require('@aws-cdk/aws-lambda-nodejs');
const layerArn = `arn:aws:lambda:us-east-2:580247275435:layer:LambdaInsightsExtension:14`;
class LambdaConstruct extends cdk.Construct {
  eventDBWriter;
  eventS3Writer;
  imageUploader;
  listFiles;
  quickMl;
  constructor(scope, id, props) {
    super(scope, id, props);
    const { database, bucket, website } = props;

    const lambdarole = new iam.Role(this, "lambdaRole", { assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com') });
    lambdarole.addManagedPolicy({ managedPolicyArn: 'arn:aws:iam::aws:policy/CloudWatchLambdaInsightsExecutionRolePolicy' });
    lambdarole.addManagedPolicy({ managedPolicyArn: 'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole' });
  
    const commonLayer = new lambda.LayerVersion(this,"CommonLayer", {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      compatibleRuntimes: [
        lambda.Runtime.NODEJS_12_X,
        lambda.Runtime.NODEJS_14_X,
      ],
      code: lambda.Code.fromAsset('lib/layers/common')
    })

    this.eventDBWriter = nodeFn(this, 'EventsWriter','DBWriterFn',[commonLayer],lambdarole,{
      PRIMARY_KEY: 'pk',
      TABLE_NAME: database.tableName,
    })
    database.grantReadWriteData(this.eventDBWriter);
    this.eventS3Writer = nodeFn(this, 'S3Aggregator','EventDbToS3',[commonLayer],lambdarole,{
      PRIMARY_KEY: 'pk',
      TABLE_NAME: database.tableName,
      BUCKET_NAME: bucket.bucketName,
    })

    database.grantReadWriteData(this.eventS3Writer);
    bucket.grantReadWrite(this.eventS3Writer);

    // 👇 create image-uploader Lambda
    this.imageUploader = nodeFn(this, 'ImgUploadApi','ImageUploader',[commonLayer],lambdarole,{
      PRIMARY_KEY: 'pk',
      TABLE_NAME: database.tableName,
      BUCKET_NAME: website.bucketName,
      FILE_PATH: 'public/uploads',
      MAX_IMAGE_SIZE_MB: '6',
    },['lambda-multipart-parser'],[],15);

    website.grantReadWrite(this.imageUploader);

    this.quickMl = nodeFn(this, 'QuickMlS3Event','QuickMLToDb',[commonLayer],lambdarole,{
      PRIMARY_KEY: 'pk',
      TABLE_NAME: database.tableName,
      BUCKET_NAME: website.bucketName,
    },[],[],15);
    database.grantReadWriteData(this.quickMl);
    website.grantReadWrite(this.quickMl);
    this.quickMl.role.addManagedPolicy({managedPolicyArn: 'arn:aws:iam::aws:policy/AmazonRekognitionFullAccess'})

    this.listFiles = nodeFn(this, 'ListFilesApi','ListFilesFn',[commonLayer],lambdarole,{
      PRIMARY_KEY: 'pk',
      TABLE_NAME: database.tableName,
      BUCKET_NAME: website.bucketName,
    });
    database.grantReadWriteData(this.listFiles);
    website.grantReadWrite(this.listFiles);

    new cdk.CfnOutput(this, 'DBWriterFn', {
      value: this.eventDBWriter.functionName,
      description: 'Name of the DBWriter Lambda Function',
      exportName: 'DashPocDBWriterFn'
    });
    new cdk.CfnOutput(this, 'EventDbToS3', {
      value: this.eventS3Writer.functionName,
      description: 'Name of the EventDbToS3 Lambda Function',
      exportName: 'DashPocEventDbToS3Fn'
    });
  }
}
module.exports = { LambdaConstruct }

const nodeFn = (that, name, entry, layers, lambdarole, environment, nodeModules=[], externalModules=[], timeout=3) => new NodejsFunction(that, `${name}Resource`, {
  functionName: `${name}Fn`,
  runtime: lambda.Runtime.NODEJS_14_X,
  entry: `lib/functions/${entry}/index.js`,
  timeout: cdk.Duration.seconds(timeout),
  layers: [{
    layerVersionArn: layerArn,
    compatibleRuntimes: [lambda.Runtime.NODEJS_12_X, lambda.Runtime.NODEJS_14_X]
  }].concat(layers),
  role: lambdarole,
  tracing: lambda.Tracing.ACTIVE,
  environment: {
    AWS_EMF_NAMESPACE: 'PocEvents',
    AWS_EMF_SERVICE_NAME: name,
    AWS_EMF_ENVIRONMENT: 'Dev',
    ...environment,
  },
  bundling: {
    minify: true,
    nodeModules,
    externalModules,
  }
});