import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type {
  CreateEmergencyInput,
  Device,
  Emergency,
  EmergencyEvent,
  User,
} from "@tulonglink/shared";

/**
 * Stores are limited to what Milestone 1 (online-only reporting, no BLE)
 * actually exercises — RelayMessage/Peer/DeliveryReceipt (Phase 3/4) and
 * Community/Responder (Phase 5 dashboard) are deliberately not modeled
 * here yet (spec §18 lists them as the eventual full set).
 */
interface TulongLinkDb extends DBSchema {
  users: { key: string; value: User };
  devices: { key: string; value: Device };
  emergencies: { key: string; value: Emergency };
  emergencyEvents: {
    key: string;
    value: EmergencyEvent;
    indexes: { incidentId: string };
  };
  syncQueue: {
    key: string;
    value: { incidentId: string; payload: CreateEmergencyInput; attempts: number };
  };
  config: { key: string; value: { key: string; value: unknown } };
}

const DB_NAME = "tulonglink";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<TulongLinkDb>> | null = null;

export function getDb(): Promise<IDBPDatabase<TulongLinkDb>> {
  if (!dbPromise) {
    dbPromise = openDB<TulongLinkDb>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        db.createObjectStore("users", { keyPath: "userId" });
        db.createObjectStore("devices", { keyPath: "deviceId" });
        db.createObjectStore("emergencies", { keyPath: "incidentId" });
        const events = db.createObjectStore("emergencyEvents", { keyPath: "id" });
        events.createIndex("incidentId", "incidentId");
        db.createObjectStore("syncQueue", { keyPath: "incidentId" });
        db.createObjectStore("config", { keyPath: "key" });
      },
    });
  }
  return dbPromise;
}

export async function getConfig<T>(key: string): Promise<T | undefined> {
  const db = await getDb();
  const entry = await db.get("config", key);
  return entry?.value as T | undefined;
}

export async function setConfig<T>(key: string, value: T): Promise<void> {
  const db = await getDb();
  await db.put("config", { key, value });
}

export async function deleteConfig(key: string): Promise<void> {
  const db = await getDb();
  await db.delete("config", key);
}
