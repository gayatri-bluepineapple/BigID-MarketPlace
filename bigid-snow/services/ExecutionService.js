const BigIDService = require('./BigIDService');
const ServiceNOWService = require('./ServiceNOWService');

class ExecutionService {
  constructor() {
    this.bigId = new BigIDService();
    this.serviceNow = new ServiceNOWService();
  }
  async action(request, context) {
    let _reply = undefined;
    let action =
      null !== context && undefined !== context ? context.actionName.toUpperCase() : undefined;
    switch (action) {
      case 'IMPORT DATASOURCES':
        try {          
            _reply = await this.bigId.import(context);
            return Promise.resolve(_reply);
        } catch (_error) {
          context.logError('action.import.error', _error);
          return Promise.reject({ success: false, message: _error.message });
        }

      case 'EXPORT DATASOURCES':
        try {
          let _reply = await this.bigId.export(context);
          return Promise.resolve(_reply);
        } catch (_error) {
          if (_error.response) {
            // request made and server responded
            context.logger.error(`action.export.error: _error.response => ${JSON.stringify(_error.response)}`);
          } else if (_error.request) {
            // request made but no response received
            context.logger.error(`action.export.error: _error.request => ${JSON.stringify(_error.request)}`);
          } else {
            // something happened in setting up the request that triggered an error
            context.logger.error(`action.export.error: ${_error.message}`);
          }

          return Promise.reject({ success: false, message: _error.message });
        }

      case 'CREATE SENSITIVITY LEVEL SAVED QUERY':
        try {
          let _reply = await this.bigId.savedQueries(context);
          return Promise.resolve(_reply);
        } catch (_error) {
          context.logger.error(`action.savedQuery.error: ${_error}`);
          return Promise.reject({ success: false, message: _error.message });
        }

      case 'SYNC SENSITIVITY LEVEL':
        try {
          let _reply = await this.bigId.sync(context);
          return Promise.resolve(_reply);
        } catch (_error) {
          context.logger.error(`action.sync.error: ${JSON.stringify(_error)}`);
          return Promise.reject({ success: false, message: _error.message });
        }

      default:
        context.logger.error(`action.error: ${action} not found please try again`);
        break;
    }
  }
}

module.exports = ExecutionService;
