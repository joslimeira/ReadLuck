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
// Teste simples para verificar se o JavaScript está funcionando
console.log('Renderer de teste carregado');

// Função de teste para verificar cliques
function testClick() {
  console.log('Clique funcionando!');
  alert('Clique funcionando!');
}

// Inicializar quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM carregado - teste');
  
  // Adicionar listener de teste para todos os elementos clicáveis
  const sidebarItems = document.querySelectorAll('.sidebar-item');
  console.log('Encontrados', sidebarItems.length, 'itens da sidebar');
  
  sidebarItems.forEach((item, index) => {
    console.log('Adicionando listener para item', index);
    item.addEventListener('click', (e) => {
      e.preventDefault();
      console.log('Item da sidebar clicado:', item.getAttribute('data-page'));
    });
  });
  
  // Teste para outros botões
  const buttons = document.querySelectorAll('button');
  console.log('Encontrados', buttons.length, 'botões');
  
  buttons.forEach((button, index) => {
    button.addEventListener('click', (e) => {
      console.log('Botão clicado:', button.textContent);
    });
  });
});