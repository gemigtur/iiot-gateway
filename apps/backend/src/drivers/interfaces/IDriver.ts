import { Tag } from "@iiot/shared-types";

export interface IDriver {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;

  read(tag: Tag): Promise<any>;
  write(tag: Tag, value: any): Promise<void>;
}
