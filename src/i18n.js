/*
  ReadLuck - Aplicativo de gestão de livros
  
  Este programa é software livre: você pode redistribuí-lo e/ou modificá-lo
  sob os termos da GNU Affero General Public License conforme publicada pela Free Software Foundation,
  na versão 3 da Licença.

  Este programa é distribuído na esperança de que seja útil, mas SEM NENHUMA GARANTIA;
  sem mesmo a garantia implícita de COMERCIALIZAÇÃO ou ADEQUAÇÃO A UM DETERMINADO PROPÓSITO.
  Veja a GNU Affero General Public License para mais detalhes.

  Você deve ter recebido uma cópia da GNU Affero General Public License
  junto com este programa. Se não, veja <https://www.gnu.org/licenses/agpl-3.0>.
*/
// Sistema de Internacionalização (i18n) para o ReadLuck
class I18n {
  constructor() {
    this.currentLanguage = 'en'; // Idioma padrão: inglês
    this.translations = {};
    this.supportedLanguages = {
      'en': { name: 'English', flag: '🇺🇸' },
      'pt': { name: 'Português', flag: '🇧🇷' }
    };
  }

  // Carregar traduções de um idioma específico
  async loadLanguage(language) {
    try {
      const response = await fetch(`locales/${language}.json`);
      if (!response.ok) {
        throw new Error(`Failed to load language file: ${language}`);
      }
      this.translations[language] = await response.json();
      console.log('[I18N]', `Idioma ${language} carregado com sucesso`);
    } catch (error) {
      console.error('[I18N]', `Erro ao carregar idioma ${language}`, error.message);
      // Fallback para inglês se houver erro
      if (language !== 'en') {
        await this.loadLanguage('en');
      }
    }
  }

  // Inicializar o sistema de i18n
  async init() {
    // Carregar idioma salvo ou usar padrão (inglês)
    const savedLanguage = localStorage.getItem('readluck-language') || 'en';
    this.currentLanguage = savedLanguage;
    
    // Carregar traduções do idioma atual
    await this.loadLanguage(this.currentLanguage);
    
    // Se não for inglês, carregar inglês como fallback
    if (this.currentLanguage !== 'en') {
      await this.loadLanguage('en');
    }
    
    // Aplicar traduções na interface
    this.applyTranslations();
    
    log('info', 'I18N', `Sistema i18n inicializado com idioma: ${this.currentLanguage}`);
  }

  // Obter tradução por chave
  t(key, params = {}, fallback = key) {
    const keys = key.split('.');
    let translation = this.translations[this.currentLanguage];
    
    // Navegar pela estrutura aninhada
    for (const k of keys) {
      if (translation && typeof translation === 'object' && k in translation) {
        translation = translation[k];
      } else {
        // Tentar fallback para inglês
        translation = this.translations['en'];
        for (const k2 of keys) {
          if (translation && typeof translation === 'object' && k2 in translation) {
            translation = translation[k2];
          } else {
            return fallback;
          }
        }
        break;
      }
    }
    
    let result = typeof translation === 'string' ? translation : fallback;
    
    // Processar interpolação de parâmetros
    if (typeof params === 'object' && params !== null) {
      Object.keys(params).forEach(param => {
        const placeholder = `{{${param}}}`;
        result = result.replace(new RegExp(placeholder, 'g'), params[param]);
      });
    }
    
    return result;
  }

  // Alterar idioma
  async changeLanguage(language) {
    if (!this.supportedLanguages[language]) {
      log('error', 'I18N', `Idioma não suportado: ${language}`);
      return false;
    }

    // Carregar traduções se ainda não carregadas
    if (!this.translations[language]) {
      await this.loadLanguage(language);
    }

    this.currentLanguage = language;
    localStorage.setItem('readluck-language', language);
    
    // Aplicar novas traduções
    this.applyTranslations();
    
    log('info', 'I18N', `Idioma alterado para: ${language}`);
    return true;
  }

  // Aplicar traduções na interface
  applyTranslations() {
    // Sidebar
    this.updateElement('[data-page="add-books"] .sidebar-label', this.t('sidebar.addBooks'));
    this.updateElement('[data-page="book-list"] .sidebar-label', this.t('sidebar.bookDraw'));
    this.updateElement('[data-page="my-books"] .sidebar-label', this.t('sidebar.myBooks'));
    this.updateElement('[data-page="favorites"] .sidebar-label', this.t('sidebar.favorites'));
    this.updateElement('[data-page="settings"] .sidebar-label', this.t('sidebar.settings'));
    this.updateElement('[data-page="about"] .sidebar-label', this.t('sidebar.about'));
    this.updateElement('[data-page="help"] .sidebar-label', this.t('sidebar.help'));

    // Página de Sorteio de Livros
    this.updateElement('#book-list .page-header h1', this.t('pages.bookDraw.title'));
    this.updateElement('#btn-sort-book', this.t('pages.bookDraw.drawButton'));
    this.updateElement('.last-book-left .section-title', this.t('pages.bookDraw.lastBookDrawn'));
    this.updateElement('#last-book-title', this.t('pages.bookDraw.noBookDrawn'));
    this.updateElement('.last-book-right .section-title', this.t('pages.bookDraw.readingStats'));
    this.updateElement('label[for="pages-read-input"]', this.t('pages.bookDraw.pagesReadAfterDraw'));
    this.updateElement('#pages-read-input', '', 'placeholder', this.t('pages.bookDraw.pagesPlaceholder'));
    this.updateElement('#update-pages-btn', this.t('pages.bookDraw.updateButton'));
    
    // Estatísticas de leitura - usando atributos data-i18n
    this.updateElement('[data-i18n="pages.bookDraw.totalBooks"]', this.t('pages.bookDraw.totalBooks'));
    this.updateElement('[data-i18n="pages.bookDraw.booksRead"]', this.t('pages.bookDraw.booksRead'));
    this.updateElement('[data-i18n="pages.bookDraw.booksInProgress"]', this.t('pages.bookDraw.booksInProgress'));
    this.updateElement('[data-i18n="pages.bookDraw.totalPagesRead"]', this.t('pages.bookDraw.totalPagesRead'));
    this.updateElement('[data-i18n="pages.bookDraw.mostRecentBook"]', this.t('pages.bookDraw.mostRecentBook'));
    this.updateElement('.reading-progress-overall h4', this.t('pages.bookDraw.overallReadingProgress'));

    // Página de Adicionar Livros
    this.updateElement('#add-books .page-header h1', this.t('pages.addBooks.title'));
    this.updateElement('label[for="book-title"]', this.t('pages.addBooks.titleField'));
    this.updateElement('label[for="book-author"]', this.t('pages.addBooks.authorField'));
    this.updateElement('label[for="book-pages"]', this.t('pages.addBooks.pagesField'));
    this.updateElement('label[for="book-status"]', this.t('pages.addBooks.statusField'));
    this.updateElement('#add-book-form button[type="submit"]', this.t('pages.addBooks.addButton'));

    // Página Meus Livros
    this.updateElement('#my-books .page-header h1', this.t('pages.myBooks.title'));
    this.updateElement('#my-books-search', '', 'placeholder', this.t('pages.myBooks.searchPlaceholder'));
    this.updateElement('#my-books-search-btn', this.t('pages.myBooks.searchButton'));
    this.updateElement('#sort-books-btn', this.t('pages.myBooks.sortButton'));

    // Opções de Ordenação
    document.querySelectorAll('.sort-option').forEach(option => {
      const key = option.getAttribute('data-i18n');
      if (key) {
        this.updateElement(`[data-i18n="${key}"]`, this.t(key));
      }
    });
    this.updateElement('label[for="select-all-books-checkbox"]', this.t('pages.myBooks.selectAll'));
    this.updateElement('#delete-selected-books-btn', this.t('pages.myBooks.deleteSelected'));

    // Página de Favoritos
    this.updateElement('#favorites .page-header h1', this.t('pages.favorites.title'));
    this.updateElement('#favorites .empty-state', this.t('pages.favorites.emptyState'));

    // Página de Configurações
    this.updateElement('#settings .page-header h1', this.t('pages.settings.title'));
    this.updateElement('#settings h3:first-of-type', this.t('pages.settings.appearance'));
    this.updateElement('label[for="dark-mode-toggle"]', this.t('pages.settings.darkMode'));
    this.updateElement('#settings h3:nth-of-type(2)', this.t('pages.settings.data'));
    this.updateElement('#export-library-btn', this.t('pages.settings.exportLibrary'));
    this.updateElement('#import-library-dropdown-btn', this.t('pages.settings.importLibrary'));
    this.updateElement('#btn-reset-data', this.t('pages.settings.resetLibrary'));

    // Página Sobre
    this.updateElement('#about .page-header h1', this.t('pages.about.title'));
    this.updateElement('#about .app-version', this.t('pages.about.version'));
    this.updateElement('#about .app-description', this.t('pages.about.description'));

    // Página de Ajuda
    this.updateElement('#help .page-header h1', this.t('pages.help.title'));

    // Status dos livros
    this.updateStatusOptions();

    // Modais
    this.updateElement('#edit-modal-title', this.t('modals.editBook.title'));
    this.updateElement('label[for="editBookTitle"]', this.t('modals.editBook.titleField'));
    this.updateElement('label[for="editBookAuthor"]', this.t('modals.editBook.authorField'));
    this.updateElement('label[for="editBookPages"]', this.t('modals.editBook.pagesField'));
    this.updateElement('label[for="editBookStatus"]', this.t('modals.editBook.statusField'));
    this.updateElement('label[for="editPaginasLidasInput"]', this.t('modals.editBook.pagesReadField'));
    this.updateElement('label[for="editBookCover"]', this.t('modals.editBook.coverField'));
    this.updateElement('#editBookCover', '', 'placeholder', this.t('modals.editBook.coverPlaceholder'));
    this.updateElement('#edit-book-form button[type="submit"]', this.t('modals.editBook.saveButton'));

    // Footer
    this.updateElement('footer p', this.t('footer.text'));

    // Modal de Exportação
    this.updateElement('[data-i18n="modals.exportFormat.title"]', this.t('modals.exportFormat.title'));
    this.updateElement('[data-i18n="modals.exportFormat.description"]', this.t('modals.exportFormat.description'));
    
    // Modal de Importação
    this.updateElement('[data-i18n="modals.importFormat.title"]', this.t('modals.importFormat.title'));
    this.updateElement('[data-i18n="modals.importFormat.description"]', this.t('modals.importFormat.description'));
    this.updateElement('[data-i18n="modals.importFormat.cancelButton"]', this.t('modals.importFormat.cancelButton'));
    
    // Página de Configurações - novos elementos com data-i18n
    this.updateElement('[data-i18n="pages.settings.appearance"]', this.t('pages.settings.appearance'));
    this.updateElement('[data-i18n="pages.settings.darkMode"]', this.t('pages.settings.darkMode'));
    this.updateElement('[data-i18n="pages.settings.language"]', this.t('pages.settings.language'));
    this.updateElement('[data-i18n="pages.settings.selectLanguage"]', this.t('pages.settings.selectLanguage'));
    this.updateElement('[data-i18n="pages.settings.data"]', this.t('pages.settings.data'));
    this.updateElement('[data-i18n="pages.settings.exportLibrary"]', this.t('pages.settings.exportLibrary'));
    this.updateElement('[data-i18n="pages.settings.importLibrary"]', this.t('pages.settings.importLibrary'));
    this.updateElement('[data-i18n="pages.settings.resetLibrary"]', this.t('pages.settings.resetLibrary'));
    
    // Página Sobre - novos elementos com data-i18n
    this.updateElement('[data-i18n="pages.about.version"]', this.t('pages.about.version'));
    this.updateElement('[data-i18n="pages.about.description"]', this.t('pages.about.description'));
    this.updateElement('[data-i18n="pages.about.developedBy"]', this.t('pages.about.developedBy'));
    this.updateElement('[data-i18n="pages.about.contact"]', this.t('pages.about.contact'));
    this.updateElement('[data-i18n="pages.about.legalDocuments"]', this.t('pages.about.legalDocuments'));
    this.updateElement('[data-i18n="pages.about.privacyPolicy"]', this.t('pages.about.privacyPolicy'));
    this.updateElement('[data-i18n="pages.about.termsOfUse"]', this.t('pages.about.termsOfUse'));
    
    // Página de Ajuda - novos elementos com data-i18n
    this.updateElement('[data-i18n="pages.help.addBookTitle"]', this.t('pages.help.addBookTitle'));
    this.updateElement('[data-i18n="pages.help.addBookText"]', this.t('pages.help.addBookText'));
    this.updateElement('[data-i18n="pages.help.favoriteTitle"]', this.t('pages.help.favoriteTitle'));
    this.updateElement('[data-i18n="pages.help.favoriteText"]', this.t('pages.help.favoriteText'));
    this.updateElement('[data-i18n="pages.help.statusTitle"]', this.t('pages.help.statusTitle'));
    this.updateElement('[data-i18n="pages.help.statusText"]', this.t('pages.help.statusText'));
    this.updateElement('[data-i18n="pages.help.bugsTitle"]', this.t('pages.help.bugsTitle'));
    this.updateElement('[data-i18n="pages.help.bug1"]', this.t('pages.help.bug1'));
    this.updateElement('[data-i18n="pages.help.bug2"]', this.t('pages.help.bug2'));
    this.updateElement('[data-i18n="pages.help.bug3"]', this.t('pages.help.bug3'));
    this.updateElement('[data-i18n="pages.help.bug4"]', this.t('pages.help.bug4'));
    this.updateElement('[data-i18n="pages.help.bug5"]', this.t('pages.help.bug5'));
    this.updateElement('[data-i18n="pages.help.bug6"]', this.t('pages.help.bug6'));
    this.updateElement('[data-i18n="pages.help.bug7"]', this.t('pages.help.bug7'));

    console.log('[I18N]', 'Traduções aplicadas na interface');
  }

  // Atualizar status options em todos os selects
  updateStatusOptions() {
    const selects = document.querySelectorAll('select option[value="Não Lido"], select option[value="Lendo"], select option[value="Concluído"]');
    selects.forEach(option => {
      switch(option.value) {
        case 'Não Lido':
          option.textContent = this.t('status.unread');
          break;
        case 'Lendo':
          option.textContent = this.t('status.reading');
          break;
        case 'Concluído':
          option.textContent = this.t('status.completed');
          break;
      }
    });
  }

  // Método auxiliar para atualizar elementos
  updateElement(selector, text, attribute = null, value = null) {
    const elements = document.querySelectorAll(selector);
    elements.forEach(element => {
      if (attribute) {
        element.setAttribute(attribute, value || text);
      } else {
        element.textContent = text;
      }
    });
  }

  // Obter idiomas suportados
  getSupportedLanguages() {
    return this.supportedLanguages;
  }

  // Obter idioma atual
  getCurrentLanguage() {
    return this.currentLanguage;
  }
}

// Instância global do sistema i18n
window.i18n = new I18n();

// Função helper para tradução (atalho)
window.t = (key, params, fallback) => {
  // Se params for uma string, é o fallback (compatibilidade com chamadas antigas)
  if (typeof params === 'string') {
    return window.i18n.t(key, {}, params);
  }
  // Se params for um objeto ou undefined, usar normalmente
  return window.i18n.t(key, params, fallback);
};

console.log('[I18N]', 'Sistema de internacionalização carregado');