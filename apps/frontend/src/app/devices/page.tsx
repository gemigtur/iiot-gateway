"use client";

import { controlDevice, createDevice, getDevices } from "@/lib/api";
import { Device, Protocol } from "@iiot/shared-types";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newDevice, setNewDevice] = useState<Partial<Device>>({
    name: "",
    ipAddress: "127.0.0.1",
    port: 502,
    protocol: Protocol.MODBUS_TCP,
    enabled: true,
  });

  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    try {
      const data = await getDevices();
      setDevices(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createDevice(newDevice);
      setIsModalOpen(false);
      loadDevices();
    } catch (err) {
      alert("Failed to create device");
    }
  };

  const handleControl = async (id: string, action: "start" | "stop") => {
    try {
      await controlDevice(id, action);
      alert(`Device ${action}ed successfully`);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Device Management</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Add Device
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {devices.map(device => (
          <div key={device.id} className="border rounded-lg p-6 shadow-sm bg-white dark:bg-zinc-800">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-semibold">{device.name}</h2>
                <p className="text-sm text-gray-500">{device.protocol}</p>
              </div>
              <span
                className={`px-2 py-1 text-xs rounded ${
                  device.enabled ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                }`}
              >
                {device.enabled ? "Enabled" : "Disabled"}
              </span>
            </div>

            <div className="space-y-2 text-sm mb-6">
              <p>
                IP: {device.ipAddress}:{device.port}
              </p>
              <p>Tags: {device.tags?.length || 0}</p>
            </div>

            <div className="flex gap-2">
              <Link
                href={`/devices/${device.id}`}
                className="flex-1 text-center border border-gray-300 py-2 rounded hover:bg-gray-50 dark:hover:bg-zinc-700"
              >
                Manage Tags
              </Link>
              <button
                onClick={() => handleControl(device.id, "start")}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Start
              </button>
              <button
                onClick={() => handleControl(device.id, "stop")}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Stop
              </button>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Add New Device</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  type="text"
                  required
                  className="w-full p-2 border rounded dark:bg-zinc-800"
                  value={newDevice.name}
                  onChange={e => setNewDevice({ ...newDevice, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">IP Address</label>
                  <input
                    type="text"
                    required
                    className="w-full p-2 border rounded dark:bg-zinc-800"
                    value={newDevice.ipAddress}
                    onChange={e => setNewDevice({ ...newDevice, ipAddress: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Port</label>
                  <input
                    type="number"
                    required
                    className="w-full p-2 border rounded dark:bg-zinc-800"
                    value={newDevice.port}
                    onChange={e => setNewDevice({ ...newDevice, port: parseInt(e.target.value) })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Protocol</label>
                <select
                  className="w-full p-2 border rounded dark:bg-zinc-800"
                  value={newDevice.protocol}
                  onChange={e => setNewDevice({ ...newDevice, protocol: e.target.value as Protocol })}
                >
                  {Object.values(Protocol).map(p => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                  Create Device
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
