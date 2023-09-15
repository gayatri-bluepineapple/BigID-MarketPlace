const ServiceNOWService = require('../services/ServiceNOWService');
const bigIdBO = require('../bo/BigIDBO');
const Constants = require('../utils/Constants');
const ActionReply = require('../utils/ActionReply');
const BigIdAxios = require('../utils/axios/BigID');

class ScanResultBO {
  constructor(context) {
    this.context = context;
    this.bigIdConfiguration = context['actionParams'];
    this.classificationTag = this._getClassificationTagName();
    this.classificationMap = this._getClassificationTagMap(context);
  }

  _getClassificationTagName = () => {
    return Constants.CLASSIFICATION_TAG_NAME;
  };

  _getClassificationTagMap = context => {
    context.logger.info('_getClassificationTagMap.start');
    let _classificationMap = new Array();
    Object.keys(context.globalParams).forEach(_key => {
      if ('sn_' === _key.substring(0, 3))
        _classificationMap.push({
          tagLevel: context.globalParams[_key],
          dataClass: Constants.serviceNOWClassificationLevels[_key],
        });
    });
    context.logger.info('_getClassificationTagMap.end');
    return _classificationMap;
  };

  validateSavedQueryConfiguration = (queriesFromBigID, _existingSensitivityLevelConfiguration) => {
    let _reply = {
      success: false,
      message:
        'Please run the "Create Sensitivity Level Saved Query" action and apply the tags before using this action.',
    };
    let _foundCount = 0;
    let _found;
    if (queriesFromBigID.length !== _existingSensitivityLevelConfiguration.length) return _reply;
    queriesFromBigID.forEach(_query => {
      _found = undefined;
      _found = _existingSensitivityLevelConfiguration.find(_element => {
        return _query['tag_value'] === _element['tag_value'];
      });
      if (undefined !== _found) _foundCount++;
    });
    if (queriesFromBigID.length !== _foundCount) return _reply;
    (_reply.success = true), (_reply.message = '');
    return _reply;
  };

  _clearInformationObjectSensitivity = async (context, instanceCatalogs) => {
    let _self = this;
    context.logger.info(`_clearInformationObjectSensitivity.start: ${new Date().toString()}`);
    let generateRelationshipCIs = async function* (context, encodedQuery) {
      let _serviceNow = new ServiceNOWService();
      try {
        yield Promise.resolve(
          await _serviceNow.fetchServiceNowDatasourceByEncodedQuery(context, encodedQuery),
        );
      } catch (_error) {
        yield Promise.resolve(undefined);
      }
    };

    let generateInformationObjects = async function* (context, encodedQuery) {
      let _serviceNow = new ServiceNOWService();
      try {
        yield Promise.resolve(
          await _serviceNow.fetchServiceNowDatasourceByEncodedQuery(context, encodedQuery),
        );
      } catch (_error) {
        yield Promise.resolve(undefined);
      }
    };

    let generateTobeErasedRecords = async function* (context, encodedQuery) {
      let _serviceNow = new ServiceNOWService();
      try {
        yield Promise.resolve(
          await _serviceNow.fetchServiceNowRecordsByEncodedQuery(
            context,
            'cmdb_key_value',
            encodedQuery,
          ),
        );
      } catch (_error) {
        yield Promise.resolve(undefined);
      }
    };

    for (let _instanceSysId in instanceCatalogs) {
      let _encodedQuery = `parent=${_instanceSysId}^type.name=Contains::Contained by^EQ`;
      context.logger.debug(
        `ScanResultBO._clearInformationObjectSensitivity._relationshipCIs._encodedQuery: ${_encodedQuery}`,
      );
      for await (let _relationshipCIs of generateRelationshipCIs(context, _encodedQuery)) {
        if (undefined !== _relationshipCIs) {
          for (let _count in _relationshipCIs) {
            let _relationshipCI = _relationshipCIs[_count];
            let _encodedQuery = `configuration_item=${_relationshipCI['child.sys_id'].value}^type.name=Hosted on::Hosts^parent.sys_class_name=cmdb_ci_information_object^EQ`;
            context.logger.debug(
              `ScanResultBO._clearInformationObjectSensitivity._informationObjects._encodedQuery: ${_encodedQuery}`,
            );
            for await (let _informationObjects of generateInformationObjects(
              context,
              _encodedQuery,
            )) {
              if (undefined !== _informationObjects) {
                for (let _where in _informationObjects) {
                  let _informationObject = _informationObjects[_where];
                  let _encodedQuery = `configuration_item=${
                    _informationObject['parent.sys_id'].value
                  }^key=${_self._getClassificationTagName()}`;
                  context.logger.debug(
                    `ScanResultBO._clearInformationObjectSensitivity._rows._encodedQuery: ${_encodedQuery}`,
                  );
                  for await (let _rows of generateTobeErasedRecords(context, _encodedQuery)) {
                    if (undefined !== _rows) {
                      for (let _index = 0; _index < _rows.length; _index++) {
                        context.logger.debug(
                          `ScanResultBO._clearInformationObjectSensitivity._row: ${JSON.stringify(
                            _rows[_index],
                          )}`,
                        );
                        await new ServiceNOWService().delete(
                          context,
                          'cmdb_key_value',
                          _rows[_index]['sys_id'].value,
                        );
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    context.logger.info('_clearInformationObjectSensitivity.end');
  };

  _clearCatalogSensitivity = async (context, instanceCatalogs) => {
    let _self = this;
    context.logger.info(`_clearCatalogSensitivity.start: ${new Date().toString()}`);
    let generateRelationshipCIs = async function* (context, encodedQuery) {
      let _serviceNow = new ServiceNOWService();
      try {
        yield Promise.resolve(
          await _serviceNow.fetchServiceNowDatasourceByEncodedQuery(context, encodedQuery),
        );
      } catch (_error) {
        yield Promise.resolve(undefined);
      }
    };

    let generateTobeErasedRecords = async function* (context, encodedQuery) {
      let _serviceNow = new ServiceNOWService();
      try {
        yield Promise.resolve(
          await _serviceNow.fetchServiceNowRecordsByEncodedQuery(
            context,
            'cmdb_key_value',
            encodedQuery,
          ),
        );
      } catch (_error) {
        yield Promise.resolve(undefined);
      }
    };

    for (let _instanceSysId in instanceCatalogs) {
      let _encodedQuery = `parent=${_instanceSysId}^type.name=Contains::Contained by^EQ`;
      context.logger.debug(
        `ScanResultBO._clearCatalogSensitivity._relationshipCIs._encodedQuery: ${_encodedQuery}`,
      );
      for await (let _relationshipCIs of generateRelationshipCIs(context, _encodedQuery)) {
        if (undefined !== _relationshipCIs) {
          context.logger.debug(
            `ScanResultBO._clearCatalogSensitivity._relationshipCIs: ${JSON.stringify(
              _relationshipCIs,
            )}`,
          );
          for (let _count in _relationshipCIs) {
            let _relationshipCI = _relationshipCIs[_count];
            context.logger.debug(
              `ScanResultBO._clearCatalogSensitivity._relationshipCI: ${_relationshipCI}`,
            );
            let _encodedQuery = `configuration_item=${
              _relationshipCI['child.sys_id'].value
            }^key=${_self._getClassificationTagName()}`;
            context.logger.debug(
              `ScanResultBO._clearCatalogSensitivity._rows._encodedQuery: ${_encodedQuery}`,
            );
            for await (let _rows of generateTobeErasedRecords(context, _encodedQuery)) {
              if (undefined !== _rows) {
                context.logger.debug(
                  `ScanResultBO._clearCatalogSensitivity._rows.length: ${_rows.length}`,
                );
                for (let _index = 0; _index < _rows.length; _index++) {
                  context.logger.debug(
                    `ScanResultBO._clearCatalogSensitivity._row: ${_rows[_index]}`,
                  );
                  await new ServiceNOWService().delete(
                    context,
                    'cmdb_key_value',
                    _rows[_index]['sys_id'].value,
                  );
                }
              }
            }
          }
        }
      }
    }
    context.logger.info('_clearCatalogSensitivity.end');
  };

  _getCatalogSensitivity = (scanRecords, context) => {
    context.logger.info('_getCatalogSensitivity.start');
    return this._getSuperiorField(scanRecords)['superior_tag']['tag_value'];
  };

  _getPayloadInstanceObject = (dbInstance, context) => {
    context.logger.info('_getPayloadInstanceObject.start');
    return {
      className: dbInstance['sys_class_name'].value,
      internal_id: 'instance',
      lookup: [],
      values: { sys_id: dbInstance['sys_id'].value },
    };
  };

  _getDataClassification = (tag_value, context) => {
    context.logger.info('_getDataClassification.start');
    var classification_levels = this.classificationMap;
    for (var index in classification_levels) {
      var tag = classification_levels[index];
      if (tag.tagLevel == tag_value) return tag.dataClass;
    }
    context.logger.info('_getDataClassification.end');
    return null;
  };

  _createPayloadInformationObject = (context, index, name, record) => {
    context.logger.info('_createPayloadInformationObject.start');
    let _key = this._getClassificationTagName();
    let _value = record['superior_tag']['tag_value'];
    let _dataClassification = this._getDataClassification(_value, context);
    context.logger.info('_createPayloadInformationObject.end');
    return {
      className: 'cmdb_ci_information_object',
      internal_id: 'information_object_' + index,
      lookup: [],
      related: [
        {
          className: 'cmdb_key_value',
          values: {
            key: _key,
            value: _value,
          },
        },
      ],
      values: {
        name: name,
        data_classification: _dataClassification,
        u_physical_instance: true,
      },
    };
  };

  _getPayloadInformationObjects = (scanRecords, dbInstanceName, context) => {
    context.logger.info('_getPayloadInformationObjects.start');
    let _informationObjects = new Array();
    let _record, _name, _informationObject;
    for (let _index in scanRecords) {
      _record = scanRecords[_index];
      _name = this._createInformationObjectName(
        context,
        _record.object,
        _record.owner,
        dbInstanceName,
        _record['attribute_name'],
        _record.fieldName,
      );
      _informationObject = this._createPayloadInformationObject(context, _index, _name, _record);
      _informationObjects.push({
        information_object: _informationObject,
        classifier_name: _record['attribute_name'],
      });
    }
    context.logger.info('_getPayloadInformationObjects.end');
    return _informationObjects;
  };

  _getDBCatalogTable = (sysClassName, context) => {
    context.logger.info('_getDBCatalogTable.start');
    return (
      {
        cmdb_ci_db_db2_instance: 'cmdb_ci_db_db2_catalog',
        cmdb_ci_db_mysql_instance: 'cmdb_ci_db_mysql_catalog',
        cmdb_ci_db_mssql_instance: 'cmdb_ci_db_mssql_database',
        cmdb_ci_db_ora_instance: 'cmdb_ci_db_ora_catalog',
        cmdb_ci_db_ora_pdb_instance: 'cmdb_ci_db_ora_catalog',
        cmdb_ci_db_postgresql_instance: 'cmdb_ci_postgresql_schema',
        cmdb_ci_db_syb_instance: 'cmdb_ci_db_syb_catalog',
        cmdb_ci_db_informix_instance: 'cmdb_ci_db_informix_catalog',
      }[sysClassName] || undefined
    );
  };

  _getPayloadCatalogObject = (dbInstance, dbInstanceName, scanRecords, context) => {
    context.logger.info('_getPayloadCatalogObject.start');
    let _catalogPayload;
    let _catalogSensitivity = this._getCatalogSensitivity(scanRecords, context);
    let _catalogTableName = this._getDBCatalogTable(dbInstance['sys_class_name'].value, context);
    let _catalogName = dbInstanceName + '@' + scanRecords[0].owner;
    if (undefined !== _catalogName) {
      _catalogPayload = {
        className: _catalogTableName,
        internal_id: 'catalog',
        lookup: [],
        related: [
          {
            className: 'cmdb_key_value',
            values: {
              key: this._getClassificationTagName(),
              value: _catalogSensitivity,
            },
          },
        ],
        values: {
          name: _catalogName,
          database_instance: dbInstance['sys_id'].value,
          sys_class_name: _catalogTableName,
        },
      };

      switch (_catalogTableName) {
        case 'cmdb_ci_db_mssql_database':
          _catalogPayload.values.database = dbInstance.name;
          break;
        case 'cmdb_ci_db_ora_catalog':
          _catalogPayload.values.schema = _catalogName;
          break;
        case 'cmdb_ci_db_ora_pdb_instance':
          _catalogPayload.values.schema = _catalogName;
          break;
        default:
          break;
      }
      context.logger.info('_getPayloadCatalogObject.end');
      return _catalogPayload;
    } else {
      throw new Exception('_getCatalogPayloadObject: No Datasource Catalog Table found.');
    }
  };

  _getDistinctClassifiers = ds_scan_results => {
    var classifiers = ds_scan_results.map(function (scan_record) {
      return scan_record.attribute_name;
    });
    var distinct_classifiers = classifiers.filter(function (classifier, index) {
      return classifiers.indexOf(classifier) === index;
    });
    return distinct_classifiers;
  };

  _getPayloadClassifierInformationObjects = (scanRecords, context) => {
    context.logger.info('_getPayloadClassifierInformationObjects.start');
    let _classifiers = this._getDistinctClassifiers(scanRecords);
    let _payloadClassifierObjects = _classifiers.map(_classifier => {
      return {
        className: 'cmdb_ci_information_object',
        internal_id: 'classifier_' + _classifier,
        lookup: [],
        related: [],
        values: {
          name: _classifier,
          u_physical_instance: false,
        },
      };
    });
    context.logger.info('_getPayloadClassifierInformationObjects.end');
    return _payloadClassifierObjects;
  };

  _createIREPayload = (
    context,
    payloadInstance,
    payloadCatalog,
    payloadInformationObjects,
    payloadClassificationInformationObjects,
  ) => {
    context.logger.info('_createIREPayload.start');
    let _items = [],
      _relations = [],
      _references = [];
    _items.push(payloadInstance);
    _items.push(payloadCatalog);
    _relations.push({ type: 'Contains::Contained by', parent: 0, child: 1 });

    payloadClassificationInformationObjects.forEach(_classifierInformationObject => {
      _items.push(_classifierInformationObject);
    });

    payloadInformationObjects.forEach((_informationObject, _index) => {
      _items.push(_informationObject['information_object']);
      _relations.push({ type: 'Hosted on::Hosts', parent: _items.length - 1, child: 1 });
      _references.push({
        referenced: 'classifier_' + _informationObject['classifier_name'],
        referencedBy: 'information_object_' + _index,
        referenceField: 'u_logical_parent',
      });
    });
    context.logger.info('_createIREPayload.end');
    return { items: _items, relations: _relations, referenceItems: _references };
  };

  _createScanResultsIREPayload = async (context, scanRecords, connections) => {
    let _payload,
      _dbInstances,
      _dbInstanceName,
      _payloadInformationObjects,
      _payloadInstance,
      _payloadCatalog,
      _payloadClassificationInformationObjects;
    context.logger.info(`createScanResultsIREPayload.start: ${new Date().toString()}`);
    let _dsName = scanRecords[0].source;
    let _bidIdDS = connections[_dsName];
    let _dbInstanceSysId = scanRecords[0]['sn_sys_id'];
    context.logger.info(`debug: _dsName ${_dsName}`);
    context.logger.info(`debug: _bidIdDS ${_bidIdDS}`);
    context.logger.info(`debug: _dbInstanceSysId ${_dbInstanceSysId}`);
    let _serviceNow = new ServiceNOWService();
    _dbInstances = await _serviceNow.fetchServiceNowRecordsByEncodedQuery(
      context,
      'cmdb_ci_db_instance',
      `sys_id=${_dbInstanceSysId}`,
    );
    context.logger.info(`debug: _dbInstances ${_dbInstances.length}`);
    context.logger.debug(
      `ScanResultBO._createScanResultsIREPayload.instanceSysId ${JSON.stringify(_dbInstanceSysId)}`,
    );
    if (undefined !== _dbInstances && 0 < _dbInstances.length) {
      _dbInstanceName = _dbInstances[0]['name'].value;
      context.logger.debug(
        `ScanResultBO._createScanResultsIREPayload._dbInstanceName ${JSON.stringify(
          _dbInstanceName,
        )}`,
      );
      _payloadInformationObjects = this._getPayloadInformationObjects(
        scanRecords,
        _dbInstanceName,
        context,
      );
      _payloadInstance = this._getPayloadInstanceObject(_dbInstances[0], context);
      _payloadCatalog = this._getPayloadCatalogObject(
        _dbInstances[0],
        _dbInstanceName,
        scanRecords,
        context,
      );
      _payloadClassificationInformationObjects = this._getPayloadClassifierInformationObjects(
        scanRecords,
        context,
      );
      _payload = this._createIREPayload(
        context,
        _payloadInstance,
        _payloadCatalog,
        _payloadInformationObjects,
        _payloadClassificationInformationObjects,
      );
    }
    context.logger.info('_createScanResultsIREPayload.end');
    return _payload;
  };

  _reconcileScanResult = async (context, scanResult, connection) => {
    context.logger.info('_reconcileScanResult.start');
    let _serviceNow = new ServiceNOWService();
    let _irePayload = await this._createScanResultsIREPayload(context, scanResult, connection);
    let _ireResponse = await _serviceNow.identifyReconcile(context, _irePayload);
    context.logger.info('_reconcileScanResult.end');
    return _ireResponse;
  };

  _deleteInformationObjectRelations = async (context, catalogSysId, informationObjects) => {
    let _serviceNow = new ServiceNOWService();
    context.logger.info('_deleteInformationObjectRelations.start');
    let generateRelationshipCIs = async function* (context, encodedQuery) {
      let _serviceNow = new ServiceNOWService();
      try {
        yield Promise.resolve(
          await _serviceNow.fetchServiceNowDatasourceByEncodedQuery(context, encodedQuery),
        );
      } catch (_error) {
        yield Promise.resolve(undefined);
      }
    };

    let _informationObjects = undefined === informationObjects ? [] : informationObjects;
    let _informationObjectSysIds = _informationObjects.map(_informationObject => {
      return _informationObject.sysId;
    });
    let _encodedQuery = `child=${catalogSysId}^type.name=Hosted on::Hosts^parent.sys_class_name=cmdb_ci_information_object^parentNOT IN${_informationObjectSysIds.join()}^EQ`;
    for await (let _rows of generateRelationshipCIs(context, _encodedQuery)) {
      if (undefined !== _rows) {
        for (let _index = 0; _index < _rows.length; _index++) {
          context.logger.debug(`ScanResultBO._deleteInformationObjectRelations._row: ${_index}`);
          await _serviceNow.delete(context, 'cmdb_rel_ci', _rows[_index]['sys_id'].value);
        }
      }
    }
    context.logger.info('_deleteInformationObjectRelations.start');
  };

  _clearStaleInformationObjects = async (context, _reconcileResult) => {
    let _items, _catalogSysId, _informationObjects, _clearedCatalogs;
    context.logger.info(`_clearStaleInformationObjects.start: ${new Date().toString()}`);
    if (true === _reconcileResult.success) {
      _items = _reconcileResult.response.items;
      _catalogSysId = _items[1].sysId;
      _informationObjects = _items.filter(_element => {
        return _element.className === 'cmdb_ci_information_object';
      });
      _clearedCatalogs = await this._deleteInformationObjectRelations(
        context,
        _catalogSysId,
        _informationObjects,
      );
    }
    context.logger.info('_clearStaleInformationObjects.end');
  };

  _markCatalogUnstale = (context, reconcileResult, instanceCatalogs) => {
    context.logger.info(`_markCatalogUnstale.start: ${new Date().toString()}`);
    let _items, _catalogSysId, _instanceSysId;
    if (true === reconcileResult.success) {
      _items = reconcileResult.response.items;
      _catalogSysId = _items[1].sysId;
      _instanceSysId = _items[0].sysId;
      if (instanceCatalogs.hasOwnProperty(_instanceSysId)) {
        instanceCatalogs[_instanceSysId].push(_catalogSysId);
      } else {
        instanceCatalogs[_instanceSysId] = _catalogSysId;
      }
    }
    context.logger.info('_markCatalogUnstale.end');
  };

  _catalogInformationObjectCleanup = async (context, instanceCatalogs) => {
    let _self = this;
    context.logger.info('_catalogInformationObjectCleanup.start');
    let generateRelationshipCIs = async function* (context, encodedQuery) {
      let _serviceNow = new ServiceNOWService();
      try {
        yield Promise.resolve(
          await _serviceNow.fetchServiceNowDatasourceByEncodedQuery(context, encodedQuery),
        );
      } catch (_error) {
        yield Promise.resolve(undefined);
      }
    };

    let generateInformationObjectRelationships = async function* (context, encodedQuery) {
      let _serviceNow = new ServiceNOWService();
      try {
        yield Promise.resolve(
          await _serviceNow.fetchServiceNowDatasourceByEncodedQuery(context, encodedQuery),
        );
      } catch (_error) {
        yield Promise.resolve(undefined);
      }
    };

    let _instances = Object.keys(instanceCatalogs);
    for (let _index in _instances) {
      let _instanceSysId = _instances[_index];
      let _catalogs = instanceCatalogs[_instanceSysId];
      let _encodedQuery = `parent=${_instanceSysId}^type.name=Contains::Contained by^childNOT IN${_catalogs}^EQ`;
      for await (let _cis of generateRelationshipCIs(context, _encodedQuery)) {
        if (undefined !== _cis) {
          for (let _where in _cis) {
            let _encodedQuery = `child=${_cis[_where]['child.sys_id'].value}^type.name=Hosted on::Hosts^parent.sys_class_name=cmdb_ci_information_object^EQ`;
            for await (let _rows of generateInformationObjectRelationships(
              context,
              _encodedQuery,
            )) {
              if (undefined !== _rows) {
                for (let _index = 0; _index < _rows.length; _index++) {
                  context.logger.debug(
                    `ScanResultBO._catalogInformationObjectCleanup._row: ${_index}`,
                  );
                  await _serviceNow.delete(context, 'cmdb_rel_ci', _rows[_index]['sys_id'].value);
                }
              }
            }
          }
        }
      }
    }
    context.logger.info('_catalogInformationObjectCleanup.end');
  };

  _clearStaleCatalogs = async (context, instanceCatalogs) => {
    context.logger.info(`_clearStaleCatalogs.start: ${new Date().toString()}`);
    let generateRelationshipCIs = async function* (context, encodedQuery) {
      let _serviceNow = new ServiceNOWService();
      try {
        yield Promise.resolve(
          await _serviceNow.fetchServiceNowDatasourceByEncodedQuery(context, encodedQuery),
        );
      } catch (_error) {
        yield Promise.resolve(undefined);
      }
    };

    let _instances = Object.keys(instanceCatalogs);
    for (let _index in _instances) {
      let _instanceSysId = _instances[_index];
      let _catalogs = instanceCatalogs[_instanceSysId];
      let _encodedQuery = `parent=${_instanceSysId}^type.name=Contains::Contained by^childNOT IN${_catalogs}^EQ`;
      for await (let _rows of generateRelationshipCIs(context, _encodedQuery)) {
        if (undefined !== _rows) {
          for (let _index = 0; _index < _rows.length; _index++) {
            context.logger.debug(`ScanResultBO._clearStaleCatalogs._row: ${_rows[_index]}`);
            await new ServiceNOWService().delete(
              context,
              'cmdb_rel_ci',
              _rows[_index]['sys_id'].value,
            );
          }
        }
      }
    }
    context.logger.info('_clearStaleCatalogs.end');
  };

  syncScanResults = async (bigIdConnections, bigIdScanResults, context) => {
    let _self = this;
    let _serviceNow = new ServiceNOWService();
    context.logger.info(`syncScanResults.start: ${new Date().toString()}`);
    let _connections = undefined;
    let _refinedScanResults, _dsScanResults, _instanceCatalogs;

    let generateIREResponse = async function* (_self, context, scanResult, connections) {
      let _serviceNow = new ServiceNOWService();
      try {
        context.logger.debug(`generateIREResponse.start: _self._createScanResultsIREPayload`);
        let _irePayload = await _self._createScanResultsIREPayload(
          context,
          scanResult,
          connections,
        );
        context.logger.debug(`generateIREResponse irePayload: ${JSON.stringify(_irePayload)}`);
        context.logger.debug(`generateIREResponse.end: _self._createScanResultsIREPayload`);
        yield Promise.resolve(await _serviceNow.identifyReconcile(context, _irePayload));
      } catch (_error) {
        context.logger.error(`generateIREResponse.error: ${_error}`);
        yield Promise.resolve(undefined);
      }
    };

    if (undefined !== bigIdConnections) {
      _connections = new Object();
      bigIdConnections.forEach(_connection => {
        _connections[_connection.name] = _connection;
      });
    }

    if (undefined !== bigIdScanResults && undefined !== _connections) {
      try {
        _instanceCatalogs = this._getInstanceCatalogs(_connections, context);
        await _serviceNow.clearSensitivity(context, Object.keys(_instanceCatalogs));
        /** await this._clearInformationObjectSensitivity(context, _instanceCatalogs);
        new BigIdAxios(context).updateStatus(
          context.executionId,
          new ActionReply(
            context.executionId,
            Constants.Status.IN_PROGRESS,
            0.2,
            `action.${context.actionName} is executing`,
          ),
        );
        await this._clearCatalogSensitivity(context, _instanceCatalogs); */

        await new BigIdAxios(context).updateStatus(
          context.executionId,
          new ActionReply(
            context.executionId,
            Constants.Status.IN_PROGRESS,
            0.3,
            `action.${context.actionName} is executing`,
          ),
        );
        _refinedScanResults = this._filterAndRefineScanResults(
          bigIdScanResults,
          _connections,
          context,
        );
        _refinedScanResults = this._deduplicateScanResult(_refinedScanResults, context);
        _dsScanResults = this._groupResultByDataSourceSchema(_refinedScanResults, context);
        await new BigIdAxios(context).updateStatus(
          context.executionId,
          new ActionReply(
            context.executionId,
            Constants.Status.IN_PROGRESS,
            0.6,
            `action.${context.actionName} is executing`,
          ),
        );
        for (let _index in _dsScanResults) {
          let _scanResult = _dsScanResults[_index];
          for await (let _response of generateIREResponse(
            _self,
            context,
            _scanResult,
            _connections,
          )) {
            context.logger.info(`generateIREResponse.response: ${JSON.stringify(_response)}`);
            if (undefined !== _response) {
              await _serviceNow.clearStaleInformationObjects(context, _response);
              //await this._clearStaleInformationObjects(context, _response);
              this._markCatalogUnstale(context, _response, _instanceCatalogs);
            }
          }
        }

        //await this._clearStaleCatalogs(context, _instanceCatalogs);
        await _serviceNow.clearStaleCatalogs(context, _instanceCatalogs);

        await new BigIdAxios(context).updateStatus(
          context.executionId,
          new ActionReply(
            context.executionId,
            Constants.Status.IN_PROGRESS,
            0.8,
            `action.${context.actionName} is executing`,
          ),
        );

        context.logger.info(`syncScanResults.end: ${new Date().toString()}`);
        return Promise.resolve({ success: true });
      } catch (_error) {
        context.logger.error(`ScanResultBO.syncScanResult.error: ${_error}`);
        return Promise.reject({ success: false });
      }
    }
  };

  _getInstanceCatalogs = (_connections, context) => {
    let _instanceCatalogs = new Object();
    context.logger.info(`_getInstanceCatalogs.start: ${new Date().toString()}`);
    let _dsSysIds = this._getBigIdDataSourceSysIds(_connections);
    _dsSysIds.forEach(_sysId => {
      if (!_instanceCatalogs.hasOwnProperty(_sysId)) {
        _instanceCatalogs[_sysId] = new Array();
      }
    });
    context.logger.info('ScanResultBO._getInstanceCatalogs.end');
    return _instanceCatalogs;
  };

  _getBigIdDataSourceSysIds = _connections => {
    let _instanceSysIds = new Array();
    Object.keys(_connections).forEach(_key => {
      if (undefined !== _connections[_key])
        _instanceSysIds.push(bigIdBO.serviceNowId(_connections[_key]));
    });

    return _instanceSysIds;
  };

  _getSuperiorField = fields => {
    if (fields.length == 1) return fields[0];
    var superior_field;
    var classifi_map = this.classificationMap.map(function (level) {
      return level.tagLevel;
    });

    var classification_tag_name = this._getClassificationTagName();
    var highest_tag_index = Infinity;
    fields.forEach(function (field) {
      if (field.superior_tag.tag_name == classification_tag_name) {
        var tag_index = classifi_map.indexOf(field.superior_tag.tag_value);
        if (tag_index > -1) {
          if (tag_index < highest_tag_index) {
            highest_tag_index = tag_index;
            superior_field = field; //returns only one scan reult with highest sensitivity level
          }
        }
      }
    });
    return superior_field;
  };

  _groupResultByDataSourceSchema = (scan_results, context) => {
    context.logger.info(`_groupResultByDataSourceSchema.start: ${new Date().toString()}`);
    var scan_result_group = {};
    for (var i in scan_results) {
      var scan_record = scan_results[i];
      var group_name = scan_record.db_instance_name + '.' + scan_record.owner;
      if (scan_result_group.hasOwnProperty(group_name)) {
        scan_result_group[group_name].push(scan_record);
      } else {
        scan_result_group[group_name] = [scan_record];
      }
    }
    //scan result grp:scan_result_group
    //key:catalog name
    //value: array of scan results
    var group_keys = Object.keys(scan_result_group);
    context.logger.info('_groupResultByDataSourceSchema.end');
    return group_keys.map(function (key) {
      return scan_result_group[key]; //returns array of arrays
    });
  };

  _deduplicateScanResult = (scan_results, context) => {
    context.logger.info(`_deduplicateScanResult.start: ${new Date().toString()}`);
    var mapped_result = {};
    var scan_result_groups = [];
    for (var i in scan_results) {
      var scan_record = scan_results[i];
      var field = scan_record.fieldName;
      var data_source = scan_record.source;
      var table = scan_record.object;
      var classifier = scan_record.attribute_name;
      var schema = scan_record.owner;
      var group_key = this._createInformationObjectName(
        context,
        table,
        schema,
        data_source,
        classifier,
        field,
      );
      //mapped_result format
      //key:information object name
      //value: Array of refined scan results
      if (mapped_result.hasOwnProperty(group_key)) {
        mapped_result[group_key].push(scan_record);
      } else {
        mapped_result[group_key] = [scan_record];
      }
    }
    var groups_keys = Object.keys(mapped_result);
    for (var index in groups_keys) {
      var key = groups_keys[index];
      var grouped_scan_result = mapped_result[key];
      grouped_scan_result = this._getSuperiorField(grouped_scan_result);
      scan_result_groups.push(grouped_scan_result);
    }
    context.logger.info('_deduplicateScanResult.end');
    return scan_result_groups;
  };

  _createInformationObjectName = (
    context,
    table_name,
    catalog_name,
    db_instance_name,
    classifier,
    fieldName,
  ) => {
    context.logger.info('_createInformationObjectName.start');
    return (
      db_instance_name +
      '@' +
      catalog_name +
      '@' +
      table_name +
      '@' +
      fieldName +
      '[' +
      classifier +
      ']'
    );
  };

  _hasSchemaName = result => {
    return result.hasOwnProperty('owner') && result.owner.length > 0;
  };

  _hasValidTags = result => {
    if (!result.hasOwnProperty('tags') || null === result.tags || 0 === result.tags.length)
      return false;
    let _tags = result.tags;
    let classificationTagName = this._getClassificationTagName();
    return _tags.some(_tag => {
      return _tag['tag_name'] == classificationTagName;
    });
  };

  _getSuperiorTag = result => {
    let _tags = result.tags;

    // not validating against configured tag values if (_tags.length == 1) return _tags[0];
    let _superiorTag;
    let _classificationMap = this.classificationMap.map(function (_level) {
      return _level.tagLevel;
    });

    let _classificationTagName = this._getClassificationTagName();
    let _highestTagIndex = Infinity;
    let tagIndex;
    _tags.forEach(_tag => {
      if (_tag.tag_name == _classificationTagName) {
        tagIndex = _classificationMap.indexOf(_tag.tag_value);
        if (tagIndex > -1) {
          if (tagIndex < _highestTagIndex) {
            _highestTagIndex = tagIndex;
            _superiorTag = _tag;
          }
        }
      }
    });
    return _superiorTag;
  };
  // extract pure db name
  _getDataSourceName = (item, context) => {
    if (item.hasOwnProperty('origin') && item.origin != 'ServiceNow') return item.name;
    let _prefix = context.globalParams['NamePrefix'];
    var dataSourceName = item.name.replace(_prefix, '');
    var serverName = dataSourceName.substr(
      dataSourceName.lastIndexOf('('),
      dataSourceName.lastIndexOf(')'),
    );
    return dataSourceName.replace(serverName, '');
  };

  _filterAndRefineScanResults = (scanResults, ds, context) => {
    context.logger.info(`_filterAndRefineScanResults.start: ${new Date().toString()}`);
    let _refinedResults = new Array();
    let _instanceName, _bigIdDataSource;
    for (let _where in scanResults) {
      let _result = scanResults[_where];
      context.logger.debug(`_filterAndRefineScanResults._result: ${_result}`);
      _instanceName = _result.source;
      _bigIdDataSource = ds[_instanceName];
      if (this._hasValidTags(_result) && this._hasSchemaName(_result)) {
        let _instanceSysId = bigIdBO.serviceNowId(_bigIdDataSource);
        if (undefined !== _instanceSysId) {
          _result.sn_sys_id = _instanceSysId;
          _result.db_instance_name = this._getDataSourceName(_bigIdDataSource, context);
          _result.superior_tag = this._getSuperiorTag(_result);
          if (undefined !== _result.superior_tag) _refinedResults.push(_result);
        }
      }
    }
    context.logger.info('_filterAndRefineScanResults.end');
    return _refinedResults;
  };
}

module.exports = ScanResultBO;
