import { Protocol } from "@iiot/shared-types";
import { MockDriver } from "./impl/MockDriver";
import { ModbusDriver } from "./impl/ModbusDriver";
import { OpcUaDriver } from "./impl/OpcUaDriver";
import { S7Driver } from "./impl/S7Driver";
import { IDriver } from "./interfaces/IDriver";

export class DriverFactory {
  static createDriver(protocol: Protocol, config: { ipAddress: string; port: number }): IDriver {
    switch (protocol) {
      case Protocol.MODBUS_TCP:
        return new ModbusDriver(config.ipAddress, config.port);
      case Protocol.MOCK:
        return new MockDriver();
      case Protocol.S7:
        return new S7Driver(config.ipAddress, config.port);
      case Protocol.OPC_UA:
        return new OpcUaDriver(config.ipAddress, config.port);
      default:
        console.warn(`Protocol ${protocol} not implemented, falling back to MockDriver`);
        return new MockDriver();
    }
  }
}
