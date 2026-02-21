using './main.bicep'

// Production environment parameters
param environment = 'prod'
param location = 'polandcentral'
param dataverseUrl = '' // Set via: azd env set DATAVERSE_URL 'https://<org>.crm4.dynamics.com'
