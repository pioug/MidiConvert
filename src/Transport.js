import { flatten, toArray } from './Util.js';

export default parseTransport;

/**
 *  Parse tempo and time signature from the midiJson
 *  @param {Object} midiJson
 *  @return {Object}
 */
function parseTransport(midiJson) {
  var flattenedEvents = midiJson.tracks.reduce(flatten, []),
    instruments = midiJson.tracks.reduce(getInstruments, {});

  return {
    bpm: getTempo(flattenedEvents),
    instruments: toArray(instruments),
    timeSignature: getTimeSignature(flattenedEvents)
  };
}

function getInstruments(result, track) {
  var event = track.filter(e => e.subtype === 'programChange').pop();

  if (event) {
    result[event.channel] = event.channel === 9 ? 0 : event.programNumber + 1;
  }

  return result;
}

function getTimeSignature(events) {
  var event = events.filter(e => e.subtype === 'timeSignature').pop();
  return event ? [event.numerator, event.denominator] : null;
}

function getTempo(events) {
  var event = events.filter(e => e.subtype === 'setTempo').pop();
  return event ? 60000000 / event.microsecondsPerBeat : null;
}
