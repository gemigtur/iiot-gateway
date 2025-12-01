import { Device, Tag } from "@iiot/shared-types";
import { Server } from "socket.io";
import { IDriver } from "../drivers/interfaces/IDriver";
import { MqttService } from "./MqttService";

export class DeviceWorker {
  private driver: IDriver;
  private isRunning: boolean = false;
  private tags: Tag[] = [];
  private pollTimeout: NodeJS.Timeout | null = null;

  constructor(private device: Device, driver: IDriver, private mqttService: MqttService, private io: Server) {
    this.driver = driver;
  }

  public setTags(tags: Tag[]) {
    this.tags = tags;
  }

  public async start() {
    if (this.isRunning) return;
    this.isRunning = true;

    console.log(`DeviceWorker: Starting ${this.device.name}`);
    try {
      await this.driver.connect();
      this.poll();
    } catch (error) {
      console.error(`DeviceWorker: Failed to connect to ${this.device.name}`, error);
      this.isRunning = false;
      // Retry logic could go here
    }
  }

  public async stop() {
    this.isRunning = false;
    if (this.pollTimeout) {
      clearTimeout(this.pollTimeout);
    }
    await this.driver.disconnect();
    console.log(`DeviceWorker: Stopped ${this.device.name}`);
  }

  private async poll() {
    if (!this.isRunning) return;

    const startTime = Date.now();

    for (const tag of this.tags) {
      try {
        const value = await this.driver.read(tag);

        if (value !== undefined && value !== null) {
          // 1. Publish to MQTT
          this.mqttService.publish(this.device.name, tag.name, value);

          // 2. Emit to Socket.io (for real-time dashboard)
          this.io.emit("tag_change", {
            deviceId: this.device.id,
            tagId: tag.id,
            value: value,
            timestamp: new Date().toISOString(),
          });
        }
      } catch (err) {
        console.error(`DeviceWorker: Error reading tag ${tag.name} on ${this.device.name}`, err);
      }
    }

    // Schedule next run
    const duration = Date.now() - startTime;
    // Default to 1000ms if not specified, or use the smallest pollInterval of tags?
    // For simplicity, we use a fixed 1000ms loop for now, or we could use the tag's interval.
    // A better approach for mixed intervals is a scheduler, but for MVP:
    const delay = Math.max(0, 1000 - duration);

    this.pollTimeout = setTimeout(() => this.poll(), delay);
  }
}
