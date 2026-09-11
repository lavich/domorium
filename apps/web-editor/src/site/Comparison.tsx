import { CheckIcon } from "lucide-react";

import { DISTINCT_ABILITIES, PLACES, SHARED_ABILITIES } from "./abilities";

function Mark({ has }: { has: true | string | undefined }) {
  if (has === undefined) {
    return (
      <span className="text-muted-foreground/40" aria-hidden>
        —
      </span>
    );
  }
  if (has === true) {
    return (
      <CheckIcon className="mx-auto size-4 text-primary" aria-label="yes" />
    );
  }
  return (
    <span className="text-[0.7rem] leading-tight text-primary">{has}</span>
  );
}

function Group({ children }: { children: string }) {
  return (
    <tr>
      <th
        scope="rowgroup"
        colSpan={PLACES.length + 1}
        className="border-b pt-7 pb-2 text-left text-xs font-semibold tracking-wide uppercase"
      >
        {children}
      </th>
    </tr>
  );
}

function Row({
  label,
  where,
}: {
  label: string;
  where: (path: (typeof PLACES)[number]["path"]) => true | string | undefined;
}) {
  return (
    <tr>
      <th
        scope="row"
        className="border-b py-3 pr-3 text-left text-sm leading-snug font-normal text-muted-foreground"
      >
        {label}
      </th>
      {PLACES.map((place) => (
        <td
          key={place.path}
          className="border-b px-2 py-3 text-center align-middle"
        >
          <Mark has={where(place.path)} />
        </td>
      ))}
    </tr>
  );
}

export function Comparison() {
  return (
    <div>
      <h3 className="text-lg font-semibold tracking-tight">
        What each place does
      </h3>
      <p className="mt-3 max-w-[68ch] text-sm leading-relaxed text-muted-foreground">
        One language service answers for all of them, so most of this table is
        the same in every column — a diagnostic reads the same wherever you meet
        it. Below that are the rows where the places part, each giving its own
        host abilities the others have no place for. An empty cell means it is
        not there — or, for a JetBrains IDE, that it was not verified rather
        than promised.
      </p>

      {/* The table scrolls sideways on a phone rather than losing columns:
          the comparison is the content. */}
      <div className="mt-6 -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
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
            <Group>The same in every editor</Group>
            {SHARED_ABILITIES.map((ability) => (
              <Row key={ability} label={ability} where={() => true} />
            ))}
          </tbody>
          <tbody>
            <Group>Where they part</Group>
            {DISTINCT_ABILITIES.map((ability) => (
              <Row
                key={ability.label}
                label={ability.label}
                where={(path) => ability.where[path]}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
