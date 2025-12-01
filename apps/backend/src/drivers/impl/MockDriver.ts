import { Tag } from "@iiot/shared-types";
import { IDriver } from "../interfaces/IDriver";

export class MockDriver implements IDriver {
  private connected: boolean = false;

  async connect(): Promise<void> {
    console.log("MockDriver: Connecting...");
    await new Promise(resolve => setTimeout(resolve, 500));
    this.connected = true;
    console.log("MockDriver: Connected");
  }

  async disconnect(): Promise<void> {
    console.log("MockDriver: Disconnecting...");
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  async read(tag: Tag): Promise<any> {
    if (!this.connected) throw new Error("MockDriver not connected");

    // Simulate random values based on data type
    switch (tag.dataType) {
      case "BOOLEAN":
        return Math.random() > 0.5;
      case "INTEGER":
        return Math.floor(Math.random() * 100);
      case "FLOAT":
        return parseFloat((Math.random() * 100).toFixed(2));
      case "STRING":
        return `Mock-${Math.floor(Math.random() * 1000)}`;
      default:
        return 0;
    }
  }

  async write(tag: Tag, value: any): Promise<void> {
    if (!this.connected) throw new Error("MockDriver not connected");
    console.log(`MockDriver: Wrote ${value} to ${tag.name}`);
  }
}
