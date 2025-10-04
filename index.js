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
    
    if (hour >= 6 && hour < 12) {
        return 'Bom dia';
    } else if (hour >= 12 && hour < 18) {
        return 'Boa tarde';
    } else if (hour >= 18 && hour < 24) {
        return 'Boa noite';
    } else { // 0h às 6h
        return 'Boa madrugada';
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
    return `${greeting} pode me dizer o que precisa hoje? Posso te ajudar com:

1. Agendar uma consulta
2. Informações sobre o atendimento
3. Endereço e horários da clínica
4. Valor da consulta

É só digitar o número da opção que você quer! 😊`;
}

// Função para mostrar opção de voltar ao menu
function getBackToMenuOption() {
    return `

Se quiser ver outras opções, é só digitar *0* para voltar ao menu principal! 😊`;
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
    const timeGreeting = getGreetingByTime(); // SEMPRE obter saudação atual
    
    // Inicializar sessão do usuário se não existir
    if (!userSessions[userId]) {
        userSessions[userId] = {
            name: null,
            hasIntroduced: false,
            awaitingName: false,
            currentStep: null,
            selectedDate: null,
            selectedTime: null,
            userPreference: null,
            patientData: {
                fullName: null,
                cpf: null,
                birthDate: null,
                address: null
            }
        };
    }
    
    const userSession = userSessions[userId];
    
    // Voltar ao menu principal
    if (msgTrimmed === '0') {
        userSession.currentStep = null;
        userSession.selectedDate = null;
        userSession.selectedTime = null;
        userSession.userPreference = null;
        userSession.patientData = {
            fullName: null,
            cpf: null,
            birthDate: null,
            address: null
        };
        message.reply(`${getMainMenu(userSession.name)}`);
        return;
    }
    
    // Saudações iniciais - primeira interação (PRIORIDADE MÁXIMA)
    if (!userSession.hasIntroduced && (
        msgLower.includes('oi') || msgLower.includes('olá') || msgLower.includes('ola') || 
        msgLower.includes('bom dia') || msgLower.includes('boa tarde') || msgLower.includes('boa noite') ||
        msgLower.includes('alô') || msgLower.includes('alo') || msgLower.includes('ei') ||
        msgLower.includes('hello') || msgLower.includes('opa') || msgLower.includes('oie'))) {
        
        userSession.hasIntroduced = true;
        userSession.awaitingName = true;
        
        message.reply(`${timeGreeting}! Que alegria receber sua mensagem! Eu sou a Camila, trabalho como secretária do Dr. Marcos Figarella. Adoraria te conhecer melhor - qual é o seu nome? 😊`);
        return;
    }
    
    // Se está aguardando o nome (SEGUNDA PRIORIDADE)
    if (userSession.awaitingName && !userSession.name) {
        const name = extractName(message.body);
        if (name) {
            userSession.name = name;
            userSession.awaitingName = false;
            message.reply(`Que prazer te conhecer, ${name}! Agora posso te atender de forma mais pessoal. Como posso te ajudar hoje?

${getMainMenu(name)}`);
        } else {
            message.reply('Desculpe, não consegui entender direito seu nome. Pode me falar novamente? Você pode dizer algo como "Meu nome é João" ou "Eu me chamo Maria" 😊');
        }
        return;
    }
    
    // MENU PRINCIPAL - Opções 1, 2, 3, 4
    if (userSession.currentStep === null && /^[1-4]$/.test(msgTrimmed)) {
        const option = parseInt(msgTrimmed);
        
        switch (option) {
            case 1: // Agendar consulta
                userSession.currentStep = 'scheduling_preference';
                const greeting1 = userSession.name ? `${userSession.name}` : 'Você';
                message.reply(`${timeGreeting}, ${greeting1}! Que ótimo que quer agendar uma consulta! Fico muito feliz em organizar isso para você! 😊

O Dr. Marcos Figarella atua na área de psiquiatria e saúde mental, com atendimento humanizado e acolhedor.

Ele atende nos seguintes dias:
• Segunda-feira
• Quarta-feira
• Quinta-feira
• Sexta-feira
• Sábado

Me conta qual horário combina melhor com você? Por exemplo, você prefere de manhã, à tarde, ou tem algum horário específico em mente?${getBackToMenuOption()}`);
                break;
                
            case 2: // Informações de atendimento
                const greeting2 = userSession.name ? `${userSession.name}` : 'Você';
                message.reply(`${timeGreeting}, ${greeting2}! Vou te contar um pouco sobre o Dr. Marcos e como funciona o atendimento aqui na clínica! 😊

*Sobre o Dr. Marcos Figarella:*
Ele atua na área de psiquiatria e saúde mental, com atendimento humanizado e acolhedor. Os pacientes sempre falam como se sentem à vontade com ele!

*O que ele trata:*
• Transtornos de Humor
• Ansiedade e Depressão
• Problemas de Sono
• Avaliações Psiquiátricas completas
• Acompanhamento contínuo

*Como funciona:*
- Na primeira consulta, ele faz uma avaliação bem completa
- Nos retornos, acompanha sua evolução e ajusta o tratamento

Tem alguma dúvida específica sobre o atendimento?${getBackToMenuOption()}`);
                break;
                
            case 3: // Endereço e horários
                const greeting3 = userSession.name ? `${userSession.name}` : 'Você';
                message.reply(`${timeGreeting}, ${greeting3}! Vou te passar todas as informações de localização e horários! 😊

*Nossa clínica fica na:*
Uniclínica Saúde e Bem Estar
Rua 15 de Agosto, 605 - Centro
Santarém - PA, 68005-300

*Horários do Dr. Marcos:*
• Segunda-feira: 8h às 18h
• Quarta-feira: 8h às 18h
• Quinta-feira: 8h às 18h
• Sexta-feira: 8h às 18h
• Sábado: 8h às 12h

*Facilidades:*
• Temos estacionamento no local
• Fica bem no centro, fácil de chegar
• Tem transporte público por perto

Precisa de mais alguma informação sobre a localização?${getBackToMenuOption()}`);
                break;
                
            case 4: // Valor da consulta
                const greeting4 = userSession.name ? `${userSession.name}` : 'Você';
                message.reply(`${timeGreeting}, ${greeting4}! Vou te explicar sobre os valores e formas de pagamento! 😊

*Valor da Consulta: R$ 400,00*
(O mesmo valor para primeira consulta e retornos)

*Como você pode pagar:*
• PIX (super prático!)
• Transferência bancária
• Em breve estaremos aceitando cartões de crédito e débito

*Observações importantes:*
• O pagamento é feito no dia da consulta
• Nossos valores são transparentes, sem taxas extras
• Se precisar do PIX, posso te passar na hora do agendamento

Tem alguma dúvida sobre o pagamento?${getBackToMenuOption()}`);
                break;
        }
        return;
    }
    
    // AGENDAMENTO - Capturar preferência de horário
    if (userSession.currentStep === 'scheduling_preference') {
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
        message.reply(`Perfeito, ${greeting}! Deixa eu verificar a agenda do Dr. Marcos... 😊

Tenho uma ótima opção para você:

📅 *${dateStr}*
⏰ *${suggestedTime}*
👨‍⚕️ *Dr. Marcos Figarella*
💰 *R$ 400,00*

Esse horário funciona bem para você? Se sim, vou precisar de alguns dados para finalizar o agendamento:

• Nome completo do paciente
• CPF
• Data de nascimento
• Endereço completo

Se preferir outro horário, é só me avisar!${getBackToMenuOption()}`);
        return;
    }
    
    // AGENDAMENTO - Confirmação e coleta de dados
    if (userSession.currentStep === 'scheduling_suggest') {
        if (msgLower.includes('sim') || msgLower.includes('confirmo') || msgLower.includes('ok') || 
            msgLower.includes('pode ser') || msgLower.includes('aceito')) {
            
            userSession.currentStep = 'collecting_patient_data';
            const greeting = userSession.name ? `${userSession.name}` : 'Você';
            message.reply(`Perfeito, ${greeting}! Vamos finalizar seu agendamento. Preciso que me passe os seguintes dados:

*1. Nome completo do paciente:*
(Por favor, digite o nome completo)`);
        } else {
            message.reply(`Sem problema! Me fala qual horário você prefere e vou ver outras opções na agenda do Dr. Marcos! 😊

Pode ser algo como "prefiro de manhã", "melhor à tarde", ou um horário específico como "16h".${getBackToMenuOption()}`);
        }
        return;
    }
    
    // AGENDAMENTO - Coletando dados do paciente
    if (userSession.currentStep === 'collecting_patient_data') {
        if (!userSession.patientData.fullName) {
            userSession.patientData.fullName = message.body;
            message.reply(`Obrigada! Nome: ${message.body}

*2. CPF do paciente:*
(Digite apenas os números ou com pontos e traços)`);
        } else if (!userSession.patientData.cpf) {
            userSession.patientData.cpf = message.body;
            message.reply(`Perfeito! CPF: ${message.body}

*3. Data de nascimento:*
(Digite no formato DD/MM/AAAA)`);
        } else if (!userSession.patientData.birthDate) {
            userSession.patientData.birthDate = message.body;
            message.reply(`Ótimo! Data de nascimento: ${message.body}

*4. Endereço completo:*
(Rua, número, bairro, cidade)`);
        } else if (!userSession.patientData.address) {
            userSession.patientData.address = message.body;
            userSession.currentStep = 'scheduling_final_confirm';
            
            const dateStr = userSession.selectedDate.toLocaleDateString('pt-BR', {
                weekday: 'long',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
            
            message.reply(`Maravilha! Todos os dados coletados! 🎉

*Resumo da consulta:*
👤 Paciente: ${userSession.patientData.fullName}
📄 CPF: ${userSession.patientData.cpf}
🎂 Data de nascimento: ${userSession.patientData.birthDate}
🏠 Endereço: ${userSession.patientData.address}
📅 Data: ${dateStr}
⏰ Horário: ${userSession.selectedTime}
👨‍⚕️ Dr. Marcos Figarella
💰 Valor: R$ 400,00

*Lembretes importantes:*
• Chegue uns 15 minutinhos antes
• Traga um documento com foto
• Se precisar cancelar, me avise com pelo menos 24h de antecedência

Sua consulta está confirmada! Estou aqui se precisar de mais alguma coisa!${getBackToMenuOption()}`);
            
            // Resetar dados após confirmação
            userSession.currentStep = null;
            userSession.selectedDate = null;
            userSession.selectedTime = null;
            userSession.userPreference = null;
            userSession.patientData = {
                fullName: null,
                cpf: null,
                birthDate: null,
                address: null
            };
        }
        return;
    }
    
    // Agradecimentos
    if (msgLower.includes('obrigado') || msgLower.includes('obrigada') || msgLower.includes('valeu') || 
             msgLower.includes('brigado') || msgLower.includes('muito obrigado') ||
             msgLower.includes('agradeço') || msgLower.includes('grato') || msgLower.includes('grata')) {
        
        const greeting = userSession.name ? `${userSession.name}` : 'Você';
        message.reply(`Imagina, ${greeting}! Foi um prazer te ajudar! 😊

O Dr. Marcos e eu estamos sempre aqui quando você precisar. Se surgir qualquer dúvida, é só me chamar!

${getMainMenu(userSession.name)}`);
        return;
    }
    
    // Despedidas
    if (msgLower.includes('tchau') || msgLower.includes('até logo') || msgLower.includes('ate logo') || 
             msgLower.includes('bye') || msgLower.includes('até mais') || msgLower.includes('falou') ||
             msgLower.includes('xau') || msgLower.includes('até breve')) {
        
        const greeting = userSession.name ? `Até mais, ${userSession.name}!` : 'Até mais!';
        message.reply(`${greeting} Foi muito bom conversar com você! 😊

Sempre que precisar de alguma coisa relacionada às consultas do Dr. Marcos, pode me procurar. Cuide-se bem! ❤️`);
        return;
    }
    
    // Resposta padrão - APENAS se não foi apresentada ainda
    if (!userSession.hasIntroduced) {
        userSession.hasIntroduced = true;
        userSession.awaitingName = true;
        message.reply(`${timeGreeting}! Eu sou a Camila, trabalho como secretária do Dr. Marcos Figarella. Qual é o seu nome? Gosto de conhecer as pessoas com quem converso! 😊`);
    } else {
        message.reply(`${getMainMenu(userSession.name)}`);
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
