import { useEffect, useState } from "react";
import { getNetworkState, subscribeToNetworkState, type NetworkState } from "../services/network.js";

const LABEL: Record<NetworkState, string> = {
  ONLINE: "Internet Connected",
  OFFLINE: "Internet Unavailable",
};

const STYLE: Record<NetworkState, string> = {
  ONLINE: "bg-green-100 text-green-800",
  OFFLINE: "bg-amber-100 text-amber-800",
};

/** Spec §34: always show accurate network state, never silently hide it. */
export function NetworkBadge() {
  const [state, setState] = useState<NetworkState>(getNetworkState());

  useEffect(() => subscribeToNetworkState(setState), []);

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-medium ${STYLE[state]}`}>
      {LABEL[state]}
    </span>
  );
}
