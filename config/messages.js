const config = require('./config');

module.exports = {
  welcome: `Olá! 😊 Eu sou a Camila, da ${config.clinic.name}!

É um prazer falar com você. Estou aqui para ajudá-lo com informações sobre nossa clínica e agendamentos de consultas com o ${config.doctor.name}.

💙 *Nosso compromisso é oferecer um atendimento acolhedor, humanizado e totalmente direcionado para você!*

⏰ *Agendamento disponível 24 horas por dia, 7 dias por semana!*

📋 *Como posso ajudá-lo hoje?*

1️⃣ Agendar consulta
2️⃣ Informações sobre tratamentos
3️⃣ Endereço e localização
4️⃣ Valores e formas de pagamento
5️⃣ Horários de funcionamento
6️⃣ Falar com nossa equipe
0️⃣ Menu principal

Digite o número da opção que deseja! 😊`,

  invalidOption: "Ops! Não entendi sua escolha. 😅\nPor favor, digite um número de 0 a 6 para que eu possa ajudá-lo melhor!\n\n⏰ *Lembre-se: posso ajudá-lo com agendamentos 24 horas por dia, 7 dias por semana!*",

  scheduleMenu: `📅 *Agendamento de Consulta - Disponível 24h*

Que bom que você quer agendar uma consulta conosco! 😊

🕐 *Facilidade para você:*
• Agendamento disponível 24 horas por dia
• 7 dias por semana
• Resposta automática e imediata
• Confirmação na hora

O ${config.doctor.name} é ${config.doctor.title} e atende na área de ${config.doctor.area}, oferecendo um cuidado verdadeiramente humanizado e acolhedor.

💙 *Nosso diferencial:*
• Atendimento exclusivamente direcionado para você
• Escuta ativa e acolhedora
• Conduta personalizada para suas necessidades
• Ambiente seguro e respeitoso

💰 *Valor da consulta:* ${config.consultation.price}

Para agendar, preciso de algumas informações suas. Vamos começar?

Por favor, me informe seu *nome completo*:`,

  addressInfo: `📍 *Nossa Localização*

🏥 ${config.clinic.name}
📍 ${config.clinic.address}
📞 ${config.clinic.phone}
📧 ${config.clinic.email}

🗺️ *Como chegar:*
${config.clinic.mapsLink}

🏠 *Nosso espaço foi pensado para você:*
• Ambiente acolhedor e reservado
• Localização de fácil acesso no centro de Santarém
• Atendimento humanizado desde a recepção

⏰ *Facilidade total:*
• Agendamento 24h por dia, 7 dias por semana
• Atendimentos nos horários estabelecidos
• Confirmação imediata da sua consulta

Estamos aqui para cuidar de você! 😊💙`,

  treatmentsInfo: `🧠 *Tratamentos em Saúde Mental*

O ${config.doctor.name} (CRM ${config.doctor.crm}) é ${config.doctor.title} e atende na área de ${config.doctor.area}.

💙 *Nossa abordagem humanizada inclui tratamento para:*

${config.treatments.map((treatment, index) => `• ${treatment}`).join('\n')}

🤝 *Nosso compromisso com você:*
• Atendimento individualizado e personalizado
• Escuta ativa sem julgamentos
• Conduta terapêutica exclusivamente direcionada às suas necessidades
• Ambiente seguro para expressar seus sentimentos
• Respeito ao seu tempo e processo

⏰ *Facilidade para agendar:*
• Agendamento disponível 24 horas por dia
• 7 dias por semana
• Confirmação imediata

Cada pessoa é única, e você merece um cuidado especial e dedicado! 💙`,

  pricesInfo: `💰 *Valores e Formas de Pagamento*

💵 Consulta: ${config.consultation.price}

💳 *Formas de pagamento aceitas:*
${config.payment.accepted.map(method => `• ${method}`).join('\n')}

🔄 *Em breve:*
${config.payment.upcoming.map(method => `• ${method}`).join('\n')}

💙 *Nosso compromisso:*
• Transparência total nos valores
• Atendimento humanizado independente da forma de pagamento
• Tempo integral dedicado exclusivamente a você durante a consulta

⏰ *Conveniência total:*
• Agendamento 24h por dia, 7 dias por semana
• Confirmação imediata da consulta
• Sem necessidade de esperar horário comercial

ℹ️ *Importante:* No momento não estamos trabalhando com convênios, mas isso nos permite oferecer um atendimento mais personalizado e com tempo adequado para suas necessidades! 😊`,

  workingHours: `🕐 *Horários de Atendimento e Agendamento*

📋 *AGENDAMENTO:*
🟢 *Disponível 24 horas por dia, 7 dias por semana!*
• Agende a qualquer hora pelo WhatsApp
• Resposta automática e imediata
• Confirmação instantânea

📅 *ATENDIMENTOS PRESENCIAIS:*
📅 Segunda-feira: ${config.clinic.workingHours.monday}
📅 Terça-feira: ${config.clinic.workingHours.tuesday}
📅 Quarta-feira: ${config.clinic.workingHours.wednesday}
📅 Quinta-feira: ${config.clinic.workingHours.thursday}
📅 Sexta-feira: ${config.clinic.workingHours.friday}
📅 Sábado: ${config.clinic.workingHours.saturday}
📅 Domingo: ${config.clinic.workingHours.sunday}

💙 *Nosso cuidado com você:*
• Atendimento com hora marcada para garantir tempo exclusivo
• Chegue com 15 minutos de antecedência para um acolhimento tranquilo
• Cada consulta é conduzida no seu ritmo, sem pressa

🌙 *Agende mesmo de madrugada - estou sempre aqui para você!* 😊`,

  humanAgent: `👩‍💼 *Conectando com nossa equipe*

Vou transferir você para um membro da nossa equipe que poderá oferecer um atendimento ainda mais personalizado! 😊

💙 *Nossa equipe está preparada para:*
• Acolher você com carinho e respeito
• Esclarecer dúvidas de forma humanizada
• Oferecer orientações personalizadas

⏰ *Horário de atendimento humano presencial:*
${Object.entries(config.clinic.workingHours)
  .filter(([day, hours]) => hours !== "Fechado")
  .map(([day, hours]) => {
    const dayNames = {
      monday: "Segunda-feira",
      wednesday: "Quarta-feira", 
      thursday: "Quinta-feira",
      friday: "Sexta-feira",
      saturday: "Sábado"
    };
    return `${dayNames[day]}: ${hours}`;
  }).join('\n')}

🕐 *AGENDAMENTOS:* Disponíveis 24h por dia, 7 dias por semana aqui pelo WhatsApp!

Se estiver fora do horário de atendimento presencial, deixe sua mensagem que retornaremos com todo carinho assim que possível! 💙`,

  returnConsultation: `😊 Que bom que você está pensando em um retorno!

O ${config.doctor.name} sempre avalia a necessidade de retorno de forma individualizada, considerando:

💙 *Seu processo único:*
• Evolução do seu quadro clínico
• Suas necessidades específicas
• Seu ritmo de tratamento
• Objetivos terapêuticos personalizados

Durante sua consulta, ele dedicará tempo exclusivo para definir, junto com você, se há necessidade de retorno e qual seria o momento ideal.

⏰ *Agende quando for conveniente:*
• Agendamento disponível 24h por dia, 7 dias por semana
• Confirmação imediata

Nosso foco é sempre no que é melhor para você! 💙

Gostaria de agendar uma consulta? Estou aqui para ajudar! 😊`,

  noInsurance: `😊 Entendo sua pergunta sobre convênios!

Nossa escolha por atendimento particular tem um propósito muito especial:

💙 *Benefícios para você:*
• Tempo integral dedicado exclusivamente às suas necessidades
• Consultas sem pressa ou limitações de tempo
• Atendimento verdadeiramente personalizado
• Conduta terapêutica direcionada 100% para você
• Ambiente mais acolhedor e humanizado

⏰ *Facilidade total:*
• Agendamento 24 horas por dia, 7 dias por semana
• Sem burocracias de convênio
• Confirmação imediata

Sabemos que é um investimento importante na sua saúde mental, mas acreditamos que você merece um cuidado especial e dedicado.

O valor da consulta é ${config.consultation.price} e aceitamos pagamento em dinheiro e PIX! 

Seu bem-estar é nossa prioridade! 💙`,

  aboutCare: `💙 *Nosso Cuidado Humanizado*

Na ${config.clinic.name}, acreditamos que cada pessoa merece um atendimento especial:

🤝 *Atendimento Acolhedor:*
• Ambiente seguro e respeitoso
• Escuta ativa sem julgamentos
• Acolhimento desde o primeiro contato

👥 *Foco Exclusivo em Você:*
• Consultas personalizadas
• Tempo dedicado às suas necessidades
• Conduta direcionada ao seu bem-estar

💭 *Abordagem Humanizada:*
• Respeito ao seu ritmo
• Valorização da sua individualidade
• Cuidado integral da sua saúde mental

⏰ *Facilidade Total:*
• Agendamento 24 horas por dia, 7 dias por semana
• Atendimento nos horários estabelecidos
• Confirmação imediata

Você não é apenas um paciente, você é uma pessoa única que merece cuidado especial! 😊💙`
};