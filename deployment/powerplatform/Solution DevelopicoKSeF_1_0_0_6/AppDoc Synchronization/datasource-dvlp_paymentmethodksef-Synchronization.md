# Power App Documentation \- Synchronization

| Property                   | Value                        |
| -------------------------- | ---------------------------- |
| App Name                   | Synchronization              |
| Documentation generated at | sobota, 21 lutego 2026 11:30 |

- [Overview](index-Synchronization.md)
- [App Details](appdetails-Synchronization.md)
- [Variables](variables-Synchronization.md)
- [DataSources](datasources-Synchronization.md)
- [Resources](resources-Synchronization.md)
- [Controls](controls-Synchronization.md)

### dvlp\_paymentmethodksef

| Property | Value                   |
| -------- | ----------------------- |
| Name     | dvlp\_paymentmethodksef |
| Type     | OptionSetInfo           |

#### DataSource Properties

| Property                   | Value                                                                                                                                                                                                                  |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DatasetName                | default.cds                                                                                                                                                                                                            |
| DisplayName                | Payment Method (KSeF)                                                                                                                                                                                                  |
| OptionSetInfoNameMapping   | <table><tr><td>OptionSetInfoNameMapping</td><td><table><tr><td>100000002</td><td>`gotówka`</td></tr><tr><td>100000001</td><td>`karta`</td></tr><tr><td>100000000</td><td>`przelew`</td></tr></table></td></tr></table> |
| OptionSetIsBooleanValued   | False                                                                                                                                                                                                                  |
| OptionSetIsGlobal          | True                                                                                                                                                                                                                   |
| OptionSetReference         | "OptionSetReferenceItem0": {"OptionSetReferenceEntityName": "KSeF Invoices", "OptionSetReferenceColumnName": "dvlp\_paymentmethod"}                                                                                    |
| OptionSetTypeKey           | PicklistType                                                                                                                                                                                                           |
| RelatedColumnInvariantName | dvlp\_paymentmethod                                                                                                                                                                                                    |
| RelatedEntityName          | KSeF Invoices                                                                                                                                                                                                          |
