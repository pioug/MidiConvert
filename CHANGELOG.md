# Changelog

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