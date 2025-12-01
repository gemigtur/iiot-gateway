# IIoT Gateway

A robust, scalable Industrial IoT Gateway built with Node.js, Next.js, and Docker. This gateway connects to industrial devices (PLCs) via protocols like Modbus, S7, and OPC UA, normalizes the data, and pushes it upstream to MQTT brokers or OPC UA servers.

## Architecture

The project is structured as a Monorepo using NPM Workspaces.

```mermaid
graph TD
    subgraph Docker["Docker Infrastructure"]
        MQTT[Mosquitto Broker]
        DB[PostgreSQL DB]
    end

    subgraph Apps["Apps"]
        BE["Backend (Node.js)"]
        FE["Frontend (Next.js)"]
    end

    PLCs[Industrial Devices] -->|Modbus/S7/OPC UA| BE
    BE -->|Read/Write| DB
    BE -->|Publish Data| MQTT
    BE -->|Real-time Data (Socket.io)| FE
    FE -->|Config API| BE
```

### Components

1.  **Backend (`apps/backend`)**:

    - **Runtime**: Node.js (TypeScript)
    - **Framework**: Express/Fastify
    - **Database**: Prisma ORM (PostgreSQL)
    - **Protocols**: `nodes7`, `modbus-serial`, `node-opcua`
    - **Role**: Polls devices, manages configuration, publishes to MQTT, serves WebSockets.

2.  **Frontend (`apps/frontend`)**:

    - **Runtime**: Next.js 14+ (App Router)
    - **Role**: Dashboard for monitoring live data and configuring devices/tags.

3.  **Shared (`packages/shared-types`)**:
    - TypeScript interfaces shared between Backend and Frontend to ensure type safety.

## Prerequisites

- **Node.js**: v18 or higher
- **Docker** & **Docker Compose**

## Getting Started

### 1. Install Dependencies

From the root directory:

```bash
npm install
```

### 2. Start Infrastructure

Start the PostgreSQL database and Mosquitto MQTT broker:

```bash
docker-compose up -d
```

### 3. Database Setup

Initialize the database schema:

```bash
# In a new terminal
cd apps/backend
npx prisma db push
```

### 4. Run Development

Start both the Backend and Frontend in development mode:

```bash
# From the root directory
npm run dev
```

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Adminer (DB UI)**: http://localhost:8080 (System: PostgreSQL, Server: postgres, User: admin, Pass: password123, DB: iiot_gateway)

## Configuration

### Mosquitto

The MQTT broker is configured in `mosquitto/config/mosquitto.conf`. By default, it allows anonymous access for development ease.

### Environment Variables

- **Backend**: `apps/backend/.env` (Created automatically or manually)
- **Frontend**: `apps/frontend/.env.local`

## Features (Planned)

- [ ] Device Management (CRUD)
- [ ] Tag Management (CRUD)
- [ ] Modbus TCP Driver
- [ ] Siemens S7 Driver
- [ ] OPC UA Client Driver
- [ ] MQTT Upstream Publisher
- [ ] Real-time Dashboard

## Good to know

This command rebuilds the workspace, if a change is made in the shared types this is needed!

```bash
npm run build --workspace=@iiot/shared-types
```
