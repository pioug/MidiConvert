(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (factory((global.MidiConvert = global.MidiConvert || {})));
}(this, (function (exports) { 'use strict';

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
  };
var META_EVENT = {
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
  };
var PPQ = 128;
var THIRTY_SECOND_NOTES_PER_QUARTER_NOTE = 8;
var TICKS_PER_CLICK = 24;
var midiFlattenedNotes = {
    'A#': 'Bb',
    'C#': 'Db',
    'D#': 'Eb',
    'F#': 'Gb',
    'G#': 'Ab'
  };
var midiLetterPitches = {
    A: 21,
    B: 23,
    C: 12,
    D: 14,
    E: 16,
    F: 17,
    G: 19
  };
var midiPitchesLetter = {
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

/**
 * Convert a symbolic note name (e.g. 'c4') to a numeric MIDI pitch (e.g.
 * 60, middle C).
 *
 * @param {string} n - The symbolic note name to parse.
 * @returns {number} The MIDI pitch that corresponds to the symbolic note
 * name.
 */
function midiPitchFromNote(n) {
  var matches = /([A-G])(#+|b+)?([0-9]+)$/i.exec(n),
    note = matches[1].toUpperCase(),
    accidental = matches[2] || '',
    octave = parseInt(matches[3], 10);

  return (12 * octave) + midiLetterPitches[note] + (accidental.substr(0, 1) === '#' ? 1 : -1) * accidental.length;
}

/**
 * Ensure that the given argument is converted to a MIDI pitch. Note that
 * it may already be one (including a purely numeric string).
 *
 * @param {string|number} p - The pitch to convert.
 * @returns {number} The resulting numeric MIDI pitch.
 */
function ensureMidiPitch(p) {
  if (typeof p === 'number' || !/[^0-9]/.test(p)) {
    // numeric pitch
    return parseInt(p, 10);
  } else {
    // assume it's a note name
    return midiPitchFromNote(p);
  }
}

/**
 * Convert a numeric MIDI pitch value (e.g. 60) to a symbolic note name
 * (e.g. 'c4').
 *
 * @param {number} n - The numeric MIDI pitch value to convert.
 * @param {boolean} [returnFlattened=false] - Whether to prefer flattened
 * notes to sharpened ones. Optional, default false.
 * @returns {string} The resulting symbolic note name.
 */
function noteFromMidiPitch(n, returnFlattened) {
  var octave = 0,
    noteNum = n,
    noteName;

  returnFlattened = returnFlattened || false;

  if (n > 23) {
    // noteNum is on octave 1 or more
    octave = Math.floor(n / 12) - 1;
    // subtract number of octaves from noteNum
    noteNum = n - octave * 12;
  }

  // get note name (c#, d, f# etc)
  noteName = midiPitchesLetter[noteNum];
  // Use flattened notes if requested (e.g. f# should be output as gb)
  if (returnFlattened && noteName.indexOf('#') > 0) {
    noteName = midiFlattenedNotes[noteName];
  }
  return noteName + octave;
}

/**
 * Convert beats per minute (BPM) to microseconds per quarter note (MPQN).
 *
 * @param {number} bpm - A number in beats per minute.
 * @returns {number} The number of microseconds per quarter note.
 */
function mpqnFromBpm(bpm) {
  var mpqn = Math.floor(60000000 / bpm),
    ret = [];

  do {
    ret.unshift(mpqn & 0xFF);
    mpqn >>= 8;
  } while (mpqn);
  while (ret.length < 3) {
    ret.push(0);
  }
  return ret;
}

/**
 * Convert microseconds per quarter note (MPQN) to beats per minute (BPM).
 *
 * @param {number} mpqn - The number of microseconds per quarter note.
 * @returns {number} A number in beats per minute.
 */
function bpmFromMpqn(mpqn) {
  return Math.floor(60000000 / mpqn);
}

/**
 * Converts an array of bytes to a string of hexadecimal characters. Prepares
 * it to be converted into a base64 string.
 *
 * @param {Array} byteArray - Array of bytes to be converted.
 * @returns {string} Hexadecimal string, e.g. '097B8A'.
 */
function codes2Str(byteArray) {
  return String.fromCharCode.apply(null, byteArray);
}

/**
 * Converts a string of hexadecimal values to an array of bytes. It can also
 * add remaining '0' nibbles in order to have enough bytes in the array as the
 * `finalBytes` parameter.
 *
 * @param {string} str - string of hexadecimal values e.g. '097B8A'
 * @param {number} [finalBytes] - Optional. The desired number of bytes
 * (not nibbles) that the returned array should contain.
 * @returns {Array} An array of nibbles.
 */
function str2Bytes(str, finalBytes) {
  if (finalBytes) {
    while ((str.length / 2) < finalBytes) { str = '0' + str; }
  }

  var bytes = [],
    chars,
    i;

  for (i = str.length - 1; i >= 0; i = i - 2) {
    chars = i === 0 ? str[i] : str[i - 1] + str[i];
    bytes.unshift(parseInt(chars, 16));
  }

  return bytes;
}

/**
 * Translates number of ticks to MIDI timestamp format, returning an array
 * of bytes with the time values. MIDI has a very particular way to express
 * time; take a good look at the spec before ever touching this function.
 *
 * @param {number} ticks - Number of ticks to be translated.
 * @returns {number} Array of bytes that form the MIDI time value.
 */
function translateTickTime(ticks) {
  var buffer = ticks & 0x7F,
    cond = true,
    bList = [];

  ticks = ticks >> 7;
  while (ticks) {
    buffer <<= 8;
    buffer |= ((ticks & 0x7F) | 0x80);
    ticks = ticks >> 7;
  }

  while (cond) {
    bList.push(buffer & 0xff);

    if (buffer & 0x80) {
      buffer >>= 8;
    } else {
      cond = false;
    }
  }
  return bList;
}

/**
 * @param {number} ticks - Number of ticks
 * @param {number} bpm - BPM of MIDI score
 * @param {number=} ppq - PPQ used when parsing MIDI file
 * @returns {number} Number of seconds
 */
function ticksToSeconds(ticks, bpm, ppq = PPQ) {
  return 60 / bpm * ticks / ppq;
}

/**
 * Ticks are rounded up to prevent notes from being filtered out
 * if the beginning of the MIDI is cut (in a DAW for example)
 * @param {number} seconds - Number of seconds
 * @param {number} bpm - BPM of MIDI score
 * @param {number=} ppq - PPQ used when parsing MIDI file
 * @returns {number} Number of ticks
 */
function secondsToTicks(seconds, bpm, ppq = PPQ) {
  return Math.ceil(seconds / 60 * bpm * ppq);
}

/**
 * Construct a meta event.
 *
 * Parameters include:
 *  - time [optional number] - Ticks since previous event.
 *  - type [required number] - Type of event.
 *  - data [optional array|string] - Event data.
 */
var MetaEvent = function(params) {
  if (!this) return new MetaEvent(params);
  this.setTime(params.time);
  this.setType(params.type);
  this.setData(params.data);
};

/**
 * Set the time for the event in ticks since the previous event.
 *
 * @param {number} ticks - The number of ticks since the previous event. May
 * be zero.
 */
MetaEvent.prototype.setTime = function(ticks) {
  this.time = translateTickTime(ticks || 0);
};

/**
 * Set the type of the event. Must be one of the event codes on MetaEvent.
 *
 * @param {number} t - Event type.
 */
MetaEvent.prototype.setType = function(t) {
  this.type = t;
};

/**
 * Set the data associated with the event. May be a string or array of byte
 * values.
 *
 * @param {string|Array} d - Event data.
 */
MetaEvent.prototype.setData = function(d) {
  this.data = d;
};

/**
 * Serialize the event to an array of bytes.
 *
 * @returns {Array} The array of serialized bytes.
 */
MetaEvent.prototype.toBytes = function() {
  if (!this.type) {
    throw new Error('Type for meta-event not specified.');
  }

  var byteArray = [],
    dataBytes;
  byteArray.push.apply(byteArray, this.time);
  byteArray.push(0xFF, this.type);

  // If data is an array, we assume that it contains several bytes. We
  // append them to byteArray.
  if (Array.isArray(this.data)) {
    byteArray.push(this.data.length);
    byteArray.push.apply(byteArray, this.data);
  } else if (typeof this.data === 'number') {
    byteArray.push(1, this.data);
  } else if (this.data !== null && typeof this.data !== 'undefined') {
    // assume string; may be a bad assumption
    byteArray.push(this.data.length);
    dataBytes = this.data.split('').map(function(x) {
      return x.charCodeAt(0);
    });
    byteArray.push.apply(byteArray, dataBytes);
  } else {
    byteArray.push(0);
  }

  return byteArray;
};

/**
 * Construct a MIDI event.
 *
 * Parameters include:
 *  - time [optional number] - Ticks since previous event.
 *  - type [required number] - Type of event.
 *  - channel [required number] - Channel for the event.
 *  - param1 [required number] - First event parameter.
 *  - param2 [optional number] - Second event parameter.
 */
var MidiEvent = function(params) {
  if (!this) return new MidiEvent(params);
  if (params &&
      (params.type !== null || typeof params.type !== 'undefined') &&
      (params.channel !== null || typeof params.channel !== 'undefined') &&
      (params.param1 !== null || typeof params.param1 !== 'undefined')) {
    this.setTime(params.time);
    this.setType(params.type);
    this.setChannel(params.channel);
    this.setParam1(params.param1);
    this.setParam2(params.param2);
  }
};

/**
 * Set the time for the event in ticks since the previous event.
 *
 * @param {number} ticks - The number of ticks since the previous event. May
 * be zero.
 */
MidiEvent.prototype.setTime = function(ticks) {
  this.time = translateTickTime(ticks || 0);
};

/**
 * Set the type of the event. Must be one of the event codes on MidiEvent.
 *
 * @param {number} type - Event type.
 */
MidiEvent.prototype.setType = function(type) {
  if (type < EVENT.NOTE_OFF || type > EVENT.PITCH_BEND) {
    throw new Error('Trying to set an unknown event: ' + type);
  }

  this.type = type;
};

/**
 * Set the channel for the event. Must be between 0 and 15, inclusive.
 *
 * @param {number} channel - The event channel.
 */
MidiEvent.prototype.setChannel = function(channel) {
  if (channel < 0 || channel > 15) {
    throw new Error('Channel is out of bounds.');
  }

  this.channel = channel;
};

/**
 * Set the first parameter for the event. Must be between 0 and 255,
 * inclusive.
 *
 * @param {number} p - The first event parameter value.
 */
MidiEvent.prototype.setParam1 = function(p) {
  this.param1 = p;
};

/**
 * Set the second parameter for the event. Must be between 0 and 255,
 * inclusive.
 *
 * @param {number} p - The second event parameter value.
 */
MidiEvent.prototype.setParam2 = function(p) {
  this.param2 = p;
};

/**
 * Serialize the event to an array of bytes.
 *
 * @returns {Array} The array of serialized bytes.
 */
MidiEvent.prototype.toBytes = function() {
  var byteArray = [],
    typeChannelByte = this.type | (this.channel & 0xF);

  byteArray.push.apply(byteArray, this.time);
  byteArray.push(typeChannelByte);
  byteArray.push(this.param1);

  // Some events don't have a second parameter
  if (typeof this.param2 !== 'undefined' && this.param2 !== null) {
    byteArray.push(this.param2);
  }
  return byteArray;
};

var DEFAULT_VOLUME = 90;

/**
 * Construct a MIDI track.
 *
 * Parameters include:
 *  - events [optional array] - Array of events for the track.
 */
exports.Track = function(config) {
  if (!this) return new exports.Track(config);
  var c = config || {};
  this.events = c.events || [];
};

exports.Track.START_BYTES = [0x4d, 0x54, 0x72, 0x6b];
exports.Track.END_BYTES = [0x00, 0xFF, 0x2F, 0x00];

/**
 * Add an event to the track.
 *
 * @param {MidiEvent|MetaEvent} event - The event to add.
 * @returns {Track} The current track.
 */
exports.Track.prototype.addEvent = function(event) {
  this.events.push(event);
  return this;
};

/**
 * Add a note-on event to the track.
 *
 * @param {number} channel - The channel to add the event to.
 * @param {number|string} pitch - The pitch of the note, either numeric or
 * symbolic.
 * @param {number} [time=0] - The number of ticks since the previous event,
 * defaults to 0.
 * @param {number} [velocity=90] - The volume for the note, defaults to
 * DEFAULT_VOLUME.
 * @returns {Track} The current track.
 */
exports.Track.prototype.addNoteOn = function(channel, pitch, time, velocity) {
  this.events.push(new MidiEvent({
    type: EVENT.NOTE_ON,
    channel: channel,
    param1: ensureMidiPitch(pitch),
    param2: velocity || DEFAULT_VOLUME,
    time: time || 0
  }));
  return this;
};

/**
 * Add a note-off event to the track.
 *
 * @param {number} channel - The channel to add the event to.
 * @param {number|string} pitch - The pitch of the note, either numeric or
 * symbolic.
 * @param {number} [time=0] - The number of ticks since the previous event,
 * defaults to 0.
 * @param {number} [velocity=90] - The velocity the note was released,
 * defaults to DEFAULT_VOLUME.
 * @returns {Track} The current track.
 */
exports.Track.prototype.addNoteOff = function(channel, pitch, time, velocity) {
  this.events.push(new MidiEvent({
    type: EVENT.NOTE_OFF,
    channel: channel,
    param1: ensureMidiPitch(pitch),
    param2: velocity || DEFAULT_VOLUME,
    time: time || 0
  }));
  return this;
};

exports.Track.prototype.addSustainOn = function(channel, time) {
  this.events.push(new MidiEvent({
    type: EVENT.CONTROL_CHANGE,
    channel: channel,
    param1: EVENT.CONTROLLER.DAMPER_PEDAL,
    param2: 127,
    time: time || 0
  }));
  return this;
};

exports.Track.prototype.addSustainOff = function(channel, time) {
  this.events.push(new MidiEvent({
    type: EVENT.CONTROL_CHANGE,
    channel: channel,
    param1: EVENT.CONTROLLER.DAMPER_PEDAL,
    param2: 0,
    time: time || 0
  }));
  return this;
};

/**
 * Add a note-on and -off event to the track.
 *
 * @param {number} channel - The channel to add the event to.
 * @param {number|string} pitch - The pitch of the note, either numeric or
 * symbolic.
 * @param {number} dur - The duration of the note, in ticks.
 * @param {number} [time=0] - The number of ticks since the previous event,
 * defaults to 0.
 * @param {number} [velocity=90] - The velocity the note was released,
 * defaults to DEFAULT_VOLUME.
 * @returns {Track} The current track.
 */
exports.Track.prototype.addNote = function(channel, pitch, dur, time, velocity) {
  this.noteOn(channel, pitch, time, velocity);
  if (dur) {
    this.noteOff(channel, pitch, dur, velocity);
  }
  return this;
};

/**
 * Add a note-on and -off event to the track for each pitch in an array of pitches.
 *
 * @param {number} channel - The channel to add the event to.
 * @param {array} chord - An array of pitches, either numeric or
 * symbolic.
 * @param {number} dur - The duration of the chord, in ticks.
 * @param {number} [velocity=90] - The velocity of the chord,
 * defaults to DEFAULT_VOLUME.
 * @returns {Track} The current track.
 */
exports.Track.prototype.addChord = function(channel, chord, dur, velocity) {
  if (!Array.isArray(chord) && !chord.length) {
    throw new Error('Chord must be an array of pitches');
  }
  chord.forEach(function(note) {
    this.noteOn(channel, note, 0, velocity);
  }, this);
  chord.forEach(function(note, index) {
    if (index === 0) {
      this.noteOff(channel, note, dur);
    } else {
      this.noteOff(channel, note);
    }
  }, this);
  return this;
};

/**
 * Set instrument for the track.
 *
 * @param {number} channel - The channel to set the instrument on.
 * @param {number} instrument - The instrument to set it to.
 * @param {number} [time=0] - The number of ticks since the previous event,
 * defaults to 0.
 * @returns {Track} The current track.
 */
exports.Track.prototype.setInstrument = function(channel, instrument, time) {
  this.events.push(new MidiEvent({
    type: EVENT.PROGRAM_CHANGE,
    channel: channel,
    param1: instrument,
    time: time || 0
  }));
  return this;
};

exports.Track.prototype.setTimeSignature = function(numerator, denominator, time) {
  this.events.push(new MetaEvent({
    type: META_EVENT.TIME_SIGNATURE,
    data: [
      numerator,
      Math.log2(denominator),
      TICKS_PER_CLICK,
      THIRTY_SECOND_NOTES_PER_QUARTER_NOTE
    ],
    time: time || 0
  }));
  return this;
};

/**
 * Set the tempo for the track.
 *
 * @param {number} bpm - The new number of beats per minute.
 * @param {number} [time=0] - The number of ticks since the previous event,
 * defaults to 0.
 * @returns {Track} The current track.
 */
exports.Track.prototype.setTempo = function(bpm, time) {
  this.events.push(new MetaEvent({
    type: META_EVENT.SET_TEMPO,
    data: mpqnFromBpm(bpm),
    time: time || 0
  }));
  return this;
};

exports.Track.prototype.setName = function(name, time) {
  this.events.push(new MetaEvent({
    type: META_EVENT.TRACK_NAME,
    data: name,
    time: time || 0
  }));
  return this;
};

/**
 * Serialize the track to an array of bytes.
 *
 * @returns {Array} The array of serialized bytes.
 */
exports.Track.prototype.toBytes = function() {
  var trackLength = 0,
    eventBytes = [],
    lengthBytes,
    startBytes = exports.Track.START_BYTES,
    endBytes = exports.Track.END_BYTES;

  function addEventBytes(event) {
    var bytes = event.toBytes();
    trackLength += bytes.length;
    eventBytes.push.apply(eventBytes, bytes);
  }

  this.events.forEach(addEventBytes);

  // Add the end-of-track bytes to the sum of bytes for the track, since
  // they are counted (unlike the start-of-track ones).
  trackLength += endBytes.length;

  // Makes sure that track length will fill up 4 bytes with 0s in case
  // the length is less than that (the usual case).
  lengthBytes = str2Bytes(trackLength.toString(16), 4);

  return startBytes.concat(lengthBytes, eventBytes, endBytes);
};

/**
 * Construct a file object.
 *
 * Parameters include:
 *  - ticks [optional number] - Number of ticks per beat, defaults to 128.
 *    Must be 1-32767.
 *  - tracks [optional array] - Track data.
 */
var File = function(config) {
  if (!this) return new File(config);

  var c = config || {};
  if (c.ticks) {
    if (typeof c.ticks !== 'number') {
      throw new Error('Ticks per beat must be a number!');
    }
    if (c.ticks <= 0 || c.ticks >= (1 << 15) || c.ticks % 1 !== 0) {
      throw new Error('Ticks per beat must be an integer between 1 and 32767!');
    }
  }

  this.ticks = c.ticks || PPQ;
  this.tracks = c.tracks || [];
};

File.HDR_CHUNKID = 'MThd'; // File magic cookie
File.HDR_CHUNK_SIZE = '\x00\x00\x00\x06'; // Header length for SMF
File.HDR_TYPE0 = '\x00\x00'; // Midi Type 0 id
File.HDR_TYPE1 = '\x00\x01'; // Midi Type 1 id

/**
 * Add a track to the file.
 *
 * @param {Track} track - The track to add.
 */
File.prototype.addTrack = function(track) {
  if (track) {
    this.tracks.push(track);
    return this;
  } else {
    track = new exports.Track();
    this.tracks.push(track);
    return track;
  }
};

/**
 * Serialize the MIDI file to an array of bytes.
 *
 * @returns {Array} The array of serialized bytes.
 */
File.prototype.toBytes = function() {
  var trackCount = this.tracks.length.toString(16),
    bytes = File.HDR_CHUNKID + File.HDR_CHUNK_SIZE; // prepare the file header

  // set Midi type based on number of tracks
  if (parseInt(trackCount, 16) > 1) {
    bytes += File.HDR_TYPE1;
  } else {
    bytes += File.HDR_TYPE0;
  }

  // add the number of tracks (2 bytes)
  bytes += codes2Str(str2Bytes(trackCount, 2));
  // add the number of ticks per beat (currently hardcoded)
  bytes += String.fromCharCode((this.ticks / 256), this.ticks % 256);

  // iterate over the tracks, converting to bytes too
  this.tracks.forEach(function(track) {
    bytes += codes2Str(track.toBytes());
  });

  return bytes;
};

function toArray(hash) {
  var arr = [],
    key;
  for (key in hash) {
    if (hash.hasOwnProperty(key)) {
      arr.push(hash[key]);
    }
  }
  return arr;
}

function flatten(a, b) {
  return a.concat(b);
}

function isTruthy(a) {
  return !!a;
}

function generate(midiJson) {
  var destination = new File();
  midiJson.parts.forEach(copyTrack);
  return destination.toBytes();

  function copyTrack(src, index) {
    var track = destination.addTrack();

    if (midiJson.transport.bpm) {
      track.setTempo(midiJson.transport.bpm);
    }

    if (midiJson.transport.instruments && typeof midiJson.transport.instruments[index] !== 'undefined') {
      track.setInstrument(midiJson.transport.instruments[index] === 0 ? 9 : index >= 9 ? index + 1 : index, midiJson.transport.instruments[index] - 1);
    }

    if (midiJson.transport.timeSignature) {
      track.setTimeSignature(midiJson.transport.timeSignature[0], midiJson.transport.timeSignature[1]);
    }

    if (midiJson.transport.trackNames && midiJson.transport.trackNames[index]) {
      track.setName(midiJson.transport.trackNames[index]);
    }

    src.map(createEvents)
      .filter(isTruthy)
      .reduce(flatten, [])
      .sort(compareTime)
      .reduce(smartSort, [])
      .reduce(convertToDeltaTime, [])
      .reduce(insertEvents, track);
  }
}

function insertEvents(track, event) {
  if (event.name.includes('Note')) {
    track['add' + event.name](0, event.midiNote, event.deltaTime, event.velocity * 127);
  } else if (event.name.includes('Sustain')) {
    track['add' + event.name](0, event.deltaTime);
  }
  return track;
}

/*
 * Sorting only by time is not enough to support cases
 * where notes and/or on-off events are concurrent
 * Example of prioritisation when events are simultaneous:
 * - Prefer 'Off' event over 'On' event to avoid consecutive 'On'
 * - Prefer event that will last longer
 */
function smartSort(result, event, index, events) {
  var prev = result[result.length - 1],
    next = event,
    ongoing,
    potentialCanditates;

  if (!result.length) {
    next.taken = true;
    return [next];
  }

  next = events.find(e => !e.taken && e.time >= prev.time);
  ongoing = result.filter(e => e.midiNote === next.midiNote).pop();

  if (!ongoing) {
    next.taken = true;
    return result.concat(next);
  }

  potentialCanditates = events.filter(e => !e.taken && e.time === next.time);

  if (ongoing && ongoing.name.includes('On')) {
    next = potentialCanditates.find(e => e.name.includes('Off')) || next;
  } else if (ongoing && ongoing.name.includes('Off')) {
    next = potentialCanditates.find(e => e.name.includes('On')) || next;
  }

  next.taken = true;
  return result.concat(next);
}

function compareTime(a, b) {
  return a.time - b.time;
}

function createEvents(note) {
  if (typeof note.midiNote !== 'undefined') {
    return [{
      duration: parseInt(note.duration),
      midiNote: note.midiNote,
      name: 'NoteOn',
      time: parseInt(note.time),
      velocity: note.velocity
    }, {
      duration: parseInt(note.duration),
      midiNote: note.midiNote,
      name: 'NoteOff',
      time: parseInt(note.time) + parseInt(note.duration),
      velocity: note.velocity
    }];
  } else if (note.eventName === 'sustain') {
    return [{
      name: 'SustainOn',
      time: parseInt(note.time)
    }, {
      name: 'SustainOff',
      time: parseInt(note.time) + parseInt(note.duration)
    }];
  }
}

function convertToDeltaTime(result, event, index, events) {
  var deltaTime = 0;

  if (result.length !== 0) {
    deltaTime = event.time - events[index - 1].time;
  } else {
    deltaTime = event.time;
  }

  return result.concat({
    duration: event.duration,
    time: event.time,
    name: event.name,
    midiNote: event.midiNote,
    deltaTime: deltaTime,
    velocity: event.velocity
  });
}

/* Wrapper for accessing strings through sequential reads */
function Stream(str) {
  var position = 0;

  return {
    eof: eof,
    read: read,
    readInt32: readInt32,
    readInt16: readInt16,
    readInt8: readInt8,
    readVarInt: readVarInt
  };

  function read(length) {
    var result = str.substr(position, length);
    position += length;
    return result;
  }

  // Read a big-endian 32-bit integer
  function readInt32() {
    var result =
      (str.charCodeAt(position) << 24) +
      (str.charCodeAt(position + 1) << 16) +
      (str.charCodeAt(position + 2) << 8) +
      (str.charCodeAt(position + 3));
    position += 4;
    return result;
  }

  // Read a big-endian 16-bit integer
  function readInt16() {
    var result =
      (str.charCodeAt(position) << 8) +
      (str.charCodeAt(position + 1));
    position += 2;
    return result;
  }

  // Read an 8-bit integer
  function readInt8(signed) {
    var result = str.charCodeAt(position);
    if (signed && result > 127) result -= 256;
    position += 1;
    return result;
  }

  function eof() {
    return position >= str.length;
  }

  // Read a MIDI-style variable-length integer
  // Big-endian value in groups of 7 bits,
  // with top bit set to signify that another byte follows
  function readVarInt() {
    var result = 0,
      b = readInt8();

    while (b & 0x80) {
      result += (b & 0x7f);
      result <<= 7;
      b = readInt8();
    }
    return result + b; // b is the last byte
  }
}

function parseMidiFile(data) {
  var lastEventTypeByte,
    stream = Stream(data),
    headerChunk = readChunk(stream),
    tracks = [],
    headerStream,
    formatType,
    trackCount,
    ticksPerBeat,
    i,
    trackChunk,
    trackStream,
    event;

  if (headerChunk.id !== 'MThd' || headerChunk.length !== 6) {
    throw 'Bad .mid file - header not found';
  }

  headerStream = Stream(headerChunk.data);
  formatType = headerStream.readInt16();
  trackCount = headerStream.readInt16();
  ticksPerBeat = headerStream.readInt16();

  if (ticksPerBeat & 0x8000) {
    throw 'Expressing time division in SMTPE frames is not supported yet';
  }

  for (i = 0; i < trackCount; i++) {
    tracks[i] = [];
    trackChunk = readChunk(stream);
    if (trackChunk.id !== 'MTrk') {
      throw 'Unexpected chunk - expected MTrk, got ' + trackChunk.id;
    }
    trackStream = Stream(trackChunk.data);
    while (!trackStream.eof()) {
      event = readEvent(trackStream);
      tracks[i].push(event);
    }
  }

  return {
    header: {
      formatType: formatType,
      trackCount: trackCount,
      ticksPerBeat: ticksPerBeat
    },
    tracks: tracks
  };

  function readChunk(stream) {
    var id = stream.read(4),
      length = stream.readInt32();

    return {
      id: id,
      length: length,
      data: stream.read(length)
    };
  }

  function readEvent(stream) {
    var event = { deltaTime: stream.readVarInt() },
      eventTypeByte = stream.readInt8(),
      length,
      hourByte,
      param1,
      eventType;

    if ((eventTypeByte & 0xf0) === 0xf0) {

      if (eventTypeByte === 0xff) { // Meta event
        event.type = 'meta';
        event.subtype = stream.readInt8();
        length = stream.readVarInt();
        switch (event.subtype) {
          case META_EVENT.COPYRIGHT_NOTICE:
          case META_EVENT.CUE_POINT:
          case META_EVENT.INSTRUMENT_NAME:
          case META_EVENT.LYRICS:
          case META_EVENT.MARKER:
          case META_EVENT.SEQUENCER_SPECIFIC:
          case META_EVENT.TEXT:
          case META_EVENT.TRACK_NAME:
            event.text = stream.read(length);
            return event;
          case META_EVENT.SEQUENCE_NUMBER:
            if (length !== 2) {
              throw 'Expected length for sequenceNumber event is 2, got ' + length;
            }
            event.number = stream.readInt16();
            return event;
          case META_EVENT.MIDI_CHANNEL_PREFIX:
            if (length !== 1) {
              throw 'Expected length for midiChannelPrefix event is 1, got ' + length;
            }
            event.channel = stream.readInt8();
            return event;
          case META_EVENT.END_OF_TRACK:
            if (length !== 0) {
              throw 'Expected length for endOfTrack event is 0, got ' + length;
            }
            return event;
          case META_EVENT.SET_TEMPO:
            if (length !== 3) {
              throw 'Expected length for setTempo event is 3, got ' + length;
            }
            event.microsecondsPerBeat = (
              (stream.readInt8() << 16)
              + (stream.readInt8() << 8)
              + stream.readInt8()
            );
            return event;
          case META_EVENT.SMPTE_OFFSET:
            if (length !== 5) {
              throw 'Expected length for smpteOffset event is 5, got ' + length;
            }
            hourByte = stream.readInt8();
            event.frameRate = {
              0x00: 24, 0x20: 25, 0x40: 29, 0x60: 30
            }[hourByte & 0x60];
            event.hour = hourByte & 0x1f;
            event.min = stream.readInt8();
            event.sec = stream.readInt8();
            event.frame = stream.readInt8();
            event.subframe = stream.readInt8();
            return event;
          case META_EVENT.TIME_SIGNATURE:
            if (length !== 4) {
              throw 'Expected length for timeSignature event is 4, got ' + length;
            }
            event.numerator = stream.readInt8();
            event.denominator = Math.pow(2, stream.readInt8());
            event.metronome = stream.readInt8();
            event.thirtyseconds = stream.readInt8();
            return event;
          case META_EVENT.KEY_SIGNATURE:
            if (length !== 2) {
              throw 'Expected length for keySignature event is 2, got ' + length;
            }
            event.key = stream.readInt8(true);
            event.scale = stream.readInt8();
            return event;
          default:
            event.subtype = 'unknown';
            event.data = stream.read(length);
            return event;
        }
      } else if (eventTypeByte === 0xf0) { // System event
        event.type = 'sysEx';
        length = stream.readVarInt();
        event.data = stream.read(length);
        return event;
      } else if (eventTypeByte === 0xf7) { // System event
        event.type = 'dividedSysEx';
        length = stream.readVarInt();
        event.data = stream.read(length);
        return event;
      }
      throw 'Unrecognised MIDI event type byte: ' + eventTypeByte;
    } else { // Channel event

      if ((eventTypeByte & 0x80) === 0) {

        // Running status - reuse lastEventTypeByte as the event type
        // eventTypeByte is actually the first parameter
        param1 = eventTypeByte;
        eventTypeByte = lastEventTypeByte;

      } else {
        param1 = stream.readInt8();
        lastEventTypeByte = eventTypeByte;
      }

      event.subtype = eventTypeByte & 0xf0;
      event.channel = eventTypeByte & 0x0f;
      event.type = 'channel';
      switch (event.subtype) {
        case EVENT.NOTE_OFF:
          event.noteNumber = param1;
          event.velocity = stream.readInt8();
          return event;
        case EVENT.NOTE_ON:
          event.noteNumber = param1;
          event.velocity = stream.readInt8();
          event.subtype = event.velocity === 0 ? EVENT.NOTE_OFF : EVENT.NOTE_ON;
          return event;
        case EVENT.AFTER_TOUCH:
          event.noteNumber = param1;
          event.amount = stream.readInt8();
          return event;
        case EVENT.CONTROL_CHANGE:
          event.controllerType = param1;
          event.value = stream.readInt8();
          return event;
        case EVENT.PROGRAM_CHANGE:
          event.programNumber = param1;
          return event;
        case EVENT.CHANNEL_AFTERTOUCH:
          event.amount = param1;
          return event;
        case EVENT.PITCH_BEND:
          event.value = param1 + (stream.readInt8() << 7);
          return event;
        default:
          throw 'Unrecognised MIDI event type: ' + eventType;
      }
    }
  }
}

/**
 *  Convert MIDI PPQ into Tone.js PPQ
 */
function ticksToToneTicks(tick, ticksPerBeat, PPQ$$1) {
  return (Math.round(tick / ticksPerBeat * PPQ$$1) || 0) + 'i';
}

/**
 *  Parse noteOn/Off from the tracks in midi JSON format into
 *  Tone.Score-friendly format.
 *  @param {Object} midiJson
 *  @param {Object} options The parsing options
 *  @return {Object}
 */
function parseParts(midiJson, options) {
  options = Object.assign({
    deterministic: false,
    duration: true,
    noteName: true,
    PPQ: PPQ
  }, options);

  return midiJson.tracks.reduce(convertTracksDeltaTimeToDuration, []);

  function convertTracksDeltaTimeToDuration(result, track) {
    var currentTime = 0,
      pedal = false;

    track =
      track
        .reduce(convertDeltaTimeToDuration, [])
        .filter(simulateousNote);

    if (options.duration) {
      track = track.map(convertTicks);
    }

    if (options.deterministic) {
      track = track.sort(compareTime$1);
    }

    if (track.length === 0) {
      return result;
    }

    return result.concat([track]);

    function convertTicks(e) {
      e.time = ticksToToneTicks(e.time, midiJson.header.ticksPerBeat, options.PPQ);
      e.duration = ticksToToneTicks(e.duration, midiJson.header.ticksPerBeat, options.PPQ);
      return e;
    }

    function simulateousNote(event, index, array) {
      return !array.find(e => e !== event && e.midiNote === event.midiNote && e.time === event.time && e.duration > event.duration);
    }

    function convertDeltaTimeToDuration(result, event) {
      var note,
        prevNote;

      currentTime += event.deltaTime;

      switch (true) {

        case event.subtype === EVENT.NOTE_ON:
          prevNote = result.filter(e => e.midiNote === event.noteNumber && typeof e.duration === 'undefined').pop();

          if (prevNote) {
            prevNote.duration = currentTime - prevNote.time;
          }

          note = {
            time: currentTime,
            midiNote: event.noteNumber,
            velocity: event.velocity / 127
          };

          if (options.noteName) {
            note.noteName = noteFromMidiPitch(event.noteNumber);
          }

          return result.concat(note);

        case event.subtype === EVENT.NOTE_OFF:
          prevNote = result.filter(e => e.midiNote === event.noteNumber && typeof e.duration === 'undefined').pop();

          if (prevNote) {
            prevNote.duration = currentTime - prevNote.time;
          }

          return result;

        case event.controllerType === EVENT.CONTROLLER.DAMPER_PEDAL && event.value >= 64 && !pedal:
          note = {
            eventName: 'sustain',
            time: currentTime
          };
          pedal = true;
          return result.concat(note);

        case event.controllerType === EVENT.CONTROLLER.DAMPER_PEDAL && event.value < 64 && pedal:
          prevNote = result.filter(e => e.eventName === 'sustain' && typeof e.duration === 'undefined').pop();

          if (prevNote) {
            prevNote.duration = currentTime - prevNote.time;
          }

          pedal = false;
          return result;

        default:
          return result;
      }
    }
  }
}

function compareTime$1(a, b) {
  var time = parseInt(a.time) - parseInt(b.time),
    midiNote = a.midiNote && b.midiNote && a.midiNote - b.midiNote,
    duration = parseInt(b.duration) - parseInt(a.duration),
    velocity = b.velocity - a.velocity;
  return time || midiNote || duration || velocity;
}

/**
 *  Parse tempo and time signature from the midiJson
 *  @param {Object} midiJson
 *  @return {Object}
 */
function parseTransport(midiJson) {
  var flattenedEvents = midiJson.tracks.reduce(flatten, []),
    instruments = midiJson.tracks.reduce(getInstruments, {}),
    trackNames = midiJson.tracks.reduce(getTrackNames, {});

  return {
    bpm: getTempo(flattenedEvents),
    instruments: toArray(instruments),
    timeSignature: getTimeSignature(flattenedEvents),
    trackNames: toArray(trackNames)
  };
}

function getTrackNames(result, track, index) {
  var event = track.filter(e => e.subtype === META_EVENT.TRACK_NAME).pop(),
    hasNote = track.filter(e => e.subtype === EVENT.NOTE_ON).length;

  if (event && hasNote) {
    result[index] = event.text.replace(/\u0000/g, ''); // Ableton Live adds an additional character to the track name
  }

  return result;
}

function getInstruments(result, track) {
  var event = track.filter(e => e.subtype === EVENT.PROGRAM_CHANGE).pop();

  if (event) {
    result[event.channel] = event.channel === 9 ? 0 : event.programNumber + 1;
  }

  return result;
}

function getTimeSignature(events) {
  var event = events.filter(e => e.subtype === META_EVENT.TIME_SIGNATURE).pop();
  return event ? [event.numerator, event.denominator] : null;
}

function getTempo(events) {
  var event = events.filter(e => e.subtype === META_EVENT.SET_TEMPO).pop();
  return event ? 60000000 / event.microsecondsPerBeat : null;
}

/**
 *  Convert a midi file to a Tone.Part-friendly JSON representation
 *  @param {Blob} fileBlob The output from fs.readFile or FileReader
 *  @param {Object} options The parsing options
 *  @return {Object} A Tone.js-friendly object which can be consumed by Tone.Part
 */
function parse$1(fileBlob, options) {
  var midiJson = parseMidiFile(fileBlob);

  if (midiJson.header.formatType === 0) {
    midiJson.tracks = splitType0(midiJson.tracks[0]);
  }

  return {
    parts: parseParts(midiJson, options),
    transport: parseTransport(midiJson)
  };
}

function splitType0(track) {
  var absoluteTime = 0,
    tracksMap = track.reduce(groupByChannel, {});

  return toArray(tracksMap);

  function groupByChannel(result, event) {
    var channel = event.channel || 0,
      prevEvent;

    result[channel] = result[channel] || [];
    prevEvent = result[channel][result[channel].length - 1];
    result[channel].push(event);

    absoluteTime += event.deltaTime;
    event.absoluteTime = absoluteTime;

    event.deltaTime = prevEvent ?
      event.absoluteTime - prevEvent.absoluteTime :
      event.absoluteTime;

    return result;
  }
}

exports.generate = generate;
exports.parse = parse$1;
exports.File = File;
exports.bpmFromMpqn = bpmFromMpqn;
exports.codes2Str = codes2Str;
exports.ensureMidiPitch = ensureMidiPitch;
exports.midiPitchFromNote = midiPitchFromNote;
exports.mpqnFromBpm = mpqnFromBpm;
exports.noteFromMidiPitch = noteFromMidiPitch;
exports.secondsToTicks = secondsToTicks;
exports.str2Bytes = str2Bytes;
exports.ticksToSeconds = ticksToSeconds;
exports.translateTickTime = translateTickTime;
exports.midiFlattenedNotes = midiFlattenedNotes;
exports.midiLetterPitches = midiLetterPitches;
exports.midiPitchesLetter = midiPitchesLetter;

Object.defineProperty(exports, '__esModule', { value: true });

})));
