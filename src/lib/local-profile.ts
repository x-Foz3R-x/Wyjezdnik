export type LocalProfile = {
  version: 1;
  name: string;
  avatarUrl: string;
  phone: string;
  revolutUrl: string;
  paymentNote: string;
  updatedAt: string;
};

export type LocalProfileData = Pick<
  LocalProfile,
  "name" | "avatarUrl" | "phone" | "revolutUrl" | "paymentNote"
>;

const LOCAL_PROFILE_KEY = "wyjezdnik:local-profile:v1";

export function readLocalProfile(): LocalProfile | null {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(LOCAL_PROFILE_KEY) ?? "null");
    if (!isLocalProfile(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeLocalProfile(data: LocalProfileData): LocalProfile | null {
  const profile: LocalProfile = {
    version: 1,
    name: clean(data.name, 60),
    avatarUrl: clean(data.avatarUrl, 500),
    phone: clean(data.phone, 40),
    revolutUrl: clean(data.revolutUrl, 300),
    paymentNote: clean(data.paymentNote, 500),
    updatedAt: new Date().toISOString(),
  };

  if (!profile.name) return null;

  try {
    window.localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(profile));
    return profile;
  } catch {
    return null;
  }
}

export function removeLocalProfile() {
  try {
    window.localStorage.removeItem(LOCAL_PROFILE_KEY);
  } catch {
    // Prywatny tryb przeglądarki może blokować pamięć urządzenia.
  }
}

export function getLocalProfileOfferKey(tripKey: string, userId: string, profile: LocalProfile) {
  return `wyjezdnik:local-profile-offer:${tripKey}:${userId}:${profile.updatedAt}`;
}

function isLocalProfile(value: unknown): value is LocalProfile {
  if (!value || typeof value !== "object") return false;
  const profile = value as Partial<LocalProfile>;
  return (
    profile.version === 1 &&
    typeof profile.name === "string" &&
    typeof profile.avatarUrl === "string" &&
    typeof profile.phone === "string" &&
    typeof profile.revolutUrl === "string" &&
    typeof profile.paymentNote === "string" &&
    typeof profile.updatedAt === "string"
  );
}

function clean(value: string, maxLength: number) {
  return value.trim().slice(0, maxLength);
}
