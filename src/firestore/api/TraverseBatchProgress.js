const ProgressBar = require("progress")

class TraverseBatchProgress {
  constructor(msg) {
    this.curr = 0
    if (process.stdout.isTTY) {
      this.progressBar = new ProgressBar(msg || 'Processed :current docs (:rate docs/s)',
                                         { total: Number.MAX_SAFE_INTEGER })
    }
  }

  tick(count) {
    this.curr += count || 1
    if (this.progressBar) {
      this.progressBar.tick(count)
    }
  }

  forceRender() {
    if (this.progressBar) {
      this.progressBar.render(undefined, true) // force update of progress bar
      console.log()
    }
  }
}

module.exports = TraverseBatchProgress