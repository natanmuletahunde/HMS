"use client";
import { useEffect, useRef, useState } from "react";

// Dynamic import of socket.io-client to avoid SSR issues
let ioInstance: any = null;

async function getIo() {
  if (typeof window === "undefined") return null;
  if (!ioInstance) {
    const { io } = await import("socket.io-client");
    ioInstance = io;
  }
  return ioInstance;
}

/** Retrieve the stored access token from localStorage. */
function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("hms_token");
}

// An absolute value connects cross-origin (for local Docker). A relative value
// is a same-origin proxy prefix (for Replit); an empty value uses /socket.io.
const API_TARGET = (process.env.NEXT_PUBLIC_API_URL ?? "/api-server").replace(/\/+$/, "");

export function useRealtimeChannel(channel: string) {
  const [lastEvent, setLastEvent] = useState<any>(null);
  const socketRef = useRef<any>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    let socket: any;

    getIo().then((io) => {
      if (!io || !mountedRef.current) return;

      const token = getAccessToken();
      if (!token) {
        // No token — skip connection rather than get rejected by the gateway
        return;
      }

      const hasAbsoluteApiOrigin = /^https?:\/\//i.test(API_TARGET);
      socket = io(hasAbsoluteApiOrigin ? API_TARGET : window.location.origin, {
        path: hasAbsoluteApiOrigin ? "/socket.io" : `${API_TARGET}/socket.io`,
        auth: { token },
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionDelay: 2000,
        reconnectionAttempts: 5,
      });

      socketRef.current = socket;

      socket.on("auth_error", (err: any) => {
        console.warn("[ws] Authentication rejected by gateway:", err?.message);
        socket.disconnect();
      });

      socket.on("connect", () => {
        socket.emit(`subscribe-${channel}`);
      });

      const handlers: Record<string, (data: any) => void> = {
        "reservation:update": (data) => mountedRef.current && setLastEvent({ type: "reservation:update", data }),
        "room:update": (data) => mountedRef.current && setLastEvent({ type: "room:update", data }),
        "housekeeping:update": (data) => mountedRef.current && setLastEvent({ type: "housekeeping:update", data }),
        "notification:push": (data) => mountedRef.current && setLastEvent({ type: "notification:push", data }),
        "dashboard:update": (data) => mountedRef.current && setLastEvent({ type: "dashboard:update", data }),
      };

      for (const [event, handler] of Object.entries(handlers)) {
        socket.on(event, handler);
      }
    });

    return () => {
      mountedRef.current = false;
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [channel]);

  return { lastEvent };
}
