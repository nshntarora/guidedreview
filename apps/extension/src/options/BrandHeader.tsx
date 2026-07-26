import { BrandMark } from "@guided-review/ui";

/** Shared branding block used by Settings and About. Chrome-resolved icon URL. */
export function BrandHeader({ title }: { title?: string }) {
  return <BrandMark title={title} iconSrc={chrome.runtime.getURL("icon.png")} />;
}
