# Changelog

All notable changes to the GEDCOM extension by Domorium are documented here.

## 1.0.0

- First stable release: context-aware autocomplete, real-time validation against
  the GEDCOM 5.5.1 and 7.0 specifications, semantic highlighting, hover, go to
  definition, find all references, safe XREF rename, quick fixes, and folding.
- No functional change from 0.1.1.

## 0.1.1

- Present the extension as GEDCOM while retaining Domorium as the publisher and
  ecosystem identity.

## 0.1.0

- Rebrand the extension as Domorium — GEDCOM Tools.
- Move the Marketplace identity to `domorium.gedcom`.
- Move shared dependencies to the `@domorium` npm scope.

## 0.0.13

- Rename the extension from Domorium to GEDCOM
- Point repository and image links at the renamed repository

## 0.0.12

- Add Find All References and read/write XREF highlights
- Add safe, atomic XREF rename with stale-edit protection
- Add clickable web and local-file links
- Add quick fixes for broken references and invalid GEDCOM levels

## 0.0.11

- Add context-aware autocomplete for GEDCOM tags, structures, and values
- Add document symbols for navigating records in the Outline view
- Improve semantic highlighting accuracy

## 0.0.10

- Validate DATE, DATE_PERIOD and DATE_EXACT values
- Fix parser stalling on files with a GEDCOM 7 SNOTE record
- Accept @VOID@ as a valid pointer value
- Fix TIME validation (single-digit hours, fractional seconds, v7-only UTC suffix)

## 0.0.9

- Improved validator

## 0.0.8

- Make monorepo

## 0.0.3

- Basic validation
- Folder by level

## 0.0.1

- Initial release
- Syntax highlighting
- Basic validation
