define(function(){

	/**
	 *  Parse tempo and time signature from the midiJson
	 *  @param  {Object}  midiJson
	 *  @return  {Object}
	 */
	return function parseTransport(midiJson){
		var ret = {};
		for (var i = 0; i < midiJson.tracks.length; i++){
			var track = midiJson.tracks[i];
			for (var j = 0; j < track.length; j++){
				var datum = track[j];
				if (datum.type === "meta"){
					if (datum.subtype === "timeSignature"){
						ret.timeSignature = [datum.numerator, datum.denominator];
					} else if (datum.subtype === "setTempo"){
						ret.bpm = 60000000 / datum.microsecondsPerBeat;
					} else if (datum.subtype === "programChange") {
					}
				} else if (datum.type === "channel") {
					if (datum.subtype === "programChange") {
						ret.instruments = ret.instruments || [];
						ret.instruments[i] =  datum.channel === 9 ? 0 : datum.programNumber + 1;
					}
				}
			}
		}
		ret.instruments = compact(ret.instruments);
		return ret;
	};

	function compact(array) {
	  var index = -1;
		var length = array ? array.length : 0;
		var resIndex = 0;
		var result = [];

	  while (++index < length) {
	    var value = array[index];
	    if (value || value === 0) {
	      result[resIndex++] = value;
	    }
	  }
	  return result;
	}
});
