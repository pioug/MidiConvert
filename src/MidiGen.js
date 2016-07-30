import File from './MidiGenFile.js';
import MetaEvent from './MidiGenMetaEvent.js';
import MidiEvent from './MidiGenEvent.js';
import Track from './MidiGenTrack.js';

import {
  bpmFromMpqn,
  codes2Str,
  ensureMidiPitch,
  midiPitchFromNote,
  mpqnFromBpm,
  noteFromMidiPitch,
  str2Bytes,
  translateTickTime
} from './MidiGenUtil.js';

import {
  midiFlattenedNotes,
  midiLetterPitches,
  midiPitchesLetter
} from './Constants.js';

export default {
  File,
  Track,
  MidiEvent,
  MetaEvent,
  Util: {
    midiLetterPitches,
    midiPitchesLetter,
    midiFlattenedNotes,
    midiPitchFromNote,
    ensureMidiPitch,
    noteFromMidiPitch,
    mpqnFromBpm,
    bpmFromMpqn,
    codes2Str,
    str2Bytes,
    translateTickTime
  }
};
