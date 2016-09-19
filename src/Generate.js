import { File } from './MidiGenFile.js';
import { flatten, isTruthy } from './Util.js';

export { generate };

function generate(midiJson) {
  var destination = new File();
  midiJson.parts.forEach(copyTrack);
  return destination.toBytes();

  function copyTrack(src, index) {
    var track = destination.addTrack();

    if (midiJson.transport.bpm) {
      track.setTempo(midiJson.transport.bpm);
    }

    if (midiJson.transport.instruments && typeof midiJson.transport.instruments[index] !== 'undefined') {
      track.setInstrument(midiJson.transport.instruments[index] === 0 ? 9 : index >= 9 ? index + 1 : index, midiJson.transport.instruments[index] - 1);
    }

    if (midiJson.transport.timeSignature) {
      track.setTimeSignature(midiJson.transport.timeSignature[0], midiJson.transport.timeSignature[1]);
    }

    if (midiJson.transport.trackNames && midiJson.transport.trackNames[index]) {
      track.setName(midiJson.transport.trackNames[index]);
    }

    src.map(createEvents)
      .filter(isTruthy)
      .reduce(flatten, [])
      .sort(compareTime)
      .reduce(smartSort, [])
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

/*
 * Sorting only by time is not enough to support cases
 * where notes and/or on-off events are concurrent
 * Example of prioritisation when events are simultaneous:
 * - Prefer 'Off' event over 'On' event to avoid consecutive 'On'
 * - Prefer event that will last longer
 */
function smartSort(result, event, index, events) {
  var prev = result[result.length - 1],
    next = event,
    ongoing,
    potentialCanditates;

  if (!result.length) {
    next.taken = true;
    return [next];
  }

  next = events.find(e => !e.taken && e.time >= prev.time);
  ongoing = result.filter(e => e.midiNote === next.midiNote).pop();

  if (!ongoing) {
    next.taken = true;
    return result.concat(next);
  }

  potentialCanditates = events.filter(e => !e.taken && e.time === next.time);

  if (ongoing && ongoing.name.includes('On')) {
    next = potentialCanditates.find(e => e.name.includes('Off')) || next;
  } else if (ongoing && ongoing.name.includes('Off')) {
    next = potentialCanditates.find(e => e.name.includes('On')) || next;
  }

  next.taken = true;
  return result.concat(next);
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
