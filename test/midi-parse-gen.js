import ava from 'ava';

import {
  generate,
  parse
} from '../build/MidiConvert.js';

const fs = require('fs');
const midiConvertOpts = {
  deterministic: true,
  duration: true,
  midiNote: true,
  noteName: true,
  PPQ: 128,
  velocity: true
};

ava('Parse then generate 117_BillieJean_MichaelJackson2.mid', function(t) {
  var sourceFile = fs.readFileSync('./midi/117_BillieJean_MichaelJackson2.mid', 'binary'),
    sourceData = parse(sourceFile, midiConvertOpts),
    destinationData = parse(generate(sourceData), midiConvertOpts);
  t.deepEqual(sourceData, destinationData);
});

ava('Parse then generate bwv-846.mid', function(t) {
  var sourceFile = fs.readFileSync('./midi/bwv-846.mid', 'binary'),
    sourceData = parse(sourceFile, midiConvertOpts),
    destinationData = parse(generate(sourceData), midiConvertOpts);
  t.deepEqual(sourceData, destinationData);
});

ava('Parse then generate bwv-847.mid', function(t) {
  var sourceFile = fs.readFileSync('./midi/bwv-847.mid', 'binary'),
    sourceData = parse(sourceFile, midiConvertOpts),
    destinationData = parse(generate(sourceData), midiConvertOpts);
  t.deepEqual(sourceData, destinationData);
});

ava('Parse then generate bwv-850.mid', function(t) {
  var sourceFile = fs.readFileSync('./midi/bwv-850.mid', 'binary'),
    sourceData = parse(sourceFile, midiConvertOpts),
    destinationData = parse(generate(sourceData), midiConvertOpts);
  t.deepEqual(sourceData, destinationData);
});

ava('Parse then generate bwv-988-v01.mid', function(t) {
  var sourceFile = fs.readFileSync('./midi/bwv-988-v01.mid', 'binary'),
    sourceData = parse(sourceFile, midiConvertOpts),
    destinationData = parse(generate(sourceData), midiConvertOpts);
  t.deepEqual(sourceData, destinationData);
});

ava('Parse then generate funk-kit.mid', function(t) {
  var sourceFile = fs.readFileSync('./midi/funk-kit.mid', 'binary'),
    sourceData = parse(sourceFile, midiConvertOpts),
    destinationData = parse(generate(sourceData), midiConvertOpts);
  t.deepEqual(sourceData, destinationData);
});

ava('Parse then generate Movie_Themes_-_James_Bond.mid', function(t) {
  var sourceFile = fs.readFileSync('./midi/Movie_Themes_-_James_Bond.mid', 'binary'),
    sourceData = parse(sourceFile, midiConvertOpts),
    destinationData = parse(generate(sourceData), midiConvertOpts);

  t.deepEqual(sourceData, destinationData);
});

ava('Parse then generate single-track-multi-channel.mid', function(t) {
  var sourceFile = fs.readFileSync('./midi/single-track-multi-channel.mid', 'binary'),
    sourceData = parse(sourceFile, midiConvertOpts),
    destinationData = parse(generate(sourceData), midiConvertOpts);
  t.deepEqual(sourceData, destinationData);
});

ava('Parse then generate 462a505b-2d88-957c-fd63-f25754dd6af5-orignal.mid', function(t) {
  var sourceFile = fs.readFileSync('./midi/462a505b-2d88-957c-fd63-f25754dd6af5-orignal.mid', 'binary'),
    sourceData = parse(sourceFile, midiConvertOpts),
    destinationData = parse(generate(sourceData), midiConvertOpts);
  t.deepEqual(sourceData, destinationData);
});
