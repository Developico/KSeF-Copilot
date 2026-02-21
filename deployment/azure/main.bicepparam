using './main.bicep'

// Development environment parameters
param environment = 'dev'
param location = 'polandcentral'
param dataverseUrl = '' // Set via environment variable or azd parameter
