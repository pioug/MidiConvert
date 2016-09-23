import { EVENT, PPQ } from './Constants.js';
import { noteFromMidiPitch } from './MidiUtil.js';

export default parseParts;

/**
 *  Convert MIDI PPQ into Tone.js PPQ
 */
function ticksToToneTicks(tick, ticksPerBeat, PPQ) {
  return (Math.round(tick / ticksPerBeat * PPQ) || 0) + 'i';
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

    track =
      track
        .reduce(convertDeltaTimeToDuration, [])
        .filter(simulateousNote);

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

    function simulateousNote(event, index, array) {
      return !array.find(e => e !== event && e.midiNote === event.midiNote && e.time === event.time && e.duration > event.duration);
    }

    function convertDeltaTimeToDuration(result, event) {
      var note,
        prevNote;

      currentTime += event.deltaTime;

      switch (true) {

        case event.subtype === EVENT.NOTE_ON:
          prevNote = result.filter(e => e.midiNote === event.noteNumber && typeof e.duration === 'undefined').pop();

          if (prevNote) {
            prevNote.duration = currentTime - prevNote.time;
          }

          note = {
            time: currentTime,
            midiNote: event.noteNumber,
            velocity: event.velocity / 127
          };

          if (options.noteName) {
            note.noteName = noteFromMidiPitch(event.noteNumber);
          }

          return result.concat(note);

        case event.subtype === EVENT.NOTE_OFF:
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
