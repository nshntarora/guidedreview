/** Shared branding block used by Settings and About. */
export function BrandHeader({ title = "Guided Review" }: { title?: string }) {
  return (
    <div className="mb-2 flex items-center gap-3">
      <img
        className="h-10 w-10 shrink-0 rounded-lg"
        src={chrome.runtime.getURL("icon.png")}
        alt=""
        width={40}
        height={40}
      />
      <h1 className="m-0 text-lg font-bold">{title}</h1>
    </div>
  );
}
