const cdk = require("@aws-cdk/core");
const s3 = require('@aws-cdk/aws-s3');
const s3deploy = require('@aws-cdk/aws-s3-deployment');
const lambdaEventSources = require('@aws-cdk/aws-lambda-event-sources');

class S3Construct extends cdk.Construct {
    bucket;
    website;
    s3PutEventSource;
    constructor(scope, id) {
        super(scope, id);

        this.bucket = new s3.Bucket(this, 'assetBucket', {
            bucketName: 'dash-poc-assets',
            publicReadAccess: false,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
        });


        this.website = new s3.Bucket(this, 'websiteBucket', {
            bucketName: 'dash-poc-website',
            publicReadAccess: true,
            cors: [{ allowedMethods: [s3.HttpMethods.GET], allowedOrigins: ['*'] }],
            websiteIndexDocument: 'indx.html',
            websiteErrorDocument: 'index.html',
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
        });

        this.s3PutEventSource = new lambdaEventSources.S3EventSource(this.website, {
            events: [
                s3.EventType.OBJECT_CREATED_PUT
            ],
            filters: [
                {
                    prefix: 'public/uploads/'
                }
            ]
        });

        // Deploy static contents to S3 bucket
        new s3deploy.BucketDeployment(this, 'DeployAsset', {
            sources: [s3deploy.Source.asset('src/assets')],
            destinationBucket: this.bucket,
            destinationKeyPrefix: 'raw',
        });

        // Deploy website contents to S3 bucket
        new s3deploy.BucketDeployment(this, 'DeployWebsite', {
            sources: [s3deploy.Source.asset('src/website')],
            destinationBucket: this.bucket,
            destinationKeyPrefix: 'raw',
        });

        // Outputs

        new cdk.CfnOutput(this, 'Website URL', {
            value: this.website.bucketWebsiteUrl,
            description: 'URL for image uploader website',
            exportName: 'DashPocWebsite'
        });
    }
}
module.exports = { S3Construct }
