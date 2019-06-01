const fs = require('fs-extra')
const path = require('path')
const chalk = require('chalk')
const jsome = require('jsome')
const jsondiffpatch = require('jsondiffpatch')

let css

const getCss = () => {
  if (!css) {
    const visualDiffCss = fs.readFileSync(__dirname + '/diff/html.css')
    const annotatedDiffCss = fs.readFileSync(__dirname + '/diff/annotated.css')

    css = `
      <style>
        h3.changed {
          color: orange;
        }
        h3.deleted {
          color: red;
        }
        h3.added {
          color: darkGreen;
        }
        ${visualDiffCss}
        ${annotatedDiffCss}
      </style>
    `
  }

  return css
}

const getHtmlStart = () => {
  return `
    <!DOCTYPE html>
    <html>
        <head>
          ${ getCss() }
        </head>
        <body>
    `
}

const getDiffHtml = (title, visualDiff, annotatedDiff) => {
  return `
    <h3 class='changed'>${title}</h3>
    ${ visualDiff ? `<div>${visualDiff}</div><hr/>` : '' }
    ${ annotatedDiff ? `<div>${annotatedDiff}</div><hr/>` : '' }
    `
}

const getDeletedHtml = (title) => {
  return `
    <h3 class='deleted'>${title}</h3>
    `
}

const getAddedHtml = (title) => {
  return `
    <h3 class='added'>${title}</h3>
    `
}

const getHtmlEnd = () => {
  return `
        </body>
    </html>
    `
}

class DiffVisitor {

  constructor(basePath, htmlFilename) {
    this.basePath = path.normalize(basePath)
    this.visited = []
    this.htmlFilename = htmlFilename
    if (htmlFilename) {
      this.htmlFilename = path.normalize(htmlFilename)
      this.writeStream = fs.createWriteStream(htmlFilename, { encoding:'utf-8', flag:'w' })
      this.writeStream.write(getHtmlStart())  
    }
  }

  async visit(doc) {

    const filename = `${doc.id}.json`
    const docDir = doc.ref.path.slice(0, doc.ref.path.lastIndexOf('/'))
    const fullDir = path.join(this.basePath, docDir)
    const fullName = path.join(fullDir, filename)
  
    this.visited.push(doc.ref.path)
    if (!fs.existsSync(fullName)) {
      const addedMsg = `ADDED: '${doc.ref.path}'<br/>(File '${fullName}' not found)`
      console.log(chalk.green(addedMsg))
      if (this.htmlFilename) {
        this.writeStream.write(getAddedHtml(addedMsg))
      } 
    } else {
      const fileDoc = fs.readJsonSync(fullName)
    
      // Diff the files.  The firestore doc (doc) is considered the "new" file. fileDoc is considered "old"
      try {
        const delta = jsondiffpatch.diff(fileDoc, doc.data())
        if (delta) {
          console.log(chalk.yellow(`Changed: ${doc.ref.path}`))
          if (this.htmlFilename) {
            const visualDiff = jsondiffpatch.formatters.html.format(delta, fileDoc)
            // const annotatedDiff = jsondiffpatch.formatters.annotated.format(delta, fileDoc)
            const msg = `CHANGED: ${doc.ref.path}`
            this.writeStream.write(getDiffHtml(msg, visualDiff, null))
          } 
          jsondiffpatch.console.log(delta)  
        } else {
          console.log(chalk.cyan(`Match: ${doc.ref.path}`))
        }
      } catch (error) {
        console.log(chalk.red(error.message))
        throw error
      }
    }
  }

  writeDeleteMsg(deletedPath) {
    const fullName = path.join(this.basePath, deletedPath)

    const msg = `DELETED: '${deletedPath}'<br/>(Firestore doc for '${fullName}' not found)`
    console.log(chalk.red(msg))
    if (this.htmlFilename) {
      this.writeStream.write(getDeletedHtml(msg))
    } 
  }
  
  /**
   * Finds documents that were deleted in database.  These have files in the backup directory 
   * where the equivalent document is no longer in the database.
   * 
   * Recursively visits files in filesystem and calls writeDeleteMsg for each
   * file not found in list of visited paths from batchTraverse.
   * 
   * Note: this should be called after calls to visit for database documents
   */
  async visitFileSystem() { 
    return this.visitDir(this.basePath)
  }

  async visitDir(dir) {
    if (!dir) {
      dir = this.basePath
    }

    return fs.readdir(dir).then(async files => {
      const jsonFiles = files.filter(file => file.endsWith('.json'))
      const subdirs = files.filter(file => fs.statSync(path.join(dir, file)).isDirectory())
      await Promise.all(jsonFiles.map(file => this.visitFile(path.join(dir, file))))
      return Promise.all(subdirs.map(subdir => this.visitDir(path.join(dir, subdir))))
    })
  }
  
  visitFile(file) {
    // strip off basePath and trailing .json
    const path = file.slice(this.basePath.length + 1, file.length - 5)
    if (!this.visited.includes(path)) {
      this.writeDeleteMsg(path) 
    }
  }
  
  close() {
    if (this.htmlFilename) {
      this.writeStream.write(getHtmlEnd())
      this.writeStream.close()  
    }
  }
}

module.exports = DiffVisitor
