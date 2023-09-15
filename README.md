# BigID - ServiceNOW Integration
Readme 2021-05-03

## Introduction 
Datasource Classification App for ServiceNow is an app built to work with BigID marketplace. This helps lets the user synchronize data source information across BigID app and ServiceNow instance.  The app supports the following data source types: 

* MSSQL
* MYSQL
* DB2
* POSTGRES
* ORACLE
* SYBASE

After it is configured properly, it can be used to do the following actions. 

* __Import –__ To retrieve data sources from ServiceNow to BigID 

* __Export –__ To push data sources from BigID to ServiceNow  

* __Sync –__ To push sensitivity information from BigID scan results to ServiceNow for the synced data sources 

## Prerequisites
* BigID installation up and running
* ServiceNOW instance up and running
* ServiceNOW oauth configured
* ServiceNOW integration user credentials configured

## Configuration
* make sure BigID Base URL is entered correctly

* Enter Global parameters as below:
	* __ServiceNOWBaseURL:__  enter the ServiceNow instance url without the any slash in the end (e.g. https://instance-name.service-now.com).
	* __ServiceNowConnectedAppId:__ enter the OAUTH client ID, acquired in the OAUTH Configuration process.
	* __ServiceNowConnectedAppSecret:__ enter the OAUTH client secret, acquired in the OAUTH Configuration process.
	* __ServiceNowUsername:__ enter the ServiceNow username. The user here must have itil role in ServiceNow.
	* __ServiceNowPassword:__ enter the ServiceNow password.

## Executing Actions 

### Import
Click Run against import action. This action does not require any parameters. On completion, you will find the data sources, present in ServiceNow but not yet synced with BigID, added to the data sources list in the BigID platform.
### Export
Click Run against export action. This action does not require any parameters. On completion, you will find the data sources, present in BigID but not yet synced with ServiceNow, added to the data sources list in the ServiceNow instance.
### Sync
This action has four parameters: __sensitivity_level_1__, __sensitivity_level_2__, __sensitivity_level_3__ and __sensitivity_level_4__. You need to fill them with the X from your Saved Queries in BigID plarform defined as sensitivity_level=X. The highest sensitivity item should be against __sensitivity_level_1__ and the lowest should be against __sensitivity_level_4__. The parameters __sensitivity_level_1__, __sensitivity_level_2__, __sensitivity_level_3__ and __sensitivity_level_4__ are mapped to ServiceNow Information Object data classification levels __Highly Sensitive__, __Confidential__, __Public__ and __Internal__ respectively. Click Run after setting up the parameters correctly. The sensitivity information is extracted from the BigID platform scan results and updated against catalogs and information objects of the associated data sources in ServiceNow.

## Authors
BigID Engineering

## License
This project is licensed under the MIT License - see the LICENSE.md file for details