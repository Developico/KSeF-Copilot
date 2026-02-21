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
| OptionSetInfoNameMapping   | <table><tr><td>OptionSetInfoNameMapping</td><td><table><tr><td>100000001</td><td>`karta`</td></tr><tr><td>100000002</td><td>`gotówka`</td></tr><tr><td>100000000</td><td>`przelew`</td></tr></table></td></tr></table> |
| OptionSetIsBooleanValued   | False                                                                                                                                                                                                                  |
| OptionSetIsGlobal          | True                                                                                                                                                                                                                   |
| OptionSetReference         | "OptionSetReferenceItem0": {"OptionSetReferenceEntityName": "KSeF Invoices", "OptionSetReferenceColumnName": "dvlp\_paymentmethod"}                                                                                    |
| OptionSetTypeKey           | PicklistType                                                                                                                                                                                                           |
| RelatedColumnInvariantName | dvlp\_paymentmethod                                                                                                                                                                                                    |
| RelatedEntityName          | KSeF Invoices                                                                                                                                                                                                          |
