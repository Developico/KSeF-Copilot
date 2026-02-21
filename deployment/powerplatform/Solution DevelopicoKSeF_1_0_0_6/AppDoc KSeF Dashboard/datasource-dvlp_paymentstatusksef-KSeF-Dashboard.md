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

### dvlp\_paymentstatusksef

| Property | Value                   |
| -------- | ----------------------- |
| Name     | dvlp\_paymentstatusksef |
| Type     | OptionSetInfo           |

#### DataSource Properties

| Property                   | Value                                                                                                                                                                                                                                                              |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| DatasetName                | default.cds                                                                                                                                                                                                                                                        |
| DisplayName                | Payment Status (KSeF)                                                                                                                                                                                                                                              |
| OptionSetInfoNameMapping   | <table><tr><td>OptionSetInfoNameMapping</td><td><table><tr><td>100000003</td><td>`partial`</td></tr><tr><td>100000001</td><td>`paid`</td></tr><tr><td>100000002</td><td>`overdue`</td></tr><tr><td>100000000</td><td>`pending`</td></tr></table></td></tr></table> |
| OptionSetIsBooleanValued   | False                                                                                                                                                                                                                                                              |
| OptionSetIsGlobal          | True                                                                                                                                                                                                                                                               |
| OptionSetReference         | "OptionSetReferenceItem0": {"OptionSetReferenceEntityName": "KSeF Invoices", "OptionSetReferenceColumnName": "dvlp\_paymentstatus"}                                                                                                                                |
| OptionSetTypeKey           | PicklistType                                                                                                                                                                                                                                                       |
| RelatedColumnInvariantName | dvlp\_paymentstatus                                                                                                                                                                                                                                                |
| RelatedEntityName          | KSeF Invoices                                                                                                                                                                                                                                                      |
