import {
  createConnection,
  ProposedFeatures,
} from "vscode-languageserver/node";
import { createServer } from "./createServer";

createServer(
  createConnection(ProposedFeatures.all, process.stdin, process.stdout),
);
