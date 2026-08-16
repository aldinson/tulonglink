import { getConfig, setConfig } from "../db/db.js";

const DEVICE_ID_KEY = "deviceId";

/**
 * Generated once per installation and persisted in IndexedDB (spec §11:
 * "each installation/device requires a unique device identifier"). Not
 * derived from any hardware identifier — Android/browsers don't expose
 * a stable one reliably, and spec §27/§28 forbid leaking device
 * fingerprints anyway.
 */
export async function getOrCreateDeviceId(): Promise<string> {
  const existing = await getConfig<string>(DEVICE_ID_KEY);
  if (existing) return existing;

  const deviceId = crypto.randomUUID();
  await setConfig(DEVICE_ID_KEY, deviceId);
  return deviceId;
}
