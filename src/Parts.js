import { EVENT, PPQ } from './Constants.js';
import { noteFromMidiPitch } from './MidiGenUtil.js';
import { toArray } from './Util.js';

export default parseParts;

/**
 *  Convert MIDI PPQ into Tone.js PPQ
 */
function ticksToToneTicks(tick, ticksPerBeat, PPQ) {
  return Math.round((tick / ticksPerBeat) * PPQ) + 'i';
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
  var ticksPerBeat = midiJson.header.ticksPerBeat,
    output = [],
    pedal = false,
    track,
    trackNotes,
    currentTime,
    i,
    j,
    k,
    evnt,
    noteObj,
    trackNote,
    trackName,
    obj;

  options = Object.assign({
    deterministic: false,
    duration: true,
    noteName: true,
    PPQ: PPQ,
    velocity: true
  }, options);

  for (i = 0; i < midiJson.tracks.length; i++) {
    track = midiJson.tracks[i];
    trackNotes = [];
    currentTime = 0;

    if (options.duration && hasConsecutiveNoteOnForSamePitch(track)) {
      track = track.reduce(permuteImplicitNoteOff);
    }

    for (j = 0; j < track.length; j++) {
      evnt = track[j];
      currentTime += evnt.deltaTime;

      if (evnt.subtype === 'noteOn') {
        noteObj = {
          _note: evnt.noteNumber,
          _ticks: currentTime,
          midiNote: evnt.noteNumber,
          time: currentTime
        };

        if (options.noteName) {
          noteObj.noteName = noteFromMidiPitch(evnt.noteNumber);
        }

        if (options.velocity) {
          noteObj.velocity = evnt.velocity / 127;
        }

        trackNotes.push(noteObj);
      } else if (evnt.subtype === 'noteOff') {

        // Add the duration
        for (k = trackNotes.length - 1; k >= 0; k--) {
          trackNote = trackNotes[k];
          if (trackNote._note === evnt.noteNumber && typeof trackNote.duration === 'undefined') {
            if (options.duration) {
              trackNote.duration = ticksToToneTicks(currentTime - trackNote._ticks, ticksPerBeat, options.PPQ);
            }
            trackNote.time = ticksToToneTicks(trackNote.time, ticksPerBeat, options.PPQ);
            delete trackNote._note;
            delete trackNote._ticks;
            break;
          }
        }
      } else if (evnt.type === 'meta' && evnt.subtype === 'trackName') {
        trackName = evnt.text;

        // Ableton Live adds an additional character to the track name
        trackName = trackName.replace(/\u0000/g, '');

      } else if (evnt.controllerType === EVENT.CONTROLLER.DAMPER_PEDAL) {
        if (evnt.value >= 64 && !pedal) {
          obj = {
            _ticks: currentTime,
            eventName: 'sustain',
            time: currentTime
          };
          pedal = true;
          trackNotes.push(obj);
        } else if (evnt.value < 64 && pedal) {
          for (k = trackNotes.length - 1; k >= 0; k--) {
            trackNote = trackNotes[k];
            if (trackNote.eventName === 'sustain' && typeof trackNote.duration === 'undefined') {
              if (options.duration) {
                trackNote.duration = ticksToToneTicks(currentTime - trackNote._ticks, ticksPerBeat, options.PPQ);
              }
              trackNote.time = ticksToToneTicks(trackNote.time, ticksPerBeat, options.PPQ);
              delete trackNote._note;
              delete trackNote._ticks;
              break;
            }
          }
          pedal = false;
        }
      }
    }

    if (options.deterministic) {
      trackNotes = trackNotes.sort(compareTime);
    }

    if (trackNotes.length > 0) {
      output.push(trackNotes);
    }
  }
  return output;
}

function compareTime(a, b) {
  var time = parseInt(a.time) - parseInt(b.time),
    midiNote = a.midiNote && b.midiNote && a.midiNote - b.midiNote,
    duration = parseInt(b.duration) - parseInt(a.duration),
    velocity = b.velocity - a.velocity;
  return time || midiNote || duration || velocity;
}
