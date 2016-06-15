var fs = require('fs'),
  MidiConvert = require('../build/MidiConvert.js'),
  expect = require('chai').expect;

describe('API', function() {
  it('has parse method', function() {
    expect(MidiConvert).to.have.property('parse');
  });
});

describe('Goldberg Variation 1 format 1 midi file', function() {
  var midiData,
    midiJson;

  before(function(done) {
    fs.readFile('test/midi/bwv-988-v01.mid', 'binary', function(err, data) {
      if (err) return;
      midiData = data;
      fs.readFile('test/midi/bwv-988-v01.json', 'utf8', function(err, json) {
        if (err) return;
        midiJson = JSON.parse(json);
        done();
      });
    });
  });

  it('gets the time signature from the file', function() {
    var transportData = MidiConvert.parse(midiData).transport;
    expect(transportData).to.have.property('timeSignature');
    expect(transportData.timeSignature).to.be.an('array');
    expect(transportData.timeSignature).to.deep.equal([3, 4]);
  });

  it('gets the bpm from the file', function() {
    var transportData = MidiConvert.parse(midiData).transport;
    expect(transportData).to.have.property('bpm');
    expect(transportData.bpm).to.be.a('number');
    expect(transportData.bpm).to.be.closeTo(60, 0.001);
  });

  it('extracts the tracks from the file', function() {
    var trackData = MidiConvert.parse(midiData, {
      PPQ: 192,
      midiNote: true,
      noteName: true,
      velocity: true,
      duration: true
    }).parts;
    expect(trackData.length).to.equal(2);
    expect(trackData).to.deep.equal(midiJson);
  });
});

describe('Prelude in C format 1 midi file', function() {
  var midiData,
    midiJson;

  before(function(done) {
    fs.readFile('test/midi/bwv-846.mid', 'binary', function(err, data) {
      if (err) return;
      midiData = data;
      fs.readFile('test/midi/bwv-846.json', 'utf8', function(err, json) {
        if (err) return;
        midiJson = JSON.parse(json);
        done();
      });
    });
  });

  it('gets the time signature from the file', function() {
    var transportData = MidiConvert.parse(midiData).transport;
    expect(transportData).to.have.property('timeSignature');
    expect(transportData.timeSignature).to.be.an('array');
    expect(transportData.timeSignature).to.deep.equal([4, 4]);
  });

  it('gets the bpm from the file', function() {
    var transportData = MidiConvert.parse(midiData).transport;
    expect(transportData).to.have.property('bpm');
    expect(transportData.bpm).to.be.a('number');
    expect(transportData.bpm).to.be.closeTo(62.41, 0.001);
  });

  it('extracts the tracks from the file', function() {
    var trackData = MidiConvert.parse(midiData, {
      PPQ: 96,
      midiNote: true,
      noteName: false,
      velocity: true,
      duration: true
    }).parts;
    expect(trackData.length).to.equal(6);
    expect(trackData).to.deep.equal(midiJson);
  });
});

describe('Prelude in D minor format 0 midi file', function() {
  var midiData,
    midiJson;

  before(function(done) {
    fs.readFile('test/midi/bwv-850.mid', 'binary', function(err, data) {
      if (err) return;
      midiData = data;
      fs.readFile('test/midi/bwv-850.json', 'utf8', function(err, json) {
        if (err) return;
        midiJson = JSON.parse(json);
        done();
      });
    });
  });

  it('gets the time signature from the file', function() {
    var transportData = MidiConvert.parse(midiData).transport;
    expect(transportData).to.have.property('timeSignature');
    expect(transportData.timeSignature).to.be.an('array');
    expect(transportData.timeSignature).to.deep.equal([4, 4]);
  });

  it('gets the bpm from the file', function() {
    var transportData = MidiConvert.parse(midiData).transport;
    expect(transportData).to.have.property('bpm');
    expect(transportData.bpm).to.be.a('number');
    expect(transportData.bpm).to.be.closeTo(51, 0.001);
  });

  it('extracts the track from the file', function() {
    var trackData = MidiConvert.parse(midiData, {
      PPQ: 24,
      midiNote: true,
      noteName: false,
      velocity: true,
      duration: true
    }).parts;
    expect(trackData.length).to.equal(1);
    expect(trackData).to.deep.equal(midiJson);
  });
});

describe('Prelude in C minor format 0 midi file', function() {
  var midiData,
    midiJson;

  before(function(done) {
    fs.readFile('test/midi/bwv-847.mid', 'binary', function(err, data) {
      if (err) return;
      midiData = data;
      fs.readFile('test/midi/bwv-847.json', 'utf8', function(err, json) {
        if (err) return;
        midiJson = JSON.parse(json);
        done();
      });
    });
  });

  it('extracts the track from the file', function() {
    var trackData = MidiConvert.parse(midiData, {
      PPQ: 192,
      midiNote: true,
      noteName: true,
      velocity: true,
      duration: true
    }).parts;
    expect(trackData.length).to.equal(1);
    expect(trackData).to.deep.equal(midiJson);
  });
});

describe('Funk kit with implicit note off events', function() {
  var midiData,
    midiJson;

  before(function(done) {
    fs.readFile('test/midi/funk-kit.mid', 'binary', function(err, data) {
      if (err) return;
      midiData = data;
      fs.readFile('test/midi/funk-kit.json', 'utf8', function(err, json) {
        if (err) return;
        midiJson = JSON.parse(json);
        done();
      });
    });
  });

  it('permutes noteOff and noteOn events', function() {
    var trackData = MidiConvert.parse(midiData, {
      PPQ: 192,
      midiNote: true,
      noteName: true,
      velocity: true,
      duration: true
    }).parts;
    expect(trackData.length).to.equal(1);
    expect(trackData).to.deep.equal(midiJson);
  });
});

describe('Single track, multi channel midi file (type 0)', function() {
  var midiData,
    midiJson;

  before(function(done) {
    fs.readFile('test/midi/single-track-multi-channel.mid', 'binary', function(err, data) {
      if (err) return;
      midiData = data;
      fs.readFile('test/midi/single-track-multi-channel.json', 'utf8', function(err, json) {
        if (err) return;
        midiJson = JSON.parse(json);
        done();
      });
    });
  });

  it('gets the list of instruments', function() {
    var transportData = MidiConvert.parse(midiData).transport;
    expect(transportData).to.have.property('instruments');
    expect(transportData.instruments.length).to.equal(5);
  });

  it('extracts the tracks from the file', function() {
    var trackData = MidiConvert.parse(midiData, {
      PPQ: 192,
      midiNote: true,
      noteName: true,
      velocity: true,
      duration: true
    }).parts;
    expect(trackData.length).to.equal(5);
    expect(trackData).to.deep.equal(midiJson);
  });
});
