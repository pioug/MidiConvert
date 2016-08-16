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
  secondsToTicks,
  str2Bytes,
  ticksToSeconds,
  translateTickTime,
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
    bpmFromMpqn,
    codes2Str,
    ensureMidiPitch,
    midiFlattenedNotes,
    midiLetterPitches,
    midiPitchesLetter,
    midiPitchFromNote,
    mpqnFromBpm,
    noteFromMidiPitch,
    secondsToTicks,
    str2Bytes,
    ticksToSeconds,
    translateTickTime
  }
};
