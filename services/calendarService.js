const moment = require('moment');
const config = require('../config/config');

class CalendarService {
  constructor() {
    // Este serviço pode ser expandido para integrar com Google Calendar, Outlook, etc.
  }

  async addToCalendar(appointmentData, appointmentId) {
    // Gera um evento de calendário em formato iCal
    const icalEvent = this.generateICalEvent(appointmentData, appointmentId);
    
    // Log do evento criado
    console.log(`📅 Evento adicionado ao calendário:`);
    console.log(`   Paciente: ${appointmentData.name}`);
    console.log(`   Data: ${appointmentData.selectedDate}`);
    console.log(`   Horário: ${appointmentData.selectedTime}`);
    console.log(`   Protocolo: #${appointmentId}`);
    
    return icalEvent;
  }

  generateICalEvent(appointmentData, appointmentId) {
    const startDate = moment(`${appointmentData.selectedDate} ${appointmentData.selectedTime}`, 'DD/MM/YYYY HH:mm');
    const endDate = startDate.clone().add(config.consultation.duration, 'minutes');
    
    const ical = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Uniclínica//Agendamento//PT
BEGIN:VEVENT
UID:${appointmentId}@uniclinica.com
DTSTAMP:${moment().utc().format('YYYYMMDDTHHmmss')}Z
DTSTART:${startDate.utc().format('YYYYMMDDTHHmmss')}Z
DTEND:${endDate.utc().format('YYYYMMDDTHHmmss')}Z
SUMMARY:Consulta - ${appointmentData.name}
DESCRIPTION:Consulta de ${config.doctor.area}\nPaciente: ${appointmentData.name}\nTelefone: ${appointmentData.phone}\nCPF: ${appointmentData.cpf}\nNascimento: ${appointmentData.birthDate}\nEndereço: ${appointmentData.address}\nProtocolo: #${appointmentId}\nValor: ${config.consultation.price}
LOCATION:${config.clinic.address}
STATUS:CONFIRMED
BEGIN:VALARM
TRIGGER:-PT15M
ACTION:DISPLAY
DESCRIPTION:Consulta em 15 minutos - ${appointmentData.name}
END:VALARM
END:VEVENT
END:VCALENDAR`;

    return ical;
  }

  // Método para integração futura com Google Calendar
  async addToGoogleCalendar(appointmentData, appointmentId) {
    // Implementar integração com Google Calendar API
    // Requer configuração de OAuth2 e credenciais
    console.log('🔄 Integração com Google Calendar em desenvolvimento');
    
    // Exemplo de estrutura para futura implementação:
    const event = {
      summary: `Consulta - ${appointmentData.name}`,
      location: config.clinic.address,
      description: `Consulta de ${config.doctor.area}\nPaciente: ${appointmentData.name}\nProtocolo: #${appointmentId}`,
      start: {
        dateTime: moment(`${appointmentData.selectedDate} ${appointmentData.selectedTime}`, 'DD/MM/YYYY HH:mm').toISOString(),
        timeZone: 'America/Sao_Paulo'
      },
      end: {
        dateTime: moment(`${appointmentData.selectedDate} ${appointmentData.selectedTime}`, 'DD/MM/YYYY HH:mm')
          .add(config.consultation.duration, 'minutes').toISOString(),
        timeZone: 'America/Sao_Paulo'
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 15 }
        ]
      }
    };
    
    return event;
  }

  // Método para integração futura com Outlook
  async addToOutlookCalendar(appointmentData, appointmentId) {
    // Implementar integração com Microsoft Graph API
    console.log('🔄 Integração com Outlook em desenvolvimento');
    
    const event = {
      subject: `Consulta - ${appointmentData.name}`,
      body: {
        contentType: 'HTML',
        content: `<p>Consulta de ${config.doctor.area}</p><p>Paciente: ${appointmentData.name}</p><p>Protocolo: #${appointmentId}</p>`
      },
      start: {
        dateTime: moment(`${appointmentData.selectedDate} ${appointmentData.selectedTime}`, 'DD/MM/YYYY HH:mm').toISOString(),
        timeZone: 'America/Sao_Paulo'
      },
      end: {
        dateTime: moment(`${appointmentData.selectedDate} ${appointmentData.selectedTime}`, 'DD/MM/YYYY HH:mm')
          .add(config.consultation.duration, 'minutes').toISOString(),
        timeZone: 'America/Sao_Paulo'
      },
      location: {
        displayName: config.clinic.address
      }
    };
    
    return event;
  }
}

module.exports = CalendarService;