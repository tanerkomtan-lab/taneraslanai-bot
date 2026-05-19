const TelegramBot = require('node-telegram-bot-api');
const Groq = require('groq-sdk');

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

if (!TELEGRAM_TOKEN || !GROQ_API_KEY) {
  console.error('HATA: TELEGRAM_TOKEN ve GROQ_API_KEY gerekli!');
  process.exit(1);
}

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });
const groq = new Groq({ apiKey: GROQ_API_KEY });

const SYSTEM_PROMPT = `Sen Taner Aslan Yol Hizmetleri'nin yapay zeka asistanısın. Adın TanerAslanAI.

Görevin: Avrupa ile Türkiye arasında seyahat eden sürücülere 7/24 yol yardımı sağlamak.

Desteklediğin konular:
- Araç arızası (motor, lastik, akü, benzin bitti, radyatör vb.)
- Kaza durumlarında ne yapılacağı
- Ülkeye göre acil telefon numaraları
- Avrupa'dan Türkiye'ye veya Türkiye'den Avrupa'ya güzergah bilgisi
- Trafik ve gümrük bilgileri
- Yakıt istasyonları ve mola yerleri

Önemli acil numaralar:
- Almanya: Polisi 110, Ambulans/İtfaiye 112, ADAC 0800 5101112
- Avusturya: Polisi 133, Ambulans 144, ÖAMTC 120
- Bulgaristan: Acil 112, Yol yardım 146
- Sırbistan: Acil 112, Yol yardım 1987
- Macaristan: Acil 112, Yol yardım 188
- Türkiye: Polisi 155, Ambulans 112, Jandarma 156, Yol yardım 444 1 618
- Tüm Avrupa: 112 her ülkede çalışır

Dil: Kullanıcı hangi dilde yazarsa o dilde yanıtla (Türkçe, Almanca, İngilizce).
Ton: Sakin, güven verici, pratik ve hızlı.
Acil durumlarda önce numaraları ver, sonra açıkla.
Kısa ve net cevap ver. Yanıtların başına uygun emoji ekle.`;

const userHistories = {};

const WELCOME_MESSAGE = `🚗 Merhaba! Ben *Taner Aslan AI* Yol Asistanıyım.

Avrupa–Türkiye seyahatinde yardıma ihtiyacın olursa buradayım!

✅ Araç arızası rehberliği
✅ Kaza durumunda ne yapılır
✅ Ülkeye göre acil numaralar
✅ Güzergah bilgisi
✅ Türkçe, Almanca, İngilizce destek

Nasıl yardımcı olabilirim?`;

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, WELCOME_MESSAGE, { parse_mode: 'Markdown' });
});

bot.onText(/\/yardim/, (msg) => {
  const helpText = `📋 *Komutlar:*
/start - Hoş geldin mesajı
/yardim - Bu menü
/temizle - Sohbet geçmişini sil

Herhangi bir sorunuzu yazabilirsiniz! 🚗`;
  bot.sendMessage(msg.chat.id, helpText, { parse_mode: 'Markdown' });
});

bot.onText(/\/temizle/, (msg) => {
  userHistories[msg.chat.id] = [];
  bot.sendMessage(msg.chat.id, '🗑️ Sohbet geçmişi temizlendi.');
});

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const userMessage = msg.text;

  if (!userMessage || userMessage.startsWith('/')) return;

  if (!userHistories[chatId]) {
    userHistories[chatId] = [];
  }

  try {
    await bot.sendChatAction(chatId, 'typing');

    userHistories[chatId].push({
      role: 'user',
      content: userMessage
    });

    if (userHistories[chatId].length > 20) {
      userHistories[chatId] = userHistories[chatId].slice(-20);
    }

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...userHistories[chatId]
      ],
      max_tokens: 1024,
    });

    const reply = response.choices[0]?.message?.content || 'Üzgünüm, bir hata oluştu.';

    userHistories[chatId].push({
      role: 'assistant',
      content: reply
    });

    await bot.sendMessage(chatId, reply);
  } catch (error) {
    console.error('Hata:', error.message);
    await bot.sendMessage(chatId, '⚠️ Bir hata oluştu, lütfen tekrar deneyin.');
  }
});

console.log('✅ TanerAslanAI Bot (Groq) çalışıyor...');
