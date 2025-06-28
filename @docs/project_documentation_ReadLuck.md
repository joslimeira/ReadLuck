# Documentação do Projeto: ReadLuck Desktop Electron

## 1. Visão Geral do Projeto

**Nome do Projeto:** `ReadLuck`
**Versão:** `1.0`
**Descrição:** O ReadLuck Desktop é um aplicativo de desktop multiplataforma desenvolvido para fornecer uma interface rica e interativa para acessar e gerenciar diversos módulos do sistema ReadLuck. Ele é construído utilizando tecnologias web modernas e empacotado como uma aplicação desktop nativa através do Electron.js.

## 2. Tecnologias Utilizadas

*   **Framework Principal:** Electron.js (`^36.2.0`)
*   **Ambiente de Execução:** Node.js (recomendado versão 14 ou superior)
*   **Gerenciador de Pacotes:** npm
*   **Linguagens:**
    *   JavaScript (para a lógica principal do Electron e processos de renderização)
    *   HTML (para a estrutura da interface do usuário)
    *   CSS (para a estilização da interface do usuário)

## 3. Estrutura do Projeto

O código-fonte principal da aplicação reside na pasta `src/`:

*   `src/main.js`: Este é o script principal do Electron. Ele gerencia o ciclo de vida da aplicação, cria as janelas do navegador e lida com eventos do sistema.
*   `src/preload.js`: Um script que é executado antes que as páginas web sejam carregadas no processo de renderização. Ele é usado para expor APIs do Node.js e Electron de forma segura para o código do frontend, atuando como uma ponte entre o processo principal e o de renderização.
*   `src/index.html`: O arquivo HTML principal que define a estrutura da interface do usuário da aplicação.
*   `src/renderer.js`: Contém o código JavaScript que é executado no processo de renderização (frontend). É responsável por manipular o DOM, interagir com o usuário e comunicar-se com o processo principal através do `preload.js`.
*   `src/styles.css`: Arquivo CSS contendo os estilos para a interface do usuário da aplicação.

O ponto de entrada principal da aplicação, conforme definido no `package.json`, é `src/main.js`.

## 4. Dependências

A principal dependência de desenvolvimento é:

*   **Electron (`electron: ^36.2.0`):** Framework para construir aplicações desktop multiplataforma com JavaScript, HTML e CSS.

Outras dependências podem ser instaladas conforme a evolução do projeto e estarão listadas no arquivo `package.json`.

## 5. Funcionalidades Principais

Conforme descrito no `README.md` e inferido da estrutura:

*   **Interface de Usuário Moderna e Responsiva:** Utiliza tecnologias web para criar a UI.
*   **Suporte para Múltiplos Módulos:** Projetado para interagir com diferentes partes do sistema ReadLuck.
*   **Comunicação Inter-Processos (IPC):** Demonstra o uso da comunicação entre o processo principal do Electron e os processos de renderização.
*   **Multiplataforma:** Sendo uma aplicação Electron, tem o potencial de rodar em Windows, macOS e Linux.

## 6. Configuração e Instalação

**Pré-requisitos:**

*   Node.js (versão 14 ou superior)
*   npm (geralmente instalado com o Node.js)

**Passos para Instalação:**

1.  Clone o repositório do projeto:
    ```bash
    git clone <url-do-repositorio-do-projeto>
    ```
2.  Navegue até o diretório do projeto:
    ```bash
    cd ReadLuck
    ```
3.  Instale as dependências do projeto:
    ```bash
    npm install
    ```

## 7. Como Executar a Aplicação

Para iniciar a aplicação em modo de desenvolvimento, execute o seguinte comando no terminal, a partir da raiz do projeto:

```bash
npm start
```
Este comando utiliza o script `start` definido no `package.json` (`"electron ."`).

## 8. Desenvolvimento e Próximos Passos

### Adicionando Novos Módulos

Conforme o `README.md`:

1.  Adicionar novos elementos visuais (como cards) na seção apropriada do arquivo `src/index.html`.
2.  Implementar a lógica de interação e apresentação para esses novos módulos no arquivo `src/renderer.js`.
3.  Se for necessária comunicação com o sistema operacional ou funcionalidades do Node.js que não devem ser expostas diretamente ao renderer, adicionar novas APIs no script `src/preload.js`.

### Empacotamento para Distribuição

As instruções para empacotar a aplicação para distribuição (gerar instaladores para Windows, macOS, Linux) ainda não foram detalhadas no `README.md`, mas são um passo comum em projetos Electron utilizando ferramentas como `electron-builder` ou `electron-packager`.

## 9. Contribuição

Informações sobre como contribuir para o projeto (ex: padrões de código, processo de pull request) podem ser adicionadas aqui.

## 10. Licença

O projeto está licenciado sob AGPLv3, conforme `README.md`. 