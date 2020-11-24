const bourne = require('@hapi/bourne')

const jsonParser = input => {
  try {
    return { value: bourne.parse(input, { protoAction: 'remove' }) }
  } catch (err) {
    return { err }
  }
}

/**
 * Used to write pino logger entries as raw messages to the console if stdout is TTY.
 * Otherwise, entries are written as JSON.
 */
module.exports = function chalkPrettier(options) {
  // Deal with whatever options are supplied.
  return function prettifier(inputData) {
    let logObject    
    if (typeof inputData === 'string') {
      const parsedData = jsonParser(inputData)
      logObject = isPinoLog(parsedData) ? parsedData : undefined
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

  function isObject(input) {
    return Object.prototype.toString.apply(input) === '[object Object]'
  }

  function isPinoLog(log) {
    return log && (log.hasOwnProperty('msg'))
  }
}
