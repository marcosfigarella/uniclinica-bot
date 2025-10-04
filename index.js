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

// Função para obter saudação baseada no horário
function getGreetingByTime() {
    const now = new Date();
    const hour = now.getHours();
    
    if (hour >= 5 && hour < 12) {
        return 'Bom dia';
    } else if (hour >= 12 && hour < 18) {
        return 'Boa tarde';
    } else {
        return 'Boa noite';
    }
}

// Função para obter próximos dias úteis disponíveis
function getNextAvailableDays(count = 10) {
    const days = [];
    const today = new Date();
    let currentDate = new Date(today);
    currentDate.setDate(currentDate.getDate() + 1);
    
    while (days.length < count) {
        const dayOfWeek = currentDate.getDay();
        
        // Segunda (1), Quarta (3), Quinta (4), Sexta (5), Sábado (6)
        if (dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 4 || dayOfWeek === 5 || dayOfWeek === 6) {
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

// Função para simular consulta ao Google Calendar e sugerir horário
function suggestAvailableTime(date, userPreference = null) {
    const dayOfWeek = date.getDay();
    let availableSlots = [];
    
    if (dayOfWeek === 6) { // Sábado
        availableSlots = ['08:00', '09:00', '10:00', '11:00'];
    } else { // Segunda, Quarta, Quinta, Sexta
        availableSlots = ['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'];
    }
    
    // Simular alguns horários ocupados
    const occupiedSlots = ['09:00', '15:00'];
    const freeSlots = availableSlots.filter(slot => !occupiedSlots.includes(slot));
    
    // Se o usuário tem preferência, tentar acomodar
    if (userPreference) {
        const preferredHour = extractPreferredTime(userPreference);
        if (preferredHour && freeSlots.includes(preferredHour)) {
            return preferredHour;
        }
    }
    
    return freeSlots.length > 0 ? freeSlots[0] : availableSlots[0];
}

// Função para extrair preferência de horário
function extractPreferredTime(message) {
    const msgLower = message.toLowerCase();
    
    if (msgLower.includes('manhã') || msgLower.includes('manha') || msgLower.includes('cedo')) {
        return '08:00';
    }
    
    if (msgLower.includes('tarde') || msgLower.includes('14') || msgLower.includes('15') || msgLower.includes('16')) {
        return '14:00';
    }
    
    const timeRegex = /(\d{1,2}):?(\d{0,2})\s*(h|horas?)?/g;
    const matches = message.match(timeRegex);
    
    if (matches) {
        for (let match of matches) {
            const cleanTime = match.replace(/[^\d:]/g, '');
            if (cleanTime.includes(':')) {
                return cleanTime.length === 4 ? '0' + cleanTime : cleanTime;
            } else if (cleanTime.length <= 2) {
                const hour = parseInt(cleanTime);
                if (hour >= 8 && hour <= 17) {
                    return hour.toString().padStart(2, '0') + ':00';
                }
            }
        }
    }
    
    return null;
}

// Função para mostrar menu principal
function getMainMenu(userName = null) {
    const greeting = userName ? `${userName}` : 'Você';
    return `${greeting} pode me dizer o que precisa hoje? Posso te ajudar com:\\\n\\\n1. Agendar uma consulta\\\n2. Informações sobre o atendimento\\\n3. Endereço e horários da clínica\\\n4. Valor da consulta\\\n\\\nÉ só digitar o número da opção que você quer! 😊`;
}

// Função para mostrar opção de voltar ao menu
function getBackToMenuOption() {
    return '\\\n\\\nSe quiser ver outras opções, é só digitar *0* para voltar ao menu principal! 😊';
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
    const timeGreeting = getGreetingByTime();
    
    // Inicializar sessão do usuário se não existir
    if (!userSessions[userId]) {
        userSessions[userId] = {
            name: null,
            hasIntroduced: false,
            awaitingName: false,
            currentStep: null,
            selectedDate: null,
            selectedTime: null,
            userPreference: null
        };
    }
    
    const userSession = userSessions[userId];
    
    // Tentar extrair nome da mensagem atual
    const extractedName = extractName(message.body);
    if (extractedName && !userSession.name) {
        userSession.name = extractedName;
        userSession.awaitingName = false;
    }
    
    // Voltar ao menu principal
    if (msgTrimmed === '0') {
        userSession.currentStep = null;
        userSession.selectedDate = null;
        userSession.selectedTime = null;
        userSession.userPreference = null;
        message.reply(`${getMainMenu(userSession.name)}`);
        return;
    }
    
    // Saudações iniciais - primeira interação
    if (!userSession.hasIntroduced && (
        msgLower.includes('oi') || msgLower.includes('olá') || msgLower.includes('ola') || 
        msgLower.includes('bom dia') || msgLower.includes('boa tarde') || msgLower.includes('boa noite') ||
        msgLower.includes('alô') || msgLower.includes('alo') || msgLower.includes('ei') ||
        msgLower.includes('hello') || msgLower.includes('opa') || msgLower.includes('oie'))) {
        
        userSession.hasIntroduced = true;
        
        if (userSession.name) {
            message.reply(`${timeGreeting}, ${userSession.name}! Que bom te encontrar aqui! Eu sou a Camila, trabalho como secretária do Dr. Marcos Figarella. Fico muito feliz em poder conversar com você hoje!\\\n\\\n${getMainMenu(userSession.name)}`);
        } else {
            userSession.awaitingName = true;
            message.reply(`${timeGreeting}! Que alegria receber sua mensagem! Eu sou a Camila, trabalho como secretária do Dr. Marcos Figarella. Adoraria te conhecer melhor - qual é o seu nome? 😊`);
        }
    }
    
    // Se está aguardando o nome
    else if (userSession.awaitingName && !userSession.name) {
        const name = extractName(message.body);
        if (name) {
            userSession.name = name;
            userSession.awaitingName = false;
            message.reply(`Que prazer te conhecer, ${name}! Agora posso te atender de forma mais pessoal. Como posso te ajudar hoje?\\\n\\\n${getMainMenu(name)}`);
        } else {
            message.reply('Desculpe, não consegui entender direito seu nome. Pode me falar novamente? Você pode dizer algo como "Meu nome é João" ou "Eu me chamo Maria" 😊');
        }
    }
    
    // MENU PRINCIPAL - Opções 1, 2, 3, 4
    else if (userSession.currentStep === null && /^[1-4]$/.test(msgTrimmed)) {
        const option = parseInt(msgTrimmed);
        
        switch (option) {
            case 1: // Agendar consulta
                userSession.currentStep = 'scheduling_preference';
                const greeting1 = userSession.name ? `${userSession.name}` : 'Você';
                message.reply(`Que ótimo, ${greeting1} quer agendar uma consulta! Fico muito feliz em organizar isso para você! 😊\\\n\\\nO Dr. Marcos é especialista em:\\\n• Psiquiatria\\\n• Saúde Mental\\\n• Avaliações psiquiátricas\\\n\\\nEle atende nos seguintes dias:\\\n• Segunda-feira\\\n• Quarta-feira\\\n• Quinta-feira\\\n• Sexta-feira\\\n• Sábado\\\n\\\nMe conta qual horário combina melhor com você? Por exemplo, você prefere de manhã, à tarde, ou tem algum horário específico em mente?${getBackToMenuOption()}`);
                break;
                
            case 2: // Informações de atendimento
                const greeting2 = userSession.name ? `${userSession.name}` : 'Você';
                message.reply(`Claro, ${greeting2}! Vou te contar um pouco sobre o Dr. Marcos e como funciona o atendimento aqui na clínica! 😊\\\n\\\n*Sobre o Dr. Marcos Figarella:*\\\nEle é um psiquiatra muito experiente e tem uma forma muito acolhedora de atender. Os pacientes sempre falam como se sentem à vontade com ele!\\\n\\\n*O que ele trata:*\\\n• Transtornos de Humor\\\n• Ansiedade e Depressão\\\n• Problemas de Sono\\\n• Avaliações Psiquiátricas completas\\\n• Acompanhamento contínuo\\\n\\\n*Como funciona:*\\\n- Na primeira consulta, ele faz uma avaliação bem completa\\\n- Nos retornos, acompanha sua evolução e ajusta o tratamento\\\n\\\nTem alguma dúvida específica sobre o atendimento?${getBackToMenuOption()}`);
                break;
                
            case 3: // Endereço e horários
                const greeting3 = userSession.name ? `${userSession.name}` : 'Você';
                message.reply(`Perfeito, ${greeting3}! Vou te passar todas as informações de localização e horários! 😊\\\n\\\n*Nossa clínica fica na:*\\\nUniclínica Saúde e Bem Estar\\\nRua 15 de Agosto, 605 - Centro\\\nSantarém - PA, 68005-300\\\n\\\n*Horários do Dr. Marcos:*\\\n• Segunda-feira: 8h às 18h\\\n• Quarta-feira: 8h às 18h\\\n• Quinta-feira: 8h às 18h\\\n• Sexta-feira: 8h às 18h\\\n• Sábado: 8h às 12h\\\n\\\n*Facilidades:*\\\n• Temos estacionamento no local\\\n• Fica bem no centro, fácil de chegar\\\n• Tem transporte público por perto\\\n\\\nPrecisa de mais alguma informação sobre a localização?${getBackToMenuOption()}`);
                break;
                
            case 4: // Valor da consulta
                const greeting4 = userSession.name ? `${userSession.name}` : 'Você';
                message.reply(`Claro, ${greeting4}! Vou te explicar sobre os valores e formas de pagamento! 😊\\\n\\\n*Valor da Consulta: R$ 400,00*\\\n(O mesmo valor para primeira consulta e retornos)\\\n\\\n*Como você pode pagar:*\\\n• PIX (super prático!)\\\n• Transferência bancária\\\n• Em breve estaremos aceitando cartões de crédito e débito\\\n\\\n*Observações importantes:*\\\n• O pagamento é feito no dia da consulta\\\n• Nossos valores são transparentes, sem taxas extras\\\n• Se precisar do PIX, posso te passar na hora do agendamento\\\n\\\nTem alguma dúvida sobre o pagamento?${getBackToMenuOption()}`);
                break;
        }
    }
    
    // AGENDAMENTO - Capturar preferência de horário
    else if (userSession.currentStep === 'scheduling_preference') {
        userSession.userPreference = message.body;
        userSession.currentStep = 'scheduling_suggest';
        
        // Obter próximo dia disponível baseado na preferência
        const availableDays = getNextAvailableDays();
        const nextAvailableDay = availableDays[0];
        
        // Sugerir horário baseado na preferência e disponibilidade
        const suggestedTime = suggestAvailableTime(nextAvailableDay.date, message.body);
        
        userSession.selectedDate = nextAvailableDay.date;
        userSession.selectedTime = suggestedTime;
        
        const dateStr = nextAvailableDay.date.toLocaleDateString('pt-BR', {
            weekday: 'long',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
        
        const greeting = userSession.name ? `${userSession.name}` : 'Você';
        message.reply(`Perfeito, ${greeting}! Deixa eu verificar a agenda do Dr. Marcos... 😊\\\n\\\nTenho uma ótima opção para você:\\\n\\\n📅 *${dateStr}*\\\n⏰ *${suggestedTime}*\\\n👨‍⚕️ *Dr. Marcos Figarella*\\\n💰 *R$ 400,00*\\\n\\\nEsse horário funciona bem para você? Se sim, me passa seu telefone e me conta se é sua primeira consulta ou se você já é paciente do Dr. Marcos!\\\n\\\nSe preferir outro horário, é só me avisar!${getBackToMenuOption()}`);
    }
    
    // AGENDAMENTO - Confirmação final
    else if (userSession.currentStep === 'scheduling_suggest') {
        if (msgLower.includes('sim') || msgLower.includes('confirmo') || msgLower.includes('ok') || 
            msgLower.includes('pode ser') || msgLower.includes('aceito') || /\d{8,}/.test(message.body)) {
            
            const greeting = userSession.name ? `${userSession.name}` : 'Você';
            
            const dateStr = userSession.selectedDate.toLocaleDateString('pt-BR', {
                weekday: 'long',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
            
            // Resetar sessão de agendamento
            const confirmedTime = userSession.selectedTime;
            userSession.currentStep = null;
            userSession.selectedDate = null;
            userSession.selectedTime = null;
            userSession.userPreference = null;
            
            message.reply(`Maravilha, ${greeting}! Sua consulta está confirmada! 🎉\\\n\\\n*Resumo da sua consulta:*\\\n👤 ${userSession.name}\\\n📅 ${dateStr}\\\n⏰ ${confirmedTime}\\\n👨‍⚕️ Dr. Marcos Figarella\\\n💰 R$ 400,00\\\n📱 ${message.body}\\\n\\\n*Lembretes importantes:*\\\n• Chegue uns 15 minutinhos antes\\\n• Traga um documento com foto\\\n• Se precisar cancelar, me avise com pelo menos 24h de antecedência\\\n\\\nEstou aqui se precisar de mais alguma coisa!${getBackToMenuOption()}`);
        } else {
            message.reply(`Sem problema! Me fala qual horário você prefere e vou ver outras opções na agenda do Dr. Marcos! 😊\\\n\\\nPode ser algo como "prefiro de manhã", "melhor à tarde", ou um horário específico como "16h".${getBackToMenuOption()}`);
        }
    }
    
    // Agradecimentos
    else if (msgLower.includes('obrigado') || msgLower.includes('obrigada') || msgLower.includes('valeu') || 
             msgLower.includes('brigado') || msgLower.includes('muito obrigado') ||
             msgLower.includes('agradeço') || msgLower.includes('grato') || msgLower.includes('grata')) {
        
        const greeting = userSession.name ? `${userSession.name}` : 'Você';
        message.reply(`Imagina, ${greeting}! Foi um prazer te ajudar! 😊\\\n\\\nO Dr. Marcos e eu estamos sempre aqui quando você precisar. Se surgir qualquer dúvida, é só me chamar!\\\n\\\n${getMainMenu(userSession.name)}`);
    }
    
    // Despedidas
    else if (msgLower.includes('tchau') || msgLower.includes('até logo') || msgLower.includes('ate logo') || 
             msgLower.includes('bye') || msgLower.includes('até mais') || msgLower.includes('falou') ||
             msgLower.includes('xau') || msgLower.includes('até breve')) {
        
        const greeting = userSession.name ? `Até mais, ${userSession.name}!` : 'Até mais!';
        message.reply(`${greeting} Foi muito bom conversar com você! 😊\\\n\\\nSempre que precisar de alguma coisa relacionada às consultas do Dr. Marcos, pode me procurar. Cuide-se bem! ❤️`);
    }
    
    // Resposta padrão - mostrar menu
    else {
        if (!userSession.hasIntroduced) {
            userSession.hasIntroduced = true;
            if (userSession.name) {
                message.reply(`${timeGreeting}, ${userSession.name}! Eu sou a Camila, trabalho como secretária do Dr. Marcos Figarella. Como posso te ajudar hoje?\\\n\\\n${getMainMenu(userSession.name)}`);
            } else {
                userSession.awaitingName = true;
                message.reply(`${timeGreeting}! Eu sou a Camila, trabalho como secretária do Dr. Marcos Figarella. Qual é o seu nome? Gosto de conhecer as pessoas com quem converso! 😊`);
            }
        } else {
            message.reply(`Não entendi muito bem o que você precisa, mas estou aqui para te ajudar! 😊\\\n\\\n${getMainMenu(userSession.name)}`);
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
