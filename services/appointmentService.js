const fs = require('fs');
const path = require('path');
const moment = require('moment');
const config = require('../config/config');

moment.locale('pt-br');

class AppointmentService {
  constructor() {
    this.appointmentsFile = path.join(__dirname, '../data/appointments.json');
    this.ensureDataDirectory();
  }

  ensureDataDirectory() {
    const dataDir = path.dirname(this.appointmentsFile);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    if (!fs.existsSync(this.appointmentsFile)) {
      fs.writeFileSync(this.appointmentsFile, JSON.stringify([]));
    }
  }

  loadAppointments() {
    try {
      const data = fs.readFileSync(this.appointmentsFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Erro ao carregar agendamentos:', error);
      return [];
    }
  }

  saveAppointments(appointments) {
    try {
      fs.writeFileSync(this.appointmentsFile, JSON.stringify(appointments, null, 2));
    } catch (error) {
      console.error('Erro ao salvar agendamentos:', error);
    }
  }

  saveAppointment(appointmentData) {
    const appointments = this.loadAppointments();
    const id = this.generateId();
    
    const appointment = {
      id,
      ...appointmentData,
      createdAt: moment().format('YYYY-MM-DD HH:mm:ss'),
      reminderSent: {
        dayBefore: false,
        hourBefore: false
      }
    };
    
    appointments.push(appointment);
    this.saveAppointments(appointments);
    
    return id;
  }

  generateId() {
    return Math.random().toString(36).substr(2, 9).toUpperCase();
  }

  getAvailableDates() {
    const dates = [];
    const today = moment();
    
    for (let i = 1; i <= 30; i++) {
      const date = moment().add(i, 'days');
      const dayOfWeek = date.day();
      
      const dayName = this.getDayName(dayOfWeek);
      if (config.availableSlots[dayName] && config.availableSlots[dayName].length > 0) {
        dates.push({
          date: date.format('DD/MM/YYYY'),
          dayName: date.format('dddd'),
          option: dates.length + 1
        });
      }
      
      if (dates.length >= 15) break;
    }
    
    return dates.map(d => `${d.option}. ${d.date} (${d.dayName})`).join('\n');
  }

  getDayName(dayNumber) {
    const days = {
      0: 'sunday',
      1: 'monday',
      2: 'tuesday',
      3: 'wednesday',
      4: 'thursday',
      5: 'friday',
      6: 'saturday'
    };
    return days[dayNumber];
  }

  getDateFromOption(option) {
    const dates = [];
    const today = moment();
    
    for (let i = 1; i <= 30; i++) {
      const date = moment().add(i, 'days');
      const dayOfWeek = date.day();
      const dayName = this.getDayName(dayOfWeek);
      
      if (config.availableSlots[dayName] && config.availableSlots[dayName].length > 0) {
        dates.push(date.format('DD/MM/YYYY'));
      }
      
      if (dates.length >= 15) break;
    }
    
    const selectedIndex = parseInt(option) - 1;
    return dates[selectedIndex] || null;
  }

  getAvailableTimes(dateString) {
    const date = moment(dateString, 'DD/MM/YYYY');
    const dayOfWeek = date.day();
    const dayName = this.getDayName(dayOfWeek);
    
    const daySlots = config.availableSlots[dayName] || [];
    
    const appointments = this.loadAppointments();
    const bookedTimes = appointments
      .filter(apt => apt.selectedDate === dateString && apt.status === 'agendado')
      .map(apt => apt.selectedTime);

    const availableTimes = daySlots
      .filter(time => !bookedTimes.includes(time))
      .map((time, index) => `${index + 1}. ${time}`)
      .join('\n');

    return availableTimes || 'Nenhum horário disponível para esta data.';
  }

  getTimeFromOption(option, dateString) {
    const date = moment(dateString, 'DD/MM/YYYY');
    const dayOfWeek = date.day();
    const dayName = this.getDayName(dayOfWeek);
    
    const daySlots = config.availableSlots[dayName] || [];
    
    const appointments = this.loadAppointments();
    const bookedTimes = appointments
      .filter(apt => apt.selectedDate === dateString && apt.status === 'agendado')
      .map(apt => apt.selectedTime);

    const availableTimes = daySlots.filter(time => !bookedTimes.includes(time));
    
    const selectedIndex = parseInt(option) - 1;
    return availableTimes[selectedIndex] || null;
  }

  getTomorrowAppointments() {
    const appointments = this.loadAppointments();
    const tomorrow = moment().add(1, 'day').format('DD/MM/YYYY');
    
    return appointments.filter(apt => 
      apt.selectedDate === tomorrow && 
      apt.status === 'agendado' &&
      !apt.reminderSent.dayBefore
    );
  }

  getNextHourAppointments() {
    const appointments = this.loadAppointments();
    const today = moment().format('DD/MM/YYYY');
    const nextHour = moment().add(1, 'hour').format('HH:mm');
    
    return appointments.filter(apt => {
      if (apt.selectedDate !== today || apt.status !== 'agendado' || apt.reminderSent.hourBefore) {
        return false;
      }
      
      const appointmentTime = moment(apt.selectedTime, 'HH:mm');
      const targetTime = moment(nextHour, 'HH:mm');
      
      return appointmentTime.isSame(targetTime, 'hour');
    });
  }

  markReminderSent(appointmentId, reminderType) {
    const appointments = this.loadAppointments();
    const appointment = appointments.find(apt => apt.id === appointmentId);
    
    if (appointment) {
      appointment.reminderSent[reminderType] = true;
      this.saveAppointments(appointments);
    }
  }

  getUserAppointments(whatsappId) {
    const appointments = this.loadAppointments();
    const today = moment().format('YYYY-MM-DD');
    
    return appointments.filter(apt => 
      apt.whatsappId === whatsappId && 
      apt.status === 'agendado' &&
      moment(apt.selectedDate, 'DD/MM/YYYY').format('YYYY-MM-DD') >= today
    );
  }

  cancelAppointment(appointmentId) {
    const appointments = this.loadAppointments();
    const appointmentIndex = appointments.findIndex(apt => apt.id === appointmentId);
    
    if (appointmentIndex !== -1) {
      appointments[appointmentIndex].status = 'cancelado';
      appointments[appointmentIndex].canceledAt = moment().format('YYYY-MM-DD HH:mm:ss');
      this.saveAppointments(appointments);
      return true;
    }
    
    return false;
  }

  cleanOldAppointments() {
    const appointments = this.loadAppointments();
    const oneMonthAgo = moment().subtract(1, 'month').format('YYYY-MM-DD');
    
    const filteredAppointments = appointments.filter(apt => {
      const appointmentDate = moment(apt.selectedDate, 'DD/MM/YYYY').format('YYYY-MM-DD');
      return appointmentDate >= oneMonthAgo;
    });
    
    this.saveAppointments(filteredAppointments);
    console.log(`🧹 Limpeza realizada. ${appointments.length - filteredAppointments.length} agendamentos antigos removidos.`);
  }
}

module.exports = AppointmentService;