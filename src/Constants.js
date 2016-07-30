var EVENT = {
    NOTE_OFF: 0x80,
    NOTE_ON: 0x90,
    AFTER_TOUCH: 0xA0,
    CONTROL_CHANGE: 0xB0,
    CONTROLLER: {
      DAMPER_PEDAL: 0x40
    },
    PROGRAM_CHANGE: 0xC0,
    CHANNEL_AFTERTOUCH: 0xD0,
    PITCH_BEND: 0xE0
  },

  META_EVENT = {
    SEQUENCE_NUMBER: 0x00,
    TEXT: 0x01,
    COPYRIGHT_NOTICE: 0x02,
    TRACK_NAME: 0x03,
    INSTRUMENT_NAME: 0x04,
    LYRICS: 0x05,
    MARKER: 0x06,
    CUE_POINT: 0x07,
    PROGRAM_NAME: 0x08,
    DEVICE_NAME: 0x09,
    MIDI_CHANNEL_PREFIX: 0x20,
    MIDI_PORT: 0x21,
    END_OF_TRACK: 0x2f,
    SET_TEMPO: 0x51,
    SMPTE_OFFSET: 0x54,
    TIME_SIGNATURE: 0x58,
    KEY_SIGNATURE: 0x59,
    SEQUENCER_SPECIFIC: 0x7f
  },

  PPQ = 128,

  THIRTY_SECOND_NOTES_PER_QUARTER_NOTE = 8,

  TICKS_PER_CLICK = 24,

  midiFlattenedNotes = {
    'A#': 'Bb',
    'C#': 'Db',
    'D#': 'Eb',
    'F#': 'Gb',
    'G#': 'Ab'
  },

  midiLetterPitches = {
    A: 21,
    B: 23,
    C: 12,
    D: 14,
    E: 16,
    F: 17,
    G: 19
  },

  midiPitchesLetter = {
    12: 'C',
    13: 'C#',
    14: 'D',
    15: 'D#',
    16: 'E',
    17: 'F',
    18: 'F#',
    19: 'G',
    20: 'G#',
    21: 'A',
    22: 'A#',
    23: 'B'
  };

export {
  EVENT,
  META_EVENT,
  PPQ,
  THIRTY_SECOND_NOTES_PER_QUARTER_NOTE,
  TICKS_PER_CLICK,
  midiFlattenedNotes,
  midiLetterPitches,
  midiPitchesLetter
};
