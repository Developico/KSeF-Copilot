# Flow Documentation \- 03\_KSeF\_Sync\_Invoices\_Per\_Day\-C9D640E8\-E20C\-F111\-8406\-000D3AD7F86D

| Flow Name                  | 03\_KSeF\_Sync\_Invoices\_Per\_Day\-C9D640E8\-E20C\-F111\-8406\-000D3AD7F86D |
| -------------------------- | ---------------------------------------------------------------------------- |
| Flow Name                  | 03\_KSeF\_Sync\_Invoices\_Per\_Day\-C9D640E8\-E20C\-F111\-8406\-000D3AD7F86D |
| Documentation generated at | sobota, 21 lutego 2026 11:30                                                 |
| Number of Variables        | 0                                                                            |
| Number of Actions          | 3                                                                            |

- [Overview](../index-03_KSeF_Sync_Invoices_Per_Day-C9D640E8-E20C-F111-8406-000D3AD7F86D.md)
- [Connection References](../connections-03_KSeF_Sync_Invoices_Per_Day-C9D640E8-E20C-F111-8406-000D3AD7F86D.md)
- [Variables](../variables-03_KSeF_Sync_Invoices_Per_Day-C9D640E8-E20C-F111-8406-000D3AD7F86D.md)
- [Triggers & Actions](../triggersactions-03_KSeF_Sync_Invoices_Per_Day-C9D640E8-E20C-F111-8406-000D3AD7F86D.md)

## Start\_KSeF\_Sync

| Property   | Value                                                                                                                                                       |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Name       | Start\_KSeF\_Sync                                                                                                                                           |
| Type       | OpenApiConnection                                                                                                                                           |
| Connection | [dvlp\-5fdvlp\-2dksef\-2dpp\-2dconnector\-5f0ad1af9befb93b50](https://docs.microsoft.com/connectors/dvlp-5fdvlp-2dksef-2dpp-2dconnector-5f0ad1af9befb93b50) |

### Inputs

| Property       | Value                                                                                                                                                                                                                                                                                                       |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| metadata       | <table><tr><td>operationMetadataId</td><td>`db655dbb-1bc0-42a9-84b9-6316dd28f65f`</td></tr></table>                                                                                                                                                                                                         |
| host           | <table><tr><td>connectionName</td><td>`shared_dvlp-5fdvlp-2dksef-2dpp-2dconnector-5f0ad1af9befb93b50`</td></tr><tr><td>operationId</td><td>`StartSync`</td></tr><tr><td>apiId</td><td>`/providers/Microsoft.PowerApps/apis/shared_dvlp-5fdvlp-2dksef-2dpp-2dconnector-5f0ad1af9befb93b50`</td></tr></table> |
| parameters     | <table><tr><td>body/settingId</td><td>`@items('Apply_to_each')?['dvlp_ksefsettingid']`</td></tr><tr><td>body/direction</td><td>`incoming`</td></tr></table>                                                                                                                                                 |
| authentication | @parameters('$authentication')                                                                                                                                                                                                                                                                              |
