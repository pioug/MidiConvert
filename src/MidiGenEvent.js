import { EVENT } from './Constants.js';
import { translateTickTime } from './MidiUtil.js';

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

export { MidiEvent };
