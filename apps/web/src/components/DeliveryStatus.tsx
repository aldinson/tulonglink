import type { DeliveryState } from "@tulonglink/shared";

/**
 * Spec §16's example includes a "Relayed to N nearby devices" line — but
 * that's a BLE relay event (Phase 3) that cannot happen yet. Showing it
 * pinned at "0 devices, pending" would misrepresent a feature that
 * doesn't exist as a feature that's merely waiting, which is its own
 * kind of false implication. It's added back the moment RELAYED is a
 * reachable state.
 */
const PIPELINE: { state: DeliveryState; label: string }[] = [
  { state: "LOCAL_ONLY", label: "Saved on this phone" },
  { state: "SERVER_RECEIVED", label: "Received by TulongLink server" },
  { state: "RESPONDER_ACKNOWLEDGED", label: "Responder acknowledged" },
  { state: "ASSIGNED", label: "Responder assigned" },
  { state: "IN_PROGRESS", label: "Responder in progress" },
  { state: "RESOLVED", label: "Resolved" },
];

export function DeliveryStatus({ state }: { state: DeliveryState }) {
  if (state === "CANCELLED" || state === "EXPIRED") {
    return (
      <div className="rounded-md bg-gray-100 p-4 text-sm text-gray-700">
        This emergency is <strong>{state === "CANCELLED" ? "cancelled" : "expired"}</strong>.
      </div>
    );
  }

  const currentIndex = PIPELINE.findIndex((step) => step.state === state);

  return (
    <div className="space-y-2">
      {PIPELINE.map((step, index) => {
        const done = currentIndex >= 0 && index <= currentIndex;
        return (
          <div key={step.state} className="flex items-center gap-2 text-sm">
            <span className={done ? "text-green-600" : "text-gray-300"}>{done ? "✓" : "○"}</span>
            <span className={done ? "text-gray-900" : "text-gray-400"}>{step.label}</span>
          </div>
        );
      })}
      {state === "LOCAL_ONLY" && (
        <p className="mt-3 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
          Your emergency is saved on this phone. TulongLink will send it as soon as an Internet
          connection is available.
        </p>
      )}
    </div>
  );
}
