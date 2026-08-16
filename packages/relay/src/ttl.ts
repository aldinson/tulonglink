/** Spec §25: expired messages must not continue propagating. */
export function isExpired(message: { expiresAt: string }, now: Date = new Date()): boolean {
  return new Date(message.expiresAt).getTime() <= now.getTime();
}
