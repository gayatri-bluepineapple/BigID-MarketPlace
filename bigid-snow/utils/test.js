(function () {
  let _datasource = require('../bo/ServiceNOWBO');
  let _response = [
    {
      'child.ip_address': { display_value: '10.2.0.91', value: '10.2.0.91' },
      'parent.sys_class_name': {
        display_value: 'MSFT SQL Instance',
        value: 'cmdb_ci_db_mssql_instance',
      },
      'parent.name': { display_value: 'To BigID MSSQL', value: 'To BigID MSSQL' },
      'child.host_name': { display_value: '', value: '' },
      'parent.operational_status': { display_value: 'Operational', value: '1' },
      'child.name': { display_value: 'BigID Server 01', value: 'BigID Server 01' },
      'parent.tcp_port': { display_value: '', value: '' },
      'parent.sys_id': {
        display_value: '7d36f8cd2f27201044ea56e62799b66f',
        value: '7d36f8cd2f27201044ea56e62799b66f',
      },
    },
    {
      'child.ip_address': { display_value: '10.2.0.91', value: '10.2.0.91' },
      'parent.sys_class_name': {
        display_value: 'MySQL Instance',
        value: 'cmdb_ci_db_mysql_instance',
      },
      'parent.name': { display_value: 'Linkage', value: 'Linkage' },
      'child.host_name': { display_value: '', value: '' },
      'parent.operational_status': { display_value: 'Operational', value: '1' },
      'child.name': { display_value: 'BigID Server 01', value: 'BigID Server 01' },
      'parent.tcp_port': { display_value: '3306', value: '3306' },
      'parent.sys_id': {
        display_value: '0a6f08aa2f57201044ea56e62799b6e0',
        value: '0a6f08aa2f57201044ea56e62799b6e0',
      },
    },
    {
      'child.ip_address': { display_value: '10.2.0.91', value: '10.2.0.91' },
      'parent.sys_class_name': {
        display_value: 'MySQL Instance',
        value: 'cmdb_ci_db_mysql_instance',
      },
      'parent.name': { display_value: 'APAC Users', value: 'APAC Users' },
      'child.host_name': { display_value: '', value: '' },
      'parent.operational_status': { display_value: 'Operational', value: '1' },
      'child.name': { display_value: 'BigID Server 01', value: 'BigID Server 01' },
      'parent.tcp_port': { display_value: '3306', value: '3306' },
      'parent.sys_id': {
        display_value: '826f08aa2f57201044ea56e62799b6f2',
        value: '826f08aa2f57201044ea56e62799b6f2',
      },
    },
    {
      'child.ip_address': { display_value: '10.2.0.91', value: '10.2.0.91' },
      'parent.sys_class_name': {
        display_value: 'PostgreSQL Instance',
        value: 'cmdb_ci_db_postgresql_instance',
      },
      'parent.name': { display_value: 'Benefits', value: 'Benefits' },
      'child.host_name': { display_value: '', value: '' },
      'parent.operational_status': { display_value: 'Operational', value: '1' },
      'child.name': { display_value: 'BigID Server 01', value: 'BigID Server 01' },
      'parent.tcp_port': { display_value: '5432', value: '5432' },
      'parent.sys_id': {
        display_value: '026f08aa2f57201044ea56e62799b6ef',
        value: '026f08aa2f57201044ea56e62799b6ef',
      },
    },
    {
      'child.ip_address': { display_value: '10.2.0.91', value: '10.2.0.91' },
      'parent.sys_class_name': {
        display_value: 'PostgreSQL Instance',
        value: 'cmdb_ci_db_postgresql_instance',
      },
      'parent.name': { display_value: 'Human Resources', value: 'Human Resources' },
      'child.host_name': { display_value: '', value: '' },
      'parent.operational_status': { display_value: 'Operational', value: '1' },
      'child.name': { display_value: 'BigID Server 01', value: 'BigID Server 01' },
      'parent.tcp_port': { display_value: '5432', value: '5432' },
      'parent.sys_id': {
        display_value: '426f08aa2f57201044ea56e62799b6e7',
        value: '426f08aa2f57201044ea56e62799b6e7',
      },
    },
    {
      'child.ip_address': { display_value: '10.2.0.91', value: '10.2.0.91' },
      'parent.sys_class_name': {
        display_value: 'PostgreSQL Instance',
        value: 'cmdb_ci_db_postgresql_instance',
      },
      'parent.name': { display_value: 'Directory', value: 'Directory' },
      'child.host_name': { display_value: '', value: '' },
      'parent.operational_status': { display_value: 'Operational', value: '1' },
      'child.name': { display_value: 'BigID Server 01', value: 'BigID Server 01' },
      'parent.tcp_port': { display_value: '5432', value: '5432' },
      'parent.sys_id': {
        display_value: '8a6f08aa2f57201044ea56e62799b6eb',
        value: '8a6f08aa2f57201044ea56e62799b6eb',
      },
    },
  ];
  const bigIdAxios = require('../utils/axios/BigID');
  const bigIdBo = require('../bo/BigIDBO');
  let _bigIdConnections = bigIdBo.format(new bigIdAxios({}).datasources()['ds_connections']);
  let _nowConnections = new Array();
  let _list = _response;
  _list.forEach(datasource => {
    _nowConnections.push(_datasource.get(datasource, 'SNOW_'));
  });

  _nowConnections.forEach(_connection => {
    if (_bigIdConnections.hasOwnProperty(_connection['sys_id'])) {
      console.debug('Exists: ', _connection);
    } else {
      console.debug('New: ', _connection);
    }
  });
})();
