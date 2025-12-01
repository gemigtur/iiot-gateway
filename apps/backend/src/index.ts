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

httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  // Start the engine
  engine.start();
});
