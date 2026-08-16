import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { publicFetch } from "../services/apiClient.js";
import { requestOtp } from "../services/authService.js";

interface CommunityOption {
  communityId: string;
  name: string;
}

export function Login() {
  const navigate = useNavigate();
  const [communities, setCommunities] = useState<CommunityOption[]>([]);
  const [communityId, setCommunityId] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("+63");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    publicFetch<CommunityOption[]>("/api/communities")
      .then((list) => {
        setCommunities(list);
        if (list.length > 0 && list[0]) setCommunityId(list[0].communityId);
      })
      .catch(() => setError("Could not load communities. Check your connection and try again."));
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await requestOtp(phoneNumber);
      navigate("/verify-otp", { state: { phoneNumber, communityId } });
    } catch {
      setError("Could not send a verification code. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <h1 className="mb-1 text-center text-2xl font-bold text-red-700">TULONG LINK</h1>
      <p className="mb-8 text-center text-sm text-gray-500">The community becomes the network.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700" htmlFor="community">
            Community
          </label>
          <select
            id="community"
            required
            value={communityId}
            onChange={(e) => setCommunityId(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 p-2"
          >
            {communities.length === 0 && <option value="">Loading…</option>}
            {communities.map((c) => (
              <option key={c.communityId} value={c.communityId}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700" htmlFor="phone">
            Mobile number
          </label>
          <input
            id="phone"
            type="tel"
            required
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="+639171234567"
            className="mt-1 w-full rounded-md border border-gray-300 p-2"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting || !communityId}
          className="w-full rounded-md bg-red-700 py-3 font-semibold text-white disabled:opacity-50"
        >
          {submitting ? "Sending…" : "Send code"}
        </button>
      </form>
    </div>
  );
}
