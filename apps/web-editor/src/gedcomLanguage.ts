import type * as monaco from "monaco-editor";

export const gedcomLanguageConfig: monaco.languages.LanguageConfiguration = {
  comments: {
    lineComment: "#",
  },
  brackets: [],
  autoClosingPairs: [
    { open: "@", close: "@" },
  ],
  surroundingPairs: [
    { open: "@", close: "@" },
  ],
  folding: {
    markers: {
      start: /^0\s+\S+/,
      end: /^0\s+\S+/,
    },
  },
  wordPattern: /(-?\d*\.\d\w*)|([^\`\~\!\@\#\%\^\&\*\(\)\-\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s]+)/g,
};

export function registerGedcomLanguage(monaco: typeof import("monaco-editor")) {
  monaco.languages.register({ id: "gedcom", extensions: [".ged", ".gedcom"] });
  monaco.languages.setLanguageConfiguration("gedcom", gedcomLanguageConfig);
}
