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

### dvlp\_ksefsetting\_statecode

| Property | Value                        |
| -------- | ---------------------------- |
| Name     | dvlp\_ksefsetting\_statecode |
| Type     | OptionSetInfo                |

#### DataSource Properties

| Property                   | Value                                                                                                                                                       |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DatasetName                | default.cds                                                                                                                                                 |
| DisplayName                | Status (KSeF Settings)                                                                                                                                      |
| OptionSetInfoNameMapping   | <table><tr><td>OptionSetInfoNameMapping</td><td><table><tr><td>1</td><td>`Inactive`</td></tr><tr><td>0</td><td>`Active`</td></tr></table></td></tr></table> |
| OptionSetIsBooleanValued   | False                                                                                                                                                       |
| OptionSetIsGlobal          | False                                                                                                                                                       |
| OptionSetReference         | "OptionSetReferenceItem0": {"OptionSetReferenceEntityName": "KSeF Settings", "OptionSetReferenceColumnName": "statecode"}                                   |
| OptionSetTypeKey           | StateType                                                                                                                                                   |
| RelatedColumnInvariantName | statecode                                                                                                                                                   |
| RelatedEntityName          | KSeF Settings                                                                                                                                               |
