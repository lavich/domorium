## Purpose

Showing, on the site's pages, the current version of each Domorium product, asked for by the reader's browser so that a release shows without rebuilding the site.

## ADDED Requirements

### Requirement: The site shows each product's current version

Once a page has been opened in a browser that runs scripts, the site SHALL show,
prefixed `v`, the current version of: each extension in its card on the landing
page; `@domorium/codemirror` in the landing page's npm link; and an extension in
the chip naming it at the top of its own integration page. The VS Code version
SHALL be the latest `vscode-v*` tag of this repository; the Obsidian version the
latest release of its repository; the JetBrains version the one the JetBrains
Marketplace lists; and the npm version the package's `latest`.

#### Scenario: The VS Code page

- **WHEN** the VS Code page is opened and the latest tag is `vscode-v1.7.2`
- **THEN** its chip shows `v1.7.2`

#### Scenario: The landing page

- **WHEN** the landing page is opened and all four sources answer
- **THEN** each extension's card and the npm link show their version

#### Scenario: The script runs before the body exists

- **WHEN** the script runs from the head of a page whose body has not been parsed yet
- **THEN** the versions are shown once the body is parsed

### Requirement: Without an answer the page reads as it does without the script

A version SHALL be shown only when a source answers within 5 seconds with a value
that is a version number once its known prefix is removed. An error, a timeout, a
value of another shape, or a browser without scripts SHALL leave the page as its
HTML reads, showing no version and nothing in its place. A version SHALL be written
as text, never as markup.

#### Scenario: A source fails

- **WHEN** the source for npm answers with an error
- **THEN** the npm link shows no version and the extensions still show theirs

#### Scenario: A source answers something else

- **WHEN** a source answers `<img src=x onerror=alert(1)>` or `retired badge` as its value
- **THEN** nothing is shown for that product

### Requirement: A tab asks each source once

A version SHALL be kept for the tab's session, so that another page opened in the
same tab shows it without asking its source again. A failure SHALL NOT be kept. A
page SHALL still show versions where the browser refuses session storage.

#### Scenario: Moving to another page

- **WHEN** the landing page has shown the versions and the reader opens the VS Code page in the same tab
- **THEN** the VS Code version is shown without a request

#### Scenario: A failure is tried again

- **WHEN** a source failed on one page and the reader opens another that shows the same product
- **THEN** that source is asked again

#### Scenario: Storage refused

- **WHEN** session storage throws on access
- **THEN** the versions are asked for and shown as usual
