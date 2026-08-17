import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { Emergency, EmergencyEvent, IncidentStatus, ResponderType } from "@tulonglink/shared";
import { RESPONDER_TYPES } from "@tulonglink/shared";
import {
  acknowledgeIncident,
  assignIncident,
  cancelIncident,
  getIncident,
  getIncidentEvents,
  listStaff,
  resolveIncident,
  startIncidentProgress,
  type StaffMember,
} from "../../services/dashboardService.js";
import { IncidentMap } from "../../components/IncidentMap.js";

const NON_TERMINAL: IncidentStatus[] = ["NEW", "ACKNOWLEDGED", "ASSIGNED", "IN_PROGRESS"];
const RESOLVABLE_FROM: IncidentStatus[] = ["ACKNOWLEDGED", "ASSIGNED", "IN_PROGRESS"];
const ASSIGNABLE_FROM: IncidentStatus[] = ["NEW", "ACKNOWLEDGED"];

export function IncidentDetail() {
  const { id } = useParams<{ id: string }>();
  const [incident, setIncident] = useState<Emergency | null | undefined>(undefined);
  const [events, setEvents] = useState<EmergencyEvent[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [note, setNote] = useState("");
  const [responderId, setResponderId] = useState("");
  const [responderType, setResponderType] = useState<ResponderType>(RESPONDER_TYPES[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!id) return;
    const [incidentRes, eventsRes] = await Promise.all([getIncident(id), getIncidentEvents(id)]);
    setIncident(incidentRes);
    setEvents(eventsRes);
  }, [id]);

  useEffect(() => {
    void reload().catch(() => setIncident(null));
    void listStaff().then(setStaff);
  }, [reload]);

  async function runAction(action: () => Promise<Emergency>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      setNote("");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  if (incident === undefined) return <div className="p-6 text-center text-gray-500">Loading…</div>;
  if (incident === null) return <div className="p-6 text-center text-gray-500">Incident not found.</div>;

  const status = incident.incidentStatus ?? "NEW";

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <Link to="/dashboard" className="mb-4 inline-block text-sm font-medium text-gray-600 underline">
        Back to queue
      </Link>

      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">{incident.category.replace(/_/g, " ")}</h1>
        <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-800">{incident.priority}</span>
      </div>

      <dl className="mb-6 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <dt className="text-gray-500">Status</dt>
        <dd className="font-medium text-gray-900">{status.replace(/_/g, " ")}</dd>
        <dt className="text-gray-500">Reported</dt>
        <dd>{new Date(incident.createdAt).toLocaleString()}</dd>
        <dt className="text-gray-500">Reporter device</dt>
        <dd>{incident.originDeviceId}</dd>
        <dt className="text-gray-500">Description</dt>
        <dd className="col-span-2">{incident.description}</dd>
        <dt className="text-gray-500">Location</dt>
        <dd>
          {incident.latitude !== null && incident.longitude !== null
            ? `${incident.latitude.toFixed(5)}, ${incident.longitude.toFixed(5)}${incident.manualLocation ? " (manual)" : ""}`
            : "Not provided"}
        </dd>
        <dt className="text-gray-500">Assigned to</dt>
        <dd>
          {incident.assignedResponderId
            ? `${incident.assignedResponderId} (${incident.assignedResponderType})`
            : "Unassigned"}
        </dd>
      </dl>

      {incident.latitude !== null && incident.longitude !== null && (
        <div className="mb-6">
          <IncidentMap incidents={[incident]} />
        </div>
      )}

      {NON_TERMINAL.includes(status) && (
        <div className="mb-6 rounded-md border border-gray-200 p-4">
          <h2 className="mb-2 text-sm font-semibold text-gray-700">Actions</h2>

          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional note"
            className="mb-3 w-full rounded-md border border-gray-300 p-2 text-sm"
            rows={2}
          />

          <div className="flex flex-wrap gap-2">
            {status === "NEW" && (
              <button
                disabled={busy}
                onClick={() => void runAction(() => acknowledgeIncident(incident.incidentId, note || undefined))}
                className="rounded-md bg-blue-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                Acknowledge
              </button>
            )}

            {ASSIGNABLE_FROM.includes(status) && (
              <div className="flex items-center gap-2">
                <select value={responderId} onChange={(e) => setResponderId(e.target.value)} className="rounded-md border border-gray-300 p-2 text-sm">
                  <option value="">Select responder…</option>
                  {staff.map((s) => (
                    <option key={s.userId} value={s.userId}>
                      {s.phoneNumber} ({s.role})
                    </option>
                  ))}
                </select>
                <select
                  value={responderType}
                  onChange={(e) => setResponderType(e.target.value as ResponderType)}
                  className="rounded-md border border-gray-300 p-2 text-sm"
                >
                  {RESPONDER_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <button
                  disabled={busy || !responderId}
                  onClick={() =>
                    void runAction(() => assignIncident(incident.incidentId, responderId, responderType, note || undefined))
                  }
                  className="rounded-md bg-indigo-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  Assign
                </button>
              </div>
            )}

            {status === "ASSIGNED" && (
              <button
                disabled={busy}
                onClick={() => void runAction(() => startIncidentProgress(incident.incidentId, note || undefined))}
                className="rounded-md bg-amber-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                Start progress
              </button>
            )}

            {RESOLVABLE_FROM.includes(status) && (
              <button
                disabled={busy}
                onClick={() => void runAction(() => resolveIncident(incident.incidentId, note || undefined))}
                className="rounded-md bg-green-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                Resolve
              </button>
            )}

            <button
              disabled={busy}
              onClick={() => void runAction(() => cancelIncident(incident.incidentId, note || undefined))}
              className="rounded-md bg-gray-200 px-3 py-2 text-sm font-medium text-gray-700 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>

          {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
        </div>
      )}

      <h2 className="mb-2 text-sm font-semibold text-gray-700">Audit trail</h2>
      <ul className="space-y-2 text-sm">
        {events.map((event) => (
          <li key={event.id} className="rounded-md border border-gray-100 bg-gray-50 p-3">
            <div className="flex justify-between">
              <span className="font-medium text-gray-900">{event.state.replace(/_/g, " ")}</span>
              <span className="text-gray-500">{new Date(event.occurredAt).toLocaleString()}</span>
            </div>
            {event.detail && <p className="mt-1 text-gray-600">{event.detail}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}
