# MidiConvert [![Build Status](https://travis-ci.org/pioug/MidiConvert.svg?branch=master)](https://travis-ci.org/pioug/MidiConvert) [![Coverage Status](https://coveralls.io/repos/github/pioug/MidiConvert/badge.svg?branch=coverage)](https://coveralls.io/github/pioug/MidiConvert?branch=coverage)

This is a fork of [Tonejs/MidiConvert](https://github.com/Tonejs/MidiConvert). The fork has diverged since with the following features:
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
var MidiConvert = require('MidiConvert');
```

# API

#### `parse(BinaryString midiBlob, [Object options]) => Array`

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
    timeSignature: [4, 4],
    instruments: [1, 2, 3]
  },
  parts: [
    [
      {
        "time": "0i",
        "midiNote": 67,
        "noteName": "G4",
        "velocity": 0.7086614173228346,
        "duration": "12i"
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
  duration : true
});
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
