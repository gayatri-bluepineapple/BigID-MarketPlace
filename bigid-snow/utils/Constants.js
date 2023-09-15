const Status = {
  COMPLETED: 'COMPLETED',
  IN_PROGRESS: 'IN_PROGRESS',
  ERROR: 'ERROR',
};

const FACTICE_CREDENTIALS_ID = 'snow_import_credentials';

const CLASSIFICATION_TAG_NAME = 'sensitivity_level';

const GrantType = {
  PASSWORD: 'password',
};

const BigIdDatasourceFilter = [
  {
    field: 'type',
    value: ['rdb-db2', 'rdb-mssql', 'rdb-mysql', 'rdb-oracle', 'rdb-postgresql', 'rdb-sybase'],
    operator: 'in',
  },
];
const disoverySource = 'Other Automated';

const serviceNOWClassificationLevels = {
  sn_highly_sensitive: 'highly_sensitive',
  sn_confidential: 'confidential',
  sn_internal: 'internal',
  sn_public: 'public',
};

const dbTypes = [
  { bigid_name: 'rdb-mysql', sn_name: 'cmdb_ci_db_mysql_instance' },
  { bigid_name: 'rdb-mssql', sn_name: 'cmdb_ci_db_mssql_instance' },
  { bigid_name: 'rdb-postgresql', sn_name: 'cmdb_ci_db_postgresql_instance' },
  { bigid_name: 'rdb-db2', sn_name: 'cmdb_ci_db_db2_instance' },
  { bigid_name: 'rdb-sybase', sn_name: 'cmdb_ci_db_syb_instance' },
  { bigid_name: 'rdb-oracle', sn_name: 'cmdb_ci_db_ora_instance' },
  { bigid_name: 'o365-onedrive', sn_name: 'cmdb_ci_cloud_object_storage' }, //cloud:remove
  { bigid_name: 's3-v2', sn_name: 'cmdb_ci_cloud_object_storage' }, //cloud:remove
  { bigid_name: 's3', sn_name: 'cmdb_ci_cloud_object_storage' }, //cloud:remove
];

const dnsDomain = [
  { bigid_name: 's3-v2', sn_domain: 'bigid-s3-v2.aws.com' },
  { bigid_name: 's3', sn_domain: 'bigid-s3.aws.com' },
];

const dbPorts = {
  'rdb-mysql': '3306',
  'rdb-mssql': '1433',
  'rdb-postgresql': '5432',
  'rdb-oracle': '1521',
  'rdb-sybase': '5000',
  'rdb-db2': '50000',
};

const ACTION_IN_PROGRESS = 0;
const ACTION_COMPLETED = 1;
const UPPER_LIMIT = 2;

module.exports = {
  serviceNOWClassificationLevels: serviceNOWClassificationLevels,
  CLASSIFICATION_TAG_NAME,
  DATASOURCE_DISCOVER_SOURCE: disoverySource,
  BIG_ID_DATASOURCE_FILTER: BigIdDatasourceFilter,
  Status: Status,
  ACTION_COMPLETED,
  ACTION_IN_PROGRESS,
  UPPER_LIMIT,
  GrantType: GrantType,
  Types: dbTypes,
  Domain: dnsDomain,
  Ports: dbPorts,
  FACTICE_CREDENTIALS_ID: FACTICE_CREDENTIALS_ID,
};
