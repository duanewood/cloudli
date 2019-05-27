const inquirer = require('inquirer')

/**
 * Displays a confirmation prompt
 * 
 * @param {string} prompt
 */
async function confirm(prompt) {
  return inquirer.prompt({
    name: 'confirm',
    type: 'confirm',
    message: prompt,
    default: false
  }).then(answers => {
    if (answers.confirm) {
      return answers.confirm
    } else {
      return false
    }
  })
}

module.exports = {
  confirm
}