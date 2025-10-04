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

// Função para obter horários disponíveis
function getAvailableSlots(date) {
    const dayOfWeek = date.getDay();
    
    if (dayOfWeek === 6) { // Sábado
        return ['08:00', '09:00', '10:00', '11:00'];
    } else { // Segunda a sexta
        return ['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'];
    }
}

// Função para mostrar menu principal
function getMainMenu(userName = null) {
    const greeting = userName ? `${userName}, escolha` : 'Escolha';
    return `${greeting} uma das opções abaixo digitando o número correspondente:\n\n1️⃣ Agendar consulta\n2️⃣ Informações de atendimento\n3️⃣ Endereço e horários\n4️⃣ Valor da consulta\n\nDigite apenas o número da opção desejada! 😊`;
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
    const msgTrimmed = message.body.trim();
    
    // Inicializar sessão do usuário se não existir
    if (!userSessions[userId]) {
        userSessions[userId] = {
            name: null,
            hasIntroduced: false,
            awaitingName: false,
            currentStep: null,
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
            message.reply(`Olá ${userSession.name}! 😊 Que alegria receber seu contato! Eu sou a Camila, secretária do Dr. Marcos Figarella! Estou muito feliz em poder te ajudar hoje!\n\n${getMainMenu(userSession.name)}`);
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
            message.reply(`Muito prazer, ${name}! 😊 Agora posso te atender com todo carinho!\n\n${getMainMenu(name)}`);
        } else {
            message.reply('Desculpe, não consegui entender seu nome. Pode me dizer novamente, por favor? Por exemplo: "Meu nome é João" ou "Me chamo Maria" 😊');
        }
    }
    
    // MENU PRINCIPAL - Opções 1, 2, 3, 4
    else if (userSession.currentStep === null && /^[1-4]$/.test(msgTrimmed)) {
        const option = parseInt(msgTrimmed);
        
        switch (option) {
            case 1: // Agendar consulta
                userSession.currentStep = 'scheduling_date';
                const availableDays = getNextAvailableDays();
                let daysText = '';
                availableDays.forEach((day, index) => {
                    daysText += `${index + 1}. ${day.formatted}\n`;
                });
                
                const greeting1 = userSession.name ? `${userSession.name}, que` : 'Que';
                message.reply(`${greeting1} maravilha! Fico muito feliz em ajudar você com o agendamento! 😊📅\n\nO Dr. Marcos atende:\n• Psiquiatria\n• Saúde Mental\n• Avaliações psiquiátricas\n\n*Dias disponíveis:*\n${daysText}\nDigite o número do dia que você prefere! ❤️`);
                break;
                
            case 2: // Informações de atendimento
                const greeting2 = userSession.name ? `${userSession.name}, fico` : 'Fico';
                message.reply(`${greeting2} muito feliz em esclarecer sobre o atendimento! 😊\n\n👨‍⚕️ *Dr. Marcos Figarella*\n• Psiquiatra com vasta experiência\n• Atendimento humanizado e acolhedor\n• Foco em Psiquiatria e Saúde Mental\n\n🔹 *Especialidades:*\n• Transtornos de Humor\n• Ansiedade e Depressão\n• Transtornos do Sono\n• Avaliações Psiquiátricas\n• Acompanhamento Psiquiátrico\n\n*Primeira consulta:* Avaliação completa\n*Retornos:* Acompanhamento e ajustes\n\n${getMainMenu(userSession.name)}`);
                break;
                
            case 3: // Endereço e horários
                const greeting3 = userSession.name ? `${userSession.name}, aqui` : 'Aqui';
                message.reply(`${greeting3} estão as informações de localização e horários! 😊📍\n\n🏥 *Endereço:*\nUniclínica\n[INSERIR ENDEREÇO COMPLETO AQUI]\n\n🕐 *Horários de atendimento:*\n• Segunda a Sexta: 08h às 18h\n• Sábado: 08h às 12h\n• Domingo: Fechado\n\n🚗 *Facilidades:*\n• Estacionamento disponível\n• Localização de fácil acesso\n• Transporte público próximo\n\n${getMainMenu(userSession.name)}`);
                break;
                
            case 4: // Valor da consulta
                const greeting4 = userSession.name ? `${userSession.name}, aqui` : 'Aqui';
                message.reply(`${greeting4} estão os valores das consultas! 😊💰\n\n💵 *Valor da Consulta: R$ 400,00*\n\n💳 *Formas de pagamento:*\n• Dinheiro\n• Cartão de débito/crédito\n• PIX\n• Transferência bancária\n\n*Observações:*\n• Mesmo valor para primeira consulta e retornos\n• Pagamento no dia da consulta\n• Valores transparentes, sem taxas extras\n\n${getMainMenu(userSession.name)}`);
                break;
        }
    }
    
    // AGENDAMENTO - Escolha de data
    else if (userSession.currentStep === 'scheduling_date' && /^[1-7]$/.test(msgTrimmed)) {
        const dayIndex = parseInt(msgTrimmed) - 1;
        const availableDays = getNextAvailableDays();
        
        if (dayIndex >= 0 && dayIndex < availableDays.length) {
            const selectedDay = availableDays[dayIndex];
            userSession.selectedDate = selectedDay.date;
            userSession.currentStep = 'scheduling_time';
            
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
    
    // AGENDAMENTO - Escolha de horário
    else if (userSession.currentStep === 'scheduling_time' && /^[1-8]$/.test(msgTrimmed)) {
        const timeIndex = parseInt(msgTrimmed) - 1;
        const availableSlots = getAvailableSlots(userSession.selectedDate);
        
        if (timeIndex >= 0 && timeIndex < availableSlots.length) {
            const selectedTime = availableSlots[timeIndex];
            userSession.selectedTime = selectedTime;
            userSession.currentStep = 'scheduling_confirm';
            
            const dateStr = userSession.selectedDate.toLocaleDateString('pt-BR', {
                weekday: 'long',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
            
            const greeting = userSession.name ? `${userSession.name}, ótima` : 'Ótima';
            message.reply(`${greeting} escolha! 😊\n\n*Resumo do agendamento:*\n📅 Data: ${dateStr}\n⏰ Horário: ${selectedTime}\n👨‍⚕️ Dr. Marcos Figarella\n💰 Valor: R$ 400,00\n\nPara confirmar, preciso do seu:\n• Telefone de contato\n• Se é primeira consulta ou retorno\n\nPode me passar essas informações? ❤️`);
        } else {
            message.reply('Por favor, digite um número válido correspondente ao horário que você deseja! 😊');
        }
    }
    
    // AGENDAMENTO - Confirmação final
    else if (userSession.currentStep === 'scheduling_confirm') {
        const greeting = userSession.name ? `${userSession.name}, perfeito!` : 'Perfeito!';
        
        const dateStr = userSession.selectedDate.toLocaleDateString('pt-BR', {
            weekday: 'long',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
        
        // Resetar sessão de agendamento
        userSession.currentStep = null;
        userSession.selectedDate = null;
        userSession.selectedTime = null;
        
        message.reply(`${greeting} Sua consulta foi agendada com sucesso! 🎉\n\n*Detalhes da consulta:*\n👤 Paciente: ${userSession.name}\n📅 Data: ${dateStr}\n⏰ Horário: ${userSession.selectedTime}\n👨‍⚕️ Dr. Marcos Figarella\n💰 Valor: R$ 400,00\n📱 Contato: ${message.body}\n\n*Importante:*\n• Chegue 15 minutos antes\n• Traga documento com foto\n• Em caso de cancelamento, avise com 24h de antecedência\n\n${getMainMenu(userSession.name)}`);
    }
    
    // Agradecimentos
    else if (msgLower.includes('obrigado') || msgLower.includes('obrigada') || msgLower.includes('valeu') || 
             msgLower.includes('brigado') || msgLower.includes('muito obrigado') ||
             msgLower.includes('agradeço') || msgLower.includes('grato') || msgLower.includes('grata')) {
        
        const greeting = userSession.name ? `${userSession.name}, imagina!` : 'Imagina!';
        message.reply(`${greeting} 😊 Fico muito feliz em poder te ajudar!\n\nO Dr. Marcos e eu estamos sempre aqui para vocês!\n\n${getMainMenu(userSession.name)}`);
    }
    
    // Despedidas
    else if (msgLower.includes('tchau') || msgLower.includes('até logo') || msgLower.includes('ate logo') || 
             msgLower.includes('bye') || msgLower.includes('até mais') || msgLower.includes('falou') ||
             msgLower.includes('xau') || msgLower.includes('até breve')) {
        
        const greeting = userSession.name ? `Até logo, ${userSession.name}!` : 'Até logo!';
        message.reply(`${greeting} 👋 Foi um prazer imenso te ajudar!\n\nQualquer coisa que precisar sobre as consultas com o Dr. Marcos, pode me chamar a qualquer momento! Cuide-se bem! ❤️😊`);
    }
    
    // Resposta padrão - mostrar menu
    else {
        if (!userSession.hasIntroduced) {
            userSession.hasIntroduced = true;
            if (userSession.name) {
                message.reply(`Olá ${userSession.name}! 😊 Eu sou a Camila, secretária do Dr. Marcos Figarella! Estou muito feliz em poder te ajudar!\n\n${getMainMenu(userSession.name)}`);
            } else {
                userSession.awaitingName = true;
                message.reply('Olá! �� Eu sou a Camila, secretária do Dr. Marcos Figarella! Estou muito feliz em falar com você! Para te atender melhor, qual é o seu nome? ❤️');
            }
        } else {
            message.reply(`${getMainMenu(userSession.name)}`);
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

