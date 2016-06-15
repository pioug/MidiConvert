export default Stream;

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
