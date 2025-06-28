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
export function log(level, context, message, data = null) {
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