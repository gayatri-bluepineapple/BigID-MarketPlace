class ActionReply {
  constructor(executionId, statusEnum, progress, message) {
    this.executionId = executionId;
    this.statusEnum = statusEnum;
    this.progress = progress;
    this.message = message;
  }
}

module.exports = ActionReply;
