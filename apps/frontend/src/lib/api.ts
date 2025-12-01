import { Device, Tag } from "@iiot/shared-types";

const API_URL = "http://localhost:3001/api";

export async function getDevices(): Promise<Device[]> {
  const res = await fetch(`${API_URL}/devices`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch devices");
  return res.json();
}

export async function createDevice(device: Partial<Device>): Promise<Device> {
  const res = await fetch(`${API_URL}/devices`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(device),
  });
  if (!res.ok) throw new Error("Failed to create device");
  return res.json();
}

export async function createTag(deviceId: string, tag: Partial<Tag>): Promise<Tag> {
  const res = await fetch(`${API_URL}/devices/${deviceId}/tags`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(tag),
  });
  if (!res.ok) throw new Error("Failed to create tag");
  return res.json();
}

export async function controlDevice(deviceId: string, action: "start" | "stop"): Promise<void> {
  const res = await fetch(`${API_URL}/devices/${deviceId}/control`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action }),
  });
  if (!res.ok) throw new Error(`Failed to ${action} device`);
}
