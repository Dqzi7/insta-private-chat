const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');
const mongoose = require('mongoose');

const PORT = process.env.PORT || 10000;
const MONGO_URI = 'mongodb+srv://dqmoham_db_user:GDMhMVUogDvYYTFd@cluster0.13nyzua.mongodb.net/?appName=Cluster0';

mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(async () => {
        console.log('=== تم الاتصال بقاعدة البيانات ===');
        await createDefaultUser();
    })
    .catch(err => console.log('خطأ في الاتصال بالقاعدة:', err));

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});
const User = mongoose.model('User', userSchema);

async function createDefaultUser() {
    try {
        const existUser = await User.findOne({ username: 'dawood' });
        if (!existUser) {
            const defaultUser = new User({ username: 'dawood', password: '123' });
            await defaultUser.save();
            console.log('=== تم تجهيز المستخدم الأساسي داود ===');
        }
    } catch (e) {
        console.log('خطأ في إنشاء المستخدم الافتراضي');
    }
}

const messageSchema = new mongoose.Schema({
    type: String,
    sender: String,
    content: String,
    timestamp: { type: Date, default: Date.now }
});
const Message = mongoose.model('Message', messageSchema);

app.use(express.json({ limit: '10mb' }));

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ 
        username: new RegExp('^' + username + '$', 'i'), 
        password 
    });
    if (user) {
        res.json({ success: true, message: 'تم الدخول بنجاح' });
    } else {
        res.json({ success: false, message: 'اسم المستخدم أو كلمة المرور خطأ!' });
    }
});

app.get('/api/messages', async (req, res) => {
    try {
        const messages = await Message.find().sort({ timestamp: 1 });
        res.json(messages);
    } catch (e) {
        res.status(500).json([]);
    }
});

app.post('/api/users/add', async (req, res) => {
    const { username, password } = req.body;
    try {
        const exists = await User.findOne({ username: new RegExp('^' + username + '$', 'i') });
        if (exists) return res.json({ success: false, message: 'المستخدم موجود بالفعل!' });
        const newUser = new User({ username, password });
        await newUser.save();
        res.json({ success: true, message: 'تمت الإضافة بنجاح' });
    } catch (e) {
        res.json({ success: false, message: 'حدث خطأ أثناء الإضافة' });
    }
});

app.post('/api/users/delete', async (req, res) => {
    const { username } = req.body;
    try {
        const result = await User.deleteOne({ username: new RegExp('^' + username + '$', 'i') });
        if (result.deletedCount > 0) {
            res.json({ success: true, message: 'تم الحذف بنجاح' });
        } else {
            res.json({ success: false, message: 'المستخدم غير موجود!' });
        }
    } catch (e) {
        res.json({ success: false, message: 'حدث خطأ' });
    }
});

app.use(express.static(path.join(__dirname)));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

io.on('connection', (socket) => {
    console.log('مستخدم جديد اتصل بالمساحة');
    socket.on('chat message', async (msg) => {
        try {
            const newMessage = new Message(msg);
            await newMessage.save();
            io.emit('chat message', msg);
        } catch(e) {
            console.log('خطأ في حفظ الرسالة:', e);
        }
    });
    socket.on('disconnect', () => {
        console.log('غادر مستخدم المساحة');
    });
});

http.listen(PORT, () => {
    console.log(`=== السيرفر يعمل على المنفذ ${PORT} ===`);
});