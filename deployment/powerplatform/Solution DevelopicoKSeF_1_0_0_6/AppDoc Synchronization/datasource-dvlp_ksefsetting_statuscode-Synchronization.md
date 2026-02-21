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

### dvlp\_ksefsetting\_statuscode

| Property | Value                         |
| -------- | ----------------------------- |
| Name     | dvlp\_ksefsetting\_statuscode |
| Type     | OptionSetInfo                 |

#### DataSource Properties

| Property                   | Value                                                                                                                                                       |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DatasetName                | default.cds                                                                                                                                                 |
| DisplayName                | Status Reason (KSeF Settings)                                                                                                                               |
| OptionSetInfoNameMapping   | <table><tr><td>OptionSetInfoNameMapping</td><td><table><tr><td>1</td><td>`Active`</td></tr><tr><td>2</td><td>`Inactive`</td></tr></table></td></tr></table> |
| OptionSetIsBooleanValued   | False                                                                                                                                                       |
| OptionSetIsGlobal          | False                                                                                                                                                       |
| OptionSetReference         | "OptionSetReferenceItem0": {"OptionSetReferenceEntityName": "KSeF Settings", "OptionSetReferenceColumnName": "statuscode"}                                  |
| OptionSetTypeKey           | StatusType                                                                                                                                                  |
| RelatedColumnInvariantName | statuscode                                                                                                                                                  |
| RelatedEntityName          | KSeF Settings                                                                                                                                               |
