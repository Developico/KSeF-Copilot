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

### dvlp\_ksefinvoice\_dvlp\_isoverdue

| Property | Value                              |
| -------- | ---------------------------------- |
| Name     | dvlp\_ksefinvoice\_dvlp\_isoverdue |
| Type     | OptionSetInfo                      |

#### DataSource Properties

| Property                   | Value                                                                                                                                              |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| DatasetName                | default.cds                                                                                                                                        |
| DisplayName                | Is Overdue (KSeF Invoices)                                                                                                                         |
| OptionSetInfoNameMapping   | <table><tr><td>OptionSetInfoNameMapping</td><td><table><tr><td>1</td><td>`Yes`</td></tr><tr><td>0</td><td>`No`</td></tr></table></td></tr></table> |
| OptionSetIsBooleanValued   | True                                                                                                                                               |
| OptionSetIsGlobal          | False                                                                                                                                              |
| OptionSetReference         | "OptionSetReferenceItem0": {"OptionSetReferenceEntityName": "KSeF Invoices", "OptionSetReferenceColumnName": "dvlp\_isoverdue"}                    |
| OptionSetTypeKey           | BooleanType                                                                                                                                        |
| RelatedColumnInvariantName | dvlp\_isoverdue                                                                                                                                    |
| RelatedEntityName          | KSeF Invoices                                                                                                                                      |
