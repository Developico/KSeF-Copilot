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

## Dashboard

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

| Property      | Value    |
| ------------- | -------- |
| Child Control | conMain  |
| Child Control | Gallery1 |

## Button1

| Property                                                                        | Value                                 |
| ------------------------------------------------------------------------------- | ------------------------------------- |
| ![Microsoft\_CoreControls\_Button](resources/Microsoft_CoreControls_Button.png) | Type: Microsoft\_CoreControls\_Button |

### Behavior

| Property | Value                                                                                                                                                                                                                        |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OnChange | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                                            |
| OnSelect | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`Switch( ThisItem.id, 1, Launch(_mdaInvoicesLink), 2, Navigate(Synchronization) )`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |

### Data

| Property          | Value                                                                                                                                                                                                                                                                                                                                |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| BorderRadius      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`8`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                                                                                                                                                        |
| BorderStyle       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`BorderStyle.Solid`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                                                                                                                                        |
| BorderThickness   | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`If( ThisItem.buttonStyle = "Standard", 1, 0 )`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                                                                                                            |
| ButtonType        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`ThisItem.buttonStyle`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                                                                                                                                     |
| DisabledFillColor | \`\`                                                                                                                                                                                                                                                                                                                                 |
| DisabledTextColor | \`\`                                                                                                                                                                                                                                                                                                                                 |
| FillColor         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`If( ThisItem.buttonStyle = "Standard", _colors.white.value, _colors.accent.value )`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                                                                       |
| HoverFillColor    | \`\`                                                                                                                                                                                                                                                                                                                                 |
| HoverTextColor    | \`\`                                                                                                                                                                                                                                                                                                                                 |
| PressedFillColor  | \`\`                                                                                                                                                                                                                                                                                                                                 |
| PressedTextColor  | \`\`                                                                                                                                                                                                                                                                                                                                 |
| Text              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`ThisItem.buttonText`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                                                                                                                                      |
| TextColor         | <table border="0"><tr><td style="width:50%; background-color:#ccffcc; color:black;"><table border="0"><tr><td>RGBA(0, 0, 0, 1)</td></tr><tr><td style="background-color:#000000"></td></tr></table></td><td style="width:50%; background-color:#ffcccc; color:black;"><table border="0"><tr><td></td></tr></table></td></tr></table> |

### Design

| Property    | Value                                                                                                                                                        |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| DisplayMode | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`DisplayMode.Edit`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| Height      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`32`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>               |
| Width       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`96`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>               |
| X           | \`0\`                                                                                                                                                        |
| Y           | \`0\`                                                                                                                                                        |
| ZIndex      | \`3\`                                                                                                                                                        |

### Color Properties

| Property            | Value |
| ------------------- | ----- |
| BorderColor         | \`\`  |
| DisabledBorderColor | \`\`  |
| HoverBorderColor    | \`\`  |
| PressedBorderColor  | \`\`  |

### Child & Parent Controls

| Property       | Value            |
| -------------- | ---------------- |
| Parent Control | conNavigationTab |

## Button1SC

| Property                                                                        | Value                                 |
| ------------------------------------------------------------------------------- | ------------------------------------- |
| ![Microsoft\_CoreControls\_Button](resources/Microsoft_CoreControls_Button.png) | Type: Microsoft\_CoreControls\_Button |

### Behavior

| Property | Value                                                                                                                                                                |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OnChange | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                    |
| OnSelect | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`Launch(_mdaInvoicesLink)`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |

### Data

| Property                      | Value                                                                                                                                                                             |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AcceptsFocus                  | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                  |
| AccessibleLabel               | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                    |
| Alignment                     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"center"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                              |
| BorderRadius                  | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`8`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                     |
| BorderStyle                   | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`BorderStyle.Solid`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                     |
| BorderThickness               | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                     |
| ButtonType                    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"Standard"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                            |
| ContentLanguage               | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                    |
| DisabledFillColor             | \`\`                                                                                                                                                                              |
| DisabledTextColor             | \`\`                                                                                                                                                                              |
| FillColor                     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`_colors.white.value`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                   |
| Font                          | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"'Segoe UI', 'Open Sans', sans-serif"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| FontSize                      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`10.5`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                  |
| FontWeight                    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"600"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                 |
| HideFromAssistiveTechnologies | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                 |
| HoverFillColor                | \`\`                                                                                                                                                                              |
| HoverTextColor                | \`\`                                                                                                                                                                              |
| Italic                        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                 |
| PaddingBottom                 | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                     |
| PaddingEnd                    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                     |
| PaddingStart                  | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                     |
| PaddingTop                    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                     |
| PressedFillColor              | \`\`                                                                                                                                                                              |
| PressedTextColor              | \`\`                                                                                                                                                                              |
| Strikethrough                 | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                 |
| Text                          | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"View all ("&_totalInvoices&")"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>       |
| TextColor                     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`_colors.black.value`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                   |
| Tooltip                       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                    |
| Underline                     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                 |
| VerticalAlignment             | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"middle"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                              |

### Design

| Property    | Value                                                                                                                                                        |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| DisplayMode | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`DisplayMode.Edit`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| Height      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`32`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>               |
| TabIndex    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                |
| Visible     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>             |
| Width       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`96`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>               |
| X           | \`0\`                                                                                                                                                        |
| Y           | \`0\`                                                                                                                                                        |
| ZIndex      | \`4\`                                                                                                                                                        |

### Color Properties

| Property            | Value |
| ------------------- | ----- |
| BorderColor         | \`\`  |
| DisabledBorderColor | \`\`  |
| HoverBorderColor    | \`\`  |
| PressedBorderColor  | \`\`  |

### Child & Parent Controls

| Property       | Value             |
| -------------- | ----------------- |
| Parent Control | conRecentActivity |

## ButtonCanvas2

| Property                                                                                    | Value                                       |
| ------------------------------------------------------------------------------------------- | ------------------------------------------- |
| ![PowerApps\_CoreControls\_ButtonCanvas](resources/PowerApps_CoreControls_ButtonCanvas.png) | Type: PowerApps\_CoreControls\_ButtonCanvas |

### Behavior

| Property | Value                                                                                                                                                      |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OnSelect | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`Select(Parent)`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |

### Data

| Property         | Value                                                                                                                                                     |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BasePaletteColor | \`\`                                                                                                                                                      |
| FontColor        | \`\`                                                                                                                                                      |
| Text             | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`ThisItem.Name`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |

### Design

| Property    | Value                                                                                                                                                        |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| DisplayMode | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`DisplayMode.Edit`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| Height      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`35`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>               |
| Width       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`385`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>              |
| X           | \`0\`                                                                                                                                                        |
| Y           | \`0\`                                                                                                                                                        |
| ZIndex      | \`1\`                                                                                                                                                        |

### Color Properties

| Property    | Value |
| ----------- | ----- |
| BorderColor | \`\`  |

### Child & Parent Controls

| Property       | Value    |
| -------------- | -------- |
| Parent Control | Gallery1 |

## ComboboxCanvas3

| Property                                                                                        | Value                                         |
| ----------------------------------------------------------------------------------------------- | --------------------------------------------- |
| ![PowerApps\_CoreControls\_ComboboxCanvas](resources/PowerApps_CoreControls_ComboboxCanvas.png) | Type: PowerApps\_CoreControls\_ComboboxCanvas |

### Behavior

| Property | Value                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| OnChange | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`Set( _setting, Self.Selected ); Set( _settingId, _setting.'KSeF Setting' ); Concurrent( Set( _totalInvoices, CountIf( Filter( 'KSeF Invoices', 'Setting ID'.'KSeF Setting' = _settingId ), true ) ), Set( _totalInvoicesPaid, CountIf( Filter( 'KSeF Invoices', 'Payment Status' = 'Payment Status (KSeF)'.paid, 'Setting ID'.'KSeF Setting' = _settingId ), true ) ), Set( _totalInvoicesPending, CountIf( Filter( 'KSeF Invoices', 'Payment Status' = 'Payment Status (KSeF)'.pending, 'Setting ID'.'KSeF Setting' = _settingId ), true ) ), Set( _totalGross, Sum( Filter( 'KSeF Invoices', 'Setting ID'.'KSeF Setting' = _settingId ), 'Gross Amount' ) ), Set( _totalGrossPaid, Sum( Filter( 'KSeF Invoices', 'Payment Status' = 'Payment Status (KSeF)'.paid, 'Setting ID'.'KSeF Setting' = _settingId ), 'Gross Amount' ) ), Set( _totalGrossPending, Sum( Filter( 'KSeF Invoices', 'Payment Status' = 'Payment Status (KSeF)'.pending, 'Setting ID'.'KSeF Setting' = _settingId ), 'Gross Amount' ) ), ClearCollect( _totalDistinctSuppliers, GroupBy( Filter( 'KSeF Invoices', 'Setting ID'.'KSeF Setting' = _settingId ), dvlp_sellername, grouped ) ) ); Concurrent( Set( _totalGrossMonthly, Coalesce( Text( _totalGross / If( _totalInvoices = 0, 1, _totalInvoices ), "[$-pl-PL]# ##0,00" ), 0 ) ), Set( _totalGrossPaidMonthly, Coalesce( If( _totalInvoices <> 0, Text( (_totalInvoicesPaid / If( _totalInvoices = 0, 1, _totalInvoices )) * 100, "0.00%" ), Blank() ), 0 ) ), Set( _totalGrossPendingMonthly, Coalesce( If( _totalInvoices <> 0, Text( (_totalInvoicesPending / If( _totalInvoices = 0, 1, _totalInvoices )) * 100, "0.00%" ), Blank() ), 0 ) ) )`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |

### Data

| Property             | Value                                                                                                                                                                           |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Appearance           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`'ComboboxCanvas.Appearance'.Outline`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| BasePaletteColor     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`_colors.accent.value`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                |
| DefaultSelectedItems | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`_setting`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                            |
| Items                | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`'KSeF Settings'`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                     |

### Design

| Property    | Value                                                                                                                                                        |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| DisplayMode | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`DisplayMode.Edit`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| Height      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`32`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>               |
| Width       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`320`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>              |
| X           | \`0\`                                                                                                                                                        |
| Y           | \`0\`                                                                                                                                                        |
| ZIndex      | \`1\`                                                                                                                                                        |

### Color Properties

### Child & Parent Controls

| Property       | Value                  |
| -------------- | ---------------------- |
| Child Control  | NIP4                   |
| Child Control  | Company Name4          |
| Child Control  | Environment4           |
| Child Control  | Created On4            |
| Child Control  | Is Active4             |
| Child Control  | Invoice Prefix4        |
| Child Control  | Key Vault Secret Name4 |
| Child Control  | Last Sync At4          |
| Child Control  | Last Sync Status4      |
| Parent Control | conSelectEnvironments  |

## Company Name4

| Property                                                                                                                             | Value                                                            |
| ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| ![PowerApps\_CoreControls\_ComboboxCanvasTemplate\_dataField](resources/PowerApps_CoreControls_ComboboxCanvasTemplate_dataField.png) | Type: PowerApps\_CoreControls\_ComboboxCanvasTemplate\_dataField |

### Data

| Property         | Value                                                                                                                                                          |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FieldDisplayName | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"Company Name"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>     |
| FieldName        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"dvlp_companyname"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| FieldType        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"s"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                |
| FieldVariantName | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"textualColumn"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>    |
| Order            | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`1`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                  |

### Design

| Property | Value                                                                                                                                           |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Height   | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`100`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| Width    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`100`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| X        | \`0\`                                                                                                                                           |
| Y        | \`0\`                                                                                                                                           |
| ZIndex   | \`2\`                                                                                                                                           |

### Color Properties

### Child & Parent Controls

| Property       | Value           |
| -------------- | --------------- |
| Parent Control | ComboboxCanvas3 |

## conBody

| Property                                                                  | Value                             |
| ------------------------------------------------------------------------- | --------------------------------- |
| ![verticalAutoLayoutContainer](resources/verticalAutoLayoutContainer.png) | Type: verticalAutoLayoutContainer |

### Design

| Property             | Value                                                                                                                                                                  |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BorderStyle          | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`BorderStyle.Solid`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>          |
| BorderThickness      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`1`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| ChildTabPriority     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| DisplayMode          | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`DisplayMode.Edit`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>           |
| DropShadow           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`DropShadow.None`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>            |
| Height               | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`200`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                        |
| LayoutAlignItems     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`LayoutAlignItems.Center`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>    |
| LayoutDirection      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`LayoutDirection.Vertical`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>   |
| LayoutGap            | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| LayoutGridColumns    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`6`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| LayoutGridRows       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`6`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| LayoutJustifyContent | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`LayoutJustifyContent.Start`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| LayoutMode           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`LayoutMode.Auto`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>            |
| LayoutOverflowX      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`LayoutOverflow.Hide`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>        |
| LayoutOverflowY      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`LayoutOverflow.Hide`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>        |
| LayoutWrap           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                      |
| PaddingBottom        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`8`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| PaddingLeft          | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`8`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| PaddingRight         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`8`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| PaddingTop           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`8`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusBottomLeft     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusBottomRight    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusTopLeft        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusTopRight       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| Width                | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`500`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                        |
| X                    | \`0\`                                                                                                                                                                  |
| Y                    | \`0\`                                                                                                                                                                  |
| ZIndex               | \`4\`                                                                                                                                                                  |

### Color Properties

| Property    | Value                                                                                                                                                                                                                                                                                                                                      |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| BorderColor | \`\_colors.grey.value\`                                                                                                                                                                                                                                                                                                                    |
| Fill        | <table border="0"><tr><td style="width:50%; background-color:#ccffcc; color:black;"><table border="0"><tr><td>RGBA(255, 255, 255, 1)</td></tr><tr><td style="background-color:#FFFFFF"></td></tr></table></td><td style="width:50%; background-color:#ffcccc; color:black;"><table border="0"><tr><td></td></tr></table></td></tr></table> |

### Child & Parent Controls

| Property       | Value             |
| -------------- | ----------------- |
| Child Control  | conTotalsGrid     |
| Child Control  | galNavigationTabs |
| Child Control  | conRecentActivity |
| Parent Control | conMain           |

## conHeader

| Property                                                                      | Value                               |
| ----------------------------------------------------------------------------- | ----------------------------------- |
| ![horizontalAutoLayoutContainer](resources/horizontalAutoLayoutContainer.png) | Type: horizontalAutoLayoutContainer |

### Design

| Property             | Value                                                                                                                                                                  |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BorderStyle          | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`BorderStyle.Solid`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>          |
| BorderThickness      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`1`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| ChildTabPriority     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| DisplayMode          | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`DisplayMode.Edit`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>           |
| DropShadow           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`DropShadow.None`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>            |
| Height               | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`75`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                         |
| LayoutAlignItems     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`LayoutAlignItems.Center`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>    |
| LayoutDirection      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`LayoutDirection.Horizontal`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| LayoutGap            | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| LayoutGridColumns    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`6`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| LayoutGridRows       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`6`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| LayoutJustifyContent | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`LayoutJustifyContent.Start`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| LayoutMode           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`LayoutMode.Auto`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>            |
| LayoutOverflowX      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`LayoutOverflow.Hide`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>        |
| LayoutOverflowY      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`LayoutOverflow.Hide`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>        |
| LayoutWrap           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                      |
| PaddingBottom        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| PaddingLeft          | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| PaddingRight         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| PaddingTop           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusBottomLeft     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusBottomRight    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusTopLeft        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusTopRight       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| Width                | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`500`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                        |
| X                    | \`0\`                                                                                                                                                                  |
| Y                    | \`0\`                                                                                                                                                                  |
| ZIndex               | \`1\`                                                                                                                                                                  |

### Color Properties

| Property    | Value                                                                                                                                                                                                                                                                                                                                      |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| BorderColor | \`\_colors.grey.value\`                                                                                                                                                                                                                                                                                                                    |
| Fill        | <table border="0"><tr><td style="width:50%; background-color:#ccffcc; color:black;"><table border="0"><tr><td>RGBA(255, 255, 255, 1)</td></tr><tr><td style="background-color:#FFFFFF"></td></tr></table></td><td style="width:50%; background-color:#ffcccc; color:black;"><table border="0"><tr><td></td></tr></table></td></tr></table> |

### Child & Parent Controls

| Property       | Value     |
| -------------- | --------- |
| Child Control  | hdrHeader |
| Parent Control | conMain   |

## conMain

| Property                                                                  | Value                             |
| ------------------------------------------------------------------------- | --------------------------------- |
| ![verticalAutoLayoutContainer](resources/verticalAutoLayoutContainer.png) | Type: verticalAutoLayoutContainer |

### Design

| Property             | Value                                                                                                                                                                  |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BorderStyle          | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`BorderStyle.Solid`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>          |
| ChildTabPriority     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| DisplayMode          | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`DisplayMode.Edit`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>           |
| DropShadow           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`DropShadow.Light`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>           |
| Height               | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`Parent.Height`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>              |
| LayoutAlignItems     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`LayoutAlignItems.Center`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>    |
| LayoutDirection      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`LayoutDirection.Vertical`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>   |
| LayoutGap            | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| LayoutGridColumns    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`6`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| LayoutGridRows       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`6`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| LayoutJustifyContent | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`LayoutJustifyContent.Start`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| LayoutMode           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`LayoutMode.Auto`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>            |
| LayoutOverflowX      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`LayoutOverflow.Hide`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>        |
| LayoutOverflowY      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`LayoutOverflow.Hide`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>        |
| LayoutWrap           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                      |
| PaddingBottom        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`16`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                         |
| PaddingLeft          | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`16`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                         |
| PaddingRight         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`16`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                         |
| PaddingTop           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`16`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                         |
| RadiusBottomLeft     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusBottomRight    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusTopLeft        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusTopRight       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| Width                | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`Parent.Width`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>               |
| X                    | \`0\`                                                                                                                                                                  |
| Y                    | \`0\`                                                                                                                                                                  |
| ZIndex               | \`2\`                                                                                                                                                                  |

### Color Properties

| Property    | Value                                                                                                                                                                                                                                                                                                                                      |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| BorderColor | <table border="0"><tr><td style="width:50%; background-color:#ccffcc; color:black;"><table border="0"><tr><td>RGBA(0, 0, 0, 1)</td></tr><tr><td style="background-color:#000000"></td></tr></table></td><td style="width:50%; background-color:#ffcccc; color:black;"><table border="0"><tr><td></td></tr></table></td></tr></table>       |
| Fill        | <table border="0"><tr><td style="width:50%; background-color:#ccffcc; color:black;"><table border="0"><tr><td>RGBA(250, 250, 250, 1)</td></tr><tr><td style="background-color:#FAFAFA"></td></tr></table></td><td style="width:50%; background-color:#ffcccc; color:black;"><table border="0"><tr><td></td></tr></table></td></tr></table> |

### Child & Parent Controls

| Property       | Value                 |
| -------------- | --------------------- |
| Child Control  | conHeader             |
| Child Control  | conSelectEnvironments |
| Child Control  | shpDivider            |
| Child Control  | conBody               |
| Parent Control | Dashboard             |

## conNavigationTab

| Property                                                                      | Value                               |
| ----------------------------------------------------------------------------- | ----------------------------------- |
| ![horizontalAutoLayoutContainer](resources/horizontalAutoLayoutContainer.png) | Type: horizontalAutoLayoutContainer |

### Data

| Property        | Value                                                                                                                                          |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| ContentLanguage | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |

### Design

| Property             | Value                                                                                                                                                                  |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BorderStyle          | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`BorderStyle.Solid`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>          |
| BorderThickness      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| ChildTabPriority     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| DisplayMode          | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`DisplayMode.Edit`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>           |
| DropShadow           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`DropShadow.Light`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>           |
| EnableChildFocus     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| Height               | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`150`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                        |
| LayoutAlignItems     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`LayoutAlignItems.Center`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>    |
| LayoutDirection      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`LayoutDirection.Vertical`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>   |
| LayoutGap            | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| LayoutGridColumns    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`6`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| LayoutGridRows       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`6`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| LayoutJustifyContent | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`LayoutJustifyContent.Start`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| LayoutMode           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`LayoutMode.Auto`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>            |
| LayoutOverflowX      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`LayoutOverflow.Hide`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>        |
| LayoutOverflowY      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`LayoutOverflow.Hide`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>        |
| LayoutWrap           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                      |
| maximumHeight        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`7680`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| maximumWidth         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`1366`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| minimumHeight        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`20`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                         |
| minimumWidth         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`20`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                         |
| PaddingBottom        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`8`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| PaddingLeft          | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`8`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| PaddingRight         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`8`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| PaddingTop           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`8`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusBottomLeft     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`12`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                         |
| RadiusBottomRight    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`12`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                         |
| RadiusTopLeft        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`12`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                         |
| RadiusTopRight       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`12`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                         |
| Visible              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| Width                | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`Parent.TemplateWidth`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>       |
| X                    | \`0\`                                                                                                                                                                  |
| Y                    | \`0\`                                                                                                                                                                  |
| ZIndex               | \`7\`                                                                                                                                                                  |

### Color Properties

| Property    | Value                                                                                                                                                                                                                                                                                                                                |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| BorderColor | <table border="0"><tr><td style="width:50%; background-color:#ccffcc; color:black;"><table border="0"><tr><td>RGBA(0, 0, 0, 1)</td></tr><tr><td style="background-color:#000000"></td></tr></table></td><td style="width:50%; background-color:#ffcccc; color:black;"><table border="0"><tr><td></td></tr></table></td></tr></table> |
| Fill        | <table border="0"><tr><td style="width:50%; background-color:#ccffcc; color:black;"><table border="0"><tr><td>RGBA(0, 0, 0, 0)</td></tr><tr><td style="background-color:#000000"></td></tr></table></td><td style="width:50%; background-color:#ffcccc; color:black;"><table border="0"><tr><td></td></tr></table></td></tr></table> |

### Child & Parent Controls

| Property       | Value                  |
| -------------- | ---------------------- |
| Child Control  | conNavigationTabHeader |
| Child Control  | TextCanvas1SC          |
| Child Control  | Button1                |
| Parent Control | galNavigationTabs      |

## conNavigationTabHeader

| Property                                                                      | Value                               |
| ----------------------------------------------------------------------------- | ----------------------------------- |
| ![horizontalAutoLayoutContainer](resources/horizontalAutoLayoutContainer.png) | Type: horizontalAutoLayoutContainer |

### Design

| Property             | Value                                                                                                                                                                  |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BorderStyle          | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`BorderStyle.Solid`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>          |
| ChildTabPriority     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| DisplayMode          | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`DisplayMode.Edit`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>           |
| DropShadow           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`DropShadow.None`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>            |
| Height               | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`50`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                         |
| LayoutAlignItems     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`LayoutAlignItems.Center`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>    |
| LayoutDirection      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`LayoutDirection.Horizontal`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| LayoutGap            | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`8`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| LayoutGridColumns    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`6`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| LayoutGridRows       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`6`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| LayoutJustifyContent | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`LayoutJustifyContent.Start`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| LayoutMode           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`LayoutMode.Auto`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>            |
| LayoutOverflowX      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`LayoutOverflow.Hide`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>        |
| LayoutOverflowY      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`LayoutOverflow.Hide`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>        |
| LayoutWrap           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                      |
| PaddingBottom        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`8`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| PaddingLeft          | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`8`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| PaddingRight         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`8`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| PaddingTop           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`8`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusBottomLeft     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusBottomRight    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusTopLeft        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusTopRight       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| Width                | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`500`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                        |
| X                    | \`0\`                                                                                                                                                                  |
| Y                    | \`0\`                                                                                                                                                                  |
| ZIndex               | \`1\`                                                                                                                                                                  |

### Color Properties

| Property    | Value                                                                                                                                                                                                                                                                                                                                |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| BorderColor | <table border="0"><tr><td style="width:50%; background-color:#ccffcc; color:black;"><table border="0"><tr><td>RGBA(0, 0, 0, 1)</td></tr><tr><td style="background-color:#000000"></td></tr></table></td><td style="width:50%; background-color:#ffcccc; color:black;"><table border="0"><tr><td></td></tr></table></td></tr></table> |
| Fill        | <table border="0"><tr><td style="width:50%; background-color:#ccffcc; color:black;"><table border="0"><tr><td>RGBA(0, 0, 0, 0)</td></tr><tr><td style="background-color:#000000"></td></tr></table></td><td style="width:50%; background-color:#ffcccc; color:black;"><table border="0"><tr><td></td></tr></table></td></tr></table> |

### Child & Parent Controls

| Property       | Value            |
| -------------- | ---------------- |
| Child Control  | Icon1            |
| Child Control  | TextCanvas1      |
| Parent Control | conNavigationTab |

## conRecentActivity

| Property                                                                  | Value                             |
| ------------------------------------------------------------------------- | --------------------------------- |
| ![verticalAutoLayoutContainer](resources/verticalAutoLayoutContainer.png) | Type: verticalAutoLayoutContainer |

### Design

| Property             | Value                                                                                                                                                                  |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BorderStyle          | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`BorderStyle.Solid`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>          |
| ChildTabPriority     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| DisplayMode          | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`DisplayMode.Edit`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>           |
| DropShadow           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`DropShadow.None`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>            |
| Height               | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`200`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                        |
| LayoutAlignItems     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`LayoutAlignItems.Center`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>    |
| LayoutDirection      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`LayoutDirection.Vertical`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>   |
| LayoutGap            | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| LayoutGridColumns    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`6`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| LayoutGridRows       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`6`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| LayoutJustifyContent | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`LayoutJustifyContent.Start`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| LayoutMode           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`LayoutMode.Auto`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>            |
| LayoutOverflowX      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`LayoutOverflow.Hide`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>        |
| LayoutOverflowY      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`LayoutOverflow.Hide`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>        |
| LayoutWrap           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                      |
| PaddingBottom        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`8`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| PaddingLeft          | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`8`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| PaddingRight         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`8`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| PaddingTop           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`8`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusBottomLeft     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusBottomRight    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusTopLeft        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusTopRight       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| Width                | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`500`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                        |
| X                    | \`0\`                                                                                                                                                                  |
| Y                    | \`0\`                                                                                                                                                                  |
| ZIndex               | \`3\`                                                                                                                                                                  |

### Color Properties

| Property    | Value                                                                                                                                                                                                                                                                                                                                |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| BorderColor | <table border="0"><tr><td style="width:50%; background-color:#ccffcc; color:black;"><table border="0"><tr><td>RGBA(0, 0, 0, 1)</td></tr><tr><td style="background-color:#000000"></td></tr></table></td><td style="width:50%; background-color:#ffcccc; color:black;"><table border="0"><tr><td></td></tr></table></td></tr></table> |
| Fill        | <table border="0"><tr><td style="width:50%; background-color:#ccffcc; color:black;"><table border="0"><tr><td>RGBA(0, 0, 0, 0)</td></tr><tr><td style="background-color:#000000"></td></tr></table></td><td style="width:50%; background-color:#ffcccc; color:black;"><table border="0"><tr><td></td></tr></table></td></tr></table> |

### Child & Parent Controls

| Property       | Value             |
| -------------- | ----------------- |
| Child Control  | TextCanvas1\_2    |
| Child Control  | TextCanvas1\_3    |
| Child Control  | galRecentActivity |
| Child Control  | Button1SC         |
| Parent Control | conBody           |

## conSelectEnvironments

| Property                                                                      | Value                               |
| ----------------------------------------------------------------------------- | ----------------------------------- |
| ![horizontalAutoLayoutContainer](resources/horizontalAutoLayoutContainer.png) | Type: horizontalAutoLayoutContainer |

### Design

| Property             | Value                                                                                                                                                                  |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BorderStyle          | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`BorderStyle.Solid`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>          |
| BorderThickness      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`1`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| ChildTabPriority     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| DisplayMode          | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`DisplayMode.Edit`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>           |
| DropShadow           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`DropShadow.None`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>            |
| Height               | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`50`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                         |
| LayoutAlignItems     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`LayoutAlignItems.Center`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>    |
| LayoutDirection      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`LayoutDirection.Horizontal`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| LayoutGap            | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| LayoutGridColumns    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`6`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| LayoutGridRows       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`6`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| LayoutJustifyContent | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`LayoutJustifyContent.Start`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| LayoutMode           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`LayoutMode.Auto`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>            |
| LayoutOverflowX      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`LayoutOverflow.Hide`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>        |
| LayoutOverflowY      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`LayoutOverflow.Hide`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>        |
| LayoutWrap           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                      |
| PaddingBottom        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| PaddingLeft          | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`16`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                         |
| PaddingRight         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| PaddingTop           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusBottomLeft     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusBottomRight    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusTopLeft        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusTopRight       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| Width                | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`500`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                        |
| X                    | \`0\`                                                                                                                                                                  |
| Y                    | \`0\`                                                                                                                                                                  |
| ZIndex               | \`2\`                                                                                                                                                                  |

### Color Properties

| Property    | Value                                                                                                                                                                                                                                                                                                                                      |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| BorderColor | \`\_colors.grey.value\`                                                                                                                                                                                                                                                                                                                    |
| Fill        | <table border="0"><tr><td style="width:50%; background-color:#ccffcc; color:black;"><table border="0"><tr><td>RGBA(255, 255, 255, 1)</td></tr><tr><td style="background-color:#FFFFFF"></td></tr></table></td><td style="width:50%; background-color:#ffcccc; color:black;"><table border="0"><tr><td></td></tr></table></td></tr></table> |

### Child & Parent Controls

| Property       | Value           |
| -------------- | --------------- |
| Child Control  | ComboboxCanvas3 |
| Parent Control | conMain         |

## Container13

| Property                                                                      | Value                               |
| ----------------------------------------------------------------------------- | ----------------------------------- |
| ![horizontalAutoLayoutContainer](resources/horizontalAutoLayoutContainer.png) | Type: horizontalAutoLayoutContainer |

### Design

| Property             | Value                                                                                                                                                                                     |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BorderStyle          | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`BorderStyle.Solid`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                             |
| ChildTabPriority     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                          |
| DisplayMode          | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`DisplayMode.Edit`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                              |
| DropShadow           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`DropShadow.Light`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                              |
| Height               | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`Parent.TemplateHeight`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                         |
| LayoutAlignItems     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`LayoutAlignItems.Start`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                        |
| LayoutDirection      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`LayoutDirection.Horizontal`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                    |
| LayoutGap            | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                             |
| LayoutGridColumns    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`6`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                             |
| LayoutGridRows       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`6`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                             |
| LayoutJustifyContent | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`LayoutJustifyContent.Start`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                    |
| LayoutMode           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`LayoutMode.Auto`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                               |
| LayoutOverflowX      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`LayoutOverflow.Hide`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                           |
| LayoutOverflowY      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`LayoutOverflow.Hide`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                           |
| LayoutWrap           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                         |
| PaddingBottom        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`8`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                             |
| PaddingLeft          | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`8`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                             |
| PaddingRight         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`8`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                             |
| PaddingTop           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`8`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                             |
| RadiusBottomLeft     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                             |
| RadiusBottomRight    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                             |
| RadiusTopLeft        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                             |
| RadiusTopRight       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                             |
| Width                | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`Parent.TemplateWidth-Parent.TemplatePadding*2`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| X                    | \`0\`                                                                                                                                                                                     |
| Y                    | \`0\`                                                                                                                                                                                     |
| ZIndex               | \`1\`                                                                                                                                                                                     |

### Color Properties

| Property    | Value                                                                                                                                                                                                                                                                                                                                |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| BorderColor | <table border="0"><tr><td style="width:50%; background-color:#ccffcc; color:black;"><table border="0"><tr><td>RGBA(0, 0, 0, 1)</td></tr><tr><td style="background-color:#000000"></td></tr></table></td><td style="width:50%; background-color:#ffcccc; color:black;"><table border="0"><tr><td></td></tr></table></td></tr></table> |
| Fill        | <table border="0"><tr><td style="width:50%; background-color:#ccffcc; color:black;"><table border="0"><tr><td>RGBA(0, 0, 0, 0)</td></tr><tr><td style="background-color:#000000"></td></tr></table></td><td style="width:50%; background-color:#ffcccc; color:black;"><table border="0"><tr><td></td></tr></table></td></tr></table> |

### Child & Parent Controls

| Property       | Value             |
| -------------- | ----------------- |
| Child Control  | Container14       |
| Child Control  | Container15       |
| Child Control  | Icon2             |
| Parent Control | galRecentActivity |

## Container14

| Property                                                                  | Value                             |
| ------------------------------------------------------------------------- | --------------------------------- |
| ![verticalAutoLayoutContainer](resources/verticalAutoLayoutContainer.png) | Type: verticalAutoLayoutContainer |

### Design

| Property             | Value                                                                                                                                                                  |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BorderStyle          | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`BorderStyle.Solid`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>          |
| ChildTabPriority     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| DisplayMode          | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`DisplayMode.Edit`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>           |
| DropShadow           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`DropShadow.None`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>            |
| Height               | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`200`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                        |
| LayoutAlignItems     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`LayoutAlignItems.Start`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>     |
| LayoutDirection      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`LayoutDirection.Vertical`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>   |
| LayoutGap            | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| LayoutGridColumns    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`6`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| LayoutGridRows       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`6`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| LayoutJustifyContent | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`LayoutJustifyContent.Start`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| LayoutMode           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`LayoutMode.Auto`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>            |
| LayoutOverflowX      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`LayoutOverflow.Hide`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>        |
| LayoutOverflowY      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`LayoutOverflow.Hide`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>        |
| LayoutWrap           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                      |
| PaddingBottom        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`8`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| PaddingLeft          | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`8`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| PaddingRight         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`8`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| PaddingTop           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`8`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusBottomLeft     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusBottomRight    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusTopLeft        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusTopRight       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| Width                | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`500`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                        |
| X                    | \`0\`                                                                                                                                                                  |
| Y                    | \`0\`                                                                                                                                                                  |
| ZIndex               | \`2\`                                                                                                                                                                  |

### Color Properties

| Property    | Value                                                                                                                                                                                                                                                                                                                                |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| BorderColor | <table border="0"><tr><td style="width:50%; background-color:#ccffcc; color:black;"><table border="0"><tr><td>RGBA(0, 0, 0, 1)</td></tr><tr><td style="background-color:#000000"></td></tr></table></td><td style="width:50%; background-color:#ffcccc; color:black;"><table border="0"><tr><td></td></tr></table></td></tr></table> |
| Fill        | <table border="0"><tr><td style="width:50%; background-color:#ccffcc; color:black;"><table border="0"><tr><td>RGBA(0, 0, 0, 0)</td></tr><tr><td style="background-color:#000000"></td></tr></table></td><td style="width:50%; background-color:#ffcccc; color:black;"><table border="0"><tr><td></td></tr></table></td></tr></table> |

### Child & Parent Controls

| Property       | Value       |
| -------------- | ----------- |
| Child Control  | TextCanvas3 |
| Child Control  | TextCanvas4 |
| Parent Control | Container13 |

## Container15

| Property                                                                  | Value                             |
| ------------------------------------------------------------------------- | --------------------------------- |
| ![verticalAutoLayoutContainer](resources/verticalAutoLayoutContainer.png) | Type: verticalAutoLayoutContainer |

### Design

| Property             | Value                                                                                                                                                                  |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BorderStyle          | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`BorderStyle.Solid`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>          |
| ChildTabPriority     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| DisplayMode          | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`DisplayMode.Edit`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>           |
| DropShadow           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`DropShadow.None`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>            |
| Height               | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`200`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                        |
| LayoutAlignItems     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`LayoutAlignItems.End`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>       |
| LayoutDirection      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`LayoutDirection.Vertical`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>   |
| LayoutGap            | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| LayoutGridColumns    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`6`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| LayoutGridRows       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`6`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| LayoutJustifyContent | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`LayoutJustifyContent.Start`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| LayoutMode           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`LayoutMode.Auto`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>            |
| LayoutOverflowX      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`LayoutOverflow.Hide`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>        |
| LayoutOverflowY      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`LayoutOverflow.Hide`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>        |
| LayoutWrap           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                      |
| PaddingBottom        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`8`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| PaddingLeft          | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`8`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| PaddingRight         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`8`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| PaddingTop           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`8`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusBottomLeft     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusBottomRight    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusTopLeft        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusTopRight       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| Width                | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`500`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                        |
| X                    | \`0\`                                                                                                                                                                  |
| Y                    | \`0\`                                                                                                                                                                  |
| ZIndex               | \`3\`                                                                                                                                                                  |

### Color Properties

| Property    | Value                                                                                                                                                                                                                                                                                                                                |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| BorderColor | <table border="0"><tr><td style="width:50%; background-color:#ccffcc; color:black;"><table border="0"><tr><td>RGBA(0, 0, 0, 1)</td></tr><tr><td style="background-color:#000000"></td></tr></table></td><td style="width:50%; background-color:#ffcccc; color:black;"><table border="0"><tr><td></td></tr></table></td></tr></table> |
| Fill        | <table border="0"><tr><td style="width:50%; background-color:#ccffcc; color:black;"><table border="0"><tr><td>RGBA(0, 0, 0, 0)</td></tr><tr><td style="background-color:#000000"></td></tr></table></td><td style="width:50%; background-color:#ffcccc; color:black;"><table border="0"><tr><td></td></tr></table></td></tr></table> |

### Child & Parent Controls

| Property       | Value       |
| -------------- | ----------- |
| Child Control  | TextCanvas5 |
| Child Control  | TextCanvas6 |
| Parent Control | Container13 |

## conTotalsGrid

| Property                                                  | Value                     |
| --------------------------------------------------------- | ------------------------- |
| ![gridLayoutContainer](resources/gridLayoutContainer.png) | Type: gridLayoutContainer |

### Design

| Property             | Value                                                                                                                                                                  |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BorderStyle          | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`BorderStyle.Solid`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>          |
| DisplayMode          | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`DisplayMode.Edit`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>           |
| DropShadow           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`DropShadow.None`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>            |
| Height               | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`85`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                         |
| LayoutAlignItems     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`LayoutAlignItems.Start`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>     |
| LayoutDirection      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`LayoutDirection.Horizontal`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| LayoutGap            | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`8`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| LayoutGridColumns    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| LayoutGridRows       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`1`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| LayoutJustifyContent | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`LayoutJustifyContent.Start`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| LayoutMode           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`LayoutMode.Grid`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>            |
| LayoutOverflowX      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`LayoutOverflow.Hide`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>        |
| LayoutOverflowY      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`LayoutOverflow.Hide`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>        |
| PaddingBottom        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`8`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| PaddingLeft          | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`8`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| PaddingRight         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`8`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| PaddingTop           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`8`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusBottomLeft     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusBottomRight    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusTopLeft        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusTopRight       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| Width                | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`500`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                        |
| X                    | \`0\`                                                                                                                                                                  |
| Y                    | \`0\`                                                                                                                                                                  |
| ZIndex               | \`1\`                                                                                                                                                                  |

### Color Properties

| Property    | Value                                                                                                                                                                                                                                                                                                                                |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| BorderColor | <table border="0"><tr><td style="width:50%; background-color:#ccffcc; color:black;"><table border="0"><tr><td>RGBA(0, 0, 0, 1)</td></tr><tr><td style="background-color:#000000"></td></tr></table></td><td style="width:50%; background-color:#ffcccc; color:black;"><table border="0"><tr><td></td></tr></table></td></tr></table> |
| Fill        | <table border="0"><tr><td style="width:50%; background-color:#ccffcc; color:black;"><table border="0"><tr><td>RGBA(0, 0, 0, 0)</td></tr><tr><td style="background-color:#000000"></td></tr></table></td><td style="width:50%; background-color:#ffcccc; color:black;"><table border="0"><tr><td></td></tr></table></td></tr></table> |

### Child & Parent Controls

| Property       | Value          |
| -------------- | -------------- |
| Child Control  | crdAllInvoices |
| Child Control  | crdTotalGross  |
| Child Control  | crdTotalPaid   |
| Child Control  | crdPending     |
| Parent Control | conBody        |

## crdAllInvoices

| Property                                | Value            |
| --------------------------------------- | ---------------- |
| ![modernCard](resources/modernCard.png) | Type: modernCard |

### Data

| Property    | Value                                                                                                                                                                                         |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Description | \`\`                                                                                                                                                                                          |
| HeaderImage | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`'invoice-ordinary-line-svgrepo-com'`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>               |
| Image       | \`\`                                                                                                                                                                                          |
| Subtitle    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`CountRows(_totalDistinctSuppliers) & " suppliers"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| Title       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"All invoices: " & Coalesce(_totalInvoices, 0)`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>    |

### Design

| Property        | Value                                                                                                                                                                  |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BorderRadius    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`12`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                         |
| DisplayMode     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`DisplayMode.Edit`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>           |
| DropShadow      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`DropShadow.Regular`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>         |
| Height          | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`200`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                        |
| ImagePlacement  | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`ImagePlacement.AfterHeader`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| ImagePosition   | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`ImagePosition.Fill`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>         |
| LayoutDirection | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`LayoutDirection.Vertical`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>   |
| Width           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`600`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                        |
| X               | \`40\`                                                                                                                                                                 |
| Y               | \`40\`                                                                                                                                                                 |
| ZIndex          | \`1\`                                                                                                                                                                  |

### Color Properties

### Child & Parent Controls

| Property       | Value         |
| -------------- | ------------- |
| Parent Control | conTotalsGrid |

## crdPending

| Property                                | Value            |
| --------------------------------------- | ---------------- |
| ![modernCard](resources/modernCard.png) | Type: modernCard |

### Behavior

| Property | Value                                                                                                                                             |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| OnSelect | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |

### Data

| Property    | Value                                                                                                                                                                                                                            |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Description | \`\`                                                                                                                                                                                                                             |
| HeaderImage | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`'invoice-daikai-line-svgrepo-com'`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                    |
| Image       | \`\`                                                                                                                                                                                                                             |
| Subtitle    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`_totalGrossPendingMonthly & " of total"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                              |
| Title       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"Pending: " & Coalesce( Text( _totalGrossPending, "[$-pl-PL]# ##0,00" ), 0 ) & " zł"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |

### Design

| Property        | Value                                                                                                                                                                  |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BorderRadius    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`12`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                         |
| DisplayMode     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`DisplayMode.Edit`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>           |
| DropShadow      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`DropShadow.Regular`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>         |
| Height          | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`200`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                        |
| ImagePlacement  | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`ImagePlacement.AfterHeader`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| ImagePosition   | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`ImagePosition.Fill`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>         |
| LayoutDirection | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`LayoutDirection.Vertical`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>   |
| maximumHeight   | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`768`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                        |
| maximumWidth    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`1366`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| minimumHeight   | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`50`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                         |
| minimumWidth    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`100`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                        |
| Visible         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| Width           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`600`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                        |
| X               | \`28\`                                                                                                                                                                 |
| Y               | \`16\`                                                                                                                                                                 |
| ZIndex          | \`6\`                                                                                                                                                                  |

### Color Properties

### Child & Parent Controls

| Property       | Value         |
| -------------- | ------------- |
| Parent Control | conTotalsGrid |

## crdTotalGross

| Property                                | Value            |
| --------------------------------------- | ---------------- |
| ![modernCard](resources/modernCard.png) | Type: modernCard |

### Behavior

| Property | Value                                                                                                                                             |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| OnSelect | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |

### Data

| Property    | Value                                                                                                                                                                                                                         |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Description | \`\`                                                                                                                                                                                                                          |
| HeaderImage | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`'invoice-zengzhishui-line-svgrepo-com'`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                            |
| Image       | \`\`                                                                                                                                                                                                                          |
| Subtitle    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"Average " & _totalGrossMonthly & " zł"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                           |
| Title       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"Total gross: " & Coalesce( Text( _totalGross, "[$-pl-PL]# ##0,00" ), 0 ) & " zł"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |

### Design

| Property        | Value                                                                                                                                                                  |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BorderRadius    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`12`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                         |
| DisplayMode     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`DisplayMode.Edit`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>           |
| DropShadow      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`DropShadow.Regular`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>         |
| Height          | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`200`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                        |
| ImagePlacement  | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`ImagePlacement.AfterHeader`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| ImagePosition   | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`ImagePosition.Fill`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>         |
| LayoutDirection | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`LayoutDirection.Vertical`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>   |
| maximumHeight   | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`768`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                        |
| maximumWidth    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`1366`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| minimumHeight   | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`50`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                         |
| minimumWidth    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`100`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                        |
| Visible         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| Width           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`600`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                        |
| X               | \`28\`                                                                                                                                                                 |
| Y               | \`16\`                                                                                                                                                                 |
| ZIndex          | \`4\`                                                                                                                                                                  |

### Color Properties

### Child & Parent Controls

| Property       | Value         |
| -------------- | ------------- |
| Parent Control | conTotalsGrid |

## crdTotalPaid

| Property                                | Value            |
| --------------------------------------- | ---------------- |
| ![modernCard](resources/modernCard.png) | Type: modernCard |

### Behavior

| Property | Value                                                                                                                                             |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| OnSelect | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |

### Data

| Property    | Value                                                                                                                                                                                                                      |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Description | \`\`                                                                                                                                                                                                                       |
| HeaderImage | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`'invoice-yikai-line-svgrepo-com'`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                               |
| Image       | \`\`                                                                                                                                                                                                                       |
| Subtitle    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`_totalGrossPaidMonthly & " of total"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                           |
| Title       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"Paid: " & Coalesce( Text( _totalGrossPaid, "[$-pl-PL]# ##0,00" ), 0 ) & " zł"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |

### Design

| Property        | Value                                                                                                                                                                  |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BorderRadius    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`12`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                         |
| DisplayMode     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`DisplayMode.Edit`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>           |
| DropShadow      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`DropShadow.Regular`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>         |
| Height          | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`200`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                        |
| ImagePlacement  | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`ImagePlacement.AfterHeader`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| ImagePosition   | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`ImagePosition.Fill`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>         |
| LayoutDirection | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`LayoutDirection.Vertical`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>   |
| maximumHeight   | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`768`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                        |
| maximumWidth    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`1366`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| minimumHeight   | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`50`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                         |
| minimumWidth    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`100`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                        |
| Visible         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| Width           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`600`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                        |
| X               | \`28\`                                                                                                                                                                 |
| Y               | \`16\`                                                                                                                                                                 |
| ZIndex          | \`5\`                                                                                                                                                                  |

### Color Properties

### Child & Parent Controls

| Property       | Value         |
| -------------- | ------------- |
| Parent Control | conTotalsGrid |

## Created On4

| Property                                                                                                                             | Value                                                            |
| ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| ![PowerApps\_CoreControls\_ComboboxCanvasTemplate\_dataField](resources/PowerApps_CoreControls_ComboboxCanvasTemplate_dataField.png) | Type: PowerApps\_CoreControls\_ComboboxCanvasTemplate\_dataField |

### Data

| Property         | Value                                                                                                                                                       |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FieldDisplayName | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"Created On"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>    |
| FieldName        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"createdon"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>     |
| FieldType        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"d"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>             |
| FieldVariantName | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"textualColumn"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| Order            | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>               |

### Design

| Property | Value                                                                                                                                           |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Height   | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`100`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| Width    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`100`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| X        | \`0\`                                                                                                                                           |
| Y        | \`0\`                                                                                                                                           |
| ZIndex   | \`4\`                                                                                                                                           |

### Color Properties

### Child & Parent Controls

| Property       | Value           |
| -------------- | --------------- |
| Parent Control | ComboboxCanvas3 |

## Environment4

| Property                                                                                                                             | Value                                                            |
| ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| ![PowerApps\_CoreControls\_ComboboxCanvasTemplate\_dataField](resources/PowerApps_CoreControls_ComboboxCanvasTemplate_dataField.png) | Type: PowerApps\_CoreControls\_ComboboxCanvasTemplate\_dataField |

### Data

| Property         | Value                                                                                                                                                          |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FieldDisplayName | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"Environment"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>      |
| FieldName        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"dvlp_environment"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| FieldType        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"l"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                |
| FieldVariantName | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"textualColumn"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>    |
| Order            | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`3`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                  |

### Design

| Property | Value                                                                                                                                           |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Height   | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`100`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| Width    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`100`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| X        | \`0\`                                                                                                                                           |
| Y        | \`0\`                                                                                                                                           |
| ZIndex   | \`3\`                                                                                                                                           |

### Color Properties

### Child & Parent Controls

| Property       | Value           |
| -------------- | --------------- |
| Parent Control | ComboboxCanvas3 |

## Gallery1

| Property                          | Value         |
| --------------------------------- | ------------- |
| ![gallery](resources/gallery.png) | Type: gallery |

### Data

| Property  | Value                                                                                                                                                                                                                                                                                         |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Items     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`SortByColumns( Filter( 'KSeF Invoices', 'Setting ID'.'KSeF Setting' = _settingId ), "dvlp_invoicedate", SortOrder.Descending )`<td style="background-color:#ffcccc; width:50%;">CustomGallerySample</td></tr></table> |
| WrapCount | \`1\`                                                                                                                                                                                                                                                                                         |

### Design

| Property               | Value                                                                                                                                                                              |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AutoHeight             | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                  |
| BorderStyle            | \`BorderStyle.Solid\`                                                                                                                                                              |
| DelayItemLoading       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                   |
| DisplayMode            | \`DisplayMode.Edit\`                                                                                                                                                               |
| FocusedBorderThickness | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`2`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                      |
| Height                 | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`289`<td style="background-color:#ffcccc; width:50%;">575</td></tr></table>                                 |
| Layout                 | \`Layout.Vertical\`                                                                                                                                                                |
| LoadingSpinner         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`LoadingSpinner.Data`<td style="background-color:#ffcccc; width:50%;">LoadingSpinner.None</td></tr></table> |
| LoadingSpinnerColor    | \`Self.BorderColor\`                                                                                                                                                               |
| TemplatePadding        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`5`<td style="background-color:#ffcccc; width:50%;">0</td></tr></table>                                     |
| TemplateSize           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`35`<td style="background-color:#ffcccc; width:50%;">Min(160, Self.Height - 60)</td></tr></table>           |
| Transition             | \`Transition.None\`                                                                                                                                                                |
| Visible                | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                  |
| Width                  | \`640\`                                                                                                                                                                            |
| X                      | \`40\`                                                                                                                                                                             |
| Y                      | \`40\`                                                                                                                                                                             |
| ZIndex                 | \`1\`                                                                                                                                                                              |

### Color Properties

| Property            | Value                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BorderColor         | <table border="0"><tr><td style="width:50%; background-color:#ccffcc; color:black;"><table border="0"><tr><td>RGBA(166, 166, 166, 1)</td></tr><tr><td style="background-color:#A6A6A6"></td></tr></table></td><td style="width:50%; background-color:#ffcccc; color:black;"><table border="0"><tr><td>RGBA(0, 18, 107, 1)</td></tr><tr><td style="background-color:#00126B"></td></tr></table></td></tr></table> |
| DisabledBorderColor | \`Self.BorderColor\`                                                                                                                                                                                                                                                                                                                                                                                             |
| DisabledFill        | \`Self.Fill\`                                                                                                                                                                                                                                                                                                                                                                                                    |
| Fill                | <table border="0"><tr><td>RGBA(0, 0, 0, 0)</td></tr><tr><td style="background-color:#000000"></td></tr></table>                                                                                                                                                                                                                                                                                                  |
| FocusedBorderColor  | <table border="0"><tr><td style="width:50%; background-color:#ccffcc; color:black;"><table border="0"><tr><td>RGBA(0, 120, 212, 1)</td></tr><tr><td style="background-color:#0078D4"></td></tr></table></td><td style="width:50%; background-color:#ffcccc; color:black;"><table border="0"><tr><td>Self.BorderColor</td></tr><tr><td style="background-color:#000000"></td></tr></table></td></tr></table>      |
| HoverBorderColor    | \`Self.BorderColor\`                                                                                                                                                                                                                                                                                                                                                                                             |
| HoverFill           | \`Self.Fill\`                                                                                                                                                                                                                                                                                                                                                                                                    |
| PressedBorderColor  | \`Self.BorderColor\`                                                                                                                                                                                                                                                                                                                                                                                             |
| PressedFill         | \`Self.Fill\`                                                                                                                                                                                                                                                                                                                                                                                                    |

### Child & Parent Controls

| Property       | Value            |
| -------------- | ---------------- |
| Child Control  | galleryTemplate1 |
| Child Control  | ButtonCanvas2    |
| Parent Control | Dashboard        |

## galleryTemplate1

| Property                                          | Value                 |
| ------------------------------------------------- | --------------------- |
| ![galleryTemplate](resources/galleryTemplate.png) | Type: galleryTemplate |

### Design

| Property     | Value                                                                                                                                                                                                                                                                                                                                |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| TemplateFill | <table border="0"><tr><td style="width:50%; background-color:#ccffcc; color:black;"><table border="0"><tr><td>RGBA(0, 0, 0, 0)</td></tr><tr><td style="background-color:#000000"></td></tr></table></td><td style="width:50%; background-color:#ffcccc; color:black;"><table border="0"><tr><td></td></tr></table></td></tr></table> |

### Color Properties

### Child & Parent Controls

| Property       | Value    |
| -------------- | -------- |
| Parent Control | Gallery1 |

## galleryTemplate2

| Property                                          | Value                 |
| ------------------------------------------------- | --------------------- |
| ![galleryTemplate](resources/galleryTemplate.png) | Type: galleryTemplate |

### Design

| Property     | Value                                                                                                                                                                                                                                                                                                                                |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| TemplateFill | <table border="0"><tr><td style="width:50%; background-color:#ccffcc; color:black;"><table border="0"><tr><td>RGBA(0, 0, 0, 0)</td></tr><tr><td style="background-color:#000000"></td></tr></table></td><td style="width:50%; background-color:#ffcccc; color:black;"><table border="0"><tr><td></td></tr></table></td></tr></table> |

### Color Properties

### Child & Parent Controls

| Property       | Value             |
| -------------- | ----------------- |
| Parent Control | galNavigationTabs |

## galleryTemplate3

| Property                                          | Value                 |
| ------------------------------------------------- | --------------------- |
| ![galleryTemplate](resources/galleryTemplate.png) | Type: galleryTemplate |

### Design

| Property     | Value                                                                                                                                                                                                                                                                                                                                |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| TemplateFill | <table border="0"><tr><td style="width:50%; background-color:#ccffcc; color:black;"><table border="0"><tr><td>RGBA(0, 0, 0, 0)</td></tr><tr><td style="background-color:#000000"></td></tr></table></td><td style="width:50%; background-color:#ffcccc; color:black;"><table border="0"><tr><td></td></tr></table></td></tr></table> |

### Color Properties

### Child & Parent Controls

| Property       | Value             |
| -------------- | ----------------- |
| Parent Control | galRecentActivity |

## galNavigationTabs

| Property                          | Value         |
| --------------------------------- | ------------- |
| ![gallery](resources/gallery.png) | Type: gallery |

### Data

| Property | Value                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Items    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`[ { id: 1, icon: "ArrowDownload", title: "Incoming Invoices", subtitle: "Browse and categorize cost invoices from KSeF", buttonStyle: "Primary", buttonText: "Browse invoices" }, { id: 2, icon: "ArrowSync", title: "Synchronization", subtitle: "Fetch new invoices from KSeF and sync status", buttonStyle: "Standard", buttonText: "Sync panel" }, { id: 3, icon: "DocumentBulletList", title: "Reports", subtitle: "Analyze costs and generate summaries", buttonStyle: "Standard", buttonText: "View reports" } ]`<td style="background-color:#ffcccc; width:50%;">CustomGallerySample</td></tr></table> |

### Design

| Property               | Value                                                                                                                                                                                                      |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BorderStyle            | \`BorderStyle.Solid\`                                                                                                                                                                                      |
| DelayItemLoading       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                           |
| DisplayMode            | \`DisplayMode.Edit\`                                                                                                                                                                                       |
| FocusedBorderThickness | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`2`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                              |
| Height                 | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`180`<td style="background-color:#ffcccc; width:50%;">575</td></tr></table>                                                         |
| Layout                 | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`Layout.Horizontal`<td style="background-color:#ffcccc; width:50%;">Layout.Vertical</td></tr></table>                               |
| LoadingSpinner         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`LoadingSpinner.Data`<td style="background-color:#ffcccc; width:50%;">LoadingSpinner.None</td></tr></table>                         |
| LoadingSpinnerColor    | \`Self.BorderColor\`                                                                                                                                                                                       |
| TemplatePadding        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`8`<td style="background-color:#ffcccc; width:50%;">0</td></tr></table>                                                             |
| TemplateSize           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`(Self.Width-32) / Self.AllItemsCount`<td style="background-color:#ffcccc; width:50%;">Min(160, Self.Height - 60)</td></tr></table> |
| Transition             | \`Transition.None\`                                                                                                                                                                                        |
| Width                  | \`640\`                                                                                                                                                                                                    |
| X                      | \`0\`                                                                                                                                                                                                      |
| Y                      | \`0\`                                                                                                                                                                                                      |
| ZIndex                 | \`2\`                                                                                                                                                                                                      |

### Color Properties

| Property            | Value                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BorderColor         | <table border="0"><tr><td style="width:50%; background-color:#ccffcc; color:black;"><table border="0"><tr><td>RGBA(166, 166, 166, 1)</td></tr><tr><td style="background-color:#A6A6A6"></td></tr></table></td><td style="width:50%; background-color:#ffcccc; color:black;"><table border="0"><tr><td>RGBA(0, 18, 107, 1)</td></tr><tr><td style="background-color:#00126B"></td></tr></table></td></tr></table> |
| DisabledBorderColor | \`Self.BorderColor\`                                                                                                                                                                                                                                                                                                                                                                                             |
| DisabledFill        | \`Self.Fill\`                                                                                                                                                                                                                                                                                                                                                                                                    |
| Fill                | <table border="0"><tr><td>RGBA(0, 0, 0, 0)</td></tr><tr><td style="background-color:#000000"></td></tr></table>                                                                                                                                                                                                                                                                                                  |
| FocusedBorderColor  | <table border="0"><tr><td style="width:50%; background-color:#ccffcc; color:black;"><table border="0"><tr><td>RGBA(0, 120, 212, 1)</td></tr><tr><td style="background-color:#0078D4"></td></tr></table></td><td style="width:50%; background-color:#ffcccc; color:black;"><table border="0"><tr><td>Self.BorderColor</td></tr><tr><td style="background-color:#000000"></td></tr></table></td></tr></table>      |
| HoverBorderColor    | \`Self.BorderColor\`                                                                                                                                                                                                                                                                                                                                                                                             |
| HoverFill           | \`Self.Fill\`                                                                                                                                                                                                                                                                                                                                                                                                    |
| PressedBorderColor  | \`Self.BorderColor\`                                                                                                                                                                                                                                                                                                                                                                                             |
| PressedFill         | \`Self.Fill\`                                                                                                                                                                                                                                                                                                                                                                                                    |

### Child & Parent Controls

| Property       | Value            |
| -------------- | ---------------- |
| Child Control  | galleryTemplate2 |
| Child Control  | conNavigationTab |
| Parent Control | conBody          |

## galRecentActivity

| Property                          | Value         |
| --------------------------------- | ------------- |
| ![gallery](resources/gallery.png) | Type: gallery |

### Data

| Property  | Value                                                                                                                                                                                         |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Items     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`FirstN( Gallery1.AllItems, 5 )`<td style="background-color:#ffcccc; width:50%;">CustomGallerySample</td></tr></table> |
| WrapCount | \`1\`                                                                                                                                                                                         |

### Design

| Property               | Value                                                                                                                                                                              |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BorderStyle            | \`BorderStyle.Solid\`                                                                                                                                                              |
| DelayItemLoading       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                   |
| DisplayMode            | \`DisplayMode.Edit\`                                                                                                                                                               |
| FocusedBorderThickness | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`2`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                      |
| Height                 | \`575\`                                                                                                                                                                            |
| Layout                 | \`Layout.Vertical\`                                                                                                                                                                |
| LoadingSpinner         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`LoadingSpinner.Data`<td style="background-color:#ffcccc; width:50%;">LoadingSpinner.None</td></tr></table> |
| LoadingSpinnerColor    | \`Self.BorderColor\`                                                                                                                                                               |
| ShowScrollbar          | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                   |
| TemplatePadding        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`5`<td style="background-color:#ffcccc; width:50%;">0</td></tr></table>                                     |
| TemplateSize           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`70`<td style="background-color:#ffcccc; width:50%;">Min(160, Self.Height - 60)</td></tr></table>           |
| Transition             | \`Transition.None\`                                                                                                                                                                |
| Width                  | \`640\`                                                                                                                                                                            |
| X                      | \`0\`                                                                                                                                                                              |
| Y                      | \`0\`                                                                                                                                                                              |
| ZIndex                 | \`3\`                                                                                                                                                                              |

### Color Properties

| Property            | Value                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BorderColor         | <table border="0"><tr><td style="width:50%; background-color:#ccffcc; color:black;"><table border="0"><tr><td>RGBA(166, 166, 166, 1)</td></tr><tr><td style="background-color:#A6A6A6"></td></tr></table></td><td style="width:50%; background-color:#ffcccc; color:black;"><table border="0"><tr><td>RGBA(0, 18, 107, 1)</td></tr><tr><td style="background-color:#00126B"></td></tr></table></td></tr></table> |
| DisabledBorderColor | \`Self.BorderColor\`                                                                                                                                                                                                                                                                                                                                                                                             |
| DisabledFill        | \`Self.Fill\`                                                                                                                                                                                                                                                                                                                                                                                                    |
| Fill                | <table border="0"><tr><td>RGBA(0, 0, 0, 0)</td></tr><tr><td style="background-color:#000000"></td></tr></table>                                                                                                                                                                                                                                                                                                  |
| FocusedBorderColor  | <table border="0"><tr><td style="width:50%; background-color:#ccffcc; color:black;"><table border="0"><tr><td>RGBA(0, 120, 212, 1)</td></tr><tr><td style="background-color:#0078D4"></td></tr></table></td><td style="width:50%; background-color:#ffcccc; color:black;"><table border="0"><tr><td>Self.BorderColor</td></tr><tr><td style="background-color:#000000"></td></tr></table></td></tr></table>      |
| HoverBorderColor    | \`Self.BorderColor\`                                                                                                                                                                                                                                                                                                                                                                                             |
| HoverFill           | \`Self.Fill\`                                                                                                                                                                                                                                                                                                                                                                                                    |
| PressedBorderColor  | \`Self.BorderColor\`                                                                                                                                                                                                                                                                                                                                                                                             |
| PressedFill         | \`Self.Fill\`                                                                                                                                                                                                                                                                                                                                                                                                    |

### Child & Parent Controls

| Property       | Value             |
| -------------- | ----------------- |
| Child Control  | galleryTemplate3  |
| Child Control  | Container13       |
| Parent Control | conRecentActivity |

## hdrHeader

| Property                        | Value        |
| ------------------------------- | ------------ |
| ![Header](resources/Header.png) | Type: Header |

### Behavior

| Property     | Value                                                                                                                                             |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| OnSelectLogo | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |

### Data

| Property                | Value                                                                                                                                                                                                                                                                                                                                    |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BasePaletteColor        | <table border="0"><tr><td style="width:50%; background-color:#ccffcc; color:black;"><table border="0"><tr><td>RGBA(5, 102, 178, 1)</td></tr><tr><td style="background-color:#0566B2"></td></tr></table></td><td style="width:50%; background-color:#ffcccc; color:black;"><table border="0"><tr><td></td></tr></table></td></tr></table> |
| FontColor               | \`\`                                                                                                                                                                                                                                                                                                                                     |
| IsLogoVisible           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                                                                                                                                                         |
| IsProfilePictureVisible | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                                                                                                                                                         |
| Logo                    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`'dashboard-svgrepo-com'`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                                                                                                                                      |
| Style                   | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`'Header.Style'.Neutral`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                                                                                                                                       |
| Title                   | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"Dashboard - manage cost invoices from KSeF"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                                                                                                                 |
| TitleRole               | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"test"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                                                                                                                                                       |
| UserEmail               | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`User().Email`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                                                                                                                                                 |
| UserImage               | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`User().Image`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                                                                                                                                                 |
| UserImageAltText        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`User().FullName &" profile picture"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                                                                                                                          |
| UserName                | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`User().FullName`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                                                                                                                                              |

### Design

| Property    | Value                                                                                                                                                        |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| DisplayMode | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`DisplayMode.Edit`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| Height      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`75`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>               |
| Width       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`Parent.Width`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>     |
| X           | \`0\`                                                                                                                                                        |
| Y           | \`0\`                                                                                                                                                        |
| ZIndex      | \`1\`                                                                                                                                                        |

### Color Properties

| Property    | Value |
| ----------- | ----- |
| BorderColor | \`\`  |
| Fill        | \`\`  |

### Child & Parent Controls

| Property       | Value     |
| -------------- | --------- |
| Parent Control | conHeader |

## Icon1

| Property                                                                    | Value                               |
| --------------------------------------------------------------------------- | ----------------------------------- |
| ![PowerApps\_CoreControls\_Icon](resources/PowerApps_CoreControls_Icon.png) | Type: PowerApps\_CoreControls\_Icon |

### Data

| Property  | Value                                                                                                                                                               |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Icon      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`ThisItem.icon`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>           |
| IconColor | \`\`                                                                                                                                                                |
| IconStyle | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`'Icon.IconStyle'.Filled`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |

### Design

| Property    | Value                                                                                                                                                        |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| DisplayMode | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`DisplayMode.Edit`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| Height      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`24`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>               |
| Width       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`24`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>               |
| X           | \`0\`                                                                                                                                                        |
| Y           | \`0\`                                                                                                                                                        |
| ZIndex      | \`1\`                                                                                                                                                        |

### Color Properties

### Child & Parent Controls

| Property       | Value                  |
| -------------- | ---------------------- |
| Parent Control | conNavigationTabHeader |

## Icon2

| Property                                                                    | Value                               |
| --------------------------------------------------------------------------- | ----------------------------------- |
| ![PowerApps\_CoreControls\_Icon](resources/PowerApps_CoreControls_Icon.png) | Type: PowerApps\_CoreControls\_Icon |

### Data

| Property  | Value                                                                                                                                                          |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Icon      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"ArrowDownload"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>    |
| IconColor | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`_colors.blue.value`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |

### Design

| Property    | Value                                                                                                                                                        |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| DisplayMode | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`DisplayMode.Edit`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| Height      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`32`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>               |
| Width       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`32`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>               |
| X           | \`0\`                                                                                                                                                        |
| Y           | \`0\`                                                                                                                                                        |
| ZIndex      | \`1\`                                                                                                                                                        |

### Color Properties

### Child & Parent Controls

| Property       | Value       |
| -------------- | ----------- |
| Parent Control | Container13 |

## Invoice Prefix4

| Property                                                                                                                             | Value                                                            |
| ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| ![PowerApps\_CoreControls\_ComboboxCanvasTemplate\_dataField](resources/PowerApps_CoreControls_ComboboxCanvasTemplate_dataField.png) | Type: PowerApps\_CoreControls\_ComboboxCanvasTemplate\_dataField |

### Data

| Property         | Value                                                                                                                                                            |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FieldDisplayName | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"Invoice Prefix"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>     |
| FieldName        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"dvlp_invoiceprefix"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| FieldType        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"s"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                  |
| FieldVariantName | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"textualColumn"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>      |
| Order            | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`6`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                    |

### Design

| Property | Value                                                                                                                                           |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Height   | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`100`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| Width    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`100`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| X        | \`0\`                                                                                                                                           |
| Y        | \`0\`                                                                                                                                           |
| ZIndex   | \`6\`                                                                                                                                           |

### Color Properties

### Child & Parent Controls

| Property       | Value           |
| -------------- | --------------- |
| Parent Control | ComboboxCanvas3 |

## Is Active4

| Property                                                                                                                             | Value                                                            |
| ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| ![PowerApps\_CoreControls\_ComboboxCanvasTemplate\_dataField](resources/PowerApps_CoreControls_ComboboxCanvasTemplate_dataField.png) | Type: PowerApps\_CoreControls\_ComboboxCanvasTemplate\_dataField |

### Data

| Property         | Value                                                                                                                                                       |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FieldDisplayName | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"Is Active"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>     |
| FieldName        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"dvlp_isactive"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| FieldType        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"l"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>             |
| FieldVariantName | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"textualColumn"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| Order            | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`5`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>               |

### Design

| Property | Value                                                                                                                                           |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Height   | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`100`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| Width    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`100`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| X        | \`0\`                                                                                                                                           |
| Y        | \`0\`                                                                                                                                           |
| ZIndex   | \`5\`                                                                                                                                           |

### Color Properties

### Child & Parent Controls

| Property       | Value           |
| -------------- | --------------- |
| Parent Control | ComboboxCanvas3 |

## Key Vault Secret Name4

| Property                                                                                                                             | Value                                                            |
| ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| ![PowerApps\_CoreControls\_ComboboxCanvasTemplate\_dataField](resources/PowerApps_CoreControls_ComboboxCanvasTemplate_dataField.png) | Type: PowerApps\_CoreControls\_ComboboxCanvasTemplate\_dataField |

### Data

| Property         | Value                                                                                                                                                                 |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FieldDisplayName | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"Key Vault Secret Name"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>   |
| FieldName        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"dvlp_keyvaultsecretname"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| FieldType        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"s"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| FieldVariantName | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"textualColumn"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>           |
| Order            | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`7`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                         |

### Design

| Property | Value                                                                                                                                           |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Height   | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`100`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| Width    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`100`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| X        | \`0\`                                                                                                                                           |
| Y        | \`0\`                                                                                                                                           |
| ZIndex   | \`7\`                                                                                                                                           |

### Color Properties

### Child & Parent Controls

| Property       | Value           |
| -------------- | --------------- |
| Parent Control | ComboboxCanvas3 |

## Last Sync At4

| Property                                                                                                                             | Value                                                            |
| ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| ![PowerApps\_CoreControls\_ComboboxCanvasTemplate\_dataField](resources/PowerApps_CoreControls_ComboboxCanvasTemplate_dataField.png) | Type: PowerApps\_CoreControls\_ComboboxCanvasTemplate\_dataField |

### Data

| Property         | Value                                                                                                                                                         |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FieldDisplayName | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"Last Sync At"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>    |
| FieldName        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"dvlp_lastsyncat"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| FieldType        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"d"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>               |
| FieldVariantName | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"textualColumn"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>   |
| Order            | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`8`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                 |

### Design

| Property | Value                                                                                                                                           |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Height   | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`100`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| Width    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`100`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| X        | \`0\`                                                                                                                                           |
| Y        | \`0\`                                                                                                                                           |
| ZIndex   | \`8\`                                                                                                                                           |

### Color Properties

### Child & Parent Controls

| Property       | Value           |
| -------------- | --------------- |
| Parent Control | ComboboxCanvas3 |

## Last Sync Status4

| Property                                                                                                                             | Value                                                            |
| ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| ![PowerApps\_CoreControls\_ComboboxCanvasTemplate\_dataField](resources/PowerApps_CoreControls_ComboboxCanvasTemplate_dataField.png) | Type: PowerApps\_CoreControls\_ComboboxCanvasTemplate\_dataField |

### Data

| Property         | Value                                                                                                                                                             |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FieldDisplayName | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"Last Sync Status"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>    |
| FieldName        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"dvlp_lastsyncstatus"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| FieldType        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"l"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                   |
| FieldVariantName | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"textualColumn"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>       |
| Order            | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`9`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                     |

### Design

| Property | Value                                                                                                                                           |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Height   | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`100`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| Width    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`100`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| X        | \`0\`                                                                                                                                           |
| Y        | \`0\`                                                                                                                                           |
| ZIndex   | \`9\`                                                                                                                                           |

### Color Properties

### Child & Parent Controls

| Property       | Value           |
| -------------- | --------------- |
| Parent Control | ComboboxCanvas3 |

## NIP4

| Property                                                                                                                             | Value                                                            |
| ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| ![PowerApps\_CoreControls\_ComboboxCanvasTemplate\_dataField](resources/PowerApps_CoreControls_ComboboxCanvasTemplate_dataField.png) | Type: PowerApps\_CoreControls\_ComboboxCanvasTemplate\_dataField |

### Data

| Property         | Value                                                                                                                                                       |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FieldDisplayName | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"NIP"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>           |
| FieldName        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"dvlp_nip"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>      |
| FieldType        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"s"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>             |
| FieldVariantName | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"textualColumn"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| Order            | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`2`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>               |

### Design

| Property | Value                                                                                                                                           |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Height   | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`100`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| Width    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`100`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| X        | \`0\`                                                                                                                                           |
| Y        | \`0\`                                                                                                                                           |
| ZIndex   | \`1\`                                                                                                                                           |

### Color Properties

### Child & Parent Controls

| Property       | Value           |
| -------------- | --------------- |
| Parent Control | ComboboxCanvas3 |

## shpDivider

| Property                              | Value           |
| ------------------------------------- | --------------- |
| ![rectangle](resources/rectangle.png) | Type: rectangle |

### Design

| Property               | Value                                                                                                                                                        |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| BorderStyle            | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`BorderStyle.None`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| BorderThickness        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`2`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                |
| DisplayMode            | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`DisplayMode.Edit`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| FocusedBorderThickness | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`2`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                |
| Height                 | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`1`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                |
| Width                  | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`150`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>              |
| X                      | \`0\`                                                                                                                                                        |
| Y                      | \`0\`                                                                                                                                                        |
| ZIndex                 | \`3\`                                                                                                                                                        |

### Color Properties

| Property           | Value                                                                                                                                                                                                                                                                                                                                      |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| BorderColor        | <table border="0"><tr><td style="width:50%; background-color:#ccffcc; color:black;"><table border="0"><tr><td>RGBA(166, 166, 166, 1)</td></tr><tr><td style="background-color:#A6A6A6"></td></tr></table></td><td style="width:50%; background-color:#ffcccc; color:black;"><table border="0"><tr><td></td></tr></table></td></tr></table> |
| DisabledFill       | <table border="0"><tr><td style="width:50%; background-color:#ccffcc; color:black;"><table border="0"><tr><td>RGBA(166, 166, 166, 1)</td></tr><tr><td style="background-color:#A6A6A6"></td></tr></table></td><td style="width:50%; background-color:#ffcccc; color:black;"><table border="0"><tr><td></td></tr></table></td></tr></table> |
| Fill               | \`\_colors.textGrey.value\`                                                                                                                                                                                                                                                                                                                |
| FocusedBorderColor | <table border="0"><tr><td style="width:50%; background-color:#ccffcc; color:black;"><table border="0"><tr><td>RGBA(0, 120, 212, 1)</td></tr><tr><td style="background-color:#0078D4"></td></tr></table></td><td style="width:50%; background-color:#ffcccc; color:black;"><table border="0"><tr><td></td></tr></table></td></tr></table>   |
| HoverFill          | <table border="0"><tr><td style="width:50%; background-color:#ccffcc; color:black;"><table border="0"><tr><td>RGBA(0, 120, 212, 1)</td></tr><tr><td style="background-color:#0078D4"></td></tr></table></td><td style="width:50%; background-color:#ffcccc; color:black;"><table border="0"><tr><td></td></tr></table></td></tr></table>   |
| PressedFill        | <table border="0"><tr><td style="width:50%; background-color:#ccffcc; color:black;"><table border="0"><tr><td>RGBA(0, 120, 212, 1)</td></tr><tr><td style="background-color:#0078D4"></td></tr></table></td><td style="width:50%; background-color:#ffcccc; color:black;"><table border="0"><tr><td></td></tr></table></td></tr></table>   |

### Child & Parent Controls

| Property       | Value   |
| -------------- | ------- |
| Parent Control | conMain |

## TextCanvas1

| Property                                                                                | Value                                     |
| --------------------------------------------------------------------------------------- | ----------------------------------------- |
| ![PowerApps\_CoreControls\_TextCanvas](resources/PowerApps_CoreControls_TextCanvas.png) | Type: PowerApps\_CoreControls\_TextCanvas |

### Data

| Property      | Value                                                                                                                                                                |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AutoHeight    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                     |
| FontColor     | \`\`                                                                                                                                                                 |
| Text          | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`ThisItem.title`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>           |
| VerticalAlign | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`VerticalAlign.Middle`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>     |
| Weight        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`'TextCanvas.Weight'.Bold`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |

### Design

| Property    | Value                                                                                                                                                        |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| DisplayMode | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`DisplayMode.Edit`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| Height      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`32`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>               |
| Width       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`96`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>               |
| X           | \`0\`                                                                                                                                                        |
| Y           | \`0\`                                                                                                                                                        |
| ZIndex      | \`2\`                                                                                                                                                        |

### Color Properties

| Property    | Value |
| ----------- | ----- |
| BorderColor | \`\`  |
| Fill        | \`\`  |

### Child & Parent Controls

| Property       | Value                  |
| -------------- | ---------------------- |
| Parent Control | conNavigationTabHeader |

## TextCanvas1\_2

| Property                                                                                | Value                                     |
| --------------------------------------------------------------------------------------- | ----------------------------------------- |
| ![PowerApps\_CoreControls\_TextCanvas](resources/PowerApps_CoreControls_TextCanvas.png) | Type: PowerApps\_CoreControls\_TextCanvas |

### Data

| Property          | Value                                                                                                                                                                |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Align             | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"Start"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                  |
| AutoHeight        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                     |
| BorderStyle       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| ContentLanguage   | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| Font              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| FontColor         | \`\`                                                                                                                                                                 |
| FontItalic        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                    |
| FontStrikethrough | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                    |
| FontUnderline     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                    |
| Size              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`14`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| Text              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"Recent activity"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>        |
| VerticalAlign     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`VerticalAlign.Middle`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>     |
| Weight            | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`'TextCanvas.Weight'.Bold`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| Wrap              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                     |

### Design

| Property    | Value                                                                                                                                                        |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| DisplayMode | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`DisplayMode.Edit`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| Height      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`32`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>               |
| TabIndex    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                |
| Tooltip     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>               |
| Visible     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>             |
| Width       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`96`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>               |
| X           | \`0\`                                                                                                                                                        |
| Y           | \`0\`                                                                                                                                                        |
| ZIndex      | \`1\`                                                                                                                                                        |

### Color Properties

| Property    | Value |
| ----------- | ----- |
| BorderColor | \`\`  |
| Fill        | \`\`  |

### Child & Parent Controls

| Property       | Value             |
| -------------- | ----------------- |
| Parent Control | conRecentActivity |

## TextCanvas1\_3

| Property                                                                                | Value                                     |
| --------------------------------------------------------------------------------------- | ----------------------------------------- |
| ![PowerApps\_CoreControls\_TextCanvas](resources/PowerApps_CoreControls_TextCanvas.png) | Type: PowerApps\_CoreControls\_TextCanvas |

### Data

| Property          | Value                                                                                                                                                                    |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Align             | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"Start"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                      |
| AutoHeight        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                        |
| BorderStyle       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                           |
| ContentLanguage   | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                           |
| Font              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                           |
| FontColor         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`_colors.textGrey.value`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>       |
| FontItalic        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                        |
| FontStrikethrough | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                        |
| FontUnderline     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                        |
| Size              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`_fontSizes.title.value`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>       |
| Text              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"Recently imported invoices"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| VerticalAlign     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`VerticalAlign.Middle`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>         |
| Weight            | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`'TextCanvas.Weight'.Medium`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>   |
| Wrap              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                         |

### Design

| Property    | Value                                                                                                                                                        |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| DisplayMode | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`DisplayMode.Edit`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| Height      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`32`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>               |
| TabIndex    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                |
| Tooltip     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>               |
| Visible     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>             |
| Width       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`96`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>               |
| X           | \`0\`                                                                                                                                                        |
| Y           | \`0\`                                                                                                                                                        |
| ZIndex      | \`2\`                                                                                                                                                        |

### Color Properties

| Property    | Value |
| ----------- | ----- |
| BorderColor | \`\`  |
| Fill        | \`\`  |

### Child & Parent Controls

| Property       | Value             |
| -------------- | ----------------- |
| Parent Control | conRecentActivity |

## TextCanvas1SC

| Property                                                                                | Value                                     |
| --------------------------------------------------------------------------------------- | ----------------------------------------- |
| ![PowerApps\_CoreControls\_TextCanvas](resources/PowerApps_CoreControls_TextCanvas.png) | Type: PowerApps\_CoreControls\_TextCanvas |

### Data

| Property          | Value                                                                                                                                                                  |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Align             | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"Start"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                    |
| AutoHeight        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                      |
| BorderStyle       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                         |
| ContentLanguage   | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                         |
| Font              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                         |
| FontColor         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`_colors.textGrey.value`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>     |
| FontItalic        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                      |
| FontStrikethrough | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                      |
| FontUnderline     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                      |
| Size              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`_fontSizes.title.value`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>     |
| Text              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`ThisItem.subtitle`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>          |
| VerticalAlign     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`VerticalAlign.Middle`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>       |
| Weight            | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`'TextCanvas.Weight'.Medium`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| Wrap              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |

### Design

| Property    | Value                                                                                                                                                        |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| DisplayMode | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`DisplayMode.Edit`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| Height      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`32`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>               |
| TabIndex    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                |
| Tooltip     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>               |
| Visible     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>             |
| Width       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`96`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>               |
| X           | \`0\`                                                                                                                                                        |
| Y           | \`0\`                                                                                                                                                        |
| ZIndex      | \`2\`                                                                                                                                                        |

### Color Properties

| Property    | Value |
| ----------- | ----- |
| BorderColor | \`\`  |
| Fill        | \`\`  |

### Child & Parent Controls

| Property       | Value            |
| -------------- | ---------------- |
| Parent Control | conNavigationTab |

## TextCanvas3

| Property                                                                                | Value                                     |
| --------------------------------------------------------------------------------------- | ----------------------------------------- |
| ![PowerApps\_CoreControls\_TextCanvas](resources/PowerApps_CoreControls_TextCanvas.png) | Type: PowerApps\_CoreControls\_TextCanvas |

### Data

| Property      | Value                                                                                                                                                                 |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Align         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`'TextCanvas.Align'.Start`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>  |
| AutoHeight    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                      |
| FontColor     | \`\`                                                                                                                                                                  |
| Text          | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`ThisItem.'Invoice Number'`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| VerticalAlign | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`VerticalAlign.Top`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>         |
| Weight        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`'TextCanvas.Weight'.Bold`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>  |

### Design

| Property    | Value                                                                                                                                                        |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| DisplayMode | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`DisplayMode.Edit`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| Height      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`32`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>               |
| Width       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`96`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>               |
| X           | \`0\`                                                                                                                                                        |
| Y           | \`0\`                                                                                                                                                        |
| ZIndex      | \`1\`                                                                                                                                                        |

### Color Properties

| Property    | Value |
| ----------- | ----- |
| BorderColor | \`\`  |
| Fill        | \`\`  |

### Child & Parent Controls

| Property       | Value       |
| -------------- | ----------- |
| Parent Control | Container14 |

## TextCanvas4

| Property                                                                                | Value                                     |
| --------------------------------------------------------------------------------------- | ----------------------------------------- |
| ![PowerApps\_CoreControls\_TextCanvas](resources/PowerApps_CoreControls_TextCanvas.png) | Type: PowerApps\_CoreControls\_TextCanvas |

### Data

| Property      | Value                                                                                                                                                                 |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AutoHeight    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                      |
| FontColor     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`_colors.textGrey.value`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>    |
| Size          | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`_fontSizes.subtitle.value`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| Text          | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`ThisItem.'Seller Name'`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>    |
| VerticalAlign | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`VerticalAlign.Top`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>         |

### Design

| Property    | Value                                                                                                                                                        |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| DisplayMode | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`DisplayMode.Edit`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| Height      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`32`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>               |
| Width       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`96`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>               |
| X           | \`0\`                                                                                                                                                        |
| Y           | \`0\`                                                                                                                                                        |
| ZIndex      | \`2\`                                                                                                                                                        |

### Color Properties

| Property    | Value |
| ----------- | ----- |
| BorderColor | \`\`  |
| Fill        | \`\`  |

### Child & Parent Controls

| Property       | Value       |
| -------------- | ----------- |
| Parent Control | Container14 |

## TextCanvas5

| Property                                                                                | Value                                     |
| --------------------------------------------------------------------------------------- | ----------------------------------------- |
| ![PowerApps\_CoreControls\_TextCanvas](resources/PowerApps_CoreControls_TextCanvas.png) | Type: PowerApps\_CoreControls\_TextCanvas |

### Data

| Property      | Value                                                                                                                                                                                         |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Align         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`'TextCanvas.Align'.End`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                            |
| AutoHeight    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                              |
| FontColor     | \`\`                                                                                                                                                                                          |
| Text          | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`ThisItem.Currency & " " & ThisItem.'Gross Amount'`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| VerticalAlign | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`VerticalAlign.Top`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                 |
| Weight        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`'TextCanvas.Weight'.Bold`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |

### Design

| Property    | Value                                                                                                                                                        |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| DisplayMode | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`DisplayMode.Edit`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| Height      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`32`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>               |
| Width       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`96`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>               |
| X           | \`0\`                                                                                                                                                        |
| Y           | \`0\`                                                                                                                                                        |
| ZIndex      | \`1\`                                                                                                                                                        |

### Color Properties

| Property    | Value |
| ----------- | ----- |
| BorderColor | \`\`  |
| Fill        | \`\`  |

### Child & Parent Controls

| Property       | Value       |
| -------------- | ----------- |
| Parent Control | Container15 |

## TextCanvas6

| Property                                                                                | Value                                     |
| --------------------------------------------------------------------------------------- | ----------------------------------------- |
| ![PowerApps\_CoreControls\_TextCanvas](resources/PowerApps_CoreControls_TextCanvas.png) | Type: PowerApps\_CoreControls\_TextCanvas |

### Data

| Property      | Value                                                                                                                                                                                   |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Align         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`'TextCanvas.Align'.End`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                      |
| AutoHeight    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                        |
| FontColor     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`_colors.textGrey.value`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                      |
| Size          | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`_fontSizes.subtitle.value`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                   |
| Text          | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`Text(ThisItem.'Invoice Date', "mm/mm/yyyy")`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| VerticalAlign | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`VerticalAlign.Top`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                           |

### Design

| Property    | Value                                                                                                                                                        |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| DisplayMode | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`DisplayMode.Edit`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| Height      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`32`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>               |
| Width       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`96`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>               |
| X           | \`0\`                                                                                                                                                        |
| Y           | \`0\`                                                                                                                                                        |
| ZIndex      | \`2\`                                                                                                                                                        |

### Color Properties

| Property    | Value |
| ----------- | ----- |
| BorderColor | \`\`  |
| Fill        | \`\`  |

### Child & Parent Controls

| Property       | Value       |
| -------------- | ----------- |
| Parent Control | Container15 |
