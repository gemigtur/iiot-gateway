import { PrismaClient } from "@prisma/client";
import { MqttService } from "./MqttService";
import { OpcUaServerService } from "./OpcUaServerService";

const prisma = new PrismaClient();

export class DataRouter {
  constructor(private opcUaServer: OpcUaServerService, private mqttService: MqttService) {}

  public async routeData(tagId: string, value: any) {
    // Find all virtual nodes mapped to this tag
    const mappings = await prisma.nodeMapping.findMany({
      where: { tagId },
      include: { virtualNode: true, tag: true },
    });

    for (const mapping of mappings) {
      // 1. Update OPC UA Server
      this.opcUaServer.updateValue(mapping.virtualNodeId, mapping.tagId, value);

      // 2. Publish to MQTT (Construct path with tag name appended)
      const basePath = await this.buildPath(mapping.virtualNodeId);
      const fullPath = `${basePath}/${mapping.tag.name}`;
      this.mqttService.publishCustom(fullPath, value);
    }
  }

  private async buildPath(nodeId: string): Promise<string> {
    // Recursive path building is slow if done every time.
    // In production, cache this path map.
    let pathParts: string[] = [];
    let currentId: string | null = nodeId;

    while (currentId) {
      const node: any = await prisma.virtualNode.findUnique({ where: { id: currentId } });
      if (node) {
        pathParts.unshift(node.name);
        currentId = node.parentId;
      } else {
        currentId = null;
      }
    }
    return pathParts.join("/");
  }
}
