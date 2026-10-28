## ADDED Requirements

### Requirement: CodeMirror filters on what was typed and writes one token

The completion source SHALL match options against the text of the service's `insert` range, and accepting an option SHALL replace the service's `replace` range, as it stands when accepted, with the option's label.

#### Scenario: An at-sign already typed

- **WHEN** `@I1@` is accepted at the end of `1 HUSB @I`
- **THEN** the line reads `1 HUSB @I1@`

#### Scenario: The cursor inside an existing xref

- **WHEN** `@I2@` is accepted between `@I` and `1@` in `1 HUSB @I1@`
- **THEN** the line reads `1 HUSB @I2@`

#### Scenario: Typing after the list opened

- **WHEN** the list opens at the end of `1 HUSB @` and `I` is typed before `@I1@` is accepted
- **THEN** the line reads `1 HUSB @I1@`
