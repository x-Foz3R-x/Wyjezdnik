export type TripFormState = { error: string | null };

export type CreateTripResult = { ok: true; urlKey: string } | { ok: false; error: string };
export type UpdateTripSettingsResult = { ok: true } | { ok: false; error: string };
export type UpdateParticipantProfileResult = { ok: true } | { ok: false; error: string };
export type ParticipantMutationResult = { ok: true } | { ok: false; error: string };
export type TeamMutationResult = { ok: true } | { ok: false; error: string };
export type DeleteTripResult = { ok: true } | { ok: false; error: string };
