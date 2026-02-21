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

## Trigger

| Property  | Value                                           |
| --------- | ----------------------------------------------- |
| Name      | When\_a\_row\_is\_added,\_modified\_or\_deleted |
| Type      | OpenApiConnectionWebhook                        |
| Connector | commondataserviceforapps                        |

### Inputs Details

<table><tr><td>parameters</td><td><table><tr><td>subscriptionRequest/message</td><td>`3`</td></tr><tr><td>subscriptionRequest/entityname</td><td>`dvlp_ksefinvoice`</td></tr><tr><td>subscriptionRequest/scope</td><td>`4`</td></tr><tr><td>subscriptionRequest/filterexpression</td><td>`dvlp_doc_name ne null`</td></tr></table></td></tr><tr><td>host</td><td><table><tr><td>apiId</td><td>`/providers/Microsoft.PowerApps/apis/shared_commondataserviceforapps`</td></tr><tr><td>operationId</td><td>`SubscribeWebhookTrigger`</td></tr><tr><td>connectionName</td><td>`shared_commondataserviceforapps`</td></tr></table></td></tr></table>

### Other Trigger Properties

<table><tr><td>metadata</td><td><table><tr><td>operationMetadataId</td><td>`1745882d-f973-42f3-86a3-109d75f01d14`</td></tr></table></table></td></tr></table>
