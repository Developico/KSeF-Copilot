# Power App Documentation \- KSeF Dashboard

| Property                   | Value                        |
| -------------------------- | ---------------------------- |
| App Name                   | KSeF Dashboard               |
| Documentation generated at | sobota, 21 lutego 2026 11:30 |

- [Overview](index-KSeF-Dashboard.md)
- [App Details](appdetails-KSeF-Dashboard.md)
- [Variables](variables-KSeF-Dashboard.md)
- [DataSources](datasources-KSeF-Dashboard.md)
- [Resources](resources-KSeF-Dashboard.md)
- [Controls](controls-KSeF-Dashboard.md)

### dvlp\_directionksef

| Property | Value               |
| -------- | ------------------- |
| Name     | dvlp\_directionksef |
| Type     | OptionSetInfo       |

#### DataSource Properties

| Property                   | Value                                                                                                                                                                         |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DatasetName                | default.cds                                                                                                                                                                   |
| DisplayName                | Direction (KSeF)                                                                                                                                                              |
| OptionSetInfoNameMapping   | <table><tr><td>OptionSetInfoNameMapping</td><td><table><tr><td>100000001</td><td>`outgoing`</td></tr><tr><td>100000000</td><td>`incoming`</td></tr></table></td></tr></table> |
| OptionSetIsBooleanValued   | False                                                                                                                                                                         |
| OptionSetIsGlobal          | True                                                                                                                                                                          |
| OptionSetReference         | "OptionSetReferenceItem0": {"OptionSetReferenceEntityName": "KSeF Invoices", "OptionSetReferenceColumnName": "dvlp\_direction"}                                               |
| OptionSetTypeKey           | PicklistType                                                                                                                                                                  |
| RelatedColumnInvariantName | dvlp\_direction                                                                                                                                                               |
| RelatedEntityName          | KSeF Invoices                                                                                                                                                                 |
