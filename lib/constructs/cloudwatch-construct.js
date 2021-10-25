const { CfnOutput, Aws, Construct } = require("@aws-cdk/core");
const { GraphWidget, Dashboard, LogQueryWidget, TextWidget, SingleValueWidget, Metric } = require('@aws-cdk/aws-cloudwatch');

const NAMESPACE = 'DashPocEvents';
const SERVICENAME = 'DashPocEventsService';

class DashConstruct extends Construct {
    dashboard
    constructor(scope, id, props) {
        super(scope, id, props);

        const { eventDBWriter, eventS3Writer, imageUploader, quickMl, listFiles, httpApi, database } = props;
        const fns = [eventDBWriter, eventS3Writer, imageUploader, quickMl, listFiles];
        // Create CloudWatch Dashboard
        this.dashboard = new Dashboard(this, "MyDashPocEvents", {
            dashboardName: 'MyDashPocEvents'
        })
        // Create Title for Dashboard
        this.dashboard.addWidgets(new TextWidget({
            markdown: `# MyDashPocEvents Dashboard`,
            height: 1,
            width: 24
        }))

        // Create CloudWatch Dashboard Widgets: Errors, Invocations, Duration, Throttles
        this.dashboard.addWidgets(new SingleValueWidget({
            title: "Invocations",
            metrics: fns.map(fn => fn.metricInvocations()),
            width: 12,
            setPeriodToTimeRange: true,
        }))

        this.dashboard.addWidgets(new SingleValueWidget({
            title: "Errors",
            metrics: fns.map(fn => fn.metricErrors()),
            width: 12
        }))

        this.dashboard.addWidgets(new GraphWidget({
            title: "Duration",
            left: fns.map(fn => fn.metricDuration()),
            width: 12,
            stacked: true,
        }))

        this.dashboard.addWidgets(new GraphWidget({
            title: "Throttles",
            left: fns.map(fn => fn.metricThrottles()),
            width: 12,
        }))
        
        this.dashboard.addWidgets(new SingleValueWidget({
            metrics: [
                newCustomMetric('DBCapacityConsumed', 'avg', eventDBWriter.logGroup.logGroupName, 'NodeJSCronApp'),
                newCustomMetric('DBPutLatency', 'avg', eventDBWriter.logGroup.logGroupName, 'NodeJSCronApp'),
                newCustomMetric('InvocationCount', 'sum', eventDBWriter.logGroup.logGroupName, 'NodeJSCronApp'),
                newCustomMetric('DBQueryLatency', 'avg', eventS3Writer.logGroup.logGroupName, 'NodeJSCronApp'),
                newCustomMetric('S3PutLatency', 'avg', eventS3Writer.logGroup.logGroupName, 'NodeJSCronApp'),
                newCustomMetric('DBCapacityConsumed', 'avg', eventS3Writer.logGroup.logGroupName, 'NodeJSCronApp'),
            ],
            width: 12,
            height: 6,
            title: 'Fn Custom Metrics'
        }))

        // Create Widget to show last 20 Log Entries for each function
        fns.map(fn => (
            this.dashboard.addWidgets(new LogQueryWidget({
                logGroupNames: [fn.logGroup.logGroupName],
                queryLines: [
                    "fields @timestamp, @message",
                    "sort @timestamp desc",
                    "limit 20"],
                width: 24,
            }))
        ))

        // Generate Outputs
        const cloudwatchDashboardURL = `https://${Aws.REGION}.console.aws.amazon.com/cloudwatch/home?region=${Aws.REGION}#dashboards:name=${'MyDashPocEvents'}`;
        new CfnOutput(this, 'DashboardOutput', {
            value: cloudwatchDashboardURL,
            description: 'URL of Sample CloudWatch Dashboard',
            exportName: 'SampleCloudWatchDashboardURL'
        });
    }
}
module.exports = { DashConstruct }


const newCustomMetric = (metricName, statistic, logGroup, serviceType) => new Metric({
    metricName,
    namespace: NAMESPACE,
    statistic,
    dimensionsMap: {
        ServiceName: SERVICENAME,
        LogGroup: logGroup,
        ServiceType: serviceType,
    }
})