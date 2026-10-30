import releases from "@web/data/releases.json";

export const RELEASES = releases;
export type Release = (typeof RELEASES)[number];
export const releasePath = (version: string) => `/changelog/${version}`;

export function formatReleaseDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}
