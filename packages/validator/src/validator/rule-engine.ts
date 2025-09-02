import { GedcomScheme, GedcomTag, GedcomType } from "../schemes/schema-types";
import { ASTNode } from "../parser";
import { GedcomError } from "../types/errors";

type FieldType =
  | "boolean"
  | "string"
  | "nonNegativeInteger"
  | "select"
  | "multiselect"
  | "date"
  | "date-period"
  | "time"
  | "pointer"
  | null;

const TIME_REGEXP = /^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/;

export class RuleEngine {
  constructor(private readonly scheme: GedcomScheme) {}

  getFieldType(tagType: GedcomType): { type: FieldType; isList: boolean } {
    const payload = this.scheme.payload[tagType];
    let type: FieldType;
    let isList = false;
    switch (payload?.type) {
      case "Y|<NULL>":
        type = "boolean";
        break;
      case "http://www.w3.org/2001/XMLSchema#string":
      case "http://www.w3.org/2001/XMLSchema#Language":
      case "http://www.w3.org/ns/dcat#mediaType":
      case "https://gedcom.io/terms/v7/type-Name":
        type = "string";
        break;
      case "https://gedcom.io/terms/v7/type-List#Text":
        type = "string";
        isList = true;
        break;
      case "http://www.w3.org/2001/XMLSchema#nonNegativeInteger":
        type = "nonNegativeInteger";
        break;
      case "https://gedcom.io/terms/v7/type-Enum":
        type = "select";
        break;
      case "https://gedcom.io/terms/v7/type-List#Enum":
        type = "multiselect";
        break;
      case "https://gedcom.io/terms/v7/type-Date":
        type = "date";
        break;
      case "https://gedcom.io/terms/v7/type-Date#period":
        type = "date-period";
        break;
      case "https://gedcom.io/terms/v7/type-Time":
        type = "time";
        break;
      case "pointer":
        type = "pointer";
        break;
      default:
        type = null;
    }
    return { type, isList };
  }

  getAvailableValues(tagType: GedcomType): string[] | null {
    const fieldType = this.getFieldType(tagType);
    const payload = this.scheme.payload[tagType];
    if (
      (fieldType.type === "select" || fieldType.type === "multiselect") &&
      payload.set
    ) {
      return Object.keys(this.scheme.set[payload.set]);
    }
    return null;
  }

  getNodeType(node: ASTNode): GedcomType {
    const stack: GedcomTag[] = [];

    let tempNode: ASTNode | undefined = node;
    while (tempNode) {
      stack.push(GedcomTag(tempNode.tokens.TAG!.value!));
      tempNode = tempNode.parent;
    }

    let type = GedcomType("");
    let lastElem = stack.pop();
    while (lastElem) {
      const substr = this.scheme.substructure[type];
      type = substr[lastElem].type;
      lastElem = stack.pop();
    }

    return type;
  }

  validate(node: ASTNode, _tagType?: GedcomType): GedcomError[] {
    const errors: GedcomError[] = [];
    const tagType = _tagType || this.getNodeType(node);
    const fieldType = this.getFieldType(tagType || this.getNodeType(node));
    const VALUE = node.tokens.VALUE;
    const value = node.tokens.VALUE?.value.trim();
    const TAG = node.tokens.TAG;
    switch (fieldType.type) {
      case "boolean":
        if (value !== "Y" && (value || node.children.length === 0)) {
          errors.push({
            code: "VAL",
            message: `Value for ${TAG?.value} should be Y or null`,
            range: VALUE?.range || node.range,
            level: "error",
          });
        }
        break;
      case "string":
        if (!value) {
          errors.push({
            code: "VAL",
            message: `Missing value for ${TAG?.value}`,
            range: TAG?.range || node.range,
            level: "error",
          });
        }
        break;
      case "nonNegativeInteger":
        if (!value || parseInt(value) < 0) {
          errors.push({
            code: "VAL",
            message: `Value for ${TAG?.value} should be number and greater than 0`,
            range: VALUE?.range || node.range,
            level: "error",
          });
        }
        break;

      case "select": {
        const availableValues = this.getAvailableValues(tagType);
        if (!value || !availableValues?.includes(value)) {
          errors.push({
            code: "VAL",
            message: `Value for ${TAG?.value} should be in set [${availableValues}]`,
            range: VALUE?.range || node.range,
            level: "error",
          });
        }
        break;
      }
      case "multiselect": {
        const availableValues = this.getAvailableValues(tagType);
        const values = value?.split(",").map((v) => v.trim());
        const isValid = values?.every((v) =>
          availableValues?.includes(v.trim()),
        );
        if (!isValid) {
          errors.push({
            code: "VAL",
            message: `Value for ${TAG?.value} should be in set [${availableValues}]`,
            range: VALUE?.range || node.range,
            level: "error",
          });
        }
        break;
      }
      case "date":
        break;
      case "date-period":
        break;
      case "time":
        if (!value || !TIME_REGEXP.test(value)) {
          errors.push({
            code: "VAL",
            message: `Value for ${TAG?.value} should be correct time`,
            range: VALUE?.range || node.range,
            level: "error",
          });
        }
        break;
      case "pointer":
        break;
    }
    return errors;
  }
}
