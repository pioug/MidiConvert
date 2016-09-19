import { MetaEvent } from './MidiGenMetaEvent.js';
import { MidiEvent } from './MidiGenEvent.js';

import {
  EVENT,
  META_EVENT,
  THIRTY_SECOND_NOTES_PER_QUARTER_NOTE,
  TICKS_PER_CLICK
} from './Constants.js';

import { ensureMidiPitch, mpqnFromBpm, str2Bytes } from './MidiUtil.js';

var DEFAULT_VOLUME = 90,
  Track;

/**
 * Construct a MIDI track.
 *
 * Parameters include:
 *  - events [optional array] - Array of events for the track.
 */
Track = function(config) {
  if (!this) return new Track(config);
  var c = config || {};
  this.events = c.events || [];
};

Track.START_BYTES = [0x4d, 0x54, 0x72, 0x6b];
Track.END_BYTES = [0x00, 0xFF, 0x2F, 0x00];

/**
 * Add an event to the track.
 *
 * @param {MidiEvent|MetaEvent} event - The event to add.
 * @returns {Track} The current track.
 */
Track.prototype.addEvent = function(event) {
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
Track.prototype.addNoteOn = function(channel, pitch, time, velocity) {
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
Track.prototype.addNoteOff = function(channel, pitch, time, velocity) {
  this.events.push(new MidiEvent({
    type: EVENT.NOTE_OFF,
    channel: channel,
    param1: ensureMidiPitch(pitch),
    param2: velocity || DEFAULT_VOLUME,
    time: time || 0
  }));
  return this;
};

Track.prototype.addSustainOn = function(channel, time) {
  this.events.push(new MidiEvent({
    type: EVENT.CONTROL_CHANGE,
    channel: channel,
    param1: EVENT.CONTROLLER.DAMPER_PEDAL,
    param2: 127,
    time: time || 0
  }));
  return this;
};

Track.prototype.addSustainOff = function(channel, time) {
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
Track.prototype.addNote = function(channel, pitch, dur, time, velocity) {
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
Track.prototype.addChord = function(channel, chord, dur, velocity) {
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
Track.prototype.setInstrument = function(channel, instrument, time) {
  this.events.push(new MidiEvent({
    type: EVENT.PROGRAM_CHANGE,
    channel: channel,
    param1: instrument,
    time: time || 0
  }));
  return this;
};

Track.prototype.setTimeSignature = function(numerator, denominator, time) {
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
Track.prototype.setTempo = function(bpm, time) {
  this.events.push(new MetaEvent({
    type: META_EVENT.SET_TEMPO,
    data: mpqnFromBpm(bpm),
    time: time || 0
  }));
  return this;
};

Track.prototype.setName = function(name, time) {
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
Track.prototype.toBytes = function() {
  var trackLength = 0,
    eventBytes = [],
    lengthBytes,
    startBytes = Track.START_BYTES,
    endBytes = Track.END_BYTES;

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

export { Track };
