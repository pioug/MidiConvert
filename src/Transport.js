export default parseTransport;

/**
 *  Parse tempo and time signature from the midiJson
 *  @param {Object} midiJson
 *  @return {Object}
 */
function parseTransport(midiJson) {
  var ret = {
      instruments: []
    },
    instrumentsMap = {},
    track,
    i,
    j,
    datum;

  for (i = 0; i < midiJson.tracks.length; i++) {
    track = midiJson.tracks[i];
    for (j = 0; j < track.length; j++) {
      datum = track[j];
      if (datum.type === 'meta') {
        if (datum.subtype === 'timeSignature') {
          ret.timeSignature = [datum.numerator, datum.denominator];
        } else if (datum.subtype === 'setTempo') {
          ret.bpm = 60000000 / datum.microsecondsPerBeat;
        }
      } else if (datum.type === 'channel') {
        if (datum.subtype === 'programChange') {
          instrumentsMap[datum.channel] = datum.channel === 9 ? 0 : datum.programNumber + 1;
        }
      }
    }
  }

  for (track in instrumentsMap) {
    if (instrumentsMap.hasOwnProperty(track)) {
      ret.instruments.push(instrumentsMap[track]);
    }
  }

  return ret;
}
