"use client";

import { createTag, getDevices } from "@/lib/api";
import { DataType, Device, Tag } from "@iiot/shared-types";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function DeviceDetailsPage() {
  const params = useParams();
  const [device, setDevice] = useState<Device | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTag, setNewTag] = useState<Partial<Tag>>({
    name: "",
    address: "",
    dataType: DataType.INTEGER,
    pollInterval: 1000,
  });

  useEffect(() => {
    loadDevice();
  }, []);

  const loadDevice = async () => {
    try {
      const devices = await getDevices();
      const found = devices.find(d => d.id === params.id);
      if (found) setDevice(found);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!device) return;
    try {
      await createTag(device.id, newTag);
      setIsModalOpen(false);
      loadDevice();
    } catch (err) {
      alert("Failed to create tag");
    }
  };

  if (!device) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8">
      <div className="mb-8">
        <Link href="/devices" className="text-blue-500 hover:underline mb-4 block">
          &larr; Back to Devices
        </Link>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">{device.name}</h1>
            <p className="text-gray-500">
              {device.protocol} - {device.ipAddress}:{device.port}
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Add Tag
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-800 rounded-lg shadow overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 dark:bg-zinc-700">
            <tr>
              <th className="p-4">Name</th>
              <th className="p-4">Address</th>
              <th className="p-4">Type</th>
              <th className="p-4">Interval (ms)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-zinc-700">
            {device.tags?.map(tag => (
              <tr key={tag.id}>
                <td className="p-4 font-medium">{tag.name}</td>
                <td className="p-4 font-mono text-sm">{tag.address}</td>
                <td className="p-4 text-sm">{tag.dataType}</td>
                <td className="p-4 text-sm">{tag.pollInterval}</td>
              </tr>
            ))}
            {(!device.tags || device.tags.length === 0) && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-gray-500">
                  No tags configured yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Add New Tag</h2>
            <form onSubmit={handleCreateTag} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  type="text"
                  required
                  className="w-full p-2 border rounded dark:bg-zinc-800"
                  value={newTag.name}
                  onChange={e => setNewTag({ ...newTag, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Address</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 40001"
                  className="w-full p-2 border rounded dark:bg-zinc-800"
                  value={newTag.address}
                  onChange={e => setNewTag({ ...newTag, address: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Data Type</label>
                  <select
                    className="w-full p-2 border rounded dark:bg-zinc-800"
                    value={newTag.dataType}
                    onChange={e => setNewTag({ ...newTag, dataType: e.target.value as DataType })}
                  >
                    {Object.values(DataType).map(t => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Interval (ms)</label>
                  <input
                    type="number"
                    required
                    className="w-full p-2 border rounded dark:bg-zinc-800"
                    value={newTag.pollInterval}
                    onChange={e => setNewTag({ ...newTag, pollInterval: parseInt(e.target.value) })}
                  />
                </div>
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
                  Add Tag
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
