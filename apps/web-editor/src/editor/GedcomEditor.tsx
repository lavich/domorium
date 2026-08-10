import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

import { createGedcomEditor } from "./createGedcomEditor";
import type {
  GedcomEditorHandle,
  WebDiagnostic,
  WebEditorStatus,
  WebTheme,
} from "./types";

export interface GedcomEditorProps {
  editorKey: number;
  initialText: string;
  theme: WebTheme;
  onChange(): void;
  onDiagnosticsChange(diagnostics: WebDiagnostic[]): void;
  onStatusChange(status: WebEditorStatus): void;
}

export const GedcomEditor = forwardRef<GedcomEditorHandle, GedcomEditorProps>(
  function GedcomEditor(
    {
      editorKey,
      initialText,
      theme,
      onChange,
      onDiagnosticsChange,
      onStatusChange,
    },
    forwardedRef,
  ) {
    const rootRef = useRef<HTMLDivElement>(null);
    const handleRef = useRef<GedcomEditorHandle | null>(null);
    const onChangeRef = useRef(onChange);
    const onDiagnosticsChangeRef = useRef(onDiagnosticsChange);
    const onStatusChangeRef = useRef(onStatusChange);

    onChangeRef.current = onChange;
    onDiagnosticsChangeRef.current = onDiagnosticsChange;
    onStatusChangeRef.current = onStatusChange;

    useEffect(() => {
      if (!rootRef.current) {
        return;
      }
      const handle = createGedcomEditor({
        parent: rootRef.current,
        initialText,
        theme,
        onChange: () => onChangeRef.current(),
        onDiagnosticsChange: (diagnostics) =>
          onDiagnosticsChangeRef.current(diagnostics),
        onStatusChange: (status) => onStatusChangeRef.current(status),
      });
      handleRef.current = handle;
      return () => {
        handle.destroy();
        handleRef.current = null;
      };
    }, [editorKey]);

    useEffect(() => {
      handleRef.current?.setTheme(theme);
    }, [theme]);

    useImperativeHandle(
      forwardedRef,
      () => ({
        getText: () => handleRef.current?.getText() ?? "",
        destroy: () => handleRef.current?.destroy(),
        focusDiagnostic: (diagnostic) =>
          handleRef.current?.focusDiagnostic(diagnostic),
        setTheme: (value) => handleRef.current?.setTheme(value),
        openSearch: () => handleRef.current?.openSearch(),
      }),
      [],
    );

    return (
      <div
        ref={rootRef}
        className="h-full min-h-0"
        aria-label="GEDCOM editor"
      />
    );
  },
);
