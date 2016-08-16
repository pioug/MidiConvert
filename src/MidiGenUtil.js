import { midiFlattenedNotes, midiLetterPitches, midiPitchesLetter, PPQ } from './Constants.js';

export {
  bpmFromMpqn,
  codes2Str,
  ensureMidiPitch,
  midiPitchFromNote,
  mpqnFromBpm,
  noteFromMidiPitch,
  secondsToTicks,
  str2Bytes,
  ticksToSeconds,
  translateTickTime,
};

/**
 * Convert a symbolic note name (e.g. 'c4') to a numeric MIDI pitch (e.g.
 * 60, middle C).
 *
 * @param {string} n - The symbolic note name to parse.
 * @returns {number} The MIDI pitch that corresponds to the symbolic note
 * name.
 */
function midiPitchFromNote(n) {
  var matches = /([A-G])(#+|b+)?([0-9]+)$/i.exec(n),
    note = matches[1].toUpperCase(),
    accidental = matches[2] || '',
    octave = parseInt(matches[3], 10);

  return (12 * octave) + midiLetterPitches[note] + (accidental.substr(0, 1) === '#' ? 1 : -1) * accidental.length;
}

/**
 * Ensure that the given argument is converted to a MIDI pitch. Note that
 * it may already be one (including a purely numeric string).
 *
 * @param {string|number} p - The pitch to convert.
 * @returns {number} The resulting numeric MIDI pitch.
 */
function ensureMidiPitch(p) {
  if (typeof p === 'number' || !/[^0-9]/.test(p)) {
    // numeric pitch
    return parseInt(p, 10);
  } else {
    // assume it's a note name
    return midiPitchFromNote(p);
  }
}

/**
 * Convert a numeric MIDI pitch value (e.g. 60) to a symbolic note name
 * (e.g. 'c4').
 *
 * @param {number} n - The numeric MIDI pitch value to convert.
 * @param {boolean} [returnFlattened=false] - Whether to prefer flattened
 * notes to sharpened ones. Optional, default false.
 * @returns {string} The resulting symbolic note name.
 */
function noteFromMidiPitch(n, returnFlattened) {
  var octave = 0,
    noteNum = n,
    noteName;

  returnFlattened = returnFlattened || false;

  if (n > 23) {
    // noteNum is on octave 1 or more
    octave = Math.floor(n / 12) - 1;
    // subtract number of octaves from noteNum
    noteNum = n - octave * 12;
  }

  // get note name (c#, d, f# etc)
  noteName = midiPitchesLetter[noteNum];
  // Use flattened notes if requested (e.g. f# should be output as gb)
  if (returnFlattened && noteName.indexOf('#') > 0) {
    noteName = midiFlattenedNotes[noteName];
  }
  return noteName + octave;
}

/**
 * Convert beats per minute (BPM) to microseconds per quarter note (MPQN).
 *
 * @param {number} bpm - A number in beats per minute.
 * @returns {number} The number of microseconds per quarter note.
 */
function mpqnFromBpm(bpm) {
  var mpqn = Math.floor(60000000 / bpm),
    ret = [];

  do {
    ret.unshift(mpqn & 0xFF);
    mpqn >>= 8;
  } while (mpqn);
  while (ret.length < 3) {
    ret.push(0);
  }
  return ret;
}

/**
 * Convert microseconds per quarter note (MPQN) to beats per minute (BPM).
 *
 * @param {number} mpqn - The number of microseconds per quarter note.
 * @returns {number} A number in beats per minute.
 */
function bpmFromMpqn(mpqn) {
  return Math.floor(60000000 / mpqn);
}

/**
 * Converts an array of bytes to a string of hexadecimal characters. Prepares
 * it to be converted into a base64 string.
 *
 * @param {Array} byteArray - Array of bytes to be converted.
 * @returns {string} Hexadecimal string, e.g. '097B8A'.
 */
function codes2Str(byteArray) {
  return String.fromCharCode.apply(null, byteArray);
}

/**
 * Converts a string of hexadecimal values to an array of bytes. It can also
 * add remaining '0' nibbles in order to have enough bytes in the array as the
 * `finalBytes` parameter.
 *
 * @param {string} str - string of hexadecimal values e.g. '097B8A'
 * @param {number} [finalBytes] - Optional. The desired number of bytes
 * (not nibbles) that the returned array should contain.
 * @returns {Array} An array of nibbles.
 */
function str2Bytes(str, finalBytes) {
  if (finalBytes) {
    while ((str.length / 2) < finalBytes) { str = '0' + str; }
  }

  var bytes = [],
    chars,
    i;

  for (i = str.length - 1; i >= 0; i = i - 2) {
    chars = i === 0 ? str[i] : str[i - 1] + str[i];
    bytes.unshift(parseInt(chars, 16));
  }

  return bytes;
}

/**
 * Translates number of ticks to MIDI timestamp format, returning an array
 * of bytes with the time values. MIDI has a very particular way to express
 * time; take a good look at the spec before ever touching this function.
 *
 * @param {number} ticks - Number of ticks to be translated.
 * @returns {number} Array of bytes that form the MIDI time value.
 */
function translateTickTime(ticks) {
  var buffer = ticks & 0x7F,
    cond = true,
    bList = [];

  ticks = ticks >> 7;
  while (ticks) {
    buffer <<= 8;
    buffer |= ((ticks & 0x7F) | 0x80);
    ticks = ticks >> 7;
  }

  while (cond) {
    bList.push(buffer & 0xff);

    if (buffer & 0x80) {
      buffer >>= 8;
    } else {
      cond = false;
    }
  }
  return bList;
}

/**
 * @param {number} ticks - Number of ticks
 * @param {number} bpm - BPM of MIDI score
 * @param {number=} ppq - PPQ used when parsing MIDI file
 * @returns {number} Number of seconds
 */
function ticksToSeconds(ticks, bpm, ppq = PPQ) {
  return 60 / bpm * ticks / ppq;
}

/**
 * Ticks are rounded up to prevent notes from being filtered out
 * if the beginning of the MIDI is cut (in a DAW for example)
 * @param {number} seconds - Number of seconds
 * @param {number} bpm - BPM of MIDI score
 * @param {number=} ppq - PPQ used when parsing MIDI file
 * @returns {number} Number of ticks
 */
function secondsToTicks(seconds, bpm, ppq = PPQ) {
  return Math.ceil(seconds / 60 * bpm * ppq);
}
