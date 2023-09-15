const serviceNOWBO = require('../bo/ServiceNOWBO');

class ServiceNOWService {
  clearSensitivity = async (context, instanceCatalogs) => {
    let _serviceNowAxios = context.serviceNOWAxios;
    return new Promise((_resolve, _reject) => {
      _serviceNowAxios
        .clearSensitivity(instanceCatalogs)
        .then(_response => {
          _resolve(_response);
        })
        .catch(_error => {
          _reject(_error);
        });
    });
  };

  clearStaleCatalogs = async (context, instanceCatalogs) => {
    let _serviceNowAxios = context.serviceNOWAxios;
    return new Promise((_resolve, _reject) => {
      _serviceNowAxios
        .clearStaleCatalogs(instanceCatalogs)
        .then(_response => {
          _resolve(_response);
        })
        .catch(_error => {
          _reject(_error);
        });
    });
  };

  clearStaleInformationObjects = async (context, ireResponse) => {
    let _serviceNowAxios = context.serviceNOWAxios;
    return new Promise((_resolve, _reject) => {
      _serviceNowAxios
        .clearStaleInformationObjects(ireResponse.response.items)
        .then(_response => {
          _resolve(_response);
        })
        .catch(_error => {
          _reject(_error);
        });
    });
  };

  identifyReconcile = async (context, payload) => {
    let _serviceNowAxios = context.serviceNOWAxios;
    return new Promise((_resolve, _reject) => {
      _serviceNowAxios
        .identifyReconcile(payload)
        .then(_response => {
          _resolve(serviceNOWBO.parseIRResponse(payload, _response));
        })
        .catch(_error => {
          _reject(_error);
        });
    });
  };

  fetchServiceNOWCIServers = async context => {
    let _serviceNowAxios = context.serviceNOWAxios;
    return new Promise((_resolve, _reject) => {
      _serviceNowAxios
        .fetchServiceNOWCIServers()
        .then(_servers => {
          context.logger.info(`ServiceNowService.fetchServiceNOWCIServers request succeeded`);
          _resolve(_servers);
        })
        .catch(_error => {
          context.logger.info(`ServiceNowService.fetchServiceNOWCIServers request failed`);
          _reject(_error);
        });
    });
  };

  fetchServiceNowLogicalDataCenters = async context => {
    let _serviceNowAxios = context.serviceNOWAxios;
    return new Promise((_resolve, _reject) => {
      _serviceNowAxios
        .fetchServiceNowLogicalDataCenters()
        .then(_logicalDataCenters => {
          context.logger.info(
            `ServiceNowService.fetchServiceNowLogicalDataCenters request succeeded`,
          );
          _resolve(_logicalDataCenters);
        })
        .catch(_error => {
          context.logger.info(`ServiceNowService.fetchServiceNowLogicalDataCenters request failed`);
          _reject(_error);
        });
    });
  };

  delete = async (context, table, sysId) => {
    let _serviceNowAxios = context.serviceNOWAxios;
    return new Promise((_resolve, _reject) => {
      _serviceNowAxios
        .delete(table, sysId)
        .then(_response => {
          _resolve(_response);
        })
        .catch(_error => {
          _reject(_error);
        });
    });
  };

  deleteRelationshipCI = async (context, ciSysId) => {
    let _serviceNowAxios = context.serviceNOWAxios;
    return new Promise((_resolve, _reject) => {
      _serviceNowAxios
        .delete('cmdb_rel_ci', ciSysId)
        .then(_response => {
          _resolve(_response);
        })
        .catch(_error => {
          _reject(_error);
        });
    });
  };

  fetchServiceNowDatasourceByEncodedQuery = async (context, encodedQuery) => {
    let _serviceNowAxios = context.serviceNOWAxios;
    return new Promise((_resolve, _reject) => {
      _serviceNowAxios
        .fetchServiceNowDatasourceByEncodedQuery(encodedQuery)
        .then(_connections => {
          _resolve(_connections);
        })
        .catch(_error => {
          _reject(_error);
        });
    });
  };

  fetchServiceNowRecordsByEncodedQuery = async (context, table, encodedQuery) => {
    let _serviceNowAxios = context.serviceNOWAxios;
    return new Promise((_resolve, _reject) => {
      _serviceNowAxios
        .fetchServiceNowRecordsByEncodedQuery(table, encodedQuery)
        .then(_connections => {
          _resolve(_connections);
        })
        .catch(_error => {
          _reject(_error);
        });
    });
  };

  fetchServiceNowDatasources = async (context, _partURL) => {
    context.logger.info(`ServiceNowService.fetchServiceNowDatasources: Start`);
    let _serviceNowAxios = context.serviceNOWAxios;
    return new Promise((_resolve, _reject) => {
      let _connections = new Array();
      _serviceNowAxios
        .fetchServiceNowDatasources(context, _partURL)
        .then(_response => {
          let records = _response.data,
            _success = _response.status,
            _nextURL = _response.cursor.next_url;
          context.logger.info(
            `ServiceNowService.fetchServiceNowDatasources: _success= ${_success}`,
          );
          if ('SUCCESS' !== _success.toUpperCase()) {
            _reject(_response.message);
          } else {
            records.forEach(datasource => {
              _connections.push(serviceNOWBO.get(datasource, context.globalParams['NamePrefix']));
            });
            let obj = { _connections: _connections, _nextURL: _nextURL };

            // context.logger.debug(`bigID JSON _connections: ${JSON.stringify(_connections)}`);
            context.logger.debug(`bigID JSON _nextURL: ${_nextURL}`);
            // context.logger.debug(`bigID JSON _obj: ${JSON.stringify(obj)}`);
            _resolve(obj);
          }
        })
        .catch(_error => {
          _reject(_error);
        });
    });
  };
}

module.exports = ServiceNOWService;
