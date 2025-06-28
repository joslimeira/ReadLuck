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
// Função auxiliar para obter o nome do mês
export function getMonthName(monthIndex) {
  const months = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
  ];
  return months[monthIndex];
}

// Função para formatar data
export function formatDate(date) {
  const day = date.getDate();
  const month = getMonthName(date.getMonth());
  return `${day} de ${month}`;
}