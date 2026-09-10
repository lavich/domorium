import { CheckIcon } from "lucide-react";

import { DISTINCT_ABILITIES, PLACES, SHARED_ABILITIES } from "./abilities";

/**
 * The honest shape of the answer: one language service, so most of what the
 * places do is the same — and the table carries only the rows where they part.
 * A row of four marks would tell a reader nothing.
 */
export function Comparison() {
  return (
    <div className="grid items-start gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-14">
      {/* The shared half keeps up with the table beside it rather than
          scrolling away from the rows it explains. */}
      <div className="lg:sticky lg:top-24">
        <h3 className="text-lg font-semibold tracking-tight">
          The same in every editor
        </h3>
        <p className="mt-3 max-w-[44ch] text-sm leading-relaxed text-muted-foreground">
          One language service answers for all of them, so a diagnostic reads
          the same wherever you meet it.
        </p>
        <ul className="mt-5 grid gap-2.5">
          {SHARED_ABILITIES.map((ability) => (
            <li key={ability} className="flex gap-2.5">
              <CheckIcon className="mt-0.5 size-4 shrink-0 text-primary" />
              <span className="text-sm leading-relaxed text-muted-foreground">
                {ability}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* A grid item is `min-width: auto` by default, so without this the column
          stretches to the table and the page scrolls instead of the table. */}
      <div className="min-w-0">
        <h3 className="text-lg font-semibold tracking-tight">
          What only one of them does
        </h3>
        <p className="mt-3 max-w-[52ch] text-sm leading-relaxed text-muted-foreground">
          Each editor gives its own host abilities the others have no place for.
          An empty cell means it is not there — or, for a JetBrains IDE, that it
          was not verified rather than promised.
        </p>

        {/* The table scrolls sideways on a phone rather than losing columns:
            the comparison is the content. */}
        <div className="mt-5 -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <table className="w-full min-w-[34rem] border-collapse text-sm">
            <thead className="sticky top-[3.25rem] z-10 bg-background">
              <tr>
                <th className="w-[45%] border-b py-2.5 pr-3 text-left text-xs font-medium text-muted-foreground">
                  Ability
                </th>
                {PLACES.map((place) => (
                  <th
                    key={place.path}
                    scope="col"
                    className="border-b px-2 py-2.5 text-center text-xs font-medium"
                  >
                    <a href={place.path} className="hover:text-primary">
                      {place.label}
                    </a>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DISTINCT_ABILITIES.map((ability) => (
                <tr key={ability.label}>
                  <th
                    scope="row"
                    className="border-b py-3 pr-3 text-left text-sm leading-snug font-normal text-muted-foreground"
                  >
                    {ability.label}
                  </th>
                  {PLACES.map((place) => {
                    const has = ability.where[place.path];
                    return (
                      <td
                        key={place.path}
                        className="border-b px-2 py-3 text-center align-middle"
                      >
                        {has === undefined ? (
                          <span
                            className="text-muted-foreground/40"
                            aria-hidden
                          >
                            —
                          </span>
                        ) : has === true ? (
                          <CheckIcon
                            className="mx-auto size-4 text-primary"
                            aria-label="yes"
                          />
                        ) : (
                          <span className="text-[0.7rem] leading-tight text-primary">
                            {has}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
