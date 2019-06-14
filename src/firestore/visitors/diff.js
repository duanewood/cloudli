const fs = require('fs-extra')
const path = require('path')
const Colors = require('../../Colors')
const jsondiffpatch = require('jsondiffpatch')
const { logger } = require('../../commonutils')

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
        <script type='text/javascript' src="https://cdn.jsdelivr.net/npm/jsondiffpatch/dist/jsondiffpatch.umd.min.js"></script>
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
    <script>
      jsondiffpatch.formatters.html.hideUnchanged()
    </script>
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

      const addedMsg1 = `ADDED: '${doc.ref.path}'`
      const addedMsg2 = `(File '${fullName}' not found)`
      logger.info(Colors.addItem(addedMsg1))
      logger.info(Colors.addItem(addedMsg2))
      if (this.htmlFilename) {
        this.writeStream.write(getAddedHtml(addedMsg1 + '<br/' + addedMsg2))
      } 
    } else {
      const fileDoc = fs.readJsonSync(fullName)
    
      // Diff the files.  The firestore doc (doc) is considered the "new" file. fileDoc is considered "old"
      try {
        const delta = jsondiffpatch.diff(fileDoc, doc.data())
        if (delta) {
          logger.info(Colors.changeItem(`Changed: ${doc.ref.path}`))
          if (this.htmlFilename) {
            const visualDiff = jsondiffpatch.formatters.html.format(delta, fileDoc)
            const msg = `CHANGED: ${doc.ref.path}`
            this.writeStream.write(getDiffHtml(msg, visualDiff, null))
          } 
          const output = jsondiffpatch.formatters.console.format(delta)
          logger.info(output)
        } else {
          logger.info(Colors.matchItem(`Match: ${doc.ref.path}`))
        }
      } catch (error) {
        logger.error(Colors.error(error.message))
        throw error
      }
    }
  }

  writeDeleteMsg(deletedPath) {
    const fullName = path.join(this.basePath, deletedPath)

    const msg1 = `DELETED: '${deletedPath}'`
    const msg2 = `(Firestore doc for '${fullName}' not found)`
    logger.info(Colors.deleteItem(msg1))
    logger.info(Colors.deleteItem(msg2))
    if (this.htmlFilename) {
      this.writeStream.write(getDeletedHtml(msg1 + '<br/>' + msg2))
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
