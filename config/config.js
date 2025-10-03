module.exports = {
  clinic: {
    name: "Uniclínica Saúde e Bem Estar",
    address: "Rua 15 de Agosto, 605 - Centro, Santarém - PA, 68005-300",
    phone: "(93) 98102-8173",
    email: "drmarcosfigarella@gmail.com",
    mapsLink: "https://maps.app.goo.gl/ZD9UbEajLuWne9an7",
    workingHours: {
      monday: "08h às 12h",
      tuesday: "Fechado",
      wednesday: "14h às 20h",
      thursday: "14h às 20h",
      friday: "08h às 12h",
      saturday: "08h às 12h",
      sunday: "Fechado"
    }
  },
  
  doctor: {
    name: "Dr. Marcos Figarella",
    crm: "18.587",
    title: "Médico",
    area: "Psiquiatria e Saúde Mental"
  },

  assistant: {
    name: "Camila"
  },

  treatments: [
    "Depressão",
    "Transtorno Bipolar",
    "Transtorno de Ansiedade Generalizada",
    "Síndrome do Pânico",
    "Transtorno Obsessivo Compulsivo (TOC)",
    "Transtorno de Déficit de Atenção e Hiperatividade (TDAH)",
    "Transtornos do Humor",
    "Transtornos de Personalidade"
  ],

  consultation: {
    price: "R\$ 400,00",
    duration: 60
  },

  payment: {
    accepted: ["Dinheiro", "PIX"],
    upcoming: ["Cartão de Crédito", "Cartão de Débito"]
  },

  availableSlots: {
    monday: ["08:00", "09:00", "10:00", "11:00"],
    tuesday: [],
    wednesday: ["14:00", "15:00", "16:00", "17:00", "18:00", "19:00"],
    thursday: ["14:00", "15:00", "16:00", "17:00", "18:00", "19:00"],
    friday: ["08:00", "09:00", "10:00", "11:00"],
    saturday: ["08:00", "09:00", "10:00", "11:00"],
    sunday: []
  }
};