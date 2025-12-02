import { Device, Protocol } from "@iiot/shared-types";
import { PrismaClient } from "@prisma/client";
import { Server } from "socket.io";
import { DriverFactory } from "../drivers/DriverFactory";
import { DataRouter } from "./DataRouter";
import { DeviceWorker } from "./DeviceWorker";
import { MqttService } from "./MqttService";
import { OpcUaServerService } from "./OpcUaServerService";

const prisma = new PrismaClient();

export class Engine {
  private workers: Map<string, DeviceWorker> = new Map();
  private mqttService: MqttService;
  private opcUaServer: OpcUaServerService;
  private dataRouter: DataRouter;

  constructor(private io: Server) {
    this.mqttService = new MqttService();
    this.opcUaServer = new OpcUaServerService();
    this.dataRouter = new DataRouter(this.opcUaServer, this.mqttService);
  }

  public async start() {
    console.log("Engine: Starting...");

    // Start Upstream Services
    await this.opcUaServer.start();

    // Load all enabled devices from DB
    const devices = await prisma.device.findMany({
      where: { enabled: true },
      include: { tags: true },
    });

    for (const deviceData of devices) {
      // Cast Prisma types to Shared types (enums match string names)
      const device: Device = {
        ...deviceData,
        protocol: deviceData.protocol as Protocol,
        tags: deviceData.tags.map(t => ({ ...t, dataType: t.dataType as any })),
      };

      await this.startDevice(device);
    }
  }

  public async startDevice(device: Device) {
    // Stop existing worker if any
    if (this.workers.has(device.id)) {
      await this.workers.get(device.id)?.stop();
    }

    const driver = DriverFactory.createDriver(device.protocol, {
      ipAddress: device.ipAddress,
      port: device.port,
    });

    const worker = new DeviceWorker(device, driver, this.mqttService, this.io, this.dataRouter);
    if (device.tags) {
      worker.setTags(device.tags);
    }

    this.workers.set(device.id, worker);
    worker.start();
  }

  public async stopDevice(deviceId: string) {
    const worker = this.workers.get(deviceId);
    if (worker) {
      await worker.stop();
      this.workers.delete(deviceId);
    }
  }
}
