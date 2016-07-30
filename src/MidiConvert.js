import midiFileParser from './MidiFile.js';
import MidiGen from './MidiGen.js';
import generate from './Generate.js';
import parts from './Parts.js';
import transport from './Transport.js';
import { toArray } from './Util.js';

export default {
  generate,
  MidiGen,
  parse
};

/**
 *  Convert a midi file to a Tone.Part-friendly JSON representation
 *  @param {Blob} fileBlob The output from fs.readFile or FileReader
 *  @param {Object} options The parsing options
 *  @return {Object} A Tone.js-friendly object which can be consumed by Tone.Part
 */
function parse(fileBlob, options) {
  var midiJson = midiFileParser(fileBlob);

  if (midiJson.header.formatType === 0) {
    splitType0(midiJson);
  }

  return {
    parts: parts(midiJson, options),
    transport: transport(midiJson)
  };
}

function splitType0(midiJson) {
  var tracksMap = {},
    absoluteTime = 0,
    tracks = [],
    event,
    channel,
    prevEvent,
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

  midiJson.tracks = toArray(tracksMap);
  midiJson.header.trackCount = tracks.length;
}
