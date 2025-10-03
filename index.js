const express = require('express');
const app = express();

app.get('/', (req, res) => {
    res.send('🤖 CamilaBot está funcionando!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const cron = require('node-cron');

const config = require('./config/config');
const messages = require('./config/messages');
const AppointmentService = require('./services/appointmentService');
const CalendarService = require('./services/calendarService');
const MenuService = require('./services/menuService');
const Helpers = require('./utils/helpers');

class CamilaBot {
  constructor() {
    this.client = new Client({
      authStrategy: new LocalAuth({
        name: 'uniclinica-session'
      }),
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu'
        ]
      }
    });

    this.appointmentService = new AppointmentService();
    this.calendarService = new CalendarService();
    this.menuService = new MenuService();
    
    this.userStates = new Map();
    
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.setupCronJobs();
    this.client.initialize();
  }

  setupEventListeners() {
    this.client.on('qr', (qr) => {
      console.log('🔗 Escaneie o QR Code abaixo com seu WhatsApp:');
      qrcode.generate(qr, { small: true });
    });

    this.client.on('ready', () => {
      console.log('✅ Camila está online na Uniclínica!');
      console.log(`🏥 Atendendo pela ${config.clinic.name}`);
      console.log(`👩‍💼 Assistente: ${config.assistant.name}`);
      console.log(`👨‍⚕️ Médico: ${config.doctor.name} - ${config.doctor.area}`);
      console.log(`⏰ Agendamento 24h por dia, 7 dias por semana`);
    });

    this.client.on('message_create', async (message) => {
      if (message.fromMe) return;
      
      const chat = await message.getChat();
      if (!chat.isGroup) {
        await this.handleMessage(message);
      }
    });

    this.client.on('disconnected', (reason) => {
      console.log('❌ Camila desconectada:', reason);
    });

    this.client.on('auth_failure', (msg) => {
      console.error('❌ Falha na autenticação:', msg);
    });
  }

  async handleMessage(message) {
    const contact = await message.getContact();
    const userId = contact.id.user;
    const messageBody = message.body.trim();

    console.log(`📨 [${Helpers.getCurrentTime()}] Mensagem de ${contact.name || contact.pushname} (${userId}): ${messageBody}`);

    try {
      const userState = this.userStates.get(userId) || { step: 'menu' };
      await this.processUserMessage(message, userState, messageBody);
    } catch (error) {
      console.error('❌ Erro ao processar mensagem:', error);
      await message.reply('Ops! Algo deu errado. 😅 Vou te ajudar novamente! Digite *0* para voltar ao menu principal.');
    }
  }

  async processUserMessage(message, userState, messageBody) {
    const userId = message.from.split('@')[0];

    switch (userState.step) {
      case 'menu':
        await this.handleMenuSelection(message, messageBody, userId);
        break;
        
      case 'scheduling_name':
        await this.handleSchedulingName(message, messageBody, userId);
        break;
        
      case 'scheduling_phone':
        await this.handleSchedulingPhone(message, messageBody, userId);
        break;
        
      case 'scheduling_cpf':
        await this.handleSchedulingCPF(message, messageBody, userId);
        break;
        
      case 'scheduling_birth':
        await this.handleSchedulingBirth(message, messageBody, userId);
        break;
        
      case 'scheduling_address':
        await this.handleSchedulingAddress(message, messageBody, userId);
        break;
        
      case 'scheduling_date':
        await this.handleSchedulingDate(message, messageBody, userId);
        break;
        
      case 'scheduling_time':
        await this.handleSchedulingTime(message, messageBody, userId);
        break;
        
      case 'scheduling_confirm':
        await this.handleSchedulingConfirm(message, messageBody, userId);
        break;
        
      case 'human_agent':
        await this.handleHumanAgent(message, messageBody, userId);
        break;
        
      default:
        await this.showMainMenu(message, userId);
        break;
    }
  }

  async handleMenuSelection(message, option, userId) {
    switch (option) {
      case '1':
        await this.startScheduling(message, userId);
        break;
        
      case '2':
        await message.reply(messages.treatmentsInfo);
        break;
        
      case '3':
        await message.reply(messages.addressInfo);
        break;
        
      case '4':
        await message.reply(messages.pricesInfo);
        break;
        
      case '5':
        await message.reply(messages.workingHours);
        break;
        
      case '6':
        await this.transferToHuman(message, userId);
        break;
        
      case '0':
        await this.showMainMenu(message, userId);
        break;
        
      default:
        if (this.isGreeting(option)) {
          await this.showMainMenu(message, userId);
        } else if (this.isReturnQuestion(option)) {
          await message.reply(messages.returnConsultation);
        } else if (this.isInsuranceQuestion(option)) {
          await message.reply(messages.noInsurance);
        } else if (this.isCareQuestion(option)) {
          await message.reply(messages.aboutCare);
        } else if (this.isScheduleTimeQuestion(option)) {
          await message.reply(this.menuService.getAvailabilityMessage());
        } else {
          await message.reply(messages.invalidOption);
        }
        break;
    }
  }

  async startScheduling(message, userId) {
    this.userStates.set(userId, { 
      step: 'scheduling_name',
      appointmentData: {}
    });
    await message.reply(messages.scheduleMenu);
  }

  async handleSchedulingName(message, name, userId) {
    if (name.length < 3) {
      await message.reply('Por favor, me informe seu nome completo para que eu possa fazer o agendamento corretamente! 😊');
      return;
    }

    const userState = this.userStates.get(userId);
    userState.appointmentData.name = name;
    userState.step = 'scheduling_phone';
    this.userStates.set(userId, userState);

    await message.reply(`Prazer em conhecê-lo, ${name}! 😊\n\nAgora preciso do seu *telefone* (com DDD):`);
  }

  async handleSchedulingPhone(message, phone, userId) {
    const cleanPhone = phone.replace(/\D/g, '');
    
    if (cleanPhone.length < 10 || cleanPhone.length > 11) {
      await message.reply('Por favor, informe um telefone válido com DDD (exemplo: 93981028173 ou 9398102-8173)! 😊');
      return;
    }

    const userState = this.userStates.get(userId);
    userState.appointmentData.phone = Helpers.formatPhone(cleanPhone);
    userState.step = 'scheduling_cpf';
    this.userStates.set(userId, userState);

    await message.reply('Perfeito! 👍\n\nAgora preciso do seu *CPF* (apenas números):');
  }

  async handleSchedulingCPF(message, cpf, userId) {
    const cleanCPF = cpf.replace(/\D/g, '');
    
    if (!Helpers.validateCPF(cleanCPF)) {
      await message.reply('Por favor, informe um CPF válido (apenas números)! 😊');
      return;
    }

    const userState = this.userStates.get(userId);
    userState.appointmentData.cpf = Helpers.formatCPF(cleanCPF);
    userState.step = 'scheduling_birth';
    this.userStates.set(userId, userState);

    await message.reply('Ótimo! 📋\n\nQual sua *data de nascimento*? (formato: DD/MM/AAAA)');
  }

  async handleSchedulingBirth(message, birthDate, userId) {
    if (!Helpers.isValidBirthDate(birthDate)) {
      await message.reply('Por favor, informe uma data de nascimento válida no formato DD/MM/AAAA (exemplo: 15/08/1990)! 😊');
      return;
    }

    const userState = this.userStates.get(userId);
    userState.appointmentData.birthDate = birthDate;
    userState.step = 'scheduling_address';
    this.userStates.set(userId, userState);

    await message.reply('Perfeito! 🎂\n\nPor último, preciso do seu *endereço completo* (rua, número, bairro, cidade):');
  }

  async handleSchedulingAddress(message, address, userId) {
    if (address.length < 10) {
      await message.reply('Por favor, informe seu endereço completo para que possamos ter seus dados atualizados! 😊');
      return;
    }

    const userState = this.userStates.get(userId);
    userState.appointmentData.address = address;
    userState.step = 'scheduling_date';
    this.userStates.set(userId, userState);

    const availableDates = this.appointmentService.getAvailableDates();
    await message.reply(`Excelente! Agora vamos escolher a data da sua consulta! 📅\n\n*Datas disponíveis:*\n${availableDates}\n\nDigite o número da data que você prefere:\n\n⏰ *Agendamento 24h - escolha quando for melhor para você!*`);
  }

  async handleSchedulingDate(message, dateOption, userId) {
    const selectedDate = this.appointmentService.getDateFromOption(dateOption);
    
    if (!selectedDate) {
      await message.reply('Por favor, escolha uma das opções de data listadas! 😊\n\n⏰ *Agendamento disponível 24h - escolha quando for melhor para você!*');
      return;
    }

    const userState = this.userStates.get(userId);
    userState.appointmentData.selectedDate = selectedDate;
    userState.step = 'scheduling_time';
    this.userStates.set(userId, userState);

    const availableTimes = this.appointmentService.getAvailableTimes(selectedDate);
    await message.reply(`Ótima escolha! 😊\n\n*Horários disponíveis para ${selectedDate}:*\n${availableTimes}\n\nDigite o número do horário que você prefere:\n\n⏰ *Agendamento 24h - você pode escolher agora mesmo!*`);
  }

  async handleSchedulingTime(message, timeOption, userId) {
    const userState = this.userStates.get(userId);
    const selectedTime = this.appointmentService.getTimeFromOption(timeOption, userState.appointmentData.selectedDate);
    
    if (!selectedTime) {
      await message.reply('Por favor, escolha um dos horários disponíveis! 😊');
      return;
    }

    userState.appointmentData.selectedTime = selectedTime;
    userState.step = 'scheduling_confirm';
    this.userStates.set(userId, userState);

    const confirmationMessage = `✅ *Confirmação do Agendamento*

👤 *Paciente:* ${userState.appointmentData.name}
📱 *Telefone:* ${userState.appointmentData.phone}
📋 *CPF:* ${userState.appointmentData.cpf}
🎂 *Data de Nascimento:* ${userState.appointmentData.birthDate}
📍 *Endereço:* ${userState.appointmentData.address}

🩺 *Consulta:* Psiquiatria e Saúde Mental
👨‍⚕️ *Médico:* ${config.doctor.name}
📅 *Data:* ${userState.appointmentData.selectedDate}
⏰ *Horário:* ${userState.appointmentData.selectedTime}
💰 *Valor:* ${config.consultation.price}

Está tudo correto? 😊

Digite *SIM* para confirmar ou *NÃO* para cancelar:`;

    await message.reply(confirmationMessage);
  }

  async handleSchedulingConfirm(message, confirmation, userId) {
    const userState = this.userStates.get(userId);
    
    if (confirmation.toLowerCase() === 'sim') {
      const appointmentData = userState.appointmentData;
      
      const appointmentId = this.appointmentService.saveAppointment({
        ...appointmentData,
        whatsappId: userId,
        status: 'agendado'
      });
      
      await this.calendarService.addToCalendar(appointmentData, appointmentId);

      const currentTime = new Date().toLocaleString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      const successMessage = `🎉 *Agendamento Confirmado!*

${appointmentData.name}, que alegria ter você conosco! 😊

✅ *Agendado em:* ${currentTime}
⏰ *Disponível 24h por dia, 7 dias por semana!*

📋 *Protocolo:* #${appointmentId}
👨‍⚕️ *${config.doctor.name}* - CRM ${config.doctor.crm}
🩺 *${config.doctor.title}* - ${config.doctor.area}
📅 *Data:* ${appointmentData.selectedDate}
⏰ *Horário:* ${appointmentData.selectedTime}
📍 *Local:* ${config.clinic.address}

💙 *O que você pode esperar:*
• Atendimento acolhedor e humanizado
• Tempo exclusivo dedicado a você
• Escuta ativa e respeitosa
• Conduta personalizada para suas necessidades

⚠️ *Lembretes carinhosos:*
• Chegue 15 minutos antes para um acolhimento tranquilo
• Traga documento com foto
• Exames serão solicitados apenas se necessários
• Venha como você está - nosso foco é cuidar de você!

📲 Você receberá lembretes:
• 1 dia antes da consulta
• 1 hora antes da consulta

🕐 *Precisa reagendar?* Pode me procurar 24h por dia, 7 dias por semana!

Estamos ansiosos para cuidar da sua saúde mental com todo carinho que você merece! 💙

Digite *0* para voltar ao menu principal.`;

      await message.reply(successMessage);
      this.userStates.set(userId, { step: 'menu' });
      
    } else if (confirmation.toLowerCase() === 'não' || confirmation.toLowerCase() === 'nao') {
      await message.reply('Sem problemas! 😊 Seu agendamento foi cancelado com todo respeito.\n\nQuando se sentir pronto para agendar, estaremos aqui 24h por dia, 7 dias por semana para acolhê-lo! Digite *0* para voltar ao menu principal. 💙');
      this.userStates.set(userId, { step: 'menu' });
    } else {
      await message.reply('Por favor, digite *SIM* para confirmar ou *NÃO* para cancelar! 😊');
    }
  }

  async handleHumanAgent(message, messageBody, userId) {
    console.log(`👨‍💼 Mensagem para atendimento humano de ${userId}: ${messageBody}`);
    await message.reply('Sua mensagem foi registrada! Nossa equipe retornará em breve. 😊\n\nDigite *0* para voltar ao menu principal.');
  }

  async transferToHuman(message, userId) {
    await message.reply(messages.humanAgent);
    this.userStates.set(userId, { step: 'human_agent' });
    console.log(`🔔 ${config.assistant.name}: Usuário ${userId} solicitou atendimento humano`);
  }

  async showMainMenu(message, userId) {
    this.userStates.set(userId, { step: 'menu' });
    await message.reply(messages.welcome);
  }

  isGreeting(message) {
    const greetings = [
      'oi', 'olá', 'ola', 'bom dia', 'boa tarde', 'boa noite', 
      'menu', 'inicio', 'começar', 'ola camila', 'oi camila'
    ];
    return greetings.some(greeting => message.toLowerCase().includes(greeting));
  }

  isReturnQuestion(message) {
    const returnKeywords = ['retorno', 'volta', 'segunda consulta', 'próxima consulta'];
    return returnKeywords.some(keyword => message.toLowerCase().includes(keyword));
  }

  isInsuranceQuestion(message) {
    const insuranceKeywords = ['convênio', 'convenio', 'plano de saúde', 'unimed', 'bradesco saúde'];
    return insuranceKeywords.some(keyword => message.toLowerCase().includes(keyword));
  }

  isCareQuestion(message) {
    const careKeywords = [
      'atendimento', 'como é', 'diferencial', 'humanizado', 
      'acolhedor', 'cuidado', 'tratamento', 'abordagem'
    ];
    return careKeywords.some(keyword => message.toLowerCase().includes(keyword));
  }

  isScheduleTimeQuestion(message) {
    const scheduleKeywords = [
      'que horas', 'horário', 'quando posso', 'posso agendar', 
      'disponível', 'funciona', 'atende', '24 horas', '24h',
      'domingo', 'madrugada', 'noite', 'final de semana'
    ];
    return scheduleKeywords.some(keyword => message.toLowerCase().includes(keyword));
  }

  setupCronJobs() {
    cron.schedule('0 9 * * *', () => {
      this.sendDayBeforeReminders();
    });

    cron.schedule('0 * * * *', () => {
      this.sendHourBeforeReminders();
    });

    cron.schedule('0 2 * * 1', () => {
      this.appointmentService.cleanOldAppointments();
    });
  }

  async sendDayBeforeReminders() {
    const tomorrowAppointments = this.appointmentService.getTomorrowAppointments();
    
    for (const appointment of tomorrowAppointments) {
      const reminderMessage = `🔔 *Lembrete Carinhoso - Uniclínica*

Olá ${appointment.name}! 😊

Sua consulta com o ${config.doctor.name} está marcada para *amanhã*!

📅 *Data:* ${appointment.selectedDate}
⏰ *Horário:* ${appointment.selectedTime}
📍 *Local:* ${config.clinic.address}

💙 *Preparamos um atendimento especial para você:*
• Ambiente acolhedor e humanizado
• Tempo exclusivo dedicado às suas necessidades
• Escuta ativa e respeitosa

⚠️ *Lembretes carinhosos:*
• Chegue 15 minutos antes para um acolhimento tranquilo
• Traga documento com foto
• Exames serão solicitados apenas se necessários
• Venha como você está - estamos aqui para cuidar de você!

Estamos ansiosos para recebê-lo com todo carinho! 💙

_Mensagem automática da Camila_`;

      try {
        await this.client.sendMessage(`${appointment.whatsappId}@c.us`, reminderMessage);
        console.log(`✅ Lembrete (1 dia) enviado para ${appointment.name}`);
        
        this.appointmentService.markReminderSent(appointment.id, 'dayBefore');
      } catch (error) {
        console.error(`❌ Erro ao enviar lembrete para ${appointment.whatsappId}:`, error);
      }
    }
  }

  async sendHourBeforeReminders() {
    const nextHourAppointments = this.appointmentService.getNextHourAppointments();
    
    for (const appointment of nextHourAppointments) {
      const reminderMessage = `⏰ *Lembrete Carinhoso - Consulta em 1 hora!*

Olá ${appointment.name}! 😊

Sua consulta com o ${config.doctor.name} é daqui a 1 hora!

⏰ *Horário:* ${appointment.selectedTime}
📍 *Local:* ${config.clinic.address}

💙 *Estamos preparados para recebê-lo:*
• Com um atendimento acolhedor e humanizado
• Dedicação exclusiva ao seu bem-estar
• Ambiente seguro e respeitoso

🚗 *Já pode se preparar para sair!*
Lembre-se de chegar 15 minutos antes para um acolhimento tranquilo.

Até logo! Cuidaremos de você com todo carinho! 💙

_Mensagem automática da Camila_`;

      try {
        await this.client.sendMessage(`${appointment.whatsappId}@c.us`, reminderMessage);
        console.log(`✅ Lembrete (1 hora) enviado para ${appointment.name}`);
        
        this.appointmentService.markReminderSent(appointment.id, 'hourBefore');
      } catch (error) {
        console.error(`❌ Erro ao enviar lembrete para ${appointment.whatsappId}:`, error);
      }
    }
  }
}

const camila = new CamilaBot();

process.on('SIGINT', async () => {
  console.log('\n🔄 Encerrando Camila...');
  await camila.client.destroy();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🔄 Encerrando Camila...');
  await camila.client.destroy();
  process.exit(0);

});
