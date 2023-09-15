const constants = require('../utils/Constants');

class ServiceNOWBO {
  get = (datasource, prefix) => {
    let _name = this.format(
      this.checkNotNull(datasource, 'parent.name', 'display_value'),
      this.checkNotNull(datasource, 'child.name', 'display_value'),
      prefix,
    );

    let _bigIdType = "";
    let parent_class_name = this.checkNotNull(datasource, 'parent.sys_class_name', 'value');

    //Parent.class_name = "cmdb_ci_cloud_object_storage" then update type based on service name
    if(parent_class_name === "cmdb_ci_cloud_object_storage") {
      _bigIdType = this.checkNotNull(datasource, 'parent.service_name', 'value');
    }
    else{
      _bigIdType = this.bigIdType(
        this.checkNotNull(datasource, 'parent.sys_class_name', 'value'),
      );
    }
    /*let _bigIdType = this.bigIdType(
      this.checkNotNull(datasource, 'parent.sys_class_name', 'value'),
    );*/

    let _enabled = this.enabled(
      this.checkNotNull(datasource, 'parent.operational_status', 'display_value'),
    );
    let _port =
      this.checkNotNull(datasource, 'parent.tcp_port', 'value') || constants.Ports[_bigIdType];
    let _url = this.connectionURL(
      this.checkNotNull(datasource, 'child.ip_address', 'value'),
      this.checkNotNull(datasource, 'child.host_name', 'value'),
      this.checkNotNull(datasource, 'parent.sid', 'value'),
      this.checkNotNull(datasource, 'parent.db_name', 'value'),
      this.checkNotNull(datasource, 'parent.sys_class_name', 'value'),
      this.checkNotNull(datasource, 'parent.sys_class_name', 'display_value'),
      _port,
    );

    let responseObj = {
      name: _name,
      type: _bigIdType,
      operational_status: _enabled,
      connection_url: _url,
      sys_id: this.checkNotNull(datasource, 'parent.sys_id', 'value'),
      dns_domain: this.checkNotNull(datasource, 'parent.dns_domain', 'value'), //for unstructured data sources
      bucket_name: this.checkNotNull(datasource, 'parent.name', 'display_value'), //for unstructured data sources
    };
    if (
      datasource.hasOwnProperty('parent.cdb_sys_id') &&
      datasource.hasOwnProperty('parent.cdb_name')
    ) {
      responseObj['cdb_sys_id'] = this.checkNotNull(datasource, 'parent.cdb_sys_id', 'value');
      responseObj['cdb_name'] = this.checkNotNull(datasource, 'parent.cdb_name', 'display_value');
    }
    return responseObj;
  };

  format = (parent, child, prefix) => {
    let _name = prefix + parent;
    let pattern = /[^\d a-z A-Z _ - ( ) { } \[ \] \s]/g;
    _name = _name.replace(pattern, '_');
    if (child != '') _name += '(' + child + ')';
    return _name;
  };

  enabled = operational => {
    return operational !== 'Operational' ? 'no' : 'yes';
  };

  bigIdType = type => {
    let _type = constants.Types.filter(element => {
      return element.sn_name === type;
    });

    if (_type[0] != null) return _type[0].bigid_name || '';
    else return '';
  };

  connectionURL = (ip, host, sid, db, type, name, port) => {
    let _server = ip !== '' ? ip : host;
    let _url = _server + ':' + port;
    /** if database type is oracle or db2 */
    switch (type.toLowerCase()) {
      case 'cmdb_ci_db_ora_instance':
        if (sid !== '') {
          _url = _server + ':' + port + '/' + sid;
        }
        break;
      case 'cmdb_ci_db_db2_instance':
        let _name = db !== '' ? db : name;
        _url = _server + ':' + port + '/' + name;
        break;
    }
    return _url;
  };

  matchedCIServer = (serverURL, nowCIServers) => {
    if (undefined === serverURL || null === serverURL || '' === serverURL) return undefined;
    return nowCIServers.find(nowCIServer => {
      return (
        nowCIServer.ip_address === serverURL.ip_address || nowCIServer.host_name === serverURL.host
      );
    });
  };

  matchedLogicalDataCenter = (domain, nowLogicalDataCenters, context) => {
    if (undefined === domain || null === domain || '' === domain) return undefined;
    return nowLogicalDataCenters.find(nowLogicalDataCenter => {
      context.logger.debug(`matchedLogicalDataCenter.domain ${domain}`);
      context.logger.debug(
        `matchedLogicalDataCenter.dns_domain ${nowLogicalDataCenter.dns_domain}`,
      );
      return nowLogicalDataCenter.dns_domain === domain;
    });
  };

  serverPayload = ciServer => {
    return {
      className: ciServer['sys_class_name'],
      internal_id: 'server',
      values: { sys_id: ciServer['sys_id'] },
    };
  };

  logicalDataCenterPayload = logicalDataCenter => {
    return {
      className: logicalDataCenter['sys_class_name'],
      internal_id: 'logical_datacenter',
      values: { sys_id: logicalDataCenter['sys_id'] },
    };
  };

  irePayload = (servers, instances, cdbInstances) => {
    let _irePayload = { items: [], relations: [] };
    _irePayload.items.push(servers);
    _irePayload.items.push(instances);
    if (cdbInstances !== undefined) {
      _irePayload.items.push(cdbInstances);
      _irePayload.relations.push({ child: 0, parent: 2, type: 'Runs on::Runs' });
      _irePayload.relations.push({ child: 2, parent: 1, type: 'Managed by::Manages' });
    } else {
      _irePayload.relations.push({ child: 0, parent: 1, type: 'Runs on::Runs' });
    }
    return _irePayload;
  };

  ireCloudObjectPayload = (logicalDataCenters, cloudInstances) => {
    let _irePayload = { items: [], relations: [] };
    _irePayload.items.push(logicalDataCenters);
    _irePayload.items.push(cloudInstances);

    _irePayload.relations.push({ child: 0, parent: 1, type: 'Hosted on::Hosts' });

    return _irePayload;
  };

  parseIRResponse = (payload, response) => {
    let _errors = new Array();
    response.items
      .filter(_item => {
        return _item.hasOwnProperty('errors');
      })
      .forEach(_item => {
        _item.errors.forEach(_error => {
          _errors.push(_error);
        });
      });
    let sysId = undefined;
    let cdbSysId, cdbName;
    if (undefined !== response.items && 0 < response.items.length) {
      sysId = response.items[1].sysId;
      if (response.items.length > 2) {
        cdbSysId = response.items[2].sysId;
        cdbName = response.items[2].name;
      }
    }
    let parsedResponse = {
      success: _errors.length > 0 ? false : true,
      sysId: sysId,
      payload: payload,
      response: response,
      errors: _errors,
    };

    if (cdbSysId !== undefined && cdbName !== undefined) {
      parsedResponse['cdbName'] = cdbName;
      parsedResponse['cdbSysId'] = cdbSysId;
    }

    return parsedResponse;
  };

  checkNotNull = (datasource, parent, child) => {
    let childProp = '';
    if (
      datasource.hasOwnProperty(parent) &&
      datasource[parent] != null &&
      datasource[parent].hasOwnProperty(child) &&
      datasource[parent][child] != null
    ) {
      childProp = datasource[parent][child];
    }
    return childProp;
  };
}

module.exports = new ServiceNOWBO();
