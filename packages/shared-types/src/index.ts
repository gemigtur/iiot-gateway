export enum Protocol {
  MODBUS_TCP = "MODBUS_TCP",
  S7 = "S7",
  OPC_UA = "OPC_UA",
  MQTT = "MQTT",
  MOCK = "MOCK",
}

export enum DataType {
  BOOLEAN = "BOOLEAN",
  INTEGER = "INTEGER",
  FLOAT = "FLOAT",
  STRING = "STRING",
}

export interface Device {
  id: string;
  name: string;
  ipAddress: string;
  port: number;
  protocol: Protocol;
  enabled: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  tags?: Tag[];
}

export interface Tag {
  id: string;
  name: string;
  address: string;
  dataType: DataType;
  pollInterval: number;
  deviceId: string;
  value?: any; // Last known value
  lastUpdated?: Date;
}
