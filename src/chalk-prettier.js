const bourne = require('@hapi/bourne')

const jsonParser = input => {
  try {
    return { value: bourne.parse(input, { protoAction: 'remove' }) }
  } catch (err) {
    return { err }
  }
}

module.exports = function chalkPrettier(options) {
  // Deal with whatever options are supplied.
  return function prettifier (inputData) {
    let logObject
    if (typeof inputData === 'string') {
      const parsedData = someJsonParser(inputData)
      logObject = (isPinoLog(parsedData)) ? parsedData : undefined
    } else if (isObject(inputData) && isPinoLog(inputData)) {
      logObject = inputData
    }
    if (!logObject) return inputData
    if (process.stdout.isTTY) {
      console.log(logObject.msg)
    } else {
      console.log(JSON.stringify(logObject))
    }
  }

  function isObject (input) {
    return Object.prototype.toString.apply(input) === '[object Object]'
  }

  function isPinoLog (log) {
    return log && (log.hasOwnProperty('v') && log.v === 1)
  }
}