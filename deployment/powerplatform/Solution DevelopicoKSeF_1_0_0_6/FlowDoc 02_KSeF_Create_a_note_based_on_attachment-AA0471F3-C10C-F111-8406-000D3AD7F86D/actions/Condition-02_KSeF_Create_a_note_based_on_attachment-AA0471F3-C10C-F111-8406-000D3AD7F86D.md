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

## Condition

| Property   | Value                                                                                                        |
| ---------- | ------------------------------------------------------------------------------------------------------------ |
| Name       | Condition                                                                                                    |
| Type       | If                                                                                                           |
| Expression | <table><tr><td>equals</td><td>@empty(outputs('List_rows_2')?['body/value'])<br/>@true<br/></td></tr></table> |

### Inputs

| Property | Value                                                                                               |
| -------- | --------------------------------------------------------------------------------------------------- |
| metadata | <table><tr><td>operationMetadataId</td><td>`993103d7-f88a-43a4-9e2b-227b8a99ac1d`</td></tr></table> |

### Subactions

| Action                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------- |
| [Add\_a\_new\_row](Add_a_new_row-02_KSeF_Create_a_note_based_on_attachment-AA0471F3-C10C-F111-8406-000D3AD7F86D.md) |

### Elseactions

| Elseactions                                                                                                             |
| ----------------------------------------------------------------------------------------------------------------------- |
| [Apply\_to\_each\_2](Apply_to_each_2-02_KSeF_Create_a_note_based_on_attachment-AA0471F3-C10C-F111-8406-000D3AD7F86D.md) |
