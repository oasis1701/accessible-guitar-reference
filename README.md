# Accessible Guitar Reference

A text-first guitar reference for blind and visually impaired players.

Chord charts, fretboard diagrams, and video lessons assume you can see them. This site assumes you cannot. Every chord, power chord, and triad is described in precise, consistent language designed for screen readers: which string, which fret, which finger — phrased the same way every time.

**Live site:** https://accessibleguitar.com/

## What's inside

- **Fretboard guide** — every note on every string with landmark frets called out, the tuning relationships, and the four octave shapes, with computed (never hand-typed) note tables.
- **Open chords** — the 14 everyday "cowboy" chords (C, A, G, E, D, the minors, the dominant 7ths).
- **Power chords** — open E5, A5, D5, plus movable two- and three-finger shapes for any root.
- **Barre chords** — the movable E and A shapes, major and minor, with barres described in full sentences.
- **Triads** — major and minor three-note shapes, all three inversions, on two string groups.
- **Chord finder** — pick any root and type (say, G sharp minor) and get every voicing the site knows, ordered along the neck, with positions computed and machine-verified for all twelve roots.
- **Tuner** — a microphone tuner that names the note it hears and says how many cents too low or too high it is, with spoken updates gated to never talk over the screen reader, and a mute button. Runs entirely in the browser; nothing is recorded or sent anywhere.
- **Metronome** — a click at 30 to 300 beats per minute with an accented first beat, eighth-note, triplet, and sixteenth-note subdivisions, tap tempo, four sounds, a volume slider, and a speed trainer that raises the tempo every few bars to a target. Synthesized in the browser, with no live region at all: the click is the feedback. Settings are remembered.
- **Conventions page** — the strict grammar every description follows (higher/lower always mean pitch, muted strings are always explicit, sharps and flats are spelled out).
- **Settings** — choose the description format (per string, by finger, or prose) and how strings are named (number, note name, or both). Saved in the browser.

Planned: scales (major positions, pentatonic boxes, modes), a full fretboard note guide, audio playback, practice quizzes.

## Design principles

1. **Structured data, generated text.** Every chord is data (string, fret, finger, notes). One renderer generates all descriptions, so the grammar never drifts and settings are toggles, not rewrites.
2. **Machine-checked correctness.** `tools/validate.js` recomputes the actual pitches of every chord from its frets and proves they spell the declared chord. It also renders every item in all nine settings combinations and lints the output (no banned symbols like `#`, no ambiguous direction words), and it proves the tuner: pitch detection against synthesized waveforms, announcement gating against scripted timelines, and every tuner phrase against the grammar; and it proves the metronome: tick timing, the speed trainer, and tap tempo against scripted timelines, and every metronome phrase against the grammar.
3. **Screen-reader-first HTML.** One heading per chord (always level 3) for heading-key navigation, real lists for per-string lines, native form controls only, no information conveyed visually.
4. **No build, no dependencies.** Plain HTML, CSS, and vanilla JavaScript with classic scripts. Download the folder and open `index.html` — everything works offline.

## Local use

Open `index.html` in any modern browser. No server needed.

## Validation

Requires Node (any recent version):

```
node tools/validate.js
```

Exits non-zero if any chord's music is wrong or any rendered text breaks the grammar. Run it before every commit.

## Contributing

Corrections and suggestions are welcome, especially from blind and visually impaired players — open an issue describing what reads poorly or what's missing. For chord data changes, run the validator before submitting.

## License

MIT — see [LICENSE](LICENSE).
