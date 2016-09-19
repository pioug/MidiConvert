import ava from 'ava';
import { File } from '../build/MidiConvert.js';

ava('File -> setTicks should set the correct HDR_SPEED on valid input', function(t) {
  var file = new File({
    ticks: 1000
  });
  t.deepEqual(file.ticks, 1000, 'ticks should be set to 1000');
});

ava('File -> setTicks should throw error on invalid input ', function(t) {
  t.throws(function() {
    new File({
      ticks: 'not a number'
    });
  });
  t.throws(function() {
    new File({
      ticks: 85000
    });
  });

  t.throws(function() {
    new File({
      ticks: 133.7
    });
  });
});
