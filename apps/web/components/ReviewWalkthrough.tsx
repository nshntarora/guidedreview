import { Kbd } from "@guided-review/ui";
import { WindowFrame } from "./WindowFrame";

export function ReviewWalkthrough({
  files,
  units,
  lines,
}: {
  files: string[];
  units: { title: string }[];
  lines: { number: number; content: string }[];
}) {
  return (
    <section
      className="px-4 py-16 sm:px-6 sm:py-24"
      aria-labelledby="walkthrough-heading"
      data-testid="review-walkthrough"
    >
      <div className="mx-auto max-w-5xl">
        <p className="m-0 text-center font-mono text-xs uppercase tracking-widest text-primary">
          From diff to decision
        </p>
        <h2
          id="walkthrough-heading"
          className="mt-4 text-center font-brand text-3xl font-bold tracking-tight text-balance sm:text-4xl"
        >
          Same code. A better order to read it.
        </h2>
        <p className="mx-auto mt-4 mb-10 max-w-2xl text-center text-lg text-muted text-balance">
          Group related changes, read the diff, and leave your feedback. AI structures the review;
          you decide what ships.
        </p>
        <ol className="m-0 grid list-none gap-5 p-0 lg:grid-cols-3">
          <li className="min-w-0">
            <WindowFrame label="01 / Group the change">
              <h3 className="m-0 text-xl font-semibold">Start with a plan.</h3>
              <p className="mt-3 mb-6 leading-relaxed text-muted">
                Related implementation and tests become ordered review units, so you can follow a
                change across files.
              </p>
              <div className="rounded-lg border border-border bg-background p-4">
                <p className="m-0 mb-3 font-mono text-xs text-muted">Changed files</p>
                <ul className="m-0 list-none space-y-1 p-0 font-mono text-xs leading-relaxed text-muted">
                  {files.slice(0, 3).map((file) => (
                    <li key={file} className="break-all">
                      {file}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 mb-0 font-mono text-xs text-muted">
                  + {files.length - 3} more files
                </p>
              </div>
              <p className="my-3 text-center text-primary" aria-hidden="true">
                ↓
              </p>
              <div className="rounded-lg border border-primary/40 bg-background p-4">
                <p className="m-0 mb-3 font-mono text-xs text-primary">Ordered review units</p>
                <ol className="m-0 list-none space-y-3 p-0">
                  {units.map((unit, index) => (
                    <li key={unit.title} className="flex gap-2 text-xs leading-relaxed">
                      <span className="font-mono text-primary">0{index + 1}</span>
                      {unit.title}
                    </li>
                  ))}
                </ol>
              </div>
            </WindowFrame>
          </li>
          <li className="min-w-0">
            <WindowFrame label="02 / Read the real diff">
              <h3 className="m-0 text-xl font-semibold">Read with context.</h3>
              <p className="mt-3 mb-6 leading-relaxed text-muted">
                Read each unit alongside its summary. Inspect the original changed lines and make
                your own call.
              </p>
              <div className="overflow-hidden rounded-lg border border-border bg-background">
                <p className="m-0 border-b border-border px-4 py-3 font-mono text-xs text-muted">
                  Diff excerpt
                </p>
                <pre className="m-0 py-4 font-mono text-xs leading-6 whitespace-pre-wrap break-all">
                  <code>
                    {lines.map((line) => (
                      <span key={line.number} className="block bg-diff-add/10 px-3 text-diff-add">
                        <span className="mr-2 text-muted" aria-hidden="true">
                          {line.number}
                        </span>
                        <span aria-hidden="true">+ </span>
                        {line.content.trim()}
                        {"\n"}
                      </span>
                    ))}
                  </code>
                </pre>
              </div>
              <p className="mt-5 mb-0 text-sm leading-relaxed text-muted">
                The code comes from your diff. AI supplies structure and commentary.
              </p>
            </WindowFrame>
          </li>
          <li className="min-w-0">
            <WindowFrame label="03 / Leave your feedback">
              <h3 className="m-0 text-xl font-semibold">You make the call.</h3>
              <p className="mt-3 mb-6 leading-relaxed text-muted">
                Select the lines that need attention and leave a note. Your feedback stays attached
                to the code you read.
              </p>
              <div className="rounded-lg border border-primary/40 bg-background p-4">
                <p className="m-0 font-mono text-xs text-primary">Selected lines · Your feedback</p>
                <blockquote className="mx-0 mt-4 mb-0 border-l-2 border-primary pl-3 text-sm leading-relaxed">
                  Please cover this edge case with a test before merging.
                </blockquote>
              </div>
              <dl className="mt-6 mb-0 space-y-4 text-sm leading-relaxed">
                <div>
                  <dt className="font-medium">Reviewing locally?</dt>
                  <dd className="mx-0 mt-1 text-muted">
                    Copy your notes as a coding-agent prompt.
                  </dd>
                </div>
                <div>
                  <dt className="font-medium">Reviewing on GitHub?</dt>
                  <dd className="mx-0 mt-1 text-muted">Submit your feedback as a PR review.</dd>
                </div>
              </dl>
            </WindowFrame>
          </li>
        </ol>
        <ul
          aria-label="Review keyboard shortcuts"
          className="mt-6 flex list-none flex-wrap justify-center gap-x-8 gap-y-4 p-0 text-sm text-muted"
        >
          <li className="flex items-center gap-2">
            <Kbd>←</Kbd>
            <Kbd>→</Kbd> Navigate units
          </li>
          <li className="flex items-center gap-2">
            <Kbd>c</Kbd> Comment on a line
          </li>
          <li className="flex items-center gap-2">
            <Kbd>⌘ / Ctrl</Kbd>
            <Kbd>K</Kbd> Open actions
          </li>
        </ul>
      </div>
    </section>
  );
}
