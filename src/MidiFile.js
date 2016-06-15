import streamer from './Stream.js';

export default MidiFile;

function MidiFile(data) {
  var lastEventTypeByte,
    stream = streamer(data),
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

  headerStream = streamer(headerChunk.data);
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
    trackStream = streamer(trackChunk.data);
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
