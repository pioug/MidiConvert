# MidiConvert [![Build Status](https://travis-ci.org/pioug/MidiConvert.svg?branch=master)](https://travis-ci.org/pioug/MidiConvert) [![Coverage Status](https://coveralls.io/repos/github/pioug/MidiConvert/badge.svg?branch=coverage)](https://coveralls.io/github/pioug/MidiConvert?branch=coverage)

This is a fork of [Tonejs/MidiConvert](https://github.com/Tonejs/MidiConvert). The fork has diverged since by including directly the parser of [NHQ/midi-file-parser](https://github.com/NHQ/midi-file-parse) and adding the following features:
 - Generate MIDI file by including functions from [dingram/jsmidgen](https://github.com/dingram/jsmidgen)
 - Output sustain pedal events
 - Output instruments used in tracks
 - Splitting tracks by MIDI Channel of MIDI Type 0 file

The toolchain is also different:
 - Bundling with Rollup
 - Minification with Clojure compiler
 - Code linting with ESLint
 - Continuous integration with Travis CI

Read more about the changes in the [CHANGELOG.md](CHANGELOG.md).

# Usage
This library can be installed via NPM:
```sh
npm i --save @pioug/MidiConvert
```

In HTML:
```html
<script src="build/MidiConvert.js"></script>
```

Or in JavaScript:
```javascript
var MidiConvert = require('@pioug/MidiConvert');
```

# API

#### `MidiConvert.parse(BinaryString midiBlob, [Object options]) => Object`

This function returns an object with two properties:
  - `transport`: the bpm and time signature values of the midi file as a Javascript Object (_formerly `parseTransport`_)
  - `parts`: an array of the tracks. Each track is an array of notes (_formerly `parseParts`_)

```javascript
var midiObject = MidiConvert.parse(midiBlob, options);
```

```javascript
{
  transport: {
    bpm: 120,
    instruments: [1, 25, 0],
    timeSignature: [4, 4],
    trackNames: ["Solo piano", "Guitar riff", "Kick-ass drums"]
  },
  parts: [
    [
      {
        time: "0i",
        midiNote: 67,
        noteName: "G4",
        velocity: 0.7086614173228346,
        duration: "12i"
      },
      ... rest of events
    ],
    ... rest of tracks
  ]
}
```

Which can then be used in [Tone.Part](https://github.com/Tonejs/Tone.js):

```javascript
var pianoPart = new Tone.Part(callback, midiObject.parts[0]).start();
```

#### Options

The options object defines how the MIDI file is parsed:

```javascript
MidiConvert.parse(midiBlob, {
  /*
   *  the pulses per quarter note at which
   *  the midi file is parsed.
   */
  PPQ : 192,
  /*
   *  if the notes scientific pitch notation
   *  should be included in the output.
   */
  noteName : true,
  /*
   *  if the normalized velocity should be included
   *  in the output
   */
  velocity : true,
  /*
   *  if the time between the noteOn and noteOff event
   *  should be included in the output. Otherwise
   *  each event represents a noteOn.
   */
  duration : true,
  /*
   *  execute an additional sorting function
   *  useful for testing
   */
   deterministic: true
});
```

#### `MidiConvert.generate(midiJson) => Buffer`

Generate a file buffer from an object respecting the structure of the `parse` output.

```
var sourceFile = fs.readFileSync('./midi/bwv-846.mid', 'binary'),
  sourceData = MidiConvert.parse(sourceFile, midiConvertOpts),
  destinationData = MidiConvert.parse(MidiConvert.generate(sourceData), midiConvertOpts);
t.deepEqual(sourceData, destinationData) // TRUE;
```

#### Class `MidiConvert.File`

- `addTrack()` - Add a new Track object to the file and return the new track
- `addTrack(track)` - Add the given Track object to the file and return the file
- `toBytes()` - Convert to buffer

#### Class `MidiConvert.Track`

Time and duration are specified in "ticks", and there is a hardcoded
value of 128 ticks per beat. This means that a quarter note has a duration of 128.

Pitch can be specified by note name with octave (`a#4`) or by note number (`60`).
Middle C is represented as `c4` or `60`.

- `addNote(channel, pitch, duration[, time[, velocity]])`
  - Add a new note with the given channel, pitch, and duration
  - If `time` is given, delay that many ticks before starting the note
  - If `velocity` is given, strike the note with that velocity

- `addNoteOn(channel, pitch[, time[, velocity]])`
  -Start a new note with the given channel and pitch
  - If `time` is given, delay that many ticks before starting the note
  - If `velocity` is given, strike the note with that velocity

- `addNoteOff(channel, pitch[, time[, velocity]])`
  - End a note with the given channel and pitch
  - If `time` is given, delay that many ticks before ending the note
  - If `velocity` is given, strike the note with that velocity

- `addChord(channel, chord[, velocity])`
  - Add a chord with the given channel and pitches
  - Accepts an array of pitches to play as a chord
  - If `velocity` is given, strike the chord with that velocity

- `setInstrument(channel, instrument[, time])`
  - Change the given channel to the given instrument
  - If `time` is given, delay that many ticks before making the change

- `setTempo(bpm[, time])`
  - Set the tempo to `bpm` beats per minute
  - If `time` is given, delay that many ticks before making the change

- `setTimeSignature(numerator, denominator[, time])`
  - Set the time signature with the given numerator and denominator
  - If `time` is given, delay that many ticks before making the change

- `setTrackName(name[, time])`
  - Set the track name with the given string
  - If `time` is given, delay that many ticks before making the change

```
var fs = require('fs');
var MidiConvert = require('@pioug/MidiConvert');

var file = new MidiConvert.MidiGen.File();
var track = new MidiConvert.MidiGen.Track();
file.addTrack(track);

track.addNote(0, 'C4', 64);
track.addNote(0, 'D4', 64);
track.addNote(0, 'E4', 64);
track.addNote(0, 'F4', 64);
track.addNote(0, 'G4', 64);
track.addNote(0, 'A4', 64);
track.addNote(0, 'B4', 64);
track.addNote(0, 'B5', 64);

fs.writeFileSync('test.mid', file.toBytes(), 'binary');
```

# MIDI Blob

In Node.js, pass to MidiConvert the output from `fs.readFile`:

```javascript
fs.readFile('./test.mid', 'binary', function(err, buffer) {
  if (err) return;
  var midiObject = MidiConvert.parse(buffer);
});
```

In the browser, the MIDI blob as a string can be obtained using the [FileReader API](https://developer.mozilla.org/en-US/docs/Web/API/FileReader).

```javascript
var reader = new FileReader();
reader.onload = function(e) {
  var midiObject = MidiConvert.parse(e.target.result);
}
reader.readAsBinaryString(file);
```

# Development

If you want to contribute to this project:

```sh
git clone git@github.com:pioug/MidiConvert.git
npm i
npm run build
npm test
```
