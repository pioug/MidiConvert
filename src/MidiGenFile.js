import { Track } from './MidiGenTrack.js';
import { PPQ } from './Constants.js';
import { codes2Str, str2Bytes } from './MidiUtil.js';

/**
 * Construct a file object.
 *
 * Parameters include:
 *  - ticks [optional number] - Number of ticks per beat, defaults to 128.
 *    Must be 1-32767.
 *  - tracks [optional array] - Track data.
 */
var File = function(config) {
  if (!this) return new File(config);

  var c = config || {};
  if (c.ticks) {
    if (typeof c.ticks !== 'number') {
      throw new Error('Ticks per beat must be a number!');
    }
    if (c.ticks <= 0 || c.ticks >= (1 << 15) || c.ticks % 1 !== 0) {
      throw new Error('Ticks per beat must be an integer between 1 and 32767!');
    }
  }

  this.ticks = c.ticks || PPQ;
  this.tracks = c.tracks || [];
};

File.HDR_CHUNKID = 'MThd'; // File magic cookie
File.HDR_CHUNK_SIZE = '\x00\x00\x00\x06'; // Header length for SMF
File.HDR_TYPE0 = '\x00\x00'; // Midi Type 0 id
File.HDR_TYPE1 = '\x00\x01'; // Midi Type 1 id

/**
 * Add a track to the file.
 *
 * @param {Track} track - The track to add.
 */
File.prototype.addTrack = function(track) {
  if (track) {
    this.tracks.push(track);
    return this;
  } else {
    track = new Track();
    this.tracks.push(track);
    return track;
  }
};

/**
 * Serialize the MIDI file to an array of bytes.
 *
 * @returns {Array} The array of serialized bytes.
 */
File.prototype.toBytes = function() {
  var trackCount = this.tracks.length.toString(16),
    bytes = File.HDR_CHUNKID + File.HDR_CHUNK_SIZE; // prepare the file header

  // set Midi type based on number of tracks
  if (parseInt(trackCount, 16) > 1) {
    bytes += File.HDR_TYPE1;
  } else {
    bytes += File.HDR_TYPE0;
  }

  // add the number of tracks (2 bytes)
  bytes += codes2Str(str2Bytes(trackCount, 2));
  // add the number of ticks per beat (currently hardcoded)
  bytes += String.fromCharCode((this.ticks / 256), this.ticks % 256);

  // iterate over the tracks, converting to bytes too
  this.tracks.forEach(function(track) {
    bytes += codes2Str(track.toBytes());
  });

  return bytes;
};

export { File };
