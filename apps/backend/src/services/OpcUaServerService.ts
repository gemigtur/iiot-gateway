import { PrismaClient } from "@prisma/client";
import { DataType, Namespace, OPCUAServer, StatusCodes, Variant } from "node-opcua";

const prisma = new PrismaClient();

export class OpcUaServerService {
  private server: OPCUAServer;
  private namespace: Namespace | null = null;
  private initialized: boolean = false;
  // Map to store variable references for quick updates: VirtualNodeID -> { variable: UAVariable, dataType: DataType }
  private variableMap: Map<string, { variable: any; dataType: DataType }> = new Map();

  constructor() {
    this.server = new OPCUAServer({
      port: 4334, // Default, will be overridden by config
      resourcePath: "/UA/IIoTGateway",
      buildInfo: {
        productName: "IIoT Gateway Server",
        buildNumber: "1",
        buildDate: new Date(),
      },
    });
  }

  public async start() {
    if (this.initialized) return;

    try {
      // 1. Load Config
      const config = await prisma.upstreamConfig.findFirst();
      const port = config?.opcUaServerPort || 4334;

      // Re-initialize server with correct port if needed (requires recreating instance usually,
      // but for MVP we assume default or restart app if port changes)

      await this.server.initialize();
      this.constructAddressSpace();

      await this.server.start();
      console.log(`OPC UA Server started on port ${port}`);
      this.initialized = true;
    } catch (err) {
      console.error("Failed to start OPC UA Server", err);
    }
  }

  public async stop() {
    if (this.initialized) {
      await this.server.shutdown();
      this.initialized = false;
    }
  }

  public updateValue(virtualNodeId: string, value: any) {
    const entry = this.variableMap.get(virtualNodeId);
    if (entry) {
      const { variable, dataType } = entry;

      // Ensure value matches the expected OPC UA DataType
      let safeValue = value;

      try {
        if (dataType === DataType.Double || dataType === DataType.Float) {
          safeValue = Number(value);
        } else if (dataType === DataType.Int32 || dataType === DataType.Int16) {
          safeValue = parseInt(value);
          if (isNaN(safeValue)) safeValue = 0;
        } else if (dataType === DataType.Boolean) {
          safeValue = !!value;
        } else if (dataType === DataType.String) {
          safeValue = String(value);
        }

        // console.log(`OPC UA Server: Updating node ${virtualNodeId} with value ${safeValue} (Type: ${dataType})`);
        variable.setValueFromSource(new Variant({ dataType, value: safeValue }), StatusCodes.Good);
      } catch (e) {
        console.error(`Failed to update node ${virtualNodeId}:`, e);
      }
    }
  }

  private async constructAddressSpace() {
    const addressSpace = this.server.engine.addressSpace;
    if (!addressSpace) return;

    this.namespace = addressSpace.getOwnNamespace();

    // Fetch all virtual nodes with Tag info to determine correct data types
    const nodes = await prisma.virtualNode.findMany({
      include: {
        mapping: {
          include: { tag: true },
        },
      },
    });

    // Build tree.
    // 1. Find roots (parentId is null)
    const roots = nodes.filter((n: any) => !n.parentId);

    // Recursive function to add nodes
    const addNode = (node: any, parentFolder: any) => {
      // 1. Always create a folder for the Virtual Node
      const folder = this.namespace!.addObject({
        organizedBy: parentFolder,
        browseName: node.name,
      });

      // 2. If mapped, add the tag variable inside that folder
      if (node.mapping && node.mapping.tag) {
        const tag = node.mapping.tag;
        let opcType = DataType.Double;
        let initialValue: any = 0.0;

        // Map Prisma DataType to OPC UA DataType
        switch (tag.dataType) {
          case "INTEGER":
            opcType = DataType.Int32;
            initialValue = 0;
            break;
          case "BOOLEAN":
            opcType = DataType.Boolean;
            initialValue = false;
            break;
          case "STRING":
            opcType = DataType.String;
            initialValue = "";
            break;
          case "FLOAT":
            opcType = DataType.Double;
            initialValue = 0.0;
            break;
        }

        const variable = this.namespace!.addVariable({
          componentOf: folder,
          browseName: tag.name,
          dataType: opcType,
          value: new Variant({ dataType: opcType, value: initialValue }),
        });

        this.variableMap.set(node.id, { variable, dataType: opcType });
      }

      // 3. Find and add children (recursively)
      const children = nodes.filter((n: any) => n.parentId === node.id);
      children.forEach((child: any) => addNode(child, folder));
    };

    const objectsFolder = addressSpace.rootFolder.objects;
    roots.forEach((root: any) => addNode(root, objectsFolder));
  }
}
