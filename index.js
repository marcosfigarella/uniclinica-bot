// Evento para mensagens recebidas
client.on('message', message => {
    console.log(`Mensagem recebida: ${message.body}`);
    
    const msgLower = message.body.toLowerCase();
    
    // Saudações
    if (msgLower.includes('oi') || msgLower.includes('olá') || msgLower.includes('ola') || msgLower.includes('bom dia') || msgLower.includes('boa tarde') || msgLower.includes('boa noite')) {
        message.reply('Olá! 😊 Aqui é a Camila da Uniclínica! Como posso te ajudar hoje?');
    }
    
    // Agendamentos
    else if (msgLower.includes('agendar') || msgLower.includes('consulta') || msgLower.includes('marcar')) {
        message.reply('Claro! Vou te ajudar com o agendamento. 📅\n\nPara qual especialidade você gostaria de agendar?\n\n• Psiquiatria\n• Psicologia\n• Outras especialidades\n\nMe conta qual você precisa! 😊');
    }
    
    // Psiquiatria
    else if (msgLower.includes('psiquiatria') || msgLower.includes('psiquiatra')) {
        message.reply('Perfeito! Temos excelentes psiquiatras na Uniclínica! 👨‍⚕️\n\nVou verificar a disponibilidade para você. Pode me passar:\n\n• Seu nome completo\n• Telefone\n• Se é primeira consulta ou retorno\n\nAssim consigo agendar no melhor horário! 😊');
    }
    
    // Psicologia
    else if (msgLower.includes('psicologia') || msgLower.includes('psicologo') || msgLower.includes('psicólogo')) {
        message.reply('Que bom! Nossos psicólogos são muito carinhosos e profissionais! 💙\n\nPara agendar, preciso de:\n\n• Seu nome\n• Telefone de contato\n• Preferência de horário\n\nVou encontrar o melhor encaixe para você! 😊');
    }
    
    // Informações da clínica
    else if (msgLower.includes('endereço') || msgLower.includes('endereco') || msgLower.includes('localização') || msgLower.includes('onde fica')) {
        message.reply('Nossa clínica fica em um local bem acessível! 📍\n\n*Endereço:* [INSERIR ENDEREÇO AQUI]\n\nTemos estacionamento e fica próximo ao transporte público. Qualquer dúvida sobre como chegar, me chama! 😊');
    }
    
    // Horários
    else if (msgLower.includes('horário') || msgLower.includes('horario') || msgLower.includes('funciona') || msgLower.includes('aberto')) {
        message.reply('Nossos horários de atendimento são:\n\n🕐 *Segunda a Sexta:* 7h às 18h\n🕐 *Sábado:* 7h às 12h\n\nEstou aqui para te ajudar sempre que precisar! 😊');
    }
    
    // Valores/Convênios
    else if (msgLower.includes('valor') || msgLower.includes('preço') || msgLower.includes('preco') || msgLower.includes('convênio') || msgLower.includes('convenio') || msgLower.includes('plano')) {
        message.reply('Sobre valores e convênios, vou te passar as informações certinhas! 💰\n\nTrabalhamos com diversos convênios e também atendimento particular.\n\nMe fala qual convênio você tem ou se é particular, que te passo os detalhes! 😊');
    }
    
    // Emergência/Urgência
    else if (msgLower.includes('urgente') || msgLower.includes('emergência') || msgLower.includes('emergencia') || msgLower.includes('ajuda')) {
        message.reply('Entendo que é urgente! 🚨\n\nPara emergências psiquiátricas:\n• *SAMU:* 192\n• *CVV:* 188\n\nSe precisar de atendimento rápido na clínica, me liga:\n*Telefone:* [INSERIR TELEFONE]\n\nEstou aqui para te ajudar! ❤️');
    }
    
    // Cancelamento
    else if (msgLower.includes('cancelar') || msgLower.includes('desmarcar') || msgLower.includes('remarcar')) {
        message.reply('Sem problemas! Vou te ajudar com isso. 😊\n\nMe passa:\n• Seu nome\n• Data da consulta agendada\n\nE se quiser remarcar, me fala uma nova preferência de data! 📅');
    }
    
    // Quem é Camila
    else if (msgLower.includes('quem é você') || msgLower.includes('quem e voce') || msgLower.includes('seu nome')) {
        message.reply('Eu sou a Camila! 😊 Trabalho na recepção da Uniclínica e estou aqui para te ajudar com agendamentos, informações e tudo que precisar!\n\nSempre com muito carinho e atenção para nossos pacientes! ❤️');
    }
    
    // Obrigado
    else if (msgLower.includes('obrigado') || msgLower.includes('obrigada') || msgLower.includes('valeu') || msgLower.includes('brigado')) {
        message.reply('Por nada! 😊 Fico muito feliz em ajudar!\n\nSe precisar de mais alguma coisa, é só me chamar. Estou sempre aqui! ❤️');
    }
    
    // Tchau/Despedida
    else if (msgLower.includes('tchau') || msgLower.includes('até logo') || msgLower.includes('ate logo') || msgLower.includes('bye')) {
        message.reply('Até logo! 👋 Foi um prazer te ajudar!\n\nQualquer coisa que precisar, pode me chamar a qualquer momento. Cuide-se bem! ❤️😊');
    }
    
    // Resposta padrão
    else {
        message.reply('Oi! 😊 Sou a Camila da Uniclínica!\n\nPosso te ajudar com:\n• 📅 Agendamentos\n• ℹ️ Informações da clínica\n• 📍 Endereço e horários\n• 💰 Convênios e valores\n\nO que você precisa hoje? Estou aqui para te ajudar! ❤️');
    }
});
