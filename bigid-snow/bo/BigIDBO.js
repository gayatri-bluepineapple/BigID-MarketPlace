const Constants = require('../utils/Constants');
class BigIdBO {
  updatePayload = (bigIDConnection, nowConnection, credentials, context) => {
    try {
      let _name = bigIDConnection.name;

      // owners attribute is required / mandatory in the payload for update request to BigID.API
      let payload = {
        ds_connection: {
          owners: bigIDConnection.owners,
          name: _name,
          rdb_url: nowConnection.connection_url,
          enabled: nowConnection.operational_status,
        },
      };
      if (nowConnection.hasOwnProperty('cdb_sys_id')) {
        let customFields = [
          { field_name: 'servicenow_id', field_type: 'clear', field_value: nowConnection.sys_id },
          { field_name: 'cdb_sys_id', field_type: 'clear', field_value: nowConnection.cdb_sys_id },
          { field_name: 'cdb_name', field_type: 'clear', field_value: nowConnection.cdb_name },
        ];
        let dsConnection = payload['ds_connection'];
        dsConnection['custom_fields'] = customFields;
      }
      context.logger.debug(`updatePayload Payload: ${JSON.stringify(payload)}`);
      return payload;
    } catch (error) {
      context.logError('BigIdBO updatePayload failed', error);
    }
  };

  parseActionParameters = (actionParams, context) => {
    let local = Object.assign({}, actionParams);
    local['ScanConnectionTimeout'] = parseInt(local['ScanConnectionTimeout']);
    local['SampleScanDataMaxSize'] = parseInt(local['SampleScanDataMaxSize']);
    local['NumberOfParsingThreads'] = parseInt(local['NumberOfParsingThreads']);
    local['StopOnFailure'] =
      local['StopOnFailure'] && 'yes' === local['StopOnFailure'].toLowerCase();
    local['EnableEnrichment'] =
      local['EnableEnrichment'] && 'yes' === local['EnableEnrichment'].toLowerCase();
    local['EnableClassification'] =
      local['EnableClassification'] && 'yes' === local['EnableClassification'].toLowerCase();
    local['EnableStructuredClustering'] =
      local['EnableStructuredClustering'] &&
      'yes' === local['EnableStructuredClustering'].toLowerCase();
    local['DisableRowIdentifierExpression'] =
      local['DisableRowIdentifierExpression'] &&
      'yes' === local['DisableRowIdentifierExpression'].toLowerCase();
    local['TestConnectionTimeoutInSeconds'] = parseInt(local['TestConnectionTimeoutInSeconds']);

    return local;
  };

  createPayload = (nowConnection, credentials, context) => {
    let importActionParameters = this.parseActionParameters(context.actionParams, context);
    console.dir(importActionParameters);

    let payload = {
      ds_connection: {
        name: nowConnection.name,
        rdb_url: nowConnection.connection_url,
        type: nowConnection.type,
        enabled: nowConnection.operational_status,
        scanner_strategy: 'SCAN_ALL',
        rdb_is_sample_data: true,
        security_tier: '1',
        differential: false,
        is_idsor_supported: true,
        origin: 'ServiceNow',
        authStrategy: 'credentials',
        is_credential: true,
        credential_id: credentials['credential_id'],
        custom_fields: [
          { field_name: 'servicenow_id', field_type: 'clear', field_value: nowConnection.sys_id },
        ],
        /** Business Owner and IT Owner parameters */
        owners_v2: [
          {
            id: importActionParameters['BusinessOwner'],
            origin: 'local',
            type: 'business',
          },
          {
            id: importActionParameters['ITOwner'],
            origin: 'local',
            type: 'it',
          },
        ],
        /** following are scan setting parameters set as per action parameter configuration. */
        scanner_group: importActionParameters['ScannerGroup'],
        scanTimeoutInSeconds: importActionParameters['ScanConnectionTimeout'],
        rdb_sample_data_max_size: importActionParameters['SampleScanDataMaxSize'],
        numberOfParsingThreads: importActionParameters['NumberOfParsingThreads'],
        stop_on_failure: importActionParameters['StopOnFailure'],
        enrichment_is_enabled: importActionParameters['EnableEnrichment'],
        classification_is_enabled: importActionParameters['EnableClassification'],
        structured_clustering_enabled: importActionParameters['EnableStructuredClustering'],
        row_identifier_expression_is_disabled:
          importActionParameters['DisableRowIdentifierExpression'],
        testConnectionTimeoutInSeconds: importActionParameters['TestConnectionTimeoutInSeconds'],
      },
    };
    if (nowConnection.hasOwnProperty('cdb_sys_id')) {
      payload['ds_connection']['custom_fields'].push({
        field_name: 'cdb_sys_id',
        field_type: 'clear',
        field_value: nowConnection.cdb_sys_id,
      });
      payload['ds_connection']['custom_fields'].push({
        field_name: 'cdb_name',
        field_type: 'clear',
        field_value: nowConnection.cdb_name,
      });
    }
    if(nowConnection.dns_domain !== "" && nowConnection.type == "o365-onedrive") {
      payload['ds_connection']['domain'] = nowConnection.dns_domain;
    }
    if(nowConnection.dns_domain !== "" && nowConnection.type == "googledrive") {
      payload['ds_connection']['google_service_account_user'] = nowConnection.dns_domain;
    } 
    if(nowConnection.bucket_name !== "" && nowConnection.type == "s3") {
      payload['ds_connection']['bucket_name'] = nowConnection.bucket_name;
    } 
    return payload;
  };

  instancePayload = (context, type, connection, cdbInstance) => {
    let _instanceURL, _instance;
    context.logger.debug(`BigIDBO.instancePayload type: ${type}`);
    if (type !== 'cmdb_ci_cloud_object_storage') {
      _instanceURL = connection['rdb_url'];
      _instance = this.serverURL(type, _instanceURL);
    }
    context.logger.debug(`BigIDBO. instancePayload decoded url: ${JSON.stringify(_instance)}`);
    let _instanceName = connection.name;
    let _instanceOperationalStatus = connection.enabled === 'no' ? 2 : 1;
    let _instancePayload = {
      className: type,
      internal_id: 'instance',
      values: {
        name: _instanceName,
        operational_status: _instanceOperationalStatus,
        sys_class_name: type,
      },
    };
    switch (type) {
      case 'cmdb_ci_db_mssql_instance':
        _instancePayload.values['instance_name'] = _instanceName;
        _instancePayload.values['tcp_port'] = connection.port;
        break;
      case 'cmdb_ci_db_ora_instance':
        if (cdbInstance !== undefined) {
          _instancePayload.values['name'] = cdbInstance.name.value;
          _instancePayload.values['sid'] = cdbInstance.sid.value;
        } else {
          _instancePayload.values['sid'] = _instance['additional_param'];
        }
        _instancePayload.values['tcp_port'] = connection.port;
        if (_instancePayload.values['sid'] === undefined) {
          return;
        }
        break;
      case 'cmdb_ci_db_ora_pdb_instance':
        _instancePayload.values['sid'] = _instance['additional_param'];
        _instancePayload.values['cdb_name'] = connection.custom_fields.cdb_sys_id;
        if (_instancePayload.values['sid'] === undefined) {
          return;
        }
        break;
      case 'cmdb_ci_db_mysql_instance':
        _instancePayload.values['install_directory'] = _instanceName;
        _instancePayload.values['tcp_port'] = connection.port;
        break;
      case 'cmdb_ci_db_db2_instance':
        _instancePayload.values['db_name'] = _instance['additional_param'] || _instanceName;
        _instancePayload.values['tcp_port'] = connection.port;
        break;
      case 'cmdb_ci_db_postgresql_instance':
      case 'cmdb_ci_db_syb_instance':
        _instancePayload.values['instance'] = _instanceName;
        _instancePayload.values['tcp_port'] = connection.port;
        break;
      case 'cmdb_ci_db_informix_instance':
        _instancePayload.values['version'] = '1.0';
        _instancePayload.values['install_directory'] = _instanceName;
        _instancePayload.values['tcp_port'] = connection.port;
        break;
      case 'cmdb_ci_cloud_object_storage':
        _instancePayload.values['install_directory'] = _instanceName;
        _instancePayload.values['service_name'] = connection.type;
        if (undefined != connection.domain) {
          _instancePayload.values['dns_domain'] = connection.domain;
        } else {
          _instancePayload.values['dns_domain'] = this.nowDomain(connection.type);
        }
        if (undefined != connection.bucket_name) {
          _instancePayload.values['u_bucket_name'] = connection.bucket_name;
        }
        break;
      default:
        break;
    }

    return _instancePayload;
  };

  isIPAddress = ipaddress => {
    if (
      /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(
        ipaddress,
      )
    ) {
      return true;
    }
    return false;
  };

  parseOtherDBURL = dbURL => {
    if (undefined === dbURL) return new Object();
    let res = dbURL.split('://');
    res = res[res.length - 1];
    let server = res.split(':')[0];
    let host = null;
    let ip_address = null;
    let port = null;
    if (this.isIPAddress(server)) {
      ip_address = server;
    } else {
      host = server;
    }
    port = res.split(':');
    port = port.length > 1 ? port[1] : null;
    let db_name = null;
    if (port) {
      if (port.includes('/') || port.includes(';')) {
        db_name = port.split(/\/|\;/)[1].split(/(\/|\?|\;)/)[0];
        db_name = db_name.includes('=') ? db_name.split('=')[1] : db_name;
        port = port.split(/\/|\;/)[0];
      }
    } else {
      if (res.includes('/') || res.includes(';')) {
        db_name = res.split(/\/|\;/)[1].split(/(\/|\?|\;)/)[0];
        db_name = db_name.includes('=') ? db_name.split('=')[1] : db_name;
        host = res.split(/\/|\;/)[0];
      }
    }
    return { ip_address: ip_address, host: host, port: port, additional_param: db_name };
  };

  parseOracleURL = dbURL => {
    let _url, _server, _ipAddress, _host, _port, _sid;
    let _fetchElementFromList = (list, element) => {
      let _item;
      for (let index in list) {
        _item = list[index];
        if (_item.includes(element)) return _item.replace(element + '=', '');
      }
      return undefined;
    };

    _url = dbURL.replace(/\)/g, '').split('(');
    _server = _fetchElementFromList(_url, 'HOST');
    _server = _server.split('://');
    _ipAddress = this.isIPAddress(_server[_server.length - 1]) ? _server[_server.length - 1] : null;
    _host = this.isIPAddress(_server[_server.length - 1]) ? null : _server[_server.length - 1];
    _port = _fetchElementFromList(_url, 'PORT');
    _sid = _fetchElementFromList(_url, 'SERVICE_NAME');
    return { ip_address: _ipAddress, port: _port, sid: _sid, host: _host };
  };

  serverURL = (type, dbURL) => {
    let _url = new Object();
    _url = this.parseOtherDBURL(dbURL);
    return _url;
  };

  nowType = type => {
    let _type = Constants.Types.find(element => {
      return element.bigid_name === type;
    });
    try {
      return undefined !== _type ? _type.sn_name : undefined;
    } catch (_error) {
      return undefined;
    }
  };

  nowDomain = type => {
    let _type = Constants.Domain.find(element => {
      return element.bigid_name === type;
    });
    try {
      return undefined !== _type ? _type.sn_domain : undefined;
    } catch (_error) {
      return undefined;
    }
  };

  isTestConnectionSuccessful = _connection => {
    return (
      _connection.hasOwnProperty('connectionStatusTest') &&
      _connection['connectionStatusTest'].hasOwnProperty('is_success') &&
      true === _connection['connectionStatusTest']['is_success']
    );
  };

  fetchExistingSensitivityLevelConfiguration = context => {
    let _sensitivityLevels = new Array();
    Object.keys(context.globalParams).forEach(_key => {
      if ('sn_' === _key.substring(0, 3))
        _sensitivityLevels.push({
          tag_name: Constants.CLASSIFICATION_TAG_NAME,
          tag_value: context.globalParams[_key],
        });
    });

    return _sensitivityLevels;
  };

  format = datasources => {
    let _connections = new Object();
    let _nowId;
    datasources.forEach(_connection => {
      _nowId = this.serviceNowId(_connection);
      if (undefined !== _nowId) _connections[_nowId] = _connection;
    });

    return _connections;
  };

  serviceNowId = connection => {
    let _nowId = undefined;
    if (connection.hasOwnProperty('custom_fields')) {
      connection['custom_fields'].forEach(_field => {
        if (_field['field_name'] === 'servicenow_id') {
          _nowId = _field['field_value'];
          return;
        }
      });
    }
    return _nowId;
  };

  getCDBProperty = (connection, property) => {
    let _value = undefined;
    if (connection.hasOwnProperty('custom_fields')) {
      connection['custom_fields'].forEach(_field => {
        if (_field['field_name'] === property) {
          _value = _field['field_value'];
          return;
        }
      });
    }
    return _value;
  };

  synchronizeNowBigIdPayload = (connection, reconcileResponse, cdbInstance) => {
    let payload = { ds_connection: {} };
    let customFields = connection.hasOwnProperty('custom_fields')
      ? connection['custom_fields']
      : [];
    customFields.push({
      field_name: 'servicenow_id',
      field_type: 'clear',
      field_value: reconcileResponse.sysId,
    });
    if (cdbInstance !== undefined && cdbInstance.length > 0) {
      cdbInstance = cdbInstance[0];
      if (
        !customFields.some(ele => {
          return ele.field_name == 'cdb_sys_id';
        })
      ) {
        customFields.push({
          field_name: 'cdb_sys_id',
          field_type: 'clear',
          field_value: cdbInstance.sys_id.value,
        });
      }
      if (
        !customFields.some(ele => {
          return ele.field_name == 'cdb_name';
        })
      ) {
        customFields.push({
          field_name: 'cdb_name',
          field_type: 'clear',
          field_value: cdbInstance.name.value,
        });
      }
    }
    payload['ds_connection']['custom_fields'] = customFields;
    return payload;
  };
}

module.exports = new BigIdBO();
