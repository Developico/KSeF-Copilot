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

## Synchronization

| Property                        | Value        |
| ------------------------------- | ------------ |
| ![screen](resources/screen.png) | Type: screen |

### Behavior

| Property  | Value                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OnHidden  | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`Set(_ksefStatus, Blank())`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                                                                                                                                                                                                                                                       |
| OnVisible | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`Set( _spinnerVisible, true ); Set( _ksefStatus, 'DVLP-KSeF-PP-Connector'.GetKsefStatus( { companyId: _settingId, environment: _setting.Environment, nip: _setting.NIP } ) ); If( TimeValue(_startedKsefSession.session.expiresAt) < Now(), Set( _startedKsefSession, Blank() ) ); Set( _spinnerVisible, false )`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |

### Data

| Property        | Value                                                                                                                                          |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| ContentLanguage | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |

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

| Property      | Value      |
| ------------- | ---------- |
| Child Control | conMainSC  |
| Child Control | Spinner1   |
| Child Control | Gallery1SC |

## 5e92db0b\-2c40\-4acb\-a6fb\-e7128b41468f

| Property                                          | Value                 |
| ------------------------------------------------- | --------------------- |
| ![galleryTemplate](resources/galleryTemplate.png) | Type: galleryTemplate |

### Color Properties

### Child & Parent Controls

| Property       | Value      |
| -------------- | ---------- |
| Parent Control | Gallery1SC |

## Button2

| Property                                                                        | Value                                 |
| ------------------------------------------------------------------------------- | ------------------------------------- |
| ![Microsoft\_CoreControls\_Button](resources/Microsoft_CoreControls_Button.png) | Type: Microsoft\_CoreControls\_Button |

### Behavior

| Property | Value                                                                                                                                             |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| OnChange | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |

### Data

| Property          | Value                                                                                                                                                                                  |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BorderRadius      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`14`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                         |
| ButtonType        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`'Button.ButtonType'.Standard`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>               |
| DisabledFillColor | \`\`                                                                                                                                                                                   |
| DisabledTextColor | \`\`                                                                                                                                                                                   |
| FillColor         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`_colors.accent.value`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| HoverFillColor    | \`\`                                                                                                                                                                                   |
| HoverTextColor    | \`\`                                                                                                                                                                                   |
| PressedFillColor  | \`\`                                                                                                                                                                                   |
| PressedTextColor  | \`\`                                                                                                                                                                                   |
| Text              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`If( _ksefStatus.isConnected, "Yes", "No" )`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| TextColor         | \`\`                                                                                                                                                                                   |

### Design

| Property    | Value                                                                                                                                                        |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| DisplayMode | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`DisplayMode.Edit`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| Height      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`24`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>               |
| Width       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`48`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>               |
| X           | \`0\`                                                                                                                                                        |
| Y           | \`0\`                                                                                                                                                        |
| ZIndex      | \`2\`                                                                                                                                                        |

### Color Properties

| Property            | Value |
| ------------------- | ----- |
| BorderColor         | \`\`  |
| DisabledBorderColor | \`\`  |
| HoverBorderColor    | \`\`  |
| PressedBorderColor  | \`\`  |

### Child & Parent Controls

| Property       | Value         |
| -------------- | ------------- |
| Parent Control | Container2\_1 |

## Button2\_1

| Property                                                                        | Value                                 |
| ------------------------------------------------------------------------------- | ------------------------------------- |
| ![Microsoft\_CoreControls\_Button](resources/Microsoft_CoreControls_Button.png) | Type: Microsoft\_CoreControls\_Button |

### Behavior

| Property | Value                                                                                                                                             |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| OnChange | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| OnSelect | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |

### Data

| Property                      | Value                                                                                                                                                                                       |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AcceptsFocus                  | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                            |
| AccessibleLabel               | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                              |
| Alignment                     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"center"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                        |
| BorderRadius                  | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`14`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                              |
| BorderStyle                   | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                              |
| BorderThickness               | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                               |
| ButtonType                    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`'Button.ButtonType'.Standard`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                    |
| ContentLanguage               | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                              |
| DisabledFillColor             | \`\`                                                                                                                                                                                        |
| DisabledTextColor             | \`\`                                                                                                                                                                                        |
| FillColor                     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`_colors.accent.value`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                            |
| Font                          | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"'Segoe UI', 'Open Sans', sans-serif"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>           |
| FontSize                      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`10.5`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                            |
| FontWeight                    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"600"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                           |
| HideFromAssistiveTechnologies | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                           |
| HoverFillColor                | \`\`                                                                                                                                                                                        |
| HoverTextColor                | \`\`                                                                                                                                                                                        |
| Italic                        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                           |
| PaddingBottom                 | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                               |
| PaddingEnd                    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                               |
| PaddingStart                  | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                               |
| PaddingTop                    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                               |
| PressedFillColor              | \`\`                                                                                                                                                                                        |
| PressedTextColor              | \`\`                                                                                                                                                                                        |
| Strikethrough                 | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                           |
| Text                          | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"Session " & _startedKsefSession.session.status`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| TextColor                     | \`\`                                                                                                                                                                                        |
| Tooltip                       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                              |
| Underline                     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                           |
| VerticalAlignment             | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"middle"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                        |

### Design

| Property    | Value                                                                                                                                                                     |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DisplayMode | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`DisplayMode.Edit`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>              |
| Height      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`24`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                            |
| TabIndex    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                             |
| Visible     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`!IsBlank(_startedKsefSession)`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| Width       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`100`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                           |
| X           | \`0\`                                                                                                                                                                     |
| Y           | \`0\`                                                                                                                                                                     |
| ZIndex      | \`2\`                                                                                                                                                                     |

### Color Properties

| Property            | Value |
| ------------------- | ----- |
| BorderColor         | \`\`  |
| DisabledBorderColor | \`\`  |
| HoverBorderColor    | \`\`  |
| PressedBorderColor  | \`\`  |

### Child & Parent Controls

| Property       | Value         |
| -------------- | ------------- |
| Parent Control | Container2\_5 |

## ButtonCanvas1

| Property                                                                                    | Value                                       |
| ------------------------------------------------------------------------------------------- | ------------------------------------------- |
| ![PowerApps\_CoreControls\_ButtonCanvas](resources/PowerApps_CoreControls_ButtonCanvas.png) | Type: PowerApps\_CoreControls\_ButtonCanvas |

### Behavior

| Property | Value                                                                                                                                              |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| OnSelect | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`Back()`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |

### Data

| Property   | Value                                                                                                                                                                        |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Appearance | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`'ButtonCanvas.Appearance'.Subtle`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| Icon       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"ArrowLeft"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                      |
| Text       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"Back"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                           |

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

### Child & Parent Controls

| Property       | Value                   |
| -------------- | ----------------------- |
| Parent Control | conSelectEnvironmentsSC |

## ButtonCanvas2SC

| Property                                                                                    | Value                                       |
| ------------------------------------------------------------------------------------------- | ------------------------------------------- |
| ![PowerApps\_CoreControls\_ButtonCanvas](resources/PowerApps_CoreControls_ButtonCanvas.png) | Type: PowerApps\_CoreControls\_ButtonCanvas |

### Behavior

| Property | Value                                                                                                                                                      |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OnSelect | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`Select(Parent)`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |

### Data

| Property          | Value                                                                                                                                                              |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| AcceptsFocus      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                   |
| AccessibleLabel   | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                     |
| Align             | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                     |
| Appearance        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"Primary"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>              |
| BasePaletteColor  | \`\`                                                                                                                                                               |
| BorderStyle       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                     |
| ContentLanguage   | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                     |
| Font              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                     |
| FontColor         | \`\`                                                                                                                                                               |
| FontItalic        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                  |
| FontSize          | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                      |
| FontStrikethrough | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                  |
| FontUnderline     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                  |
| FontWeight        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                     |
| Icon              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                     |
| IconRotation      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                      |
| IconStyle         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"Outline"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>              |
| Layout            | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"Icon before"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>          |
| Text              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`ThisItem.invoiceNumber`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| VerticalAlign     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                     |

### Design

| Property    | Value                                                                                                                                                        |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| DisplayMode | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`DisplayMode.Edit`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| Height      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`35`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>               |
| TabIndex    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                |
| Tooltip     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>               |
| Visible     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>             |
| Width       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`385`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>              |
| X           | \`0\`                                                                                                                                                        |
| Y           | \`0\`                                                                                                                                                        |
| ZIndex      | \`1\`                                                                                                                                                        |

### Color Properties

| Property    | Value |
| ----------- | ----- |
| BorderColor | \`\`  |

### Child & Parent Controls

| Property       | Value      |
| -------------- | ---------- |
| Parent Control | Gallery1SC |

## ButtonCanvas3

| Property                                                                                    | Value                                       |
| ------------------------------------------------------------------------------------------- | ------------------------------------------- |
| ![PowerApps\_CoreControls\_ButtonCanvas](resources/PowerApps_CoreControls_ButtonCanvas.png) | Type: PowerApps\_CoreControls\_ButtonCanvas |

### Behavior

| Property | Value                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OnSelect | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`Set( _spinnerVisible, true ); If( IsBlank(_startedKsefSession), Set( _startedKsefSession, 'DVLP-KSeF-PP-Connector'.StartKsefSession({nip: _setting.NIP}) ); Set( _activeKsefSession, 'DVLP-KSeF-PP-Connector'.GetKsefSession() ), 'DVLP-KSeF-PP-Connector'.EndKsefSession(); Set( _startedKsefSession, Blank() ) ); Set( _spinnerVisible, false ); `<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |

### Data

| Property          | Value                                                                                                                                                                                                              |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| AcceptsFocus      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                                   |
| AccessibleLabel   | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                                     |
| Align             | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                                     |
| Appearance        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`'ButtonCanvas.Appearance'.Subtle`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                       |
| BasePaletteColor  | \`\`                                                                                                                                                                                                               |
| BorderStyle       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                                     |
| ContentLanguage   | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                                     |
| Font              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                                     |
| FontColor         | \`\`                                                                                                                                                                                                               |
| FontItalic        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                                  |
| FontSize          | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                                      |
| FontStrikethrough | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                                  |
| FontUnderline     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                                  |
| FontWeight        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                                     |
| Icon              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`If( !IsBlank(_startedKsefSession), "GlobeProhibited", "GlobeArrowUp" )`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| IconRotation      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                                      |
| IconStyle         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"Outline"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                              |
| Layout            | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"Icon before"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                          |
| Text              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`If( !IsBlank(_startedKsefSession), "End session", "Start session" )`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>    |
| VerticalAlign     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                                     |

### Design

| Property    | Value                                                                                                                                                        |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| DisplayMode | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`DisplayMode.Edit`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| Height      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`48`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>               |
| TabIndex    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                |
| Tooltip     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>               |
| Visible     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>             |
| Width       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`150`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>              |
| X           | \`0\`                                                                                                                                                        |
| Y           | \`0\`                                                                                                                                                        |
| ZIndex      | \`20\`                                                                                                                                                       |

### Color Properties

| Property    | Value |
| ----------- | ----- |
| BorderColor | \`\`  |

### Child & Parent Controls

| Property       | Value            |
| -------------- | ---------------- |
| Parent Control | conKSeFSessionSC |

## ButtonCanvas3\_1

| Property                                                                                    | Value                                       |
| ------------------------------------------------------------------------------------------- | ------------------------------------------- |
| ![PowerApps\_CoreControls\_ButtonCanvas](resources/PowerApps_CoreControls_ButtonCanvas.png) | Type: PowerApps\_CoreControls\_ButtonCanvas |

### Behavior

| Property | Value                                                                                                                                             |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| OnSelect | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |

### Data

| Property          | Value                                                                                                                                                                             |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AcceptsFocus      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                  |
| AccessibleLabel   | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                    |
| Align             | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                    |
| Appearance        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`'ButtonCanvas.Appearance'.Transparent`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| BasePaletteColor  | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`_colors.accent.value`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                  |
| BorderStyle       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                    |
| ContentLanguage   | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                    |
| Font              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                    |
| FontColor         | \`\`                                                                                                                                                                              |
| FontItalic        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                 |
| FontSize          | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                     |
| FontStrikethrough | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                 |
| FontUnderline     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                 |
| FontWeight        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                    |
| Icon              | \`\`                                                                                                                                                                              |
| IconRotation      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                     |
| IconStyle         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"Outline"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                             |
| Layout            | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"Icon before"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                         |
| Text              | \`\`                                                                                                                                                                              |
| VerticalAlign     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                    |

### Design

| Property    | Value                                                                                                                                                        |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| DisplayMode | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`DisplayMode.View`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| Height      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`48`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>               |
| TabIndex    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                |
| Tooltip     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>               |
| Visible     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>             |
| Width       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`150`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>              |
| X           | \`0\`                                                                                                                                                        |
| Y           | \`0\`                                                                                                                                                        |
| ZIndex      | \`14\`                                                                                                                                                       |

### Color Properties

| Property    | Value |
| ----------- | ----- |
| BorderColor | \`\`  |

### Child & Parent Controls

| Property       | Value               |
| -------------- | ------------------- |
| Parent Control | conKSeFConnStatusSC |

## ButtonCanvas3\_2

| Property                                                                                    | Value                                       |
| ------------------------------------------------------------------------------------------- | ------------------------------------------- |
| ![PowerApps\_CoreControls\_ButtonCanvas](resources/PowerApps_CoreControls_ButtonCanvas.png) | Type: PowerApps\_CoreControls\_ButtonCanvas |

### Behavior

| Property | Value                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OnSelect | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`Set( _spinnerVisible, true ); Set( _startedSync, 'DVLP-KSeF-PP-Connector'.StartSync( _settingId, { direction: "incoming", dateFrom: Text( DatePickerCanvas1.SelectedDate, "yyyy-mm-dd" ), dateTo: Text( DatePickerCanvas1_1.SelectedDate, "yyyy-mm-dd" ) } ) ); Set( _startedSyncPreview, 'DVLP-KSeF-PP-Connector'.GetSyncPreview( { nip: _setting.NIP, dateFrom: Text( DatePickerCanvas1.SelectedDate, "yyyy-mm-dd" ), dateTo: Text( DatePickerCanvas1_1.SelectedDate, "yyyy-mm-dd" ) } ) ); Set( _startedSyncPreviewLogs, 'DVLP-KSeF-PP-Connector'.GetSyncLogs( { settingId: _settingId, limit: Blank() } ) ); Set( _spinnerVisible, false ); `<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |

### Data

| Property          | Value                                                                                                                                                                           |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AcceptsFocus      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                |
| AccessibleLabel   | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                  |
| Align             | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                  |
| Appearance        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`'ButtonCanvas.Appearance'.Secondary`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| BasePaletteColor  | \`\`                                                                                                                                                                            |
| BorderStyle       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                  |
| ContentLanguage   | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                  |
| Font              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                  |
| FontColor         | \`\`                                                                                                                                                                            |
| FontItalic        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                               |
| FontSize          | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                   |
| FontStrikethrough | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                               |
| FontUnderline     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                               |
| FontWeight        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                  |
| Icon              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"ArrowDownload"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                     |
| IconRotation      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                   |
| IconStyle         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"Outline"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                           |
| Layout            | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"Icon before"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| Text              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"Sync all"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| VerticalAlign     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                  |

### Design

| Property    | Value                                                                                                                                                                                                                  |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DisplayMode | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`If( IsBlank(_startedKsefSession), DisplayMode.Disabled, DisplayMode.Edit )`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| Height      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`32`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                                         |
| TabIndex    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                                          |
| Tooltip     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                                         |
| Visible     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                                       |
| Width       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`200`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                                        |
| X           | \`0\`                                                                                                                                                                                                                  |
| Y           | \`0\`                                                                                                                                                                                                                  |
| ZIndex      | \`2\`                                                                                                                                                                                                                  |

### Color Properties

| Property    | Value |
| ----------- | ----- |
| BorderColor | \`\`  |

### Child & Parent Controls

| Property       | Value         |
| -------------- | ------------- |
| Parent Control | Container6\_2 |

## ButtonCanvas4

| Property                                                                                    | Value                                       |
| ------------------------------------------------------------------------------------------- | ------------------------------------------- |
| ![PowerApps\_CoreControls\_ButtonCanvas](resources/PowerApps_CoreControls_ButtonCanvas.png) | Type: PowerApps\_CoreControls\_ButtonCanvas |

### Data

| Property         | Value                                                                                                                                                                                                                     |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BasePaletteColor | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`If( ThisItem.alreadyImported, RGBA( 8, 222, 8, 1 ), RGBA( 249, 83, 109, 1 ) )`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| FontColor        | \`\`                                                                                                                                                                                                                      |
| FontSize         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`_fontSizes.paragraph.value`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                    |
| Icon             | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`If( ThisItem.alreadyImported, "CheckmarkCircle", "Dismiss" )`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                  |
| Text             | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`If( ThisItem.alreadyImported, "Already imported", "Not imported yet" )`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>        |
| VerticalAlign    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`VerticalAlign.Middle`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                          |

### Design

| Property    | Value                                                                                                                                                        |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| DisplayMode | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`DisplayMode.Edit`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| Height      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`32`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>               |
| Width       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`150`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>              |
| X           | \`0\`                                                                                                                                                        |
| Y           | \`0\`                                                                                                                                                        |
| ZIndex      | \`4\`                                                                                                                                                        |

### Color Properties

| Property    | Value |
| ----------- | ----- |
| BorderColor | \`\`  |

### Child & Parent Controls

| Property       | Value         |
| -------------- | ------------- |
| Parent Control | Container13SC |

## c96ad052\-649f\-4433\-be55\-1487ce871efe

| Property                                          | Value                 |
| ------------------------------------------------- | --------------------- |
| ![galleryTemplate](resources/galleryTemplate.png) | Type: galleryTemplate |

### Color Properties

### Child & Parent Controls

| Property       | Value               |
| -------------- | ------------------- |
| Parent Control | galRecentActivitySC |

## ComboboxCanvas3SC

| Property                                                                                        | Value                                         |
| ----------------------------------------------------------------------------------------------- | --------------------------------------------- |
| ![PowerApps\_CoreControls\_ComboboxCanvas](resources/PowerApps_CoreControls_ComboboxCanvas.png) | Type: PowerApps\_CoreControls\_ComboboxCanvas |

### Behavior

| Property | Value                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OnChange | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`Set( _spinnerVisible, true ); Set( _setting, Self.Selected ); Set( _settingId, _setting.'KSeF Setting' ); Set( _ksefStatus, Blank() ); Set( _ksefStatus, 'DVLP-KSeF-PP-Connector'.GetKsefStatus( { companyId: _settingId, environment: _setting.Environment, nip: _setting.NIP } ) ); 'DVLP-KSeF-PP-Connector'.EndKsefSession(); Set( _startedKsefSession, Blank() ); Set( _spinnerVisible, false ); `<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |

### Data

| Property             | Value                                                                                                                                                                           |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AccessibleLabel      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                  |
| Appearance           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`'ComboboxCanvas.Appearance'.Outline`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| BasePaletteColor     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`_colors.accent.value`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                |
| BorderStyle          | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                  |
| ContentLanguage      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                  |
| DefaultSelectedItems | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`_setting`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                            |
| Font                 | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                  |
| FontItalic           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                               |
| FontSize             | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                   |
| FontStrikethrough    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                               |
| FontUnderline        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                               |
| FontWeight           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                  |
| InputTextPlaceholder | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"Find items"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                        |
| IsSearchable         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                |
| Items                | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`'KSeF Settings'`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                     |
| MultiValueDelimiter  | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`", "`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                |
| Required             | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                               |
| SelectMultiple       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                               |
| TriggerOutput        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"Keypress"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| ValidationState      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"None"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                              |

### Design

| Property    | Value                                                                                                                                                        |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| DisplayMode | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`DisplayMode.Edit`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| Height      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`32`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>               |
| TabIndex    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                |
| Tooltip     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>               |
| Visible     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>             |
| Width       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`320`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>              |
| X           | \`0\`                                                                                                                                                        |
| Y           | \`0\`                                                                                                                                                        |
| ZIndex      | \`2\`                                                                                                                                                        |

### Color Properties

### Child & Parent Controls

| Property       | Value                    |
| -------------- | ------------------------ |
| Child Control  | NIP4SC                   |
| Child Control  | Company Name4SC          |
| Child Control  | Environment4SC           |
| Child Control  | Created On4SC            |
| Child Control  | Is Active4SC             |
| Child Control  | Invoice Prefix4SC        |
| Child Control  | Key Vault Secret Name4SC |
| Child Control  | Last Sync At4SC          |
| Child Control  | Last Sync Status4SC      |
| Parent Control | conSelectEnvironmentsSC  |

## Company Name4SC

| Property                                                                                                                             | Value                                                            |
| ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| ![PowerApps\_CoreControls\_ComboboxCanvasTemplate\_dataField](resources/PowerApps_CoreControls_ComboboxCanvasTemplate_dataField.png) | Type: PowerApps\_CoreControls\_ComboboxCanvasTemplate\_dataField |

### Data

| Property         | Value                                                                                                                                                          |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ContentLanguage  | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                 |
| FieldDisplayName | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"Company Name"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>     |
| FieldName        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"dvlp_companyname"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| FieldType        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"s"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                |
| Order            | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`1`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                  |
| Type             | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"s"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                |

### Design

| Property | Value                                                                                                                                             |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Height   | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`100`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>   |
| Visible  | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| Width    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`100`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>   |
| X        | \`0\`                                                                                                                                             |
| Y        | \`0\`                                                                                                                                             |
| ZIndex   | \`2\`                                                                                                                                             |

### Color Properties

### Child & Parent Controls

| Property       | Value             |
| -------------- | ----------------- |
| Parent Control | ComboboxCanvas3SC |

## conBodySC

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
| BorderThickness      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`1`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| ChildTabPriority     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| DisplayMode          | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`DisplayMode.Edit`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>           |
| DropShadow           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`DropShadow.None`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>            |
| EnableChildFocus     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| Height               | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`200`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                        |
| LayoutAlignItems     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`LayoutAlignItems.Center`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>    |
| LayoutDirection      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`LayoutDirection.Vertical`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>   |
| LayoutGap            | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`8`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| LayoutGridColumns    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`6`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| LayoutGridRows       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`6`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| LayoutJustifyContent | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`LayoutJustifyContent.Start`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| LayoutMode           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`LayoutMode.Auto`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>            |
| LayoutOverflowX      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`LayoutOverflow.Hide`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>        |
| LayoutOverflowY      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`LayoutOverflow.Scroll`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>      |
| LayoutWrap           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                      |
| maximumHeight        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`7680`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| maximumWidth         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`1366`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| minimumHeight        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`20`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                         |
| minimumWidth         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`20`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                         |
| PaddingBottom        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`8`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| PaddingLeft          | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`8`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| PaddingRight         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`8`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| PaddingTop           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`8`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusBottomLeft     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusBottomRight    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusTopLeft        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusTopRight       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| Visible              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
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

| Property       | Value               |
| -------------- | ------------------- |
| Child Control  | conTotalsGridSC     |
| Child Control  | conFetchInvoicesSC  |
| Child Control  | conRecentActivitySC |
| Parent Control | conMainSC           |

## conFetchInvoicesSC

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
| Height               | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`300`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                        |
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
| RadiusBottomLeft     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusBottomRight    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusTopLeft        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusTopRight       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| Width                | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`850`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                        |
| X                    | \`0\`                                                                                                                                                                  |
| Y                    | \`0\`                                                                                                                                                                  |
| ZIndex               | \`2\`                                                                                                                                                                  |

### Color Properties

| Property    | Value                                                                                                                                                                                                                                                                                                                                |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| BorderColor | <table border="0"><tr><td style="width:50%; background-color:#ccffcc; color:black;"><table border="0"><tr><td>RGBA(0, 0, 0, 1)</td></tr><tr><td style="background-color:#000000"></td></tr></table></td><td style="width:50%; background-color:#ffcccc; color:black;"><table border="0"><tr><td></td></tr></table></td></tr></table> |
| Fill        | <table border="0"><tr><td style="width:50%; background-color:#ccffcc; color:black;"><table border="0"><tr><td>RGBA(0, 0, 0, 0)</td></tr><tr><td style="background-color:#000000"></td></tr></table></td><td style="width:50%; background-color:#ffcccc; color:black;"><table border="0"><tr><td></td></tr></table></td></tr></table> |

### Child & Parent Controls

| Property       | Value           |
| -------------- | --------------- |
| Child Control  | Container3      |
| Child Control  | TextCanvas7\_10 |
| Child Control  | Container5      |
| Child Control  | Container7      |
| Parent Control | conBodySC       |

## conHeaderSC

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
| BorderThickness      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`1`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| ChildTabPriority     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| DisplayMode          | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`DisplayMode.Edit`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>           |
| DropShadow           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`DropShadow.None`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>            |
| EnableChildFocus     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
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
| maximumHeight        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`7680`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| maximumWidth         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`1366`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| minimumHeight        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`20`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                         |
| minimumWidth         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`20`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                         |
| PaddingBottom        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| PaddingLeft          | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| PaddingRight         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| PaddingTop           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusBottomLeft     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusBottomRight    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusTopLeft        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusTopRight       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| Visible              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
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

| Property       | Value       |
| -------------- | ----------- |
| Child Control  | hdrHeaderSC |
| Parent Control | conMainSC   |

## conKSeFConnStatusSC

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
| Height               | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`85`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                         |
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
| X                    | \`40\`                                                                                                                                                                 |
| Y                    | \`40\`                                                                                                                                                                 |
| ZIndex               | \`1\`                                                                                                                                                                  |

### Color Properties

| Property    | Value                                                                                                                                                                                                                                                                                                                                |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| BorderColor | <table border="0"><tr><td style="width:50%; background-color:#ccffcc; color:black;"><table border="0"><tr><td>RGBA(0, 0, 0, 1)</td></tr><tr><td style="background-color:#000000"></td></tr></table></td><td style="width:50%; background-color:#ffcccc; color:black;"><table border="0"><tr><td></td></tr></table></td></tr></table> |
| Fill        | <table border="0"><tr><td style="width:50%; background-color:#ccffcc; color:black;"><table border="0"><tr><td>RGBA(0, 0, 0, 0)</td></tr><tr><td style="background-color:#000000"></td></tr></table></td><td style="width:50%; background-color:#ffcccc; color:black;"><table border="0"><tr><td></td></tr></table></td></tr></table> |

### Child & Parent Controls

| Property       | Value            |
| -------------- | ---------------- |
| Child Control  | Container2       |
| Child Control  | Container2\_1    |
| Child Control  | Container2\_2    |
| Child Control  | Container2\_3    |
| Child Control  | ButtonCanvas3\_1 |
| Parent Control | conTotalsGridSC  |

## conKSeFSessionSC

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
| Height               | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`85`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                         |
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
| maximumHeight        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`7680`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| maximumWidth         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`1366`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| minimumHeight        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`20`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                         |
| minimumWidth         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`20`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                         |
| PaddingBottom        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`8`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| PaddingLeft          | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`8`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| PaddingRight         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`8`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| PaddingTop           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`8`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusBottomLeft     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusBottomRight    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusTopLeft        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusTopRight       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| Visible              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| Width                | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`500`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                        |
| X                    | \`28\`                                                                                                                                                                 |
| Y                    | \`40\`                                                                                                                                                                 |
| ZIndex               | \`10\`                                                                                                                                                                 |

### Color Properties

| Property    | Value                                                                                                                                                                                                                                                                                                                                |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| BorderColor | <table border="0"><tr><td style="width:50%; background-color:#ccffcc; color:black;"><table border="0"><tr><td>RGBA(0, 0, 0, 1)</td></tr><tr><td style="background-color:#000000"></td></tr></table></td><td style="width:50%; background-color:#ffcccc; color:black;"><table border="0"><tr><td></td></tr></table></td></tr></table> |
| Fill        | <table border="0"><tr><td style="width:50%; background-color:#ccffcc; color:black;"><table border="0"><tr><td>RGBA(0, 0, 0, 0)</td></tr><tr><td style="background-color:#000000"></td></tr></table></td><td style="width:50%; background-color:#ffcccc; color:black;"><table border="0"><tr><td></td></tr></table></td></tr></table> |

### Child & Parent Controls

| Property       | Value           |
| -------------- | --------------- |
| Child Control  | Container2\_4   |
| Child Control  | Container2\_5   |
| Child Control  | Container2\_6   |
| Child Control  | Container2\_7   |
| Child Control  | ButtonCanvas3   |
| Parent Control | conTotalsGridSC |

## conMainSC

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
| maximumHeight        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`7680`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| maximumWidth         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`1366`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| minimumHeight        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`20`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                         |
| minimumWidth         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`20`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                         |
| PaddingBottom        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`16`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                         |
| PaddingLeft          | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`16`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                         |
| PaddingRight         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`16`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                         |
| PaddingTop           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`16`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                         |
| RadiusBottomLeft     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusBottomRight    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusTopLeft        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusTopRight       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| Visible              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
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

| Property       | Value                   |
| -------------- | ----------------------- |
| Child Control  | conHeaderSC             |
| Child Control  | conSelectEnvironmentsSC |
| Child Control  | shpDividerSC            |
| Child Control  | conBodySC               |
| Parent Control | Synchronization         |

## conRecentActivitySC

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
| maximumHeight        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`7680`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| maximumWidth         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`1366`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| minimumHeight        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`20`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                         |
| minimumWidth         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`20`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                         |
| PaddingBottom        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`8`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| PaddingLeft          | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`8`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| PaddingRight         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`8`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| PaddingTop           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`8`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusBottomLeft     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusBottomRight    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusTopLeft        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusTopRight       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| Visible              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
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

| Property       | Value               |
| -------------- | ------------------- |
| Child Control  | TextCanvas1\_6      |
| Child Control  | TextCanvas1\_7      |
| Child Control  | galRecentActivitySC |
| Parent Control | conBodySC           |

## conSelectEnvironmentsSC

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
| BorderThickness      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`1`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| ChildTabPriority     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| DisplayMode          | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`DisplayMode.Edit`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>           |
| DropShadow           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`DropShadow.None`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>            |
| EnableChildFocus     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
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
| maximumHeight        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`7680`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| maximumWidth         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`1366`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| minimumHeight        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`20`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                         |
| minimumWidth         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`20`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                         |
| PaddingBottom        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| PaddingLeft          | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`16`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                         |
| PaddingRight         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| PaddingTop           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusBottomLeft     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusBottomRight    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusTopLeft        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusTopRight       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| Visible              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
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

| Property       | Value             |
| -------------- | ----------------- |
| Child Control  | ButtonCanvas1     |
| Child Control  | ComboboxCanvas3SC |
| Parent Control | conMainSC         |

## Container13SC

| Property                                                                      | Value                               |
| ----------------------------------------------------------------------------- | ----------------------------------- |
| ![horizontalAutoLayoutContainer](resources/horizontalAutoLayoutContainer.png) | Type: horizontalAutoLayoutContainer |

### Data

| Property        | Value                                                                                                                                          |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| ContentLanguage | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |

### Design

| Property             | Value                                                                                                                                                                                     |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BorderStyle          | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`BorderStyle.Solid`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                             |
| BorderThickness      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                             |
| ChildTabPriority     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                          |
| DisplayMode          | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`DisplayMode.Edit`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                              |
| DropShadow           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`DropShadow.Light`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                              |
| EnableChildFocus     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                          |
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
| maximumHeight        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`7680`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                          |
| maximumWidth         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`1366`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                          |
| minimumHeight        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`20`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                            |
| minimumWidth         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`20`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                            |
| PaddingBottom        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`8`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                             |
| PaddingLeft          | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`8`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                             |
| PaddingRight         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`8`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                             |
| PaddingTop           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`8`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                             |
| RadiusBottomLeft     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                             |
| RadiusBottomRight    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                             |
| RadiusTopLeft        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                             |
| RadiusTopRight       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                             |
| Visible              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                          |
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

| Property       | Value               |
| -------------- | ------------------- |
| Child Control  | Icon2SC             |
| Child Control  | Container14SC       |
| Child Control  | Container15SC       |
| Child Control  | ButtonCanvas4       |
| Parent Control | galRecentActivitySC |

## Container14SC

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
| DropShadow           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`DropShadow.None`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>            |
| EnableChildFocus     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
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
| maximumHeight        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`7680`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| maximumWidth         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`1366`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| minimumHeight        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`20`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                         |
| minimumWidth         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`20`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                         |
| PaddingBottom        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`8`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| PaddingLeft          | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`8`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| PaddingRight         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`8`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| PaddingTop           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`8`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusBottomLeft     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusBottomRight    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusTopLeft        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusTopRight       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| Visible              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
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

| Property       | Value         |
| -------------- | ------------- |
| Child Control  | TextCanvas3SC |
| Child Control  | TextCanvas4SC |
| Parent Control | Container13SC |

## Container15SC

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
| DropShadow           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`DropShadow.None`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>            |
| EnableChildFocus     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
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
| maximumHeight        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`7680`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| maximumWidth         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`1366`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| minimumHeight        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`20`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                         |
| minimumWidth         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`20`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                         |
| PaddingBottom        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`8`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| PaddingLeft          | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`8`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| PaddingRight         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`8`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| PaddingTop           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`8`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusBottomLeft     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusBottomRight    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusTopLeft        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusTopRight       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| Visible              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| Width                | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`400`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                        |
| X                    | \`0\`                                                                                                                                                                  |
| Y                    | \`0\`                                                                                                                                                                  |
| ZIndex               | \`3\`                                                                                                                                                                  |

### Color Properties

| Property    | Value                                                                                                                                                                                                                                                                                                                                |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| BorderColor | <table border="0"><tr><td style="width:50%; background-color:#ccffcc; color:black;"><table border="0"><tr><td>RGBA(0, 0, 0, 1)</td></tr><tr><td style="background-color:#000000"></td></tr></table></td><td style="width:50%; background-color:#ffcccc; color:black;"><table border="0"><tr><td></td></tr></table></td></tr></table> |
| Fill        | <table border="0"><tr><td style="width:50%; background-color:#ccffcc; color:black;"><table border="0"><tr><td>RGBA(0, 0, 0, 0)</td></tr><tr><td style="background-color:#000000"></td></tr></table></td><td style="width:50%; background-color:#ffcccc; color:black;"><table border="0"><tr><td></td></tr></table></td></tr></table> |

### Child & Parent Controls

| Property       | Value         |
| -------------- | ------------- |
| Child Control  | TextCanvas5SC |
| Child Control  | TextCanvas6SC |
| Parent Control | Container13SC |

## Container2

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
| ZIndex               | \`1\`                                                                                                                                                                  |

### Color Properties

| Property    | Value                                                                                                                                                                                                                                                                                                                                |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| BorderColor | <table border="0"><tr><td style="width:50%; background-color:#ccffcc; color:black;"><table border="0"><tr><td>RGBA(0, 0, 0, 1)</td></tr><tr><td style="background-color:#000000"></td></tr></table></td><td style="width:50%; background-color:#ffcccc; color:black;"><table border="0"><tr><td></td></tr></table></td></tr></table> |
| Fill        | <table border="0"><tr><td style="width:50%; background-color:#ccffcc; color:black;"><table border="0"><tr><td>RGBA(0, 0, 0, 0)</td></tr><tr><td style="background-color:#000000"></td></tr></table></td><td style="width:50%; background-color:#ffcccc; color:black;"><table border="0"><tr><td></td></tr></table></td></tr></table> |

### Child & Parent Controls

| Property       | Value               |
| -------------- | ------------------- |
| Child Control  | Icon3               |
| Child Control  | TextCanvas2         |
| Parent Control | conKSeFConnStatusSC |

## Container2\_1

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
| DropShadow           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`DropShadow.None`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>            |
| EnableChildFocus     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| Height               | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`200`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                        |
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
| maximumHeight        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`7680`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| maximumWidth         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`1366`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| minimumHeight        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`20`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                         |
| minimumWidth         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`20`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                         |
| PaddingBottom        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`8`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| PaddingLeft          | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`8`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| PaddingRight         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`8`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| PaddingTop           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`8`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusBottomLeft     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusBottomRight    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusTopLeft        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusTopRight       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| Visible              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| Width                | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`500`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                        |
| X                    | \`0\`                                                                                                                                                                  |
| Y                    | \`0\`                                                                                                                                                                  |
| ZIndex               | \`11\`                                                                                                                                                                 |

### Color Properties

| Property    | Value                                                                                                                                                                                                                                                                                                                                |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| BorderColor | <table border="0"><tr><td style="width:50%; background-color:#ccffcc; color:black;"><table border="0"><tr><td>RGBA(0, 0, 0, 1)</td></tr><tr><td style="background-color:#000000"></td></tr></table></td><td style="width:50%; background-color:#ffcccc; color:black;"><table border="0"><tr><td></td></tr></table></td></tr></table> |
| Fill        | <table border="0"><tr><td style="width:50%; background-color:#ccffcc; color:black;"><table border="0"><tr><td>RGBA(0,0,0,0)</td></tr><tr><td style="background-color:#000000"></td></tr></table></td><td style="width:50%; background-color:#ffcccc; color:black;"><table border="0"><tr><td></td></tr></table></td></tr></table>    |

### Child & Parent Controls

| Property       | Value               |
| -------------- | ------------------- |
| Child Control  | Button2             |
| Child Control  | TextCanvas7         |
| Parent Control | conKSeFConnStatusSC |

## Container2\_10

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
| DropShadow           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`DropShadow.None`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>            |
| EnableChildFocus     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| Height               | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`28`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                         |
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
| maximumHeight        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`7680`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| maximumWidth         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`1366`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| minimumHeight        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`20`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                         |
| minimumWidth         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`20`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                         |
| PaddingBottom        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| PaddingLeft          | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| PaddingRight         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| PaddingTop           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusBottomLeft     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusBottomRight    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusTopLeft        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusTopRight       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| Visible              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
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

| Property       | Value         |
| -------------- | ------------- |
| Parent Control | Container6\_2 |

## Container2\_2

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
| DropShadow           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`DropShadow.None`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>            |
| EnableChildFocus     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| Height               | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`200`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                        |
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
| maximumHeight        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`7680`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| maximumWidth         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`1366`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| minimumHeight        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`20`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                         |
| minimumWidth         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`20`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                         |
| PaddingBottom        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`8`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| PaddingLeft          | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`8`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| PaddingRight         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`8`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| PaddingTop           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`8`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusBottomLeft     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusBottomRight    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusTopLeft        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusTopRight       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| Visible              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| Width                | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`500`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                        |
| X                    | \`0\`                                                                                                                                                                  |
| Y                    | \`0\`                                                                                                                                                                  |
| ZIndex               | \`12\`                                                                                                                                                                 |

### Color Properties

| Property    | Value                                                                                                                                                                                                                                                                                                                                |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| BorderColor | <table border="0"><tr><td style="width:50%; background-color:#ccffcc; color:black;"><table border="0"><tr><td>RGBA(0, 0, 0, 1)</td></tr><tr><td style="background-color:#000000"></td></tr></table></td><td style="width:50%; background-color:#ffcccc; color:black;"><table border="0"><tr><td></td></tr></table></td></tr></table> |
| Fill        | <table border="0"><tr><td style="width:50%; background-color:#ccffcc; color:black;"><table border="0"><tr><td>RGBA(0, 0, 0, 0)</td></tr><tr><td style="background-color:#000000"></td></tr></table></td><td style="width:50%; background-color:#ffcccc; color:black;"><table border="0"><tr><td></td></tr></table></td></tr></table> |

### Child & Parent Controls

| Property       | Value               |
| -------------- | ------------------- |
| Child Control  | TextCanvas7\_1      |
| Child Control  | TextCanvas7\_2      |
| Parent Control | conKSeFConnStatusSC |

## Container2\_3

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
| DropShadow           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`DropShadow.None`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>            |
| EnableChildFocus     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| Height               | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`200`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                        |
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
| maximumHeight        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`7680`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| maximumWidth         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`1366`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| minimumHeight        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`20`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                         |
| minimumWidth         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`20`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                         |
| PaddingBottom        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`8`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| PaddingLeft          | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`8`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| PaddingRight         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`8`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| PaddingTop           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`8`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusBottomLeft     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusBottomRight    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusTopLeft        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusTopRight       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| Visible              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| Width                | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`500`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                        |
| X                    | \`0\`                                                                                                                                                                  |
| Y                    | \`0\`                                                                                                                                                                  |
| ZIndex               | \`13\`                                                                                                                                                                 |

### Color Properties

| Property    | Value                                                                                                                                                                                                                                                                                                                                |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| BorderColor | <table border="0"><tr><td style="width:50%; background-color:#ccffcc; color:black;"><table border="0"><tr><td>RGBA(0, 0, 0, 1)</td></tr><tr><td style="background-color:#000000"></td></tr></table></td><td style="width:50%; background-color:#ffcccc; color:black;"><table border="0"><tr><td></td></tr></table></td></tr></table> |
| Fill        | <table border="0"><tr><td style="width:50%; background-color:#ccffcc; color:black;"><table border="0"><tr><td>RGBA(0, 0, 0, 0)</td></tr><tr><td style="background-color:#000000"></td></tr></table></td><td style="width:50%; background-color:#ffcccc; color:black;"><table border="0"><tr><td></td></tr></table></td></tr></table> |

### Child & Parent Controls

| Property       | Value               |
| -------------- | ------------------- |
| Child Control  | TextCanvas7\_3      |
| Child Control  | TextCanvas7\_4      |
| Parent Control | conKSeFConnStatusSC |

## Container2\_4

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
| DropShadow           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`DropShadow.None`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>            |
| EnableChildFocus     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
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
| maximumHeight        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`7680`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| maximumWidth         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`1366`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| minimumHeight        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`20`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                         |
| minimumWidth         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`20`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                         |
| PaddingBottom        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`8`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| PaddingLeft          | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`8`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| PaddingRight         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`8`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| PaddingTop           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`8`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusBottomLeft     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusBottomRight    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusTopLeft        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusTopRight       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| Visible              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| Width                | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`500`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                        |
| X                    | \`0\`                                                                                                                                                                  |
| Y                    | \`0\`                                                                                                                                                                  |
| ZIndex               | \`14\`                                                                                                                                                                 |

### Color Properties

| Property    | Value                                                                                                                                                                                                                                                                                                                                |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| BorderColor | <table border="0"><tr><td style="width:50%; background-color:#ccffcc; color:black;"><table border="0"><tr><td>RGBA(0, 0, 0, 1)</td></tr><tr><td style="background-color:#000000"></td></tr></table></td><td style="width:50%; background-color:#ffcccc; color:black;"><table border="0"><tr><td></td></tr></table></td></tr></table> |
| Fill        | <table border="0"><tr><td style="width:50%; background-color:#ccffcc; color:black;"><table border="0"><tr><td>RGBA(0, 0, 0, 0)</td></tr><tr><td style="background-color:#000000"></td></tr></table></td><td style="width:50%; background-color:#ffcccc; color:black;"><table border="0"><tr><td></td></tr></table></td></tr></table> |

### Child & Parent Controls

| Property       | Value            |
| -------------- | ---------------- |
| Child Control  | Icon3\_1         |
| Child Control  | TextCanvas2\_1   |
| Parent Control | conKSeFSessionSC |

## Container2\_5

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
| DropShadow           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`DropShadow.None`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>            |
| EnableChildFocus     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| Height               | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`200`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                        |
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
| maximumHeight        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`7680`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| maximumWidth         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`1366`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| minimumHeight        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`20`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                         |
| minimumWidth         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`20`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                         |
| PaddingBottom        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`8`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| PaddingLeft          | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`8`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| PaddingRight         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`8`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| PaddingTop           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`8`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusBottomLeft     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusBottomRight    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusTopLeft        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusTopRight       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| Visible              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| Width                | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`500`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                        |
| X                    | \`0\`                                                                                                                                                                  |
| Y                    | \`0\`                                                                                                                                                                  |
| ZIndex               | \`17\`                                                                                                                                                                 |

### Color Properties

| Property    | Value                                                                                                                                                                                                                                                                                                                                |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| BorderColor | <table border="0"><tr><td style="width:50%; background-color:#ccffcc; color:black;"><table border="0"><tr><td>RGBA(0, 0, 0, 1)</td></tr><tr><td style="background-color:#000000"></td></tr></table></td><td style="width:50%; background-color:#ffcccc; color:black;"><table border="0"><tr><td></td></tr></table></td></tr></table> |
| Fill        | <table border="0"><tr><td style="width:50%; background-color:#ccffcc; color:black;"><table border="0"><tr><td>RGBA(0,0,0,0)</td></tr><tr><td style="background-color:#000000"></td></tr></table></td><td style="width:50%; background-color:#ffcccc; color:black;"><table border="0"><tr><td></td></tr></table></td></tr></table>    |

### Child & Parent Controls

| Property       | Value            |
| -------------- | ---------------- |
| Child Control  | Button2\_1       |
| Child Control  | TextCanvas7\_5   |
| Parent Control | conKSeFSessionSC |

## Container2\_6

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
| DropShadow           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`DropShadow.None`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>            |
| EnableChildFocus     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| Height               | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`200`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                        |
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
| maximumHeight        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`7680`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| maximumWidth         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`1366`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| minimumHeight        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`20`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                         |
| minimumWidth         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`20`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                         |
| PaddingBottom        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`8`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| PaddingLeft          | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`8`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| PaddingRight         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`8`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| PaddingTop           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`8`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusBottomLeft     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusBottomRight    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusTopLeft        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusTopRight       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| Visible              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| Width                | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`500`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                        |
| X                    | \`0\`                                                                                                                                                                  |
| Y                    | \`0\`                                                                                                                                                                  |
| ZIndex               | \`18\`                                                                                                                                                                 |

### Color Properties

| Property    | Value                                                                                                                                                                                                                                                                                                                                |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| BorderColor | <table border="0"><tr><td style="width:50%; background-color:#ccffcc; color:black;"><table border="0"><tr><td>RGBA(0, 0, 0, 1)</td></tr><tr><td style="background-color:#000000"></td></tr></table></td><td style="width:50%; background-color:#ffcccc; color:black;"><table border="0"><tr><td></td></tr></table></td></tr></table> |
| Fill        | <table border="0"><tr><td style="width:50%; background-color:#ccffcc; color:black;"><table border="0"><tr><td>RGBA(0, 0, 0, 0)</td></tr><tr><td style="background-color:#000000"></td></tr></table></td><td style="width:50%; background-color:#ffcccc; color:black;"><table border="0"><tr><td></td></tr></table></td></tr></table> |

### Child & Parent Controls

| Property       | Value            |
| -------------- | ---------------- |
| Child Control  | TextCanvas7\_6   |
| Child Control  | TextCanvas7\_7   |
| Parent Control | conKSeFSessionSC |

## Container2\_7

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
| DropShadow           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`DropShadow.None`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>            |
| EnableChildFocus     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| Height               | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`200`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                        |
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
| maximumHeight        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`7680`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| maximumWidth         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`1366`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| minimumHeight        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`20`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                         |
| minimumWidth         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`20`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                         |
| PaddingBottom        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`8`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| PaddingLeft          | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`8`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| PaddingRight         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`8`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| PaddingTop           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`8`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusBottomLeft     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusBottomRight    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusTopLeft        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusTopRight       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| Visible              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| Width                | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`500`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                        |
| X                    | \`0\`                                                                                                                                                                  |
| Y                    | \`0\`                                                                                                                                                                  |
| ZIndex               | \`19\`                                                                                                                                                                 |

### Color Properties

| Property    | Value                                                                                                                                                                                                                                                                                                                                |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| BorderColor | <table border="0"><tr><td style="width:50%; background-color:#ccffcc; color:black;"><table border="0"><tr><td>RGBA(0, 0, 0, 1)</td></tr><tr><td style="background-color:#000000"></td></tr></table></td><td style="width:50%; background-color:#ffcccc; color:black;"><table border="0"><tr><td></td></tr></table></td></tr></table> |
| Fill        | <table border="0"><tr><td style="width:50%; background-color:#ccffcc; color:black;"><table border="0"><tr><td>RGBA(0, 0, 0, 0)</td></tr><tr><td style="background-color:#000000"></td></tr></table></td><td style="width:50%; background-color:#ffcccc; color:black;"><table border="0"><tr><td></td></tr></table></td></tr></table> |

### Child & Parent Controls

| Property       | Value            |
| -------------- | ---------------- |
| Child Control  | TextCanvas7\_8   |
| Child Control  | TextCanvas7\_9   |
| Parent Control | conKSeFSessionSC |

## Container2\_8

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
| DropShadow           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`DropShadow.None`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>            |
| EnableChildFocus     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| Height               | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`28`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                         |
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
| maximumHeight        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`7680`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| maximumWidth         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`1366`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| minimumHeight        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`20`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                         |
| minimumWidth         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`20`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                         |
| PaddingBottom        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| PaddingLeft          | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| PaddingRight         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| PaddingTop           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusBottomLeft     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusBottomRight    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusTopLeft        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusTopRight       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| Visible              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
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

| Property       | Value          |
| -------------- | -------------- |
| Child Control  | Icon3\_3       |
| Child Control  | TextCanvas2\_3 |
| Parent Control | Container6     |

## Container2\_9

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
| DropShadow           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`DropShadow.None`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>            |
| EnableChildFocus     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| Height               | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`28`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                         |
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
| maximumHeight        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`7680`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| maximumWidth         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`1366`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| minimumHeight        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`20`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                         |
| minimumWidth         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`20`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                         |
| PaddingBottom        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| PaddingLeft          | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| PaddingRight         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| PaddingTop           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusBottomLeft     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusBottomRight    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusTopLeft        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusTopRight       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| Visible              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
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
| Child Control  | Icon3\_4       |
| Child Control  | TextCanvas2\_4 |
| Parent Control | Container6\_1  |

## Container3

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

| Property    | Value                                                                                                                                                                                                                                                                                                                                |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| BorderColor | <table border="0"><tr><td style="width:50%; background-color:#ccffcc; color:black;"><table border="0"><tr><td>RGBA(0, 0, 0, 1)</td></tr><tr><td style="background-color:#000000"></td></tr></table></td><td style="width:50%; background-color:#ffcccc; color:black;"><table border="0"><tr><td></td></tr></table></td></tr></table> |
| Fill        | <table border="0"><tr><td style="width:50%; background-color:#ccffcc; color:black;"><table border="0"><tr><td>RGBA(0, 0, 0, 0)</td></tr><tr><td style="background-color:#000000"></td></tr></table></td><td style="width:50%; background-color:#ffcccc; color:black;"><table border="0"><tr><td></td></tr></table></td></tr></table> |

### Child & Parent Controls

| Property       | Value              |
| -------------- | ------------------ |
| Child Control  | Icon3\_2           |
| Child Control  | TextCanvas2\_2     |
| Parent Control | conFetchInvoicesSC |

## Container3\_1

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
| DropShadow           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`DropShadow.None`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>            |
| EnableChildFocus     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
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
| maximumHeight        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`7680`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| maximumWidth         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`1366`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| minimumHeight        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`20`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                         |
| minimumWidth         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`20`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                         |
| PaddingBottom        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| PaddingLeft          | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| PaddingRight         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| PaddingTop           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusBottomLeft     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusBottomRight    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusTopLeft        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusTopRight       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| Visible              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| Width                | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`500`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                        |
| X                    | \`0\`                                                                                                                                                                  |
| Y                    | \`0\`                                                                                                                                                                  |
| ZIndex               | \`24\`                                                                                                                                                                 |

### Color Properties

| Property    | Value                                                                                                                                                                                                                                                                                                                                |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| BorderColor | <table border="0"><tr><td style="width:50%; background-color:#ccffcc; color:black;"><table border="0"><tr><td>RGBA(0, 0, 0, 1)</td></tr><tr><td style="background-color:#000000"></td></tr></table></td><td style="width:50%; background-color:#ffcccc; color:black;"><table border="0"><tr><td></td></tr></table></td></tr></table> |
| Fill        | <table border="0"><tr><td style="width:50%; background-color:#ccffcc; color:black;"><table border="0"><tr><td>RGBA(0, 0, 0, 0)</td></tr><tr><td style="background-color:#000000"></td></tr></table></td><td style="width:50%; background-color:#ffcccc; color:black;"><table border="0"><tr><td></td></tr></table></td></tr></table> |

### Child & Parent Controls

| Property       | Value          |
| -------------- | -------------- |
| Child Control  | Icon3\_5       |
| Child Control  | TextCanvas2\_5 |
| Parent Control | Container7     |

## Container5

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
| Height               | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`200`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                        |
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
| PaddingLeft          | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| PaddingRight         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
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

| Property       | Value              |
| -------------- | ------------------ |
| Child Control  | Container6         |
| Child Control  | Container6\_1      |
| Child Control  | Container6\_2      |
| Parent Control | conFetchInvoicesSC |

## Container6

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
| DropShadow           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`DropShadow.None`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>            |
| EnableChildFocus     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
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
| maximumHeight        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`7680`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| maximumWidth         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`1366`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| minimumHeight        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`20`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                         |
| minimumWidth         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`20`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                         |
| PaddingBottom        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| PaddingLeft          | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| PaddingRight         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| PaddingTop           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusBottomLeft     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusBottomRight    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusTopLeft        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusTopRight       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| Visible              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| Width                | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`300`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                        |
| X                    | \`0\`                                                                                                                                                                  |
| Y                    | \`0\`                                                                                                                                                                  |
| ZIndex               | \`21\`                                                                                                                                                                 |

### Color Properties

| Property    | Value                                                                                                                                                                                                                                                                                                                                |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| BorderColor | <table border="0"><tr><td style="width:50%; background-color:#ccffcc; color:black;"><table border="0"><tr><td>RGBA(0, 0, 0, 1)</td></tr><tr><td style="background-color:#000000"></td></tr></table></td><td style="width:50%; background-color:#ffcccc; color:black;"><table border="0"><tr><td></td></tr></table></td></tr></table> |
| Fill        | <table border="0"><tr><td style="width:50%; background-color:#ccffcc; color:black;"><table border="0"><tr><td>RGBA(0, 0, 0, 0)</td></tr><tr><td style="background-color:#000000"></td></tr></table></td><td style="width:50%; background-color:#ffcccc; color:black;"><table border="0"><tr><td></td></tr></table></td></tr></table> |

### Child & Parent Controls

| Property       | Value             |
| -------------- | ----------------- |
| Child Control  | Container2\_8     |
| Child Control  | DatePickerCanvas1 |
| Parent Control | Container5        |

## Container6\_1

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
| DropShadow           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`DropShadow.None`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>            |
| EnableChildFocus     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
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
| maximumHeight        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`7680`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| maximumWidth         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`1366`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| minimumHeight        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`20`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                         |
| minimumWidth         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`20`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                         |
| PaddingBottom        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| PaddingLeft          | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| PaddingRight         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| PaddingTop           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusBottomLeft     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusBottomRight    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusTopLeft        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusTopRight       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| Visible              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| Width                | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`300`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                        |
| X                    | \`0\`                                                                                                                                                                  |
| Y                    | \`0\`                                                                                                                                                                  |
| ZIndex               | \`22\`                                                                                                                                                                 |

### Color Properties

| Property    | Value                                                                                                                                                                                                                                                                                                                                |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| BorderColor | <table border="0"><tr><td style="width:50%; background-color:#ccffcc; color:black;"><table border="0"><tr><td>RGBA(0, 0, 0, 1)</td></tr><tr><td style="background-color:#000000"></td></tr></table></td><td style="width:50%; background-color:#ffcccc; color:black;"><table border="0"><tr><td></td></tr></table></td></tr></table> |
| Fill        | <table border="0"><tr><td style="width:50%; background-color:#ccffcc; color:black;"><table border="0"><tr><td>RGBA(0, 0, 0, 0)</td></tr><tr><td style="background-color:#000000"></td></tr></table></td><td style="width:50%; background-color:#ffcccc; color:black;"><table border="0"><tr><td></td></tr></table></td></tr></table> |

### Child & Parent Controls

| Property       | Value                |
| -------------- | -------------------- |
| Child Control  | Container2\_9        |
| Child Control  | DatePickerCanvas1\_1 |
| Parent Control | Container5           |

## Container6\_2

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
| DropShadow           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`DropShadow.None`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>            |
| EnableChildFocus     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
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
| maximumHeight        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`7680`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| maximumWidth         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`1366`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| minimumHeight        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`20`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                         |
| minimumWidth         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`20`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                         |
| PaddingBottom        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| PaddingLeft          | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| PaddingRight         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| PaddingTop           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusBottomLeft     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusBottomRight    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusTopLeft        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusTopRight       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| Visible              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| Width                | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`500`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                        |
| X                    | \`0\`                                                                                                                                                                  |
| Y                    | \`0\`                                                                                                                                                                  |
| ZIndex               | \`23\`                                                                                                                                                                 |

### Color Properties

| Property    | Value                                                                                                                                                                                                                                                                                                                                |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| BorderColor | <table border="0"><tr><td style="width:50%; background-color:#ccffcc; color:black;"><table border="0"><tr><td>RGBA(0, 0, 0, 1)</td></tr><tr><td style="background-color:#000000"></td></tr></table></td><td style="width:50%; background-color:#ffcccc; color:black;"><table border="0"><tr><td></td></tr></table></td></tr></table> |
| Fill        | <table border="0"><tr><td style="width:50%; background-color:#ccffcc; color:black;"><table border="0"><tr><td>RGBA(0, 0, 0, 0)</td></tr><tr><td style="background-color:#000000"></td></tr></table></td><td style="width:50%; background-color:#ffcccc; color:black;"><table border="0"><tr><td></td></tr></table></td></tr></table> |

### Child & Parent Controls

| Property       | Value            |
| -------------- | ---------------- |
| Child Control  | Container2\_10   |
| Child Control  | ButtonCanvas3\_2 |
| Parent Control | Container5       |

## Container7

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
| PaddingBottom        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| PaddingLeft          | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| PaddingRight         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| PaddingTop           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusBottomLeft     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusBottomRight    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusTopLeft        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusTopRight       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| Width                | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`500`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                        |
| X                    | \`0\`                                                                                                                                                                  |
| Y                    | \`0\`                                                                                                                                                                  |
| ZIndex               | \`4\`                                                                                                                                                                  |

### Color Properties

| Property    | Value                                                                                                                                                                                                                                                                                                                                |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| BorderColor | <table border="0"><tr><td style="width:50%; background-color:#ccffcc; color:black;"><table border="0"><tr><td>RGBA(0, 0, 0, 1)</td></tr><tr><td style="background-color:#000000"></td></tr></table></td><td style="width:50%; background-color:#ffcccc; color:black;"><table border="0"><tr><td></td></tr></table></td></tr></table> |
| Fill        | <table border="0"><tr><td style="width:50%; background-color:#ccffcc; color:black;"><table border="0"><tr><td>RGBA(0, 0, 0, 0)</td></tr><tr><td style="background-color:#000000"></td></tr></table></td><td style="width:50%; background-color:#ffcccc; color:black;"><table border="0"><tr><td></td></tr></table></td></tr></table> |

### Child & Parent Controls

| Property       | Value              |
| -------------- | ------------------ |
| Child Control  | Container3\_1      |
| Child Control  | TextCanvas7\_11    |
| Parent Control | conFetchInvoicesSC |

## conTotalsGridSC

| Property                                                  | Value                     |
| --------------------------------------------------------- | ------------------------- |
| ![gridLayoutContainer](resources/gridLayoutContainer.png) | Type: gridLayoutContainer |

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
| DropShadow           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`DropShadow.None`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>            |
| EnableChildFocus     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| Height               | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`220`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                        |
| LayoutAlignItems     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`LayoutAlignItems.Start`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>     |
| LayoutDirection      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`LayoutDirection.Horizontal`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| LayoutGap            | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`8`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| LayoutGridColumns    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`2`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| LayoutGridRows       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`1`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| LayoutJustifyContent | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`LayoutJustifyContent.Start`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| LayoutMode           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`LayoutMode.Grid`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>            |
| LayoutOverflowX      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`LayoutOverflow.Hide`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>        |
| LayoutOverflowY      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`LayoutOverflow.Hide`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>        |
| LayoutWrap           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                      |
| maximumHeight        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`7680`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| maximumWidth         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`1366`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| minimumHeight        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`20`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                         |
| minimumWidth         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`20`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                         |
| PaddingBottom        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| PaddingLeft          | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`1`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| PaddingRight         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`1`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| PaddingTop           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`8`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusBottomLeft     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusBottomRight    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusTopLeft        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| RadiusTopRight       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| Visible              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
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

| Property       | Value               |
| -------------- | ------------------- |
| Child Control  | conKSeFConnStatusSC |
| Child Control  | conKSeFSessionSC    |
| Parent Control | conBodySC           |

## Created On4SC

| Property                                                                                                                             | Value                                                            |
| ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| ![PowerApps\_CoreControls\_ComboboxCanvasTemplate\_dataField](resources/PowerApps_CoreControls_ComboboxCanvasTemplate_dataField.png) | Type: PowerApps\_CoreControls\_ComboboxCanvasTemplate\_dataField |

### Data

| Property         | Value                                                                                                                                                    |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ContentLanguage  | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>           |
| FieldDisplayName | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"Created On"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| FieldName        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"createdon"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>  |
| FieldType        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"d"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>          |
| Order            | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>            |
| Type             | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"s"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>          |

### Design

| Property | Value                                                                                                                                             |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Height   | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`100`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>   |
| Visible  | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| Width    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`100`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>   |
| X        | \`0\`                                                                                                                                             |
| Y        | \`0\`                                                                                                                                             |
| ZIndex   | \`4\`                                                                                                                                             |

### Color Properties

### Child & Parent Controls

| Property       | Value             |
| -------------- | ----------------- |
| Parent Control | ComboboxCanvas3SC |

## DatePickerCanvas1

| Property                                                                                            | Value                                           |
| --------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| ![PowerApps\_CoreControls\_DatePickerCanvas](resources/PowerApps_CoreControls_DatePickerCanvas.png) | Type: PowerApps\_CoreControls\_DatePickerCanvas |

### Data

| Property         | Value                                                                                                                                                                             |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Appearance       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`'DatePickerCanvas.Appearance'.Outline`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| BasePaletteColor | \`\`                                                                                                                                                                              |
| FontColor        | \`\`                                                                                                                                                                              |
| FontSize         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`_fontSizes.subtitle.value`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>             |
| Format           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`'DatePickerCanvas.Format'.Short`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>       |
| SelectedDate     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`Today()-31`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                            |

### Design

| Property    | Value                                                                                                                                                        |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| DisplayMode | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`DisplayMode.Edit`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| Height      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`32`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>               |
| Width       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`200`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>              |
| X           | \`0\`                                                                                                                                                        |
| Y           | \`0\`                                                                                                                                                        |
| ZIndex      | \`3\`                                                                                                                                                        |

### Color Properties

| Property    | Value |
| ----------- | ----- |
| BorderColor | \`\`  |
| Fill        | \`\`  |

### Child & Parent Controls

| Property       | Value      |
| -------------- | ---------- |
| Parent Control | Container6 |

## DatePickerCanvas1\_1

| Property                                                                                            | Value                                           |
| --------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| ![PowerApps\_CoreControls\_DatePickerCanvas](resources/PowerApps_CoreControls_DatePickerCanvas.png) | Type: PowerApps\_CoreControls\_DatePickerCanvas |

### Behavior

| Property | Value                                                                                                                                             |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| OnChange | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |

### Data

| Property          | Value                                                                                                                                                                             |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AccessibleLabel   | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                    |
| Appearance        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`'DatePickerCanvas.Appearance'.Outline`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| BasePaletteColor  | \`\`                                                                                                                                                                              |
| BorderStyle       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                    |
| ContentLanguage   | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                    |
| DateTimeZone      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"Local"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                               |
| Font              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                    |
| FontColor         | \`\`                                                                                                                                                                              |
| FontItalic        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                 |
| FontSize          | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`_fontSizes.subtitle.value`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>             |
| FontStrikethrough | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                 |
| FontUnderline     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                 |
| FontWeight        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                    |
| Format            | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`'DatePickerCanvas.Format'.Short`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>       |
| IsEditable        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                 |
| Placeholder       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"Select a date..."`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                    |
| Required          | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                 |
| SelectedDate      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`Today()`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                               |
| StartOfWeek       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"Sunday"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                              |
| ValidationState   | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"None"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                |

### Design

| Property    | Value                                                                                                                                                        |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| DisplayMode | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`DisplayMode.Edit`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| Height      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`32`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>               |
| TabIndex    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                |
| Tooltip     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>               |
| Visible     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>             |
| Width       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`200`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>              |
| X           | \`0\`                                                                                                                                                        |
| Y           | \`0\`                                                                                                                                                        |
| ZIndex      | \`2\`                                                                                                                                                        |

### Color Properties

| Property    | Value |
| ----------- | ----- |
| BorderColor | \`\`  |
| Fill        | \`\`  |

### Child & Parent Controls

| Property       | Value         |
| -------------- | ------------- |
| Parent Control | Container6\_1 |

## Environment4SC

| Property                                                                                                                             | Value                                                            |
| ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| ![PowerApps\_CoreControls\_ComboboxCanvasTemplate\_dataField](resources/PowerApps_CoreControls_ComboboxCanvasTemplate_dataField.png) | Type: PowerApps\_CoreControls\_ComboboxCanvasTemplate\_dataField |

### Data

| Property         | Value                                                                                                                                                          |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ContentLanguage  | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                 |
| FieldDisplayName | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"Environment"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>      |
| FieldName        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"dvlp_environment"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| FieldType        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"l"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                |
| Order            | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`3`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                  |
| Type             | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"s"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                |

### Design

| Property | Value                                                                                                                                             |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Height   | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`100`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>   |
| Visible  | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| Width    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`100`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>   |
| X        | \`0\`                                                                                                                                             |
| Y        | \`0\`                                                                                                                                             |
| ZIndex   | \`3\`                                                                                                                                             |

### Color Properties

### Child & Parent Controls

| Property       | Value             |
| -------------- | ----------------- |
| Parent Control | ComboboxCanvas3SC |

## Gallery1SC

| Property                          | Value         |
| --------------------------------- | ------------- |
| ![gallery](resources/gallery.png) | Type: gallery |

### Data

| Property        | Value                                                                                                                                                                                       |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AccessibleLabel | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                              |
| ContentLanguage | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                              |
| Items           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`_startedSyncPreview.invoices`<td style="background-color:#ffcccc; width:50%;">CustomGallerySample</td></tr></table> |
| Reset           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                           |
| Selectable      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                            |
| WrapCount       | \`1\`                                                                                                                                                                                       |

### Design

| Property                | Value                                                                                                                                                                              |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| \#CopilotOverlayLabel   | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"Filtered"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                             |
| \#CopilotOverlayVisible | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                  |
| AutoHeight              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                  |
| BorderStyle             | \`BorderStyle.Solid\`                                                                                                                                                              |
| BorderThickness         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                      |
| DelayItemLoading        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                   |
| DisplayMode             | \`DisplayMode.Edit\`                                                                                                                                                               |
| FocusedBorderThickness  | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`2`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                      |
| Height                  | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`289`<td style="background-color:#ffcccc; width:50%;">575</td></tr></table>                                 |
| Layout                  | \`Layout.Vertical\`                                                                                                                                                                |
| LoadingSpinner          | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`LoadingSpinner.Data`<td style="background-color:#ffcccc; width:50%;">LoadingSpinner.None</td></tr></table> |
| LoadingSpinnerColor     | \`Self.BorderColor\`                                                                                                                                                               |
| maximumHeight           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`768`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                    |
| maximumWidth            | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`1366`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                   |
| MaxTemplateSize         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`5000`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                   |
| minimumHeight           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`20`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                     |
| minimumWidth            | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`20`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                     |
| NavigationStep          | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`1`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                      |
| SelectionTracksMove     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                  |
| ShowNavigation          | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                  |
| ShowScrollbar           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                   |
| TabIndex                | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`-1`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                     |
| TemplateMaximumWidth    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                      |
| TemplatePadding         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`5`<td style="background-color:#ffcccc; width:50%;">0</td></tr></table>                                     |
| TemplateSize            | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`35`<td style="background-color:#ffcccc; width:50%;">Min(160, Self.Height - 60)</td></tr></table>           |
| Transition              | \`Transition.None\`                                                                                                                                                                |
| Visible                 | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                  |
| Width                   | \`640\`                                                                                                                                                                            |
| X                       | \`40\`                                                                                                                                                                             |
| Y                       | \`40\`                                                                                                                                                                             |
| ZIndex                  | \`1\`                                                                                                                                                                              |

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

| Property       | Value                                    |
| -------------- | ---------------------------------------- |
| Child Control  | 5e92db0b\-2c40\-4acb\-a6fb\-e7128b41468f |
| Child Control  | ButtonCanvas2SC                          |
| Parent Control | Synchronization                          |

## galRecentActivitySC

| Property                          | Value         |
| --------------------------------- | ------------- |
| ![gallery](resources/gallery.png) | Type: gallery |

### Data

| Property        | Value                                                                                                                                                                                           |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AccessibleLabel | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                  |
| ContentLanguage | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                  |
| Items           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`FirstN( Gallery1SC.AllItems, 5 )`<td style="background-color:#ffcccc; width:50%;">CustomGallerySample</td></tr></table> |
| Reset           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                               |
| Selectable      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                |
| WrapCount       | \`1\`                                                                                                                                                                                           |

### Design

| Property                | Value                                                                                                                                                                              |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| \#CopilotOverlayLabel   | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"Filtered"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                             |
| \#CopilotOverlayVisible | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                  |
| AutoHeight              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                  |
| BorderStyle             | \`BorderStyle.Solid\`                                                                                                                                                              |
| BorderThickness         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                      |
| DelayItemLoading        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                   |
| DisplayMode             | \`DisplayMode.Edit\`                                                                                                                                                               |
| FocusedBorderThickness  | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`2`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                      |
| Height                  | \`575\`                                                                                                                                                                            |
| Layout                  | \`Layout.Vertical\`                                                                                                                                                                |
| LoadingSpinner          | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`LoadingSpinner.Data`<td style="background-color:#ffcccc; width:50%;">LoadingSpinner.None</td></tr></table> |
| LoadingSpinnerColor     | \`Self.BorderColor\`                                                                                                                                                               |
| maximumHeight           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`768`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                    |
| maximumWidth            | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`1366`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                   |
| MaxTemplateSize         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`5000`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                   |
| minimumHeight           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`20`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                     |
| minimumWidth            | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`20`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                     |
| NavigationStep          | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`1`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                      |
| SelectionTracksMove     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                  |
| ShowNavigation          | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                  |
| ShowScrollbar           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                   |
| TabIndex                | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`-1`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                     |
| TemplateMaximumWidth    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                      |
| TemplatePadding         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`5`<td style="background-color:#ffcccc; width:50%;">0</td></tr></table>                                     |
| TemplateSize            | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`70`<td style="background-color:#ffcccc; width:50%;">Min(160, Self.Height - 60)</td></tr></table>           |
| Transition              | \`Transition.None\`                                                                                                                                                                |
| Visible                 | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                   |
| Width                   | \`640\`                                                                                                                                                                            |
| X                       | \`0\`                                                                                                                                                                              |
| Y                       | \`0\`                                                                                                                                                                              |
| ZIndex                  | \`3\`                                                                                                                                                                              |

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

| Property       | Value                                    |
| -------------- | ---------------------------------------- |
| Child Control  | c96ad052\-649f\-4433\-be55\-1487ce871efe |
| Child Control  | Container13SC                            |
| Parent Control | conRecentActivitySC                      |

## hdrHeaderSC

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
| Align                   | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                                                                                                                                                           |
| BasePaletteColor        | <table border="0"><tr><td style="width:50%; background-color:#ccffcc; color:black;"><table border="0"><tr><td>RGBA(5, 102, 178, 1)</td></tr><tr><td style="background-color:#0566B2"></td></tr></table></td><td style="width:50%; background-color:#ffcccc; color:black;"><table border="0"><tr><td></td></tr></table></td></tr></table> |
| BorderStyle             | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                                                                                                                                                           |
| ContentLanguage         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                                                                                                                                                           |
| Font                    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                                                                                                                                                           |
| FontColor               | \`\`                                                                                                                                                                                                                                                                                                                                     |
| IsLogoVisible           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                                                                                                                                                         |
| IsProfilePictureVisible | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                                                                                                                                                         |
| IsTitleVisible          | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                                                                                                                                                         |
| Logo                    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`'dashboard-svgrepo-com'`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                                                                                                                                      |
| LogoMaxHeight           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`70`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                                                                                                                                                           |
| LogoTooltip             | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"The logo image"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                                                                                                                                             |
| Style                   | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`'Header.Style'.Neutral`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                                                                                                                                       |
| Title                   | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"Dashboard: Synchronization"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                                                                                                                                 |
| TitleFontSize           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`20`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                                                                                                                                                           |
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
| TabIndex    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                |
| Tooltip     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>               |
| Visible     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>             |
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

| Property       | Value       |
| -------------- | ----------- |
| Parent Control | conHeaderSC |

## Icon2SC

| Property                                                                    | Value                               |
| --------------------------------------------------------------------------- | ----------------------------------- |
| ![PowerApps\_CoreControls\_Icon](resources/PowerApps_CoreControls_Icon.png) | Type: PowerApps\_CoreControls\_Icon |

### Data

| Property        | Value                                                                                                                                                          |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ContentLanguage | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                 |
| Icon            | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"ArrowDownload"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>    |
| IconColor       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`_colors.blue.value`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| IconStyle       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"Outline"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>          |
| Rotation        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                  |
| Tooltip         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                 |

### Design

| Property    | Value                                                                                                                                                        |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| DisplayMode | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`DisplayMode.Edit`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| Height      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`32`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>               |
| TabIndex    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                |
| Visible     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>             |
| Width       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`32`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>               |
| X           | \`0\`                                                                                                                                                        |
| Y           | \`0\`                                                                                                                                                        |
| ZIndex      | \`1\`                                                                                                                                                        |

### Color Properties

### Child & Parent Controls

| Property       | Value         |
| -------------- | ------------- |
| Parent Control | Container13SC |

## Icon3

| Property                                                                    | Value                               |
| --------------------------------------------------------------------------- | ----------------------------------- |
| ![PowerApps\_CoreControls\_Icon](resources/PowerApps_CoreControls_Icon.png) | Type: PowerApps\_CoreControls\_Icon |

### Data

| Property  | Value                                                                                                                                                                                                             |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Icon      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">` If( _ksefStatus.isConnected, "CheckmarkCircle", "Dismiss" )`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>          |
| IconColor | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`If( _ksefStatus.isConnected, _colors.green.value, _colors.red.value )`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| IconStyle | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`'Icon.IconStyle'.Outline`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                              |

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

| Property       | Value      |
| -------------- | ---------- |
| Parent Control | Container2 |

## Icon3\_1

| Property                                                                    | Value                               |
| --------------------------------------------------------------------------- | ----------------------------------- |
| ![PowerApps\_CoreControls\_Icon](resources/PowerApps_CoreControls_Icon.png) | Type: PowerApps\_CoreControls\_Icon |

### Data

| Property        | Value                                                                                                                                                                                                                                                                                                                                         |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ContentLanguage | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                                                                                                                                                                |
| Icon            | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"GlobeSync"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                                                                                                                                                       |
| IconColor       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`If( _startedKsefSession.success && !IsBlank(_startedKsefSession), _colors.green.value, !_startedKsefSession.success && !IsBlank(_startedKsefSession), _colors.red.value, _colors.textGrey.value )`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| IconStyle       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`'Icon.IconStyle'.Outline`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                                                                                                                                          |
| Rotation        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                                                                                                                                                                 |
| Tooltip         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                                                                                                                                                                |

### Design

| Property    | Value                                                                                                                                                        |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| DisplayMode | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`DisplayMode.Edit`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| Height      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`32`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>               |
| TabIndex    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                |
| Visible     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>             |
| Width       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`32`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>               |
| X           | \`0\`                                                                                                                                                        |
| Y           | \`0\`                                                                                                                                                        |
| ZIndex      | \`1\`                                                                                                                                                        |

### Color Properties

### Child & Parent Controls

| Property       | Value         |
| -------------- | ------------- |
| Parent Control | Container2\_4 |

## Icon3\_2

| Property                                                                    | Value                               |
| --------------------------------------------------------------------------- | ----------------------------------- |
| ![PowerApps\_CoreControls\_Icon](resources/PowerApps_CoreControls_Icon.png) | Type: PowerApps\_CoreControls\_Icon |

### Data

| Property        | Value                                                                                                                                                                                                                                                                                                                                |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| ContentLanguage | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                                                                                                                                                       |
| Icon            | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"ArrowDownload"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                                                                                                                                          |
| IconColor       | <table border="0"><tr><td style="width:50%; background-color:#ccffcc; color:black;"><table border="0"><tr><td>RGBA(0, 0, 0, 1)</td></tr><tr><td style="background-color:#000000"></td></tr></table></td><td style="width:50%; background-color:#ffcccc; color:black;"><table border="0"><tr><td></td></tr></table></td></tr></table> |
| IconStyle       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`'Icon.IconStyle'.Filled`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                                                                                                                                  |
| Rotation        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                                                                                                                                                        |
| Tooltip         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                                                                                                                                                       |

### Design

| Property    | Value                                                                                                                                                        |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| DisplayMode | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`DisplayMode.Edit`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| Height      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`32`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>               |
| TabIndex    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                |
| Visible     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>             |
| Width       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`32`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>               |
| X           | \`0\`                                                                                                                                                        |
| Y           | \`0\`                                                                                                                                                        |
| ZIndex      | \`1\`                                                                                                                                                        |

### Color Properties

### Child & Parent Controls

| Property       | Value      |
| -------------- | ---------- |
| Parent Control | Container3 |

## Icon3\_3

| Property                                                                    | Value                               |
| --------------------------------------------------------------------------- | ----------------------------------- |
| ![PowerApps\_CoreControls\_Icon](resources/PowerApps_CoreControls_Icon.png) | Type: PowerApps\_CoreControls\_Icon |

### Data

| Property        | Value                                                                                                                                                                                                                                                                                                                                |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| ContentLanguage | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                                                                                                                                                       |
| Icon            | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"Calendar"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                                                                                                                                               |
| IconColor       | <table border="0"><tr><td style="width:50%; background-color:#ccffcc; color:black;"><table border="0"><tr><td>RGBA(0, 0, 0, 1)</td></tr><tr><td style="background-color:#000000"></td></tr></table></td><td style="width:50%; background-color:#ffcccc; color:black;"><table border="0"><tr><td></td></tr></table></td></tr></table> |
| IconStyle       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`'Icon.IconStyle'.Outline`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                                                                                                                                 |
| Rotation        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                                                                                                                                                        |
| Tooltip         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                                                                                                                                                       |

### Design

| Property    | Value                                                                                                                                                        |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| DisplayMode | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`DisplayMode.Edit`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| Height      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`16`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>               |
| TabIndex    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                |
| Visible     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>             |
| Width       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`16`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>               |
| X           | \`0\`                                                                                                                                                        |
| Y           | \`0\`                                                                                                                                                        |
| ZIndex      | \`1\`                                                                                                                                                        |

### Color Properties

### Child & Parent Controls

| Property       | Value         |
| -------------- | ------------- |
| Parent Control | Container2\_8 |

## Icon3\_4

| Property                                                                    | Value                               |
| --------------------------------------------------------------------------- | ----------------------------------- |
| ![PowerApps\_CoreControls\_Icon](resources/PowerApps_CoreControls_Icon.png) | Type: PowerApps\_CoreControls\_Icon |

### Data

| Property        | Value                                                                                                                                                                                                                                                                                                                                |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| ContentLanguage | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                                                                                                                                                       |
| Icon            | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"Calendar"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                                                                                                                                               |
| IconColor       | <table border="0"><tr><td style="width:50%; background-color:#ccffcc; color:black;"><table border="0"><tr><td>RGBA(0, 0, 0, 1)</td></tr><tr><td style="background-color:#000000"></td></tr></table></td><td style="width:50%; background-color:#ffcccc; color:black;"><table border="0"><tr><td></td></tr></table></td></tr></table> |
| IconStyle       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`'Icon.IconStyle'.Outline`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                                                                                                                                 |
| Rotation        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                                                                                                                                                        |
| Tooltip         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                                                                                                                                                       |

### Design

| Property    | Value                                                                                                                                                        |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| DisplayMode | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`DisplayMode.Edit`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| Height      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`16`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>               |
| TabIndex    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                |
| Visible     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>             |
| Width       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`16`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>               |
| X           | \`0\`                                                                                                                                                        |
| Y           | \`0\`                                                                                                                                                        |
| ZIndex      | \`1\`                                                                                                                                                        |

### Color Properties

### Child & Parent Controls

| Property       | Value         |
| -------------- | ------------- |
| Parent Control | Container2\_9 |

## Icon3\_5

| Property                                                                    | Value                               |
| --------------------------------------------------------------------------- | ----------------------------------- |
| ![PowerApps\_CoreControls\_Icon](resources/PowerApps_CoreControls_Icon.png) | Type: PowerApps\_CoreControls\_Icon |

### Data

| Property        | Value                                                                                                                                                                                                                                                                                                                                |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| ContentLanguage | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                                                                                                                                                       |
| Icon            | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"AppsListDetail"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                                                                                                                                         |
| IconColor       | <table border="0"><tr><td style="width:50%; background-color:#ccffcc; color:black;"><table border="0"><tr><td>RGBA(0, 0, 0, 1)</td></tr><tr><td style="background-color:#000000"></td></tr></table></td><td style="width:50%; background-color:#ffcccc; color:black;"><table border="0"><tr><td></td></tr></table></td></tr></table> |
| IconStyle       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`'Icon.IconStyle'.Filled`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                                                                                                                                  |
| Rotation        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                                                                                                                                                        |
| Tooltip         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                                                                                                                                                       |

### Design

| Property    | Value                                                                                                                                                        |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| DisplayMode | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`DisplayMode.Edit`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| Height      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`32`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>               |
| TabIndex    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                |
| Visible     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>             |
| Width       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`32`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>               |
| X           | \`0\`                                                                                                                                                        |
| Y           | \`0\`                                                                                                                                                        |
| ZIndex      | \`1\`                                                                                                                                                        |

### Color Properties

### Child & Parent Controls

| Property       | Value         |
| -------------- | ------------- |
| Parent Control | Container3\_1 |

## Invoice Prefix4SC

| Property                                                                                                                             | Value                                                            |
| ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| ![PowerApps\_CoreControls\_ComboboxCanvasTemplate\_dataField](resources/PowerApps_CoreControls_ComboboxCanvasTemplate_dataField.png) | Type: PowerApps\_CoreControls\_ComboboxCanvasTemplate\_dataField |

### Data

| Property         | Value                                                                                                                                                            |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ContentLanguage  | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                   |
| FieldDisplayName | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"Invoice Prefix"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>     |
| FieldName        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"dvlp_invoiceprefix"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| FieldType        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"s"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                  |
| Order            | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`6`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                    |
| Type             | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"s"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                  |

### Design

| Property | Value                                                                                                                                             |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Height   | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`100`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>   |
| Visible  | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| Width    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`100`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>   |
| X        | \`0\`                                                                                                                                             |
| Y        | \`0\`                                                                                                                                             |
| ZIndex   | \`6\`                                                                                                                                             |

### Color Properties

### Child & Parent Controls

| Property       | Value             |
| -------------- | ----------------- |
| Parent Control | ComboboxCanvas3SC |

## Is Active4SC

| Property                                                                                                                             | Value                                                            |
| ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| ![PowerApps\_CoreControls\_ComboboxCanvasTemplate\_dataField](resources/PowerApps_CoreControls_ComboboxCanvasTemplate_dataField.png) | Type: PowerApps\_CoreControls\_ComboboxCanvasTemplate\_dataField |

### Data

| Property         | Value                                                                                                                                                       |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ContentLanguage  | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>              |
| FieldDisplayName | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"Is Active"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>     |
| FieldName        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"dvlp_isactive"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| FieldType        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"l"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>             |
| Order            | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`5`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>               |
| Type             | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"s"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>             |

### Design

| Property | Value                                                                                                                                             |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Height   | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`100`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>   |
| Visible  | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| Width    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`100`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>   |
| X        | \`0\`                                                                                                                                             |
| Y        | \`0\`                                                                                                                                             |
| ZIndex   | \`5\`                                                                                                                                             |

### Color Properties

### Child & Parent Controls

| Property       | Value             |
| -------------- | ----------------- |
| Parent Control | ComboboxCanvas3SC |

## Key Vault Secret Name4SC

| Property                                                                                                                             | Value                                                            |
| ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| ![PowerApps\_CoreControls\_ComboboxCanvasTemplate\_dataField](resources/PowerApps_CoreControls_ComboboxCanvasTemplate_dataField.png) | Type: PowerApps\_CoreControls\_ComboboxCanvasTemplate\_dataField |

### Data

| Property         | Value                                                                                                                                                                 |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ContentLanguage  | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                        |
| FieldDisplayName | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"Key Vault Secret Name"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>   |
| FieldName        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"dvlp_keyvaultsecretname"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| FieldType        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"s"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| Order            | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`7`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                         |
| Type             | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"s"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |

### Design

| Property | Value                                                                                                                                             |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Height   | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`100`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>   |
| Visible  | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| Width    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`100`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>   |
| X        | \`0\`                                                                                                                                             |
| Y        | \`0\`                                                                                                                                             |
| ZIndex   | \`7\`                                                                                                                                             |

### Color Properties

### Child & Parent Controls

| Property       | Value             |
| -------------- | ----------------- |
| Parent Control | ComboboxCanvas3SC |

## Last Sync At4SC

| Property                                                                                                                             | Value                                                            |
| ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| ![PowerApps\_CoreControls\_ComboboxCanvasTemplate\_dataField](resources/PowerApps_CoreControls_ComboboxCanvasTemplate_dataField.png) | Type: PowerApps\_CoreControls\_ComboboxCanvasTemplate\_dataField |

### Data

| Property         | Value                                                                                                                                                         |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ContentLanguage  | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                |
| FieldDisplayName | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"Last Sync At"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>    |
| FieldName        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"dvlp_lastsyncat"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| FieldType        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"d"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>               |
| Order            | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`8`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                 |
| Type             | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"s"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>               |

### Design

| Property | Value                                                                                                                                             |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Height   | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`100`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>   |
| Visible  | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| Width    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`100`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>   |
| X        | \`0\`                                                                                                                                             |
| Y        | \`0\`                                                                                                                                             |
| ZIndex   | \`8\`                                                                                                                                             |

### Color Properties

### Child & Parent Controls

| Property       | Value             |
| -------------- | ----------------- |
| Parent Control | ComboboxCanvas3SC |

## Last Sync Status4SC

| Property                                                                                                                             | Value                                                            |
| ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| ![PowerApps\_CoreControls\_ComboboxCanvasTemplate\_dataField](resources/PowerApps_CoreControls_ComboboxCanvasTemplate_dataField.png) | Type: PowerApps\_CoreControls\_ComboboxCanvasTemplate\_dataField |

### Data

| Property         | Value                                                                                                                                                             |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ContentLanguage  | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                    |
| FieldDisplayName | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"Last Sync Status"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>    |
| FieldName        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"dvlp_lastsyncstatus"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| FieldType        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"l"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                   |
| Order            | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`9`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                     |
| Type             | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"s"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                   |

### Design

| Property | Value                                                                                                                                             |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Height   | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`100`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>   |
| Visible  | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| Width    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`100`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>   |
| X        | \`0\`                                                                                                                                             |
| Y        | \`0\`                                                                                                                                             |
| ZIndex   | \`9\`                                                                                                                                             |

### Color Properties

### Child & Parent Controls

| Property       | Value             |
| -------------- | ----------------- |
| Parent Control | ComboboxCanvas3SC |

## NIP4SC

| Property                                                                                                                             | Value                                                            |
| ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| ![PowerApps\_CoreControls\_ComboboxCanvasTemplate\_dataField](resources/PowerApps_CoreControls_ComboboxCanvasTemplate_dataField.png) | Type: PowerApps\_CoreControls\_ComboboxCanvasTemplate\_dataField |

### Data

| Property         | Value                                                                                                                                                  |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| ContentLanguage  | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>         |
| FieldDisplayName | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"NIP"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>      |
| FieldName        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"dvlp_nip"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| FieldType        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"s"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>        |
| Order            | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`2`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>          |
| Type             | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"s"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>        |

### Design

| Property | Value                                                                                                                                             |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Height   | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`100`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>   |
| Visible  | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| Width    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`100`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>   |
| X        | \`0\`                                                                                                                                             |
| Y        | \`0\`                                                                                                                                             |
| ZIndex   | \`1\`                                                                                                                                             |

### Color Properties

### Child & Parent Controls

| Property       | Value             |
| -------------- | ----------------- |
| Parent Control | ComboboxCanvas3SC |

## shpDividerSC

| Property                              | Value           |
| ------------------------------------- | --------------- |
| ![rectangle](resources/rectangle.png) | Type: rectangle |

### Behavior

| Property | Value                                                                                                                                             |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| OnSelect | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |

### Data

| Property        | Value                                                                                                                                          |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| AccessibleLabel | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| ContentLanguage | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| Tooltip         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |

### Design

| Property               | Value                                                                                                                                                        |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| BorderStyle            | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`BorderStyle.None`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| BorderThickness        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`2`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                |
| DisplayMode            | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`DisplayMode.Edit`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| FocusedBorderThickness | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`2`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                |
| Height                 | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`1`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                |
| maximumHeight          | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`768`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>              |
| maximumWidth           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`1366`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>             |
| minimumHeight          | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`1`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                |
| minimumWidth           | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`1`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                |
| PreserveAspectRatio    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>            |
| TabIndex               | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`-1`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>               |
| Visible                | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>             |
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

| Property       | Value     |
| -------------- | --------- |
| Parent Control | conMainSC |

## Spinner1

| Property                                                                          | Value                                  |
| --------------------------------------------------------------------------------- | -------------------------------------- |
| ![PowerApps\_CoreControls\_Spinner](resources/PowerApps_CoreControls_Spinner.png) | Type: PowerApps\_CoreControls\_Spinner |

### Data

| Property         | Value                                                                                                                                                                    |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Appearance       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`'Spinner.Appearance'.Primary`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| BasePaletteColor | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`_colors.accent.value`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>         |
| FontColor        | \`\`                                                                                                                                                                     |
| SpinnerColor     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`_colors.accent.value`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>         |
| SpinnerSize      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`'Spinner.SpinnerSize'.Huge`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>   |
| TrackColor       | \`\`                                                                                                                                                                     |

### Design

| Property    | Value                                                                                                                                                        |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| DisplayMode | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`DisplayMode.Edit`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| Height      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`App.Height`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>       |
| Visible     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`_spinnerVisible`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>  |
| Width       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`App.Width`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>        |
| X           | \`0\`                                                                                                                                                        |
| Y           | \`0\`                                                                                                                                                        |
| ZIndex      | \`3\`                                                                                                                                                        |

### Color Properties

### Child & Parent Controls

| Property       | Value           |
| -------------- | --------------- |
| Parent Control | Synchronization |

## TextCanvas1\_6

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
| Text              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"Found invoices"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>         |
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

| Property       | Value               |
| -------------- | ------------------- |
| Parent Control | conRecentActivitySC |

## TextCanvas1\_7

| Property                                                                                | Value                                     |
| --------------------------------------------------------------------------------------- | ----------------------------------------- |
| ![PowerApps\_CoreControls\_TextCanvas](resources/PowerApps_CoreControls_TextCanvas.png) | Type: PowerApps\_CoreControls\_TextCanvas |

### Data

| Property          | Value                                                                                                                                                                                 |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Align             | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"Start"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                   |
| AutoHeight        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                     |
| BorderStyle       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                        |
| ContentLanguage   | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                        |
| Font              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                        |
| FontColor         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`_colors.textGrey.value`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                    |
| FontItalic        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                     |
| FontStrikethrough | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                     |
| FontUnderline     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                     |
| Size              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`_fontSizes.title.value`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                    |
| Text              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"All invoices have already been imported"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| VerticalAlign     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`VerticalAlign.Middle`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                      |
| Weight            | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`'TextCanvas.Weight'.Medium`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                |
| Wrap              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                      |

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

| Property       | Value               |
| -------------- | ------------------- |
| Parent Control | conRecentActivitySC |

## TextCanvas2

| Property                                                                                | Value                                     |
| --------------------------------------------------------------------------------------- | ----------------------------------------- |
| ![PowerApps\_CoreControls\_TextCanvas](resources/PowerApps_CoreControls_TextCanvas.png) | Type: PowerApps\_CoreControls\_TextCanvas |

### Data

| Property      | Value                                                                                                                                                                |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AutoHeight    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                     |
| FontColor     | \`\`                                                                                                                                                                 |
| PaddingLeft   | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`12`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| Text          | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"KSeF connection status"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| VerticalAlign | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`VerticalAlign.Top`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>        |
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

| Property       | Value      |
| -------------- | ---------- |
| Parent Control | Container2 |

## TextCanvas2\_1

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
| PaddingLeft       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`12`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| Size              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`14`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| Text              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"KSeF Session"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>           |
| VerticalAlign     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`VerticalAlign.Top`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>        |
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
| ZIndex      | \`2\`                                                                                                                                                        |

### Color Properties

| Property    | Value |
| ----------- | ----- |
| BorderColor | \`\`  |
| Fill        | \`\`  |

### Child & Parent Controls

| Property       | Value         |
| -------------- | ------------- |
| Parent Control | Container2\_4 |

## TextCanvas2\_2

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
| PaddingLeft       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`12`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| Size              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`14`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| Text              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"KSeF connection status"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| VerticalAlign     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`VerticalAlign.Top`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>        |
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
| ZIndex      | \`2\`                                                                                                                                                        |

### Color Properties

| Property    | Value |
| ----------- | ----- |
| BorderColor | \`\`  |
| Fill        | \`\`  |

### Child & Parent Controls

| Property       | Value      |
| -------------- | ---------- |
| Parent Control | Container3 |

## TextCanvas2\_3

| Property                                                                                | Value                                     |
| --------------------------------------------------------------------------------------- | ----------------------------------------- |
| ![PowerApps\_CoreControls\_TextCanvas](resources/PowerApps_CoreControls_TextCanvas.png) | Type: PowerApps\_CoreControls\_TextCanvas |

### Data

| Property          | Value                                                                                                                                                                 |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Align             | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"Start"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                   |
| AutoHeight        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                      |
| BorderStyle       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                        |
| ContentLanguage   | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                        |
| Font              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                        |
| FontColor         | \`\`                                                                                                                                                                  |
| FontItalic        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                     |
| FontStrikethrough | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                     |
| FontUnderline     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                     |
| PaddingLeft       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                         |
| Size              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`_fontSizes.subtitle.value`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| Text              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"Date from"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>               |
| VerticalAlign     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`VerticalAlign.Top`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>         |
| Weight            | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`'TextCanvas.Weight'.Bold`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>  |
| Wrap              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                      |

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

| Property       | Value         |
| -------------- | ------------- |
| Parent Control | Container2\_8 |

## TextCanvas2\_4

| Property                                                                                | Value                                     |
| --------------------------------------------------------------------------------------- | ----------------------------------------- |
| ![PowerApps\_CoreControls\_TextCanvas](resources/PowerApps_CoreControls_TextCanvas.png) | Type: PowerApps\_CoreControls\_TextCanvas |

### Data

| Property          | Value                                                                                                                                                                 |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Align             | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"Start"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                   |
| AutoHeight        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                      |
| BorderStyle       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                        |
| ContentLanguage   | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                        |
| Font              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                        |
| FontColor         | \`\`                                                                                                                                                                  |
| FontItalic        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                     |
| FontStrikethrough | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                     |
| FontUnderline     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                     |
| PaddingLeft       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`4`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                         |
| Size              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`_fontSizes.subtitle.value`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| Text              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"Date to"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                 |
| VerticalAlign     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`VerticalAlign.Top`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>         |
| Weight            | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`'TextCanvas.Weight'.Bold`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>  |
| Wrap              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                      |

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

| Property       | Value         |
| -------------- | ------------- |
| Parent Control | Container2\_9 |

## TextCanvas2\_5

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
| PaddingLeft       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`12`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| Size              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`14`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| Text              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"Sync log"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>               |
| VerticalAlign     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`VerticalAlign.Top`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>        |
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
| ZIndex      | \`2\`                                                                                                                                                        |

### Color Properties

| Property    | Value |
| ----------- | ----- |
| BorderColor | \`\`  |
| Fill        | \`\`  |

### Child & Parent Controls

| Property       | Value         |
| -------------- | ------------- |
| Parent Control | Container3\_1 |

## TextCanvas3SC

| Property                                                                                | Value                                     |
| --------------------------------------------------------------------------------------- | ----------------------------------------- |
| ![PowerApps\_CoreControls\_TextCanvas](resources/PowerApps_CoreControls_TextCanvas.png) | Type: PowerApps\_CoreControls\_TextCanvas |

### Data

| Property          | Value                                                                                                                                                                |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Align             | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`'TextCanvas.Align'.Start`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| AutoHeight        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                     |
| BorderStyle       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| ContentLanguage   | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| Font              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| FontColor         | \`\`                                                                                                                                                                 |
| FontItalic        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                    |
| FontStrikethrough | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                    |
| FontUnderline     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                    |
| Size              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`14`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| Text              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`ThisItem.invoiceNumber`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>   |
| VerticalAlign     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`VerticalAlign.Top`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>        |
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

| Property       | Value         |
| -------------- | ------------- |
| Parent Control | Container14SC |

## TextCanvas4SC

| Property                                                                                | Value                                     |
| --------------------------------------------------------------------------------------- | ----------------------------------------- |
| ![PowerApps\_CoreControls\_TextCanvas](resources/PowerApps_CoreControls_TextCanvas.png) | Type: PowerApps\_CoreControls\_TextCanvas |

### Data

| Property          | Value                                                                                                                                                                 |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Align             | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"Start"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                   |
| AutoHeight        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                      |
| BorderStyle       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                        |
| ContentLanguage   | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                        |
| Font              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                        |
| FontColor         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`_colors.textGrey.value`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>    |
| FontItalic        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                     |
| FontStrikethrough | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                     |
| FontUnderline     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                     |
| Size              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`_fontSizes.subtitle.value`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| Text              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`ThisItem.supplierName`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>     |
| VerticalAlign     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`VerticalAlign.Top`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>         |
| Weight            | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"Regular"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                 |
| Wrap              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                     |

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

| Property       | Value         |
| -------------- | ------------- |
| Parent Control | Container14SC |

## TextCanvas5SC

| Property                                                                                | Value                                     |
| --------------------------------------------------------------------------------------- | ----------------------------------------- |
| ![PowerApps\_CoreControls\_TextCanvas](resources/PowerApps_CoreControls_TextCanvas.png) | Type: PowerApps\_CoreControls\_TextCanvas |

### Data

| Property          | Value                                                                                                                                                                     |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Align             | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`'TextCanvas.Align'.End`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>        |
| AutoHeight        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| BorderStyle       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                            |
| ContentLanguage   | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                            |
| Font              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                            |
| FontColor         | \`\`                                                                                                                                                                      |
| FontItalic        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                         |
| FontStrikethrough | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                         |
| FontUnderline     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                         |
| Size              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`14`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                            |
| Text              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"PLN " & ThisItem.grossAmount`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| VerticalAlign     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`VerticalAlign.Top`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>             |
| Weight            | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`'TextCanvas.Weight'.Bold`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>      |
| Wrap              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |

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

| Property       | Value         |
| -------------- | ------------- |
| Parent Control | Container15SC |

## TextCanvas6SC

| Property                                                                                | Value                                     |
| --------------------------------------------------------------------------------------- | ----------------------------------------- |
| ![PowerApps\_CoreControls\_TextCanvas](resources/PowerApps_CoreControls_TextCanvas.png) | Type: PowerApps\_CoreControls\_TextCanvas |

### Data

| Property          | Value                                                                                                                                                                                               |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Align             | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`'TextCanvas.Align'.End`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                  |
| AutoHeight        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                    |
| BorderStyle       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                      |
| ContentLanguage   | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                      |
| Font              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                      |
| FontColor         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`_colors.textGrey.value`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                  |
| FontItalic        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                   |
| FontStrikethrough | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                   |
| FontUnderline     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                   |
| Size              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`_fontSizes.subtitle.value`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                               |
| Text              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`Text(DateTimeValue(ThisItem.invoiceDate), "mm/mm/yyyy")`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| VerticalAlign     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`VerticalAlign.Top`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                       |
| Weight            | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"Regular"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                               |
| Wrap              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                    |

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

| Property       | Value         |
| -------------- | ------------- |
| Parent Control | Container15SC |

## TextCanvas7

| Property                                                                                | Value                                     |
| --------------------------------------------------------------------------------------- | ----------------------------------------- |
| ![PowerApps\_CoreControls\_TextCanvas](resources/PowerApps_CoreControls_TextCanvas.png) | Type: PowerApps\_CoreControls\_TextCanvas |

### Data

| Property      | Value                                                                                                                                                              |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| AutoHeight    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                   |
| FontColor     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`_colors.textGrey.value`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| Text          | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"Connected:"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>           |
| VerticalAlign | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`VerticalAlign.Top`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>      |

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

| Property       | Value         |
| -------------- | ------------- |
| Parent Control | Container2\_1 |

## TextCanvas7\_1

| Property                                                                                | Value                                     |
| --------------------------------------------------------------------------------------- | ----------------------------------------- |
| ![PowerApps\_CoreControls\_TextCanvas](resources/PowerApps_CoreControls_TextCanvas.png) | Type: PowerApps\_CoreControls\_TextCanvas |

### Data

| Property          | Value                                                                                                                                                              |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Align             | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"Start"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                |
| AutoHeight        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                   |
| BorderStyle       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                     |
| ContentLanguage   | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                     |
| Font              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                     |
| FontColor         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`_colors.textGrey.value`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| FontItalic        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                  |
| FontStrikethrough | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                  |
| FontUnderline     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                  |
| Size              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`14`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                     |
| Text              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"Environment:"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>         |
| VerticalAlign     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`VerticalAlign.Top`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>      |
| Weight            | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"Regular"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>              |
| Wrap              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                   |

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

| Property       | Value         |
| -------------- | ------------- |
| Parent Control | Container2\_2 |

## TextCanvas7\_10

| Property                                                                                | Value                                     |
| --------------------------------------------------------------------------------------- | ----------------------------------------- |
| ![PowerApps\_CoreControls\_TextCanvas](resources/PowerApps_CoreControls_TextCanvas.png) | Type: PowerApps\_CoreControls\_TextCanvas |

### Data

| Property          | Value                                                                                                                                                                                                     |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Align             | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"Start"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                       |
| AutoHeight        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                          |
| BorderStyle       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                            |
| ContentLanguage   | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                            |
| Font              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                            |
| FontColor         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`_colors.textGrey.value`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                        |
| FontItalic        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                         |
| FontStrikethrough | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                         |
| FontUnderline     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                         |
| Size              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`_fontSizes.subtitle.value`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                     |
| Text              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"Select date range and fetch new purchase invoices from KSeF"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| VerticalAlign     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`VerticalAlign.Top`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                             |
| Weight            | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"Regular"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                     |
| Wrap              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                          |

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

| Property       | Value              |
| -------------- | ------------------ |
| Parent Control | conFetchInvoicesSC |

## TextCanvas7\_11

| Property                                                                                | Value                                     |
| --------------------------------------------------------------------------------------- | ----------------------------------------- |
| ![PowerApps\_CoreControls\_TextCanvas](resources/PowerApps_CoreControls_TextCanvas.png) | Type: PowerApps\_CoreControls\_TextCanvas |

### Data

| Property          | Value                                                                                                                                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Align             | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`'TextCanvas.Align'.Start`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                        |
| AutoHeight        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                            |
| BorderRadius      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`14`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                              |
| BorderStyle       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                              |
| ContentLanguage   | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                              |
| Font              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`Font.'Courier New'`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                              |
| FontColor         | \`\`                                                                                                                                                                                        |
| FontItalic        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                           |
| FontStrikethrough | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                           |
| FontUnderline     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                           |
| PaddingBottom     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`8`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                               |
| PaddingLeft       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`12`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                              |
| PaddingRight      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`12`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                              |
| PaddingTop        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`8`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                               |
| Size              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`14`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                              |
| Text              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`JSON(First(_startedSyncPreviewLogs.logs).Value)`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| VerticalAlign     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`VerticalAlign.Top`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                               |
| Weight            | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`'TextCanvas.Weight'.Regular`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                     |
| Wrap              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                            |

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
| ZIndex      | \`25\`                                                                                                                                                       |

### Color Properties

| Property    | Value                   |
| ----------- | ----------------------- |
| BorderColor | \`\`                    |
| Fill        | \`\_colors.grey.value\` |

### Child & Parent Controls

| Property       | Value      |
| -------------- | ---------- |
| Parent Control | Container7 |

## TextCanvas7\_2

| Property                                                                                | Value                                     |
| --------------------------------------------------------------------------------------- | ----------------------------------------- |
| ![PowerApps\_CoreControls\_TextCanvas](resources/PowerApps_CoreControls_TextCanvas.png) | Type: PowerApps\_CoreControls\_TextCanvas |

### Data

| Property          | Value                                                                                                                                                                |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Align             | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`'TextCanvas.Align'.End`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>   |
| AutoHeight        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                     |
| BorderStyle       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| ContentLanguage   | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| Font              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| FontColor         | \`\`                                                                                                                                                                 |
| FontItalic        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                    |
| FontStrikethrough | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                    |
| FontUnderline     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                    |
| Size              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`14`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| Text              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`_ksefStatus.environment`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>  |
| VerticalAlign     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`VerticalAlign.Top`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>        |
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
| ZIndex      | \`2\`                                                                                                                                                        |

### Color Properties

| Property    | Value |
| ----------- | ----- |
| BorderColor | \`\`  |
| Fill        | \`\`  |

### Child & Parent Controls

| Property       | Value         |
| -------------- | ------------- |
| Parent Control | Container2\_2 |

## TextCanvas7\_3

| Property                                                                                | Value                                     |
| --------------------------------------------------------------------------------------- | ----------------------------------------- |
| ![PowerApps\_CoreControls\_TextCanvas](resources/PowerApps_CoreControls_TextCanvas.png) | Type: PowerApps\_CoreControls\_TextCanvas |

### Data

| Property          | Value                                                                                                                                                              |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Align             | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"Start"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                |
| AutoHeight        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                   |
| BorderStyle       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                     |
| ContentLanguage   | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                     |
| Font              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                     |
| FontColor         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`_colors.textGrey.value`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| FontItalic        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                  |
| FontStrikethrough | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                  |
| FontUnderline     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                  |
| Size              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`14`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                     |
| Text              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"Tax ID:"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>              |
| VerticalAlign     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`VerticalAlign.Top`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>      |
| Weight            | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"Regular"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>              |
| Wrap              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                   |

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

| Property       | Value         |
| -------------- | ------------- |
| Parent Control | Container2\_3 |

## TextCanvas7\_4

| Property                                                                                | Value                                     |
| --------------------------------------------------------------------------------------- | ----------------------------------------- |
| ![PowerApps\_CoreControls\_TextCanvas](resources/PowerApps_CoreControls_TextCanvas.png) | Type: PowerApps\_CoreControls\_TextCanvas |

### Data

| Property          | Value                                                                                                                                                                   |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Align             | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`'TextCanvas.Align'.End`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>      |
| AutoHeight        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                        |
| BorderStyle       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| ContentLanguage   | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| Font              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`Font.'Courier New'`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>          |
| FontColor         | \`\`                                                                                                                                                                    |
| FontItalic        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| FontStrikethrough | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| FontUnderline     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| Size              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`14`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                          |
| Text              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`_ksefStatus.nip`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>             |
| VerticalAlign     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`VerticalAlign.Top`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>           |
| Weight            | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`'TextCanvas.Weight'.Regular`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| Wrap              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                        |

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

| Property       | Value         |
| -------------- | ------------- |
| Parent Control | Container2\_3 |

## TextCanvas7\_5

| Property                                                                                | Value                                     |
| --------------------------------------------------------------------------------------- | ----------------------------------------- |
| ![PowerApps\_CoreControls\_TextCanvas](resources/PowerApps_CoreControls_TextCanvas.png) | Type: PowerApps\_CoreControls\_TextCanvas |

### Data

| Property          | Value                                                                                                                                                                                                                                              |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Align             | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"Start"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                                                                |
| AutoHeight        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                                                                   |
| BorderStyle       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                                                                     |
| ContentLanguage   | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                                                                     |
| Font              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                                                                     |
| FontColor         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`_colors.textGrey.value`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                                                 |
| FontItalic        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                                                                  |
| FontStrikethrough | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                                                                  |
| FontUnderline     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                                                                  |
| Size              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`14`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                                                                     |
| Text              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`If( !IsBlank(_startedKsefSession), "Status:", "No active session. Start a session to sync invoices." )`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| VerticalAlign     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`VerticalAlign.Top`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                                                      |
| Weight            | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"Regular"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                                                              |
| Wrap              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                                                                   |

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

| Property       | Value         |
| -------------- | ------------- |
| Parent Control | Container2\_5 |

## TextCanvas7\_6

| Property                                                                                | Value                                     |
| --------------------------------------------------------------------------------------- | ----------------------------------------- |
| ![PowerApps\_CoreControls\_TextCanvas](resources/PowerApps_CoreControls_TextCanvas.png) | Type: PowerApps\_CoreControls\_TextCanvas |

### Data

| Property          | Value                                                                                                                                                              |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Align             | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"Start"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                |
| AutoHeight        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                   |
| BorderStyle       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                     |
| ContentLanguage   | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                     |
| Font              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                     |
| FontColor         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`_colors.textGrey.value`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| FontItalic        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                  |
| FontStrikethrough | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                  |
| FontUnderline     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                  |
| Size              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`14`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                     |
| Text              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"Expires:"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>             |
| VerticalAlign     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`VerticalAlign.Top`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>      |
| Weight            | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"Regular"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>              |
| Wrap              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                   |

### Design

| Property    | Value                                                                                                                                                                     |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DisplayMode | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`DisplayMode.Edit`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>              |
| Height      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`32`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                            |
| TabIndex    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                             |
| Tooltip     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                            |
| Visible     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`!IsBlank(_startedKsefSession)`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| Width       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`96`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                            |
| X           | \`0\`                                                                                                                                                                     |
| Y           | \`0\`                                                                                                                                                                     |
| ZIndex      | \`1\`                                                                                                                                                                     |

### Color Properties

| Property    | Value |
| ----------- | ----- |
| BorderColor | \`\`  |
| Fill        | \`\`  |

### Child & Parent Controls

| Property       | Value         |
| -------------- | ------------- |
| Parent Control | Container2\_6 |

## TextCanvas7\_7

| Property                                                                                | Value                                     |
| --------------------------------------------------------------------------------------- | ----------------------------------------- |
| ![PowerApps\_CoreControls\_TextCanvas](resources/PowerApps_CoreControls_TextCanvas.png) | Type: PowerApps\_CoreControls\_TextCanvas |

### Data

| Property          | Value                                                                                                                                                                                                                              |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Align             | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`'TextCanvas.Align'.End`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                                 |
| AutoHeight        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                                                   |
| BorderStyle       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                                                     |
| ContentLanguage   | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                                                     |
| Font              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                                                     |
| FontColor         | \`\`                                                                                                                                                                                                                               |
| FontItalic        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                                                  |
| FontStrikethrough | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                                                  |
| FontUnderline     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                                                  |
| Size              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`14`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                                                     |
| Text              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`Text( DateTimeValue(_startedKsefSession.session.expiresAt), "[$-en-US]h:mm:ss AM/PM" )`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| VerticalAlign     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`VerticalAlign.Top`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                                      |
| Weight            | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`'TextCanvas.Weight'.Bold`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                               |
| Wrap              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                                                                   |

### Design

| Property    | Value                                                                                                                                                                     |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DisplayMode | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`DisplayMode.Edit`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>              |
| Height      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`32`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                            |
| TabIndex    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                             |
| Tooltip     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                            |
| Visible     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`!IsBlank(_startedKsefSession)`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| Width       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`96`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                            |
| X           | \`0\`                                                                                                                                                                     |
| Y           | \`0\`                                                                                                                                                                     |
| ZIndex      | \`2\`                                                                                                                                                                     |

### Color Properties

| Property    | Value |
| ----------- | ----- |
| BorderColor | \`\`  |
| Fill        | \`\`  |

### Child & Parent Controls

| Property       | Value         |
| -------------- | ------------- |
| Parent Control | Container2\_6 |

## TextCanvas7\_8

| Property                                                                                | Value                                     |
| --------------------------------------------------------------------------------------- | ----------------------------------------- |
| ![PowerApps\_CoreControls\_TextCanvas](resources/PowerApps_CoreControls_TextCanvas.png) | Type: PowerApps\_CoreControls\_TextCanvas |

### Data

| Property          | Value                                                                                                                                                              |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Align             | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"Start"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                |
| AutoHeight        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                   |
| BorderStyle       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                     |
| ContentLanguage   | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                     |
| Font              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                     |
| FontColor         | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`_colors.textGrey.value`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| FontItalic        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                  |
| FontStrikethrough | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                  |
| FontUnderline     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                  |
| Size              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`14`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                     |
| Text              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"Processed: "`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>          |
| VerticalAlign     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`VerticalAlign.Top`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>      |
| Weight            | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`"Regular"`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>              |
| Wrap              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                   |

### Design

| Property    | Value                                                                                                                                                                     |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DisplayMode | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`DisplayMode.Edit`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>              |
| Height      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`32`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                            |
| TabIndex    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                             |
| Tooltip     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                            |
| Visible     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`!IsBlank(_startedKsefSession)`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| Width       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`96`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                            |
| X           | \`0\`                                                                                                                                                                     |
| Y           | \`0\`                                                                                                                                                                     |
| ZIndex      | \`1\`                                                                                                                                                                     |

### Color Properties

| Property    | Value |
| ----------- | ----- |
| BorderColor | \`\`  |
| Fill        | \`\`  |

### Child & Parent Controls

| Property       | Value         |
| -------------- | ------------- |
| Parent Control | Container2\_7 |

## TextCanvas7\_9

| Property                                                                                | Value                                     |
| --------------------------------------------------------------------------------------- | ----------------------------------------- |
| ![PowerApps\_CoreControls\_TextCanvas](resources/PowerApps_CoreControls_TextCanvas.png) | Type: PowerApps\_CoreControls\_TextCanvas |

### Data

| Property          | Value                                                                                                                                                                                    |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Align             | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`'TextCanvas.Align'.End`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                       |
| AutoHeight        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                         |
| BorderStyle       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                           |
| ContentLanguage   | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                           |
| Font              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`Font.'Courier New'`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                           |
| FontColor         | \`\`                                                                                                                                                                                     |
| FontItalic        | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                        |
| FontStrikethrough | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                        |
| FontUnderline     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`false`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                        |
| Size              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`14`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                           |
| Text              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`_activeKsefSession.session.invoicesProcessed`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| VerticalAlign     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`VerticalAlign.Top`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                            |
| Weight            | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`'TextCanvas.Weight'.Regular`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                  |
| Wrap              | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`true`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                                         |

### Design

| Property    | Value                                                                                                                                                                     |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DisplayMode | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`DisplayMode.Edit`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>              |
| Height      | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`32`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                            |
| TabIndex    | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`0`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                             |
| Tooltip     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`""`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                            |
| Visible     | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`!IsBlank(_startedKsefSession)`<td style="background-color:#ffcccc; width:50%;"></td></tr></table> |
| Width       | <table border="0"><tr><td style="background-color:#ccffcc; width:50%;">`96`<td style="background-color:#ffcccc; width:50%;"></td></tr></table>                            |
| X           | \`0\`                                                                                                                                                                     |
| Y           | \`0\`                                                                                                                                                                     |
| ZIndex      | \`2\`                                                                                                                                                                     |

### Color Properties

| Property    | Value |
| ----------- | ----- |
| BorderColor | \`\`  |
| Fill        | \`\`  |

### Child & Parent Controls

| Property       | Value         |
| -------------- | ------------- |
| Parent Control | Container2\_7 |
