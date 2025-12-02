import VirtualTreeEditor from "@/components/upstream/VirtualTreeEditor";

export default function UpstreamPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Upstream Configuration</h1>
        <p className="text-default-500">
          Define the Virtual Namespace for OPC UA and MQTT. Structure your data hierarchy and map physical tags to it.
        </p>
      </div>

      <VirtualTreeEditor />
    </div>
  );
}
