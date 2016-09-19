import ava from 'ava';
import { parse } from '../build/MidiConvert.js';

const fs = require('fs');

ava('API', function(t) {
  t.truthy(parse, 'has parse method');
});

ava('Goldberg Variation 1 format 1 midi file', function(t) {
  var midiData = fs.readFileSync('./midi/bwv-988-v01.mid', 'binary'),
    midiJson = require('./midi/bwv-988-v01.json'),
    parsedData = parse(midiData, {
      PPQ: 192,
      midiNote: true,
      noteName: true,
      velocity: true,
      duration: true
    });

  t.deepEqual(parsedData.transport.trackNames, [
    'upper:',
    'lower:'
  ], 'extracts the names of track containing notes from the file');
  t.deepEqual(parsedData.transport.timeSignature, [3, 4], 'gets the time signature from the file');
  t.deepEqual(parsedData.transport.bpm, 60, 'gets the bpm from the file');
  t.deepEqual(parsedData.parts, midiJson, 'extracts the tracks from the file');
});

ava('Prelude in C format 1 midi file', function(t) {
  var midiData = fs.readFileSync('./midi/bwv-846.mid', 'binary'),
    midiJson = require('./midi/bwv-846.json', 'utf8'),
    parsedData = parse(midiData, {
      PPQ: 96,
      midiNote: true,
      noteName: false,
      velocity: true,
      duration: true
    });

  t.deepEqual(parsedData.transport.trackNames, [
    'Piano right',
    'Piano left',
    'Fuga 1',
    'Fuga 2',
    'Fuga 3',
    'Fuga 4',
  ], 'extracts the names of track containing notes from the file');
  t.deepEqual(parsedData.transport.timeSignature, [4, 4], 'gets the time signature from the file');
  t.deepEqual(Math.round(parsedData.transport.bpm * 100) / 100, 62.41, 'gets the bpm from the file');
  t.deepEqual(parsedData.parts, midiJson, 'extracts the tracks from the file');
});

ava('Prelude in D minor format 0 midi file', function(t) {
  var midiData = fs.readFileSync('./midi/bwv-850.mid', 'binary'),
    midiJson = require('./midi/bwv-850.json', 'utf8'),
    parsedData = parse(midiData, {
      PPQ: 24,
      midiNote: true,
      noteName: false,
      velocity: true,
      duration: true
    });

  t.deepEqual(parsedData.transport.trackNames, ['Präludium und Fuge in D-Dur, BWV 850'], 'extracts the track names from the file');
  t.deepEqual(parsedData.transport.timeSignature, [4, 4], 'gets the time signature from the file');
  t.deepEqual(Math.round(parsedData.transport.bpm * 100) / 100, 51, 'gets the bpm from the file');
  t.deepEqual(parsedData.parts, midiJson, 'extracts the tracks from the file');
});

ava('Prelude in C minor format 0 midi file', function(t) {
  var midiData = fs.readFileSync('./midi/bwv-847.mid', 'binary'),
    midiJson = require('./midi/bwv-847.json', 'utf8'),
    parsedData = parse(midiData, {
      PPQ: 192,
      midiNote: true,
      noteName: true,
      velocity: true,
      duration: true
    });

  t.deepEqual(parsedData.transport.trackNames, ['Das wohltemperierte Klavier I - Praeludium und Fuge 2 in c-Moll BWV 847'], 'extracts the track names from the file');
  t.falsy(parsedData.transport.bpm, 'gets the bpm from the file');
  t.deepEqual(parsedData.parts, midiJson, 'extracts the tracks from the file');
});

ava('Funk kit with implicit note off events', function(t) {
  var midiData = fs.readFileSync('./midi/funk-kit.mid', 'binary'),
    midiJson = require('./midi/funk-kit.json', 'utf8'),
    parsedData = parse(midiData, {
      PPQ: 192,
      midiNote: true,
      noteName: true,
      velocity: true,
      duration: true
    });

  t.deepEqual(Math.round(parsedData.transport.bpm), 104, 'gets the bpm from the file');
  t.deepEqual(parsedData.parts, midiJson, 'permutes noteOff and noteOn events');
});

ava('Single track, multi channel midi file (type 0)', function(t) {
  var midiData = fs.readFileSync('./midi/single-track-multi-channel.mid', 'binary'),
    midiJson = require('./midi/single-track-multi-channel.json', 'utf8'),
    parsedData = parse(midiData, {
      PPQ: 192,
      midiNote: true,
      noteName: true,
      velocity: true,
      duration: true
    });

  t.deepEqual(parsedData.transport.bpm, 100, 'gets the bpm from the file');
  t.deepEqual(parsedData.transport.instruments, [ 1, 90, 1, 81, 0 ], 'gets the list of instruments');
  t.deepEqual(parsedData.parts, midiJson, 'extracts the tracks from the file');
});

ava('Billie Jean, with a last note without duration', function(t) {
  var midiData = fs.readFileSync('./midi/117_BillieJean_MichaelJackson2.mid', 'binary'),
    midiJson = require('./midi/117_BillieJean_MichaelJackson2.json', 'utf8'),
    parsedData = parse(midiData, {
      PPQ: 192,
      midiNote: true,
      noteName: true,
      velocity: true,
      duration: true
    });

  t.deepEqual(parsedData.transport.trackNames, ['117_BillieJean_MichaelJackson2'], 'extracts the track names from the file');
  t.deepEqual(parsedData.parts, midiJson, 'extracts the tracks from the file without permuting the noteOn/noteOff events');
});

ava('James Bond Theme, with multiple Program Change events in each track', function(t) {
  var midiData = fs.readFileSync('./midi/Movie_Themes_-_James_Bond.mid', 'binary'),
    midiJson = require('./midi/Movie_Themes_-_James_Bond.json', 'utf8'),
    parsedData = parse(midiData, {
      PPQ: 192,
      midiNote: true,
      noteName: true,
      velocity: true,
      duration: true
    });

  t.deepEqual(parsedData.transport.instruments, midiJson.transport.instruments, 'extracts the instruments without redundancy');
});
