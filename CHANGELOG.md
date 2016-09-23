# Changelog

## 3.0.0-beta.9

- Remove MidiGen level in API
- Set zero duration when undefined

## 3.0.0-beta.8

- Move utils to first level of MidiConvert

## 3.0.0-beta.7

- Add functions to convert ticks/seconds

## 3.0.0-beta.6

- Use *hexadecimal* constants instead of strings
- Add support for track name (parsing and writing)

## 3.0.0-beta.5

- Remove `NoteOn`/`NoteOff` permutation mechanism
- Filter out simultaneous notes on same pitch

## 3.0.0-beta.4

- Optimise MIDI file generation

## 3.0.0-beta.3

*Cleanup debug code*

## 3.0.0-beta.2

- Filter unknown events when generating MIDI file

## 3.0.0-beta.1

- Remove method aliases of Track class
- Rewrite former MidiConvert parsing functions in functional programming style
- Cleanup instruments parsing

## 3.0.0-beta.0

- Include functions from [dingram/jsmidgen](https://github.com/dingram/jsmidgen) to have MIDI writing feature
- Share constants between former codes of `jsmidgen` and `MidiConvert`
- Add function to set time signature (missing in `jsmidgen`)
- Add function to generate file buffer from a _MIDI JSON_
- Add tests that parse then generate MIDI files
- Update documentation

## 2.1.1

- Remove redundancy in instrument list

## 2.1.0

- Use AVA for testing
- Use nyc for test coverage
- Add non-minified build
- Return no BPM if not specified inside MIDI file
- Improve condition before permuting noteOn/noteOff events

## 2.0.0

Since this version, the fork has diverged from the original repository [Tonejs/MidiConvert](https://github.com/Tonejs/MidiConvert) more specifically from this commit [32132ff36d08a3d63904ccb981428daac0f4db90](https://github.com/Tonejs/MidiConvert/commit/32132ff36d08a3d63904ccb981428daac0f4db90). The API is definitely changing to a single `parse` method returning both parts and transport data.

### New features

- Output sustain pedal events
- Output instruments used in tracks
- Splitting tracks by MIDI Channel of MIDI Type 0 file

MIDI notes are always in the parse results now (it was optionnal before).

### New toolchain

- Bundling with Rollup
- Minification with Clojure compiler
- Code linting with ESLint
- Continuous integration with Travis CI

The MIDI file parser (https://github.com/NHQ/midi-file-parser) is now included in the repository.
