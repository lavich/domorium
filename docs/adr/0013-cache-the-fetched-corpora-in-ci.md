# 0013. Cache the fetched corpora in CI and refresh them weekly

- **Status:** Accepted
- **Date:** 2026-08-29

## Context

[0011](0011-fetch-corpora-rather-than-vendoring-them.md) settled where the two
corpora live: nowhere in this repository. Each file is fetched at check time from
a location pinned to a full upstream revision, and what is committed is the
record — provenance, licence, SHA-256, expected diagnostics. That much still
holds. What 0011 did not settle, because it did not have to, is how often the
fetch happens.

Today it happens on every run of the check, which CI triggers on every push that
touches `packages/`, `scripts/` or the manifests: about 2.9 MB from two
upstreams, dominated by one 2.4 MB export. Each fetch is a fresh chance to fail
for a reason that has nothing to do with the change under test — a dead socket,
a DNS fault, a TLS reset. All of those arrive as `fetch failed`, and so does a
dead upstream. The script cannot tell them apart, and stops the suite for both.
A change touching only `packages/validator/README.md` failed that way (#275),
which is what [#276](https://github.com/lavich/domorium/issues/276) is about.

`checks / conformance` is deliberately not a required status check, so the cost
is not a blocked merge. The cost is that a red run stops carrying information,
and a reader learns to skip past it. A suite that cries wolf ends up worse than
the one nobody wrote.

0011 named the property a corpus check actually needs from the files: "that the
bytes checked today are the bytes checked tomorrow, and that a change in them is
visible rather than silent." Fetching on every run is one way to obtain that
property. It is not the property.

## Decision

The conformance job restores the corpus from an `actions/cache` entry keyed on
the content of `scripts/conformance-corpus.json` and `scripts/vendor-corpus.json`,
and a weekly scheduled run fetches from upstream regardless of that entry.

- `CONFORMANCE_CACHE` names a directory the script may read a corpus file from
  and write a fetched one to. Unset — a developer running
  `npm run check:conformance` — the files are fetched into memory and nothing is
  written. `CONFORMANCE_REFRESH` makes the run fetch from upstream and rewrite
  that directory.
- The key is a hash over both record files, with no `restore-keys`. Re-pointing
  an entry at a new revision or re-recording a hash is a different key, so it
  fetches afresh by construction, and no older entry can partially satisfy it.
- Bytes read from the directory are hashed and compared against the record on
  the way in, exactly as fetched bytes are. A mismatch fails and names both
  hashes. The cache is a byte source, never a verdict.
- `--update` fetches from upstream. A record renewed from a copy of itself would
  record nothing.
- The scheduled run is the one that fetches, so the rule that an unreadable file
  is a failure rather than a skip is what makes it report upstream loss. A key
  that hit is never written again, so an entry is filled on a miss and the
  schedule reports drift rather than replacing stored bytes.

## Consequences

This puts corpus bytes on a filesystem, which the check script denied in as many
words — "fetched into memory and never written to disk". An `actions/cache`
entry is a copy on disk with a lifetime, and the honest way to hold this decision
is to say so rather than to call it something else.

It does not reopen what 0011 refused, because the two grounds 0011 gave are both
about what leaves this project. Licences of the kind in this corpus — GPL-2.0,
and one suite offered for non-commercial use only — govern conveying a work and
who may use a copy; they do not forbid a build from holding one while it runs.
Nothing is conveyed here: the entry is written and read by this repository's own
CI, from the same upstream the fetch would otherwise have contacted, and no
third party receives bytes from us. The family-data ground has the same shape.
0011's concern is that other people's records are not republished by this
project, and a build's scratch space is not publication. A committed copy fails
both tests — a merge publishes it, and a delete does not remove it from history —
which is exactly the distinction being drawn, and the reason 0011's rule against
vendoring stands rather than softens.

Four properties carry over from 0011 unchanged. No corpus file is copied into
this repository. The recorded SHA-256 is what makes a wrong file visible,
whether the bytes came off a socket or out of the cache. A location with no full
upstream revision is refused before it is fetched. A file that cannot be read is
a failure, not a skip, and adding a file is still record-the-location then
re-record with `--update`.

What changes is the granularity of "visible rather than silent". Upstream drift
surfaces at the pace of the schedule instead of the pace of pushes: an upstream
that disappears on a Monday is named by the following weekly run rather than by
the next push. Between those runs the check answers the question it is really
asked on a pull request — whether the validator's diagnostics still match the
record — and the recorded hash is what keeps that answer honest, because a cache
that served the wrong bytes fails on the hash before a diagnostic is compared.

The costs beyond that delay are two. The key covers the whole of both record
files, expected diagnostics included, so re-recording after a deliberate
diagnostic change refetches the corpus once even though no file changed. And a
job that fails can still leave its entry saved; since only bytes a fetch
returned are written, and every read is verified against the record, the worst
that survives is a failure that repeats until the record or the schedule
replaces it.

## Alternatives considered

**Retry a transient failure with a backoff, and keep fetching every run.** Fixes
the flake and nothing else. It still pays 2.9 MB per push, and it leaves a
genuinely dead upstream taking several times as long to say so. Cheaper to
build, and the smaller payoff is the whole of it.

**Vendor the corpus, since a cache is a copy anyway.** The two differ in the one
respect 0011 reasoned about. A cache entry expires, is scoped to this
repository's CI, and is conveyed to nobody; a commit is published on merge and
outlives its own deletion. Accepting the first is not a step towards the second.

**Extract the pinned locations and hashes and key on those alone.** Avoids the
refetch after a diagnostic re-recording, at the price of a script that computes
the key and a second definition of what the key covers. A hash over whole files
is a key a reader can verify by eye, and one refetch is a poor trade for that.

**Give the entry `restore-keys` so a near miss still restores something.** A
prefix match would serve the previous key's corpus precisely when the current
key misses — which is the case where a record changed and fresh bytes are the
entire point.
