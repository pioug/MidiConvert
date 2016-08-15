import { EVENT, META_EVENT } from './Constants.js';
import { flatten, toArray } from './Util.js';

export default parseTransport;

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
