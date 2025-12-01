import { Tag } from "@iiot/shared-types";
import nodes7 from "nodes7";
import { IDriver } from "../interfaces/IDriver";

export class S7Driver implements IDriver {
  private conn: nodes7;
  private connected: boolean = false;
  private ipAddress: string;
  private port: number;
  private rack: number = 0;
  private slot: number = 1; // Default for S7-300/400/1200/1500 usually 1 or 2

  constructor(ipAddress: string, port: number = 102, rack: number = 0, slot: number = 1) {
    this.conn = new nodes7();
    this.ipAddress = ipAddress;
    this.port = port;
    this.rack = rack;
    this.slot = slot;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const options = {
        port: this.port,
        host: this.ipAddress,
        rack: this.rack,
        slot: this.slot,
        debug: false,
      };

      this.conn.initiateConnection(options, err => {
        if (err) {
          console.error("S7Driver: Connection failed", err);
          this.connected = false;
          reject(err);
        } else {
          console.log("S7Driver: Connected");
          this.connected = true;
          resolve();
        }
      });
    });
  }

  async disconnect(): Promise<void> {
    return new Promise(resolve => {
      this.conn.dropConnection(() => {
        this.connected = false;
        console.log("S7Driver: Disconnected");
        resolve();
      });
    });
  }

  isConnected(): boolean {
    return this.connected;
  }

  async read(tag: Tag): Promise<any> {
    if (!this.connected) throw new Error("S7Driver not connected");

    return new Promise((resolve, reject) => {
      // nodes7 can read a specific item without adding it to the internal list first
      // by passing the address string directly to readAllItems if we managed it,
      // but here we want to read a specific address on demand.
      // nodes7 doesn't have a simple "readOne(address)" method exposed easily without setup.
      // However, we can use addItems -> readAllItems -> removeItems, or just keep adding them.
      // A cleaner way for single read is to use `readItems`.

      this.conn.setTranslationCB((tag: string) => tag); // Identity translation
      this.conn.addItems(tag.address);

      this.conn.readAllItems((err, values) => {
        if (err) {
          reject(err);
        } else {
          // values is an object { "address": value }
          if (values && tag.address in values) {
            resolve(values[tag.address]);
          } else {
            reject(new Error(`Tag ${tag.address} not found in response`));
          }
        }
      });
    });
  }

  async write(tag: Tag, value: any): Promise<void> {
    if (!this.connected) throw new Error("S7Driver not connected");

    return new Promise((resolve, reject) => {
      this.conn.writeItems(tag.address, value, err => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
}
