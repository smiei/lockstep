; Inno Setup script for the Windows app. scripts/build-windows.mjs calls it as
;   ISCC /DAppVersion=5.0 /DSourceDir=<dist\windows\Lockstep> /DOutputDir=<dist> lockstep.iss
; Installs per user (no admin) into %LOCALAPPDATA%\Programs\Lockstep. The data
; (%LOCALAPPDATA%\Lockstep) is never touched: not by updates, not by uninstall.
; An update installs over the old version and keeps files it does not ship -
; the downloaded sprites, badges and trainer pictures in app\public stay.

#ifndef AppVersion
  #define AppVersion "0.0"
#endif

[Setup]
AppId={{6E0B7C1A-3F8B-4C5E-9A61-4C0C2B8F7D11}
AppName=Lockstep
AppVersion={#AppVersion}
AppVerName=Lockstep {#AppVersion}
AppPublisher=smiei
AppPublisherURL=https://github.com/smiei/lockstep
AppSupportURL=https://github.com/smiei/lockstep/issues
AppUpdatesURL=https://github.com/smiei/lockstep/releases
DefaultDirName={localappdata}\Programs\Lockstep
DefaultGroupName=Lockstep
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
OutputDir={#OutputDir}
OutputBaseFilename=Lockstep-Setup-{#AppVersion}
SetupIconFile={#SourceDir}\Lockstep.ico
UninstallDisplayIcon={app}\Lockstep.exe
LicenseFile={#SourceDir}\LICENSE.txt
Compression=lzma2/max
SolidCompression=yes
WizardStyle=modern
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
CloseApplications=yes
RestartApplications=no

[Languages]
Name: "en"; MessagesFile: "compiler:Default.isl"
Name: "de"; MessagesFile: "compiler:Languages\German.isl"
Name: "fr"; MessagesFile: "compiler:Languages\French.isl"
Name: "es"; MessagesFile: "compiler:Languages\Spanish.isl"
Name: "it"; MessagesFile: "compiler:Languages\Italian.isl"

[CustomMessages]
en.DataNote=Your runs are kept in %LOCALAPPDATA%\Lockstep and are not removed.
de.DataNote=Deine Runs liegen in %LOCALAPPDATA%\Lockstep und werden nicht entfernt.
fr.DataNote=Tes runs restent dans %LOCALAPPDATA%\Lockstep et ne sont pas supprimés.
es.DataNote=Tus partidas se guardan en %LOCALAPPDATA%\Lockstep y no se eliminan.
it.DataNote=Le tue run restano in %LOCALAPPDATA%\Lockstep e non vengono rimosse.

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
Source: "{#SourceDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\Lockstep"; Filename: "{app}\Lockstep.exe"
Name: "{group}\{cm:UninstallProgram,Lockstep}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\Lockstep"; Filename: "{app}\Lockstep.exe"; Tasks: desktopicon

[Run]
Filename: "{app}\Lockstep.exe"; Description: "{cm:LaunchProgram,Lockstep}"; Flags: nowait postinstall skipifsilent

[UninstallRun]
Filename: "{sys}\taskkill.exe"; Parameters: "/IM Lockstep.exe /F"; Flags: runhidden; RunOnceId: "StopLockstep"

[UninstallDelete]
; What the app downloaded at runtime (never shipped): sprites, badges, trainer pictures.
Type: filesandordirs; Name: "{app}\app"

[Registry]
Root: HKCU; Subkey: "Software\Microsoft\Windows\CurrentVersion\Run"; ValueType: none; ValueName: "Lockstep"; Flags: uninsdeletevalue dontcreatekey

[Code]
procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
begin
  if CurUninstallStep = usPostUninstall then
    MsgBox(ExpandConstant('{cm:DataNote}'), mbInformation, MB_OK);
end;
