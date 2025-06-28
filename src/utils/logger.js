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
// Sistema de logging seguro para o ReadLuck
// Controla logs baseado no ambiente e nível de severidade

class Logger {
  constructor() {
    try {
      // Detecta se está em desenvolvimento baseado no Electron
      this.isDevelopment = process.env.NODE_ENV === 'development' || 
                          (typeof window !== 'undefined' && window.electronAPI?.isDevelopment) ||
                          !process.env.NODE_ENV; // Assume dev se não definido
      
      this.levels = {
        ERROR: 0,
        WARN: 1, 
        INFO: 2,
        DEBUG: 3
      };
      
      // Em produção, só mostra ERROR e WARN
      // Em desenvolvimento, mostra tudo
      this.currentLevel = this.isDevelopment ? this.levels.DEBUG : this.levels.WARN;
      
      // Flag para indicar se o logger está em modo de falha segura
      this.safeMode = false;
    } catch (error) {
      // Em caso de erro na inicialização, entra em modo de falha segura
      this.safeMode = true;
      console.error('Logger inicializado em modo de falha segura devido a erro:', error);
    }
  }
  
  // Sanitiza dados sensíveis antes de logar
  sanitize(data) {
    try {
      // Tratamento para valores nulos ou indefinidos
      if (data === null || data === undefined) {
        return data;
      }
      
      // Tratamento para objetos (incluindo arrays)
      if (typeof data === 'object') {
        // Tratamento especial para erros
        if (data instanceof Error) {
          return {
            message: data.message,
            stack: data.stack,
            name: data.name
          };
        }
        
        // Cópia segura do objeto
        let sanitized;
        try {
          sanitized = Array.isArray(data) ? [...data] : { ...data };
        } catch (e) {
          // Se não conseguir copiar, retorna uma representação simples
          return '[Objeto complexo]';
        }
        
        // Remove campos sensíveis
        const sensitiveFields = ['password', 'token', 'key', 'secret', 'auth', 'senha', 'credencial'];
        
        if (!Array.isArray(data)) {
          sensitiveFields.forEach(field => {
            if (sanitized[field]) {
              sanitized[field] = '[REDACTED]';
            }
          });
          
          // Limita arrays grandes
          Object.keys(sanitized).forEach(key => {
            try {
              if (Array.isArray(sanitized[key]) && sanitized[key].length > 5) {
                sanitized[key] = [...sanitized[key].slice(0, 3), `... +${sanitized[key].length - 3} items`];
              } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
                // Sanitização recursiva limitada a um nível para evitar loops infinitos
                sanitized[key] = '[Objeto aninhado]';
              }
            } catch (e) {
              sanitized[key] = '[Erro ao processar]';
            }
          });
        }
        
        return sanitized;
      }
      
      // Para tipos primitivos, retorna diretamente
      return data;
    } catch (error) {
      // Em caso de erro, retorna um valor seguro
      return '[Erro na sanitização]';
    }
  }
  
  log(level, component, message, data = null) {
    try {
      // Se estiver em modo de falha segura, só loga erros
      if (this.safeMode && level !== 'ERROR') {
        return;
      }
      
      // Verifica o nível de log
      if (!this.safeMode && this.levels[level] > this.currentLevel) {
        return; // Não loga se o nível for maior que o permitido
      }
      
      const timestamp = new Date().toISOString();
      const prefix = `[${timestamp}] [${level}] [${component}]`;
      
      // Determina o método de console a usar (fallback para log se não existir)
      const consoleMethod = console[level.toLowerCase()] || console.log;
      
      if (data) {
        try {
          const sanitizedData = this.sanitize(data);
          consoleMethod(prefix, message, sanitizedData);
        } catch (sanitizeError) {
          // Se falhar ao sanitizar, loga sem os dados
          console.log(prefix, message, '[Erro ao sanitizar dados]');
        }
      } else {
        consoleMethod(prefix, message);
      }
    } catch (logError) {
      // Último recurso: tenta um log simples
      try {
        console.error('Erro no sistema de logging:', logError);
        console.log(`[FALLBACK] ${component}: ${message}`);
      } catch {}
    }
  }
  
  error(component, message, data = null) {
    this.log('ERROR', component, message, data);
  }
  
  warn(component, message, data = null) {
    this.log('WARN', component, message, data);
  }
  
  info(component, message, data = null) {
    this.log('INFO', component, message, data);
  }
  
  debug(component, message, data = null) {
    this.log('DEBUG', component, message, data);
  }
}

// Instância singleton
const logger = new Logger();

// Para uso no renderer (browser)
if (typeof window !== 'undefined') {
  window.logger = logger;
}

// Para uso no main process (Node.js)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = logger;
}