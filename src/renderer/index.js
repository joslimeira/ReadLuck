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
// Função helper para logging condicional
function log(level, context, message, data = null) {
  if (window.logger) {
    // Mapear níveis para métodos corretos do logger
    const loggerMethods = {
      'error': 'error',
      'warn': 'warn', 
      'info': 'info',
      'debug': 'debug'
    };
    
    const method = loggerMethods[level];
    if (method && typeof window.logger[method] === 'function') {
      window.logger[method](context, message, data);
    } else {
      // Fallback para console se método não existir
      console[level === 'debug' ? 'log' : level](`[${context}] ${message}`, data || '');
    }
  } else {
    console[level === 'debug' ? 'log' : level](`[${context}] ${message}`, data || '');
  }
}

// Importar o logger (acessível via window.logger)
log('info', 'RENDERER', 'Script iniciado');

// Verifica se a electronAPI foi exposta corretamente
if (window.electronAPI) {
} else {
  log('error', 'RENDERER', 'ERRO CRÍTICO: window.electronAPI não está disponível! O preload.js pode ter falhado.');
  alert('Erro crítico na inicialização da aplicação. Verifique o console para mais detalhes.');
}

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
async function renderBookCards() {
  try {
    const books = await getBooks();
    // Adicionar um pequeno delay para garantir que o DOM esteja pronto
    await new Promise(resolve => setTimeout(resolve, 50));

    const booksContainer = document.getElementById('books-list');
    if (!booksContainer) {
        log('error', 'RENDERER', 'Container #books-list não encontrado');
        return;
    }
    
    booksContainer.innerHTML = '';

    if (!books || books.length === 0) {
        log('info', 'RENDERER', 'Nenhum livro para renderizar');
        booksContainer.innerHTML = `<p class="empty-library">${window.t('messages.emptyLibrary')}</p>`;
        return;
    }

    books.forEach(book => {
      const bookCard = document.createElement('div');
      bookCard.className = 'book-card';
      bookCard.dataset.id = book.id;

      bookCard.innerHTML = `
        <h3 class="book-title">${book.title}</h3>
        <p class="book-author">${book.author}</p>
        <p class="book-pages">${book.pages} ${window.t('modals.selectedBook.pages')}</p>
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
      select.addEventListener('change', async function() { // Tornar async
        const bookId = this.dataset.id;
        const newStatus = this.value;
        
        try {
          // Precisamos enviar todos os dados do livro para updateBook, ou apenas mudar o status?
          // O handler atual em main.js espera bookData completo. Para apenas mudar o status,
          // precisaríamos buscar o livro, alterar o status e enviar o objeto completo.
          // Ou, alterar o handler no main.js para aceitar atualizações parciais.
          // Por simplicidade agora, vamos assumir que queremos atualizar apenas o status e o main.js lida com isso
          // (NOTA: O handler atual no main.js pode não estar preparado para atualização parcial, precisaria de ajuste lá)
          // Para uma solução mais robusta e que funcione com o handler atual, buscaríamos o livro primeiro:
          const books = await getBooks();
          const bookToUpdate = books.find(b => String(b.id) === String(bookId));
          if (bookToUpdate) {
            const updatedData = { ...bookToUpdate, status: newStatus };
            const result = await window.electronAPI.updateBook(bookId, updatedData);
            if (result.success) {
              showToastNotification(window.t('messages.bookUpdated'));
              await loadBooksAndRender(); // Re-renderizar para refletir a mudança
            } else {
              alert(`${window.t('messages.errorUpdatingStatus')} ${result.error || 'Erro desconhecido'}`);
            }
          } else {
            alert(window.t('messages.bookNotFound'));
          }
        } catch (error) {
            log('error', 'RENDERER', 'Erro ao chamar updateBook IPC para status', { error: error.message });
            alert(`${window.t('messages.errorCommunication')} ${error.message}`);
          }
      });
    });
  } catch (error) {
    log('error', 'RENDERER', 'Erro em renderBookCards', { error: error.message });
    alert('Ocorreu um erro ao renderizar os cards de livros. Verifique o console.');
  }
}

// Função para selecionar um livro aleatório que não esteja concluído
async function selectRandomBook() {
  try {
    const books = await getBooks();
    if (!books) {
        log('error', 'RENDERER', 'Falha ao obter livros para sorteio');
        alert(window.t('messages.errorLoadingBooks'));
        return null;
    }
    const availableBooks = books.filter(book => book.status !== 'Concluído');
    if (availableBooks.length === 0) {
      alert(window.t('messages.noAvailableBooks'));
      return null;
    }

    // Buscar histórico dos últimos 7 sorteios via IPC
    let drawHistory = [];
    try {
      const historyResult = await window.electronAPI.getDrawHistory();
      if (historyResult && historyResult.success && Array.isArray(historyResult.data)) {
        drawHistory = historyResult.data;
      }
    } catch (e) {
      log('warn', 'RENDERER', 'Falha ao obter histórico de sorteios', { error: e.message });
    }

    // Filtrar livros que não estão no histórico
    let filteredBooks = availableBooks.filter(book => !drawHistory.includes(book.id));
    // Se todos os disponíveis estão no histórico, usar todos
    if (filteredBooks.length === 0) {
      filteredBooks = availableBooks;
    }

    // Sorteio aleatório
    const randomIndex = Math.floor(Math.random() * filteredBooks.length);
    const selectedBook = filteredBooks[randomIndex];

    // Atualizar a data do último sorteio do livro via IPC
    const bookToUpdate = books.find(book => String(book.id) === String(selectedBook.id));
    if (bookToUpdate) {
      const now = new Date().toISOString();
      const updatedData = { ...bookToUpdate, lastSelectedDate: now };
      try {
        const result = await window.electronAPI.updateBook(selectedBook.id, updatedData);
        if (!result.success) {
          log('error', 'RENDERER', 'Falha ao atualizar lastSelectedDate via IPC', { error: result.error });
          alert(`Erro ao atualizar data do sorteio: ${result.error || 'Erro desconhecido'}`);
        }
      } catch (error) {
        log('error', 'RENDERER', 'Erro de comunicação ao atualizar lastSelectedDate', { error: error.message });
        alert(`Erro de comunicação ao atualizar data do sorteio: ${error.message}`);
      }
    }

    // Atualizar histórico (adiciona o novo, mantém só os 7 mais recentes)
    try {
      let newHistory = drawHistory.filter(id => id !== selectedBook.id); // Remove se já estava
      newHistory.unshift(selectedBook.id); // Adiciona no início
      if (newHistory.length > 7) newHistory = newHistory.slice(0, 7);
      await window.electronAPI.setDrawHistory(newHistory);
    } catch (e) {
      log('warn', 'RENDERER', 'Falha ao atualizar histórico de sorteios', { error: e.message });
    }

    return selectedBook;
  } catch (error) {
    log('error', 'RENDERER', 'Erro em selectRandomBook', { error: error.message });
    alert('Ocorreu um erro ao selecionar um livro aleatório. Verifique o console.');
    return null;
  }
}

// Função auxiliar para obter o nome do mês
function getMonthName(monthIndex) {
  const months = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
  ];
  return months[monthIndex];
}

// Função para formatar data
function formatDate(date) {
  const day = date.getDate();
  const month = getMonthName(date.getMonth());
  return `${day} de ${month}`;
}

// Função para excluir um livro pelo ID
async function deleteBook(bookId) {
    if (!bookId) {
        log('error', 'RENDERER', 'deleteBook: ID do livro não fornecido');
        return;
    }

    try {
        const result = await window.electronAPI.deleteBookInStore(bookId);

        if (result && result.success) {
            const updatedBooksResult = await window.electronAPI.getAllBooks();
            if (updatedBooksResult && updatedBooksResult.success && Array.isArray(updatedBooksResult.data)) {
                await renderMyBooksContent(updatedBooksResult.data);
                showToastNotification(window.t('messages.bookDeleted'));
            } else {
                log('error', 'RENDERER', 'Falha ao recarregar livros após exclusão');
                showToastNotification('Livro excluído, mas falha ao atualizar a lista.');
            }
        } else {
            log('error', 'RENDERER', 'Falha ao excluir livro', { bookId, error: result?.error });
            showToastNotification(`Falha ao excluir livro: ${result ? result.error : 'Erro desconhecido'}`);
        }
    } catch (error) {
        log('error', 'RENDERER', 'Erro ao excluir livro', { bookId, error });
        showToastNotification(window.t('messages.errorDeleting'));
    }
}

// Função para excluir múltiplos livros
async function deleteSelectedBooks(bookIds) {
    if (!bookIds || bookIds.length === 0) {
        log('warn', 'RENDERER', 'Nenhum ID selecionado para exclusão');
        return;
    }

    try {
        const result = await window.electronAPI.deleteMultipleBooksInStore(bookIds);

        if (result && result.success) {
            showToastNotification(`${result.successCount} ${window.t('messages.booksDeleted')}`);
            await loadBooksAndRender();
            log('info', 'RENDERER', 'Exclusão em massa concluída', { count: result.successCount });
        } else {
            log('error', 'RENDERER', 'Falha na exclusão em massa', { error: result?.error });
            showToastNotification(`${window.t('messages.errorMassDeleting')} ${result ? result.error : 'Erro desconhecido'}`, 'error');
        }
    } catch (error) {
        log('error', 'RENDERER', 'Erro na exclusão em massa', { error });
        showToastNotification(window.t('messages.errorMassDeleting'), 'error');
    }
}

// Função para atualizar um livro existente
function updateBook(bookId, bookData) {
  console.log(`[RENDERER_DEBUG] updateBook - ID: ${bookId}, Dados:`, bookData);
  let booksArray = getBooks(); // Renomeado para evitar conflito com a variável global 'books' se existir
  const index = booksArray.findIndex(b => b.id == bookId);
  
  if (index !== -1) {
    booksArray[index] = {
      ...booksArray[index], // Preserva outras propriedades como lastSelectedDate e ID
      title: bookData.title,
      author: bookData.author,
      pages: parseInt(bookData.pages),
      status: bookData.status,
      // Adicionar outros campos de bookData que devem ser atualizados
      cover: bookData.cover, // Exemplo, se cover vier de bookData
      // summary: bookData.summary, // Exemplo
      // notes: bookData.notes, // Exemplo
      lastSelectedDate: bookData.lastSelectedDate, // Exemplo
      paginasLidas: parseInt(bookData.paginasLidas) // Adicionando paginasLidas aqui
    };
    
    saveBooks(booksArray); // saveBooks agora deve chamar renderMyBooks ou renderBooks condicionalmente
    console.log('[RENDERER_DEBUG] updateBook - Livro atualizado e salvo:', booksArray[index]);
  } else {
    console.error('[RENDERER_DEBUG] updateBook - Livro não encontrado para ID:', bookId);
  }
}

// Função para renderizar a lista de livros (na página principal)
function renderBooks(books) {
  const booksList = document.getElementById('books-list');
  if (!booksList) return;
  
  booksList.innerHTML = '';
  
  if (books.length === 0) {
    const emptyMessage = document.createElement('div');
    emptyMessage.className = 'empty-books';
    emptyMessage.innerHTML = `<p>${window.t('messages.emptyMyBooks')}</p>`;
    booksList.appendChild(emptyMessage);
    return;
  }
  
  books.forEach(book => {
    const bookCard = document.createElement('div');
    bookCard.className = 'book-card';
    bookCard.dataset.id = book.id;
    
    bookCard.innerHTML = `
      <h3 class="book-title">${book.title}</h3>
      <p class="book-author">${book.author}</p>
      <p class="book-pages">${book.pages} ${window.t('modals.selectedBook.pages')}</p>
      <div class="status-dropdown">
        <select class="book-status" data-id="${book.id}">
          <option value="Não Lido" ${book.status === 'Não Lido' ? 'selected' : ''}>Não Lido</option>
          <option value="Lendo" ${book.status === 'Lendo' ? 'selected' : ''}>Lendo</option>
          <option value="Concluído" ${book.status === 'Concluído' ? 'selected' : ''}>Concluído</option>
        </select>
      </div>
      <p class="book-last-selected">Último sorteio: ${book.lastSelectedDate ? formatDate(new Date(book.lastSelectedDate)) : 'Nunca'}</p>
    `;
    
    booksList.appendChild(bookCard);
  });
  
  // Adicionar listeners aos status
  document.querySelectorAll('.book-status').forEach(select => {
    select.addEventListener('change', function() {
      const bookId = this.dataset.id;
      const newStatus = this.value;
      
      const books = getBooks();
      const book = books.find(b => b.id == bookId);
      if (book) {
        book.status = newStatus;
        saveBooks(books);
      }
    });
  });
  
  // Atualizar contador
  updateBooksCount(books);
}

// Função para atualizar o contador de livros
function updateBooksCount(books) {
  const totalBooks = books.length;
  const unreadBooks = books.filter(book => book.status === 'Não Lido').length;
  const readingBooks = books.filter(book => book.status === 'Lendo').length;
  const completedBooks = books.filter(book => book.status === 'Concluído').length;
  
  const countElement = document.getElementById('books-count');
  if (countElement) {
    // Modify this line to include the prefix
    countElement.textContent = `${window.t('messages.booksRegistered')} ${totalBooks}`;
    console.log(`[RENDERER_DEBUG] updateBooksCount: Atualizado #books-count para: ${countElement.textContent}`); // Add log
  }
  
  const unreadElement = document.getElementById('unread-count');
  if (unreadElement) {
    unreadElement.textContent = unreadBooks;
  }
  
  const readingElement = document.getElementById('reading-count');
  if (readingElement) {
    readingElement.textContent = readingBooks;
  }
  
  const completedElement = document.getElementById('completed-count');
  if (completedElement) {
    completedElement.textContent = completedBooks;
  }
}

// Função para renderizar favoritos
function renderFavorites() {
  const favoritesContainer = document.getElementById('favorites-container');
  if (!favoritesContainer) return;
  
  const books = getBooks();
  const favorites = books.filter(book => book.favorite);
  
  favoritesContainer.innerHTML = '';
  
  if (favorites.length === 0) {
    favoritesContainer.innerHTML = '<p class="empty-favorites">Você ainda não tem favoritos.</p>';
    return;
  }
  
  favorites.forEach(book => {
    const favoriteCard = document.createElement('div');
    favoriteCard.className = 'favorite-card';
    favoriteCard.dataset.id = book.id;
    
    favoriteCard.innerHTML = `
      <h3 class="book-title">${book.title}</h3>
      <p class="book-author">${book.author}</p>
      <p class="book-pages">${book.pages} ${window.t('modals.selectedBook.pages')}</p>
      <p class="book-status">Status: ${book.status}</p>
      <button class="remove-favorite" data-id="${book.id}">Remover dos Favoritos</button>
    `;
    
    favoritesContainer.appendChild(favoriteCard);
  });
  
  // Adicionar listeners para remover dos favoritos
  document.querySelectorAll('.remove-favorite').forEach(button => {
    button.addEventListener('click', function() {
      const bookId = this.dataset.id;
      removeFromFavorites(bookId);
    });
  });
}

// Configurar o botão de sorteio
const btnSortBook = document.getElementById('btn-sort-book');
if (btnSortBook) {
  btnSortBook.addEventListener('click', async () => {
    console.log('[RENDERER_DEBUG] Botão de sorteio clicado');
    try {
      const selectedBook = await selectRandomBook();
      if (selectedBook) {
        showToastNotification(`${window.t('messages.bookDrawn')} ${selectedBook.title}`);
        // Atualizar apenas as estatísticas de leitura, sem renderizar os cards novamente
        await updateReadingStats();
      }
    } catch (error) {
      console.error('[RENDERER_DEBUG] Erro ao sortear livro:', error);
      alert('Erro ao sortear livro. Verifique o console para mais detalhes.');
    }
  });
}

// Função para adicionar favorito
async function addToFavorites(bookId) { // Tornar async
  // const books = getBooks(); // Será await
  // const index = books.findIndex(b => b.id == bookId);
  console.log(`[RENDERER_DEBUG] addToFavorites: Tentando favoritar livro ID ${bookId}`);
  try {
    const books = await getBooks(); // USAR AWAIT
    const bookIndex = books.findIndex(b => String(b.id) === String(bookId));

    if (bookIndex !== -1) {
      const bookToUpdate = { ...books[bookIndex], isFavorite: true };
      const result = await window.electronAPI.updateBook(bookId, bookToUpdate);
      if (result.success) {
        showToastNotification(window.t('messages.addedToFavorites'));
        await loadBooksAndRender(); // Para atualizar a UI da lista de favoritos e outras dependências
      } else {
        alert(`${window.t('messages.errorCommunication')} ${result.error || 'Erro desconhecido.'}`);
      }
    } else {
      alert(window.t('messages.bookNotFound'));
    }
  } catch (error) {
    console.error('[RENDERER_DEBUG] Erro ao chamar updateBook IPC para favoritar:', error);
    alert(`${window.t('messages.errorCommunication')} ${error.message}`);
  }
  // saveBooks(books); // Removido
  // renderFavorites(); // Removido, loadBooksAndRender cuida disso
}

// Função para remover favorito
async function removeFromFavorites(bookId) { // Tornar async
  // const books = getBooks(); // Será await
  // const index = books.findIndex(b => b.id == bookId);
  console.log(`[RENDERER_DEBUG] removeFromFavorites: Tentando desfavoritar livro ID ${bookId}`);
  try {
    const books = await getBooks(); // USAR AWAIT
    const bookIndex = books.findIndex(b => String(b.id) === String(bookId));

    if (bookIndex !== -1) {
      const bookToUpdate = { ...books[bookIndex], isFavorite: false };
      const result = await window.electronAPI.updateBook(bookId, bookToUpdate);
      if (result.success) {
        showToastNotification(window.t('messages.removedFromFavorites'));
        await loadBooksAndRender();
      } else {
        alert(`${window.t('messages.errorCommunication')} ${result.error || 'Erro desconhecido.'}`);
      }
    } else {
      alert(window.t('messages.bookNotFound'));
    }
  } catch (error) {
    console.error('[RENDERER_DEBUG] Erro ao chamar updateBook IPC para desfavoritar:', error);
    alert(`${window.t('messages.errorCommunication')} ${error.message}`);
  }
  // saveBooks(books); // Removido
  // renderFavorites(); // Removido
}

// Função para carregar livros (agora do main process via IPC)
async function getBooks() {
  if (!window.electronAPI || !window.electronAPI.getAllBooks) {
    log('error', 'RENDERER', 'window.electronAPI.getAllBooks não está disponível');
    return []; 
  }
  
  try {
    log('debug', 'RENDERER', 'Solicitando livros via IPC');
    
    const result = await window.electronAPI.getAllBooks();
    if (result && result.success) {
      log('debug', 'RENDERER', 'Livros recebidos via IPC', { count: result.data ? result.data.length : 0 });
      return result.data || [];
    } else {
      log('error', 'RENDERER', 'Falha ao obter livros via IPC', { error: result ? result.error : 'Resultado indefinido' });
      return [];
    }
  } catch (error) {
    log('error', 'RENDERER', 'Erro ao chamar window.electronAPI.getAllBooks', { error: error.message });
    return [];
  }
}

// Função para carregar livros da store e renderizar (reutilizável)
async function loadBooksAndRender() {
  try {
    log('debug', 'RENDERER', 'INÍCIO loadBooksAndRender');
    
    if (!window.electronAPI || !window.electronAPI.getAllBooks) {
      log('error', 'RENDERER', 'window.electronAPI.getAllBooks não está disponível');
      alert('Erro crítico: A funcionalidade de obter livros não está disponível.');
      return;
    }
    log('debug', 'RENDERER', 'Chamando window.electronAPI.getAllBooks');
    
    const result = await window.electronAPI.getAllBooks();
    
    log('debug', 'RENDERER', 'Resultado getAllBooks', {
      success: result?.success,
      dataLength: result?.data?.length,
      dataType: typeof result?.data,
      isArray: Array.isArray(result?.data),
      firstTwoBooks: result?.data && result.data.length > 0 ? result.data.slice(0, 2) : null
    });

    if (result && result.success) {
      const loadedBooks = result.data || [];
      log('debug', 'RENDERER', 'Livros carregados do store', { count: loadedBooks.length });
      
      // A renderização agora depende da página ativa.
      const currentPage = document.querySelector('.content-page.active');
      const currentPageId = currentPage ? currentPage.id : null;
      log('debug', 'RENDERER', 'Página ativa detectada', { pageId: currentPageId });

      if (currentPageId === 'book-list') { // Use os IDs corretos aqui (book-list, my-books, etc.)
        log('debug', 'RENDERER', 'Renderizando página book-list');
        await renderBookCards();
      } else if (currentPageId === 'my-books') {
        log('debug', 'RENDERER', 'Renderizando página my-books');
        await renderMyBooksContent(loadedBooks); // Passa os livros carregados
        log('debug', 'RENDERER', 'renderMyBooksContent concluída');
      } else if (currentPageId === 'favorites') {
        log('debug', 'RENDERER', 'Renderizando página favorites');
        renderFavorites();
      } else if (currentPageId === 'settings') {
        log('debug', 'RENDERER', 'Configurando página settings');
      } else if (currentPageId === 'add-books') {
         log('debug', 'RENDERER', 'Configurando página add-books');
         const addBookForm = document.getElementById('add-book-form');
         if (addBookForm) addBookForm.reset();
      } else if (currentPageId === 'about') {
          log('debug', 'RENDERER', 'Configurando página about');
           setupAboutPageLinks();
      } else if (currentPageId === 'help') {
          log('debug', 'RENDERER', 'Configurando página help');
      } else {
          log('warn', 'RENDERER', 'Nenhuma página ativa conhecida', { pageId: currentPageId });
      }
      
      // Atualizar estatísticas e contador global INDEPENDENTE da página específica de livros
      log('debug', 'RENDERER', 'Atualizando estatísticas de leitura');
      await updateReadingStats(loadedBooks); 
      log('debug', 'RENDERER', 'Atualizando contador global de livros');
      updateBooksCount(loadedBooks); // Este atualiza o contador global

    } else { 
      log('error', 'RENDERER', 'Falha ao carregar livros do store', { error: result ? result.error : 'Resultado indefinido' });
      alert(`Erro ao carregar livros: ${result ? result.error : 'Erro desconhecido'}. Tente reiniciar o aplicativo.`);
    }
  } catch (error) {
    log('error', 'RENDERER', 'Erro catastrófico em loadBooksAndRender', { error: error.message });
    alert(`Erro crítico ao carregar dados dos livros: ${error.message}`);
  }
   log('debug', 'RENDERER', 'FIM loadBooksAndRender');
}

// Função para atualizar estatísticas de leitura
async function updateReadingStats(currentBooks) {
  try {
    log('debug', 'RENDERER', 'Iniciando atualização das estatísticas');
    const booksToProcess = currentBooks || await getBooks();
    if (!booksToProcess || booksToProcess.length === 0) {
      // Zerar todos os campos se não houver livros
      document.getElementById('total-books').textContent = '0';
      document.getElementById('completed-books').textContent = '0';
      document.getElementById('reading-books').textContent = '0';
      document.getElementById('total-pages-read').textContent = '0';
      document.getElementById('most-recent-book').textContent = '-';
      document.getElementById('overall-progress-fill').style.width = '0%';
      document.getElementById('overall-percentage').textContent = '0';
      // Último livro sorteado
      log('info', 'RENDERER', 'Nenhum livro para estatísticas. Zerando UI');
      const lastDrawnSection = document.getElementById('last-book-section'); // Assumindo ID do contêiner da seção
      if(lastDrawnSection) lastDrawnSection.dataset.currentBookId = ''; // Limpa o ID

      document.getElementById('last-book-cover').src = 'assets/default-cover.png';
      document.getElementById('last-book-title').textContent = window.t('pages.bookDraw.noBookDrawn');
      document.getElementById('last-book-author').textContent = '-';
      document.getElementById('last-book-pages-read').textContent = '0';
      document.getElementById('last-book-total-pages').textContent = '0';
      document.getElementById('last-book-date').textContent = 'Data do último sorteio: -';
      return;
    }

    // Estatísticas globais
    const totalBooks = booksToProcess.length;
    const completedBooks = booksToProcess.filter(b => b.status === 'Concluído').length;
    const readingBooks = booksToProcess.filter(b => b.status === 'Lendo').length;
    const totalPages = booksToProcess.reduce((acc, b) => acc + (b.pages || 0), 0);
    const totalPagesRead = booksToProcess.reduce((acc, b) => acc + (b.paginasLidas || 0), 0);

    // Livro mais recente (último sorteado)
    let mostRecentBook = null;
    let mostRecentDate = null;
    booksToProcess.forEach(b => {
      if (b.lastSelectedDate) {
        const d = new Date(b.lastSelectedDate);
        if (!mostRecentDate || d > mostRecentDate) {
          mostRecentDate = d;
          mostRecentBook = b;
        }
      }
    });

    log('debug', 'RENDERER', 'Livro mais recente identificado', {
      book: mostRecentBook ? mostRecentBook.title : null,
      paginasLidas: mostRecentBook ? mostRecentBook.paginasLidas : null,
      totalPages: mostRecentBook ? mostRecentBook.pages : null
    });
    if (mostRecentBook) {
        // Armazenar o ID do livro mais recente em um data attribute
        const lastDrawnSection = document.getElementById('last-book-section'); // Assumindo ID do contêiner da seção
         if(lastDrawnSection) lastDrawnSection.dataset.currentBookId = mostRecentBook.id;
         log('debug', 'RENDERER', 'ID do livro mais recente armazenado', { bookId: mostRecentBook.id });
    }

    // Progresso geral
    const progressPercent = totalPages > 0 ? Math.round((totalPagesRead / totalPages) * 100) : 0;

    // Atualizar elementos da UI
    document.getElementById('total-books').textContent = totalBooks;
    document.getElementById('completed-books').textContent = completedBooks;
    document.getElementById('reading-books').textContent = readingBooks;
    document.getElementById('total-pages-read').textContent = totalPagesRead;
    document.getElementById('overall-progress-fill').style.width = progressPercent + '%';
    document.getElementById('overall-percentage').textContent = progressPercent;
    document.getElementById('most-recent-book').textContent = mostRecentBook ? mostRecentBook.title : '-';

    // Atualizar seção do último livro sorteado
    if (mostRecentBook) {
      document.getElementById('last-book-cover').src = mostRecentBook.cover || 'assets/default-cover.png';
      document.getElementById('last-book-title').textContent = mostRecentBook.title;
      document.getElementById('last-book-author').textContent = mostRecentBook.author;
      document.getElementById('last-book-pages-read').textContent = mostRecentBook.paginasLidas || 0; // <--- Esta linha atualiza as páginas lidas
      document.getElementById('last-book-total-pages').textContent = mostRecentBook.pages || 0;
      document.getElementById('last-book-date').textContent = 'Data do último sorteio: ' + (mostRecentBook.lastSelectedDate ? formatDate(new Date(mostRecentBook.lastSelectedDate)) : '-');
    } else {
      // Já tratado no início do if/else principal
    }
  } catch (error) {
    log('error', 'RENDERER', 'Erro em updateReadingStats', { error: error.message });
  }
}

// Função para mostrar uma página específica e esconder as outras
async function showPage(pageId) {
  const pages = document.querySelectorAll('.content-page');

  // Primeiro, remova a classe 'active' de TODAS as páginas
  pages.forEach(page => {
    page.classList.remove('active');
  });

  // Segundo, encontrar a página alvo e ativá-la
  let targetPage = document.getElementById(pageId);

  if (!targetPage) {
    log('error', 'RENDERER', `Página com ID "${pageId}" não encontrada!`);
    return;
  }

  targetPage.classList.add('active');
  log('info', 'RENDERER', `Página "${pageId}" ativada`);

  // Terceiro, carregar e renderizar o conteúdo específico da página alvo
  log('debug', 'RENDERER', `Verificando conteúdo para ${pageId}`);

  if (pageId === 'book-list') {
    log('debug', 'RENDERER', `Carregando conteúdo para ${pageId} (Sorteio)`);
    updateReadingStats();
  } else if (pageId === 'my-books') {
    try {
        const result = await window.electronAPI.getAllBooks();
        if (result && result.success && Array.isArray(result.data)) {
            log('debug', 'RENDERER', `${result.data.length} livros carregados para renderização`);
            await renderMyBooksContent(result.data);
            log('debug', 'RENDERER', 'renderMyBooksContent concluída');
        } else {
            log('error', 'RENDERER', 'Falha ao obter livros do store ou dados inválidos');
            await renderMyBooksContent([]);
        }
    } catch (error) {
        log('error', 'RENDERER', 'Erro ao carregar livros para Meus Livros', error);
        await renderMyBooksContent([]);
    }
  } else if (pageId === 'favorites') {
    log('debug', 'RENDERER', `Renderizando ${pageId} (Favoritos)`);
    renderFavorites();
  } else if (pageId === 'add-books') {
    // Página simples - sem log necessário
  } else if (pageId === 'settings') {
    // Página simples - sem log necessário
  } else if (pageId === 'about') {
    // Página simples - sem log necessário
  } else if (pageId === 'help') {
    // Página simples - sem log necessário
  }

  updateActiveSidebarItem(pageId);
  log('info', 'RENDERER', `Página ${pageId} exibida com sucesso`);
}




async function initUI() { // Tornar initUI async
  console.log('[RENDERER_DEBUG] initUI: Inicializando UI...');

  // Configurar a página inicial para ser a página de Sorteio de Livros (page-sorteio)
  // A renderização inicial dos cards será feita pela primeira chamada a showPage
  // showPage('page-sorteio'); // Chamada movida para o final do DOMContentLoaded

  // Configurar o toggle de Dark Mode
  initDarkModeToggle();

  // Configurar links da página Sobre
  setupAboutPageLinks();

  // Configurar dropdown de ordenação na página Meus Livros
  setupSortDropdown();

  // ADICIONAR: Configurar event listeners para botões de configuração
  setupConfigurationButtons();
  
  // Configurar event listeners para botões de formato
  setupFormatButtons();

 // Event listener do botão Atualizar páginas
document.getElementById('update-pages-btn').addEventListener('click', async (e) => {
    e.preventDefault();
    
    const paginasLidasInput = document.getElementById('pages-read-input');
    const paginasLidas = parseInt(paginasLidasInput.value);
    
    if (isNaN(paginasLidas) || paginasLidas < 0) {
        showToastNotification(window.t('messages.invalidPageNumber'), 'error');
        return;
    }
    
    // Obter o ID do livro sorteado do data attribute
    const lastDrawnSection = document.getElementById('last-book-section');
    const bookIdToUpdate = lastDrawnSection ? lastDrawnSection.dataset.currentBookId : null;

    if (!bookIdToUpdate) {
        showToastNotification('Erro: Não foi possível identificar o livro sorteado para atualizar.', 'error');
        log('error', 'RENDERER', 'ID do livro sorteado não encontrado');
        return;
    }

    // Buscar o livro específico para obter os dados completos antes de atualizar
    const books = await getBooks();
    const bookToUpdate = books.find(book => String(book.id) === String(bookIdToUpdate));

    if (!bookToUpdate) {
         showToastNotification('Erro: Livro sorteado não encontrado na lista atual.', 'error');
         log('error', 'RENDERER', `Livro com ID ${bookIdToUpdate} não encontrado`);
         return;
    }

    // Calcular o total de páginas lidas após a adição
    const paginasLidasAtuais = bookToUpdate.paginasLidas || 0;
    const novoTotalPaginasLidas = paginasLidasAtuais + paginasLidas;

    // Validar se o novo total não ultrapassa o total de páginas do livro
    if (novoTotalPaginasLidas > bookToUpdate.pages) {
        const paginasRestantes = bookToUpdate.pages - paginasLidasAtuais;
        showToastNotification(window.t('messages.pageUpdateLimit', { paginasRestantes: paginasRestantes, totalPaginas: bookToUpdate.pages, paginasLidas: paginasLidasAtuais }), 5000);
        return;
    }
    
    const updatedBook = {
        ...bookToUpdate, // Manter todos os outros dados existentes
        status: novoTotalPaginasLidas === bookToUpdate.pages ? 'Concluído' : bookToUpdate.status, // Atualizar status se concluído
        paginasLidas: novoTotalPaginasLidas // Usar o novo total calculado
    };
    
    try {
        const result = await window.electronAPI.updateBook(bookIdToUpdate, updatedBook);
        if (result.success) {
            const updatedBooksList = await getBooks();
            await updateReadingStats(updatedBooksList);
            showToastNotification(window.t('messages.pagesReadUpdated'), 'success');
            paginasLidasInput.value = '';
        } else {
            showToastNotification(window.t('messages.errorUpdatingPagesRead'), 'error');
        }
    } catch (error) {
        log('error', 'RENDERER', window.t('messages.errorUpdatingPagesRead'), error);
        showToastNotification(window.t('messages.errorUpdatingPagesRead'), 'error');
    }
});

  // Variável de controle do dropdown de ordenação (escopo mais amplo)
  let isDropdownOpen = false;

  // Event listeners do dropdown de ordenação
  const sortDropdown = document.getElementById('sort-dropdown');
  if (sortDropdown) {
    sortDropdown.addEventListener('click', async (e) => {
      const sortOption = e.target.closest('.sort-option');
      if (sortOption) {
        e.preventDefault();
        const sortType = sortOption.dataset.sort;
        log('debug', 'RENDERER', `Ordenação selecionada: ${sortType}`);
        setSortPreference(sortType);
        sortDropdown.style.display = 'none';
        isDropdownOpen = false;
        await loadBooksAndRender();
      }
    });
  } else {
    log('warn', 'RENDERER', 'Elemento sort-dropdown não encontrado');
  }

  // Event listener para o botão Ordenar
  const sortBooksBtn = document.getElementById('sort-books-btn');
  if (sortBooksBtn) {
    sortBooksBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const sortDropdown = document.getElementById('sort-dropdown');
      if (sortDropdown) {
        isDropdownOpen = !isDropdownOpen;
        sortDropdown.style.display = isDropdownOpen ? 'block' : 'none';
        console.log(`[RENDERER_DEBUG] Dropdown de ordenação ${isDropdownOpen ? 'aberto' : 'fechado'}`);
      }
    });
    
    // Fechar dropdown ao clicar fora
    document.addEventListener('click', (e) => {
      const sortDropdown = document.getElementById('sort-dropdown');
      if (sortDropdown && isDropdownOpen && !sortBooksBtn.contains(e.target) && !sortDropdown.contains(e.target)) {
        sortDropdown.style.display = 'none';
        isDropdownOpen = false;
        console.log('[RENDERER_DEBUG] Dropdown de ordenação fechado (clique fora)');
      }
    });
    
    console.log('[RENDERER_DEBUG] initUI: Listener para sort-books-btn adicionado.');
  } else {
    console.warn('[RENDERER_DEBUG] initUI: Elemento #sort-books-btn não encontrado.');
  }

  // REMOVER: Carregar e renderizar livros (isso será feito agora dentro de showPage) // verde: Comentário existente, manter
  // await loadBooksAndRender(); // verde: Linha comentada existente, manter
  console.log('[RENDERER_DEBUG] initUI: Removida chamada inicial de loadBooksAndRender.'); // verde: Linha de log existente, manter
  // Exibir a página inicial (definida acima como page-sorteio)
  // A chamada final a showPage foi movida para o listener DOMContentLoaded
  // showPage('page-sorteio'); // Removida

  // Adicionar listeners para foco/blur da janela (MANTIDO)
  window.addEventListener('focus', () => {
    console.log("DEBUG: Janela do Electron ganhou foco.");
    console.log("DEBUG: Elemento focado após ganhar foco:", document.activeElement);
  });

  window.addEventListener('blur', () => {
    console.log("DEBUG: Janela do Electron perdeu foco.");
  });

  console.log("DEBUG: Listeners de foco/blur da janela adicionados.");

  // Add event listeners for navigation clicks
  const sidebar = document.getElementById('sidebar');
  if (sidebar) {
      console.log("[RENDERER_DEBUG] initUI: Sidebar encontrada. Adicionando listener de clique.");
      sidebar.addEventListener('click', async (event) => {
          console.log("[RENDERER_DEBUG] sidebar click listener: Clique detectado na sidebar.");
          console.log("[RENDERER_DEBUG] sidebar click listener: Event target:", event.target);
          // Implement delegation logic here
          // Find the closest ancestor <a> or element with a data-page attribute
          const targetLink = event.target.closest('a[data-page], [data-page]');

          if (targetLink) {
              event.preventDefault(); // Prevent default link behavior
              const pageId = targetLink.dataset.page;
              console.log(`[RENDERER_DEBUG] sidebar click listener: Elemento de navegação encontrado. Page ID: ${pageId}`);
              if (pageId) {
                  try {
                      console.log(`[RENDERER_DEBUG] sidebar click listener: Chamando showPage para ${pageId}`);
                      await showPage(pageId);
                      console.log(`[RENDERER_DEBUG] sidebar click listener: showPage para ${pageId} concluída.`);
                  } catch (error) {
                      console.error(`[RENDERER_DEBUG] sidebar click listener: Erro ao chamar showPage para ${pageId}:`, error);
                  }
              } else {
                   console.log("[RENDERER_DEBUG] sidebar click listener: Elemento encontrado, mas sem data-page attribute.");
              }
          } else {
              console.log("[RENDERER_DEBUG] sidebar click listener: Nenhum elemento de navegação (a[data-page] ou [data-page]) encontrado no caminho do clique.");
          }
      });
  } else {
      console.log("[RENDERER_DEBUG] initUI: Sidebar #sidebar NÃO encontrada.");
  }

  console.log('[RENDERER_DEBUG] initUI concluída.');
}

// MIGRAÇÃO AUTOMÁTICA DE LIVROS DO LOCALSTORAGE PARA ELECTRON-STORE (IPC)
// Este bloco pode ser removido após a primeira execução bem-sucedida em produção.
async function migrateLocalStorageBooksToStore() {
  // 1. Buscar livros antigos do localStorage
  const localBooksRaw = localStorage.getItem('library-books');
  if (!localBooksRaw) return; // Nada para migrar

  let localBooks;
  try {
    localBooks = JSON.parse(localBooksRaw);
    if (!Array.isArray(localBooks) || localBooks.length === 0) return;
  } catch (e) {
    console.warn('Falha ao ler livros do localStorage:', e);
    return;
  }

  // 2. Buscar livros já existentes no electron-store
  let storeBooks = [];
  if (window.electronAPI && window.electronAPI.getAllBooks) {
    const result = await window.electronAPI.getAllBooks();
    if (result && result.success && Array.isArray(result.data)) {
      storeBooks = result.data;
    }
  }

  // 3. Migrar apenas livros que não existem no store (por título e autor)
  let migrados = 0;
  for (const book of localBooks) {
    const exists = storeBooks.some(
      b => b.title === book.title && b.author === book.author
    );
    if (!exists) {
      await window.electronAPI.addBookToStore({
        title: book.title,
        author: book.author,
        pages: book.pages,
        status: book.status || 'Não Lido',
        lastSelectedDate: book.lastSelectedDate || null,
        paginasLidas: book.paginasLidas || 0
      });
      migrados++;
    }
  }

  // 4. Limpar o localStorage para evitar duplicidade
  localStorage.removeItem('library-books');
  if (migrados > 0) {
    alert('Livros antigos migrados com sucesso!');
  }
}

// Iniciar a aplicação quando o conteúdo for carregado
document.addEventListener('DOMContentLoaded', async () => { // Tornar async
  console.log('[RENDERER_DEBUG] DOMContentLoaded - Iniciando...');
  try {
    // Inicializar sistema de internacionalização
    await window.i18n.init();
    log('info', 'RENDERER', 'Sistema i18n inicializado');
    
    await migrateLocalStorageBooksToStore();
    await initUI(); // Aguarda initUI completar sua configuração
    console.log('[RENDERER_DEBUG] DOMContentLoaded - initUI concluído.');
    
    // Configurar listeners para fechar modais
  setupModalCloseListeners();
  
  // Configurar listener do formulário de edição
  setupEditBookFormListener();
  
  // Configurar listeners para mudança de idioma
  setupLanguageListeners();
  
  // Mostrar a página inicial (Sorteio de Livros) e carregar seus dados AGORA AQUI
  await showPage('book-list'); // Chamar showPage aqui para garantir a renderização inicial após initUI
  console.log('[RENDERER_DEBUG] DOMContentLoaded - showPage inicial (page-sorteio) chamado. UI deve estar pronta.');
    
  } catch (error) {
    console.error('[RENDERER_DEBUG] Erro crítico durante DOMContentLoaded:', error);
    const body = document.querySelector('body');
    if (body) {
        body.innerHTML = '<h1 style="color: red; text-align: center; margin-top: 50px;">Erro Crítico ao Carregar a Aplicação. Verifique o console para mais detalhes.</h1>';
    }
  }
}); 

// Função para criar modal de erro customizado
function showCustomAlert(message, callback) {
  // Criar modal de alerta customizado
  const alertModal = document.createElement('div');
  alertModal.className = 'modal active';
  alertModal.id = 'custom-alert-modal';
  alertModal.style.zIndex = '2000'; // Z-index maior que o modal de edição
  
  alertModal.innerHTML = `
    <div class="modal-content" style="max-width: 400px; text-align: center;">
      <p style="margin-bottom: 1.5rem; font-size: 1rem;">${message}</p>
      <button class="btn btn-primary" id="alert-ok-btn" style="min-width: 80px;">OK</button>
    </div>
  `;
  
  document.body.appendChild(alertModal);
  
  // Focar no botão OK
  const okBtn = alertModal.querySelector('#alert-ok-btn');
  okBtn.focus();
  
  // Event listener para fechar o modal
  okBtn.addEventListener('click', () => {
    document.body.removeChild(alertModal);
    if (callback) callback();
  });
  
  // Fechar com Enter
  alertModal.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      okBtn.click();
    }
  });
}



// Atualizar a validação no formulário de edição
function setupEditBookFormListener() {
  const editForm = document.getElementById('edit-book-form');
  if (!editForm) {
    console.error('[RENDERER_DEBUG] setupEditBookFormListener: Formulário #edit-book-form não encontrado.');
    return;
  }
  
  editForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const bookId = document.getElementById('editBookId').value;
    const totalPages = parseInt(document.getElementById('editBookPages').value, 10);
    const paginasLidasInput = document.getElementById('editPaginasLidasInput');
    
    let paginasLidas = parseInt(paginasLidasInput.value, 10);
    if (isNaN(paginasLidas) || paginasLidas < 0) {
      showCustomAlert(window.t('messages.positivePageNumber'), () => {
        paginasLidasInput.focus();
        paginasLidasInput.select();
      });
      return;
    }
    if (paginasLidas > totalPages) {
      showCustomAlert(window.t('messages.pagesReadTooHigh'), () => {
        paginasLidasInput.focus();
        paginasLidasInput.select();
      });
      return;
    }
    
    let status = document.getElementById('editBookStatus').value;
    // Se páginas lidas == total e status não for 'Concluído', forçar status
    if (paginasLidas === totalPages && status !== 'Concluído') {
      status = 'Concluído';
    }
    
    const updatedBookData = {
      title: document.getElementById('editBookTitle').value,
      author: document.getElementById('editBookAuthor').value,
      pages: totalPages,
      status: status,
      cover: document.getElementById('editBookCover').value,
      paginasLidas: paginasLidas
    };
    
    console.log('[RENDERER_DEBUG] Dados do livro atualizados para submissão via IPC:', updatedBookData);
    
    try {
      const result = await window.electronAPI.updateBook(bookId, updatedBookData);
      if (result.success) {
        showToastNotification('Livro atualizado com sucesso!');
        // Fechar o modal corretamente
        const editModal = document.getElementById('edit-book-modal');
        if (editModal) {
          editModal.style.display = 'none';
        }
        await loadBooksAndRender();
      } else {
        showCustomAlert('Erro ao atualizar livro: ' + (result.message || result.error || 'Erro desconhecido.'));
      }
    } catch (error) {
      console.error('Erro ao chamar updateBook IPC:', error);
      showCustomAlert('Erro de comunicação ao atualizar livro.');
    }
  });
}

// Handler para o formulário de edição do modal 'edit-book-modal'
setupEditBookFormListener();

// Inicializar a busca na página "Meus Livros"
// ... existing code ...

// Função para atualizar o item ativo na sidebar (Versão Corrigida)
function updateActiveSidebarItem(activePageId) {
  console.log(`[RENDERER_DEBUG] updateActiveSidebarItem: Iniciando atualização para página ativa: ${activePageId}`);
  // Seleciona diretamente os elementos <li> dentro do menu de navegação
  const sidebarListItems = document.querySelectorAll('.sidebar-nav ul li');
  console.log(`[RENDERER_DEBUG] updateActiveSidebarItem: Encontrados ${sidebarListItems.length} itens <li> na sidebar.`);

  // Mapeamento explícito dos data-page (que estão nos links <a> dentro dos <li>)
  // para os IDs reais das páginas. Precisamos manter este mapeamento.
  const pageIdMap = {
    'book-list': 'book-list-page',
    'my-books': 'page-my-books', // Exceção à regra '-page'
    'favorites': 'favorites-page',
    'settings': 'settings-page',
    'add-books': 'add-books-page',
    'about': 'about-page', // Assumindo que 'Sobre' tem data-page="about" e ID "about-page"
    'help': 'help-page' // Assumindo que 'Ajuda' tem data-page="help" e ID "help-page"
    // Adicione outros conforme necessário
  };

  sidebarListItems.forEach((listItem, index) => {
    // Encontra o link <a> dentro do item <li> atual
    const link = listItem.querySelector('a');
    if (!link) {
        console.warn(`[RENDERER_DEBUG] updateActiveSidebarItem: Item <li> ${index + 1} não contém um link <a>.`);
        return; // Pula para o próximo item se não houver link
    }

    const itemPageKey = link.dataset.page; // Obtém o data-page do link <a>
    const expectedPageId = pageIdMap[itemPageKey] || (itemPageKey + '-page'); // Obtém o ID da página esperado
    const itemText = link.textContent.trim(); // Para facilitar a identificação no log
    const hasActiveClassBefore = listItem.classList.contains('active');

    console.log(`[RENDERER_DEBUG] updateActiveSidebarItem: Processando item ${index + 1}: "${itemText}" (data-page="${itemPageKey}")`);
    console.log(`  -> ID de página esperado: ${expectedPageId}`);
    console.log(`  -> Página ativa atual: ${activePageId}`);
    console.log(`  -> Item <li> TEM classe 'active' antes? ${hasActiveClassBefore}`);

    const isActive = (expectedPageId === activePageId);

    if (isActive) {
      listItem.classList.add('active');
      console.log(`  -> Match encontrado (${expectedPageId} === ${activePageId}). Adicionando classe 'active' ao <li>.`);
    } else {
      listItem.classList.remove('active');
      console.log(`  -> Sem match. Removendo classe 'active' do <li>.`);
    }
     const hasActiveClassAfter = listItem.classList.contains('active');
     console.log(`  -> Item <li> TEM classe 'active' depois? ${hasActiveClassAfter}`);
  });
  console.log('[RENDERER_DEBUG] updateActiveSidebarItem: FIM da atualização de classes.');
}

// Handler para o formulário de adição de livros (add-book-form)
const addBookForm = document.getElementById('add-book-form');
if (addBookForm) {
  addBookForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const title = event.target.querySelector('#book-title').value;
    const author = event.target.querySelector('#book-author').value;
    const pages = event.target.querySelector('#book-pages').value;
    const status = event.target.querySelector('#book-status').value;

    try {
      const result = await window.electronAPI.addBookToStore({
        title,
        author,
        pages: parseInt(pages, 10),
        status
      });
      if (result.success) {
        showToastNotification('Livro adicionado com sucesso!');
        event.target.reset();
      } else {
        alert('Erro ao adicionar livro: ' + (result.error || 'Erro desconhecido.'));
      }
    } catch (error) {
      alert('Erro de comunicação ao adicionar livro: ' + error.message);
    }
  });
}

// Função global para exibir notificações toast
function showToastNotification(message, type = 'info') {
  // Criar elemento de toast se não existir
  let toast = document.getElementById('toast-notification');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast-notification';
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 15px 20px;
      border-radius: 5px;
      color: white;
      font-weight: bold;
      z-index: 10000;
      opacity: 0;
      transition: opacity 0.3s ease;
    `;
    document.body.appendChild(toast);
  }
  
  // Definir cor baseada no tipo
  const colors = {
    success: '#4CAF50',
    error: '#f44336',
    info: '#2196F3',
    warning: '#ff9800'
  };
  
  toast.style.backgroundColor = colors[type] || colors.info;
  toast.textContent = message;
  toast.style.opacity = '1';
  
  // Remover após 3 segundos
  setTimeout(() => {
    toast.style.opacity = '0';
  }, 3000);
}

// ... existing code before setupSortDropdown ...

function getSortPreference() {
  return localStorage.getItem('myBooksSort') || 'title-asc';
}
function setSortPreference(pref) {
  localStorage.setItem('myBooksSort', pref);
}
function sortBooks(books, sortType) {
  const sorted = [...books];
  switch (sortType) {
    case 'title-asc':
      sorted.sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'));
      break;
    case 'title-desc':
      sorted.sort((a, b) => b.title.localeCompare(a.title, 'pt-BR'));
      break;
    case 'author-asc':
      sorted.sort((a, b) => a.author.localeCompare(b.author, 'pt-BR') || a.title.localeCompare(b.title, 'pt-BR'));
      break;
    case 'date-desc':
      sorted.sort((a, b) => {
        const da = new Date(a.addedDate || a.dateAdded || 0);
        const db = new Date(b.addedDate || b.dateAdded || 0);
        return db - da;
      });
      break;
    default:
      break;
  }
  return sorted;
}
// Dropdown de ordenação
function setupSortDropdown() {
  // Removed the event listener for the sort button from here.
  const dropdown = document.getElementById('sort-dropdown');
  if (!dropdown) return;
  
  // Este listener será movido para initUI
  // document.addEventListener('click', (e) => {
  //   if (!dropdown.contains(e.target) && e.target !== sortBtn) {
  //     dropdown.style.display = 'none';
  //   }
  // });
  
  // REMOVENDO: Listeners das opções de ordenação (agora em initUI)
  // dropdown.querySelectorAll('.sort-option').forEach(btn => {
  //   btn.addEventListener('click', () => {
  //     setSortPreference(btn.dataset.sort);
  //     dropdown.style.display = 'none';
  //     loadBooksAndRender();
  //   });
  // });
}

// Nova função para configurar listeners para os controles da página "Meus Livros"
// Chamada APENAS quando os controles são criados
// O parâmetro 'container' é mantido, mas os seletores agora buscam a partir do document para robustez.
function setupMyBooksControls(container) {
  console.log('[RENDERER_DEBUG] setupMyBooksControls: Iniciando configuração de listeners para controles.'); // Log de início da função
  
  // Buscar os elementos diretamente a partir do document para garantir que sejam encontrados
  const selectAllCheckbox = document.querySelector('#select-all-books-checkbox'); // Buscar do document
  const deleteSelectedBtn = document.querySelector('#delete-selected-books-btn');   // Buscar do document
  const booksGrid = document.querySelector('.books-grid-my-books'); // Já buscava do document

  // Adicionar logs para verificar se os elementos são encontrados
  console.log('[RENDERER_DEBUG] setupMyBooksControls: selectAllCheckbox encontrado?', !!selectAllCheckbox);
  console.log('[RENDERER_DEBUG] setupMyBooksControls: deleteSelectedBtn encontrado?', !!deleteSelectedBtn);
  console.log('[RENDERER_DEBUG] setupMyBooksControls: booksGrid encontrado?', !!booksGrid); // Log de booksGrid

  // Adicionar verificação: Se algum elemento essencial não for encontrado, logar erro e sair
  if (!selectAllCheckbox || !deleteSelectedBtn || !booksGrid) {
      console.error('[RENDERER_DEBUG] setupMyBooksControls: ERRO CRÍTICO - Elementos essenciais de controle não encontrados. Não é possível configurar listeners.');
      // Opcional: Mostrar um alerta para o usuário se a falha for grave
      // alert('Erro interno: Controles da página "Meus Livros" não puderam ser configurados.');
      return; // Sair da função se os elementos não forem encontrados
  }


  if (selectAllCheckbox) {
    selectAllCheckbox.removeEventListener('change', handleSelectAll); // Remover listener anterior se houver
    selectAllCheckbox.addEventListener('change', handleSelectAll); // Adicionar novo
     console.log('[RENDERER_DEBUG] setupMyBooksControls: Listener para select-all-books-checkbox adicionado.');
  }

  if (deleteSelectedBtn) {
     deleteSelectedBtn.removeEventListener('click', handleDeleteSelected); // Remover listener anterior se houver
    deleteSelectedBtn.addEventListener('click', handleDeleteSelected); // Adicionar novo
    console.log('[RENDERER_DEBUG] setupMyBooksControls: Listener para delete-selected-books-btn adicionado.');
  }

  // Implementar handlers (mantidos como estão, já com logs)
  function handleSelectAll() {
      console.log(`[RENDERER_DEBUG] handleSelectAll: Checkbox Selecionar Todos alterado. Novo estado: ${this.checked}`);
      // Agora 'this' DENTRO deste handler deve ser o selectAllCheckbox
      console.log('[RENDERER_DEBUG] handleSelectAll: O "this" é o checkbox?', this === selectAllCheckbox);
      
      // booksGrid é acessível pelo escopo da setupMyBooksControls, que o buscou do document
      console.log('[RENDERER_DEBUG] handleSelectAll: booksGrid está acessível no handler?', !!booksGrid);


      if (booksGrid) {
          const bookCheckboxes = booksGrid.querySelectorAll('.book-select-checkbox');
          console.log(`[RENDERER_DEBUG] handleSelectAll: Encontrados ${bookCheckboxes.length} checkboxes de livros individuais.`);
          bookCheckboxes.forEach(checkbox => {
              console.log(`[RENDERER_DEBUG] handleSelectAll: Atualizando checkbox do livro ID ${checkbox.dataset.id} para checked = ${this.checked}`);
              checkbox.checked = this.checked;
          });
           console.log('[RENDERER_DEBUG] handleSelectAll: Loop de atualização de checkboxes concluído.');
      } else {
          // Este else NUNCA deveria ser alcançado se a verificação inicial em setupMyBooksControls funcionar
          console.warn('[RENDERER_DEBUG] handleSelectAll: booksGrid não encontrado no handler. Não é possível selecionar livros.');
      }
  }

  async function handleDeleteSelected() {
      console.log('[RENDERER_DEBUG] handleDeleteSelected: Botão Excluir Selecionados clicado.');
      const selectedBookIds = [];
      if (booksGrid) { // booksGrid é acessível pelo escopo
          booksGrid.querySelectorAll('.book-select-checkbox:checked').forEach(checkbox => {
              selectedBookIds.push(checkbox.dataset.id);
          });
      }

      if (selectedBookIds.length === 0) {
          alert('Nenhum livro selecionado para exclusão.');
          return;
      }

      console.log('[RENDERER_DEBUG] handleDeleteSelected: IDs selecionados para exclusão:', selectedBookIds);
      // Remover esta confirmação para evitar duplicação
      await deleteSelectedBooks(selectedBookIds);
  }
   console.log('[RENDERER_DEBUG] setupMyBooksControls: FIM da configuração de listeners para controles.'); // Log de fim da função
}

// Nova função para configurar listeners para os cards de livros na página "Meus Livros" usando delegação
// Chamada sempre que os cards são renderizados (dentro de renderMyBooks)
function setupMyBooksCardListeners(booksGrid) {
     console.log('[RENDERER_DEBUG] setupMyBooksCardListeners: Configurando listeners para cards via delegação.');

    if (!booksGrid) {
        console.warn('[RENDERER_DEBUG] setupMyBooksCardListeners: booksGrid não encontrado.');
        return;
    }

    // Adicionando os listeners de status, editar e excluir diretamente AOS ELEMENTOS DENTRO DO GRID
    // Remove listeners anteriores antes de adicionar para evitar duplicação.
     booksGrid.querySelectorAll('.book-status').forEach(select => {
        select.removeEventListener('change', handleStatusChange); // Remover anterior
        select.addEventListener('change', handleStatusChange); // Adicionar novo
     });
      console.log('[RENDERER_DEBUG] setupMyBooksCardListeners: Listeners de status adicionados.');

     booksGrid.querySelectorAll('.btn-edit').forEach(button => {
        button.removeEventListener('click', handleEditClick); // Remover anterior
        button.addEventListener('click', handleEditClick); // Adicionar novo
     });
      console.log('[RENDERER_DEBUG] setupMyBooksCardListeners: Listeners de editar adicionados.');

      booksGrid.querySelectorAll('.btn-delete').forEach(button => {
        button.removeEventListener('click', handleDeleteClick); // Remover anterior
        button.addEventListener('click', handleDeleteClick); // Adicionar novo
     });
      console.log('[RENDERER_DEBUG] setupMyBooksCardListeners: Listeners de excluir adicionados.');

      // Listener para o ícone de favorito - Adicionar listener de clique diretamente
      booksGrid.querySelectorAll('.favorite-icon').forEach(icon => {
        icon.removeEventListener('click', handleFavoriteClick); // Remover anterior
        icon.addEventListener('click', handleFavoriteClick); // Adicionar novo
      });
       console.log('[RENDERER_DEBUG] setupMyBooksCardListeners: Listeners de favorito adicionados.');


    // Handlers nomeados para facilitar remoção
    async function handleStatusChange() {
        const bookId = this.dataset.id;
        const newStatus = this.value;
        console.log(`[DEBUG] handleStatusChange: Status alterado para ID ${bookId}: ${newStatus}. Chamando updateBook IPC.`);
        try {
            const books = await getBooks(); // Buscar livros atualizados
            const bookToUpdate = books.find(b => String(b.id) === String(bookId));
            if (bookToUpdate) {
                const updatedData = { ...bookToUpdate, status: newStatus };
                const result = await window.electronAPI.updateBook(bookId, updatedData);
                if (result.success) {
                    showToastNotification('Status do livro atualizado!');
                    await loadBooksAndRender(); // Re-renderizar
                } else {
                    alert(`Erro ao atualizar status: ${result.error || 'Erro desconhecido'}`);
                }
            } else {
                alert('Livro não encontrado para atualizar status.');
            }
        } catch (error) {
            console.error('[DEBUG] Erro ao chamar updateBook IPC para status:', error);
            alert(`Erro de comunicação ao atualizar status: ${error.message}`);
        }
    }

    async function handleEditClick() {
         const bookId = this.dataset.id;
         console.log(`[RENDERER_DEBUG] handleEditClick: Botão Editar clicado para ID ${bookId}.`);
         await editBookModal(bookId);
    }

    async function handleDeleteClick() {
        const bookId = this.dataset.id;
        console.log(`[RENDERER_DEBUG] handleDeleteClick: Botão Excluir clicado para ID ${bookId}.`);
        if (confirm('Tem certeza que deseja excluir este livro? Esta ação não pode ser desfeita!')) {
            await deleteBook(bookId);
        }
    }

     async function handleFavoriteClick() {
        const bookId = this.dataset.id;
        console.log(`[RENDERER_DEBUG] handleFavoriteClick: Ícone de favorito clicado para ID ${bookId}.`);
        const books = await getBooks();
        const book = books.find(b => String(b.id) === String(bookId));
        if (book) {
           if (book.isFavorite) {
               await removeFromFavorites(bookId);
           } else {
               await addToFavorites(bookId);
           }
        } else {
             console.warn('[RENDERER_DEBUG] handleFavoriteClick: Livro não encontrado para favoritar/desfavoritar ID:', bookId);
        }
    }

      console.log('[RENDERER_DEBUG] setupMyBooksCardListeners: FIM DA CONFIGURAÇÃO.');
}

// Função auxiliar para abrir o modal de edição (reutilizar lógica existente)
async function editBookModal(bookId) {
     console.log('[RENDERER_DEBUG] editBookModal: Abrindo modal para edição do livro ID:', bookId);
    await populateAndOpenEditModal(bookId);
}

// Renomeando a função original 'editBook' para ser mais descritiva sobre sua ação:
async function populateAndOpenEditModal(bookId) { // Antiga função editBook
  console.log(`[DEBUG] populateAndOpenEditModal: Abrindo modal para livro ID ${bookId}`);
  try {
    const books = await getBooks();
    const book = books.find(b => String(b.id) === String(bookId)); // Corrigido: b.id em vez de book.id

    if (!book) {
      console.error(`[DEBUG] populateAndOpenEditModal: Livro com ID ${bookId} não encontrado.`);
      showCustomAlert('Livro não encontrado para edição.');
      return;
    }

    // Populate the modal fields com os IDs corretos do HTML
    document.getElementById('editBookId').value = book.id;
    document.getElementById('editBookTitle').value = book.title;
    document.getElementById('editBookAuthor').value = book.author;
    document.getElementById('editBookPages').value = book.pages;
    document.getElementById('editPaginasLidasInput').value = book.paginasLidas || 0;
    document.getElementById('editBookStatus').value = book.status || 'Não Lido';
    document.getElementById('editBookCover').value = book.cover || '';

    // Show the modal
    const modal = document.getElementById('edit-book-modal');
    if (modal) {
      modal.style.display = 'block';
      modal.classList.add('active'); // Adicionar classe active para centralização
      console.log(`[DEBUG] populateAndOpenEditModal: Modal de edição exibido.`);
      
      // Garantir foco no primeiro campo após um pequeno delay
      setTimeout(() => {
        const firstInput = document.getElementById('editBookTitle');
        if (firstInput) {
          firstInput.focus();
          firstInput.select(); // Selecionar todo o texto para facilitar edição
          console.log("[DEBUG] populateAndOpenEditModal: Foco definido no campo título");
        }
      }, 150); // Aumentar delay para garantir que o modal esteja totalmente renderizado
    } else {
      console.error('[DEBUG] populateAndOpenEditModal: Modal #edit-book-modal não encontrado.');
    }

  } catch (error) {
    console.error('[DEBUG] Erro em populateAndOpenEditModal ao carregar livro:', error);
    showCustomAlert('Ocorreu um erro ao carregar os dados do livro para edição. Verifique o console.');
  }
}

// Integrar ordenação ao fluxo de renderização (Função renderMyBooks, AGORA CORRIGIDA)
async function renderMyBooksContent(booksToRender) { // <-- FUNÇÃO CORRIGIDA
  log('debug', 'RENDERER', 'renderMyBooksContent: INÍCIO DA EXECUÇÃO (CORRIGIDA). Livros para renderizar:', { count: booksToRender ? booksToRender.length : 0 });
    try { // TRY PRINCIPAL DA FUNÇÃO
  log('debug', 'RENDERER', 'renderMyBooksContent: Dados de livros recebidos', { count: booksToRender ? booksToRender.length : 0 });

  const myBooksContainer = document.getElementById('my-books-list');
  log('debug', 'RENDERER', 'renderMyBooksContent: Seletor do contêiner (#my-books-list) encontrado?', { found: !!myBooksContainer });

  if (!myBooksContainer) {
    log('error', 'RENDERER', 'renderMyBooksContent: Elemento my-books-list não encontrado! Não é possível renderizar.');
    return;
  }

  log('debug', 'RENDERER', 'renderMyBooksContent: Conteúdo inicial de #my-books-list antes de procurar booksGrid');

        // Buscar o booksGrid no documento ANTES de qualquer outra coisa na renderização dos cards
        const booksGrid = document.querySelector('.books-grid-my-books'); // Buscar a partir do documento inteiro

        if (!booksGrid) {
            log('error', 'RENDERER', 'renderMyBooksContent: Elemento .books-grid-my-books não encontrado no documento! Não é possível renderizar cards. VERIFICAR HTML ESTÁTICO!');
            return; // Sair da função se o grid estático não for encontrado
        }

    log('debug', 'RENDERER', 'renderMyBooksContent: Obtendo preferência de ordenação.');
    const sortType = getSortPreference();
    log('debug', 'RENDERER', 'renderMyBooksContent: Preferência de ordenação', { sortType });

    log('debug', 'RENDERER', 'renderMyBooksContent: Ordenando livros.');
    const sortedBooks = sortBooks(booksToRender, sortType);
    log('debug', 'RENDERER', 'renderMyBooksContent: Ordenação concluída', { count: sortedBooks ? sortedBooks.length : 0 });

    // Limpar o conteúdo ATUAL do grid (remover cards antigos)
    booksGrid.innerHTML = '';
    log('debug', 'RENDERER', 'renderMyBooksContent: Conteúdo do booksGrid existente limpo.');

        // Configurar listeners para os controles (Seletor Todos, Excluir)
        // Chamar setupMyBooksControls após confirmar que myBooksContainer E booksGrid foram encontrados.
        log('debug', 'RENDERER', 'renderMyBooksContent: Chamando setupMyBooksControls...');
        setupMyBooksControls(myBooksContainer); // CHAMA A FUNÇÃO AQUI E PASSA O CONTÊINER PAI CORRETO
        log('debug', 'RENDERER', 'renderMyBooksContent: Chamada para setupMyBooksControls concluída.');


    // Configurar listeners para o dropdown de ordenação - NÂO RECRIA O LISTENER DO BOTÂO AQUI
    setupSortDropdown(); // Configura listeners das opções DENTRO do dropdown, mas não do botão que o abre.

    // --- Renderizar os Livros no Grid ---
    log('debug', 'RENDERER', 'renderMyBooksContent: Iniciando renderização dos cards individuais de livros.');
    if (!sortedBooks || sortedBooks.length === 0) {
      log('debug', 'RENDERER', 'renderMyBooksContent: Nenhum livro para exibir. Mostrando mensagem de vazio.');
      const emptyMessage = document.createElement('div');
      emptyMessage.className = 'empty-books';
      emptyMessage.innerHTML = `<p>${window.t('messages.emptyMyBooks')}</p>`;
      booksGrid.appendChild(emptyMessage); // Anexar ao booksGrid
    } else {
      log('debug', 'RENDERER', 'renderMyBooksContent: Iterando sobre livros para renderizar', { count: sortedBooks.length });

      log('debug', 'RENDERER', 'renderMyBooksContent: Preparando para iniciar o loop forEach.');

            try { // TRY PARA O LOOP FOR EACH
        sortedBooks.forEach((book, index) => {
          log('debug', 'RENDERER', `renderMyBooksContent: Processando livro ${index + 1}/${sortedBooks.length}`, { id: book.id, title: book.title });

          const bookCard = document.createElement('div');
          bookCard.className = 'book-card-my-books';
          bookCard.dataset.id = book.id;

          // Checkbox de seleção (Agora criado DENTRO do card)
          const checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.className = 'book-select-checkbox';
          checkbox.dataset.id = book.id;

          // Ícone de favorito/desfavorito (Agora criado DENTRO do card)
          const favoriteIcon = document.createElement('span');
          favoriteIcon.className = `favorite-icon ${book.isFavorite ? 'favorited' : ''}`;
          favoriteIcon.innerHTML = book.isFavorite ? '&#9733;' : '&#9734;';
          favoriteIcon.dataset.id = book.id;
          favoriteIcon.style.cursor = 'pointer';

          bookCard.innerHTML = `
            <div class="book-info">
              <h3 class="book-title-my-books"><span class="icon-pin">📗</span> ${book.title}</h3>
              <p class="book-author-my-books"><span class="icon-user">✍️</span> ${book.author}</p>
              <p class="book-pages-my-books"><span class="icon-pages">📜</span> ${book.pages} ${window.t('modals.selectedBook.pages')}</p>
              <p class="book-read-pages"><span class="icon-pages">📃</span> ${book.paginasLidas || 0} ${window.t('status.pagesRead')}</p>
              <div class="status-dropdown">
                <label for="status-${book.id}"><span class="icon-status">🧠</span> Status:</label>
                <select id="status-${book.id}" class="book-status-select" data-id="${book.id}">
                  <option value="Não Lido" ${book.status === 'Não Lido' ? 'selected' : ''}>Não Lido</option>
                  <option value="Lendo" ${book.status === 'Lendo' ? 'selected' : ''}>Lendo</option>
                  <option value="Concluído" ${book.status === 'Concluído' ? 'selected' : ''}>Concluído</option>
                </select>
              </div>
              <p class="book-last-selected-my-books"><span class="icon-calendar">🗓️</span> Último sorteio: ${book.lastSelectedDate ? formatDate(new Date(book.lastSelectedDate)) : 'Nunca'}</p>
            </div>
            <div class="book-actions">
                <!-- Checkbox e Favorito serão adicionados via appendChild -->
                <button class="btn btn-secondary btn-edit" data-id="${book.id}">Editar</button>
                <button class="btn btn-danger btn-delete" data-id="${book.id}">Excluir</button>
            </div>
          `;

          const bookActionsDiv = bookCard.querySelector('.book-actions');
          if(bookActionsDiv) {
              bookActionsDiv.insertBefore(checkbox, bookActionsDiv.firstChild);
              bookActionsDiv.insertBefore(favoriteIcon, checkbox.nextSibling);
          }

          booksGrid.appendChild(bookCard); // Anexar o card ao booksGrid
        });

        // Configurar listeners para os cards individuais (Edit, Delete, Favorite, Status)
         setupMyBooksCardListeners(booksGrid); // Estes precisam ser re-configurados pois os cards são recriados.
         log('debug', 'RENDERER', 'renderMyBooksContent: Listeners de cards configurados APÓS LOOP.');

            } catch (loopError) { // CATCH PARA O LOOP FOR EACH
        log('error', 'RENDERER', 'renderMyBooksContent: Erro durante a iteração de renderização dos cards', { error: loopError.message });
         if(booksGrid) {
             booksGrid.innerHTML = '<p class="error-message">Ocorreu um erro ao exibir os detalhes dos livros.</p>';
         }
      }
    }

    // Atualizar o contador de livros específico da página "Meus Livros"
    log('debug', 'RENDERER', 'renderMyBooksContent: Atualizando contador de livros.');
    const booksCountSpan = document.getElementById('books-count');
    if (booksCountSpan) {
       booksCountSpan.textContent = `${sortedBooks ? sortedBooks.length : 0} ${window.t('pages.myBooks.booksCount')}`;
    }
     log('debug', 'RENDERER', 'renderMyBooksContent: Contador de livros atualizado.');

    } catch (error) { // CATCH PRINCIPAL DA FUNÇÃO (agora no final correto do try principal)
    log('error', 'RENDERER', 'renderMyBooksContent: Erro catastrófico na renderização', { error: error.message });
    if(myBooksContainer) {
       myBooksContainer.innerHTML = '<p class="error-message">Ocorreu um erro ao carregar ou exibir seus livros.</p>';
    }
  }
    log('debug', 'RENDERER', 'renderMyBooksContent: FIM DA EXECUÇÃO.');
}
// Este bloco de código completo (linhas 1564 a 1672) deve SUBSTITUIR
// o bloco myBooksPage.addEventListener('click', ...) existente no seu arquivo renderer.js.
// Ele inclui a lógica para o botão Ordenar com a flag anti-clique-duplo
// e as lógicas de delegação para os checkboxes e o botão Excluir Selecionados.

// Usar delegação de eventos para o botão de Ordenar na página Meus Livros
const myBooksPage = document.getElementById('page-my-books');
// Variável para controlar se o handler de ordenação está processando
let isSortingHandlerProcessing = false; // MANTER: Declara a flag (variável de controle) fora do listener para persistir o estado. Essencial para evitar cliques duplos.

if (myBooksPage) { // MANTER: Verifica se o elemento da página Meus Livros existe no DOM.
  // MANTER: Adiciona o listener de clique principal na página para usar delegação de eventos.
  // 'async' é mantido pois outras partes da delegação podem usar 'await'.
  myBooksPage.addEventListener('click', async (e) => {
    console.log('[RENDERER_DEBUG] Delegação de clique na página Meus Livros acionada.', e.target); // MANTER: Log para depuração: mostra que o listener foi acionado e onde.
    const sortBtn = e.target.closest('#sort-books-btn'); // MANTER: Usa delegação para encontrar o botão "Ordenar" se o clique ocorreu dentro dele.
    const sortDropdown = document.getElementById('sort-dropdown'); // MANTER: Obtém a referência para o elemento do dropdown de ordenação.
    console.log('[RENDERER_DEBUG] Delegação - Botão Ordenar detectado?', !!sortBtn); // MANTER: Log de depuração: confirma se o botão de ordenação foi clicado.
    console.log('[RENDERER_DEBUG] Delegação - Dropdown Ordenar encontrado?', !!sortDropdown); // MANTER: Log de depuração: confirma se o dropdown existe.

    // MANTER: Início do bloco principal que trata o clique no botão de ordenação.
    if (sortBtn && sortDropdown) {
        // MANTER: Início da verificação para evitar que cliques duplicados acionem a lógica mais de uma vez rapidamente.
        if (isSortingHandlerProcessing) {
            console.log('[RENDERER_DEBUG] Handler de Ordenação já em processamento. Ignorando clique duplicado.'); // MANTER: Log para indicar que um clique duplicado foi ignorado.
            return; // MANTER: Sai da função se a flag estiver true, ignorando o clique.
        }
        isSortingHandlerProcessing = true; // MANTER: Define a flag como true para indicar que a lógica de ordenação está em execução.
        // MANTER: Fim da verificação anti-clique-duplo.

        console.log('[RENDERER_DEBUG] Clique no botão Ordenar detectado via delegação. Manipulando dropdown...'); // MANTER: Log para confirmar que a manipulação do dropdown vai começar.
        // MANTER: Impede que o evento se propague para outros listeners no mesmo elemento ou ancestrais, reduzindo a chance de interrupção.
        e.stopImmediatePropagation();

        // MANTER: Obtém o estado de exibição real do dropdown, considerando CSS.
        const currentDisplay = window.getComputedStyle(sortDropdown).display;
        // MANTER: Verifica se o dropdown está visível (tem display 'block').
        const isDropdownVisible = currentDisplay === 'block';

        console.log('[RENDERER_DEBUG] Estado COMPUTADO atual do dropdown ANTES DA LÓGICA:', { isDropdownVisible, currentDisplay }); // MANTER: Log de depuração: mostra o estado detectado antes de mudar.

        // MANTER: Início da lógica para alternar a visibilidade do dropdown.
      if (!isDropdownVisible) {
          // MANTER: Bloco para MOSTRAR o dropdown.
          console.log('[RENDERER_DEBUG] *** MOSTRANDO DROPDOWN: Definindo display = "block" ***'); // MANTER: Log importante de depuração.
          sortDropdown.style.display = 'block'; // MANTER: Define o display como 'block' para tornar o dropdown visível.
        // Posicionar o dropdown corretamente APENAS ao mostrar
          const rect = sortBtn.getBoundingClientRect(); // MANTER: Obtém a posição e dimensões do botão para posicionar o dropdown.
          sortDropdown.style.position = 'absolute'; // MANTER: Garante que o dropdown está posicionado absolutamente para usar top/left.
          sortDropdown.style.left = rect.left + 'px'; // MANTER: Define a posição horizontal do dropdown.
          sortDropdown.style.top = (rect.bottom + window.scrollY) + 'px'; // MANTER: Define a posição vertical do dropdown abaixo do botão.
          sortDropdown.style.zIndex = '1010'; // MANTER: Define um z-index alto para garantir que o dropdown apareça sobre outros elementos.
          console.log('[RENDERER_DEBUG] Posicionamento aplicado:', { left: sortDropdown.style.left, top: sortDropdown.style.top, zIndex: sortDropdown.style.zIndex }); // MANTER: Log de depuração: mostra o posicionamento aplicado.
      } else {
          // MANTER: Bloco para ESCONDER o dropdown.
          console.log('[RENDERER_DEBUG] *** ESCONDENDO DROPDOWN: Definindo display = "none" ***'); // MANTER: Log importante de depuração.
          sortDropdown.style.display = 'none'; // MANTER: Define o display como 'none' para esconder o dropdown.
          // Opcional: Remover estilos de posicionamento ao esconder para limpar
          // MANTER (OPCIONALMENTE COMENTADO): Linhas para remover estilos de posicionamento se desejar limpá-los ao esconder.
          // sortDropdown.style.left = '';
          // sortDropdown.style.top = '';
          // sortDropdown.style.position = ''; // Pode ser removido se position: absolute estiver no CSS base
          // sortDropdown.style.zIndex = ''; // Pode ser removido se z-index estiver no CSS base
        }
        console.log('[RENDERER_DEBUG] Visibilidade FINAL definida EM ELEMENT.STYLE:', sortDropdown.style.display); // MANTER: Log de depuração: mostra o valor final do display definido inline.
         // Adicionar um pequeno log com delay para ver o estado um pouco depois
         // MANTER: Adiciona um log com atraso para verificar o estado computado um pouco após a mudança. Útil para depurar timing issues.
         setTimeout(() => {
              const displayAfterDelay = window.getComputedStyle(sortDropdown).display;
              console.log('[RENDERER_DEBUG] Estado COMPUTADO do dropdown APÓS PEQUENO DELAY:', displayAfterDelay);
         }, 100); // Delay de 100ms

        // Resetar a flag de processamento após um pequeno delay para permitir futuros cliques
        // MANTER: Adiciona um atraso antes de resetar a flag. Essencial para que a flag bloqueie múltiplos eventos rápidos.
        setTimeout(() => {
            isSortingHandlerProcessing = false; // MANTER: Reseta a flag para permitir que o handler seja acionado novamente no próximo clique real.
            console.log('[RENDERER_DEBUG] Handler de Ordenação pronto para próximo clique.'); // MANTER: Log para indicar que o handler está pronto.
        }, 200); // Delay um pouco maior que o log de delay para garantir que a lógica principal terminou
        // MANTER: Fim da lógica do botão Ordenar.

    } else { // MANTER: Este bloco 'else' trata cliques delegados que NÃO foram no botão de ordenação.
         // Se o clique não foi no botão de ordenação, pode ser para outra lógica de delegação
         // ou para fechar o dropdown clicando fora.
         // A lógica para fechar ao clicar fora já está em um listener separado no document.
         // Continuar para as outras lógicas de delegação (checkbox, delete) se sortBtn não foi clicado.

    // Delegação para o checkbox 'Selecionar Todos'
          const selectAllCheckbox = e.target.closest('#select-all-books-checkbox'); // MANTER: Encontra o checkbox "Selecionar Todos" se clicado.
          if (selectAllCheckbox) { // MANTER: Bloco de lógica se o checkbox "Selecionar Todos" foi clicado.
             console.log(`[RENDERER_DEBUG] initUI (Delegation): Checkbox Selecionar Todos alterado. Novo estado: ${selectAllCheckbox.checked}`); // MANTER: Log de depuração.
             const booksGrid = document.querySelector('.books-grid-my-books'); // MANTER: Encontra o contêiner dos cards de livros.
             if (booksGrid) { // MANTER: Verifica se o grid existe.
                 // MANTER: Itera sobre todos os checkboxes individuais dos livros dentro do grid.
           booksGrid.querySelectorAll('.book-select-checkbox').forEach(checkbox => {
                     // MANTER: Define o estado de cada checkbox individual para ser igual ao estado do checkbox "Selecionar Todos".
               checkbox.checked = selectAllCheckbox.checked;
           });
       }
    }

    // Delegação para o botão 'Excluir Selecionados'
          const deleteSelectedBtn = e.target.closest('#delete-selected-books-btn'); // MANTER: Encontra o botão "Excluir Selecionados" se clicado.
          if (deleteSelectedBtn) { // MANTER: Bloco de lógica se o botão "Excluir Selecionados" foi clicado.
              console.log('[RENDERER_DEBUG] initUI (Delegation): Botão Excluir Selecionados clicado.'); // MANTER: Log de depuração.
              const booksGrid = document.querySelector('.books-grid-my-books'); // MANTER: Encontra o contêiner dos cards de livros.
              const selectedBookIds = []; // MANTER: Array para armazenar os IDs dos livros selecionados.
              if (booksGrid) { // MANTER: Verifica se o grid existe.
                  // MANTER: Encontra todos os checkboxes individuais que estão marcados.
            booksGrid.querySelectorAll('.book-select-checkbox:checked').forEach(checkbox => {
                      // MANTER: Adiciona o ID do livro selecionado ao array.
                selectedBookIds.push(checkbox.dataset.id);
            });
        }

              if (selectedBookIds.length === 0) { // MANTER: Verifica se algum livro foi selecionado.
                  alert('Nenhum livro selecionado para exclusão.'); // MANTER: Alerta o usuário se nada foi selecionado.
                  return; // MANTER: Sai da função se não houver livros selecionados.
              }

              console.log('[RENDERER_DEBUG] initUI (Delegation): IDs selecionados para exclusão:', selectedBookIds); // MANTER: Log de depuração: mostra os IDs a serem excluídos.
              // Confirmação única aqui
              if (confirm(`Tem certeza que deseja excluir ${selectedBookIds.length} livro(s) selecionado(s)? Esta ação não pode ser desfeita!`)) {
                  deleteSelectedBooks(selectedBookIds); // MANTER: Chama a função para excluir os livros selecionados (assumindo que esta função está definida em outro lugar e lida com o IPC).
              }
          }
    }
    // MANTER: Fim do bloco 'else' que trata outras delegações.

  }); // MANTER: Fim do listener de clique delegado em myBooksPage.

    // MANTER: Este listener separado no documento lida com o fechamento do dropdown ao clicar fora dele.
    document.addEventListener('click', (e) => {
        const sortBtn = document.getElementById('sort-books-btn'); // MANTER: Obtém o botão de ordenação.
        const sortDropdown = document.getElementById('sort-dropdown'); // MANTER: Obtém o dropdown.

        // MANTER: Verifica se o dropdown existe, o botão existe e o dropdown está visível.
        if (sortDropdown && sortBtn && sortDropdown.style.display === 'block') {
            // Se o clique não foi dentro do dropdown E não foi no botão que o abre
            // Verifica se o clique foi no botão ou em um elemento DENTRO do botão
            const clickedInsideButton = sortBtn.contains(e.target); // MANTER: Verifica se o clique foi dentro do botão.
            // Verifica se o clique foi dentro do dropdown
            const clickedInsideDropdown = sortDropdown.contains(e.target); // MANTER: Verifica se o clique foi dentro do dropdown.

            // MANTER: Se o clique não foi nem dentro do dropdown NEM dentro do botão, esconde o dropdown.
            if (!clickedInsideDropdown && !clickedInsideButton) {
                 console.log('[RENDERER_DEBUG] Clique fora do dropdown/botão detectado. Escondendo dropdown.'); // MANTER: Log de depuração.
                sortDropdown.style.display = 'none'; // MANTER: Esconde o dropdown.
            }
        }
    }); // MANTER: Fim do listener de clique no documento.
} // MANTER: Fim da verificação if (myBooksPage).
   

// Função para inicializar o toggle do modo escuro (copiada de renderer-fixed.js)
function initDarkModeToggle() {
  const darkModeToggle = document.getElementById('dark-mode-toggle');
  if (!darkModeToggle) {
    console.error('Elemento #dark-mode-toggle não encontrado.');
    return;
  }

  // Carregar preferência salva ao iniciar
  // NOTA: Esta versão usa localStorage. Considerar migrar para electron-store para consistência.
  const isDarkMode = localStorage.getItem('darkMode') === 'enabled';
  if (isDarkMode) {
    document.body.classList.add('dark-mode');
    darkModeToggle.checked = true;
  }

  // Adicionar listener ao toggle
  darkModeToggle.addEventListener('change', () => {
    if (darkModeToggle.checked) {
      document.body.classList.add('dark-mode');
      localStorage.setItem('darkMode', 'enabled');
    } else {
      document.body.classList.remove('dark-mode');
      localStorage.setItem('darkMode', 'disabled');
    }
  });
  console.log('[RENDERER_DEBUG] initDarkModeToggle: Configuração completa.');
}

// Adicionar uma função para configurar os links da página Sobre
function setupAboutPageLinks() {
    const politicaLink = document.getElementById('link-politica-privacidade');
    const termosLink = document.getElementById('link-termos-uso');

    if (politicaLink) {
        politicaLink.addEventListener('click', (event) => {
            event.preventDefault(); // Evita que o link navegue para #
            const filePath = 'assets/politica_privacidade.md';
            window.electronAPI.openLocalFile(filePath);
        });
    }

    if (termosLink) {
        termosLink.addEventListener('click', (event) => {
            event.preventDefault(); // Evita que o link navegue para #
            const filePath = 'assets/termos_uso.md';
            window.electronAPI.openLocalFile(filePath);
        });
    }
}

// Configurar event listeners para fechar modais
function setupModalCloseListeners() {
  // Configurar botões de fechar modal (X)
  document.querySelectorAll('.close-modal').forEach(closeBtn => {
    closeBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      const modal = closeBtn.closest('.modal');
      if (modal) {
        modal.style.display = 'none';
      }
    });
  });

  // Prevenir fechamento ao clicar dentro do modal
  document.querySelectorAll('.modal-content').forEach(modalContent => {
    modalContent.addEventListener('click', (event) => {
      event.stopPropagation();
    });
  });

  // NÃO adicionar listener para fechar ao clicar fora do modal
  // (conforme solicitado pelo usuário)
}



// ADICIONAR: Nova função para configurar os botões de configuração
function setupConfigurationButtons() {
  console.log('[RENDERER_DEBUG] setupConfigurationButtons: Configurando botões de configuração...');
  
  // Botão Exportar Biblioteca
  const exportBtn = document.getElementById('export-library-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', async () => {
      console.log('[RENDERER_DEBUG] Botão Exportar Biblioteca clicado');
      // Mostrar modal de seleção de formato de exportação
      const exportModal = document.getElementById('export-format-modal');
      if (exportModal) {
        exportModal.style.display = 'block';
        exportModal.classList.add('active');
      } else {
        console.warn('[RENDERER_DEBUG] Modal #export-format-modal não encontrado');
      }
    });
    console.log('[RENDERER_DEBUG] Event listener adicionado ao botão Exportar Biblioteca');
  } else {
    console.warn('[RENDERER_DEBUG] Botão #export-library-btn não encontrado');
  }

  // Botão Importar Biblioteca
  const importBtn = document.getElementById('import-library-dropdown-btn');
  if (importBtn) {
    importBtn.addEventListener('click', async () => {
      console.log('[RENDERER_DEBUG] Botão Importar Biblioteca clicado');
      // Mostrar modal de seleção de formato de importação
      const importModal = document.getElementById('import-format-modal');
      if (importModal) {
        importModal.style.display = 'block';
        importModal.classList.add('active');
      } else {
        console.warn('[RENDERER_DEBUG] Modal #import-format-modal não encontrado');
      }
    });
    console.log('[RENDERER_DEBUG] Event listener adicionado ao botão Importar Biblioteca');
  } else {
    console.warn('[RENDERER_DEBUG] Botão #import-library-dropdown-btn não encontrado');
  }

  // Botão Redefinir Biblioteca
  const resetBtn = document.getElementById('btn-reset-data');
  if (resetBtn) {
    resetBtn.addEventListener('click', async () => {
      console.log('[RENDERER_DEBUG] Botão Redefinir Biblioteca clicado');
      
      // Mostrar confirmação antes de redefinir
      const confirmed = confirm('Tem certeza de que deseja redefinir toda a biblioteca? Esta ação não pode ser desfeita!');
      
      if (confirmed) {
        try {
          // Chamar IPC para redefinir dados
          const result = await window.electronAPI.resetLibrary();
          if (result && result.success) {
            showToastNotification('Biblioteca redefinida com sucesso!', 'success');
            // Recarregar a página atual para refletir as mudanças
            await loadBooksAndRender();
          } else {
            showToastNotification('Erro ao redefinir biblioteca: ' + (result.message || 'Erro desconhecido'), 'error');
          }
        } catch (error) {
          console.error('[RENDERER_DEBUG] Erro ao redefinir biblioteca:', error);
          showToastNotification('Erro ao redefinir biblioteca', 'error');
        }
      }
    });
    console.log('[RENDERER_DEBUG] Event listener adicionado ao botão Redefinir Biblioteca');
  } else {
    console.warn('[RENDERER_DEBUG] Botão #btn-reset-data não encontrado');
  }

  console.log('[RENDERER_DEBUG] setupConfigurationButtons: Configuração concluída');
}





// Função para configurar event listeners dos botões de formato
function setupFormatButtons() {
  console.log('[RENDERER_DEBUG] setupFormatButtons: Configurando botões de formato...');
  
  // Event listeners para botões de exportação
  const exportFormatButtons = document.querySelectorAll('#export-format-modal .format-btn');
  exportFormatButtons.forEach(button => {
    button.addEventListener('click', async () => {
      const format = button.getAttribute('data-format');
      console.log(`[RENDERER_DEBUG] Botão de exportação ${format.toUpperCase()} clicado`);
      
      if (format === 'csv') {
        try {
          // Usar a função correta do electronAPI
          const result = await window.electronAPI.exportBooks(format);
          if (result && result.success) {
            const bookCount = result.message.match(/\d+/)[0];
            showToastNotification(`${bookCount} ${window.t('messages.exportSuccess')} ${result.filePath}`, 'success');
          } else {
            showToastNotification(`${window.t('messages.errorExporting')} ${result?.message || 'Erro desconhecido'}`, 'error');
          }
        } catch (error) {
          console.error(`[RENDERER_DEBUG] Erro ao exportar ${format}:`, error);
          showToastNotification(`${window.t('messages.errorExportingFormat')} ${format.toUpperCase()}`, 'error');
        }
      } else {
        showToastNotification(window.t('messages.odsExportNotification'), 'info');
      }
      
      // Fechar modal
      closeModal('export-format-modal');
    });
  });
  
  // Event listeners para botões de importação
  const importFormatButtons = document.querySelectorAll('#import-format-modal .format-btn');
  importFormatButtons.forEach(button => {
    button.addEventListener('click', async () => {
      const format = button.getAttribute('data-format');
      console.log(`[RENDERER_DEBUG] Botão de importação ${format.toUpperCase()} clicado`);
      
      if (format === 'csv') {
        try {
          console.log(`[RENDERER_DEBUG] === INÍCIO IMPORTAÇÃO ${format.toUpperCase()} ===`);
          console.log(`[RENDERER_DEBUG] Chamando window.electronAPI.importBooks('${format}')`);
          
          // Primeiro, obter o arquivo
          const result = await window.electronAPI.importBooks(format);
          
          console.log(`[RENDERER_DEBUG] Resultado completo da importação:`, result);
          console.log(`[RENDERER_DEBUG] result.success:`, result?.success);
          console.log(`[RENDERER_DEBUG] result.message:`, result?.message);
          console.log(`[RENDERER_DEBUG] result.data:`, result?.data);
          console.log(`[RENDERER_DEBUG] result.booksImported:`, result?.booksImported);
          
          if (result && result.success && result.content) {
            // Agora processar e salvar o conteúdo CSV
            console.log(`[RENDERER_DEBUG] Processando conteúdo CSV...`);
            const processResult = await window.electronAPI.processAndSaveCsv(result.content);
            
            console.log(`[RENDERER_DEBUG] Resultado do processamento CSV:`, processResult);
            
            if (processResult && processResult.success) {
              const bookCount = processResult.message.match(/\d+/)[0];
              showToastNotification(`${bookCount} ${window.t('messages.importSuccess')}`, 'success');
              
              console.log(`[RENDERER_DEBUG] === CHAMANDO loadBooksAndRender APÓS IMPORTAÇÃO ===`);
              await loadBooksAndRender();
              console.log(`[RENDERER_DEBUG] === loadBooksAndRender CONCLUÍDA ===`);
            } else {
              console.log(`[RENDERER_DEBUG] Processamento CSV falhou:`, processResult);
              showToastNotification(`${window.t('messages.errorExporting')} CSV: ${processResult?.error || 'Erro desconhecido'}`, 'error');
            }
          } else {
            console.log(`[RENDERER_DEBUG] Importação de arquivo falhou:`, result);
            const errorMsg = result?.message === 'Operation cancelled by user' ? window.t('messages.operationCancelled') : result?.message || 'Erro desconhecido';
            showToastNotification(`${window.t('messages.errorExporting')}: ${errorMsg}`, 'error');
          }
        } catch (error) {
          console.error(`[RENDERER_DEBUG] ERRO CRÍTICO na importação de ${format}:`, error);
          showToastNotification(`${window.t('messages.errorExportingFormat')} ${format.toUpperCase()}`, 'error');
        }
      } else {
        showToastNotification(`Importação de ${format.toUpperCase()} estará disponível em uma próxima versão`, 'info');
      }
      
      // Fechar modal
      closeModal('import-format-modal');
    });
  });
  
  console.log('[RENDERER_DEBUG] setupFormatButtons: Configuração concluída');
}

// Função para fechar modal
function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = 'none';
    console.log(`[RENDERER_DEBUG] Modal ${modalId} fechado`);
  } else {
    console.warn(`[RENDERER_DEBUG] Modal ${modalId} não encontrado`);
  }
}

// Helper function to show toast notifications
function showToast(message, duration = 3000) {
  // Criar elemento de toast se não existir
  let toast = document.getElementById('toast-notification');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast-notification';
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 15px 20px;
      border-radius: 5px;
      color: white;
      font-weight: bold;
      z-index: 10000;
      opacity: 0;
      transition: opacity 0.3s ease;
    `;
    document.body.appendChild(toast);
  }
  
  toast.textContent = message;
  toast.style.opacity = '1';
  
  // Remover após a duração especificada
  setTimeout(() => {
    toast.style.opacity = '0';
  }, duration);
}

// Função para configurar listeners de mudança de idioma
function setupLanguageListeners() {
  const languageButtons = document.querySelectorAll('.language-option');
  
  languageButtons.forEach(button => {
    button.addEventListener('click', async function() {
      const selectedLang = this.dataset.lang;
      
      // Remover classe active de todos os botões
      languageButtons.forEach(btn => btn.classList.remove('active'));
      
      // Adicionar classe active ao botão clicado
      this.classList.add('active');
      
      // Alterar idioma
      const success = await window.i18n.changeLanguage(selectedLang);
      
      if (success) {
        showToastNotification('Idioma alterado com sucesso!');
        log('info', 'RENDERER', `Idioma alterado para: ${selectedLang}`);
        
        // Re-renderizar a página atual para aplicar as traduções
        const currentPage = document.querySelector('.page.active');
        if (currentPage) {
          const pageId = currentPage.id;
          await showPage(pageId);
        }
      } else {
        showToastNotification('Erro ao alterar idioma', 'error');
        log('error', 'RENDERER', `Erro ao alterar idioma para: ${selectedLang}`);
      }
    });
  });
  
  // Marcar o idioma atual como ativo
  const currentLang = window.i18n.getCurrentLanguage();
  const currentButton = document.querySelector(`[data-lang="${currentLang}"]`);
  if (currentButton) {
    currentButton.classList.add('active');
  }
  
  log('info', 'RENDERER', 'Listeners de idioma configurados');
}