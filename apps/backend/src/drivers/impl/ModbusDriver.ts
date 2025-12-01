import { Tag } from "@iiot/shared-types";
import ModbusRTU from "modbus-serial";
import { IDriver } from "../interfaces/IDriver";

export class ModbusDriver implements IDriver {
  private client: ModbusRTU;
  private connected: boolean = false;
  private ipAddress: string;
  private port: number;

  constructor(ipAddress: string, port: number) {
    this.client = new ModbusRTU();
    this.ipAddress = ipAddress;
    this.port = port;
  }

  async connect(): Promise<void> {
    try {
      console.log(`ModbusDriver: Connecting to ${this.ipAddress}:${this.port}...`);
      await this.client.connectTCP(this.ipAddress, { port: this.port });
      this.client.setID(1); // Default Unit ID
      this.connected = true;
      console.log("ModbusDriver: Connected");
    } catch (error) {
      console.error("ModbusDriver: Connection failed", error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.client.close(() => {
      this.connected = false;
      console.log("ModbusDriver: Disconnected");
    });
  }

  isConnected(): boolean {
    return this.connected;
  }

  async read(tag: Tag): Promise<any> {
    if (!this.connected) throw new Error("ModbusDriver not connected");

    // Address format: "40001" -> Register 0, "30001" -> Input Register 0
    // Simple parsing for MVP: Assume Holding Register if starts with 4, else Input
    const address = parseInt(tag.address);
    const register = address % 10000; // Simple offset

    try {
      // Read 1 register
      const data = await this.client.readHoldingRegisters(register, 1);
      return data.data[0];
    } catch (error) {
      console.error(`ModbusDriver: Read error on ${tag.name}`, error);
      throw error;
    }
  }

  async write(tag: Tag, value: any): Promise<void> {
    if (!this.connected) throw new Error("ModbusDriver not connected");

    const address = parseInt(tag.address);
    const register = address % 10000;

    try {
      await this.client.writeRegister(register, value);
    } catch (error) {
      console.error(`ModbusDriver: Write error on ${tag.name}`, error);
      throw error;
    }
  }
}
