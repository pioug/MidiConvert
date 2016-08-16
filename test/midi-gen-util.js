import ava from 'ava';
import { MidiGen } from '../build/MidiConvert.js';

const Util = MidiGen.Util;

ava('Midi letter -> pitches', function(t) {
  const pitch = Util.midiLetterPitches;

  t.deepEqual(pitch.A, 21, 'Pitch for a should be 21');
  t.deepEqual(pitch.B, 23, 'Pitch for b should be 23');
  t.deepEqual(pitch.C, 12, 'Pitch for c should be 12');
  t.deepEqual(pitch.D, 14, 'Pitch for d should be 14');
  t.deepEqual(pitch.E, 16, 'Pitch for e should be 16');
  t.deepEqual(pitch.F, 17, 'Pitch for f should be 17');
  t.deepEqual(pitch.G, 19, 'Pitch for g should be 19');
});

// Check pitchFromNote against a wide range to ensure no additional functionality breaks it
ava('Midi pitchFromNote', function(t) {
  const pitchFromNote = Util.midiPitchFromNote;

  t.deepEqual(pitchFromNote('A1'), 33, 'Pitch of a1 is 33');
  t.deepEqual(pitchFromNote('B2'), 47, 'Pitch of b2 is 47');
  t.deepEqual(pitchFromNote('C3'), 48, 'Pitch of c3 is 48');
  t.deepEqual(pitchFromNote('C#3'), 49, 'Pitch of c#3 is 49');
  t.deepEqual(pitchFromNote('D4'), 62, 'Pitch of d4 is 62');
  t.deepEqual(pitchFromNote('E5'), 76, 'Pitch of e5 is 76');
  t.deepEqual(pitchFromNote('F6'), 89, 'Pitch of f6 is 89');
  t.deepEqual(pitchFromNote('F#6'), 90, 'Pitch of f#6 is 90');
  t.deepEqual(pitchFromNote('G7'), 103, 'Pitch of g7 is 103');
  t.deepEqual(pitchFromNote('G#7'), 104, 'Pitch of g#7 is 104');

  // Check pitch with flattened notes
  t.deepEqual(pitchFromNote('Bb1'), 34, 'Pitch of a#1 is 34');
  t.deepEqual(pitchFromNote('Eb4'), 63, 'Pitch of d#4 is 63');

  // Check pitch with unconventional notes
  t.deepEqual(pitchFromNote('Fb4'), 64, 'Pitch for unconventional note fb4 is the same as e4');
  t.deepEqual(pitchFromNote('E#4'), 65, 'Pitch for unconventional note e#4 is the same as f4');

  // Check pitch with cross octave numbers
  t.deepEqual(pitchFromNote('B#2'), 48, 'Pitch for b#2 is the same as c3');
  t.deepEqual(pitchFromNote('Cb3'), 47, 'Pitch for cb3 is the same as b2');
});

ava('Midi -> Util -> ensureMidiPitch', function(t) {
  const ensureMidiPitch = Util.ensureMidiPitch;

  t.deepEqual(ensureMidiPitch(2), 2, 'Number input is accepted');
  t.deepEqual(ensureMidiPitch('C3'), 48, 'A string of note name and octave is accepted');
});

ava('Midi -> Util -> noteFromMidiPitch', function(t) {
  const noteFromMidiPitch = Util.noteFromMidiPitch;

  t.deepEqual(noteFromMidiPitch(33), 'A1', 'Note for Midi pitch 33 is a1');
  t.deepEqual(noteFromMidiPitch(47), 'B2', 'Note for Midi pitch 47 is b2');
  t.deepEqual(noteFromMidiPitch(48), 'C3', 'Note for Midi pitch 48 is c3');
  t.deepEqual(noteFromMidiPitch(49), 'C#3', 'Note for Midi pitch 49 is c#3');
  t.deepEqual(noteFromMidiPitch(62), 'D4', 'Note for Midi pitch 62 is d4');
  t.deepEqual(noteFromMidiPitch(76), 'E5', 'Note for Midi pitch 76 is e5');
  t.deepEqual(noteFromMidiPitch(89), 'F6', 'Note for Midi pitch 89 is f6');
  t.deepEqual(noteFromMidiPitch(90), 'F#6', 'Note for Midi pitch 90 is f#6');
  t.deepEqual(noteFromMidiPitch(103), 'G7', 'Note for Midi pitch 103 is g7');
  t.deepEqual(noteFromMidiPitch(104), 'G#7', 'Note for Midi pitch 104 is g#7');

  // Check with returnFlattened set to true
  t.deepEqual(noteFromMidiPitch(34, true), 'Bb1', 'Note for Midi pitch 34 is bb1');
  t.deepEqual(noteFromMidiPitch(63, true), 'Eb4', 'Note for Midi pitch 63 is eb4');
});

ava('Midi -> Util -> mpqnFromBpm', function(t) {
  const mpqn = Util.mpqnFromBpm(120);

  t.deepEqual(mpqn, [7, 161, 32], 'mpqnFromBpm returns expected array');
});

ava('Midi -> Util -> bpmFromMpqn', function(t) {
  const bpm = Util.bpmFromMpqn(500000);

  t.deepEqual(bpm, 120, 'bpmFromMpqn returns expected BPM');
});

ava('Midi -> Util -> codes2Str', function(t) {
  t.deepEqual(Util.codes2Str([65, 66, 67]), 'ABC', 'codes2Str returns expected output');
});

ava('Midi -> Util -> str2Bytes', function(t) {
  t.deepEqual(Util.str2Bytes('c')[0], 12, 'str2Bytes returns expected output');
});

ava('Midi -> Util -> translateTickTime', function(t) {
  t.deepEqual(Util.translateTickTime(16), [16], 'translateTickTime translates tick to MIDI timestamp as expected');
  t.deepEqual(Util.translateTickTime(32), [32], 'translateTickTime translates tick to MIDI timestamp as expected');
  t.deepEqual(Util.translateTickTime(128), [129, 0], 'translateTickTime translates tick to MIDI timestamp as expected');
  t.deepEqual(Util.translateTickTime(512), [132, 0], 'translateTickTime translates tick to MIDI timestamp as expected');
});

ava('Midi -> Util -> ticksToSeconds', function(t) {
  const tests = [
    [0, 120, 0],
    [1022, 120, 3.9921875],
    [1024, 120, 4],
    [1150, 120, 4.4921875],
    [1152, 120, 4.5],
    [126, 120, 0.4921875],
    [1278, 120, 4.9921875],
    [128, 120, 0.5],
    [1280, 120, 5],
    [1406, 120, 5.4921875],
    [1408, 120, 5.5],
    [1534, 120, 5.9921875],
    [1536, 120, 6],
    [1662, 120, 6.4921875],
    [1664, 120, 6.5],
    [1790, 120, 6.9921875],
    [1792, 120, 7],
    [1918, 120, 7.4921875],
    [1920, 120, 7.5],
    [2046, 120, 7.9921875],
    [254, 120, 0.9921875],
    [256, 120, 1],
    [382, 120, 1.4921875],
    [384, 120, 1.5],
    [510, 120, 1.9921875],
    [512, 120, 2],
    [638, 120, 2.4921875],
    [640, 120, 2.5],
    [766, 120, 2.9921875],
    [768, 120, 3],
    [894, 120, 3.4921875],
    [896, 120, 3.5],
    [1, 120, 0.00390625]
  ];

  tests.map(function([ticks, bpm, result]) {
    t.deepEqual(Util.ticksToSeconds(ticks, bpm), result, 'ticksToSeconds converts ticks to seconds');
  });
});

ava('Midi -> Util -> secondsToTicks', function(t) {
  const tests = [
    [0, 120, 0],
    [8, 120, 2048],
    [1.1331065759636707, 120, 291]
  ];

  tests.map(function([seconds, bpm, result]) {
    t.deepEqual(Util.secondsToTicks(seconds, bpm), result, 'ticksToSeconds converts seconds to ticks by rounding up');
  });
});
