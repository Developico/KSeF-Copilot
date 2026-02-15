using './main.bicep'

// Development environment parameters
param environment = 'dev'
param location = 'westeurope'
param dataverseUrl = '' // Set via environment variable or azd parameter
