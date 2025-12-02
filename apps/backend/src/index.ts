import { PrismaClient } from "@prisma/client";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { Engine } from "./services/Engine";

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*", // Allow all for dev
    methods: ["GET", "POST"],
  },
});

const prisma = new PrismaClient();
const engine = new Engine(io);

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

// --- API Routes ---

// Get all devices
app.get("/api/devices", async (req, res) => {
  const devices = await prisma.device.findMany({
    include: { tags: true },
  });
  res.json(devices);
});

// Create a device
app.post("/api/devices", async (req, res) => {
  try {
    const device = await prisma.device.create({
      data: req.body,
    });
    // Start the worker for this new device
    // We need to fetch it again to get the tags (empty for now) or cast it
    // For simplicity, we just pass it to the engine, assuming no tags yet
    // In a real app, you'd add tags separately
    res.json(device);
  } catch (error) {
    res.status(500).json({ error: "Failed to create device" });
  }
});

// Add a tag to a device
app.post("/api/devices/:id/tags", async (req, res) => {
  const { id } = req.params;
  try {
    const tag = await prisma.tag.create({
      data: {
        ...req.body,
        deviceId: id,
      },
    });

    // Restart the device worker to pick up the new tag
    const device = await prisma.device.findUnique({
      where: { id },
      include: { tags: true },
    });

    if (device) {
      // Cast to shared type
      const sharedDevice: any = { ...device };
      await engine.startDevice(sharedDevice);
    }

    res.json(tag);
  } catch (error) {
    res.status(500).json({ error: "Failed to add tag" });
  }
});

// Start/Stop Device
app.post("/api/devices/:id/control", async (req, res) => {
  const { id } = req.params;
  const { action } = req.body; // 'start' or 'stop'

  if (action === "stop") {
    await engine.stopDevice(id);
  } else if (action === "start") {
    const device = await prisma.device.findUnique({
      where: { id },
      include: { tags: true },
    });
    if (device) {
      await engine.startDevice(device as any);
    }
  }
  res.json({ success: true });
});

app.get("/", (req, res) => {
  res.send("IIoT Gateway Backend is running");
});

io.on("connection", socket => {
  console.log("Client connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

// --- Upstream API Routes ---

// Get Upstream Config
app.get("/api/upstream/config", async (req, res) => {
  const config = await prisma.upstreamConfig.findFirst();
  res.json(config || {});
});

// Update Upstream Config
app.post("/api/upstream/config", async (req, res) => {
  const count = await prisma.upstreamConfig.count();
  if (count === 0) {
    const config = await prisma.upstreamConfig.create({ data: req.body });
    res.json(config);
  } else {
    const first = await prisma.upstreamConfig.findFirst();
    const config = await prisma.upstreamConfig.update({
      where: { id: first!.id },
      data: req.body,
    });
    res.json(config);
  }
});

// Get Virtual Tree
app.get("/api/upstream/nodes", async (req, res) => {
  const nodes = await prisma.virtualNode.findMany({
    include: { mapping: true },
  });
  res.json(nodes);
});

// Create Virtual Node
app.post("/api/upstream/nodes", async (req, res) => {
  try {
    const node = await prisma.virtualNode.create({
      data: req.body,
    });
    // Reload OPC UA
    engine.getOpcUaServer().reloadAddressSpace();
    res.json(node);
  } catch (error) {
    res.status(500).json({ error: "Failed to create node" });
  }
});

// Delete Virtual Node
app.delete("/api/upstream/nodes/:id", async (req, res) => {
  try {
    await prisma.virtualNode.delete({ where: { id: req.params.id } });
    // Reload OPC UA
    engine.getOpcUaServer().reloadAddressSpace();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete node" });
  }
});

// Map Tag to Node
app.post("/api/upstream/map", async (req, res) => {
  const { virtualNodeId, tagId } = req.body;
  try {
    // Check if mapping exists
    const existing = await prisma.nodeMapping.findUnique({
      where: { virtualNodeId },
    });

    if (existing) {
      const mapping = await prisma.nodeMapping.update({
        where: { virtualNodeId },
        data: { tagId },
      });
      engine.getOpcUaServer().reloadAddressSpace();
      res.json(mapping);
    } else {
      const mapping = await prisma.nodeMapping.create({
        data: { virtualNodeId, tagId },
      });
      engine.getOpcUaServer().reloadAddressSpace();
      res.json(mapping);
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to map tag" });
  }
});

httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  // Start the engine
  engine.start();
});
