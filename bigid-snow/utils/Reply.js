class Reply {
  constructor(code, status, message, data, error, executionId, progress) {
    this.status = code;
    this.statusEnum = status;
    this.data = data;
    this.message = message;
    this.error = error;
    this.executionId = executionId;
    this.progress = progress;
  }
}

module.exports = Reply;
