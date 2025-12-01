"use client";

import { useSocket } from "@/components/SocketProvider";
import { getDevices } from "@/lib/api";
import { Device } from "@iiot/shared-types";
import Link from "next/link";
import { useEffect, useState } from "react";

interface TagValue {
  value: any;
  timestamp: string;
}

export default function Home() {
  const socket = useSocket();
  const [status, setStatus] = useState("Disconnected");
  const [devices, setDevices] = useState<Device[]>([]);
  const [values, setValues] = useState<Record<string, TagValue>>({});

  useEffect(() => {
    loadDevices();
  }, []);

  useEffect(() => {
    if (!socket) return;

    if (socket.connected) setStatus("Connected");

    socket.on("connect", () => setStatus("Connected"));
    socket.on("disconnect", () => setStatus("Disconnected"));

    socket.on("tag_change", (data: { deviceId: string; tagId: string; value: any; timestamp: string }) => {
      setValues(prev => ({
        ...prev,
        [data.tagId]: { value: data.value, timestamp: data.timestamp },
      }));
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("tag_change");
    };
  }, [socket]);

  const loadDevices = async () => {
    try {
      const data = await getDevices();
      setDevices(data);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <main className="min-h-screen p-8 bg-gray-100 dark:bg-zinc-900">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Live Dashboard</h1>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${status === "Connected" ? "bg-green-500" : "bg-red-500"}`}></div>
              <span className="text-sm text-gray-500">{status}</span>
            </div>
          </div>
          <Link href="/devices" className="bg-white dark:bg-zinc-800 px-4 py-2 rounded shadow hover:bg-gray-50">
            Manage Devices &rarr;
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {devices.map(device => (
            <div key={device.id} className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4 border-b pb-2 dark:border-zinc-700">{device.name}</h2>

              <div className="space-y-4">
                {device.tags?.map(tag => {
                  const current = values[tag.id];
                  return (
                    <div key={tag.id} className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-sm">{tag.name}</p>
                        <p className="text-xs text-gray-400 font-mono">{tag.address}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-mono font-bold text-blue-600 dark:text-blue-400">
                          {current?.value ?? "-"}
                        </p>
                        {current && (
                          <p className="text-[10px] text-gray-400">
                            {new Date(current.timestamp).toLocaleTimeString()}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
                {(!device.tags || device.tags.length === 0) && (
                  <p className="text-sm text-gray-400 italic">No tags configured</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
