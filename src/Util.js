export { toArray };

function toArray(hash) {
  var arr = [],
    key;
  for (key in hash) {
    if (hash.hasOwnProperty(key)) {
      arr.push(hash[key]);
    }
  }
  return arr;
}