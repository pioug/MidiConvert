import { toArray } from './Util.js';

export default parseTransport;

/**
 *  Parse tempo and time signature from the midiJson
 *  @param {Object} midiJson
 *  @return {Object}
 */
function parseTransport(midiJson) {
  var ret = {},
    instrumentsMap = {},
    _instrumentsMap = {},
    track,
    i,
    j,
    event;

  for (i = 0; i < midiJson.tracks.length; i++) {
    track = midiJson.tracks[i];
    for (j = 0; j < track.length; j++) {
      event = track[j];
      if (event.type === 'meta') {
        if (event.subtype === 'timeSignature') {
          ret.timeSignature = [event.numerator, event.denominator];
        } else if (event.subtype === 'setTempo') {
          ret.bpm = 60000000 / event.microsecondsPerBeat;
        }
      } else if (event.type === 'channel') {
        if (event.subtype === 'programChange') {
          instrumentsMap[event.channel] = event.channel === 9 ? 0 : event.programNumber + 1;
          _instrumentsMap[event.channel] = event.channel === 9 ? 'percussion' : event.programNumber;
        }
      }
    }
  }

  ret.instruments = toArray(instrumentsMap);
  ret._instruments = toArray(_instrumentsMap);
  return ret;
}
