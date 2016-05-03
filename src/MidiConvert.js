define(["midi-file-parser", "Transport", "Parts"], function(midiFileParser, Transport, Parts){

	return {
		/**
		 *  Convert a midi file to a Tone.Score-friendly JSON representation
		 *  @param  {Binary String}  fileBlob  The output from fs.readFile or FileReader
		 *  @param  {Object}  options   The parseing options
		 *  @return  {Object}  A Tone.js-friendly object which can be consumed
		 *                       by Tone.Score
		 */
		parseParts : function(fileBlob, options){
			var midiJson = midiFileParser(fileBlob);

			if (midiJson.header.formatType === 0) {
				var tracks = [];
				var absoluteTime = 0;
				for (var i = 0; i < midiJson.tracks[0].length; i++) {
					var event = midiJson.tracks[0][i];
					var channel = event.channel || 0;
					var prevEvent;

					absoluteTime += event.deltaTime;
					event.absoluteTime = absoluteTime;

					tracks[channel] = tracks[channel] || [];
					prevEvent = tracks[channel][tracks[channel].length - 1];
					tracks[channel].push(event);

					if (prevEvent) {
						event.deltaTime = event.absoluteTime - prevEvent.absoluteTime;
					} else {
						event.deltaTime = event.absoluteTime;
					}
				}

				midiJson.tracks = compact(tracks);
				midiJson.header.trackCount = tracks.length;
			}

			return Parts(midiJson, options);
		},
		/**
		 *  Parse the Transport-relevant descriptions from the MIDI file blob
		 *  @param  {Binary String}  fileBlob  The output from fs.readFile or FileReader
		 *  @return  {Object}
		 */
		parseTransport : function(fileBlob){
			var midiJson = midiFileParser(fileBlob);
			return Transport(midiJson);
		}
	};

	function compact(array) {
	  var index = -1;
		var length = array ? array.length : 0;
		var resIndex = 0;
		var result = [];

	  while (++index < length) {
	    var value = array[index];
	    if (value) {
	      result[resIndex++] = value;
	    }
	  }
	  return result;
	}
});
