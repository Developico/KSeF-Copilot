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

## Screen1

| Property                        | Value        |
| ------------------------------- | ------------ |
| ![screen](resources/screen.png) | Type: screen |

### Design

| Property            | Value                                                                                                                                                                                                                                                                                                                                                                                                           |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Height              | \`Max(App.Height, App.MinScreenHeight)\`                                                                                                                                                                                                                                                                                                                                                                        |
| ImagePosition       | \`ImagePosition.Fit\`                                                                                                                                                                                                                                                                                                                                                                                           |
| LoadingSpinner      | \`LoadingSpinner.None\`                                                                                                                                                                                                                                                                                                                                                                                         |
| LoadingSpinnerColor | <table border="0"><tr><td style="width:50%; background-color:#ccffcc; color:black;"><table border="0"><tr><td>RGBA(0, 120, 212, 1)</td></tr><tr><td style="background-color:#0078D4"></td></tr></table></td><td style="width:50%; background-color:#ffcccc; color:black;"><table border="0"><tr><td>RGBA(56, 96, 178, 1)</td></tr><tr><td style="background-color:#3860B2"></td></tr></table></td></tr></table> |
| Orientation         | \`If(Self.Width \< Self.Height, Layout.Vertical, Layout.Horizontal)\`                                                                                                                                                                                                                                                                                                                                           |
| Size                | \`1 + CountRows(App.SizeBreakpoints) \- CountIf(App.SizeBreakpoints, Value \>\= Self.Width)\`                                                                                                                                                                                                                                                                                                                   |
| Width               | \`Max(App.Width, App.MinScreenWidth)\`                                                                                                                                                                                                                                                                                                                                                                          |

### Color Properties

| Property | Value                                                                                                                                                                                                                                                                                                                                                                                              |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fill     | <table border="0"><tr><td style="width:50%; background-color:#ccffcc; color:black;"><table border="0"><tr><td>RGBA(255, 255, 255, 1)</td></tr><tr><td style="background-color:#FFFFFF"></td></tr></table></td><td style="width:50%; background-color:#ffcccc; color:black;"><table border="0"><tr><td>White</td></tr><tr><td style="background-color:#FFFFFF"></td></tr></table></td></tr></table> |

### Child & Parent Controls
