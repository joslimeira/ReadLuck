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
// const XLSX = require('xlsx'); // REMOVIDO - Será usado via IPC
// const rtf2text = require('rtf2text'); // REMOVIDO - Será usado via IPC
// Este script é executado no processo de renderização (front-end)

// Dados de exemplo para livros
let books = [
  {
    id: 1,
    title: 'Dom Quixote',
    author: 'Miguel de Cervantes',
    pages: 863,
    status: 'Não Lido',
    lastSelected: '03 de abril'
  },
  {
    id: 2,
    title: 'O Senhor dos Anéis',
    author: 'J.R.R. Tolkien',
    pages: 1200,
    status: 'Não Lido',
    lastSelected: '03 de abril'
  },
  {
    id: 3,
    title: 'Orgulho e Preconceito',
    author: 'Jane Austen',
    pages: 432,
    status: 'Concluído',
    lastSelected: '09 de maio'
  }
];

// Função para renderizar os cards de livros
function renderBookCards() {
  const books = getBooks();
  const booksContainer = document.getElementById('books-list');
  booksContainer.innerHTML = '';

  books.forEach(book => {
    const bookCard = document.createElement('div');
    bookCard.className = 'book-card';
    bookCard.dataset.id = book.id;

    bookCard.innerHTML = `
      <h3 class="book-title">${book.title}</h3>
      <p class="book-author">${book.author}</p>
      <p class="book-pages">${book.pages} páginas</p>
      <div class="status-dropdown">
        <select class="book-status" data-id="${book.id}">
          <option value="Não Lido" ${book.status === 'Não Lido' ? 'selected' : ''}>Não Lido</option>
          <option value="Lendo" ${book.status === 'Lendo' ? 'selected' : ''}>Lendo</option>
          <option value="Concluído" ${book.status === 'Concluído' ? 'selected' : ''}>Concluído</option>
        </select>
      </div>
      <p class="book-last-selected">Último sorteio: ${book.lastSelectedDate ? formatDate(new Date(book.lastSelectedDate)) : 'Nunca'}</p>
    `;

    booksContainer.appendChild(bookCard);
  });

  // Adicionar event listeners para os select de status
  document.querySelectorAll('.book-status').forEach(select => {
    select.addEventListener('change', function() {
      const bookId = this.dataset.id;
      const newStatus = this.value;
      
      const books = getBooks();
      const book = books.find(b => b.id === bookId);
      if (book) {
        book.status = newStatus;
        saveBooks(books);
      }
    });
  });
}

// Função para selecionar um livro aleatório que não esteja concluído
function selectRandomBook() {
  const books = getBooks();
  const availableBooks = books.filter(book => book.status !== 'Concluído');
  
  if (availableBooks.length === 0) {
    alert('Não há livros disponíveis para sorteio. Todos os livros já foram concluídos ou sua biblioteca está vazia.');
    return null;
  }
  
  const randomIndex = Math.floor(Math.random() * availableBooks.length);
  const selectedBook = availableBooks[randomIndex];
  
  // Atualizar a data do último sorteio do livro
  const bookIndex = books.findIndex(book => book.id === selectedBook.id);
  if (bookIndex !== -1) {
    const now = new Date().toISOString();
    books[bookIndex].lastSelectedDate = now;
    saveBooks(books);
  }
  
  return selectedBook;
}

// Função auxiliar para obter o nome do mês
function getMonthName(monthIndex) {
  const months = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
  ];
  return months[monthIndex];
}

// Função para salvar livros no localStorage
function saveBooks(books) {
  console.log(`[DEBUG] saveBooks chamada com ${books.length} livros.`);
  localStorage.setItem('library-books', JSON.stringify(books));
  
  // Verificar qual página está ativa
  const myBooksPage = document.getElementById('page--my-books');
  if (myBooksPage && myBooksPage.classList.contains('active')) {
    renderMyBooks(books);
  } else {
    renderBooks(books);
  }
  
  updateReadingStats(); // Atualizar estatísticas ao salvar livros
}

// Função para carregar livros do localStorage
function getBooks() {
  const storedBooks = localStorage.getItem('library-books');
  return storedBooks ? JSON.parse(storedBooks) : books;
}

function loadBooks() {
  console.log('[DEBUG] loadBooks chamada');
  const books = getBooks();
  console.log(`[DEBUG] loadBooks carregou ${books.length} livros.`);
  renderBooks(books);
  updateReadingStats();
  renderFavorites();
}

// Funções para manipulação dos modais
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  modal.classList.add('active');
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  modal.classList.remove('active');
}

// Função para adicionar um novo livro
function addBook(bookData) {
  const books = getBooks();
  const newId = books.length > 0 ? Math.max(...books.map(book => book.id)) + 1 : 1;
  
  const newBook = {
    id: newId,
    title: bookData.title,
    author: bookData.author,
    pages: parseInt(bookData.pages),
    status: bookData.status || 'Não Lido',
    lastSelectedDate: null
  };
  
  books.push(newBook);
  saveBooks(books);
  
  return newBook;
}

// Função para mostrar uma página específica
function showPage(pageId) {
  // Remove a classe 'active' de todas as páginas e itens da barra lateral
  document.querySelectorAll('.content-page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));
  
  // Adiciona a classe 'active' à página e ao item de menu correspondentes
  const targetPage = document.getElementById(`${pageId}-page`);
  if (!targetPage) {
    console.error(`Página ${pageId}-page não encontrada!`);
    return;
  }
  targetPage.classList.add('active');
  
  const menuItem = document.querySelector(`.sidebar-item[data-page="${pageId}"]`);
  if (menuItem) {
    menuItem.classList.add('active');
  }
  
  // Carrega conteúdo específico para cada página
  if (pageId === 'my-books') {
    console.log('[DEBUG] Navegando para Meus Livros. Chamando renderMyBooks.');
    // Quando a página Meus Livros for selecionada, carrega todos os livros
    const books = getBooks();
    renderMyBooks(books);
  } else if (pageId === 'favorites') {
    // Quando a página Favoritos for selecionada, renderiza favoritos
    renderFavorites();
  } else if (pageId === 'book-list') {
    // Quando a página Sorteio for selecionada, atualiza a lista de livros
    const books = getBooks();
    renderBooks(books);
    console.log('[DEBUG] Navegando para Sorteio de Livros. Chamando renderBooks.');
  }
}

// Função para inicializar a navegação da barra lateral estilo Notion
function initSidebarNavigation() {
  console.log('[DEBUG] initSidebarNavigation chamada');
  const sidebarItems = document.querySelectorAll('.sidebar-item');

  // Adiciona listener de clique para cada item da barra lateral
  sidebarItems.forEach(item => {
    console.log('[DEBUG] Adicionando listener para o item da sidebar:', item.getAttribute('data-page'));
    item.addEventListener('click', () => {
      const targetPageId = item.getAttribute('data-page');
      console.log('[DEBUG] Item da sidebar clicado:', targetPageId);
      
      // Usa a função showPage para navegar para a página selecionada
      showPage(targetPageId);
    });
  });
}

// Função para inicializar o tema (claro/escuro)
function initDarkModeToggle() {
  const darkModeToggle = document.getElementById('dark-mode-toggle');
  if (!darkModeToggle) return;
  
  // Verificar se existe tema salvo
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    document.body.classList.add('dark-mode');
    darkModeToggle.checked = true;
  }
  
  // Adicionar evento para alternar o tema
  darkModeToggle.addEventListener('change', () => {
    if (darkModeToggle.checked) {
      document.body.classList.add('dark-mode');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark-mode');
      localStorage.setItem('theme', 'light');
    }
  });
}

// Personalização do título da aplicação
async function initTitleCustomization() {
  const titleInput = document.getElementById('app-title');
  const saveButton = document.getElementById('btn-save-title');
  
  // Carregar título personalizado salvo via IPC
  if (window.electronAPI && typeof window.electronAPI.loadTitlePreference === 'function') {
    try {
      const savedTitle = await window.electronAPI.loadTitlePreference();
      if (savedTitle && titleInput) {
        titleInput.value = savedTitle;
        document.title = savedTitle;
      }
    } catch (error) {
      console.error('Falha ao carregar preferência de título:', error);
    }
  }
  
  // Adicionar listener para o input para atualização em tempo real
  if (titleInput && window.electronAPI && typeof window.electronAPI.setTitle === 'function') {
    titleInput.addEventListener('input', () => {
      const newTitle = titleInput.value.trim();
      if (newTitle) {
        document.title = newTitle; // Atualiza o título da aba do navegador (visual)
        window.electronAPI.setTitle(newTitle); // Atualiza o título da janela real via IPC
      }
    });
  }

  // Adicionar listener para o botão salvar
  if (saveButton && titleInput && window.electronAPI && typeof window.electronAPI.saveTitlePreference === 'function') {
    saveButton.addEventListener('click', () => {
      const newTitle = titleInput.value.trim();
      if (newTitle) {
        window.electronAPI.saveTitlePreference(newTitle);
        window.electronAPI.setTitle(newTitle);
        alert('Título salvo com sucesso!');
      }
    });
  }
}

// Função principal para inicializar a UI
function initUI() {
  console.log('[DEBUG] initUI chamada');
  
  // Inicializar navegação da sidebar
  initSidebarNavigation();
  
  // Inicializar tema (claro/escuro)
  initDarkModeToggle();
  
  // Inicializar personalização de título
  initTitleCustomization();
  
  // Inicializar entrada de páginas lidas
  const pagesReadInput = document.getElementById('pages-read-input');
  if (pagesReadInput) {
    pagesReadInput.addEventListener('keypress', (event) => {
      if (event.key === 'Enter') {
        const additionalPages = parseInt(pagesReadInput.value);
        
        if (isNaN(additionalPages) || additionalPages <= 0) {
          alert('Por favor, insira um número válido de páginas.');
          return;
        }
        
        updatePagesRead(additionalPages);
        pagesReadInput.value = ''; // Limpar o input após atualizar
      }
    });
  }
  
  // Configurar o campo de busca na página Meus Livros
  const myBooksSearchInput = document.getElementById('my-books-search');
  if (myBooksSearchInput) {
    myBooksSearchInput.addEventListener('input', (e) => {
      const searchTerm = e.target.value;
      renderSearchSuggestions(searchTerm);
      
      if (!searchTerm) {
        renderMyBooks(getBooks());
      }
    });
    
    // Permitir busca ao pressionar Enter
    myBooksSearchInput.addEventListener('keypress', (event) => {
      if (event.key === 'Enter') {
        const searchQuery = myBooksSearchInput.value;
        searchMyBooks(searchQuery);
      }
    });
  }
  
  // Adicionar event listener para fechar sugestões quando clicar fora
  document.addEventListener('click', (e) => {
    const suggestionsContainer = document.getElementById('search-suggestions');
    const searchInput = document.getElementById('my-books-search');
    
    if (suggestionsContainer && searchInput && !searchInput.contains(e.target) && !suggestionsContainer.contains(e.target)) {
      suggestionsContainer.style.display = 'none';
    }
  });
  
  // Configurar o botão de busca na página Meus Livros
  const myBooksSearchBtn = document.getElementById('my-books-search-btn');
  if (myBooksSearchBtn) {
    myBooksSearchBtn.addEventListener('click', () => {
      const searchQuery = document.getElementById('my-books-search').value;
      searchMyBooks(searchQuery);
    });
  }
  
  // Atualizar estatísticas de leitura
  updateReadingStats();

  // Configurar formulário de adição de livro no modal
  const bookForm = document.getElementById('book-form');
  if (bookForm) {
    bookForm.addEventListener('submit', (event) => {
      event.preventDefault();
      
      const title = document.getElementById('book-title').value;
      const author = document.getElementById('book-author').value;
      const pages = document.getElementById('book-pages').value;
      const status = document.getElementById('book-status').value;
      
      addBook({
        title,
        author,
        pages,
        status
      });
      
      closeModal('book-modal');
    });
  }
  
  // Configurar formulário adicionar livros da página
  const addBookForm = document.getElementById('add-book-form');
  if (addBookForm) {
    addBookForm.addEventListener('submit', (event) => {
      event.preventDefault();
      
      const title = event.target.querySelector('#book-title').value;
      const author = event.target.querySelector('#book-author').value;
      const pages = event.target.querySelector('#book-pages').value;
      const status = event.target.querySelector('#book-status').value;
      
      addBook({
        title,
        author,
        pages,
        status
      });
      
      // Limpar os campos após adicionar
      event.target.reset();
      
      // Mostrar mensagem de sucesso
      alert('Livro adicionado com sucesso!');
      
      // Redirecionar para a página "Meus Livros"
      showPage('my-books');
    });
  }

  // Configurar botões de fechar modal (incluindo .close-button)
  document.querySelectorAll('.close-modal, .close-button').forEach(closeBtn => {
    closeBtn.addEventListener('click', () => {
      const modal = closeBtn.closest('.modal');
      if (modal) {
        modal.classList.remove('active');
      }
    });
  });

  // Configurar eventos para o menu de importação/exportação
  const importCSVBtn = document.getElementById('import-csv');
  if (importCSVBtn) importCSVBtn.addEventListener('click', importCSV);
  
  const importTXTBtn = document.getElementById('import-txt');
  if (importTXTBtn) importTXTBtn.addEventListener('click', importTXT);
  
  const importODSBtn = document.getElementById('import-ods');
  if (importODSBtn) importODSBtn.addEventListener('click', importODS);
  
  const importHTMLBtn = document.getElementById('import-html');
  if (importHTMLBtn) importHTMLBtn.addEventListener('click', importHTML);
  
  const exportCSVBtn = document.getElementById('export-csv');
  if (exportCSVBtn) exportCSVBtn.addEventListener('click', exportCSV);
  
  const exportTXTBtn = document.getElementById('export-txt');
  if (exportTXTBtn) exportTXTBtn.addEventListener('click', exportTXT);
  
  const exportODSBtn = document.getElementById('export-ods');
  if (exportODSBtn) exportODSBtn.addEventListener('click', exportODS);
  
  const exportHTMLBtn = document.getElementById('export-html');
  if (exportHTMLBtn) exportHTMLBtn.addEventListener('click', exportHTML);
  
  // Configurar eventos para o menu de visualização
  const viewAllBtn = document.getElementById('view-all');
  if (viewAllBtn) viewAllBtn.addEventListener('click', () => filterBooksByStatus('all'));
  
  const viewUnreadBtn = document.getElementById('view-unread');
  if (viewUnreadBtn) viewUnreadBtn.addEventListener('click', () => filterBooksByStatus('Não Lido'));
  
  const viewReadingBtn = document.getElementById('view-reading');
  if (viewReadingBtn) viewReadingBtn.addEventListener('click', () => filterBooksByStatus('Lendo'));
  
  const viewCompletedBtn = document.getElementById('view-completed');
  if (viewCompletedBtn) viewCompletedBtn.addEventListener('click', () => filterBooksByStatus('Concluído'));
  
  // Renderizar lista de livros e favoritos
  const books = getBooks();
  renderBooks(books);
  renderFavorites();
  
  // Garantir que o contador de livros esteja atualizado
  updateBooksCount(books);
}

// Iniciar a aplicação quando o conteúdo for carregado
document.addEventListener('DOMContentLoaded', () => {
  loadBooks();
  initUI();
  
  // Mostrar a página inicial (Sorteio de Livros)
  showPage('book-list');
});

const pageIdMap = {
  'book-list': 'book-list-page',
  'my-books': 'page-my-books',
  'favorites': 'favorites-page',
  'settings': 'settings-page',
  'add-books': 'add-books-page'
  // Adicione outros conforme necessário
}; 