import { translateTickTime } from './MidiUtil.js';

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

export { MetaEvent };
