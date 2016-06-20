(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global.MidiConvert = factory());
}(this, function () { 'use strict';

  /* Wrapper for accessing strings through sequential reads */
  function Stream(str) {
    var position = 0;

    return {
      eof: eof,
      read: read,
      readInt32: readInt32,
      readInt16: readInt16,
      readInt8: readInt8,
      readVarInt: readVarInt
    };

    function read(length) {
      var result = str.substr(position, length);
      position += length;
      return result;
    }

    // Read a big-endian 32-bit integer
    function readInt32() {
      var result =
        (str.charCodeAt(position) << 24) +
        (str.charCodeAt(position + 1) << 16) +
        (str.charCodeAt(position + 2) << 8) +
        (str.charCodeAt(position + 3));
      position += 4;
      return result;
    }

    // Read a big-endian 16-bit integer
    function readInt16() {
      var result =
        (str.charCodeAt(position) << 8) +
        (str.charCodeAt(position + 1));
      position += 2;
      return result;
    }

    // Read an 8-bit integer
    function readInt8(signed) {
      var result = str.charCodeAt(position);
      if (signed && result > 127) result -= 256;
      position += 1;
      return result;
    }

    function eof() {
      return position >= str.length;
    }

    // Read a MIDI-style variable-length integer
    // Big-endian value in groups of 7 bits,
    // with top bit set to signify that another byte follows
    function readVarInt() {
      var result = 0,
        b = readInt8();

      while (b & 0x80) {
        result += (b & 0x7f);
        result <<= 7;
        b = readInt8();
      }
      return result + b; // b is the last byte
    }
  }

  function MidiFile(data) {
    var lastEventTypeByte,
      stream = Stream(data),
      headerChunk = readChunk(stream),
      tracks = [],
      headerStream,
      formatType,
      trackCount,
      ticksPerBeat,
      header,
      i,
      trackChunk,
      trackStream,
      event;

    if (headerChunk.id !== 'MThd' || headerChunk.length !== 6) {
      throw 'Bad .mid file - header not found';
    }

    headerStream = Stream(headerChunk.data);
    formatType = headerStream.readInt16();
    trackCount = headerStream.readInt16();
    ticksPerBeat = headerStream.readInt16();

    if (ticksPerBeat & 0x8000) {
      throw 'Expressing time division in SMTPE frames is not supported yet';
    }

    header = {
      formatType: formatType,
      trackCount: trackCount,
      ticksPerBeat: ticksPerBeat
    };

    for (i = 0; i < header.trackCount; i++) {
      tracks[i] = [];
      trackChunk = readChunk(stream);
      if (trackChunk.id !== 'MTrk') {
        throw 'Unexpected chunk - expected MTrk, got ' + trackChunk.id;
      }
      trackStream = Stream(trackChunk.data);
      while (!trackStream.eof()) {
        event = readEvent(trackStream);
        tracks[i].push(event);
      }
    }

    return {
      header: header,
      tracks: tracks
    };

    function readChunk(stream) {
      var id = stream.read(4),
        length = stream.readInt32();

      return {
        id: id,
        length: length,
        data: stream.read(length)
      };
    }

    function readEvent(stream) {
      var event = { deltaTime: stream.readVarInt() },
        eventTypeByte = stream.readInt8(),
        subtypeByte,
        length,
        hourByte,
        param1,
        eventType;

      if ((eventTypeByte & 0xf0) === 0xf0) {

        if (eventTypeByte === 0xff) { // Meta event
          event.type = 'meta';
          subtypeByte = stream.readInt8();
          length = stream.readVarInt();
          switch (subtypeByte) {
            case 0x00:
              event.subtype = 'sequenceNumber';
              if (length !== 2) {
                throw 'Expected length for sequenceNumber event is 2, got ' + length;
              }
              event.number = stream.readInt16();
              return event;
            case 0x01:
              event.subtype = 'text';
              event.text = stream.read(length);
              return event;
            case 0x02:
              event.subtype = 'copyrightNotice';
              event.text = stream.read(length);
              return event;
            case 0x03:
              event.subtype = 'trackName';
              event.text = stream.read(length);
              return event;
            case 0x04:
              event.subtype = 'instrumentName';
              event.text = stream.read(length);
              return event;
            case 0x05:
              event.subtype = 'lyrics';
              event.text = stream.read(length);
              return event;
            case 0x06:
              event.subtype = 'marker';
              event.text = stream.read(length);
              return event;
            case 0x07:
              event.subtype = 'cuePoint';
              event.text = stream.read(length);
              return event;
            case 0x20:
              event.subtype = 'midiChannelPrefix';
              if (length !== 1) {
                throw 'Expected length for midiChannelPrefix event is 1, got ' + length;
              }
              event.channel = stream.readInt8();
              return event;
            case 0x2f:
              event.subtype = 'endOfTrack';
              if (length !== 0) {
                throw 'Expected length for endOfTrack event is 0, got ' + length;
              }
              return event;
            case 0x51:
              event.subtype = 'setTempo';
              if (length !== 3) {
                throw 'Expected length for setTempo event is 3, got ' + length;
              }
              event.microsecondsPerBeat = (
                (stream.readInt8() << 16)
                + (stream.readInt8() << 8)
                + stream.readInt8()
              );
              return event;
            case 0x54:
              event.subtype = 'smpteOffset';
              if (length !== 5) {
                throw 'Expected length for smpteOffset event is 5, got ' + length;
              }
              hourByte = stream.readInt8();
              event.frameRate = {
                0x00: 24, 0x20: 25, 0x40: 29, 0x60: 30
              }[hourByte & 0x60];
              event.hour = hourByte & 0x1f;
              event.min = stream.readInt8();
              event.sec = stream.readInt8();
              event.frame = stream.readInt8();
              event.subframe = stream.readInt8();
              return event;
            case 0x58:
              event.subtype = 'timeSignature';
              if (length !== 4) {
                throw 'Expected length for timeSignature event is 4, got ' + length;
              }
              event.numerator = stream.readInt8();
              event.denominator = Math.pow(2, stream.readInt8());
              event.metronome = stream.readInt8();
              event.thirtyseconds = stream.readInt8();
              return event;
            case 0x59:
              event.subtype = 'keySignature';
              if (length !== 2) {
                throw 'Expected length for keySignature event is 2, got ' + length;
              }
              event.key = stream.readInt8(true);
              event.scale = stream.readInt8();
              return event;
            case 0x7f:
              event.subtype = 'sequencerSpecific';
              event.data = stream.read(length);
              return event;
            default:
              event.subtype = 'unknown';
              event.data = stream.read(length);
              return event;
          }
        } else if (eventTypeByte === 0xf0) { // System event
          event.type = 'sysEx';
          length = stream.readVarInt();
          event.data = stream.read(length);
          return event;
        } else if (eventTypeByte === 0xf7) { // System event
          event.type = 'dividedSysEx';
          length = stream.readVarInt();
          event.data = stream.read(length);
          return event;
        }
        throw 'Unrecognised MIDI event type byte: ' + eventTypeByte;
      } else { // Channel event

        if ((eventTypeByte & 0x80) === 0) {

          // Running status - reuse lastEventTypeByte as the event type
          // eventTypeByte is actually the first parameter
          param1 = eventTypeByte;
          eventTypeByte = lastEventTypeByte;

        } else {
          param1 = stream.readInt8();
          lastEventTypeByte = eventTypeByte;
        }

        eventType = eventTypeByte >> 4;
        event.channel = eventTypeByte & 0x0f;
        event.type = 'channel';
        switch (eventType) {
          case 0x08:
            event.subtype = 'noteOff';
            event.noteNumber = param1;
            event.velocity = stream.readInt8();
            return event;
          case 0x09:
            event.noteNumber = param1;
            event.velocity = stream.readInt8();
            event.subtype = event.velocity === 0 ? 'noteOff' : 'noteOn';
            return event;
          case 0x0a:
            event.subtype = 'noteAftertouch';
            event.noteNumber = param1;
            event.amount = stream.readInt8();
            return event;
          case 0x0b:
            event.subtype = 'controller';
            event.controllerType = param1;
            event.value = stream.readInt8();
            return event;
          case 0x0c:
            event.subtype = 'programChange';
            event.programNumber = param1;
            return event;
          case 0x0d:
            event.subtype = 'channelAftertouch';
            event.amount = param1;
            return event;
          case 0x0e:
            event.subtype = 'pitchBend';
            event.value = param1 + (stream.readInt8() << 7);
            return event;
          default:
            throw 'Unrecognised MIDI event type: ' + eventType;
        }
      }
    }
  }

  /**
   *  Parse tempo and time signature from the midiJson
   *  @param {Object} midiJson
   *  @return {Object}
   */
  function parseTransport(midiJson) {
    var ret = {
        instruments: []
      },
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
            ret.instruments.push(datum.channel === 9 ? 0 : datum.programNumber + 1);
          }
        }
      }
    }

    return ret;
  }

  var CONTROL_CHANGE_SUSTAIN_PEDAL = 64;

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
      i = 0,
      event,
      prevEvent,
      tmp;

    if (!hasConsecutiveNoteOn(track)) {
      return events;
    }

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
   *  Look for consecutive 'noteOn' to decide if permutation is necessary
   *  @param {Array} track Array of MIDI events
   *  @returns {Boolean} true if consecutive 'noteOn' detected
   */
  function hasConsecutiveNoteOn(track) {
    var currentNote = {},
      i = 0,
      event;

    while (i < track.length) {
      event = track[i];

      if (event.subtype === 'noteOn' && currentNote[event.noteNumber]) {
        return true;
      }

      if (event.subtype === 'noteOn') {
        currentNote[event.noteNumber] = true;
      } else if (event.subtype === 'noteOff') {
        currentNote[event.noteNumber] = false;
      }

      i++;
    }

    return false;
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

  var MidiConvert = { parse };

  /**
   *  Convert a midi file to a Tone.Part-friendly JSON representation
   *  @param {Blob} fileBlob The output from fs.readFile or FileReader
   *  @param {Object} options The parsing options
   *  @return {Object} A Tone.js-friendly object which can be consumed by Tone.Part
   */
  function parse(fileBlob, options) {
    var midiJson = MidiFile(fileBlob);

    if (midiJson.header.formatType === 0) {
      splitType0(midiJson);
    }

    return {
      parts: parseParts(midiJson, options),
      transport: parseTransport(midiJson)
    };
  }

  function splitType0(midiJson) {
    var tracksMap = {},
      absoluteTime = 0,
      tracks = [],
      event,
      channel,
      prevEvent,
      track,
      i;

    for (i = 0; i < midiJson.tracks[0].length; i++) {
      event = midiJson.tracks[0][i];
      channel = event.channel || 0;

      absoluteTime += event.deltaTime;
      event.absoluteTime = absoluteTime;

      tracksMap[channel] = tracksMap[channel] || [];
      prevEvent = tracksMap[channel][tracksMap[channel].length - 1];
      tracksMap[channel].push(event);

      if (prevEvent) {
        event.deltaTime = event.absoluteTime - prevEvent.absoluteTime;
      } else {
        event.deltaTime = event.absoluteTime;
      }
    }

    midiJson.tracks = [];

    for (track in tracksMap) {
      if (tracksMap.hasOwnProperty(track)) {
        tracks.push(tracksMap[track]);
      }
    }

    midiJson.tracks = tracks;
    midiJson.header.trackCount = tracks.length;
  }

  return MidiConvert;

}));