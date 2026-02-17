using './main.bicep'

// Test environment parameters
param environment = 'test'
param location = 'polandcentral'
param dataverseUrl = '' // Set via: azd env set DATAVERSE_URL 'https://<org>.crm4.dynamics.com'
