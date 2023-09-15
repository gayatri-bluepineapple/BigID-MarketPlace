const axios = require('axios').default;
const Constants = require('../Constants');
const fs = require('fs');
const FormData = require('form-data');
const POST = 'POST';
const GET = 'GET';
const DELETE = 'DELETE';
const PUT = 'PUT';

class BigID {
  _headers = undefined;
  _options = undefined;
  _axios = undefined;
  _context = undefined;

  constructor(context) {
    this._context = context;
    this._headers = {
      Accept: 'application/json, text/plain, */*',
      'Content-Type': 'application/json',
      Authorization: context.bigidToken,
    };

    this._options = {
      headers: this._headers,
      baseURL: null !== context && undefined !== context ? context.bigidBaseUrl : undefined,
      httpsAgent: new require('https').Agent({ rejectUnauthorized: false }),
    };

    this._axios = axios.create(this._options);
    this._axios.interceptors.request.use(
      _config => {
        if (_config.headers.common == undefined) {
          _config.headers['Accept'] = '*/*';
          _config.headers['accept-encoding'] = '*';
        } else {
          _config.headers.common['Accept'] = '*/*';
          _config.headers.common['accept-encoding'] = '*';
        }
        return _config;
      },
      _error => {
        return Promise.reject(_error);
      },
    );
  }

  get axios() {
    return this._axios;
  }

  updateDatasource = async (name, payload) => {
    let _partURL = 'ds_connections/' + name;
    return new Promise((resolve, reject) => {
      this.__axiosCall(PUT, _partURL, payload)
        .then(_response => {
          resolve({ success: true });
        })
        .catch(_error => {
          reject({ success: false });
        });
    });
  };

  fetchSavedQueries = async () => {
    return new Promise((resolve, reject) => {
      this._axios
        .get(`saved-queries`)
        .then(_response => {
          resolve(_response.data);
        })
        .catch(_error => {
          this._context.logger.error(`createDatasource.failure: ${_error.message}`);
          reject({ success: false });
        });
    });
  };

  deleteSavedQuery = async id => {
    return new Promise((resolve, reject) => {
      this._axios
        .delete(`saved-queries/${id}`)
        .then(_response => {
          resolve(_response.data);
        })
        .catch(_error => {
          this._context.logger.error(`deleteSavedQuery.failure: ${_error.message}`);
          reject({ success: false });
        });
    });
  };

  createSavedQuery = async payload => {
    return new Promise((resolve, reject) => {
      this._axios
        .post(`saved-queries`, payload)
        .then(_response => {
          resolve({ success: true });
        })
        .catch(_error => {
          this._context.logger.error(`createSavedQuery.failure: ${_error.message}`);
          reject({ success: false });
        });
    });
  };

  uploadAttachment = async (executionId, file) => {
    let formData = new FormData();
    formData.append('file', fs.createReadStream(file));
    this._axios.defaults.headers[
      'Content-Type'
    ] = `multipart/form-data; boundary=${formData._boundary}`;
    return new Promise((resolve, reject) => {
      this._axios
        .post(`tpa/executions/${executionId}/attachment`, formData)
        .then(_response => {
          resolve({ success: true });
        })
        .catch(_error => {
          this._context.logger.error(`upload.attachment.failure: ${_error.message}`);
          reject({ success: false });
        });
    });
  };

  updateStatus = async (executionId, reply) => {
    let _payload = {
      executionId: reply.executionId,
      statusEnum: reply.statusEnum,
      progress: reply.progress,
      message: reply.message,
    };
    return new Promise((resolve, reject) => {
      this._axios
        .put(`tpa/executions/${executionId}`, _payload)
        .then(_response => {
          resolve({ success: true });
        })
        .catch(_error => {
          this._context.logger.error(`updateStatus.failure: ${_error.message}`);
          reject({ success: false });
        });
    });
  };

  createDatasource = async payload => {
    let _partURL = 'ds_connections';
    return new Promise((resolve, reject) => {
      this.__axiosCall(POST, _partURL, payload)
        .then(_response => {
          resolve({ success: true });
        })
        .catch(_error => {
          reject({ success: false });
        });
    });
  };

  getAllDataSources = async context => {
    let _partURL = 'ds_connections';
    let _payload = { params: { filter: Constants.BIG_ID_DATASOURCE_FILTER } };
    return this.__axiosCall(GET, _partURL, _payload);
  };

  _fixVeryBadJSON = _input => {
    try {
      _input = _input.replace(/\]\[/g, ',');
      return JSON.parse(_input);
    } catch (err) {
      return _input;
    }
  };

  fetchScanResults = async context => {
    return new Promise((resolve, reject) => {
      this._axios
        // .get('scan-result/stream/json')
        .get('/scan-result/stream/json/full?limit=100&skip=0')
        .then(_response => {
          // let response = this._fixVeryBadJSON(_response.data)
          let response = _response.data;
          context.logger.debug(`Response: ${JSON.stringify(response)}`);
          resolve(response);
        })
        .catch(_error => {
          this._context.logger.error(`BigID.fetchScanResults.reject.error: ${_error.message}`);
          reject(_error);
        });
      // .finally(() => {});
    });
  };

  fetchFacticeCredentials = async credentialId => {
    let _partURL = 'credentials/' + credentialId;
    return this.__axiosCall(GET, _partURL);
  };

  createFacticeCredentials = async credentialId => {
    let payload = {
      credential_id: credentialId,
      type: 'simple',
      username: 'factice',
      password: 'factice',
      scopes: ['root'],
    };
    let _partURL = 'credentials';
    return new Promise((resolve, reject) => {
      this.__axiosCall(POST, _partURL, payload)
        .then(_response => {
          resolve(payload);
        })
        .catch(_error => {
          reject(_error);
        });
    });
  };

  __axiosCall = async (_method, _partURL, _payload, _retry = 0) => {
    try {
      var _response = undefined;

      if (_method == 'GET') {
        _response = await this._axios.get(_partURL);
      } else if (_method == 'POST') {
        _response = await this._axios.post(_partURL, _payload);
      } else if (_method == 'DELETE') {
        _response = await this._axios.delete(_partURL);
      } else if (_method == 'PUT') {
        _response = await this._axios.put(_partURL, _payload);
      }

      if (_response.status >= 200 && _response.status < 300) {
        // successful response
        this._context.logger.debug(
          `I'm printing this:BigIDAxios.__axiosCall._response ${JSON.stringify(_response.data)}`,
        );
        return Promise.resolve(_response);
      } else {
        // BigID responded with a problem
        let message = `Error __axiosCall: Status Code = ${_response.status} | Message = ${_response.statusText}`;
        this._context.logger.error(message);
        return Promise.reject({ success: false, message: message, response: _response });
      }
    } catch (_error) {
      this._context.logger.error(
        `Error BigIDAxios.__axiosCall: Status code: ${_error.response.status} and message: ${_error.message}`,
      );
      this._context.logger.debug(
        `BigIDAxios.__axiosCall: error data: ${JSON.stringify(_error.response.data)}`,
      );
      if (_error.response.status == 401 && _retry <= Constants.UPPER_LIMIT) {
        this._initaxios();
        await this._context.init();
        _retry++;
        return this.__axiosCall(_method, _partURL, _payload, _retry);
      }
      return Promise.reject({ success: false, message: _error.message, response: _error.response });
    }
  };

  _initaxios = () => {
    try {
      this._axios = axios.create(this._options);
      this._axios.interceptors.request.use(
        _config => {
          if (_config.headers.common == undefined) {
            _config.headers['Accept'] = '*/*';
            _config.headers['accept-encoding'] = '*';
          } else {
            _config.headers.common['Accept'] = '*/*';
            _config.headers.common['accept-encoding'] = '*';
          }
          return _config;
        },
        _error => {
          return Promise.reject(_error);
        },
      );
    } catch (_err) {
      return this._context.logger.error(
        `Error fetching BigIDAxios._initaxios: Status code: ${_err.response.status} and message: ${_err.message}`,
      );
    }
  };
}

module.exports = BigID;
