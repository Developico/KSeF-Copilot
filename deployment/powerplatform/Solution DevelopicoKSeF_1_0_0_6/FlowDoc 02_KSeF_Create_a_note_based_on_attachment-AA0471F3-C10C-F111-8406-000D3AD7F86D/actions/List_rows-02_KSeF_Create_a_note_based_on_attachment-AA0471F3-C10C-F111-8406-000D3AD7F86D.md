# Flow Documentation \- 02\_KSeF\_Create\_a\_note\_based\_on\_attachment\-AA0471F3\-C10C\-F111\-8406\-000D3AD7F86D

| Flow Name                  | 02\_KSeF\_Create\_a\_note\_based\_on\_attachment\-AA0471F3\-C10C\-F111\-8406\-000D3AD7F86D |
| -------------------------- | ------------------------------------------------------------------------------------------ |
| Flow Name                  | 02\_KSeF\_Create\_a\_note\_based\_on\_attachment\-AA0471F3\-C10C\-F111\-8406\-000D3AD7F86D |
| Documentation generated at | sobota, 21 lutego 2026 11:30                                                               |
| Number of Variables        | 0                                                                                          |
| Number of Actions          | 9                                                                                          |

- [Overview](../index-02_KSeF_Create_a_note_based_on_attachment-AA0471F3-C10C-F111-8406-000D3AD7F86D.md)
- [Connection References](../connections-02_KSeF_Create_a_note_based_on_attachment-AA0471F3-C10C-F111-8406-000D3AD7F86D.md)
- [Variables](../variables-02_KSeF_Create_a_note_based_on_attachment-AA0471F3-C10C-F111-8406-000D3AD7F86D.md)
- [Triggers & Actions](../triggersactions-02_KSeF_Create_a_note_based_on_attachment-AA0471F3-C10C-F111-8406-000D3AD7F86D.md)

## List\_rows

| Property   | Value                                                                                                                                                |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Name       | List\_rows                                                                                                                                           |
| Type       | OpenApiConnection                                                                                                                                    |
| Connection | [![commondataserviceforapps](../commondataserviceforapps32.png) Microsoft Dataverse](https://docs.microsoft.com/connectors/commondataserviceforapps) |

### Inputs

| Property   | Value                                                                                                                                                                                                                                             |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| metadata   | <table><tr><td>operationMetadataId</td><td>`382994e8-438b-40ef-8aaf-981c158f0baf`</td></tr></table>                                                                                                                                               |
| parameters | <table><tr><td>entityName</td><td>`dvlp_ksefinvoices`</td></tr><tr><td>$filter</td><td>`dvlp_ksefinvoiceid eq @{triggerOutputs()?['body/dvlp_ksefinvoiceid']}`</td></tr><tr><td>$orderby</td><td>`createdon desc`</td></tr></table>               |
| host       | <table><tr><td>apiId</td><td>`/providers/Microsoft.PowerApps/apis/shared_commondataserviceforapps`</td></tr><tr><td>operationId</td><td>`ListRecords`</td></tr><tr><td>connectionName</td><td>`shared_commondataserviceforapps`</td></tr></table> |

### Next Action(s) Conditions

| Next Action                                                                                                        |
| ------------------------------------------------------------------------------------------------------------------ |
| [Compose \[Succeeded\]](Compose-02_KSeF_Create_a_note_based_on_attachment-AA0471F3-C10C-F111-8406-000D3AD7F86D.md) |
