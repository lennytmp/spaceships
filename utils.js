function pickRandomEl(arr) {
  if (arr.length == 0) {
    throw "Can't pick random element from an empty array";
  }
  let index = Math.round(Math.random()*(arr.length -1));
  return {index: index, value: arr[index]};
}
