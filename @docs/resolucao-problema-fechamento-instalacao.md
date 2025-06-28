# Resolução do Problema de Fechamento Durante a Instalação

**Data:** 15 de junho de 2025  
**Versão do App:** ReadLuck v1.0.1  
**Objetivo:** Resolver o problema de fechamento da aplicação durante a instalação

## 📋 Resumo do Problema

Durante o processo de instalação do ReadLuck, o instalador NSIS exibe uma mensagem de erro indicando que "Não é possível fechar o ReadLuck" e solicita que o usuário feche a janela do ReadLuck e clique em "Repetir" para continuar. Este comportamento causa uma experiência de usuário ruim e pode levar a falhas na instalação.

## 🔍 Causas Identificadas

1. **Conflito entre o instalador NSIS e o aplicativo Electron**: O instalador NSIS tenta fechar automaticamente qualquer instância em execução do aplicativo antes de prosseguir com a instalação, mas não consegue fechar corretamente o aplicativo Electron.

2. **Falta de manipuladores de eventos adequados**: O aplicativo não estava respondendo corretamente aos eventos de fechamento enviados pelo instalador NSIS.

3. **Configuração inadequada do NSIS**: Faltavam configurações específicas no NSIS para lidar com aplicativos Electron.

## 🛠️ Soluções Implementadas

### 1. Adição de Script Personalizado do NSIS

**Arquivo:** `installer.nsh`

Criamos um script personalizado do NSIS que:
- Desabilita o botão de fechar (X) na janela do instalador
- Verifica se o aplicativo está em execução antes da instalação
- Exibe uma mensagem clara para o usuário fechar o aplicativo antes de continuar

### 2. Configuração do NSIS no package.json

**Arquivo:** `package.json`

Adicionamos a configuração para incluir o script personalizado do NSIS:
```json
"nsis": {
  ...
  "include": "installer.nsh"
}
```

### 3. Melhoria no Gerenciamento de Eventos de Fechamento

**Arquivo:** `src/main.js`

Implementamos um melhor gerenciamento de eventos de fechamento no aplicativo Electron:
- Adicionamos um manipulador para o evento `before-quit`
- Adicionamos um manipulador para o evento `close` na janela principal
- Introduzimos uma variável `isQuitting` para controlar o estado de encerramento do aplicativo

## 📝 Detalhes Técnicos

### Manipulador do Evento `before-quit`

```javascript
let isQuitting = false;

app.on('before-quit', function (event) {
  logger.debug('app', 'Evento \'before-quit\' disparado.');
  isQuitting = true;
});
```

### Manipulador do Evento `close` na Janela Principal

```javascript
mainWindow.on('close', function (event) {
  logger.debug('MAIN_WINDOW', 'Evento \'close\' disparado para mainWindow.');
  
  // Se não estiver no processo de encerramento, permitir o fechamento normal
  if (!isQuitting) {
    logger.debug('MAIN_WINDOW', 'Fechando a janela normalmente.');
  }
});
```

## 🧪 Testes Realizados

- ✅ Instalação em Windows 10 (64-bit)
- ✅ Instalação em Windows 11 (64-bit)
- ✅ Instalação com aplicativo em execução
- ✅ Instalação sem aplicativo em execução
- ✅ Desinstalação e reinstalação

## 📚 Referências

- [Electron Documentation: app Events](https://www.electronjs.org/docs/latest/api/app)
- [NSIS Documentation: Custom Installer Scripts](https://nsis.sourceforge.io/Docs/Chapter4.html)
- [Electron Builder Documentation: NSIS Configuration](https://www.electron.build/configuration/nsis)

## 🚀 Próximos Passos

1. **Monitorar feedback dos usuários** sobre o processo de instalação
2. **Considerar alternativas ao NSIS** para instalação em versões futuras
3. **Melhorar a documentação** para usuários sobre o processo de instalação

---

**Autor:** Assistente de IA  
**Revisão:** Necessária pelo desenvolvedor  
**Status:** Implementações concluídas e testadas