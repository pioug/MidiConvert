import { EVENT } from './Constants.js';
import { translateTickTime } from './MidiUtil.js';

export { MidiEvent };

/**
 * Construct a MIDI event.
 * Parameters include:
 *  - time [optional number] - Ticks since previous event.
 *  - type [required number] - Type of event.
 *  - channel [required number] - Channel for the event.
 *  - param1 [required number] - First event parameter.
 *  - param2 [optional number] - Second event parameter.
 */
function MidiEvent({ time, type, channel, param1, param2 }) {

  if (type < EVENT.NOTE_OFF || type > EVENT.PITCH_BEND) {
    throw new Error('Trying to set an unknown event: ' + type);
  }

  if (channel < 0 || channel > 15) {
    throw new Error('Channel is out of bounds.');
  }

  time = translateTickTime(time || 0);

  return { toBytes };

  /**
   * Serialize the event to an array of bytes.
   * @returns {Array} The array of serialized bytes.
   */
  function toBytes() {
    var byteArray = [],
      typeChannelByte = type | (channel & 0xF);

    byteArray.push.apply(byteArray, time);
    byteArray.push(typeChannelByte);
    byteArray.push(param1);

    // Some events don't have a second parameter
    if (typeof param2 !== 'undefined' && param2 !== null) {
      byteArray.push(param2);
    }
    return byteArray;
  }
}
