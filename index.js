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
        <h1>CamilaBot está funcionando!</h1>
        <p>WhatsApp Status: ${isClientReady ? 'Conectado ✅' : 'Aguardando conexão ⏳'}</p>
        <a href="/whatsapp">Ver QR Code WhatsApp</a>
    `);
});

// Rota para exibir QR Code
app.get('/whatsapp', (req, res) => {
    if (isClientReady) {
        res.send(`
            <h1>WhatsApp Conectado! ✅</h1>
            <p>O bot está funcionando normalmente.</p>
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
    
    // Exemplo de resposta automática
    if (message.body.toLowerCase() === 'oi' || message.body.toLowerCase() === 'olá') {
        message.reply('Olá! Sou o CamilaBot da Uniclínica. Como posso ajudar?');
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
