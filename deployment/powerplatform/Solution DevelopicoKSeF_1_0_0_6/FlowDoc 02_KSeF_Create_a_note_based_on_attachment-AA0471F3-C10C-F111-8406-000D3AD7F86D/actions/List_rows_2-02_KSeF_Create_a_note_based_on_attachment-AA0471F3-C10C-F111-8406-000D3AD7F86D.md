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

## List\_rows\_2

| Property   | Value                                                                                                                                                |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Name       | List\_rows\_2                                                                                                                                        |
| Type       | OpenApiConnection                                                                                                                                    |
| Connection | [![commondataserviceforapps](../commondataserviceforapps32.png) Microsoft Dataverse](https://docs.microsoft.com/connectors/commondataserviceforapps) |

### Inputs

| Property   | Value                                                                                                                                                                                                                                             |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| metadata   | <table><tr><td>operationMetadataId</td><td>`34a5ac4b-977f-4bbe-b433-4df449db2824`</td></tr></table>                                                                                                                                               |
| parameters | <table><tr><td>entityName</td><td>`annotations`</td></tr><tr><td>$filter</td><td>`subject eq 'dvlp_doc_thumbnail' and _objectid_value eq @{triggerOutputs()?['body/dvlp_ksefinvoiceid']}`</td></tr></table>                                       |
| host       | <table><tr><td>apiId</td><td>`/providers/Microsoft.PowerApps/apis/shared_commondataserviceforapps`</td></tr><tr><td>operationId</td><td>`ListRecords`</td></tr><tr><td>connectionName</td><td>`shared_commondataserviceforapps`</td></tr></table> |

### Next Action(s) Conditions

| Next Action                                                                                                            |
| ---------------------------------------------------------------------------------------------------------------------- |
| [Condition \[Succeeded\]](Condition-02_KSeF_Create_a_note_based_on_attachment-AA0471F3-C10C-F111-8406-000D3AD7F86D.md) |
