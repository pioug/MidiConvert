import { EVENT, PPQ } from './Constants.js';
import { noteFromMidiPitch } from './MidiGenUtil.js';
import { toArray } from './Util.js';

export default parseParts;

/**
 *  Convert MIDI PPQ into Tone.js PPQ
 */
function ticksToToneTicks(tick, ticksPerBeat, PPQ) {
  return Math.round(tick / ticksPerBeat * PPQ) + 'i';
}

/**
 *  Permute noteOff happening after noteOn (of the same note) without delta time.
 *  @param {Array} track Array of MIDI events
 *  @returns {Array} Sorted MIDI events
 */
function permuteImplicitNoteOff(result, event, index, events) {
  var prevEvent = events[index - 1];

  if (index > 0 && event.deltaTime === 0 && event.subtype === 'noteOff' && prevEvent.subtype === 'noteOn' && event.noteNumber === prevEvent.noteNumber) {
    event.deltaTime = prevEvent.deltaTime;
    prevEvent.deltaTime = 0;

    events[index] = prevEvent;
    events[index - 1] = event;
  }

  return events;
}

/**
 *  Look for consecutive 'noteOn' to decide if permutation is necessary
 *  @param {Array} track Array of MIDI events
 *  @returns {Boolean} true if consecutive 'noteOn' detected
 */
function hasConsecutiveNoteOnForSamePitch(track) {
  return toArray(track.reduce(groupByNote, {})).some(hasConsecutiveNoteOn);
}

function groupByNote(result, event) {
  result[event.noteNumber] = result[event.noteNumber] || [];
  result[event.noteNumber].push(event);
  return result;
}

function hasConsecutiveNoteOn(noteEvents) {
  return noteEvents.some((e, index, array) => index > 0 && e.subtype === 'noteOn' && e.subtype === array[index - 1].subtype);
}

/**
 *  Parse noteOn/Off from the tracks in midi JSON format into
 *  Tone.Score-friendly format.
 *  @param {Object} midiJson
 *  @param {Object} options The parsing options
 *  @return {Object}
 */
function parseParts(midiJson, options) {
  options = Object.assign({
    deterministic: false,
    duration: true,
    noteName: true,
    PPQ: PPQ
  }, options);

  return midiJson.tracks.reduce(convertTracksDeltaTimeToDuration, []);

  function convertTracksDeltaTimeToDuration(result, track) {
    var currentTime = 0,
      pedal = false;

    if (options.duration && hasConsecutiveNoteOnForSamePitch(track)) {
      track = track.reduce(permuteImplicitNoteOff);
    }

    track = track.reduce(convertDeltaTimeToDuration, []);

    if (options.duration) {
      track = track.map(convertTicks);
    }

    if (options.deterministic) {
      track = track.sort(compareTime);
    }

    if (track.length === 0) {
      return result;
    }

    return result.concat([track]);

    function convertTicks(e) {
      e.time = ticksToToneTicks(e.time, midiJson.header.ticksPerBeat, options.PPQ);
      e.duration = ticksToToneTicks(e.duration, midiJson.header.ticksPerBeat, options.PPQ);
      return e;
    }

    function convertDeltaTimeToDuration(result, event) {
      var note,
        prevNote;

      currentTime += event.deltaTime;

      switch (true) {

        case event.subtype === 'noteOn':
          note = {
            midiNote: event.noteNumber,
            time: currentTime,
            velocity: event.velocity / 127
          };

          if (options.noteName) {
            note.noteName = noteFromMidiPitch(event.noteNumber);
          }

          return result.concat(note);

        case event.subtype === 'noteOff':
          prevNote = result.filter(e => e.midiNote === event.noteNumber && typeof e.duration === 'undefined').pop();

          if (prevNote) {
            prevNote.duration = currentTime - prevNote.time;
          }

          return result;

        case event.controllerType === EVENT.CONTROLLER.DAMPER_PEDAL && event.value >= 64 && !pedal:
          note = {
            eventName: 'sustain',
            time: currentTime
          };
          pedal = true;
          return result.concat(note);

        case event.controllerType === EVENT.CONTROLLER.DAMPER_PEDAL && event.value < 64 && pedal:
          prevNote = result.filter(e => e.eventName === 'sustain' && typeof e.duration === 'undefined').pop();

          if (prevNote) {
            prevNote.duration = currentTime - prevNote.time;
          }

          pedal = false;
          return result;

        default:
          return result;
      }
    }
  }
}

function compareTime(a, b) {
  var time = parseInt(a.time) - parseInt(b.time),
    midiNote = a.midiNote && b.midiNote && a.midiNote - b.midiNote,
    duration = parseInt(b.duration) - parseInt(a.duration),
    velocity = b.velocity - a.velocity;
  return time || midiNote || duration || velocity;
}
