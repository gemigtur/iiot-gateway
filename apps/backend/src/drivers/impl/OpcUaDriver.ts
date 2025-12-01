import { Tag } from "@iiot/shared-types";
import {
  AttributeIds,
  ClientSession,
  DataType,
  DataValue,
  OPCUAClient,
  StatusCode,
  StatusCodes,
  Variant,
} from "node-opcua";
import { IDriver } from "../interfaces/IDriver";

export class OpcUaDriver implements IDriver {
  private client: OPCUAClient;
  private session: ClientSession | null = null;
  private connected: boolean = false;
  private endpointUrl: string;

  constructor(ipAddress: string, port: number) {
    // Construct endpoint URL.
    // Note: OPC UA usually uses opc.tcp://<ip>:<port>
    // Some servers might have a path, but for MVP we assume root.
    this.endpointUrl = `opc.tcp://${ipAddress}:${port}`;

    this.client = OPCUAClient.create({
      endpointMustExist: false,
      connectionStrategy: {
        maxRetry: 1,
      },
    });
  }

  async connect(): Promise<void> {
    try {
      console.log(`OpcUaDriver: Connecting to ${this.endpointUrl}...`);
      await this.client.connect(this.endpointUrl);

      console.log("OpcUaDriver: Creating session...");
      this.session = await this.client.createSession();

      this.connected = true;
      console.log("OpcUaDriver: Connected and Session Created");
    } catch (error) {
      console.error("OpcUaDriver: Connection failed", error);
      this.connected = false;
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.session) {
      await this.session.close();
      this.session = null;
    }
    await this.client.disconnect();
    this.connected = false;
    console.log("OpcUaDriver: Disconnected");
  }

  isConnected(): boolean {
    return this.connected && this.session !== null;
  }

  async read(tag: Tag): Promise<any> {
    if (!this.session) throw new Error("OpcUaDriver not connected");

    try {
      const nodeId = tag.address; // e.g. "ns=1;s=Temperature"
      const dataValue: DataValue = await this.session.read({
        nodeId: nodeId,
        attributeId: AttributeIds.Value,
      });

      if (dataValue.statusCode !== StatusCodes.Good) {
        throw new Error(`Bad status code: ${dataValue.statusCode.toString()}`);
      }

      return dataValue.value.value;
    } catch (error) {
      console.error(`OpcUaDriver: Read error on ${tag.name}`, error);
      throw error;
    }
  }

  async write(tag: Tag, value: any): Promise<void> {
    if (!this.session) throw new Error("OpcUaDriver not connected");

    try {
      const nodeId = tag.address;

      // We need to guess the type or use the tag.dataType to construct the Variant
      // For MVP, let's try to infer or use a generic approach if possible,
      // but OPC UA is strict. We should map our shared DataType to OPC UA DataType.

      let opcType = DataType.Int32; // Default
      switch (tag.dataType) {
        case "BOOLEAN":
          opcType = DataType.Boolean;
          break;
        case "FLOAT":
          opcType = DataType.Float;
          break;
        case "STRING":
          opcType = DataType.String;
          break;
        case "INTEGER":
          opcType = DataType.Int32;
          break;
      }

      const variant = new Variant({
        dataType: opcType,
        value: value,
      });

      const statusCode: StatusCode = await this.session.write({
        nodeId: nodeId,
        attributeId: AttributeIds.Value,
        value: {
          value: variant,
        },
      });

      if (statusCode !== StatusCodes.Good) {
        throw new Error(`Write failed with status: ${statusCode.toString()}`);
      }
    } catch (error) {
      console.error(`OpcUaDriver: Write error on ${tag.name}`, error);
      throw error;
    }
  }
}
