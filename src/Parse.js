import { parseMidiFile } from './ParseMidiFile.js';
import parts from './Parts.js';
import transport from './Transport.js';
import { toArray } from './Util.js';

export { parse };
export default parse;

/**
 *  Convert a midi file to a Tone.Part-friendly JSON representation
 *  @param {Blob} fileBlob The output from fs.readFile or FileReader
 *  @param {Object} options The parsing options
 *  @return {Object} A Tone.js-friendly object which can be consumed by Tone.Part
 */
function parse(fileBlob, options) {
  var midiJson = parseMidiFile(fileBlob);

  if (midiJson.header.formatType === 0) {
    midiJson.tracks = splitType0(midiJson.tracks[0]);
  }

  return {
    parts: parts(midiJson, options),
    transport: transport(midiJson)
  };
}

function splitType0(track) {
  var absoluteTime = 0,
    tracksMap = track.reduce(groupByChannel, {});

  return toArray(tracksMap);

  function groupByChannel(result, event) {
    var channel = event.channel || 0,
      prevEvent;

    result[channel] = result[channel] || [];
    prevEvent = result[channel][result[channel].length - 1];
    result[channel].push(event);

    absoluteTime += event.deltaTime;
    event.absoluteTime = absoluteTime;

    event.deltaTime = prevEvent ?
      event.absoluteTime - prevEvent.absoluteTime :
      event.absoluteTime;

    return result;
  }
}
