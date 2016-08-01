import { flatten, toArray } from './Util.js';

export default parseTransport;

/**
 *  Parse tempo and time signature from the midiJson
 *  @param {Object} midiJson
 *  @return {Object}
 */
function parseTransport(midiJson) {
  var flattenedEvents = midiJson.tracks.reduce(flatten, []),
    instruments = midiJson.tracks.reduce(getInstruments, {
      _instrumentsMap: {},
      instrumentsMap: {}
    });

  return {
    _instruments: toArray(instruments._instrumentsMap),
    bpm: getTempo(flattenedEvents),
    instruments: toArray(instruments.instrumentsMap),
    timeSignature: getTimeSignature(flattenedEvents)
  };
}

function getInstruments(result, track) {
  var event = track.filter(e => e.subtype === 'programChange').pop();

  if (event) {
    result.instrumentsMap[event.channel] = event.channel === 9 ? 0 : event.programNumber + 1;
    result._instrumentsMap[event.channel] = event.channel === 9 ? 'percussion' : event.programNumber;
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
