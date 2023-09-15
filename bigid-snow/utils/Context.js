const serviceNOW = require('../utils/axios/ServiceNOW');
const winston = require('winston');
const { combine, timestamp, printf } = winston.format;

const loggerFormat = printf(({ level, message, timestamp }) => {
  return `${level} - ${timestamp} - ${message}`;
});

class Context {
  constructor(request) {
    let _parameters = request.body;
    this.actionName = _parameters.actionName;
    this.executionId = _parameters.executionId;
    this.globalParams = this.parse(_parameters.globalParams);
    this.actionParams = this.parse(_parameters.actionParams);
    this.bigidBaseUrl = _parameters.bigidBaseUrl;
    this.debug = this.globalParams.hasOwnProperty('Debug') ? this.globalParams['Debug'] : 'no';
    this.recLimit = this.globalParams.hasOwnProperty('BatchSize') ? this.globalParams['BatchSize'] : 200;
    this.bigidToken = _parameters.bigidToken;
    this.updateResultCallback = _parameters.updateResultCallback;
    this.tpaId = _parameters.tpaId;
    this.serviceNOWAxios = new serviceNOW(this);
    this.logFileName = `${this.actionName.replace(/\s+/g, '-').toLowerCase()}.${
      this.executionId
    }.log`;
    this.logger = winston.createLogger({
      level: 'yes' === this.debug.toLowerCase() ? 'debug' : 'info',
      format: combine(timestamp(), loggerFormat),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: `./logs/${this.logFileName}` }),
      ],
    });
    this.usersToAssociate = [];
    this.logger.info(`context.initialized.debug.mode: ${JSON.stringify(this.debug)}`);
  }

  setUserToAssociate(users) {

    this.usersToAssociate = users;
    
  }

  init = async () => {
    await this.serviceNOWAxios.fetchServiceNowAccessToken();
  };

  parse(_parameters) {
    let _list = [];
    if (undefined === _parameters || null === _parameters) return _list;
    _parameters.forEach(_parameter => {
      _list[_parameter.paramName] = _parameter.paramValue;
    });

    return _list;
  }

  static getInstance(request) {
    return new Context(request);
  }

  logError(message, error) {
    try{
    this.logger.error(`${message} : ${error?.message??" "} : ${error?.response?.status??" "} : ${JSON.stringify(error?.request??" ")}`);
    } catch (_error) {
      this.logger.error(`Error in logError: ${_error.message}`);
    }
  }
}

module.exports = Context;
