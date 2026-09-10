## Purpose

Lets the domain speak for itself. A reader arriving from a search listing, a
marketplace, or a link in a message meets a page that says what the software is
and where to get it — and a crawler reading the same page finds prose written for
that purpose rather than an interface it has to interpret.

## ADDED Requirements

### Requirement: Every URL answers with a page, not a shell

Each published path SHALL be served as HTML that already contains its heading and
its prose, without a script having run. The static pages SHALL require no
client-side JavaScript to be legible or navigable.

#### Scenario: The landing page with scripting disabled

- **WHEN** `/` is fetched and no JavaScript executes
- **THEN** the response holds the page's `<h1>`, its description of the editor, the
  link that opens the editor, and the links to each integration page

#### Scenario: A crawler reads an integration page

- **WHEN** `/vscode/` is fetched and no JavaScript executes
- **THEN** the response holds the page's heading, what the integration does, how to
  install it, and its marketplace link

#### Scenario: The editor still needs its script

- **WHEN** `/editor/` is fetched
- **THEN** the application shell is served as before and the editor loads into it

### Requirement: The editor is served from `/editor/`

The editor SHALL be published at `/editor/`, and `/` SHALL be the landing page.
The example file and other public assets SHALL keep resolving from the site root.

#### Scenario: A reader opens the domain

- **WHEN** `/` is opened in a browser
- **THEN** the landing page is shown, and its first action opens the editor

#### Scenario: The example still loads

- **WHEN** the editor loads at `/editor/`
- **THEN** the bundled example opens in it, read from the site root

### Requirement: Each page declares its own head

Every published page SHALL carry a title of its own, a description of its own, an
absolute canonical URL, Open Graph and Twitter card metadata, and structured data
describing what the page is about. No two pages SHALL share a title or a
description.

#### Scenario: A page's own description is what a listing can show

- **WHEN** any published page is fetched
- **THEN** its `<head>` holds a `description` written for that page, a canonical URL
  ending in a slash, and a social card image

#### Scenario: Structured data describes the product

- **WHEN** an integration page is fetched
- **THEN** its structured data names the software, its category, the platform it
  runs in, and that it is free, and parses as valid JSON

#### Scenario: Two pages are never described alike

- **WHEN** the published pages are compared
- **THEN** every title and every description is unique, and each title fits what a
  search listing shows without truncation

### Requirement: The pages link to each other

The landing page SHALL link to every integration page and to the editor. Each
integration page SHALL link to the other integrations and to the editor. Anchor
text SHALL name the destination. Every internal link SHALL point at a published
path.

#### Scenario: A reader moves between integrations

- **WHEN** `/jetbrains/` is open
- **THEN** it links to `/vscode/`, `/obsidian/` and `/editor/` by their names

#### Scenario: The editor leads back into the site

- **WHEN** the editor is open
- **THEN** its header links to each integration page within the site, and those
  pages hold the marketplace links

#### Scenario: No internal link leads nowhere

- **WHEN** the internal links of every page are collected
- **THEN** each one is a path the site publishes

### Requirement: The site tells a crawler what it holds

The build SHALL emit `robots.txt` naming the sitemap, a `sitemap.xml` listing every
published page, and a `404.html` that leads back into the site. The sitemap SHALL
list exactly the published pages — no more, and none missing.

#### Scenario: A page is added

- **WHEN** a page is declared and the site is built
- **THEN** its URL appears in `sitemap.xml` without a second edit

#### Scenario: An unknown path is requested

- **WHEN** a path the site does not publish is fetched
- **THEN** the response is the site's own not-found page, which links to the
  landing page and the editor

### Requirement: The theme can be changed from any page

Every page SHALL offer a control that changes the colour theme between the same
choices the editor offers, and the choice SHALL be remembered and honoured across
the editor and the pages alike. The resolved theme SHALL be applied before the
page is first painted. Where scripting is unavailable the control SHALL NOT be
shown, and the page SHALL still be readable in the theme the reader's system asks
for.

#### Scenario: A reader changes the theme on a page

- **WHEN** the theme control on any page is used
- **THEN** the page changes theme at once, the choice is remembered, and the
  control says which choice it will make next

#### Scenario: The choice carries into the editor

- **WHEN** a reader chooses dark on a page and then opens the editor
- **THEN** the editor is dark, and the same holds in the other direction

#### Scenario: Nothing was ever chosen

- **WHEN** a page is opened by a reader who has made no choice
- **THEN** the theme is the one their system asks for, and no flash of the other
  theme is shown before it

#### Scenario: Scripting is unavailable

- **WHEN** a page is rendered with no JavaScript
- **THEN** no theme control is shown, and the page reads in the system's theme

### Requirement: The landing page runs the editor it shows

The landing page SHALL let a reader run the editor on the page, in the place
where it is drawn, without loading the application before it is asked for. The
control SHALL lead to the editor where scripting is unavailable. Once running,
the page SHALL offer the editor the whole window. An embedded editor SHALL leave
the wordmark, the product links and the theme control to the page around it, and
SHALL keep its own File menu.

#### Scenario: A reader tries it on the page

- **WHEN** the reader asks for the editor on the landing page
- **THEN** the real editor replaces the drawing in place, with the example open,
  and the page offers to give it the whole window

#### Scenario: The page is read without scripting

- **WHEN** the control is followed with no script running
- **THEN** the reader arrives at the editor's own page

#### Scenario: Nothing is loaded before it is wanted

- **WHEN** the landing page is opened and the editor is not asked for
- **THEN** none of the application is fetched

#### Scenario: The editor inside the frame

- **WHEN** the editor runs embedded in the page
- **THEN** it shows no second wordmark, no second set of product links and no
  second theme control, and its File menu still opens and saves files

### Requirement: The pages say what the places do differently

The site SHALL state what is true of every place it publishes, and separately what
only one of them does. An ability true of every place SHALL NOT appear among the
differences, and every place SHALL have at least one ability of its own. An
ability SHALL be claimed for a place only where the code or that plugin's own
repository states it; anything unverified SHALL be left unclaimed, and the page
SHALL say that an unmarked cell means that.

#### Scenario: A reader compares the places

- **WHEN** the landing page is read
- **THEN** it lists what every place shares, and shows a row per difference with a
  column per place

#### Scenario: A page and the comparison agree

- **WHEN** an integration page names what that place can do
- **THEN** what it names is what the comparison marks for that place

#### Scenario: Nothing is true of everywhere twice

- **WHEN** an ability holds in every place
- **THEN** it is stated once, in the shared list, and is absent from the
  differences

### Requirement: The platform pages are named as GEDCOM

Per ADR-0007, an integration page SHALL lead with GEDCOM and the platform it
serves, and credit Domorium as the publisher; the landing page SHALL lead with
Domorium as the ecosystem. Every page SHALL state that the project is independent
of FamilySearch, with the notices the specification-derived material requires.

#### Scenario: An integration page's heading

- **WHEN** `/obsidian/` is read
- **THEN** its heading names GEDCOM and Obsidian, and the page credits Domorium as
  the publisher

#### Scenario: The independence notice is reachable

- **WHEN** any published page is read
- **THEN** the notice that Domorium is independent of FamilySearch is on it
