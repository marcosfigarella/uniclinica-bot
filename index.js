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
        // Gera imagem do QR Code em base64
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

// Evento para mensagens recebidas
client.on('message', message => {
    console.log(`Mensagem recebida: ${message.body}`);
    
    const msgLower = message.body.toLowerCase();
    
    // Saudações e apresentação inicial
    if (msgLower.includes('oi') || msgLower.includes('olá') || msgLower.includes('ola') || 
        msgLower.includes('bom dia') || msgLower.includes('boa tarde') || msgLower.includes('boa noite') ||
        msgLower.includes('alô') || msgLower.includes('alo') || msgLower.includes('ei') ||
        msgLower.includes('hello') || msgLower.includes('opa') || msgLower.includes('oie')) {
        message.reply('Olá! �� Que alegria receber seu contato! Eu sou a Camila, secretária do Dr. Marcos Figarella! Estou muito feliz em poder te ajudar hoje! Como posso te auxiliar? Estou aqui, totalmente disponível e à disposição 24 horas por dia para agendamentos! ❤️');
    }
    
    // Agendamentos
    else if (msgLower.includes('agendar') || msgLower.includes('consulta') || msgLower.includes('marcar') ||
             msgLower.includes('quero marcar') || msgLower.includes('quero agendar') || 
             msgLower.includes('gostaria de marcar') || msgLower.includes('gostaria de agendar') ||
             msgLower.includes('preciso marcar') || msgLower.includes('preciso agendar') ||
             msgLower.includes('como faço para marcar') || msgLower.includes('como marco') ||
             msgLower.includes('como agendo') || msgLower.includes('queria marcar') ||
             msgLower.includes('queria agendar') || msgLower.includes('posso marcar') ||
             msgLower.includes('posso agendar') || msgLower.includes('agenda') ||
             msgLower.includes('horário') || msgLower.includes('horario') ||
             msgLower.includes('disponibilidade') || msgLower.includes('vaga')) {
        message.reply('Que maravilha! Fico muito feliz em ajudar você com o agendamento do Dr. Marcos! 😊📅\n\nO Dr. Marcos atende:\n• Psiquiatria\n• Saúde Mental\n• Avaliações psiquiátricas\n\nPara agendar sua consulta com todo carinho, preciso de:\n• Seu nome completo\n• Telefone de contato\n• Se é primeira consulta ou retorno\n• Sua preferência de horário\n\nVou verificar a agenda do doutor com muito prazer! Estou aqui 24h para facilitar seu agendamento! ❤️');
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
        message.reply('Claro! Estou aqui com muito prazer para te ajudar! 😊 Sou a Camila, secretária do Dr. Marcos Figarella, e fico muito feliz em esclarecer tudo para você!\n\nPosso te dar informações sobre:\n\n📅 *Agendamentos*\n• Como marcar consultas\n• Horários disponíveis\n• Reagendamentos\n• Disponível 24h para marcações\n\n👨‍⚕️ *Dr. Marcos Figarella*\n• Atendimento em Psiquiatria\n• Saúde Mental\n• Experiência e cuidado com pacientes\n\n🏥 *Consultório*\n• Endereço e localização\n• Horários de funcionamento\n\n💰 *Valores e Convênios*\n• Preços das consultas\n• Convênios aceitos\n\nSobre o que você gostaria de saber? Estou totalmente à disposição! ❤️');
    }
    
    // Dr. Marcos e suas especialidades
    else if (msgLower.includes('psiquiatria') || msgLower.includes('psiquiatra') || 
             msgLower.includes('marcos') || msgLower.includes('dr marcos') ||
             msgLower.includes('doutor marcos') || msgLower.includes('médico') ||
             msgLower.includes('medico') || msgLower.includes('saude mental') ||
             msgLower.includes('saúde mental') || msgLower.includes('doutor') ||
             msgLower.includes('especialidade') || msgLower.includes('atende') ||
             msgLower.includes('trata')) {
        message.reply('Que alegria falar sobre o Dr. Marcos! 😊 Ele atende Psiquiatria e Saúde Mental com muito carinho e dedicação! 👨‍⚕️\n\n*O Dr. Marcos atende:*\n• Psiquiatria Geral\n• Saúde Mental\n• Transtornos de Humor\n• Ansiedade e Depressão\n• Avaliações Psiquiátricas\n\nEle tem uma abordagem muito acolhedora e vasta experiência! Gostaria de agendar uma consulta? Estou aqui 24h para facilitar tudo para você! ❤️');
    }
    
    // Localização e endereço
    else if (msgLower.includes('endereço') || msgLower.includes('endereco') || 
             msgLower.includes('localização') || msgLower.includes('localizacao') ||
             msgLower.includes('onde fica') || msgLower.includes('local') ||
             msgLower.includes('lugar') || msgLower.includes('como chegar') ||
             msgLower.includes('fica onde') || msgLower.includes('localizar')) {
        message.reply('Claro! Fico feliz em te passar a localização! 😊📍\n\nO consultório do Dr. Marcos fica na Uniclínica!\n\n*Endereço:* [INSERIR ENDEREÇO AQUI]\n\nTemos estacionamento e fica em um local muito acessível! Se tiver qualquer dúvida sobre como chegar, me chama que te ajudo com muito prazer! Estou aqui 24h para facilitar tudo! ❤️');
    }
    
    // Horários de funcionamento - ATUALIZADO
    else if (msgLower.includes('funciona') || msgLower.includes('funcionamento') ||
             msgLower.includes('aberto') || msgLower.includes('fechado') ||
             msgLower.includes('que horas') || msgLower.includes('até que horas') ||
             msgLower.includes('ate que horas') || msgLower.includes('abre') ||
             msgLower.includes('fecha') || msgLower.includes('expediente')) {
        message.reply('Claro! Te passo os horários com muito prazer! 😊⏰\n\n*Horários de atendimento do Dr. Marcos:*\n🕐 *Segunda a Sexta:* 08h às 18h\n🕐 *Sábado:* 08h às 12h\n🚫 *Domingo:* Fechado\n\n*Para agendamentos:*\n📱 *24 horas por dia, 7 dias por semana!*\n\nEstou sempre aqui para organizar sua agenda da melhor forma possível! ❤️');
    }
    
    // Valores, preços e convênios
    else if (msgLower.includes('valor') || msgLower.includes('preço') || msgLower.includes('preco') || 
             msgLower.includes('convênio') || msgLower.includes('convenio') || msgLower.includes('plano') ||
             msgLower.includes('quanto custa') || msgLower.includes('custo') ||
             msgLower.includes('pagamento') || msgLower.includes('aceita') || msgLower.includes('particular')) {
        message.reply('Claro! Fico feliz em esclarecer sobre valores e convênios! 😊💰\n\nO Dr. Marcos atende:\n• Diversos convênios médicos\n• Atendimento particular\n\nMe conta qual convênio você tem ou se é particular, que te passo todos os valores certinhos! Estou aqui 24h para te ajudar com transparência e carinho! ❤️');
    }
    
    // Emergência e urgência
    else if (msgLower.includes('urgente') || msgLower.includes('emergência') || msgLower.includes('emergencia') ||
             msgLower.includes('preciso urgente') || msgLower.includes('é urgente') ||
             msgLower.includes('rápido') || msgLower.includes('rapido') ||
             msgLower.includes('hoje') || msgLower.includes('agora') ||
             msgLower.includes('crise') || msgLower.includes('mal')) {
        message.reply('Entendo perfeitamente que é urgente! 🚨 Estou aqui para te ajudar!\n\nPara emergências psiquiátricas:\n• *SAMU:* 192\n• *CVV:* 188\n\nSe precisar falar com o Dr. Marcos urgentemente:\n*Telefone:* [INSERIR TELEFONE]\n\nVou fazer o possível para conseguir um encaixe rápido na agenda! Estou disponível 24h para agendamentos! Conte comigo! ❤️');
    }
    
    // Cancelamento e reagendamento
    else if (msgLower.includes('cancelar') || msgLower.includes('desmarcar') || msgLower.includes('remarcar') ||
             msgLower.includes('reagendar') || msgLower.includes('mudar') ||
             msgLower.includes('trocar horário') || msgLower.includes('não posso ir') ||
             msgLower.includes('nao posso ir') || msgLower.includes('impedimento') ||
             msgLower.includes('alterar')) {
        message.reply('Sem problemas! Entendo perfeitamente! 😊 Vou ajustar a agenda do Dr. Marcos para você com muito prazer!\n\nMe passa:\n• Seu nome\n• Data da consulta agendada\n\nE se quiser remarcar, me fala uma nova preferência! Sempre tentamos acomodar da melhor forma! Estou aqui 24h para facilitar tudo! ❤️📅');
    }
    
    // Quem é Camila
    else if (msgLower.includes('quem é você') || msgLower.includes('quem e voce') || 
             msgLower.includes('seu nome') || msgLower.includes('secretária') || 
             msgLower.includes('secretaria') || msgLower.includes('quem está falando') ||
             msgLower.includes('com quem falo')) {
        message.reply('Que alegria você perguntar! 😊 Eu sou a Camila! Sou secretária do Dr. Marcos Figarella e estou muito feliz em poder te ajudar!\n\nCuido exclusivamente da agenda do doutor, agendamentos, e estou sempre aqui para ajudar os pacientes dele com muito carinho, atenção e dedicação! ❤️\n\nMinha função é facilitar o acesso ao Dr. Marcos e fazer com que você se sinta acolhido! Estou disponível 24h para agendamentos! 👨‍⚕️👩‍💼');
    }
    
    // Retorno e acompanhamento
    else if (msgLower.includes('retorno') || msgLower.includes('acompanhamento') || msgLower.includes('seguimento') ||
             msgLower.includes('consulta de retorno') || msgLower.includes('próxima consulta') ||
             msgLower.includes('já sou paciente') || msgLower.includes('sou paciente') ||
             msgLower.includes('faço tratamento')) {
        message.reply('Que alegria saber que você está fazendo acompanhamento com o Dr. Marcos! 😊👨‍⚕️\n\nPara agendar seu retorno com muito carinho:\n• Me fala seu nome\n• Quando foi a última consulta\n• Sua preferência de data\n\nO doutor sempre orienta sobre a frequência ideal das consultas! Estou aqui 24h para facilitar tudo para você! ❤️');
    }
    
    // Primeira consulta
    else if (msgLower.includes('primeira vez') || msgLower.includes('primeira consulta') || 
             msgLower.includes('nunca fui') || msgLower.includes('novo paciente') ||
             msgLower.includes('primeira') || msgLower.includes('iniciar tratamento')) {
        message.reply('Que maravilha que você escolheu o Dr. Marcos para sua primeira consulta! 😊👨‍⚕️\n\nEle é muito acolhedor e cuidadoso com pacientes novos! Você ficará em ótimas mãos!\n\nPara agendar com muito carinho:\n• Seu nome completo\n• Telefone\n• Sua preferência de horário\n\nVou encontrar o melhor horário na agenda! Estou aqui 24h para te ajudar! ❤️');
    }
    
    // Agradecimentos
    else if (msgLower.includes('obrigado') || msgLower.includes('obrigada') || msgLower.includes('valeu') || 
             msgLower.includes('brigado') || msgLower.includes('muito obrigado') ||
             msgLower.includes('agradeço') || msgLower.includes('grato') || msgLower.includes('grata')) {
        message.reply('Imagina! 😊 Fico muito feliz em poder te ajudar! É um prazer enorme!\n\nO Dr. Marcos e eu estamos sempre aqui para vocês com muito carinho! Se precisar de mais alguma coisa, pode me chamar a qualquer momento - estou disponível 24h! ❤️');
    }
    
    // Despedidas
    else if (msgLower.includes('tchau') || msgLower.includes('até logo') || msgLower.includes('ate logo') || 
             msgLower.includes('bye') || msgLower.includes('até mais') || msgLower.includes('falou') ||
             msgLower.includes('xau') || msgLower.includes('até breve')) {
        message.reply('Até logo! 👋 Foi um prazer imenso te ajudar! Fico muito feliz com nosso contato!\n\nQualquer coisa que precisar sobre as consultas com o Dr. Marcos, pode me chamar a qualquer momento - estou disponível 24h para agendamentos! Cuide-se bem! ❤️😊');
    }
    
    // Resposta padrão para qualquer outra mensagem
    else {
        message.reply('Olá! 😊 Que alegria receber seu contato! Eu sou a Camila, secretária do Dr. Marcos Figarella! Estou muito feliz em poder te ajudar!\n\nPosso te auxiliar com:\n• 📅 Agendamentos de consultas (24h)\n• ℹ️ Informações sobre atendimento\n• 📍 Endereço e horários\n• 💰 Convênios e valores\n• 🔄 Reagendamentos\n\nO que você precisa hoje? Estou aqui, totalmente disponível 24h por dia para facilitar seu acesso ao Dr. Marcos! Como posso te ajudar? ❤️');
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
