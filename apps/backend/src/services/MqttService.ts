import mqtt from "mqtt";

export class MqttService {
  private client: mqtt.MqttClient;

  constructor() {
    const brokerUrl = process.env.MQTT_BROKER_URL || "mqtt://localhost:1883";
    console.log(`MqttService: Connecting to ${brokerUrl}`);

    this.client = mqtt.connect(brokerUrl);

    this.client.on("connect", () => {
      console.log("MqttService: Connected to Broker");
    });

    this.client.on("error", err => {
      console.error("MqttService: Error", err);
    });
  }

  public publish(deviceName: string, tagName: string, value: any) {
    const topic = `iiot/v1/${deviceName}/${tagName}`;
    const payload = JSON.stringify({
      value,
      timestamp: new Date().toISOString(),
    });

    // Retain=true so new subscribers get the last known value immediately
    this.client.publish(topic, payload, { qos: 0, retain: true });
  }
}
