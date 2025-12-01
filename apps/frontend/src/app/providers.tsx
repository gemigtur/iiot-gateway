"use client";

import { SocketProvider } from "@/components/SocketProvider";
import { HeroUIProvider } from "@heroui/react";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <HeroUIProvider>
      <SocketProvider>{children}</SocketProvider>
    </HeroUIProvider>
  );
}
