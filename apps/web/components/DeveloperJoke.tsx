"use client";

import { useEffect, useState } from "react";
import developerJokes from "@web/data/developer-jokes.json";

export function DeveloperJoke() {
  // Keep exported HTML and the first client render identical; choose per visit after hydration.
  const [joke, setJoke] = useState(developerJokes.jokes[0]);

  useEffect(() => {
    setJoke(developerJokes.jokes[Math.floor(Math.random() * developerJokes.jokes.length)]);
  }, []);

  return (
    <aside
      aria-labelledby="developer-joke-title"
      className="mt-12 rounded-lg border border-border bg-surface-raised/50 p-6 sm:p-8"
    >
      <h2 id="developer-joke-title" className="font-brand text-xs text-muted">
        Page not found. Joke found.
      </h2>
      <div aria-live="polite" aria-atomic="true" data-testid="developer-joke">
        <p className="mt-5 text-lg leading-relaxed">{joke.setup}</p>
        <p className="mt-3 text-base leading-relaxed text-muted">{joke.punchline}</p>
      </div>
      <p className="mt-6 text-xs leading-relaxed text-muted">
        Jokes from <a href={developerJokes.source}>Official Joke API</a>.{" "}
        <a href="/licenses/official-joke-api.txt">MIT license</a>.
      </p>
    </aside>
  );
}
