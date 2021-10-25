const cdk = require("@aws-cdk/core");
const { AttributeType, Table, BillingMode }  = require('@aws-cdk/aws-dynamodb');


class DatabaseConstruct extends cdk.Construct {
    database;
    constructor(scope, id) {
      super(scope, id);
  
      this.database = new Table(this, 'database', {
        billingMode: BillingMode.PAY_PER_REQUEST,
        contributorInsightsEnabled: true,
        partitionKey: {
          name: 'pk',
          type: AttributeType.STRING
        },
        sortKey: {
            name: 'sk',
            type: AttributeType.STRING
          },
        tableName: 'DashPocEventsDB',
        removalPolicy: cdk.RemovalPolicy.DESTROY, // NOT recommended for production code
      });
    }
  }
  module.exports = { DatabaseConstruct }
  