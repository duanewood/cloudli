const chalk = require('chalk')

/**
 * Semantic colors using chalk
 */
const Colors = {
  prep: txt => chalk.cyan(txt),
  start: txt => chalk.green(txt),
  complete: txt => chalk.green(txt),
  error: txt => chalk.red(txt),
  warning: txt => chalk.yellow(txt),
  info: txt => chalk.green(txt),
  result: txt => chalk.yellow(txt),
  addItem: txt => chalk.green.dim(txt),
  changeItem: txt => chalk.yellow(txt),
  deleteItem: txt => chalk.red(txt),
  matchItem: txt => chalk.cyan(txt),
}

module.exports = Colors
