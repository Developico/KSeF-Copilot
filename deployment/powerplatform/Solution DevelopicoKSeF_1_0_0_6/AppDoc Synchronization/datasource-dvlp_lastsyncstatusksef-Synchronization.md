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

### dvlp\_lastsyncstatusksef

| Property | Value                    |
| -------- | ------------------------ |
| Name     | dvlp\_lastsyncstatusksef |
| Type     | OptionSetInfo            |

#### DataSource Properties

| Property                   | Value                                                                                                                                                                     |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DatasetName                | default.cds                                                                                                                                                               |
| DisplayName                | Last Sync Status (KSeF)                                                                                                                                                   |
| OptionSetInfoNameMapping   | <table><tr><td>OptionSetInfoNameMapping</td><td><table><tr><td>100000001</td><td>`error`</td></tr><tr><td>100000000</td><td>`success`</td></tr></table></td></tr></table> |
| OptionSetIsBooleanValued   | False                                                                                                                                                                     |
| OptionSetIsGlobal          | True                                                                                                                                                                      |
| OptionSetReference         | "OptionSetReferenceItem0": {"OptionSetReferenceEntityName": "KSeF Settings", "OptionSetReferenceColumnName": "dvlp\_lastsyncstatus"}                                      |
| OptionSetTypeKey           | PicklistType                                                                                                                                                              |
| RelatedColumnInvariantName | dvlp\_lastsyncstatus                                                                                                                                                      |
| RelatedEntityName          | KSeF Settings                                                                                                                                                             |
