/**
 * The mark the project already uses for a GEDCOM file — a pedigree of one box
 * over three — drawn rather than loaded from `favicon.svg` so it takes the colour
 * around it. Same geometry as `apps/vscode/images/fileIcon.svg`.
 */
export function GedcomFileIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="9.5" y="2" width="5" height="5" />
      <rect x="1.5" y="17" width="5" height="5" />
      <rect x="9.5" y="17" width="5" height="5" />
      <rect x="17.5" y="17" width="5" height="5" />
      <path d="M4 12h16" />
      <path d="M4 12v5M12 8v8M20 12v5" />
    </svg>
  );
}
