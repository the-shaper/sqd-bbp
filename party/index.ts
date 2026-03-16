import type * as Party from "partykit/server";
import type { CardData } from "../src/types";

// Message types for real-time sync
export type Message =
  | { type: "card:create"; card: CardData; timestamp: number; userId: string }
  | { type: "card:update"; cardId: string; updates: Partial<CardData>; timestamp: number; userId: string }
  | { type: "card:delete"; cardId: string; timestamp: number; userId: string }
  | { type: "card:reorder"; section: string; cardIds: string[]; timestamp: number; userId: string }
  | { type: "connection:create"; connection: { id: string; from: string; to: string }; timestamp: number; userId: string }
  | { type: "connection:delete"; connectionId: string; timestamp: number; userId: string }
  | { type: "presence:update"; user: UserPresence; timestamp: number }
  | { type: "cursor:move"; userId: string; x: number; y: number; timestamp: number }
  | { type: "user:join"; user: UserPresence; timestamp: number }
  | { type: "user:leave"; userId: string; timestamp: number }
  | { type: "presence:init"; users: UserPresence[]; timestamp: number };

export interface UserPresence {
  id: string;
  name: string;
  color: string;
  cursor?: { x: number; y: number };
  lastActive: number;
  isEditing?: string;
}

interface RoomState {
  users: Map<string, UserPresence>;
  lastActivity: number;
}

export default class SessionServer implements Party.Server {
  options: Party.ServerOptions = {
    hibernate: false,
  };

  private state: RoomState;

  constructor(readonly room: Party.Room) {
    this.state = {
      users: new Map(),
      lastActivity: Date.now(),
    };
  }

  // Handle new WebSocket connections
  onConnect(conn: Party.Connection, ctx: Party.ConnectionContext): void {
    console.log(`[PartyKit] User connected to room ${this.room.id}: ${conn.id}`);
    
    // Send current presence list to the new user
    const users = Array.from(this.state.users.values());
    conn.send(JSON.stringify({
      type: "presence:init",
      users,
      timestamp: Date.now(),
    }));
  }

  // Handle incoming messages
  onMessage(message: string, sender: Party.Connection): void {
    try {
      const data = JSON.parse(message) as Message;
      this.state.lastActivity = Date.now();

      switch (data.type) {
        case "card:create":
        case "card:update":
        case "card:delete":
        case "card:reorder":
        case "connection:create":
        case "connection:delete":
          // Broadcast to all other connections in the room
          this.room.broadcast(message, [sender.id]);
          break;

        case "presence:update":
          // Update user presence and broadcast
          if (data.user) {
            this.state.users.set(data.user.id, {
              ...data.user,
              lastActive: Date.now(),
            });
            this.room.broadcast(message, [sender.id]);
          }
          break;

        case "cursor:move":
          // Update cursor position and broadcast
          const user = this.state.users.get(data.userId);
          if (user) {
            user.cursor = { x: data.x, y: data.y };
            user.lastActive = Date.now();
          }
          this.room.broadcast(message, [sender.id]);
          break;

        case "user:join":
          // Add user to presence and broadcast
          if (data.user) {
            this.state.users.set(data.user.id, {
              ...data.user,
              lastActive: Date.now(),
            });
            this.room.broadcast(message);
          }
          break;

        default:
          console.log(`[PartyKit] Unknown message type: ${(data as any).type}`);
      }
    } catch (error) {
      console.error("[PartyKit] Error handling message:", error);
    }
  }

  // Handle connection close
  onClose(conn: Party.Connection): void {
    console.log(`[PartyKit] User disconnected from room ${this.room.id}: ${conn.id}`);
    
    // Find and remove the user
    for (const [userId, user] of this.state.users.entries()) {
      // Note: We can't directly map connection ID to user ID in this simple implementation
      // In a production app, you'd want to store the mapping
      // For now, we'll rely on client-side to send user:leave before disconnect
    }
  }

  // Handle HTTP requests (for health checks, etc.)
  async onRequest(req: Party.Request): Promise<Response> {
    const url = new URL(req.url);
    
    if (url.pathname === "/health") {
      return new Response(JSON.stringify({
        status: "ok",
        room: this.room.id,
        connections: this.room.connections.size,
        users: this.state.users.size,
        lastActivity: this.state.lastActivity,
      }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response("Not found", { status: 404 });
  }

  // Cleanup inactive users periodically
  onAlarm(): void {
    const now = Date.now();
    const INACTIVE_TIMEOUT = 60000; // 60 seconds

    for (const [userId, user] of this.state.users.entries()) {
      if (now - user.lastActive > INACTIVE_TIMEOUT) {
        this.state.users.delete(userId);
        this.room.broadcast(JSON.stringify({
          type: "user:leave",
          userId,
          timestamp: now,
        }));
      }
    }

    // Schedule next alarm
    this.room.storage.setAlarm(now + 30000);
  }
}
