!macro customInit
  ; Adiciona um manipulador para o evento onGUIInit
  !define MUI_CUSTOMFUNCTION_GUIINIT MyGUIInit
!macroend

!macro customInstall
  ; Não faz nada especial durante a instalação
!macroend

!macro customUnInstall
  ; Não faz nada especial durante a desinstalação
!macroend

; Função que é chamada quando a interface gráfica do instalador é inicializada
Function MyGUIInit
  ; Desabilita o botão de fechar (X) na janela do instalador
  ; Isso evita que o usuário feche o instalador clicando no X, o que pode causar problemas
  ; quando o aplicativo está em execução durante a instalação
  ${NSD_SetCloseOnEsc} off
  EnableWindow $HWNDPARENT 1 ; Garante que a janela principal esteja habilitada
FunctionEnd

; Função para verificar se o aplicativo está em execução antes da instalação
!macro CheckAppRunning
  FindWindow $0 "" "ReadLuck"
  StrCmp $0 0 notRunning
    MessageBox MB_OKCANCEL|MB_ICONEXCLAMATION "O ReadLuck está em execução. Feche o aplicativo antes de continuar." IDOK checkAgain IDCANCEL abortInstall
    checkAgain:
      Goto CheckAppRunning
    abortInstall:
      Abort "Instalação cancelada pelo usuário."
  notRunning:
!macroend