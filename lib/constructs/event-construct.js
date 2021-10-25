
const cdk = require("@aws-cdk/core");
const events = require("@aws-cdk/aws-events");

class EventConstruct extends cdk.Construct {
  eventRule1min;
  eventRule5min;

  constructor(scope, id) {
    super(scope, id);

    this.eventRule1min = new events.Rule(this, "oneMinuteRule", {
      schedule: events.Schedule.cron({ minute: "0/1" }),
    });

    this.eventRule5min = new events.Rule(this, "fiveMinuteRule", {
      schedule: events.Schedule.cron({ minute: "0/5" }),
    });

  }
}
module.exports = { EventConstruct }
