// ===== PHONE SCRIPT =====

let phoneData = {};
let dialNumber = '';
let callTimerInterval = null;
let callSeconds = 0;
let allContacts = [];
let currentChatPhone = '';

// ===== INITIALIZATION =====
function loadPhoneData(dataJson) {
    try {
        phoneData = JSON.parse(dataJson);
        
        document.getElementById('homeTime').textContent = phoneData.time || '12:00';
        document.getElementById('statusTime').textContent = phoneData.time || '12:00';
        document.getElementById('homeDate').textContent = phoneData.date || '1 января';
        document.getElementById('ownerName').textContent = phoneData.owner || 'Владелец';
        document.getElementById('ownerPhone').textContent = phoneData.phoneNumber || '555-000-0000';
        document.getElementById('bankBalance').textContent = '$' + (phoneData.bankBalance || 0).toLocaleString();
        document.getElementById('cardHolder').textContent = phoneData.owner || 'Владелец';
        document.getElementById('settingsAvatar').textContent = (phoneData.owner || 'U')[0].toUpperCase();
        
        // Generate last 4 digits from phone number
        const phone = phoneData.phoneNumber || '555-000-0000';
        document.getElementById('cardLast4').textContent = phone.replace(/-/g, '').slice(-4);
        
        if (phoneData.contacts) {
            allContacts = phoneData.contacts;
            updateContacts(JSON.stringify(phoneData.contacts));
        }
        if (phoneData.messages) updateMessages(JSON.stringify(phoneData.messages));
        if (phoneData.callHistory) updateCallHistory(phoneData.callHistory);
        
    } catch (e) {
        console.error('Error loading phone data:', e);
    }
}

// ===== NAVIGATION =====
function goHome() {
    document.querySelectorAll('.app-page').forEach(p => p.classList.remove('active'));
    document.getElementById('home').classList.add('active');
    document.getElementById('chatView').style.display = 'none';
    document.getElementById('newMessageForm').style.display = 'none';
    document.getElementById('addContactForm').style.display = 'none';
    document.getElementById('transferForm').style.display = 'none';
}

function openApp(appId) {
    document.querySelectorAll('.app-page').forEach(p => p.classList.remove('active'));
    document.getElementById(appId).classList.add('active');
    
    // Reset views
    document.getElementById('chatView').style.display = 'none';
    document.getElementById('newMessageForm').style.display = 'none';
    document.getElementById('conversationsList').style.display = 'block';
}

function closePhone() {
    if (typeof mp !== 'undefined') mp.trigger('cef:closePhone');
}

// ===== DIAL PAD =====
function dialKey(key) {
    if (dialNumber.length >= 15) return;
    dialNumber += key;
    updateDialDisplay();
}

function dialDelete() {
    dialNumber = dialNumber.slice(0, -1);
    updateDialDisplay();
}

function dialClear() {
    dialNumber = '';
    updateDialDisplay();
}

function updateDialDisplay() {
    const display = document.getElementById('dialDisplay');
    if (dialNumber.length === 0) {
        display.textContent = 'Введите номер';
        display.style.color = 'rgba(255, 255, 255, 0.4)';
    } else {
        display.textContent = formatPhoneNumber(dialNumber);
        display.style.color = 'white';
    }
}

function formatPhoneNumber(number) {
    const cleaned = number.replace(/\D/g, '');
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 6) return cleaned.slice(0, 3) + '-' + cleaned.slice(3);
    return cleaned.slice(0, 3) + '-' + cleaned.slice(3, 6) + '-' + cleaned.slice(6, 10);
}

// ===== CALLS =====
function makeCall() {
    if (dialNumber.length < 7) {
        showNotification('error', 'Введите корректный номер!');
        return;
    }
    
    const formattedNumber = formatPhoneNumber(dialNumber);
    if (typeof mp !== 'undefined') mp.trigger('cef:call', formattedNumber);
}

function updateCallHistory(calls) {
    const container = document.getElementById('callHistory');
    
    if (!calls || calls.length === 0) {
        container.innerHTML = '<div class="empty-state" style="height: 100px;"><p>Нет звонков</p></div>';
        return;
    }
    
    container.innerHTML = calls.slice(0, 15).map(c => {
        const iconColor = c.type === 'outgoing' ? '#4cd964' : (c.status === 'missed' ? '#ff3b30' : '#007aff');
        const iconName = c.type === 'outgoing' ? 'phone-arrow-up-right' : 'phone-arrow-down-left';
        const statusText = c.status === 'missed' ? 'Пропущен' : formatDuration(c.duration);
        
        return `
            <div class="contact-item" onclick="callFromHistory('${c.contact_phone || ''}')">
                <div class="contact-avatar" style="background: ${iconColor}20; color: ${iconColor};">
                    <i class="fas fa-${iconName}"></i>
                </div>
                <div class="contact-info">
                    <div class="contact-name">${c.contact_name || c.contact_phone || 'Неизвестный'}</div>
                    <div class="contact-phone">${c.type === 'outgoing' ? 'Исходящий' : 'Входящий'} • ${statusText}</div>
                </div>
            </div>
        `;
    }).join('');
}

function callFromHistory(phone) {
    if (phone) {
        dialNumber = phone.replace(/-/g, '');
        updateDialDisplay();
    }
}

function formatDuration(seconds) {
    if (!seconds || seconds === 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ===== CALL SCREEN =====
function showIncomingCall(callDataJson) {
    try {
        const call = JSON.parse(callDataJson);
        
        document.getElementById('callAvatar').textContent = (call.callerName || '?')[0].toUpperCase();
        document.getElementById('callName').textContent = call.callerName || 'Неизвестный';
        document.getElementById('callStatus').textContent = 'Входящий звонок...';
        document.getElementById('callTimer').style.display = 'none';
        document.getElementById('incomingButtons').style.display = 'flex';
        document.getElementById('activeCallButtons').style.display = 'none';
        document.getElementById('callScreen').classList.add('active');
        
    } catch (e) {
        console.error('Error showing incoming call:', e);
    }
}

function updateCallStatus(status, name) {
    document.getElementById('callAvatar').textContent = (name || '?')[0].toUpperCase();
    document.getElementById('callName').textContent = name || 'Неизвестный';
    
    if (status === 'calling') {
        document.getElementById('callStatus').textContent = 'Вызов...';
    } else if (status === 'ringing') {
        document.getElementById('callStatus').textContent = 'Звонит...';
    } else {
        document.getElementById('callStatus').textContent = status;
    }
    
    document.getElementById('callTimer').style.display = 'none';
    document.getElementById('incomingButtons').style.display = 'none';
    document.getElementById('activeCallButtons').style.display = 'flex';
    document.getElementById('callScreen').classList.add('active');
}

function acceptCall() {
    if (typeof mp !== 'undefined') mp.trigger('cef:acceptCall');
}

function declineCall() {
    if (typeof mp !== 'undefined') mp.trigger('cef:declineCall');
}

function endCall() {
    if (typeof mp !== 'undefined') mp.trigger('cef:endCall');
}

function callAccepted() {
    document.getElementById('callStatus').textContent = 'Разговор';
    document.getElementById('callTimer').style.display = 'block';
    document.getElementById('incomingButtons').style.display = 'none';
    document.getElementById('activeCallButtons').style.display = 'flex';
    
    callSeconds = 0;
    if (callTimerInterval) clearInterval(callTimerInterval);
    
    callTimerInterval = setInterval(() => {
        callSeconds++;
        document.getElementById('callTimer').textContent = formatDuration(callSeconds);
    }, 1000);
}

function callEnded(reason) {
    if (callTimerInterval) {
        clearInterval(callTimerInterval);
        callTimerInterval = null;
    }
    
    document.getElementById('callScreen').classList.remove('active');
    dialNumber = '';
    updateDialDisplay();
    
    if (reason) {
        showNotification('info', reason);
    }
}

function toggleMute() {
    const btn = document.getElementById('muteBtn');
    const icon = btn.querySelector('.call-action-icon');
    const isMuted = icon.classList.contains('muted');
    
    if (isMuted) {
        icon.classList.remove('muted');
        icon.style.background = 'rgba(255, 255, 255, 0.1)';
        icon.innerHTML = '<i class="fas fa-microphone"></i>';
    } else {
        icon.classList.add('muted');
        icon.style.background = '#ff3b30';
        icon.innerHTML = '<i class="fas fa-microphone-slash"></i>';
    }
}

function toggleSpeaker() {
    showNotification('info', 'Динамик переключён');
}

// ===== CONTACTS =====
function updateContacts(contactsJson) {
    try {
        const contacts = JSON.parse(contactsJson);
        allContacts = contacts;
        renderContacts(contacts);
    } catch (e) {
        console.error('Error updating contacts:', e);
    }
}

function renderContacts(contacts) {
    const container = document.getElementById('contactsList');
    
    if (!contacts || contacts.length === 0) {
        container.innerHTML = '<div class="empty-state" style="height: 150px;"><i class="fas fa-user-plus" style="font-size: 40px;"></i><p>Нет контактов</p></div>';
        return;
    }
    
    container.innerHTML = contacts.map(c => `
        <div class="contact-item">
            <div class="contact-avatar">${(c.name || '?')[0].toUpperCase()}</div>
            <div class="contact-info">
                <div class="contact-name">${c.name}</div>
                <div class="contact-phone">${c.phone_number}</div>
            </div>
            <div class="contact-actions">
                <button class="contact-action call" onclick="callContact('${c.phone_number}')"><i class="fas fa-phone"></i></button>
                <button class="contact-action msg" onclick="messageContact('${c.phone_number}', '${c.name}')"><i class="fas fa-comment"></i></button>
                <button class="contact-action del" onclick="deleteContact(${c.id}, event)"><i class="fas fa-trash"></i></button>
            </div>
        </div>
    `).join('');
}

function filterContacts(query) {
    if (!query) {
        renderContacts(allContacts);
        return;
    }
    
    const filtered = allContacts.filter(c => 
        c.name.toLowerCase().includes(query.toLowerCase()) ||
        c.phone_number.includes(query)
    );
    renderContacts(filtered);
}

function showAddContact() {
    document.getElementById('addContactForm').style.display = 'block';
}

function hideAddContact() {
    document.getElementById('addContactForm').style.display = 'none';
    document.getElementById('newContactName').value = '';
    document.getElementById('newContactPhone').value = '';
}

function addContact() {
    const name = document.getElementById('newContactName').value.trim();
    const phone = document.getElementById('newContactPhone').value.trim();
    
    if (!name || !phone) {
        showNotification('error', 'Заполните все поля!');
        return;
    }
    
    if (phone.replace(/\D/g, '').length < 7) {
        showNotification('error', 'Неверный номер телефона!');
        return;
    }
    
    if (typeof mp !== 'undefined') mp.trigger('cef:addContact', name, phone);
    hideAddContact();
}

function deleteContact(id, event) {
    event.stopPropagation();
    
    if (confirm('Удалить контакт?')) {
        if (typeof mp !== 'undefined') mp.trigger('cef:deleteContact', id);
    }
}

function callContact(phone) {
    dialNumber = phone.replace(/-/g, '');
    openApp('phone-app');
    updateDialDisplay();
    makeCall();
}

function messageContact(phone, name) {
    currentChatPhone = phone;
    document.getElementById('chatContactName').textContent = name || phone;
    document.getElementById('chatContactPhone').textContent = phone;
    
    openApp('messages');
    document.getElementById('conversationsList').style.display = 'none';
    document.getElementById('newMessageForm').style.display = 'none';
    document.getElementById('chatView').style.display = 'block';
    
    // Load chat messages for this contact
    loadChatMessages(phone);
}

// ===== MESSAGES =====
function updateMessages(messagesJson) {
    try {
        const messages = JSON.parse(messagesJson);
        renderConversations(messages);
    } catch (e) {
        console.error('Error updating messages:', e);
    }
}

function renderConversations(messages) {
    const container = document.getElementById('conversationsList');
    
    if (!messages || messages.length === 0) {
        container.innerHTML = '<div class="empty-state" style="height: 150px;"><i class="fas fa-comment-slash" style="font-size: 40px;"></i><p>Нет сообщений</p></div>';
        return;
    }
    
    // Group messages by contact
    const conversations = {};
    messages.forEach(m => {
        const contactPhone = m.type === 'sent' ? m.receiver_phone : m.sender_phone;
        const contactName = m.type === 'sent' ? (m.receiver_name || contactPhone) : (m.sender_name || contactPhone);
        
        if (!conversations[contactPhone]) {
            conversations[contactPhone] = {
                name: contactName,
                phone: contactPhone,
                lastMessage: m.message,
                time: m.created_at,
                unread: !m.is_read && m.type === 'received'
            };
        }
    });
    
    const convList = Object.values(conversations);
    
    container.innerHTML = convList.map(c => `
        <div class="contact-item" onclick="openChat('${c.phone}', '${c.name}')">
            <div class="contact-avatar">${(c.name || '?')[0].toUpperCase()}</div>
            <div class="contact-info">
                <div class="contact-name">${c.name}</div>
                <div class="contact-phone" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 150px;">${c.lastMessage}</div>
            </div>
            ${c.unread ? '<div style="width: 10px; height: 10px; background: #007aff; border-radius: 50%;"></div>' : ''}
        </div>
    `).join('');
}

function showNewMessage() {
    document.getElementById('conversationsList').style.display = 'none';
    document.getElementById('chatView').style.display = 'none';
    document.getElementById('newMessageForm').style.display = 'block';
}

function hideNewMessage() {
    document.getElementById('newMessageForm').style.display = 'none';
    document.getElementById('conversationsList').style.display = 'block';
    document.getElementById('msgRecipient').value = '';
    document.getElementById('msgText').value = '';
}

function sendMessage() {
    const phone = document.getElementById('msgRecipient').value.trim();
    const message = document.getElementById('msgText').value.trim();
    
    if (!phone || !message) {
        showNotification('error', 'Заполните все поля!');
        return;
    }
    
    if (typeof mp !== 'undefined') mp.trigger('cef:sendMessage', phone, message);
    
    document.getElementById('msgText').value = '';
    hideNewMessage();
}

function openChat(phone, name) {
    currentChatPhone = phone;
    document.getElementById('chatContactName').textContent = name || phone;
    document.getElementById('chatContactPhone').textContent = phone;
    
    document.getElementById('conversationsList').style.display = 'none';
    document.getElementById('newMessageForm').style.display = 'none';
    document.getElementById('chatView').style.display = 'block';
    
    loadChatMessages(phone);
}

function closeChat() {
    document.getElementById('chatView').style.display = 'none';
    document.getElementById('conversationsList').style.display = 'block';
    currentChatPhone = '';
}

function loadChatMessages(phone) {
    const container = document.getElementById('chatMessages');
    
    // Filter messages for this contact
    if (phoneData.messages) {
        const chatMsgs = phoneData.messages.filter(m => 
            m.sender_phone === phone || m.receiver_phone === phone
        );
        
        if (chatMsgs.length === 0) {
            container.innerHTML = '<div class="empty-state" style="height: 100px;"><p>Начните диалог</p></div>';
            return;
        }
        
        container.innerHTML = chatMsgs.reverse().map(m => `
            <div class="message ${m.type}">
                ${m.message}
                <div class="message-time">${formatTime(m.created_at)}</div>
            </div>
        `).join('');
        
        container.scrollTop = container.scrollHeight;
    } else {
        container.innerHTML = '<div class="empty-state" style="height: 100px;"><p>Начните диалог</p></div>';
    }
}

function sendChatMessage() {
    const input = document.getElementById('chatInputText');
    const message = input.value.trim();
    
    if (!message || !currentChatPhone) return;
    
    if (typeof mp !== 'undefined') mp.trigger('cef:sendMessage', currentChatPhone, message);
    
    // Add message to chat immediately
    const container = document.getElementById('chatMessages');
    const msgDiv = document.createElement('div');
    msgDiv.className = 'message sent';
    msgDiv.innerHTML = `${message}<div class="message-time">${formatTime(new Date().toISOString())}</div>`;
    container.appendChild(msgDiv);
    container.scrollTop = container.scrollHeight;
    
    input.value = '';
}

function callFromChat() {
    if (currentChatPhone) {
        dialNumber = currentChatPhone.replace(/-/g, '');
        openApp('phone-app');
        updateDialDisplay();
        makeCall();
    }
}

function formatTime(dateString) {
    try {
        const date = new Date(dateString);
        return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
        return '';
    }
}

function showNewMessageNotification(messageJson) {
    try {
        const msg = JSON.parse(messageJson);
        showNotification('info', `Сообщение от ${msg.from}`);
        
        // If chat is open with this contact, add message
        if (currentChatPhone && msg.phone === currentChatPhone) {
            const container = document.getElementById('chatMessages');
            const msgDiv = document.createElement('div');
            msgDiv.className = 'message received';
            msgDiv.innerHTML = `${msg.message}<div class="message-time">${msg.time}</div>`;
            container.appendChild(msgDiv);
            container.scrollTop = container.scrollHeight;
        }
    } catch (e) {}
}

// ===== BANK =====
function updateBankBalance(balance) {
    document.getElementById('bankBalance').textContent = '$' + (balance || 0).toLocaleString();
}

function showTransfer() {
    document.getElementById('transferForm').style.display = 'block';
}

function hideTransfer() {
    document.getElementById('transferForm').style.display = 'none';
    document.getElementById('transferPhone').value = '';
    document.getElementById('transferAmount').value = '';
}

function makeTransfer() {
    const phone = document.getElementById('transferPhone').value.trim();
    const amount = parseInt(document.getElementById('transferAmount').value);
    
    if (!phone) {
        showNotification('error', 'Введите номер получателя!');
        return;
    }
    
    if (!amount || amount <= 0) {
        showNotification('error', 'Введите корректную сумму!');
        return;
    }
    
    if (typeof mp !== 'undefined') mp.trigger('cef:bankTransfer', phone, amount);
    hideTransfer();
}

function showHistory() {
    showNotification('info', 'История транзакций');
}

function showATM() {
    showNotification('info', 'Найдите ближайший банкомат');
}

// ===== GPS =====
function setWaypoint(x, y) {
    if (typeof mp !== 'undefined') mp.trigger('cef:setWaypoint', x, y);
    showNotification('success', 'Маршрут проложен!');
}

function filterLocations(query) {
    const items = document.querySelectorAll('#locationsList .location-item');
    const lowerQuery = query.toLowerCase();
    
    items.forEach(item => {
        const name = item.querySelector('.location-name').textContent.toLowerCase();
        const desc = item.querySelector('.location-desc').textContent.toLowerCase();
        
        if (name.includes(lowerQuery) || desc.includes(lowerQuery)) {
            item.style.display = 'flex';
        } else {
            item.style.display = query ? 'none' : 'flex';
        }
    });
}

// ===== CAMERA =====
function takePhoto() {
    if (typeof mp !== 'undefined') mp.trigger('cef:takePhoto');
    showNotification('info', 'Фото сделано!');
}

// ===== SETTINGS =====
function showAbout() {
    showNotification('info', 'iFruit X v1.0\nGTA5 RP Server');
}

// ===== NOTIFICATIONS =====
function showNotification(type, message) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = 'toast ' + type;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'toastIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ===== TIME UPDATE =====
function updateTime() {
    const now = new Date();
    const time = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    const date = now.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
    
    document.getElementById('homeTime').textContent = time;
    document.getElementById('statusTime').textContent = time;
    document.getElementById('homeDate').textContent = date;
}

setInterval(updateTime, 60000);

// ===== KEYBOARD EVENTS =====
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const callScreen = document.getElementById('callScreen');
        const chatView = document.getElementById('chatView');
        const addContactForm = document.getElementById('addContactForm');
        const newMessageForm = document.getElementById('newMessageForm');
        const transferForm = document.getElementById('transferForm');
        
        if (callScreen.classList.contains('active')) {
            endCall();
        } else if (chatView.style.display !== 'none') {
            closeChat();
        } else if (addContactForm.style.display !== 'none') {
            hideAddContact();
        } else if (newMessageForm.style.display !== 'none') {
            hideNewMessage();
        } else if (transferForm.style.display !== 'none') {
            hideTransfer();
        } else if (!document.getElementById('home').classList.contains('active')) {
            goHome();
        } else {
            closePhone();
        }
    }
});

// ===== DIAL PAD KEYBOARD SUPPORT =====
document.addEventListener('keydown', (e) => {
    const phoneApp = document.getElementById('phone-app');
    if (!phoneApp.classList.contains('active')) return;
    
    if (e.key >= '0' && e.key <= '9') {
        dialKey(e.key);
    } else if (e.key === '*') {
        dialKey('*');
    } else if (e.key === '#') {
        dialKey('#');
    } else if (e.key === 'Backspace') {
        dialDelete();
    } else if (e.key === 'Enter') {
        makeCall();
    }
});

// ===== INITIALIZE =====
console.log('[Phone] ✅ Script loaded');