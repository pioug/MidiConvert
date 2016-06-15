var CONTROL_CHANGE_SUSTAIN_PEDAL = 64;

export default parseParts;

/**
 *  Convert a MIDI number to scientific pitch notation
 *  @param {Number} midi The MIDI note number
 *  @returns {String} The note in scientific pitch notation
 */
function midiToNote(midi) {
  var scaleIndexToNote = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'],
    octave = Math.floor(midi / 12) - 1,
    note = midi % 12;
  return scaleIndexToNote[note] + octave;
}

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
function permuteImplicitNoteOff(track) {
  var events = track.slice(),
    i,
    event,
    prevEvent,
    tmp;

  for (i = 1; i < events.length - 1; i++) {
    event = events[i];
    prevEvent = events[i - 1];

    if (event.deltaTime === 0 && event.subtype === 'noteOff' && prevEvent.subtype === 'noteOn' && event.noteNumber === prevEvent.noteNumber) {
      tmp = event.deltaTime;
      event.deltaTime = prevEvent.deltaTime;
      prevEvent.deltaTime = tmp;

      events[i] = prevEvent;
      events[i - 1] = event;
    }
  }

  return events;
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

  options = options || {};
  options.PPQ = typeof options.PPQ === 'undefined' ? 192 : options.PPQ;
  options.noteName = typeof options.noteName === 'undefined' ? true : options.noteName;
  options.duration = typeof options.duration === 'undefined' ? true : options.duration;
  options.velocity = typeof options.velocity === 'undefined' ? true : options.velocity;

  for (i = 0; i < midiJson.tracks.length; i++) {
    track = midiJson.tracks[i];
    trackNotes = [];
    currentTime = 0;

    if (options.duration) {
      track = permuteImplicitNoteOff(track);
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
          noteObj.noteName = midiToNote(evnt.noteNumber);
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

      } else if (evnt.controllerType === CONTROL_CHANGE_SUSTAIN_PEDAL) {
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
    if (trackNotes.length > 0) {
      output.push(trackNotes);
    }
  }
  return output;
}
