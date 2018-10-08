const repl = require("repl");
const util = require("util");
let fs = require('../../lib/core/fs');

class REPL {
  constructor(options) {
    this.events = options.events;
    this.env = options.env;
    this.cmdHistoryFile = options.cmdHistoryFile
      || process.env.DEFAULT_CMD_HISTORY_PATH;
  }

  enhancedEval(cmd, context, filename, callback) {
    if (cmd !== '\n') {
      fs.appendFileSync(this.cmdHistoryFile, cmd);
    }
    this.events.request('console:executeCmd', cmd.trim(), function (err, message) {
      callback(err, message || ''); // This way, we don't print undefined
    });
  }

  enhancedWriter(output) {
    if ((typeof output) === "string") {
      return output;
    }
    return util.inspect(output, {colors: true});
  }

  start(done) {
    this.replServer = repl.start({
      prompt: "Embark (" + this.env + ") > ",
      useGlobal: true,
      eval: this.enhancedEval.bind(this),
      writer: this.enhancedWriter.bind(this)
    });

    if (fs.existsSync(this.cmdHistoryFile)) {
      fs.readFileSync(this.cmdHistoryFile)
        .toString()
        .split('\n')
        .reverse()
        .forEach((cmd) => { this.replServer.history.push(cmd); })
    }

    this.events.request("runcode:getContext", (context) => {
      this.replServer.context = context;
    });

    this.replServer.on("exit", () => {
      process.exit();
    });

    this.replServer.defineCommand('history', {
      help: 'Show last history',
      action: function(_n) {
        let n = _n || 10;
        console.log(this.history
                      .slice(0, n)
                      .filter(line => line.trim())
                      .join('\n'));
        this.displayPrompt();
      }
    });

    done();
  }
}

module.exports = REPL;
