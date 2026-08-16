/**
 * Spec §34 defines six states; "Nearby Relay Available" is unreachable
 * until BLE exists (Phase 3), so it's intentionally not produced here.
 * Reusing the same NetworkState name/shape now means the Phase 3 native
 * bridge only has to add a case, not redesign this.
 */
export type NetworkState = "ONLINE" | "OFFLINE";

export function getNetworkState(): NetworkState {
  return navigator.onLine ? "ONLINE" : "OFFLINE";
}

export function subscribeToNetworkState(onChange: (state: NetworkState) => void): () => void {
  const handler = () => onChange(getNetworkState());
  window.addEventListener("online", handler);
  window.addEventListener("offline", handler);
  return () => {
    window.removeEventListener("online", handler);
    window.removeEventListener("offline", handler);
  };
}
