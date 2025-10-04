const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const QRCode = require('qrcode');
const cron = require('node-cron');

const app = express();

// Variável para armazenar o QR Code
let qrCodeData = '';
let qrCodeImage = '';
let isClientReady = false;

// Armazenar informações dos usuários
let userSessions = {};

// Função para obter próximos dias úteis disponíveis
function getNextAvailableDays(count = 7) {
    const days = [];
    const today = new Date();
    let currentDate = new Date(today);
    currentDate.setDate(currentDate.getDate() + 1); // Começar do próximo dia
    
    while (days.length < count) {
        const dayOfWeek = currentDate.getDay();
        
        // Segunda a sexta (1-5) ou sábado até 12h (6)
        if (dayOfWeek >= 1 && dayOfWeek <= 6) {
            const dateStr = currentDate.toLocaleDateString('pt-BR', {
                weekday: 'long',
                day: '2-digit',
                month: '2-digit'
            });
            days.push({
                date: new Date(currentDate),
                formatted: dateStr.charAt(0).toUpperCase() + dateStr.slice(1)
            });
        }
        
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return days;
}

// Função para obter horários disponíveis (simulado - depois integrar com Google Calendar)
function getAvailableSlots(date) {
    const dayOfWeek = date.getDay();
    
    if (dayOfWeek === 6) { // Sábado
        return ['08:00', '09:00', '10:00', '11:00'];
    } else { // Segunda a sexta
        return ['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'];
    }
}

// Rota principal
app.get('/', (req, res) => {
    res.send(`
        <h1>Camila - Secretária Dr. Marcos Figarella</h1>
        <p>WhatsApp Status: ${isClientReady ? 'Conectado ✅' : 'Aguardando conexão ⏳'}</p>
        <a href="/whatsapp">Ver QR Code WhatsApp</a>
    `);
});

// Rota para exibir QR Code
app.get('/whatsapp', (req, res) => {
    if (isClientReady) {
        res.send(`
            <h1>WhatsApp Conectado! ✅</h1>
            <p>A Camila está funcionando normalmente.</p>
            <a href="/">Voltar</a>
        `);
    } else if (qrCodeImage) {
        res.send(`
            <html>
            <head>
                <title>QR Code WhatsApp</title>
                <style>
                    body { font-family: Arial, sans-serif; text-align: center; padding: 20px; }
                    .qr-container { margin: 20px auto; }
                    .instructions { max-width: 500px; margin: 20px auto; text-align: left; }
                    .qr-image { border: 2px solid #25D366; padding: 10px; border-radius: 10px; }
                </style>
            </head>
            <body>
                <h1>📱 Conectar WhatsApp</h1>
                <div class="instructions">
                    <p><strong>Como conectar:</strong></p>
                    <ol>
                        <li>Abra o WhatsApp no seu celular</li>
                        <li>Toque nos 3 pontinhos (⋮) no canto superior direito</li>
                        <li>Selecione "Dispositivos conectados"</li>
                        <li>Toque em "Conectar um dispositivo"</li>
                        <li>Escaneie o QR Code abaixo</li>
                    </ol>
                </div>
                <div class="qr-container">
                    <img src="${qrCodeImage}" alt="QR Code WhatsApp" class="qr-image" />
                </div>
                <p><em>O QR Code expira em alguns minutos. Recarregue a página se necessário.</em></p>
                <button onclick="location.reload()">🔄 Atualizar QR Code</button>
                <br><br>
                <a href="/">← Voltar</a>
            </body>
            </html>
        `);
    } else {
        res.send(`
            <html>
            <head>
                <title>WhatsApp - Aguardando</title>
                <meta http-equiv="refresh" content="5">
                <style>
                    body { font-family: Arial, sans-serif; text-align: center; padding: 20px; }
                </style>
            </head>
            <body>
                <h1>⏳ Aguardando QR Code...</h1>
                <p>O QR Code será gerado em instantes...</p>
                <p><em>Esta página será atualizada automaticamente em 5 segundos.</em></p>
                <a href="/">← Voltar</a>
            </body>
            </html>
        `);
    }
});

// Configuração do cliente WhatsApp
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
        ]
    }
});

// Evento QR Code
client.on('qr', async (qr) => {
    qrCodeData = qr;
    isClientReady = false;
    
    try {
        qrCodeImage = await QRCode.toDataURL(qr, {
            width: 256,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            }
        });
        console.log('QR Code gerado! Acesse /whatsapp para visualizar');
    } catch (error) {
        console.error('Erro ao gerar QR Code:', error);
    }
    
    qrcode.generate(qr, {small: true});
});

// Evento quando cliente está pronto
client.on('ready', () => {
    console.log('WhatsApp Client is ready!');
    isClientReady = true;
    qrCodeData = '';
    qrCodeImage = '';
});

// Função para extrair nome da mensagem
function extractName(message) {
    const words = message.split(' ');
    const nameIndicators = ['nome', 'chamo', 'sou'];
    
    for (let i = 0; i < words.length; i++) {
        if (nameIndicators.some(indicator => words[i].toLowerCase().includes(indicator))) {
            if (words[i + 1]) {
                return words[i + 1].charAt(0).toUpperCase() + words[i + 1].slice(1).toLowerCase();
            }
        }
    }
    
    for (let word of words) {
        if (word.length > 2 && /^[A-Za-z]+$/.test(word)) {
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        }
    }
    
    return null;
}

// Evento para mensagens recebidas
client.on('message', async message => {
    console.log(`Mensagem recebida: ${message.body}`);
    
    const userId = message.from;
    const msgLower = message.body.toLowerCase();
    
    // Inicializar sessão do usuário se não existir
    if (!userSessions[userId]) {
        userSessions[userId] = {
            name: null,
            hasIntroduced: false,
            awaitingName: false,
            schedulingStep: null,
            selectedDate: null,
            selectedTime: null
        };
    }
    
    const userSession = userSessions[userId];
    
    // Tentar extrair nome da mensagem atual
    const extractedName = extractName(message.body);
    if (extractedName && !userSession.name) {
        userSession.name = extractedName;
        userSession.awaitingName = false;
    }
    
    // Saudações iniciais - primeira interação
    if (!userSession.hasIntroduced && (
        msgLower.includes('oi') || msgLower.includes('olá') || msgLower.includes('ola') || 
        msgLower.includes('bom dia') || msgLower.includes('boa tarde') || msgLower.includes('boa noite') ||
        msgLower.includes('alô') || msgLower.includes('alo') || msgLower.includes('ei') ||
        msgLower.includes('hello') || msgLower.includes('opa') || msgLower.includes('oie'))) {
        
        userSession.hasIntroduced = true;
        
        if (userSession.name) {
            message.reply(`Olá ${userSession.name}! 😊 Que alegria receber seu contato! Eu sou a Camila, secretária do Dr. Marcos Figarella! Estou muito feliz em poder te ajudar hoje! Como posso te auxiliar? ❤️`);
        } else {
            userSession.awaitingName = true;
            message.reply('Olá! 😊 Que alegria receber seu contato! Eu sou a Camila, secretária do Dr. Marcos Figarella! Estou muito feliz em falar com você! Para te atender melhor, qual é o seu nome? ❤️');
        }
    }
    
    // Se está aguardando o nome
    else if (userSession.awaitingName && !userSession.name) {
        const name = extractName(message.body);
        if (name) {
            userSession.name = name;
            userSession.awaitingName = false;
            message.reply(`Muito prazer, ${name}! 😊 Agora posso te atender com todo carinho! Como posso te ajudar hoje? ❤️`);
        } else {
            message.reply('Desculpe, não consegui entender seu nome. Pode me dizer novamente, por favor? Por exemplo: "Meu nome é João" ou "Me chamo Maria" 😊');
        }
    }
    
    // Agendamentos
    else if (msgLower.includes('agendar') || msgLower.includes('consulta') || msgLower.includes('marcar') ||
             msgLower.includes('quero marcar') || msgLower.includes('quero agendar') || 
             msgLower.includes('gostaria de marcar') || msgLower.includes('gostaria de agendar') ||
             msgLower.includes('preciso marcar') || msgLower.includes('preciso agendar') ||
             msgLower.includes('como faço para marcar') || msgLower.includes('como marco') ||
             msgLower.includes('como agendo') || msgLower.includes('queria marcar') ||
             msgLower.includes('queria agendar') || msgLower.includes('posso marcar') ||
             msgLower.includes('posso agendar') || msgLower.includes('agenda')) {
        
        const greeting = userSession.name ? `${userSession.name}, que` : 'Que';
        userSession.schedulingStep = 'choosing_date';
        
        const availableDays = getNextAvailableDays();
        let daysText = '';
        availableDays.forEach((day, index) => {
            daysText += `${index + 1}. ${day.formatted}\n`;
        });
        
        message.reply(`${greeting} maravilha! Fico muito feliz em ajudar você com o agendamento do Dr. Marcos! 😊📅\n\nO Dr. Marcos atende:\n• Psiquiatria\n• Saúde Mental\n• Avaliações psiquiátricas\n\n*Dias disponíveis:*\n${daysText}\nDigite o número do dia que você prefere! ❤️`);
    }
    
    // Verificar disponibilidade de dias
    else if (msgLower.includes('disponível') || msgLower.includes('disponivel') || 
             msgLower.includes('dias') || msgLower.includes('quando') ||
             msgLower.includes('horários') || msgLower.includes('horarios') ||
             msgLower.includes('vagas') || msgLower.includes('agenda livre')) {
        
        const greeting = userSession.name ? `${userSession.name}, vou` : 'Vou';
        
        const availableDays = getNextAvailableDays();
        let daysText = '';
        availableDays.forEach((day, index) => {
            daysText += `${index + 1}. ${day.formatted}\n`;
        });
        
        message.reply(`${greeting} verificar a agenda do Dr. Marcos para você! 😊📅\n\n*Próximos dias disponíveis:*\n${daysText}\nQual dia você gostaria de agendar? Digite o número! ❤️`);
    }
    
    // Processar escolha de data (números de 1-7)
    else if (userSession.schedulingStep === 'choosing_date' && /^[1-7]$/.test(message.body.trim())) {
        const dayIndex = parseInt(message.body.trim()) - 1;
        const availableDays = getNextAvailableDays();
        
        if (dayIndex >= 0 && dayIndex < availableDays.length) {
            const selectedDay = availableDays[dayIndex];
            userSession.selectedDate = selectedDay.date;
            userSession.schedulingStep = 'choosing_time';
            
            // Obter horários disponíveis para o dia selecionado
            const availableSlots = getAvailableSlots(selectedDay.date);
            
            let timesText = '';
            availableSlots.forEach((time, index) => {
                timesText += `${index + 1}. ${time}\n`;
            });
            
            const greeting = userSession.name ? `${userSession.name}, perfeito!` : 'Perfeito!';
            message.reply(`${greeting} Você escolheu ${selectedDay.formatted}! 😊\n\n*Horários disponíveis:*\n${timesText}\nDigite o número do horário que você prefere! ⏰`);
        } else {
            message.reply('Por favor, digite um número válido de 1 a 7 correspondente ao dia que você deseja! 😊');
        }
    }
    
    // Processar escolha de horário
    else if (userSession.schedulingStep === 'choosing_time' && /^[1-8]$/.test(message.body.trim())) {
        const timeIndex = parseInt(message.body.trim()) - 1;
        const availableSlots = getAvailableSlots(userSession.selectedDate);
        
        if (timeIndex >= 0 && timeIndex < availableSlots.length) {
            const selectedTime = availableSlots[timeIndex];
            userSession.selectedTime = selectedTime;
            userSession.schedulingStep = 'confirming';
            
            const dateStr = userSession.selectedDate.toLocaleDateString('pt-BR', {
                weekday: 'long',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
            
            const greeting = userSession.name ? `${userSession.name}, ótima` : 'Ótima';
            message.reply(`${greeting} escolha! 😊\n\n*Resumo do agendamento:*\n📅 Data: ${dateStr}\n⏰ Horário: ${selectedTime}\n👨‍⚕️ Dr. Marcos Figarella\n\nPara confirmar, preciso do seu:\n• Telefone de contato\n• Se é primeira consulta ou retorno\n\nPode me passar essas informações? ❤️`);
        } else {
            message.reply('Por favor, digite um número válido correspondente ao horário que você deseja! 😊');
        }
    }
    
    // Confirmação final do agendamento
    else if (userSession.schedulingStep === 'confirming') {
        const greeting = userSession.name ? `${userSession.name}, perfeito!` : 'Perfeito!';
        
        const dateStr = userSession.selectedDate.toLocaleDateString('pt-BR', {
            weekday: 'long',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
        
        // Resetar sessão de agendamento
        userSession.schedulingStep = null;
        userSession.selectedDate = null;
        userSession.selectedTime = null;
        
        message.reply(`${greeting} Sua consulta foi agendada com sucesso! 🎉\n\n*Detalhes da consulta:*\n👤 Paciente: ${userSession.name}\n📅 Data: ${dateStr}\n⏰ Horário: ${userSession.selectedTime}\n👨‍⚕️ Dr. Marcos Figarella\n📱 Contato: ${message.body}\n\n*Importante:*\n• Chegue 15 minutos antes\n• Traga documento com foto\n• Em caso de cancelamento, avise com 24h de antecedência\n\nAté breve! ❤️`);
    }
    
    // Informações gerais
    else if (msgLower.includes('informações') || msgLower.includes('informacoes') ||
             msgLower.includes('quero mais informações') || msgLower.includes('quero mais informacoes') ||
             msgLower.includes('gostaria de informações') || msgLower.includes('preciso de informações') ||
             msgLower.includes('me fale sobre') || msgLower.includes('conte sobre') ||
             msgLower.includes('quero saber') || msgLower.includes('gostaria de saber') ||
             msgLower.includes('como funciona') || msgLower.includes('me explica') ||
             msgLower.includes('detalhes') || msgLower.includes('informação') ||
             msgLower.includes('informacao') || msgLower.includes('esclarecer') ||
             msgLower.includes('dúvida') || msgLower.includes('duvida') ||
             msgLower.includes('ajuda') || msgLower.includes('orientação') ||
             msgLower.includes('orientacao')) {
        
        const greeting = userSession.name ? `${userSession.name}, fico` : 'Fico';
        message.reply(`${greeting} muito feliz em esclarecer tudo para você! 😊\n\nPosso te dar informações sobre:\n\n📅 *Agendamentos*\n• Como marcar consultas\n• Horários disponíveis\n• Reagendamentos\n\n👨‍⚕️ *Dr. Marcos Figarella*\n• Atendimento em Psiquiatria\n• Saúde Mental\n\n🏥 *Consultório*\n• Endereço e localização\n• Horários de funcionamento\n\n💰 *Valores e Convênios*\n• Preços das consultas\n• Convênios aceitos\n\nSobre o que você gostaria de saber? ❤️`);
    }
    
    // Dr. Marcos e suas especialidades
    else if (msgLower.includes('psiquiatria') || msgLower.includes('psiquiatra') || 
             msgLower.includes('marcos') || msgLower.includes('dr marcos') ||
             msgLower.includes('doutor marcos') || msgLower.includes('médico') ||
             msgLower.includes('medico') || msgLower.includes('saude mental') ||
             msgLower.includes('saúde mental') || msgLower.includes('doutor') ||
             msgLower.includes('especialidade') || msgLower.includes('atende') ||
             msgLower.includes('trata')) {
        
        const greeting = userSession.name ? `${userSession.name}, que` : 'Que';
        message.reply(`${greeting} alegria falar sobre o Dr. Marcos! 😊 Ele atende Psiquiatria e Saúde Mental com muito carinho e dedicação! 👨‍⚕️\n\n*O Dr. Marcos atende:*\n• Psiquiatria Geral\n• Saúde Mental\n• Transtornos de Humor\n• Ansiedade e Depressão\n• Avaliações Psiquiátricas\n\nEle tem uma abordagem muito acolhedora! Gostaria de agendar uma consulta? ❤️`);
    }
    
    // Localização e endereço
    else if (msgLower.includes('endereço') || msgLower.includes('endereco') || 
             msgLower.includes('localização') || msgLower.includes('localizacao') ||
             msgLower.includes('onde fica') || msgLower.includes('local') ||
             msgLower.includes('lugar') || msgLower.includes('como chegar') ||
             msgLower.includes('fica onde') || msgLower.includes('localizar')) {
        
        const greeting = userSession.name ? `${userSession.name}, fico` : 'Fico';
        message.reply(`${greeting} feliz em te passar a localização! 😊📍\n\nO consultório do Dr. Marcos fica na Uniclínica!\n\n*Endereço:* [INSERIR ENDEREÇO AQUI]\n\nTemos estacionamento e fica em um local muito acessível! Se tiver qualquer dúvida sobre como chegar, me chama! ❤️`);
    }
    
    // Horários de funcionamento
    else if (msgLower.includes('funciona') || msgLower.includes('funcionamento') ||
             msgLower.includes('aberto') || msgLower.includes('fechado') ||
             msgLower.includes('que horas') || msgLower.includes('até que horas') ||
             msgLower.includes('ate que horas') || msgLower.includes('abre') ||
             msgLower.includes('fecha') || msgLower.includes('expediente')) {
        
        const greeting = userSession.name ? `${userSession.name}, te` : 'Te';
        message.reply(`${greeting} passo os horários com muito prazer! ��⏰\n\n*Horários de atendimento do Dr. Marcos:*\n🕐 *Segunda a Sexta:* 08h às 18h\n🕐 *Sábado:* 08h às 12h\n🚫 *Domingo:* Fechado\n\nEstou sempre aqui para organizar sua agenda! ❤️`);
    }
    
    // Valores, preços e convênios
    else if (msgLower.includes('valor') || msgLower.includes('preço') || msgLower.includes('preco') || 
             msgLower.includes('convênio') || msgLower.includes('convenio') || msgLower.includes('plano') ||
             msgLower.includes('quanto custa') || msgLower.includes('custo') ||
             msgLower.includes('pagamento') || msgLower.includes('aceita') || msgLower.includes('particular')) {
        
        const greeting = userSession.name ? `${userSession.name}, fico` : 'Fico';
        message.reply(`${greeting} feliz em esclarecer sobre valores e convênios! 😊💰\n\nO Dr. Marcos atende:\n• Diversos convênios médicos\n• Atendimento particular\n\nMe conta qual convênio você tem ou se é particular, que te passo todos os valores certinhos! ❤️`);
    }
    
    // Agradecimentos
    else if (msgLower.includes('obrigado') || msgLower.includes('obrigada') || msgLower.includes('valeu') || 
             msgLower.includes('brigado') || msgLower.includes('muito obrigado') ||
             msgLower.includes('agradeço') || msgLower.includes('grato') || msgLower.includes('grata')) {
        
        const greeting = userSession.name ? `${userSession.name}, imagina!` : 'Imagina!';
        message.reply(`${greeting} 😊 Fico muito feliz em poder te ajudar!\n\nO Dr. Marcos e eu estamos sempre aqui para vocês! Se precisar de mais alguma coisa, pode me chamar a qualquer momento! ❤️`);
    }
    
    // Despedidas
    else if (msgLower.includes('tchau') || msgLower.includes('até logo') || msgLower.includes('ate logo') || 
             msgLower.includes('bye') || msgLower.includes('até mais') || msgLower.includes('falou') ||
             msgLower.includes('xau') || msgLower.includes('até breve')) {
        
        const greeting = userSession.name ? `Até logo, ${userSession.name}!` : 'Até logo!';
        message.reply(`${greeting} 👋 Foi um prazer imenso te ajudar!\n\nQualquer coisa que precisar sobre as consultas com o Dr. Marcos, pode me chamar a qualquer momento! Cuide-se bem! ❤️😊`);
    }
    
    // Resposta padrão para qualquer outra mensagem
    else {
        if (!userSession.hasIntroduced) {
            userSession.hasIntroduced = true;
            if (userSession.name) {
                message.reply(`Olá ${userSession.name}! 😊 Eu sou a Camila, secretária do Dr. Marcos Figarella! Estou muito feliz em poder te ajudar!\n\nPosso te auxiliar com:\n• 📅 Agendamentos de consultas\n• ℹ️ Informações sobre atendimento\n• 📍 Endereço e horários\n• 💰 Convênios e valores\n\nComo posso te ajudar? ❤️`);
            } else {
                userSession.awaitingName = true;
                message.reply('Olá! 😊 Eu sou a Camila, secretária do Dr. Marcos Figarella! Estou muito feliz em falar com você! Para te atender melhor, qual é o seu nome? ❤️');
            }
        } else {
            const greeting = userSession.name ? `${userSession.name}, posso` : 'Posso';
            message.reply(`${greeting} te ajudar com:\n• 📅 Agendamentos de consultas\n• ℹ️ Informações sobre atendimento\n• 📍 Endereço e horários\n• 💰 Convênios e valores\n\nO que você precisa? ❤️`);
        }
    }
});

// Evento de desconexão
client.on('disconnected', (reason) => {
    console.log('Cliente desconectado:', reason);
    isClientReady = false;
    qrCodeData = '';
    qrCodeImage = '';
});

// Inicializar cliente WhatsApp
client.initialize();

// Configuração do servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    console.log(`Acesse: http://localhost:${PORT}/whatsapp para ver o QR Code`);
});
