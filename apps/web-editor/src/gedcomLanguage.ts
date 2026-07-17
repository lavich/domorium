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

export const tokenizerRules: monaco.languages.IMonarchLanguage = {
  tokenizer: {
    root: [
      [/#.*$/, "comment"],
      [/@[^@]*@/, "tag"],
      [/\b(0|1|2|3|4|5|6|7|8|9)\b/, "level"],
      [/\b(CONT|CONC|SOUR|DEST|DATE|TIME|SUBM|SUBN|GEDC|CHAR|LANG|PLAC|ADDR|EMAIL|NOTE|BIRT|DEAT|MARR|FAMC|FAM|INDI|HUSB|WIFE|CHIL|FAMS|NAME|OCCU|RESI|OBJE|REPO|REFN|TYPE|RIN|AFN|CHAN)\b/, "keyword"],
      [/"[^"]*"/, "string"],
      [/\b\d+\b/, "number"],
    ],
  },
};

export function registerGedcomLanguage(monaco: typeof import("monaco-editor")) {
  monaco.languages.register({ id: "gedcom", extensions: [".ged", ".gedcom"] });
  monaco.languages.setLanguageConfiguration("gedcom", gedcomLanguageConfig);
  monaco.languages.setMonarchTokensProvider("gedcom", tokenizerRules);
}
