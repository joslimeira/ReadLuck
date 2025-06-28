; ReadLuck Installer Script
; Criado automaticamente

!define APPNAME "ReadLuck"
!define COMPANYNAME "ReadLuck Team"
!define DESCRIPTION "Gerenciador de Biblioteca Pessoal"
!define VERSIONMAJOR 1
!define VERSIONMINOR 0
!define VERSIONBUILD 0
!define HELPURL "https://github.com/seu-usuario/readluck"
!define UPDATEURL "https://github.com/seu-usuario/readluck"
!define ABOUTURL "https://github.com/seu-usuario/readluck"
!define INSTALLSIZE 150000

RequestExecutionLevel admin
InstallDir "$PROGRAMFILES\${APPNAME}"

; rtf or txt file - remember if it is txt, it must be in the DOS text format (\r\n)
LicenseData "LICENSE"
; This will be in the installer/uninstaller's title bar
Name "${APPNAME}"
Icon "src\assets\ReadLuck-Icone-Oficial-2025-Final.ico"
outFile "ReadLuck-Setup-${VERSIONMAJOR}.${VERSIONMINOR}.${VERSIONBUILD}.exe"

!include LogicLib.nsh

; Just three pages - license agreement, install location, and installation
page license
page directory
page instfiles

!macro VerifyUserIsAdmin
UserInfo::GetAccountType
pop $0
${If} $0 != "admin" ;Require admin rights on NT4+
        messageBox mb_iconstop "Administrator rights required!"
        setErrorLevel 740 ;ERROR_ELEVATION_REQUIRED
        quit
${EndIf}
!macroend

function .onInit
	setShellVarContext all
	!insertmacro VerifyUserIsAdmin
functionEnd

section "install"
	; Files for the install directory - to build the installer, these should be in the same directory as the install script (this file)
	setOutPath $INSTDIR
	; Files added here should be removed by the uninstaller (see section "uninstall")
	file /r /x ".trae" /x "@docs" "dist\ReadLuck-win32-x64\*"
	; Add any other files for the install directory (license files, app data, etc) here

	; Uninstaller - See function un.onInit and section "uninstall" for configuration
	writeUninstaller "$INSTDIR\uninstall.exe"

	; Start Menu
	createDirectory "$SMPROGRAMS\${APPNAME}"
	createShortCut "$SMPROGRAMS\${APPNAME}\${APPNAME}.lnk" "$INSTDIR\ReadLuck.exe" "" "$INSTDIR\src\assets\ReadLuck-Icone-Oficial-2025-Final.ico"
	createShortCut "$SMPROGRAMS\${APPNAME}\Uninstall.lnk" "$INSTDIR\uninstall.exe" "" "$INSTDIR\uninstall.exe"

	; Desktop
	createShortCut "$DESKTOP\${APPNAME}.lnk" "$INSTDIR\ReadLuck.exe" "" "$INSTDIR\src\assets\ReadLuck-Icone-Oficial-2025-Final.ico"

	; Registry information for add/remove programs
	WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "DisplayName" "${APPNAME} - ${DESCRIPTION}"
	WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "UninstallString" "$\"$INSTDIR\uninstall.exe$\""
	WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "QuietUninstallString" "$\"$INSTDIR\uninstall.exe$\" /S"
	WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "InstallLocation" "$\"$INSTDIR$\""
	WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "DisplayIcon" "$\"$INSTDIR\ReadLuck.exe$\""
	WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "Publisher" "${COMPANYNAME}"
	WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "HelpLink" "${HELPURL}"
	WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "URLUpdateInfo" "${UPDATEURL}"
	WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "URLInfoAbout" "${ABOUTURL}"
	WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "DisplayVersion" "${VERSIONMAJOR}.${VERSIONMINOR}.${VERSIONBUILD}"
	WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "VersionMajor" ${VERSIONMAJOR}
	WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "VersionMinor" ${VERSIONMINOR}
	; There is no option for modifying or repairing the install
	WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "NoModify" 1
	WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "NoRepair" 1
	; Set the INSTALLSIZE constant (!defined at the top of this script) so Add/Remove Programs can accurately report the size
	WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "EstimatedSize" ${INSTALLSIZE}
sectionEnd

; Uninstaller
function un.onInit
	SetShellVarContext all

	;Verify the uninstaller - last chance to back out
	MessageBox MB_OKCANCEL "Permanantly remove ${APPNAME}?" IDOK next
		Abort
	next:
	!insertmacro VerifyUserIsAdmin
functionEnd

section "uninstall"

	; Remove Start Menu launcher
	delete "$SMPROGRAMS\${APPNAME}\${APPNAME}.lnk"
	delete "$SMPROGRAMS\${APPNAME}\Uninstall.lnk"
	; Try to remove the Start Menu folder - this will only happen if it is empty
	rmDir "$SMPROGRAMS\${APPNAME}"

	; Remove Desktop shortcut
	delete "$DESKTOP\${APPNAME}.lnk"

	; Remove files
	rmDir /r "$INSTDIR"

	; Remove uninstaller information from the registry
	DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}"
sectionEnd