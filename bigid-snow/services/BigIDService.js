const BigIdAxios = require('../utils/axios/BigID');
const bigIdBO = require('../bo/BigIDBO');
const serviceNOWBO = require('../bo/ServiceNOWBO');
const ScanResultBO = require('../bo/ScanResultBO');
const ServiceNOWService = require('./ServiceNOWService');
const ActionReply = require('../utils/ActionReply');
const Constants = require('../utils/Constants');

class BigIDService {
  import = async context => {
    let _axios = new BigIdAxios(context);
    let _now = new ServiceNOWService();
    let fetchMore = true;
    let respObj = {};

    context.logger.info(`BigIDService.import.start`);
    let credentials = undefined;
    try {
      credentials = await this.fetchFacticeCredentials(context);
    } catch (error) {
      context.logError('BigIDService.import.credentials.fetch.error', error);
      credentials = { success: true, data: { credential_id: '' } };
    }
    let _partURL = '/api/x_biid_mrkt_plugin/functions/datasources/fetch?limit=' + context.recLimit;

    while (fetchMore) {
      context.logger.info(
        `BigIDService.import.before: await _now.fetchServiceNowDatasources(context);`,
      );

      respObj = await _now.fetchServiceNowDatasources(context, _partURL);
      let _nowConnections = respObj._connections;
      context.logger.info(`BigIDService.import._nowConnections ${_nowConnections.length}`);
      _partURL = respObj._nextURL;
      if (_partURL == null) {
        fetchMore = false;
      }
      // context.logger.debug(`BigIDService.import: nowConnections: ${JSON.stringify(_nowConnections)}`);
      // context.logger.debug(`BigIDService.import: _partURL: ${_partURL}`);
      // context.logger.debug(`BigIDService.import: fetchMore flag: ${fetchMore}`);
      context.logger.info(
        `BigIDService.import.after: await _now.fetchServiceNowDatasources(context);`,
      );

      let _bigIdConnectionsResp = await _axios.getAllDataSources(context);
      let _bigIdConnections = {};
      if (_bigIdConnectionsResp.hasOwnProperty('ds_connections')) {
        _bigIdConnections = _bigIdConnectionsResp['ds_connections'];
        _bigIdConnections = bigIdBO.format(_bigIdConnections);
      }

      // context.logger.debug(`BigIDService.import._nowConnections.length: ${_nowConnections.length}`);
      context.logger.debug(
        `BigIDService.import.bigIdConnections: ${
          Object.keys(_bigIdConnections) + Object.values(_bigIdConnections)
        }`,
      );

      context.logger.debug(
        `BigIDService.import.bigIdConnections.length: ${Object.keys(_bigIdConnections).length}`,
      );

      /** update OR create datasource connection record in bigID based on synchronization status. */
      for (let index in _nowConnections) {
        let _payload = undefined;
        let _response = undefined;
        let _connection = _nowConnections[index];

        context.logger.debug(
          `I'm printing:BigIDService.import: _bigIdConnections.found - ${JSON.stringify(
            _connection,
          )}`,
        );
        if (_bigIdConnections.hasOwnProperty(_connection.sys_id)) {
          context.logger.debug(
            `I'm printing inside if{}:BigIDService.import: _bigIdConnections.found - ${JSON.stringify(
              _connection,
            )}`,
          );
          try {
            _payload = bigIdBO.updatePayload(
              _bigIdConnections[_connection.sys_id],
              _connection,
              credentials,
              context,
            );
            _response = await _axios.updateDatasource(
              _bigIdConnections[_connection.sys_id].name,
              _payload,
            );
            // context.logger.info(
            // `Importing existing data-source ${JSON.stringify(_payload)} succeded!`,
            // );
          } catch (_error) {
            context.logError(
              `Importing existing data-source ${JSON.stringify(_payload)} failed`,
              _error,
            );
          }
        } else {
          try {
            // context.logger.debug(`Importing new data-source.credentials ${JSON.stringify(credentials.data)}`);
            _payload = bigIdBO.createPayload(_connection, credentials.data, context);
            _response = await _axios.createDatasource(_payload);
            // context.logger.info(`Importing new data-source ${JSON.stringify(_payload)} succeded!`);
          } catch (_error) {
            context.logError(
              `Importing new data-source ${JSON.stringify(_payload)} failed`,
              _error,
            );
          }
        }
      }
    }
    context.logger.info(`BigIDService.import.end`);
    return Promise.resolve({ success: true });
  };

  export = async context => {
    let _axios = new BigIdAxios(context);
    let _now = new ServiceNOWService();
    context.logger.info(`BigIDService.export.start`);
    context.logger.info(`BigIDService.export => getting BigID connections via getAllDataSources`);
    let response = await _axios.getAllDataSources(context);
    let _bigIDConnections = response.data.ds_connections;
    // context.logger.info(`ABC_MP: _bigIDConnections BigIDService.export.ServiceNOWCIServers ${JSON.stringify(_bigIDConnections)}`);
    context.logger.info(`BigIDService.export.bigIDConnections ${_bigIDConnections.length}`);
    context.logger.info(
      `BigIDService.export => getting ServiceNow CI servers via fetchServiceNOWCIServers`,
    );
    let _ciServers = await _now.fetchServiceNOWCIServers(context);
    let _ciLogicalDataCenters = await _now.fetchServiceNowLogicalDataCenters(context);
    // context.logger.info(`ABC_MP: BigIDService.export.ServiceNOWCIServers ${JSON.stringify(_ciServers)}`);
    context.logger.info(`BigIDService.export.ServiceNOWCIServers ${_ciServers.length}`);
    let _nowCIServer, _dbType, _nowLogicalDataCenter, domain;
    let _serverPayload,
      _instancePayload,
      _irePayload,
      _reconcileResponse,
      _connection,
      _logicalDataCenterPayload;
    try {
      for (let counter in _bigIDConnections) {
        _connection = _bigIDConnections[counter];
        // context.logger.info(
        //   `ABC_MP: _connection BigIDService.export.ServiceNOWCIServers ${JSON.stringify(
        //     _connection,
        //   )}`,
        // );
        // if (
        //   bigIdBO.isTestConnectionSuccessful(_connection) &&
        //   undefined === bigIdBO.serviceNowId(_connection)
        // ) {
        if (undefined === bigIdBO.serviceNowId(_connection)) {
          //remove
          context.logger.debug(`export._bigidConnectionName ${_connection.name}`);
          /** find serviceNOW equivalent database type of bigID database type */
          context.logger.debug(`export._bigidType ${_connection.type}`);
          _dbType = bigIdBO.nowType(_connection.type);
          context.logger.debug(`export._dbType ${_dbType}`);
          /** get matching server record in the service NOW cmbd_ci_server */
          if (_dbType === 'cmdb_ci_cloud_object_storage') {
            if (undefined != _connection['domain']) {
              domain = _connection['domain'];
            } else {
              domain = bigIdBO.nowDomain(_connection.type);
              context.logger.debug(`export._nowLogicalDataCenter: ${domain}`);
            }
            _nowLogicalDataCenter = serviceNOWBO.matchedLogicalDataCenter(
              domain,
              _ciLogicalDataCenters,
              context,
            );
            context.logger.debug(`export._nowLogicalDataCenter: ${_nowLogicalDataCenter}`);
          } else {
            _nowCIServer = serviceNOWBO.matchedCIServer(
              bigIdBO.serverURL(_dbType, _connection['rdb_url']),
              _ciServers,
            );
            // context.logger.debug(`export._nowCIServer: ${_nowCIServer}`);
          }
          if (
            (undefined !== _dbType && undefined !== _nowCIServer) ||
            (_dbType === 'cmdb_ci_cloud_object_storage' && undefined !== _nowLogicalDataCenter)
          ) {
            // @TODO prepare payload and execute reconciliation API. and update serviceNOW sys_id at bigID server.
            let _cdbInstance = undefined;
            if (_dbType === 'cmdb_ci_db_ora_instance') {
              context.logger.debug(`export._bigidDataSource: ${JSON.stringify(_connection)}`);
              let _cdbSysId = bigIdBO.getCDBProperty(_connection, 'cdb_sys_id');
              let _cdbName = bigIdBO.getCDBProperty(_connection, 'cdb_name');
              if (undefined !== _cdbSysId && _cdbSysId !== '') {
                let _encodedQuery = 'sys_id=' + _cdbSysId;
                _cdbInstance = await _now.fetchServiceNowRecordsByEncodedQuery(
                  context,
                  'cmdb_ci_db_ora_instance',
                  _encodedQuery,
                );
                if (_cdbInstance.length > 0) {
                  let _pdbDbType = 'cmdb_ci_db_ora_pdb_instance';
                  let _pdbInstancePayload = bigIdBO.instancePayload(
                    context,
                    _pdbDbType,
                    _connection,
                  );
                  let _cdbInstancePayload = bigIdBO.instancePayload(
                    context,
                    _dbType,
                    _connection,
                    _cdbInstance[0],
                  );
                  if (
                    _serverPayload !== undefined &&
                    _pdbInstancePayload !== undefined &&
                    _cdbInstancePayload !== undefined
                  ) {
                    _irePayload = serviceNOWBO.irePayload(
                      _serverPayload,
                      _pdbInstancePayload,
                      _cdbInstancePayload,
                    );
                  }
                }
              } else if (undefined !== _cdbName && _cdbName !== '') {
                let _encodedQuery = 'name=' + _cdbName;
                _cdbInstance = await _now.fetchServiceNowRecordsByEncodedQuery(
                  context,
                  'cmdb_ci_db_ora_instance',
                  _encodedQuery,
                );
                if (_cdbInstance.length > 0) {
                  let _pdbDbType = 'cmdb_ci_db_ora_pdb_instance';
                  let _pdbInstancePayload = bigIdBO.instancePayload(
                    context,
                    _pdbDbType,
                    _connection,
                  );
                  let _cdbInstancePayload = bigIdBO.instancePayload(
                    context,
                    _dbType,
                    _connection,
                    _cdbInstance[0],
                  );
                  if (
                    _serverPayload !== undefined &&
                    _pdbInstancePayload !== undefined &&
                    _cdbInstancePayload !== undefined
                  ) {
                    _irePayload = serviceNOWBO.irePayload(
                      _serverPayload,
                      _pdbInstancePayload,
                      _cdbInstancePayload,
                    );
                  }
                }
              } else {
                _instancePayload = bigIdBO.instancePayload(context, _dbType, _connection);
                // context.logger.info(
                //   `ABC_MP:PDB export._serverPayload: ${JSON.stringify(_serverPayload)}`,
                // );
                // context.logger.info(
                //   `ABC_MP:PDB export._instancePayload: ${JSON.stringify(_instancePayload)}`,
                // );
                _irePayload = serviceNOWBO.irePayload(_serverPayload, _instancePayload);
                // context.logger.info(
                //   `ABC_MP:PDB export._irePayload: ${JSON.stringify(_irePayload)}`,
                // );
              }
            } else {
              if (_dbType === 'cmdb_ci_cloud_object_storage') {
                _logicalDataCenterPayload =
                  serviceNOWBO.logicalDataCenterPayload(_nowLogicalDataCenter);
                _instancePayload = bigIdBO.instancePayload(context, _dbType, _connection); //onedrive
                _irePayload = serviceNOWBO.ireCloudObjectPayload(
                  _logicalDataCenterPayload,
                  _instancePayload,
                );
              } else {
                _serverPayload = serviceNOWBO.serverPayload(_nowCIServer);
                _instancePayload = bigIdBO.instancePayload(context, _dbType, _connection); //rdb
                _irePayload = serviceNOWBO.irePayload(_serverPayload, _instancePayload);
              }
            }
            context.logger.debug(`export._irePayload: ${JSON.stringify(_irePayload)}`);
            if (_irePayload !== undefined) {
              _reconcileResponse = await _now.identifyReconcile(context, _irePayload);
            } else {
              _reconcileResponse.success = false;
              _reconcileResponse.error = 'Undefined IRE payload';
            }
            /** using IRResponse and payload synchronize BigId datasource at bigId server. */
            if (true == _reconcileResponse.success) {
              context.logger.debug(
                `export._reconcileResponse.response.success: ${JSON.stringify(_reconcileResponse)}`,
              );
              await _axios.updateDatasource(
                _connection.name,
                bigIdBO.synchronizeNowBigIdPayload(_connection, _reconcileResponse, _cdbInstance),
              );
            } else {
              context.logger.debug(
                `export._reconcileResponse.response.failure: ${JSON.stringify(_reconcileResponse)}`,
              );
            }
          }
          // }
        } //remove comments
      }

      context.logger.info(`BigIDService.export.end`);
      return Promise.resolve({ success: true });
    } catch (_error) {
      context.logger.error(`error.export: ${_error.message}`);
      return Promise.reject({ success: false, message: _error.message });
    }
  };

  savedQueries = async context => {
    try {
      let _axios = new BigIdAxios(context);
      let _queriesToBeDeleted = new Array();
      context.logger.info(`BigIDService.savedQueries.start`);
      let _savedQueries = await _axios.fetchSavedQueries();
      _savedQueries = _savedQueries.filter(_query => 'sensitivity_level' === _query['tag_name']);
      let _existingSensitivityLevelConfiguration =
        bigIdBO.fetchExistingSensitivityLevelConfiguration(context);
      let _found, _foundIndex;
      _savedQueries.forEach(_query => {
        (_found = false), (_foundIndex = -1);
        _existingSensitivityLevelConfiguration.forEach((_existing, _index) => {
          if (_existing['tag_value'] === _query['tag_value']) {
            (_found = true), (_foundIndex = _index);
            return;
          }
        });

        if (true === _found) _existingSensitivityLevelConfiguration.splice(_foundIndex, 1);
        else _queriesToBeDeleted.push(_query['_id']);
      });

      /** delete saved queries not configured in the system. */
      context.logger.debug(
        `BigIDService.savedQueries._queriesToBeDeleted ${JSON.stringify(_queriesToBeDeleted)}`,
      );
      await this.deleteSavedQuery(context, _queriesToBeDeleted);

      /** insert newly configured queries */
      context.logger.debug(
        `BigIDService.savedQueries._existingSensitivityLevelConfiguration ${JSON.stringify(
          _existingSensitivityLevelConfiguration,
        )}`,
      );
      await this.createSavedQuery(context, _existingSensitivityLevelConfiguration);

      context.logger.info(`BigIDService.savedQueries.end`);
      return Promise.resolve({ success: true });
    } catch (_error) {
      context.logger.error(`error.savedQueries: ${_error.message}`);
      return Promise.reject({ success: false, message: _error.message });
    }
  };

  createSavedQuery = async (context, queriesToBeCreated) => {
    try {
      let _axios = new BigIdAxios(context);
      for (let counter = 0; counter < queriesToBeCreated.length; counter++) {
        await _axios.createSavedQuery(queriesToBeCreated[counter]);
      }
    } catch (_error) {
      context.logger.error(`createSavedQuery.error: ${_error.message}`);
    }
  };

  deleteSavedQuery = async (context, queriesToBeDeleted) => {
    try {
      let _axios = new BigIdAxios(context);
      for (let counter = 0; counter < queriesToBeDeleted.length; counter++) {
        await _axios.deleteSavedQuery(queriesToBeDeleted[counter]);
      }
    } catch (_error) {
      context.logger.error(`deleteSavedQuery.error: ${_error.message}`);
    }
  };

  sync = async context => {
    try {
      let _axios = new BigIdAxios(context);
      let _scanResultBO = new ScanResultBO(context);

      /** validate saved-queries and configuration - start */
      let _savedQueries = await _axios.fetchSavedQueries();
      _savedQueries = _savedQueries.filter(_query => 'sensitivity_level' === _query['tag_name']);
      let _existingSensitivityLevelConfiguration =
        bigIdBO.fetchExistingSensitivityLevelConfiguration(context);
      let _validated = _scanResultBO.validateSavedQueryConfiguration(
        _savedQueries,
        _existingSensitivityLevelConfiguration,
      );
      if (false === _validated.success)
        return Promise.reject({
          success: false,
          message: `Please run the "Create Sensitivity Level Saved Query" action and apply the tags before using this action.`,
        });
      /** validate saved-queries and configuration - end */
      let response = await _axios.getAllDataSources(context);
      let _bigIDConnections = response.data.ds_connections;
      let _scanResults = await _axios.fetchScanResults(context);
      _axios.updateStatus(
        context.executionId,
        new ActionReply(
          context.executionId,
          Constants.Status.IN_PROGRESS,
          0.1,
          `action.${context.actionName} is executing`,
        ),
      );
      await _scanResultBO.syncScanResults(_bigIDConnections, _scanResults, context);
      return Promise.resolve({ success: true });
    } catch (_error) {
      context.logger.error(`error.sync: ${_error.message}`);
      return Promise.reject({ success: false, message: _error.message });
    }
  };

  fetchFacticeCredentials = async context => {
    let credentials = {};
    let response = {};
    try {
      let _axios = new BigIdAxios(context);
      response = await _axios.fetchFacticeCredentials(Constants.FACTICE_CREDENTIALS_ID);
      credentials = response.data;
      if (!credentials.hasOwnProperty('credential_id')) {
        credentials = await _axios.createFacticeCredentials(Constants.FACTICE_CREDENTIALS_ID);
      }
      return Promise.resolve({ success: true, data: credentials });
    } catch (_error) {
      context.logError('fetchFacticeCredentials.error', _error);
      return Promise.reject({ success: false, message: _error.message }); //pending to review for handling
    }
  };
}

module.exports = BigIDService;
