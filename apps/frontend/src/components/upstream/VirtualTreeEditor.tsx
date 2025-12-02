"use client";

import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Divider,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Select,
  SelectItem,
  Spacer,
  useDisclosure,
} from "@heroui/react";
import { useEffect, useState } from "react";

interface VirtualNode {
  id: string;
  name: string;
  parentId: string | null;
  mappings?: {
    id: string;
    tagId: string;
  }[];
}

interface Device {
  id: string;
  name: string;
  tags: Tag[];
}

interface Tag {
  id: string;
  name: string;
}

export default function VirtualTreeEditor() {
  const [nodes, setNodes] = useState<VirtualNode[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [newNodeName, setNewNodeName] = useState("");
  const [newChildName, setNewChildName] = useState("");

  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [config, setConfig] = useState({ opcUaServerPort: 4334 });

  useEffect(() => {
    fetchNodes();
    fetchDevices();
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await fetch("http://localhost:3001/api/upstream/config");
      const data = await res.json();
      if (data.opcUaServerPort) setConfig(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveConfig = async () => {
    await fetch("http://localhost:3001/api/upstream/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
    // Close modal manually if needed, or let onOpenChange handle it via the button
  };

  const fetchNodes = async () => {
    try {
      const res = await fetch("http://localhost:3001/api/upstream/nodes");
      const data = await res.json();
      setNodes(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchDevices = async () => {
    try {
      const res = await fetch("http://localhost:3001/api/devices");
      const data = await res.json();
      setDevices(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddNode = async (parentId: string | null, name: string) => {
    if (!name) return;
    await fetch("http://localhost:3001/api/upstream/nodes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, parentId }),
    });
    setNewNodeName("");
    setNewChildName("");
    fetchNodes();
  };

  const handleDeleteNode = async (id: string) => {
    if (!confirm("Are you sure? This will delete all children.")) return;
    await fetch(`http://localhost:3001/api/upstream/nodes/${id}`, {
      method: "DELETE",
    });
    if (selectedNodeId === id) setSelectedNodeId(null);
    fetchNodes();
  };

  const handleMapTag = async (tagId: string) => {
    if (!selectedNodeId || !tagId) return;
    await fetch("http://localhost:3001/api/upstream/map", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ virtualNodeId: selectedNodeId, tagId }),
    });
    fetchNodes();
  };

  const handleUnmapTag = async (tagId: string) => {
    if (!selectedNodeId) return;
    await fetch("http://localhost:3001/api/upstream/unmap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ virtualNodeId: selectedNodeId, tagId }),
    });
    fetchNodes();
  };

  // Recursive Tree Renderer
  const renderTree = (parentId: string | null, depth = 0) => {
    const children = nodes.filter(n => n.parentId === parentId);
    return (
      <div style={{ marginLeft: depth * 12 }}>
        {children.map(node => (
          <div key={node.id} className="mb-1">
            <div
              className={`flex items-center p-2 rounded cursor-pointer transition-colors ${
                selectedNodeId === node.id ? "bg-primary/20 text-primary-700 font-medium" : "hover:bg-default-100"
              }`}
              onClick={() => setSelectedNodeId(node.id)}
            >
              <span className="mr-2 text-lg">{node.mappings && node.mappings.length > 0 ? "📦" : "📁"}</span>
              <span>{node.name}</span>
            </div>
            {renderTree(node.id, depth + 1)}
          </div>
        ))}
      </div>
    );
  };

  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  // Helper to find tag name
  const getTagName = (tagId: string) => {
    for (const d of devices) {
      const t = d.tags.find(t => t.id === tagId);
      if (t) return `${d.name} / ${t.name}`;
    }
    return tagId;
  };

  return (
    <div className="flex h-[calc(100vh-150px)] gap-6">
      <Card className="w-1/3 h-full">
        <CardHeader className="flex justify-between items-center px-4 py-3 border-b border-default-200">
          <h2 className="text-lg font-bold">Virtual Namespace</h2>
          <Button size="sm" variant="flat" onPress={onOpen}>
            ⚙️ Settings
          </Button>
        </CardHeader>
        <CardBody className="overflow-y-auto p-4">
          <div className="mb-4 flex gap-2">
            <Input
              size="sm"
              placeholder="New Root Folder"
              value={newNodeName}
              onChange={e => setNewNodeName(e.target.value)}
            />
            <Button size="sm" color="primary" onPress={() => handleAddNode(null, newNodeName)}>
              Add
            </Button>
          </div>
          <div className="mt-2">{renderTree(null)}</div>
        </CardBody>
      </Card>

      <Card className="w-2/3 h-full">
        <CardHeader className="px-4 py-3 border-b border-default-200">
          <h2 className="text-lg font-bold">Node Configuration</h2>
        </CardHeader>
        <CardBody className="p-6">
          {selectedNode ? (
            <div className="flex flex-col gap-6 max-w-xl">
              <div>
                <h3 className="text-xl font-bold mb-1">{selectedNode.name}</h3>
                <p className="text-xs text-default-400 font-mono">{selectedNode.id}</p>
              </div>

              <Divider />

              <div>
                <h4 className="text-sm font-semibold uppercase text-default-500 mb-3">Structure</h4>
                <div className="flex gap-2 items-end">
                  <Input
                    label="Add Child Node"
                    placeholder="Name"
                    labelPlacement="outside"
                    value={newChildName}
                    onChange={e => setNewChildName(e.target.value)}
                  />
                  <Button color="secondary" onPress={() => handleAddNode(selectedNode.id, newChildName)}>
                    Add Child
                  </Button>
                </div>
              </div>

              <Divider />

              <div>
                <h4 className="text-sm font-semibold uppercase text-default-500 mb-3">Data Mapping</h4>
                {selectedNode.mappings && selectedNode.mappings.length > 0 ? (
                  <div className="flex flex-col gap-2 mb-4">
                    {selectedNode.mappings.map(m => (
                      <div
                        key={m.id}
                        className="flex justify-between items-center p-2 bg-success-50 border border-success-200 rounded-lg text-success-700"
                      >
                        <span className="font-medium">{getTagName(m.tagId)}</span>
                        <Button size="sm" color="danger" variant="light" onPress={() => handleUnmapTag(m.tagId)}>
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mb-4 p-3 bg-default-50 border border-default-200 rounded-lg text-default-500 text-sm">
                    This node is a folder. Map tags to add variables to it.
                  </div>
                )}

                <Select
                  label="Add Physical Tag"
                  placeholder="Select a device tag"
                  onChange={e => handleMapTag(e.target.value)}
                  selectedKeys={[]}
                >
                  {devices
                    .map(device =>
                      device.tags.map(tag => (
                        <SelectItem key={tag.id} textValue={`${device.name} / ${tag.name}`}>
                          {device.name} / {tag.name}
                        </SelectItem>
                      ))
                    )
                    .flat()}
                </Select>
              </div>

              <Spacer y={8} />

              <div className="flex justify-end">
                <Button color="danger" variant="flat" onPress={() => handleDeleteNode(selectedNode.id)}>
                  Delete Node
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-default-400">
              <div className="text-4xl mb-4">👈</div>
              <p>Select a node from the tree to configure it.</p>
            </div>
          )}
        </CardBody>
      </Card>

      <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
        <ModalContent>
          {onClose => (
            <>
              <ModalHeader className="flex flex-col gap-1">Upstream Settings</ModalHeader>
              <ModalBody>
                <Input
                  label="OPC UA Server Port"
                  type="number"
                  value={config.opcUaServerPort.toString()}
                  onChange={e => setConfig({ ...config, opcUaServerPort: parseInt(e.target.value) })}
                />
                <p className="text-xs text-default-400">
                  Default: 4334. You must restart the backend service for this to take effect.
                </p>
              </ModalBody>
              <ModalFooter>
                <Button color="danger" variant="light" onPress={onClose}>
                  Close
                </Button>
                <Button
                  color="primary"
                  onPress={() => {
                    handleSaveConfig();
                    onClose();
                  }}
                >
                  Save
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
