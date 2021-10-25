const {CorsHttpMethod, HttpApi, HttpMethod} = require('@aws-cdk/aws-apigatewayv2');
const {LambdaProxyIntegration} = require('@aws-cdk/aws-apigatewayv2-integrations');
const cdk = require('@aws-cdk/core');

class HttpApiConstruct extends cdk.Construct {
    httpApi
    constructor(scope, id, props) {
    super(scope, id, props);

    const {imageUploader, website, listFiles} = props;
    // 👇 create our HTTP Api
    this.httpApi = new HttpApi(this, 'DashHttpAPIs', {
      description: 'Dash HTTP API demo',
      corsPreflight: {
        allowHeaders: [
          'Content-Type',
          'X-Amz-Date',
          'Authorization',
          'X-Api-Key',
        ],
        allowMethods: [
          CorsHttpMethod.OPTIONS,
          CorsHttpMethod.GET,
          CorsHttpMethod.POST,
          CorsHttpMethod.PUT,
          CorsHttpMethod.PATCH,
          CorsHttpMethod.DELETE,
        ],
        allowCredentials: false,
        allowOrigins: [website.bucketWebsiteUrl],
      },
    });

    

    // 👇 add route for GET /todos
    this.httpApi.addRoutes({
      path: '/upload',
      methods: [HttpMethod.POST],
      integration: new LambdaProxyIntegration({
          handler: imageUploader
      }),
    });
    this.httpApi.addRoutes({
      path: '/files',
      methods: [HttpMethod.GET],
      integration: new LambdaProxyIntegration({
          handler: listFiles
      }),
    })
    
    // API URL output
    new cdk.CfnOutput(this, 'HttpAPIOutput', {
      value: this.httpApi.url,
      description: 'Url of Http API',
      exportName: 'HttpApiUrl'
    });
  }
}

module.exports = { HttpApiConstruct }