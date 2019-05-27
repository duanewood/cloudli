const admin = require('firebase-admin')

const getFirestoreProp = value => {
  const props = { 'arrayValue': 1, 'bytesValue': 1, 'booleanValue': 1, 'doubleValue': 1, 'geoPointValue': 1, 'integerValue': 1, 'mapValue': 1, 'nullValue': 1, 'referenceValue': 1, 'stringValue': 1, 'timestampValue': 1 }
  return Object.keys(value).find(k => props[k] === 1)
}

/**
 * Converts from Firestore client Document object returned from runQuery to an admin client 
 * DocumentSnapshop data object
 * 
 * Adapted from firestore-parser and added Timestamp support.
 * @see https://github.com/jdbence/firestore-parser/blob/master/index.js
 * 
 * @param {*} value The value to convert.  May be an object or firestore field types.
 */
const FirestoreParser = value => {
  const prop = getFirestoreProp(value)
  if (prop === 'doubleValue' || prop === 'integerValue') {
    value = Number(value[prop])
  }
  else if (prop === 'arrayValue') {
    value = (value[prop] && value[prop].values || []).map(v => FirestoreParser(v))
  }
  else if (prop === 'mapValue') {
    value = FirestoreParser(value[prop] && value[prop].fields || {})
  }
  else if (prop === 'nullValue') {
    value = null
  }
  else if (prop === 'geoPointValue') {
    value = { latitude: 0, longitude: 0, ...value[prop] }
  }
  else if (prop === 'timestampValue') {
    value = new admin.firestore.Timestamp(Number(value[prop].seconds), value[prop].nanos)
  }
  else if (prop) {
    value = value[prop]
  }
  else if (typeof value === 'object') {
    Object.keys(value).forEach(k => value[k] = FirestoreParser(value[k]))
  }
  return value;
}

module.exports = FirestoreParser