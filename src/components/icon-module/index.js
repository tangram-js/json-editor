export default {
  json: require('./json.png'),
  object: require('./object.png'),
  array: require('./array.png'),
  string: require('./string.png'),
  integer: require('./integer.png'),
  number: require('./number.png'),
  boolean: require('./boolean.png'),
  enum: require('./enum.png'),
  icon (name) {
    if (name) {
      if (this[name]) return this[name]
    }
    return null
  }
}
