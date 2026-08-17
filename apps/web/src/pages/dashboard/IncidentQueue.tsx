import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { Emergency, IncidentStatus } from "@tulonglink/shared";
import { listCommunityIncidents } from "../../services/dashboardService.js";
import { IncidentMap } from "../../components/IncidentMap.js";

const ACTIVE_STATUSES: IncidentStatus[] = ["ACKNOWLEDGED", "ASSIGNED", "IN_PROGRESS"];
const CLOSED_STATUSES: IncidentStatus[] = ["RESOLVED", "CANCELLED", "EXPIRED"];

/** Spec §35's "New / Critical / Active / Resolved incidents" — filters over one list, not separate endpoints. */
const TABS = [
  { key: "ALL", label: "All" },
  { key: "NEW", label: "New" },
  { key: "CRITICAL", label: "Critical" },
  { key: "ACTIVE", label: "Active" },
  { key: "RESOLVED", label: "Resolved" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

function matchesTab(incident: Emergency, tab: TabKey): boolean {
  const status = incident.incidentStatus ?? "NEW";
  switch (tab) {
    case "ALL":
      return true;
    case "NEW":
      return status === "NEW";
    case "CRITICAL":
      return incident.priority === "CRITICAL" && !CLOSED_STATUSES.includes(status);
    case "ACTIVE":
      return ACTIVE_STATUSES.includes(status);
    case "RESOLVED":
      return CLOSED_STATUSES.includes(status);
  }
}

export function IncidentQueue() {
  const [incidents, setIncidents] = useState<Emergency[] | undefined>(undefined);
  const [tab, setTab] = useState<TabKey>("ALL");
  const [view, setView] = useState<"LIST" | "MAP">("LIST");

  useEffect(() => {
    void listCommunityIncidents().then(setIncidents);
  }, []);

  const filtered = useMemo(() => (incidents ?? []).filter((i) => matchesTab(i, tab)), [incidents, tab]);

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Incident Queue</h1>
        <div className="flex gap-2 text-sm">
          <button
            onClick={() => setView("LIST")}
            className={`rounded-md px-3 py-1 ${view === "LIST" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700"}`}
          >
            List
          </button>
          <button
            onClick={() => setView("MAP")}
            className={`rounded-md px-3 py-1 ${view === "MAP" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700"}`}
          >
            Map
          </button>
        </div>
      </div>

      <div className="mb-4 flex gap-2 border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`border-b-2 px-3 py-2 text-sm font-medium ${
              tab === t.key ? "border-red-700 text-red-700" : "border-transparent text-gray-500"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {incidents === undefined && <p className="text-sm text-gray-500">Loading…</p>}

      {incidents !== undefined && view === "MAP" && <IncidentMap incidents={filtered} />}

      {incidents !== undefined && view === "LIST" && (
        <>
          {filtered.length === 0 && <p className="text-sm text-gray-500">No incidents in this view.</p>}
          <ul className="space-y-2">
            {filtered.map((incident) => (
              <li key={incident.incidentId}>
                <Link
                  to={`/dashboard/incidents/${encodeURIComponent(incident.incidentId)}`}
                  className="flex items-center justify-between rounded-md border border-gray-200 p-3 hover:bg-gray-50"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {incident.category.replace(/_/g, " ")}{" "}
                      <span className="ml-2 text-xs font-semibold uppercase text-red-700">{incident.priority}</span>
                    </p>
                    <p className="text-sm text-gray-500">{new Date(incident.createdAt).toLocaleString()}</p>
                  </div>
                  <span className="text-sm text-gray-600">{(incident.incidentStatus ?? "NEW").replace(/_/g, " ")}</span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      <Link to="/" className="mt-8 block text-sm font-medium text-gray-600 underline">
        Back to home
      </Link>
    </div>
  );
}
