import type { ReactNode } from "react";

import { PATHS, type SitePath } from "./paths";

/**
 * Someone else's window, drawn: a record from the example the editor opens,
 * with the tags and the cross-reference coloured as an editor colours them.
 * The mockups are dark whatever the reader chose, which is what `.editor-mock`
 * fixes — they stand for another application, not for this page.
 */
const record = [
  { level: "0", xref: "@I1@", tag: "INDI" },
  { level: "1", tag: "NAME", value: "Abraham /Simpson/" },
  { level: "1", tag: "SEX", value: "M" },
  { level: "1", tag: "BIRT" },
  { level: "2", tag: "DATE", value: "24 MAY 1899" },
];

function Line({
  level,
  xref,
  tag,
  value,
}: {
  level: string;
  xref?: string;
  tag: string;
  value?: string;
}) {
  return (
    <div className="whitespace-nowrap">
      <span style={{ color: "var(--mock-dim)" }}>{level}</span>{" "}
      {xref ? (
        <>
          <span style={{ color: "var(--mock-xref)" }}>{xref}</span>{" "}
        </>
      ) : null}
      <span style={{ color: "var(--mock-tag)" }}>{tag}</span>
      {value ? (
        <>
          {" "}
          <span style={{ color: "var(--mock-value)" }}>{value}</span>
        </>
      ) : null}
    </div>
  );
}

function Window({
  label,
  children,
  footer,
}: {
  label: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div
      className="editor-mock overflow-hidden rounded-xl text-[0.7rem] shadow-sm"
      style={{
        background: "var(--mock-surface)",
        color: "var(--mock-text)",
        border: "1px solid var(--mock-line)",
      }}
    >
      <div
        className="flex items-center gap-2 px-3 py-2 font-mono"
        style={{
          background: "var(--mock-panel)",
          borderBottom: "1px solid var(--mock-line)",
          color: "var(--mock-dim)",
        }}
      >
        {label}
      </div>
      <div className="px-3 py-3 font-mono leading-6">{children}</div>
      {footer ? (
        <div
          className="flex items-center gap-3 px-3 py-1.5 font-mono"
          style={{
            borderTop: "1px solid var(--mock-line)",
            color: "var(--mock-dim)",
          }}
        >
          {footer}
        </div>
      ) : null}
    </div>
  );
}

export function VsCodeMock() {
  return (
    <Window
      label={
        <>
          <span style={{ color: "var(--mock-text)" }}>simpsons.ged</span>
          <span className="ml-auto">VS Code</span>
        </>
      }
      footer={
        <>
          <span>0 problems</span>
          <span>Ln 2, Col 6</span>
        </>
      }
    >
      {record.map((line) => (
        <Line key={line.tag + line.level} {...line} />
      ))}
    </Window>
  );
}

export function ObsidianMock() {
  return (
    <Window
      label={
        <>
          <span style={{ color: "var(--mock-text)" }}>
            vault / simpsons.ged
          </span>
          <span className="ml-auto">Obsidian</span>
        </>
      }
      footer={<span>edited in place, never converted</span>}
    >
      <Line level="1" tag="FAMS" value="@F1@" />
      <div
        className="mt-2 rounded-lg px-2.5 py-2"
        style={{
          background: "var(--mock-panel)",
          border: "1px solid var(--mock-line)",
        }}
      >
        <div style={{ color: "var(--mock-dim)" }}>the record it names</div>
        <Line level="0" xref="@F1@" tag="FAM" />
        <Line level="1" tag="HUSB" value="@I1@" />
        <Line level="1" tag="WIFE" value="@I2@" />
      </div>
    </Window>
  );
}

export function JetBrainsMock() {
  return (
    <Window
      label={
        <>
          <span style={{ color: "var(--mock-text)" }}>simpsons.ged</span>
          <span className="ml-auto">IntelliJ IDEA</span>
        </>
      }
      footer={<span>no problems found</span>}
    >
      <Line level="0" xref="@F1@" tag="FAM" />
      <Line level="1" tag="HUSB" value="@I1@" />
      <Line level="1" tag="WIFE" value="@I2@" />
      <Line level="1" tag="CHIL" value="@I3@" />
      <Line level="1" tag="MARR" />
      <Line level="2" tag="DATE" value="24 MAY 1899" />
    </Window>
  );
}

/** One place pairs a page with the window it draws. */
export function mockFor(path: SitePath) {
  switch (path) {
    case PATHS.vscode:
      return VsCodeMock;
    case PATHS.obsidian:
      return ObsidianMock;
    case PATHS.jetbrains:
      return JetBrainsMock;
    default:
      return null;
  }
}
