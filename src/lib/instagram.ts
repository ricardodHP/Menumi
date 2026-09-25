const USERNAME_PATTERN = /^[a-z\d._]{1,30}$/i;

export function normalizeInstagramUsername(value: string | null | undefined): string | null {
  const input = value?.trim();
  if (!input) return null;

  let username: string;
  if (/^https?:\/\//i.test(input)) {
    try {
      const url = new URL(input);
      const hostname = url.hostname.toLowerCase();
      const segments = url.pathname.split("/").filter(Boolean);
      if (
        !["instagram.com", "www.instagram.com"].includes(hostname) ||
        segments.length !== 1
      ) {
        return null;
      }
      username = decodeURIComponent(segments[0]);
    } catch {
      return null;
    }
  } else {
    username = input.startsWith("@") ? input.slice(1) : input;
  }

  if (!USERNAME_PATTERN.test(username)) return null;
  return username.toLowerCase();
}

export function getInstagramDisplayUsername(value: string | null | undefined): string {
  const username = normalizeInstagramUsername(value);
  return username ? `@${username}` : "";
}

export function buildInstagramUrl(value: string | null | undefined): string | null {
  const username = normalizeInstagramUsername(value);
  return username ? `https://www.instagram.com/${username}/` : null;
}
