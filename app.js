class WhatsAppChat {
    constructor() {
        this.currentUser = null;
        this.currentChat = null;
        this.users = new Map();
        this.chats = new Map();
        this.messagesListener = null;
        this.chatsListener = null;
        
        this.init();
    }
    
    async init() {
        // Referencias a elementos DOM
        this.setupDOMReferences();
        
        // Event Listeners
        this.setupEventListeners();
        
        // Verificar autenticación
        this.checkAuth();
        
        // Cargar emojis
        this.loadEmojis();
    }
    
    setupDOMReferences() {
        // Pantallas
        this.authScreen = document.getElementById('authScreen');
        this.chatScreen = document.getElementById('chatScreen');
        
        // Auth elements
        this.displayNameInput = document.getElementById('displayName');
        this.phoneNumberInput = document.getElementById('phoneNumber');
        this.profilePhotoInput = document.getElementById('profilePhoto');
        this.uploadPhotoBtn = document.getElementById('uploadPhotoBtn');
        this.signInBtn = document.getElementById('signInBtn');
        this.demoButtons = document.querySelectorAll('.demo-btn');
        
        // Chat elements
        this.chatsContainer = document.getElementById('chatsContainer');
        this.messagesContainer = document.getElementById('messagesContainer');
        this.messageInput = document.getElementById('messageInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.searchChatsInput = document.getElementById('searchChats');
        
        // Modals
        this.newChatModal = document.getElementById('newChatModal');
        this.profileModal = document.getElementById('profileModal');
        
        // Buttons
        this.startNewChatBtn = document.getElementById('startNewChatBtn');
        this.menuBtn = document.getElementById('menuBtn');
        this.backBtn = document.getElementById('backBtn');
        this.logoutBtn = document.getElementById('logoutBtn');
        
        // User info
        this.userAvatar = document.getElementById('userAvatar');
        this.currentUserName = document.getElementById('currentUserName');
    }
    
    setupEventListeners() {
        // Autenticación
        this.signInBtn.addEventListener('click', () => this.signIn());
        this.uploadPhotoBtn.addEventListener('click', () => this.profilePhotoInput.click());
        this.profilePhotoInput.addEventListener('change', (e) => this.previewProfilePhoto(e));
        
        // Demo users
        this.demoButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const userName = e.target.dataset.user;
                this.useDemoUser(userName);
            });
        });
        
        // Chat
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        // Nuevo chat
        this.startNewChatBtn.addEventListener('click', () => this.showNewChatModal());
        this.menuBtn.addEventListener('click', () => this.showProfileModal());
        this.backBtn.addEventListener('click', () => this.logout());
        
        // Buscar chats
        this.searchChatsInput.addEventListener('input', (e) => this.searchChats(e.target.value));
        
        // Logout
        this.logoutBtn.addEventListener('click', () => this.logout());
        
        // Notificaciones
        this.setupNotifications();
    }
    
    async checkAuth() {
        // Escuchar cambios de autenticación
        firebaseApp.auth.onAuthStateChanged(async (user) => {
            if (user) {
                this.currentUser = user;
                await this.loadUserData(user.uid);
                this.showChatScreen();
                this.listenForChats();
            } else {
                this.showAuthScreen();
            }
        });
    }
    
    async signIn() {
        const displayName = this.displayNameInput.value.trim();
        const phoneNumber = this.phoneNumberInput.value.trim();
        const photoFile = this.profilePhotoInput.files[0];
        
        if (!displayName || !phoneNumber) {
            this.showToast('Por favor completa todos los campos');
            return;
        }
        
        try {
            // Crear usuario anónimo (para demo)
            const userCredential = await firebaseApp.auth.signInAnonymously();
            const user = userCredential.user;
            
            // Subir foto si existe
            let photoURL = '';
            if (photoFile) {
                photoURL = await this.uploadProfilePhoto(photoFile, user.uid);
            }
            
            // Guardar datos del usuario en Firestore
            await firebaseApp.db.collection('users').doc(user.uid).set({
                uid: user.uid,
                displayName: displayName,
                phoneNumber: phoneNumber,
                photoURL: photoURL,
                status: 'En línea',
                lastSeen: firebaseApp.timestamp(),
                createdAt: firebaseApp.timestamp()
            }, { merge: true });
            
            this.showToast('¡Bienvenido!');
            
        } catch (error) {
            console.error('Error al iniciar sesión:', error);
            this.showToast('Error al iniciar sesión: ' + error.message);
        }
    }
    
    useDemoUser(userName) {
        // Datos de usuarios demo
        const demoUsers = {
            'Ana': { phone: '5550101', photo: '👩' },
            'Carlos': { phone: '5550102', photo: '👨' },
            'Maria': { phone: '5550103', photo: '👩' },
            'Juan': { phone: '5550104', photo: '👨' }
        };
        
        const user = demoUsers[userName];
        if (user) {
            this.displayNameInput.value = userName;
            this.phoneNumberInput.value = user.phone;
            this.showToast(`Usando cuenta demo: ${userName}`);
        }
    }
    
    async uploadProfilePhoto(file, userId) {
        try {
            const storageRef = firebaseApp.storage.ref();
            const photoRef = storageRef.child(`profile_photos/${userId}_${Date.now()}`);
            
            // Subir archivo
            await photoRef.put(file);
            
            // Obtener URL de descarga
            const downloadURL = await photoRef.getDownloadURL();
            return downloadURL;
            
        } catch (error) {
            console.error('Error subiendo foto:', error);
            return '';
        }
    }
    
    previewProfilePhoto(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const preview = document.getElementById('photoPreview');
            preview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
        };
        reader.readAsDataURL(file);
    }
    
    async loadUserData(userId) {
        try {
            const userDoc = await firebaseApp.db.collection('users').doc(userId).get();
            
            if (userDoc.exists) {
                const userData = userDoc.data();
                
                // Actualizar UI
                this.currentUserName.textContent = userData.displayName;
                
                if (userData.photoURL) {
                    this.userAvatar.innerHTML = `<img src="${userData.photoURL}" alt="${userData.displayName}">`;
                } else {
                    this.userAvatar.innerHTML = `<span>${userData.displayName.charAt(0)}</span>`;
                }
                
                // Actualizar estado como en línea
                await firebaseApp.db.collection('users').doc(userId).update({
                    status: 'En línea',
                    lastSeen: firebaseApp.timestamp()
                });
            }
        } catch (error) {
            console.error('Error cargando datos:', error);
        }
    }
    
    showAuthScreen() {
        this.authScreen.classList.add('active');
        this.chatScreen.classList.remove('active');
    }
    
    showChatScreen() {
        this.authScreen.classList.remove('active');
        this.chatScreen.classList.add('active');
    }
    
    async listenForChats() {
        if (!this.currentUser) return;
        
        // Escuchar chats del usuario actual
        this.chatsListener = firebaseApp.db.collection('chats')
            .where('participants', 'array-contains', this.currentUser.uid)
            .orderBy('lastMessageAt', 'desc')
            .onSnapshot(async (snapshot) => {
                this.chatsContainer.innerHTML = '';
                
                if (snapshot.empty) {
                    document.getElementById('noChats').classList.remove('hidden');
                    return;
                }
                
                document.getElementById('noChats').classList.add('hidden');
                
                for (const doc of snapshot.docs) {
                    await this.renderChatItem(doc.data(), doc.id);
                }
            });
    }
    
    async renderChatItem(chatData, chatId) {
        // Obtener información del otro participante
        const otherUserId = chatData.participants.find(id => id !== this.currentUser.uid);
        const otherUser = await this.getUserData(otherUserId);
        
        if (!otherUser) return;
        
        const chatItem = document.createElement('div');
        chatItem.className = 'chat-item';
        chatItem.dataset.chatId = chatId;
        
        const lastMessage = chatData.lastMessage || 'No hay mensajes';
        const timestamp = chatData.lastMessageAt ? this.formatTime(chatData.lastMessageAt.toDate()) : '';
        
        chatItem.innerHTML = `
            <div class="chat-avatar">
                ${otherUser.photoURL ? 
                    `<img src="${otherUser.photoURL}" alt="${otherUser.displayName}">` : 
                    `<span>${otherUser.displayName.charAt(0)}</span>`}
                <div class="status-indicator ${otherUser.status === 'En línea' ? 'online' : 'offline'}"></div>
            </div>
            <div class="chat-info">
                <div class="chat-header">
                    <h4>${otherUser.displayName}</h4>
                    <span class="chat-time">${timestamp}</span>
                </div>
                <p class="chat-preview">${lastMessage}</p>
                ${chatData.unreadCount > 0 ? 
                    `<span class="unread-badge">${chatData.unreadCount}</span>` : ''}
            </div>
        `;
        
        chatItem.addEventListener('click', () => this.openChat(chatId, otherUser));
        this.chatsContainer.appendChild(chatItem);
    }
    
    async openChat(chatId, otherUser) {
        this.currentChat = chatId;
        
        // Mostrar pantalla de chat
        document.getElementById('chatsList').classList.add('hidden');
        document.getElementById('chatWindow').classList.remove('hidden');
        
        // Actualizar información del contacto
        document.getElementById('chatUserName').textContent = otherUser.displayName;
        document.getElementById('chatUserStatus').textContent = otherUser.status;
        
        if (otherUser.photoURL) {
            document.getElementById('chatUserAvatar').innerHTML = 
                `<img src="${otherUser.photoURL}" alt="${otherUser.displayName}">`;
        }
        
        // Cargar mensajes
        await this.loadMessages(chatId);
        
        // Escuchar nuevos mensajes en tiempo real
        this.listenToMessages(chatId);
        
        // Marcar como leído
        await this.markAsRead(chatId);
    }
    
    async loadMessages(chatId) {
        const messagesContainer = document.getElementById('messagesContainer');
        messagesContainer.innerHTML = '<div class="message-date"><span>HOY</span></div>';
        
        try {
            const messagesSnapshot = await firebaseApp.db.collection('chats')
                .doc(chatId)
                .collection('messages')
                .orderBy('timestamp', 'asc')
                .limit(50)
                .get();
            
            messagesSnapshot.forEach(doc => {
                this.renderMessage(doc.data(), doc.id);
            });
            
            // Scroll al final
            this.scrollToBottom();
            
        } catch (error) {
            console.error('Error cargando mensajes:', error);
        }
    }
    
    listenToMessages(chatId) {
        // Detener listener anterior
        if (this.messagesListener) {
            this.messagesListener();
        }
        
        // Nuevo listener en tiempo real
        this.messagesListener = firebaseApp.db.collection('chats')
            .doc(chatId)
            .collection('messages')
            .orderBy('timestamp', 'asc')
            .onSnapshot((snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    if (change.type === 'added') {
                        this.renderMessage(change.doc.data(), change.doc.id);
                        this.scrollToBottom();
                        
                        // Mostrar notificación si no está en este chat
                        if (this.currentChat !== chatId) {
                            this.showMessageNotification(change.doc.data());
                        }
                    }
                });
            });
    }
    
    renderMessage(message, messageId) {
        const messagesContainer = document.getElementById('messagesContainer');
        const isCurrentUser = message.senderId === this.currentUser.uid;
        
        const messageElement = document.createElement('div');
        messageElement.className = `message ${isCurrentUser ? 'sent' : 'received'}`;
        messageElement.dataset.messageId = messageId;
        
        let content = '';
        
        switch (message.type) {
            case 'text':
                content = `<p>${this.formatMessageText(message.content)}</p>`;
                break;
                
            case 'image':
                content = `
                    <div class="message-image">
                        <img src="${message.content}" alt="Imagen" loading="lazy">
                    </div>
                `;
                break;
                
            case 'audio':
                content = `
                    <div class="message-audio">
                        <audio controls>
                            <source src="${message.content}" type="audio/mpeg">
                        </audio>
                        <span>${message.duration || 'Audio'}</span>
                    </div>
                `;
                break;
                
            default:
                content = `<p>${message.content}</p>`;
        }
        
        const time = message.timestamp ? this.formatTime(message.timestamp.toDate()) : 'Ahora';
        
        messageElement.innerHTML = `
            <div class="message-content">
                ${content}
                <span class="message-time">${time}</span>
            </div>
        `;
        
        messagesContainer.appendChild(messageElement);
    }
    
    async sendMessage() {
        const messageText = this.messageInput.value.trim();
        if (!messageText || !this.currentChat) return;
        
        try {
            // Crear objeto de mensaje
            const message = {
                content: messageText,
                senderId: this.currentUser.uid,
                type: 'text',
                timestamp: firebaseApp.timestamp(),
                read: false
            };
            
            // Agregar mensaje a la subcolección
            await firebaseApp.db.collection('chats')
                .doc(this.currentChat)
                .collection('messages')
                .add(message);
            
            // Actualizar último mensaje en el chat
            await firebaseApp.db.collection('chats')
                .doc(this.currentChat)
                .update({
                    lastMessage: messageText,
                    lastMessageAt: firebaseApp.timestamp(),
                    unreadCount: firebaseApp.firestore.FieldValue.increment(1)
                });
            
            // Limpiar input
            this.messageInput.value = '';
            
        } catch (error) {
            console.error('Error enviando mensaje:', error);
            this.showToast('Error enviando mensaje');
        }
    }
    
    async showNewChatModal() {
        this.newChatModal.classList.remove('hidden');
        
        try {
            // Cargar todos los usuarios excepto el actual
            const usersSnapshot = await firebaseApp.db.collection('users')
                .where('uid', '!=', this.currentUser.uid)
                .limit(20)
                .get();
            
            const usersList = document.getElementById('usersList');
            usersList.innerHTML = '';
            
            usersSnapshot.forEach(doc => {
                const user = doc.data();
                const userElement = document.createElement('div');
                userElement.className = 'user-item';
                userElement.innerHTML = `
                    <div class="user-avatar">
                        ${user.photoURL ? 
                            `<img src="${user.photoURL}" alt="${user.displayName}">` : 
                            `<span>${user.displayName.charAt(0)}</span>`}
                    </div>
                    <div class="user-info">
                        <h4>${user.displayName}</h4>
                        <p>${user.status || 'Disponible'}</p>
                    </div>
                    <button class="start-chat-btn" data-user-id="${user.uid}">
                        <i class="fas fa-comment"></i>
                    </button>
                `;
                
                userElement.querySelector('.start-chat-btn').addEventListener('click', 
                    () => this.startNewChat(user.uid));
                
                usersList.appendChild(userElement);
            });
            
        } catch (error) {
            console.error('Error cargando usuarios:', error);
        }
    }
    
    async startNewChat(otherUserId) {
        try {
            // Verificar si ya existe un chat
            const existingChat = await this.findExistingChat(otherUserId);
            
            if (existingChat) {
                this.openChat(existingChat.id, await this.getUserData(otherUserId));
            } else {
                // Crear nuevo chat
                const chatData = {
                    participants: [this.currentUser.uid, otherUserId],
                    createdAt: firebaseApp.timestamp(),
                    lastMessageAt: firebaseApp.timestamp(),
                    lastMessage: '',
                    unreadCount: 0
                };
                
                const chatRef = await firebaseApp.db.collection('chats').add(chatData);
                this.openChat(chatRef.id, await this.getUserData(otherUserId));
            }
            
            this.newChatModal.classList.add('hidden');
            
        } catch (error) {
            console.error('Error creando chat:', error);
            this.showToast('Error creando chat');
        }
    }
    
    async findExistingChat(otherUserId) {
        const snapshot = await firebaseApp.db.collection('chats')
            .where('participants', 'array-contains', this.currentUser.uid)
            .get();
        
        for (const doc of snapshot.docs) {
            const chatData = doc.data();
            if (chatData.participants.includes(otherUserId)) {
                return { id: doc.id, ...chatData };
            }
        }
        
        return null;
    }
    
    async getUserData(userId) {
        if (this.users.has(userId)) {
            return this.users.get(userId);
        }
        
        try {
            const userDoc = await firebaseApp.db.collection('users').doc(userId).get();
            
            if (userDoc.exists) {
                const userData = userDoc.data();
                this.users.set(userId, userData);
                return userData;
            }
        } catch (error) {
            console.error('Error obteniendo usuario:', error);
        }
        
        return null;
    }
    
    async markAsRead(chatId) {
        if (!chatId || !this.currentUser) return;
        
        try {
            // Resetear contador de no leídos
            await firebaseApp.db.collection('chats').doc(chatId).update({
                unreadCount: 0
            });
            
            // Marcar mensajes como leídos
            const messagesSnapshot = await firebaseApp.db.collection('chats')
                .doc(chatId)
                .collection('messages')
                .where('read', '==', false)
                .where('senderId', '!=', this.currentUser.uid)
                .get();
            
            const batch = firebaseApp.db.batch();
            messagesSnapshot.forEach(doc => {
                batch.update(doc.ref, { read: true });
            });
            
            await batch.commit();
            
        } catch (error) {
            console.error('Error marcando como leído:', error);
        }
    }
    
    async logout() {
        try {
            // Actualizar estado a desconectado
            if (this.currentUser) {
                await firebaseApp.db.collection('users').doc(this.currentUser.uid).update({
                    status: 'Desconectado',
                    lastSeen: firebaseApp.timestamp()
                });
            }
            
            // Cerrar listeners
            if (this.chatsListener) this.chatsListener();
            if (this.messagesListener) this.messagesListener();
            
            // Cerrar sesión
            await firebaseApp.auth.signOut();
            
            this.currentUser = null;
            this.currentChat = null;
            this.users.clear();
            this.chats.clear();
            
            this.showToast('Sesión cerrada');
            
        } catch (error) {
            console.error('Error cerrando sesión:', error);
        }
    }
    
    // Utilidades
    formatTime(date) {
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) return 'Ahora';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}min`;
        if (diff < 86400000) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        return date.toLocaleDateString();
    }
    
    formatMessageText(text) {
        // Convertir URLs en enlaces
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        return text.replace(urlRegex, url => `<a href="${url}" target="_blank">${url}</a>`);
    }
    
    scrollToBottom() {
        const container = document.getElementById('messagesContainer');
        container.scrollTop = container.scrollHeight;
    }
    
    showToast(message) {
        // Implementar toast notifications
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
    
    showMessageNotification(message) {
        // Mostrar notificación push
        if (Notification.permission === 'granted') {
            new Notification('Nuevo mensaje', {
                body: message.content,
                icon: '/icons/icon-192.png'
            });
        }
        
        // Mostrar notificación en app
        const notification = document.getElementById('notification');
        document.getElementById('notificationMessage').textContent = message.content;
        notification.classList.remove('hidden');
        
        setTimeout(() => {
            notification.classList.add('hidden');
        }, 5000);
    }
    
    setupNotifications() {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }
    
    searchChats(query) {
        const chatItems = document.querySelectorAll('.chat-item');
        const searchTerm = query.toLowerCase();
        
        chatItems.forEach(item => {
            const chatName = item.querySelector('h4').textContent.toLowerCase();
            const chatPreview = item.querySelector('.chat-preview').textContent.toLowerCase();
            
            if (chatName.includes(searchTerm) || chatPreview.includes(searchTerm)) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    }
    
    loadEmojis() {
        // Podrías cargar un picker de emojis aquí
        // Por simplicidad, usaremos emojis nativos
    }
    
    showProfileModal() {
        this.profileModal.classList.remove('hidden');
        // Cargar datos actuales del perfil
    }
}

// Inicializar la app
document.addEventListener('DOMContentLoaded', () => {
    window.whatsAppChat = new WhatsAppChat();
});

// Service Worker para PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('Service Worker registrado:', registration.scope);
            })
            .catch(error => {
                console.log('Error registrando Service Worker:', error);
            });
    });
}