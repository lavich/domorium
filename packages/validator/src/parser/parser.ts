import { CstNode, CstParser, ParserMethod } from "chevrotain";
import { tokens } from "./lexer";
import { TokenVocabulary } from "@chevrotain/types";

export class GedcomParser extends CstParser {
  root!: ParserMethod<[], CstNode>;
  line!: ParserMethod<[], CstNode>;

  constructor(lexerDefinition: TokenVocabulary) {
    super(lexerDefinition);

    this.RULE("root", () => {
      this.MANY(() => {
        this.SUBRULE(this.line);
      });
    });

    this.RULE("line", () => {
      this.CONSUME(tokens.Level);
      this.OR([
        {
          ALT: () => {
            this.CONSUME(tokens.Pointer);
            this.CONSUME1(tokens.Tag);
          },
        },
        {
          ALT: () => {
            this.CONSUME2(tokens.Tag);
            this.OPTION2(() => {
              this.CONSUME(tokens.Xref);
            });
            this.OPTION3(() => {
              this.CONSUME(tokens.Value);
            });
          },
        },
      ]);
    });

    this.performSelfAnalysis();
  }
}
