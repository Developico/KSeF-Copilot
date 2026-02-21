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

## Add\_a\_new\_row

| Property   | Value                                                                                                                                                |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Name       | Add\_a\_new\_row                                                                                                                                     |
| Type       | OpenApiConnection                                                                                                                                    |
| Connection | [![commondataserviceforapps](../commondataserviceforapps32.png) Microsoft Dataverse](https://docs.microsoft.com/connectors/commondataserviceforapps) |

### Inputs

| Property   | Value                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| metadata   | <table><tr><td>operationMetadataId</td><td>`9cc09785-9051-4796-b0ef-e69999aa2a92`</td></tr></table>                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| parameters | <table><tr><td>entityName</td><td>`annotations`</td></tr><tr><td>item/subject</td><td>`dvlp_doc_thumbnail`</td></tr><tr><td>item/notetext</td><td>`Auto-generated PDF thumbnail`</td></tr><tr><td>item/isdocument</td><td>`True`</td></tr><tr><td>item/documentbody</td><td>`@body('Download_a_file_or_an_image')?['$content']`</td></tr><tr><td>item/filename</td><td>`@outputs('Compose')`</td></tr><tr><td>item/objectid_dvlp_ksefinvoice@odata.bind</td><td>`dvlp_ksefinvoices(@{triggerOutputs()?['body/dvlp_ksefinvoiceid']})`</td></tr></table> |
| host       | <table><tr><td>apiId</td><td>`/providers/Microsoft.PowerApps/apis/shared_commondataserviceforapps`</td></tr><tr><td>operationId</td><td>`CreateRecord`</td></tr><tr><td>connectionName</td><td>`shared_commondataserviceforapps`</td></tr></table>                                                                                                                                                                                                                                                                                                     |
