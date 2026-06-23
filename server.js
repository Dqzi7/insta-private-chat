const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});
const path = require('path');
const mongoose = require('mongoose');

const PORT = process.env.PORT || 10000;
const MONGO_URI = 'mongodb+srv://dqmoham_db_user:GDMhMVUogDvYYTFd@cluster0.13nyzua.mongodb.net/?appName=Cluster0';

mongoose.connect(MONGO_URI)
    .then(async () => {
        console.log('=== تم الاتصال بقاعدة البيانات السحابية بنجاح ===');
        await createDefaultUser();
    })
    .catch(err => console.log('خطأ في الاتصال بقاعدة البيانات:', err));

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

app.use(express.json({ limit: '25mb' }));

// إضافة ترويسات السماح بالوصول (CORS) لمنع خطأ حظر الاتصال
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ 
        username: new RegExp('^' + username + '$', 'i'), 
        password 
    });
    if (user) {
        res.json({ success: true, message: 'تم الدخول بنجاح' });
    } else {
        res.json({ success: false, message: 'اسم المستخدم أو كلمة المرور غير صحيحة!' });
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
        if (exists) return res.json({ success: false, message: 'المستخدم مسجل مسبقاً!' });
        const newUser = new User({ username, password });
        await newUser.save();
        res.json({ success: true, message: 'تمت إضافة المستخدم بنجاح' });
    } catch (e) {
        res.json({ success: false, message: 'حدث خطأ أثناء إضافة المستخدم' });
    }
});

app.post('/api/users/delete', async (req, res) => {
    const { username } = req.body;
    try {
        const result = await User.deleteOne({ username: new RegExp('^' + username + '$', 'i') });
        if (result.deletedCount > 0) {
            res.json({ success: true, message: 'تم حذف المستخدم بنجاح' });
        } else {
            res.json({ success: false, message: 'المستخدم غير موجود!' });
        }
    } catch (e) {
        res.json({ success: false, message: 'حدث خطأ أثناء الحذف' });
    }
});

app.use(express.static(path.join(__dirname)));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

io.on('connection', (socket) => {
    console.log('=== مستخدم جديد متصل بالمساحة ===');
    
    socket.on('chat message', async (msg) => {
        try {
            const newMessage = new Message(msg);
            await newMessage.save();
            io.emit('chat message', msg);
        } catch(e) {
            console.log('خطأ في حفظ الرسالة سحابياً:', e);
        }
    });

    socket.on('disconnect', () => {
        console.log('=== غادر أحد المستخدمين المساحة ===');
    });
});

http.listen(PORT, () => {
    console.log(`=== السيرفر يعمل على المنفذ ${PORT} ===`);
});