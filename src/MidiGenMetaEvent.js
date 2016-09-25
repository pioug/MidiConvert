import { translateTickTime } from './MidiUtil.js';

export { MetaEvent };

/**
 *
 * Parameters include:
 *  - time [optional number] - Ticks since previous event.
 *  - type [required number] - Type of event.
 *  - data [optional array|string] - Event data.
 */
var MetaEvent = function({ time, type, data }) {
  time = translateTickTime(time || 0);

  return { toBytes };

  /**
   * Serialize the event to an array of bytes.
   * @returns {Array} The array of serialized bytes.
   */
  function toBytes() {
    if (!type) {
      throw new Error('Type for meta-event not specified.');
    }

    var byteArray = [],
      dataBytes;
    byteArray.push.apply(byteArray, time);
    byteArray.push(0xFF, type);

    // If data is an array, we assume that it contains several bytes.
    // We append them to byteArray.
    if (Array.isArray(data)) {
      byteArray.push(data.length);
      byteArray.push.apply(byteArray, data);
    } else if (typeof data === 'number') {
      byteArray.push(1, data);
    } else if (data !== null && typeof data !== 'undefined') {
      // Assume string, it may be a bad assumption
      byteArray.push(data.length);
      dataBytes = data.split('').map(function(x) {
        return x.charCodeAt(0);
      });
      byteArray.push.apply(byteArray, dataBytes);
    } else {
      byteArray.push(0);
    }

    return byteArray;
  }
};
