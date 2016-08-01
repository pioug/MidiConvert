import MidiGen from './MidiGen.js';
import { flatten } from './Util.js';

export default generate;

function generate(midiJson) {
  var destination = new MidiGen.File();
  midiJson.parts.forEach(copyTrack);
  return destination.toBytes();

  function copyTrack(src, index) {
    var track = destination.addTrack();

    if (midiJson.transport.bpm) {
      track.setTempo(midiJson.transport.bpm);
    }

    if (midiJson.transport._instruments && typeof midiJson.transport._instruments[index] !== 'undefined') {
      track.setInstrument(midiJson.transport._instruments[index] === 'percussion' ? 9 : index >= 9 ? index + 1 : index, midiJson.transport._instruments[index]);
    }

    if (midiJson.transport.timeSignature) {
      track.setTimeSignature(midiJson.transport.timeSignature[0], midiJson.transport.timeSignature[1]);
    }

    src.map(createEvents)
      .reduce(flatten, [])
      .sort(compareTime)
      .reduce(superSort, [])
      .reduce(convertToDeltaTime, [])
      .reduce(insertEvents, track);
  }
}

function insertEvents(track, event) {
  if (event.name.includes('Note')) {
    track['add' + event.name](0, event.midiNote, event.deltaTime, event.velocity * 127);
  } else if (event.name.includes('Sustain')) {
    track['add' + event.name](0, event.deltaTime);
  }
  return track;
}

function superSort(result, event, index, events) {
  var prev = result[result.length - 1],
    next;

  if (!result.length) {
    next = events[0];
    next.taken = true;
    return [next];
  }

  next = events.find(e => !e.taken && e.time >= prev.time);

  if (!next.duration) {
    next.taken = true;
    return result.concat(next);
  }

  next =
    events.filter(potentialCanditates).find(e => e.name.includes('Off')) ||
    events.filter(potentialCanditates).find(e => e.duration > next.duration) ||
    next;

  next.taken = true;
  return result.concat(next);

  function potentialCanditates(e) {
    return !e.taken && e.time === next.time;
  }
}

function compareTime(a, b) {
  return a.time - b.time;
}

function createEvents(note) {
  if (typeof note.midiNote !== 'undefined') {
    return [{
      duration: parseInt(note.duration),
      midiNote: note.midiNote,
      name: 'NoteOn',
      time: parseInt(note.time),
      velocity: note.velocity
    }, {
      duration: parseInt(note.duration),
      midiNote: note.midiNote,
      name: 'NoteOff',
      time: parseInt(note.time) + parseInt(note.duration),
      velocity: note.velocity
    }];
  } else if (note.eventName === 'sustain') {
    return [{
      name: 'SustainOn',
      time: parseInt(note.time)
    }, {
      name: 'SustainOff',
      time: parseInt(note.time) + parseInt(note.duration)
    }];
  }
}

function convertToDeltaTime(result, event, index, events) {
  var deltaTime = 0;

  if (result.length !== 0) {
    deltaTime = event.time - events[index - 1].time;
  } else {
    deltaTime = event.time;
  }

  return result.concat({
    duration: event.duration,
    time: event.time,
    name: event.name,
    midiNote: event.midiNote,
    deltaTime: deltaTime,
    velocity: event.velocity
  });
}
