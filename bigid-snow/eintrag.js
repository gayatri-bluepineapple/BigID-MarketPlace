const _express = require('express');
const _path = require('path');
const _http = require('http');
const ActionReply = require('./utils/ActionReply');
const Constants = require('./utils/Constants');
const BigIdAxios = require('./utils/axios/BigID');

const ExecutionService = require('./services/ExecutionService');
const Context = require('./utils/Context');

const _port = 8083;
const _application = _express();
_application.use(_express.json());
_application.use(_express.urlencoded({ extended: false }));
_application.use(_express.static(_path.join(__dirname, 'public')));
_application.set('port', _port);

/** register routes for server. /execute is entry point to the application. */
_application.route('/execute').post(async (_request, _response, _next) => {
  let _context = new Context(_request);
  try {
    await _context.init(); 
    new ExecutionService()
      .action(_request, _context)
      .then(_reply => {
        let _message;
        if (undefined !== _reply && null !== _reply) {
          if (_reply.hasOwnProperty('success') && true === _reply.success) {
            _context.logger.info(`reply.success: ${JSON.stringify(_reply)}`);
            _message =
              _reply.hasOwnProperty('message') && _reply.message
                ? _reply.message
                : `action.${_context.actionName} completed successfully - executionId: ${_context.executionId}`;
            new BigIdAxios(_context).updateStatus(
              _context.executionId,
              new ActionReply(
                _context.executionId,
                Constants.Status.COMPLETED,
                Constants.ACTION_COMPLETED,
                _message,
              ),
            );

            /** upload log file to the action instance with executionId */
            new BigIdAxios(_context).uploadAttachment(
              _context.executionId,
              `./logs/${_context.logFileName}`,
            );
            return _response
              .status(200)
              .send(
                new ActionReply(
                  _context.executionId,
                  Constants.Status.COMPLETED,
                  Constants.ACTION_COMPLETED,
                  _message,
                ),
              );
          } else {
            _context.logger.error(`reply.failure: ${JSON.stringify(_reply)}`);
            _message =
              _reply.hasOwnProperty('message') && _reply.message
                ? _reply.message
                : `action.${_context.actionName} error occured during execution - executionId: ${_context.executionId}`;
            new BigIdAxios(_context).updateStatus(
              _context.executionId,
              new ActionReply(
                _context.executionId,
                Constants.Status.ERROR,
                Constants.ACTION_COMPLETED,
                _message,
              ),
            );

            /** upload log file to the action instance with executionId */
            new BigIdAxios(_context).uploadAttachment(
              _context.executionId,
              `./logs/${_context.logFileName}`,
            );
            return _response
              .status(500)
              .send(
                new ActionReply(
                  _context.executionId,
                  Constants.Status.ERROR,
                  Constants.ACTION_COMPLETED,
                  _message,
                ),
              );
          }
        } else {
          _context.logger.error(`reply.failure: executionId - ${_context.executionId}`);
          _message = `action.${_context.actionName} failed - executionId: ${_context.executionId}`;

          /** upload log file to the action instance with executionId */
          new BigIdAxios(_context).uploadAttachment(
            _context.executionId,
            `./logs/${_context.logFileName}`,
          );
          return _response
            .status(500)
            .send(
              new ActionReply(
                _context.executionId,
                Constants.Status.COMPLETED,
                Constants.ACTION_COMPLETED,
                _message,
              ),
            );
        }
      })
      .catch(_error => {
        if (_error.response) {
          // request made and server responded
          _context.logger.error(`reply.error: _error.response => ${JSON.stringify(_error.response)}`);
        } else if (_error.request) {
          // request made but no response received
          _context.logger.error(`reply.error: _error.request => ${JSON.stringify(_error.request)}`);
        } else {
          // something happened in setting up the request that triggered an error
          _context.logger.error(`reply.error: ${_error.message}`);
        }
        //_context.logger.error(`reply.error: ${JSON.stringify(_error)}`);
        _message =
          _error.hasOwnProperty('message') && _error.message
            ? _error.message
            : `action.${_context.actionName} error occured during execution - executionId: ${_context.executionId}`;
        new BigIdAxios(_context).updateStatus(
          _context.executionId,
          new ActionReply(
            _context.executionId,
            Constants.Status.ERROR,
            Constants.ACTION_COMPLETED,
            _message,
          ),
        );

        /** upload log file to the action instance with executionId */
        new BigIdAxios(_context).uploadAttachment(
          _context.executionId,
          `./logs/${_context.logFileName}`,
        );
        return _response
          .status(500)
          .send(
            new ActionReply(
              _context.executionId,
              Constants.Status.ERROR,
              Constants.ACTION_COMPLETED,
              _message,
            ),
          );
      });
  } catch (_error) {
    _context.logger.error(`servicenow.fetch.accessToken: Status code: ${_error} and message: ${_error.response.message}`);
    new BigIdAxios(_context).updateStatus(
      _context.executionId,
      new ActionReply(
        _context.executionId,
        Constants.Status.ERROR,
        Constants.ACTION_COMPLETED,
        _error.message,
      ),
    );

    /** upload log file to the action instance with executionId */
    new BigIdAxios(_context).uploadAttachment(
      _context.executionId,
      `./logs/${_context.logFileName}`,
    );
  } finally {
  }
});

_application.route('/').get((_request, _response, _next) => {
  console.log('Request: ', _request);
});
_application.route('/logs').get((_request, _response, _next) => {
  return _response.status(200).send('Log Stream');
});

const _server = _http
  .createServer(_application)
  .listen(_port)
  .on('listening', () => {
    console.log('Application has started on port: ', _server.address().port);
  });
