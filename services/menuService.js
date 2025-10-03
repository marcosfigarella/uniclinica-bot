const messages = require('../config/messages');

class MenuService {
  constructor() {
    this.menuOptions = {
      '1': 'Agendar consulta',
      '2': 'Informações sobre tratamentos',
      '3': 'Endereço e localização',
      '4': 'Valores e formas de pagamento',
      '5': 'Horários de funcionamento',
      '6': 'Falar com nossa equipe',
      '0': 'Menu principal'
    };
  }

  isValidOption(option) {
    return this.menuOptions.hasOwnProperty(option);
  }

  getMenuText() {
    return messages.welcome;
  }

  getOptionDescription(option) {
    return this.menuOptions[option] || 'Opção inválida';
  }

  getAvailabilityMessage() {
    return `🕐 *Agendamento 24 Horas - Sempre Disponível!*

😊 Que bom que você quer saber sobre nossa disponibilidade!

🟢 *AGENDAMENTO:*
• 24 horas por dia
• 7 dias por semana
• Resposta automática e imediata
• Confirmação na hora
• Sem necessidade de esperar

📅 *ATENDIMENTOS:*
• Realizados nos horários estabelecidos
• Segunda, Quarta, Quinta, Sexta e Sábado
• Consultas com hora marcada
• Tempo exclusivo para você

💙 *Vantagens do agendamento 24h:*
• Agende quando lembrar
• Não perca a oportunidade
• Sem pressa para decidir
• Confirmação imediata

Quer agendar agora? É só digitar *1*! 😊

Digite *0* para voltar ao menu principal.`;
  }
}

module.exports = MenuService;