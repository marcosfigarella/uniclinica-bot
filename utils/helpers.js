const moment = require('moment');

class Helpers {
  static formatPhone(phone) {
    const cleaned = phone.replace(/\D/g, '');
    
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    } else if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
    }
    
    return phone;
  }

  static formatCPF(cpf) {
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }

  static validateCPF(cpf) {
    cpf = cpf.replace(/[^\d]/g, '');
    
    if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) {
      return false;
    }
    
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cpf.charAt(i)) * (10 - i);
    }
    
    let remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf.charAt(9))) return false;
    
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cpf.charAt(i)) * (11 - i);
    }
    
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    
    return remainder === parseInt(cpf.charAt(10));
  }

  static isValidBirthDate(dateString) {
    const date = moment(dateString, 'DD/MM/YYYY', true);
    const today = moment();
    const minAge = moment().subtract(120, 'years');
    
    return date.isValid() && 
           date.isBefore(today) && 
           date.isAfter(minAge);
  }

  static sanitizeInput(input) {
    return input.trim().replace(/[^\w\s\-\/\:]/gi, '');
  }

  static generateProtocol() {
    const timestamp = moment().format('YYYYMMDD');
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    return `${timestamp}${random}`;
  }

  static formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  }

  static isBusinessHours() {
    const now = moment();
    const hour = now.hour();
    const day = now.day();
    
    // Segunda: 8h às 12h
    if (day === 1) {
      return hour >= 8 && hour < 12;
    }
    
    // Quarta e quinta: 14h às 20h
    if (day === 3 || day === 4) {
      return hour >= 14 && hour < 20;
    }
    
    // Sexta e sábado: 8h às 12h
    if (day === 5 || day === 6) {
      return hour >= 8 && hour < 12;
    }
    
    // Terça e domingo: fechado
    return false;
  }

  static getCurrentTime() {
    return moment().format('DD/MM/YYYY HH:mm:ss');
  }

  static formatDateForDisplay(dateString) {
    return moment(dateString, 'DD/MM/YYYY').format('dddd, DD [de] MMMM [de] YYYY');
  }
}

module.exports = Helpers;