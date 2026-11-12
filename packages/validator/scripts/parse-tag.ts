export interface TagLabel {
  uri: string;
  label: string;
}

export function parseTagLabel(yaml: string): TagLabel | undefined {
  const uri = yaml.match(/^uri: (\S+)$/m)?.[1];
  const label = yaml.match(/^label: '((?:[^']|'')*)'$/m)?.[1];
  if (uri === undefined || label === undefined) {
    return undefined;
  }
  return { uri, label: label.replaceAll("''", "'") };
}
