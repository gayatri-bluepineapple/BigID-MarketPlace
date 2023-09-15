const axios = require('axios');
const Constants = require('../Constants');
const url = require('url');
const POST = 'POST';
const GET = 'GET';
const DELETE = 'DELETE';
const PUT = 'PUT';

class ServiceNOW {
  _globalParameters = undefined;
  _dbTypes = undefined;
  _options = undefined;
  _headers = undefined;
  _axios = undefined;
  _context = undefined;

  constructor(context) {
    this._globalParameters = context.globalParams;
    let dbTypesStr = context.actionParams['DBTypes'];
    if (!dbTypesStr || dbTypesStr.toUpperCase() === 'ALL') {
      this._dbTypes = [];
    } else {
      this._dbTypes = dbTypesStr
        .toLowerCase()
        .split(',')
        .map(item => item.trim());
    }

    this._headers = { Accept: '*/*' };
    this._context = context;
    this._options = {
      headers: this._headers,
      baseURL: context.globalParams['ServiceNowBaseURL'],
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

  fetchServiceNOWCIServers = async () => {
    let _partURL = '/api/now/table/cmdb_ci_server';
    let _parameters = { sysparm_exclude_reference_link: true };
    let _response = undefined;
    try {
      _response = await this._axios.get(_partURL, { params: _parameters });

      //console.log('ABC_MP:', JSON.stringify(_response.data.result));

      return Promise.resolve(_response.data.result);
    } catch (_error) {
      this._context.logger.error(`Error fetching CI Servers: ${_error.message}`);
      return Promise.reject(_error);
    }
  };

  fetchServiceNowLogicalDataCenters = async () => {
    let _partURL = '/api/now/table/cmdb_ci_logical_datacenter';
    let _parameters = { sysparm_exclude_reference_link: true };
    let _response = undefined;
    try {
      _response = await this._axios.get(_partURL, { params: _parameters });
      return Promise.resolve(_response.data.result);
    } catch (_error) {
      this._context.logger.error(`Error fetching CI Servers: ${_error.message}`);
      return Promise.reject(_error);
    }
  };

  delete = async (table, sysId) => {
    let _partURL = `/api/now/table/${table}/${sysId}`;

    let _response = undefined;

    try {
      _response = await this._axios.delete(_partURL);
      return Promise.resolve(_response);
    } catch (_error) {
      this._context.logger.error(`Error deleting Record: ${_error.message}`);
      return Promise.reject(_error);
    }
  };

  fetchServiceNowRecordsByEncodedQuery = async (table, encodedQuery) => {
    let _partURL = `/api/now/table/${table}`;
    let _parameters = {
      sysparm_query: encodedQuery,
      sysparm_display_value: 'all',
    };

    let _response = undefined;

    try {
      _response = await this._axios.get(_partURL, { params: _parameters });
      return Promise.resolve(_response.data.result);
    } catch (_error) {
      this._context.logger.error(`error.fetchServiceNowRecordsByEncodedQuery: ${_error.message}`);
      return Promise.reject(_error);
    }
  };

  fetchServiceNowDatasourceByEncodedQuery = async encodedQuery => {
    let _partURL = '/api/now/table/cmdb_rel_ci';
    let _paramFields =
      'sys_id, child.sys_id, parent.sys_id, parent.db_name, parent.sid, parent.name, child.name, child.ip_address, child.host_name, parent.sys_class_name, parent.operational_status, parent.tcp_port';
    let _parameters = {
      sysparm_query: encodedQuery,
      sysparm_fields: _paramFields,
      sysparm_display_value: 'all',
    };

    let _response = undefined;

    try {
      _response = await this._axios.get(_partURL, { params: _parameters });
      return Promise.resolve(_response.data.result);
    } catch (_error) {
      this._context.logger.error(
        `fetchServiceNowDatasourceByEncodedQuery.Error.fetching.datasources: ${_error.message}`,
      );
      return Promise.reject(_error);
    }
  };

  fetchServiceNowDatasources = async (context, _partURL) => {
    try {
      this._context.logger.debug(`ServiceNowAxios.fetchServiceNowDatasources.start`);
      this._context.logger.debug(`bigId JSON _partURL ${_partURL}`);

      var elements = [],
        _response = {};

      /** initialize _filter with globalParameter value else undefined. */
      let _filter = !context.globalParams['Filter'] ? {} : context.globalParams['Filter'];
      try {
        _filter = JSON.parse(_filter);
      } catch (_error) {
        _filter = {};
      }
      this._context.logger.info(
        `ServiceNowAxios.fetchServiceNowDatasources._filter ${JSON.stringify(_filter)}`,
      );

      /** initialize _dataCenters with globalParameter value else undefined. */
      let _dataCenters =
        !context.globalParams['DataCenter'] ||
        'ALL' === context.globalParams['DataCenter'].toUpperCase()
          ? []
          : context.globalParams['DataCenter']
              .split(',')
              .map(center => center.trim().toLowerCase());
      this._context.logger.debug(
        `ServiceNowAxios.fetchServiceNowDatasources._dataCenters ${JSON.stringify(_dataCenters)}`,
      );

      Constants.Types.forEach(ele => {
        if (
          this._dbTypes.length === 0 ||
          this._dbTypes.includes(ele.bigid_name.replace('rdb-', ''))
        ) {
          elements.push(ele.sn_name);
        }
      });
      this._context.logger.debug(
        `ServiceNowAxios.fetchServiceNowDatasources._dbTypes ${JSON.stringify(elements)}`,
      );

      /** initialize _pdbFilter with globalParameter value else empty string. */
      let _pdbFilter =
        !context.globalParams['PDBFilter'] ||
        'ALL' === context.globalParams['PDBFilter'].toUpperCase()
          ? []
          : context.globalParams['PDBFilter'].split(',').map(center => center.trim().toLowerCase());
      this._context.logger.debug(
        `ServiceNowAxios.fetchServiceNowDatasources._pdbFilter ${JSON.stringify(_pdbFilter)}`,
      );

      let _payload = ``;
      _payload = {
        dbTypes: elements,
        filter: _filter,
        dataCenters: _dataCenters,
        pdbFilter: _pdbFilter,
      };

      _response = await this.__axiosCall(POST, _partURL, _payload);

      if (_response.data.hasOwnProperty('result')) return _response.data.result;
    } catch (_error) {
      if (_error.response) {
        // request made and server responded
        this._context.logger.error(
          `Error fetching datasources: _error.response => ${JSON.stringify(_error.response)}`,
        );
      } else if (_error.request) {
        // request made but no response received
        this._context.logger.error(
          `Error fetching datasources: _error.request => ${JSON.stringify(_error.request)}`,
        );
      } else {
        // something happened in setting up the request that triggered an error
        this._context.logger.error(`Error fetching datasources: ${_error.message}`);
      }
      return Promise.reject(_error);
    }
  };

  __axiosCall = async (_method, _partURL, _payload, _retry = 0) => {
    try {
      var _response = undefined;

      switch (_method) {
        case 'GET':
          _response = await this._axios.get(_partURL, _payload);
          break;
        case 'POST':
          _response = await this._axios.post(_partURL, _payload);
          break;
        case 'PUT':
          _response = await this._axios.put(_partURL, _payload);
          break;
        case 'DELETE':
          _response = await this._axios.delete(_partURL);
          break;
        default:
          context.logger.error(
            `ServiceNOW.__axiosCall.error: HTTP ${_method} not found please try again`,
          );
          break;
      }

      if (_response.status >= 200 && _response.status < 300) {
        // successful response
        this._context.logger.debug(
          `ServiceNowAxios.__axiosCall._response ${JSON.stringify(_response.data)}`,
        );
        return Promise.resolve(_response);
      } else {
        // ServiceNow responded with a problem
        let message = `Error __axiosCall: Status Code = ${_response.status} | Message = ${_response.statusText}`;
        this._context.logger.error(message);
        return Promise.reject({ success: false, message: message, response: _response });
      }
    } catch (_error) {
      this._context.logger.error(
        `Error __axiosCall: Status code: ${_error.response.status} and message: ${_error.message}`,
      );
      this._context.logger.debug(
        `__axiosCall: error data: ${JSON.stringify(_error.response.data)}`,
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
        `Error fetching _initaxios: Status code: ${_err.response.status} and message: ${_err.message}`,
      );
    }
  };

  fetchServiceNowAccessToken = async () => {
    /** populate servicenow request parameters to fetch access token. */
    let _partURL = '/oauth_token.do';
    let _parameters = {
      grant_type: Constants.GrantType.PASSWORD,
      client_id: this._globalParameters['ServiceNowConnectedAppId'],
      client_secret: this._globalParameters['ServiceNowConnectedAppSecret'],
      username: this._globalParameters['ServiceNowUsername'],
      password: this._globalParameters['ServiceNowPassword'],
    };

    let _data = new url.URLSearchParams(_parameters);

    /** return promise either with rejected due to error or resolved with oauth details. */

    return new Promise((_resolve, _reject) => {
      this._axios
        .post(_partURL, _data.toString())
        .then(_response => {
          this._axios.defaults.headers.Authorization = `${_response['data']['token_type']} ${_response['data']['access_token']}`;
          _resolve(_response['data']);
        })
        .catch(_error => {
          this._context.logger.error(
            `Error fetching accessToken from ServiceNow: ${_error.message}`,
          );
          _reject(_error);
        });
    });
  };

  //payload:instance, server, relation
  identifyReconcile = async payload => {
    let _partURL = `/api/now/identifyreconcile?sysparm_data_source=${Constants.DATASOURCE_DISCOVER_SOURCE}`;
    let _response;
    try {
      _response = await this._axios.post(_partURL, payload);
      return Promise.resolve(_response.data.result);
    } catch (_error) {
      this._context.logger.error(`identifyReconcile.axios.get.error: ${_error}`);
      return Promise.reject(_error);
    }
  };

  /** API endpoint: serviceNow marketplace plugin
   * usage: bulk delete of serviceNow Sensitivity at information object and catalog level.
   */
  clearSensitivity = async instanceCatalogs => {
    let _partURL = `/api/x_biid_mrkt_plugin/functions/clear/sensitivity`;
    let _response;

    try {
      this._context.logger.info(`clearSensitivity.payload: ${JSON.stringify(instanceCatalogs)}`);
      _response = await this._axios.post(_partURL, instanceCatalogs);
      return Promise.resolve(_response.data.result);
    } catch (_error) {
      this._context.logger.error(`clearSensitivity.error: ${_error}`);
      return Promise.reject(_error);
    }
  };

  /** API endpoint: serviceNow marketplace plugin
   * usage: bulk delete of serviceNow stale catalogs.
   */
  clearStaleCatalogs = async instanceCatalogs => {
    let _partURL = `/api/x_biid_mrkt_plugin/functions/clear/stale/catalogs`;
    let _response;

    try {
      this._context.logger.info(`clearStaleCatalogs.payload: ${JSON.stringify(instanceCatalogs)}`);
      _response = await this._axios.post(_partURL, instanceCatalogs);
      return Promise.resolve(_response.data.result);
    } catch (_error) {
      this._context.logger.error(`clearStaleCatalogs.error: ${_error}`);
      return Promise.reject(_error);
    }
  };

  /** API endpoint: serviceNow marketplace plugin
   * usage: bulk delete of serviceNow stale information objects.
   */
  clearStaleInformationObjects = async ireResponseItems => {
    let _partURL = `/api/x_biid_mrkt_plugin/functions/clear/stale/informationObjects`;
    let _response;

    try {
      _response = await this._axios.post(_partURL, ireResponseItems);
      return Promise.resolve(_response.data.result);
    } catch (_error) {
      this._context.logger.error(`clearStaleInformationObjects.error: ${_error}`);
      return Promise.reject(_error);
    }
  };
}

module.exports = ServiceNOW;
