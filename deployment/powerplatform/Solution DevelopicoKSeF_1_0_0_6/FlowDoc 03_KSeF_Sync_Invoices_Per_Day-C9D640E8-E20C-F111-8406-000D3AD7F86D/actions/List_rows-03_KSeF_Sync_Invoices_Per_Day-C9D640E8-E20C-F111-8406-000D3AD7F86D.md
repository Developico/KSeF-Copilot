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

## List\_rows

| Property   | Value                                                                                                                                                |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Name       | List\_rows                                                                                                                                           |
| Type       | OpenApiConnection                                                                                                                                    |
| Connection | [![commondataserviceforapps](../commondataserviceforapps32.png) Microsoft Dataverse](https://docs.microsoft.com/connectors/commondataserviceforapps) |

### Inputs

| Property       | Value                                                                                                                                                                                                                                             |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| metadata       | <table><tr><td>operationMetadataId</td><td>`d7caa609-54fd-4a4b-8349-bc9365407a93`</td></tr></table>                                                                                                                                               |
| host           | <table><tr><td>connectionName</td><td>`shared_commondataserviceforapps`</td></tr><tr><td>operationId</td><td>`ListRecords`</td></tr><tr><td>apiId</td><td>`/providers/Microsoft.PowerApps/apis/shared_commondataserviceforapps`</td></tr></table> |
| parameters     | <table><tr><td>entityName</td><td>`dvlp_ksefsettings`</td></tr></table>                                                                                                                                                                           |
| authentication | @parameters('$authentication')                                                                                                                                                                                                                    |

### Next Action(s) Conditions

| Next Action                                                                                                          |
| -------------------------------------------------------------------------------------------------------------------- |
| [Apply\_to\_each \[Succeeded\]](Apply_to_each-03_KSeF_Sync_Invoices_Per_Day-C9D640E8-E20C-F111-8406-000D3AD7F86D.md) |
