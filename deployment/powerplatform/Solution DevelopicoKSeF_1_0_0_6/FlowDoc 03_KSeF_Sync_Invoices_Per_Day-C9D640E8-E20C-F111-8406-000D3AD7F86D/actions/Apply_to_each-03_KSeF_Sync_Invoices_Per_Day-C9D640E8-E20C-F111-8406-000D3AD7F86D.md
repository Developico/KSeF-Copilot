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

## Apply\_to\_each

| Property | Value           |
| -------- | --------------- |
| Name     | Apply\_to\_each |
| Type     | Foreach         |

### Inputs

| Property | Value                                                                                               |
| -------- | --------------------------------------------------------------------------------------------------- |
| foreach  | @outputs('List_rows')?['body/value']                                                                |
| metadata | <table><tr><td>operationMetadataId</td><td>`4bf6fb01-0c35-4c0b-adf6-f37b95d1f697`</td></tr></table> |

### Subactions

| Action                                                                                                     |
| ---------------------------------------------------------------------------------------------------------- |
| [Start\_KSeF\_Sync](Start_KSeF_Sync-03_KSeF_Sync_Invoices_Per_Day-C9D640E8-E20C-F111-8406-000D3AD7F86D.md) |
