const admin = require('firebase-admin')

/**
 * Determines if an object has all fields and no other fields
 * 
 * @param {object} obj the object to test
 * @param {string[]} fields array of field names
 */
const only = (obj, fields) => {
  const keys = Object.keys(obj)
  return (keys.length === fields.length)
         && keys.every(k => fields.includes(k))
}

/**
 * Converts from a json file to a Firestore object
 * 
 * @param {*} value The value to convert.  May be an object or a field.
 */
const FirestoreMapper = value => {
  if (value && typeof value === 'object') {
    if (only(value, ['_seconds', '_nanoseconds'])) {
      value = new admin.firestore.Timestamp(Number(value._seconds), Number(value._nanoseconds))
    } else if (only(value, ['latitude', 'longitude'])) {
      value = new admin.firestore.GeoPoint(value.latitude, value.longitude)
    } else {
      const keys = Object.keys(value)
      keys.forEach(k => value[k] = FirestoreMapper(value[k]))
    }
  } 

  return value
}

module.exports = FirestoreMapper