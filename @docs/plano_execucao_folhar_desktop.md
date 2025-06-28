# Plano de Execução: ReadLuck

Este documento detalha o plano de execução para o desenvolvimento do ReadLuck, do MVP à versão de lançamento, com tarefas ordenadas para evitar conflitos entre Frontend e Backend (mesmo que o MVP não tenha backend real). Utilize as caixas de seleção para marcar tarefas concluídas. Atualize este documento conforme o progresso e mantenha-o como referência central para as LLMs e para o time.

---

## 1. Estrutura Inicial e Ambiente
- [x] **Configurar ambiente de desenvolvimento** <!--done:ambiente-->
    - [x] Instalar Node.js e npm <!--done:node-npm-->
    - [x] Instalar Electron.js como dependência <!--done:electron-dep-->
    - [x] Inicializar repositório Git <!--done:git-init-->
    - [x] Configurar .gitignore e .env.example <!--done:gitignore-env-->
    - [x] Estruturar pastas iniciais (`src/`, `@docs/`, `assets/`, `scripts/`) <!--done:estrut-pastas-->
- [x] **Criar estrutura base do Electron** <!--done:base-electron-->
    - [x] Implementar `src/main.js` (janela principal, ciclo de vida) <!--done:mainjs-->
    - [x] Implementar `src/preload.js` (exposição segura de APIs) <!--done:preloadjs-->
    - [x] Implementar `src/renderer.js` (lógica frontend inicial) <!--done:rendererjs-->
    - [x] Criar `src/index.html` (estrutura HTML base) <!--done:indexhtml-->
    - [x] Criar `src/styles.css` (estilos iniciais) <!--done:stylescss-->
    - [x] Configurar scripts de inicialização no `package.json` <!--done:pkg-scripts-->
    - [x] Instalação da versão 8.1.0 do electron-store, que ainda suporta CommonJS <!--done:versão-electron-store-8.1.0-->
    - [x] Corrigir instalação e configuração de dependências (ex: xlsx) <!--done:fix-dep-install-xlsx-->
- [ ] **Documentar padrões e boas práticas** <!--done:boas-praticas-->
    - [x] Revisar e alinhar com `@docs/boas-praticas.md` <!--done:revisar-boas-praticas-->
    - [ ] Adicionar comentários iniciais no código <!--done:comentarios-iniciais-->

## 2. Dashboard e Estrutura Modular
- [ ] **Implementar dashboard de módulos** <!--done:dashboard-->
    - [x] Criar layout de cards no `index.html` <!--done:cards-html-->
    - [x] Definir pelo menos 3 módulos fictícios (ex: Folha de Pagamento, Gestão de Pessoas, Relatórios) <!--done:modulos-ficticios-->
    - [x] Adicionar ícones e títulos para cada card <!--done:icones-titulos-cards-->
    - [x] Implementar navegação entre cards e módulos <!--done:navegacao-cards-->
    - [x] Garantir responsividade do dashboard <!--done:dashboard-responsivo-->
- [ ] **Criar estrutura de módulos independentes** <!--done:modulos-independentes-->
    - [ ] Criar arquivos/funções/componentes separados para cada módulo <!--done:arq-modulos-->
    - [ ] Implementar mocks de dados locais para cada módulo <!--done:mock-modulos-->
    - [ ] Garantir que módulos possam ser adicionados/removidos sem impacto no core <!--done:modularidade-->

## 3. Comunicação Segura e Infraestrutura
- [x] **Implementar comunicação segura (contextBridge, IPC)** <!--done:ipc-seguro-->
    - [x] Definir canais IPC seguros no preload/main <!--done:ipc-canais-->
    - [x] Expor apenas métodos necessários ao renderer <!--done:ipc-metodos-->
    - [x] Configurar `contextIsolation: true` e ajustar `preload.js` para expor APIs de forma segura <!--done:context-isolation-true-->
    - [x] Mover lógica de parsing de arquivos (RTF, ODS) do renderer para o main process via IPC <!--done:ipc-file-parsing-->
    - [x] Corrigir Content Security Policy (CSP) no `index.html` para `contextIsolation: true` <!--done:fix-csp-->
    - [x] Documentar exemplos de uso de IPC no código <!--done:doc-ipc-->
    - [x] Testar bloqueio de acesso indevido a APIs <!--done:teste-ipc-seguro-->
- [x] **Exibir versões do ambiente (Node, Electron, Chrome)** <!--done:versoes-ambiente-->
    - [x] Implementar função para obter versões <!--done:func-versoes-->
    - [x] Exibir informações no dashboard (footer ou modal) <!--done:exibir-versoes-ui-->
    - [x] Garantir atualização automática das versões exibidas <!--done:versoes-auto-->
- [x] **Refatorar Gerenciamento de Dados dos Livros para Centralização no Main Process** <!--done:refatorar-dados-livros-main-->
    - [x] Identificar e corrigir causa raiz do erro "Livro não encontrado" devido à discrepância de IDs (localStorage vs. electron-store). <!--done:corrigir-erro-livro-nao-encontrado-->
    - [x] Implementar handlers IPC no `main.js` para operações CRUD de livros (`add-book-to-store`, `get-all-books`, `update-book`, `delete-book-in-store`) usando `electron-store` como fonte da verdade. <!--done:mainjs-ipc-crud-livros-store-->
    - [x] Atualizar `preload.js` para expor as novas funções de CRUD de livros para o `renderer.js`. <!--done:preload-expose-crud-livros-->
    - [x] Modificar `renderer.js` para utilizar exclusivamente os IPCs para todas as operações de criação, leitura, atualização e exclusão de livros, eliminando o uso de `localStorage` para a lista de livros. <!--done:renderer-usar-ipc-crud-livros-->
    - [x] Garantir que a UI (`Meus Livros`, `Sorteio de Livros`) seja recarregada corretamente após operações CRUD via IPC. <!--done:ui-refresh-pos-crud-ipc-->

## 4. Funcionalidades de UI/UX
- [x] **Customização do título da janela** <!--done:titulo-janela-->
    - [x] Adicionar campo/input para edição do título <!--done:input-titulo-->
    - [x] Implementar lógica para atualizar título via IPC <!--done:ipc-titulo-->
    - [x] Salvar preferência do usuário localmente <!--done:salvar-titulo-->
- [x] **Aprimorar UI/UX e responsividade** <!--done:ui-ux-->
    - [x] Garantir navegação fluida entre módulos <!--done:navegacao-fluida-->
    - [x] Implementar feedback visual em ações (ex: loading, sucesso, erro) <!--done:feedback-visual-->
    - [x] Adotar layout responsivo para diferentes resoluções <!--done:layout-responsivo-->
    - [x] Garantir acessibilidade básica (teclado, contraste, ARIA) <!--done:acessibilidade-->
    - [x] Utilizar HTML semântico e estrutura de cabeçalhos lógica <!--done:html-semantico-->
    - [x] Adicionar tooltips e descrições nos cards <!--done:tooltips-cards-->
    - [x] Testar navegação por teclado <!--done:teclado-ui-->
    - [x] Revisar contraste de cores <!--done:contraste-ui-->
    - [x] Adicionar animações suaves para transições <!--done:animacoes-ui-->
    - [x] Validar experiência em diferentes sistemas operacionais <!--done:ux-multiplataforma-->
    - [x] Icones de menu laterais <!--done:icones-laterais-->
    - [x] Retirar menu padrão do Electron da página inicial <!--done:remover-menu-padrao-electron-->
    - [x] Formulação da página inicial com estatisticas e imagem do livro <!--done:pagina-inical-estatisticas-imagem-->
    - [x] Página inicial sendo a Sorteio de Livros <!--done:pagina-inical-sorteio-livros-->
    - [x] Desing de icones e aparencia da tela Sorteio de Livros concluidos  <!--done:Desing-icones-tela-sorteio-livros-->
    - [x] **Implementar página "Meus Livros"** <!--done:pagina-meus-livros-->
    - [x] Criar estrutura da página "Meus Livros" no `index.html` <!--done:meus-livros-html-->
    - [x] Listar todos os livros adicionados com informações básicas <!--done:meus-livros-listar-->
      - [x] Incluir exibição de "páginas lidas" no card de cada livro em "Meus Livros". <!--done:meus-livros-card-paginaslidas-->
    - [x] Implementar funcionalidade de busca na lista de livros <!--done:meus-livros-busca-->
    - [x] Permitir edição das informações de qualquer livro listado <!--done:meus-livros-editar-->
      - [x] Adicionar campo "Páginas Lidas" no modal de edição (`edit-book-modal`). <!--done:meus-livros-modal-edit-paginaslidas-campo-->
      - [x] Implementar lógica para popular, coletar, validar e salvar "Páginas Lidas" através do modal de edição. <!--done:meus-livros-modal-edit-paginaslidas-logica-->
      - [x] Corrigir funcionalidade do botão "Editar" nos cards de "Meus Livros" para abrir e popular corretamente o modal `edit-book-modal`. <!--done:meus-livros-botao-editar-fix-->
      - [x] Remover campos não utilizados (Resumo, Anotações, Último Sorteio) do modal de edição de livros (`edit-book-modal`). <!--done:meus-livros-remover-campos-modal-->
      - [x] Assegurar que o salvamento da edição de livros (`#edit-book-form`) use o IPC `updateBook` e atualize a UI corretamente. <!--done:meus-livros-salvar-edicao-ipc-ui-->
    - [x] Sincronizar e corrigir exibição/atualização de "páginas lidas" entre as telas "Meus Livros" e "Sorteio de Livros". <!--done:meus-livros-sync-paginaslidas-->
      - [x] Padronizar o uso da propriedade `paginasLidas` em todo o `renderer.js` (substituindo `pagesRead`). <!--done:meus-livros-prop-paginaslidas-->
      - [x] Implementar migração de dados em `getBooks()` para carregar valores da propriedade antiga `pagesRead` para `paginasLidas`, preservando o histórico. <!--done:meus-livros-migracao-paginaslidas-->
    - [x] Integrar com o sistema de navegação lateral <!--done:meus-livros-navegacao-->
    - [x] Garantir que a página exiba livros de backups locais (importados) <!--done:meus-livros-backup-local-->
    - [x] Caixa de seleção de livros, e opção excluir todos os selecionados no menu **Meus Livros** <!--done:caixa-selecao-excluir-todos-->
    - [x] Menu Adicionar Livros funcionado concluido <!--done:adicionar-livros-funcionando-->
    - [x] Tamanho dos cards e sua aparencia perfeitos em Meus Livros <!--done:cards-livros-perfeitos-->
- [x] **Funcionalidades de Backup e Restauração (Configurações)** <!--done:backup-restauracao-config-->
    - [x] Implementar botão "Exportar Biblioteca" nas Configurações <!--done:btn-exportar-biblioteca-->
        - [x] Permitir salvar biblioteca em formato JSON <!--done:export-json-->
        - [x] Permitir salvar biblioteca em formato CSV <!--done:export-csv-->
        - [x] Permitir salvar biblioteca em formato TXT <!--done:export-txt-->
        - [x] Permitir salvar biblioteca em formato ODS <!--done:export-ods-->
        - [x] Permitir salvar biblioteca em formato XLSX <!--done:export-xlsx-->
        - [x] Refatorar UI de exportação para usar modal de seleção de formato <!--done:export-modal-ui-->
        - [x] Permitir salvar biblioteca em formato PDF (adiado para v2.0) <!--done:export-pdf-adiado-->
    - [x] Implementar botão "Importar Biblioteca" nas Configurações <!--done:btn-importar-biblioteca-->
        - [x] Permitir importar de formato JSON (substituindo dados atuais com confirmação) <!--done:import-json-->
        - [x] Permitir importar de formato TXT (adicionando aos dados atuais) <!--done:import-txt-->
        - [x] Permitir importar de formato CSV (adicionando aos dados atuais) <!--done:import-csv-->
        - [x] Permitir importar de formato XLSX (adicionando aos dados atuais) <!--done:import-xlsx-->
        - [x] Refatorar UI de importação para usar modal de seleção de formato (removendo dropdown antigo) <!--done:import-modal-ui-->
    - [X] Implementar botão "Redefinir Biblioteca" nas Configurações (com confirmação) <!--done:btn-redefinir-biblioteca-->
- [ ] Adicionar código de conduta se necessário <!--done:codigo-conduta-->

## 5. Documentação e Boas Práticas
- [x] **Documentar arquitetura e decisões** <!--done:doc-arquitetura-->
    - [x] Atualizar `@docs/project_documentation.md` com decisões técnicas <!--done:doc-tech-->
    - [X] Atualizar README com instruções de uso <!--done:doc-readme-->
    - [ ] Criar diagramas de fluxo/arquitetura se necessário <!--done:doc-diagramas-->
- [ ] **Adicionar exemplos de uso e instruções de build** <!--done:doc-exemplos-->
    - [x] Documentar como rodar o projeto localmente <!--done:doc-run-->
    - [ ] Documentar como empacotar para distribuição <!--done:doc-build-->
    - [ ] Adicionar exemplos de contribuição (PR, branch, commit) <!--done:doc-contribuicao-->

## 6. Testes e Validação Multiplataforma
- [ ] **Testar manualmente em Windows, Mac e Linux** <!--done:teste-multiplataforma-->
    - [ ] Executar app em cada SO e registrar problemas <!--done:teste-so-->
    - [ ] Corrigir diferenças de comportamento <!--done:correcao-so-->
    - [ ] Validar instalação e execução pós-build <!--done:validar-build-so-->
- [ ] **Planejar estrutura para testes automatizados** <!--done:planejar-testes-->
    - [ ] Esboçar testes unitários para lógica de módulos <!--done:esboco-unitarios-->
    - [ ] Esboçar testes E2E para principais fluxos <!--done:esboco-e2e-->
    - [ ] Definir ferramentas de teste (ex: Jest, Playwright) <!--done:ferramentas-teste-->
    - [ ] Documentar estratégia de testes <!--done:doc-estrategia-teste-->

## 7. Preparação para Expansão e Release
- [x] **Revisar arquitetura para integração futura com APIs** <!--done:pronto-para-api-->
    - [x] Garantir separação clara entre lógica de dados e UI <!--done:separacao-dados-ui-->
    - [ ] Definir interfaces para consumo de APIs <!--done:interfaces-api-->
    - [ ] Documentar pontos de integração <!--done:doc-integracao-->
- [ ] **Preparar empacotamento para distribuição** <!--done:empacotamento-->
    - [ ] Avaliar electron-builder vs electron-packager <!--done:avaliar-empacotador-->
    - [ ] Configurar scripts de build para cada SO <!--done:scripts-build-so-->
    - [ ] Testar geração de instaladores <!--done:testar-instaladores-->
    - [ ] Documentar processo de empacotamento <!--done:doc-empacotamento-->
- [ ] **Revisar licença e informações de contribuição** <!--done:licenca-contribuicao-->
    - [ ] Definir licença do projeto <!--done:definir-licenca-->
    - [ ] Atualizar seção de contribuição no README <!--done:readme-contribuicao-->
    - [ ] Adicionar código de conduta se necessário <!--done:codigo-conduta-->

---

### Legenda de Marcação
- Para marcar uma tarefa como concluída, substitua `[ ]` por `[x]` e mantenha o comentário `<!--done:etiqueta-->`.
- As etiquetas (`etiqueta`) servem para as LLMs identificarem tarefas já realizadas e evitarem repetições.

---

### Observações Finais
- Mantenha este documento atualizado durante todo o ciclo de desenvolvimento.
- Adapte as tarefas conforme surgirem novas necessidades ou mudanças de escopo.
- Consulte sempre as boas práticas e a documentação técnica para garantir qualidade e manutenibilidade.

## 3.1. Sistema de Logging Centralizado
- [x] **Implementar sistema de logging centralizado** <!--done:sistema-logging-->
    - [x] Criar classe Logger em `src/utils/logger.js` com níveis (ERROR, WARN, INFO, DEBUG) <!--done:logger-class-->
    - [x] Implementar formatação consistente de logs com timestamp e níveis <!--done:logger-format-->
    - [x] Configurar detecção de ambiente (desenvolvimento vs produção) <!--done:logger-env-detection-->
    - [x] Expor logger no `preload.js` para uso no renderer process <!--done:logger-preload-expose-->
    - [x] Importar e configurar logger no `main.js` <!--done:logger-main-import-->
    - [x] Corrigir função `log` no `renderer.js` para usar métodos corretos do logger <!--done:logger-renderer-fix-->
    - [x] Resolver duplicação de exposição da `electronAPI` no `preload.js` <!--done:logger-electronapi-fix-->
- [x] **Substituir console.log por sistema de logging** <!--done:substituir-console-logs-->
    - [x] Substituir `console.log` no início do `main.js` <!--done:main-console-replace-inicio-->
    - [x] Substituir `console.log` restantes no `main.js` (linhas 68, 71, 74, 78) <!--done:main-console-replace-restantes-->
    - [x] Substituir `console.log` restantes no `preload.js` (função `openLocalFile`) <!--done:preload-console-replace-->
    - [x] Implementar logging condicional baseado no ambiente no `renderer.js` <!--done:renderer-logging-condicional-->
- [x] **Otimizar e limpar logs desnecessários** <!--done:otimizar-logs-->
    - [x] Reduzir logs de debug excessivos no `preload.js` <!--done:preload-reduce-debug-->
    - [x] Remover logs desnecessários de desenvolvimento no `renderer.js` <!--done:renderer-remove-unnecessary-->
    - [x] Implementar logging condicional no `main.js` (apenas logs importantes em produção) <!--done:main-logging-condicional-->
    - [x] Revisar e padronizar mensagens de log em todos os arquivos <!--done:padronizar-mensagens-log-->
    - [x] Limpar event listeners e funções de configuração (setupMyBooksControls, setupConfigurationButtons) <!--done:limpar-event-listeners-config-->
    - [x] Limpar funções de renderização e modais (editBookModal, renderização de cards) <!--done:limpar-funcoes-renderizacao-modais-->
    - [x] Revisão final e validação <!--done:revisao-final-validacao-->