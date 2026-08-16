import { useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { verifyOtp } from "../services/authService.js";
import { useAuth } from "../context/AuthContext.js";

interface LocationState {
  phoneNumber: string;
  communityId: string;
}

export function VerifyOtp() {
  const navigate = useNavigate();
  const location = useLocation();
  const { refresh } = useAuth();
  const state = location.state as LocationState | null;

  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!state) {
    navigate("/login", { replace: true });
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await verifyOtp(state!.phoneNumber, code, state!.communityId);
      await refresh();
      navigate("/", { replace: true });
    } catch {
      setError("That code didn't work. Check it and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <h1 className="mb-8 text-center text-xl font-semibold">Enter the code sent to {state.phoneNumber}</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]{6}"
          maxLength={6}
          required
          autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="123456"
          className="w-full rounded-md border border-gray-300 p-3 text-center text-2xl tracking-widest"
        />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting || code.length !== 6}
          className="w-full rounded-md bg-red-700 py-3 font-semibold text-white disabled:opacity-50"
        >
          {submitting ? "Verifying…" : "Verify"}
        </button>
      </form>
    </div>
  );
}
