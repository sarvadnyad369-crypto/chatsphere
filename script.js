// Initialize Toastr
toastr.options = {
    positionClass: 'toast-top-right',
    progressBar: true,
    closeButton: true,
    timeOut: 3000,
    extendedTimeOut: 1000,
    newestOnTop: true
};

// App State - CLEAN VERSION (No auto messages)
let currentUser = null;
let currentChat = null;
let friends = [];
let friendRequests = [];
let messages = {};
let isRecording = false;
let mediaRecorder = null;
let audioChunks = [];

// Authentication Functions
function showAuthForm(form) {
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    
    document.getElementById(form + 'Form').classList.add('active');
    document.querySelector(`.auth-tab[onclick="showAuthForm('${form}')"]`).classList.add('active');
}

function login() {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    
    if (!username || !password) {
        toastr.error('Please enter username and password');
        return;
    }
    
    currentUser = {
        id: 'user' + Date.now(),
        username: username,
        displayName: username.charAt(0).toUpperCase() + username.slice(1),
        avatar: username.substring(0, 2).toUpperCase()
    };
    
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    initializeApp();
    toastr.success('Welcome back, ' + currentUser.displayName + '!');
}

function quickLogin(userType) {
    const users = {
        'user1': { id: 'user1', username: 'alex', displayName: 'Alex Johnson', avatar: 'AJ' },
        'user2': { id: 'user2', username: 'maria', displayName: 'Maria Silva', avatar: 'MS' },
        'user3': { id: 'user3', username: 'john', displayName: 'John Doe', avatar: 'JD' }
    };
    
    currentUser = users[userType];
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    initializeApp();
    toastr.success('Welcome, ' + currentUser.displayName + '!');
}

function register() {
    const username = document.getElementById('registerUsername').value.trim();
    const displayName = document.getElementById('registerDisplayName').value.trim();
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;
    
    if (!username || !displayName || !password) {
        toastr.error('Please fill all fields');
        return;
    }
    
    if (password !== confirmPassword) {
        toastr.error('Passwords do not match');
        return;
    }
    
    if (password.length < 6) {
        toastr.error('Password must be at least 6 characters');
        return;
    }
    
    currentUser = {
        id: 'user' + Date.now(),
        username: username,
        displayName: displayName,
        avatar: displayName.substring(0, 2).toUpperCase()
    };
    
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    initializeApp();
    toastr.success('Account created successfully!');
}

function initializeApp() {
    document.getElementById('authScreen').style.display = 'none';
    document.getElementById('appContainer').style.display = 'flex';
    
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
    }
    
    document.getElementById('userAvatar').textContent = currentUser.avatar;
    document.getElementById('userDisplayName').textContent = currentUser.displayName;
    
    loadFriends();
    loadFriendRequests();
    
    const savedChat = localStorage.getItem('currentChat');
    if (savedChat && friends.find(f => f.id === savedChat)) {
        openChat(savedChat);
    }
}

function loadFriends() {
    const savedFriends = localStorage.getItem('friends_' + currentUser.id);
    friends = savedFriends ? JSON.parse(savedFriends) : [];
    
    const chatList = document.getElementById('chatList');
    chatList.innerHTML = '';
    
    if (friends.length === 0) {
        chatList.innerHTML = `
            <div style="text-align: center; padding: 40px 20px; color: var(--accent-light);">
                <i class="fas fa-user-friends" style="font-size: 48px; margin-bottom: 15px;"></i>
                <h4>No friends yet</h4>
                <p>Add friends to start chatting</p>
                <button class="btn" onclick="showAddFriendModal()" style="width: auto; margin-top: 15px; padding: 10px 20px;">
                    <i class="fas fa-user-plus"></i> Add First Friend
                </button>
            </div>
        `;
        return;
    }
    
    friends.forEach(friend => {
        const chatItem = document.createElement('div');
        chatItem.className = 'chat-item';
        chatItem.dataset.id = friend.id;
        chatItem.onclick = () => openChat(friend.id);
        
        const lastMessage = getLastMessage(friend.id);
        
        chatItem.innerHTML = `
            <div class="chat-avatar" style="background: linear-gradient(45deg, #667eea, #764ba2);">
                ${friend.avatar}
                ${friend.online ? '<div class="online-status"></div>' : ''}
            </div>
            <div class="chat-info">
                <h4>${friend.displayName}</h4>
                <p class="last-message">${lastMessage}</p>
            </div>
            <div class="chat-meta">
                <div class="timestamp">${friend.lastSeen}</div>
            </div>
        `;
        
        chatList.appendChild(chatItem);
    });
    
    localStorage.setItem('friends_' + currentUser.id, JSON.stringify(friends));
}

function loadFriendRequests() {
    const savedRequests = localStorage.getItem('friendRequests_' + currentUser.id);
    friendRequests = savedRequests ? JSON.parse(savedRequests) : [];
    updateFriendRequestsBadge();
}

function updateFriendRequestsBadge() {
    const badge = document.getElementById('friendRequestsBadge');
    const countElement = document.getElementById('friendRequestCount');
    const notificationBadge = document.getElementById('notificationBadge');
    
    if (friendRequests.length > 0) {
        badge.style.display = 'block';
        countElement.textContent = friendRequests.length;
        notificationBadge.textContent = friendRequests.length;
        notificationBadge.style.display = 'flex';
    } else {
        badge.style.display = 'none';
        notificationBadge.style.display = 'none';
    }
}

function openChat(friendId) {
    currentChat = friendId;
    localStorage.setItem('currentChat', friendId);
    
    const friend = friends.find(f => f.id === friendId);
    if (!friend) return;
    
    document.getElementById('chatHeader').style.display = 'flex';
    document.getElementById('chatActions').style.display = 'flex';
    document.getElementById('chatPartnerAvatar').textContent = friend.avatar;
    document.getElementById('chatPartnerName').textContent = friend.displayName;
    document.getElementById('chatPartnerStatus').innerHTML = 
        friend.online ? 
        '<span class="status-dot"></span> Online' : 
        `Last seen ${friend.lastSeen}`;
    
    document.getElementById('inputArea').style.display = 'flex';
    
    loadMessages(friendId);
    
    document.querySelectorAll('.chat-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.id === friendId) {
            item.classList.add('active');
        }
    });
}

function loadMessages(friendId) {
    const container = document.getElementById('messagesContainer');
    container.innerHTML = '';
    
    const savedMessages = localStorage.getItem('messages_' + currentUser.id + '_' + friendId);
    const chatMessages = savedMessages ? JSON.parse(savedMessages) : [];
    
    messages[friendId] = chatMessages;
    
    if (chatMessages.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; margin-top: 50px; color: var(--accent-light);">
                <i class="fas fa-comments" style="font-size: 48px; margin-bottom: 20px;"></i>
                <h3>Start a conversation with ${friends.find(f => f.id === friendId).displayName}</h3>
                <p>Send your first message!</p>
            </div>
        `;
        return;
    }
    
    chatMessages.forEach(msg => {
        addMessageToUI(msg.text, msg.type === 'sent' ? 'sent' : 'received');
    });
    
    container.scrollTop = container.scrollHeight;
}

function sendMessage() {
    if (!currentChat) {
        toastr.warning('Select a friend to chat with');
        return;
    }
    
    const input = document.getElementById('messageInput');
    const text = input.value.trim();
    
    if (!text) return;
    
    addMessageToUI(text, 'sent');
    
    const message = {
        id: Date.now(),
        sender: 'current',
        text: text,
        time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
        type: 'sent'
    };
    
    if (!messages[currentChat]) messages[currentChat] = [];
    messages[currentChat].push(message);
    
    localStorage.setItem('messages_' + currentUser.id + '_' + currentChat, 
        JSON.stringify(messages[currentChat]));
    
    input.value = '';
    autoResize(input);
    
    playMessageSound();
    updateChatList();
}

function addMessageToUI(text, type) {
    const container = document.getElementById('messagesContainer');
    
    if (container.children.length === 1 && container.children[0].querySelector('.fa-comments')) {
        container.innerHTML = '';
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    
    const now = new Date();
    const time = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    
    messageDiv.innerHTML = `
        <p class="message-text">${escapeHtml(text)}</p>
        <div class="message-time">${time}</div>
    `;
    
    container.appendChild(messageDiv);
    container.scrollTop = container.scrollHeight;
}

// Friend System Functions
function showAddFriendModal() {
    document.getElementById('addFriendModal').style.display = 'flex';
}

function sendFriendRequest() {
    const username = document.getElementById('friendUsername').value.trim();
    
    if (!username) {
        toastr.error('Please enter a username');
        return;
    }
    
    if (username === currentUser.username) {
        toastr.error('You cannot add yourself as a friend');
        return;
    }
    
    if (friends.some(f => f.username === username)) {
        toastr.error('You are already friends with this user');
        return;
    }
    
    if (friendRequests.some(r => r.from === username && r.status === 'pending')) {
        toastr.error('Friend request already sent');
        return;
    }
    
    toastr.success('Friend request sent to ' + username);
    document.getElementById('friendUsername').value = '';
    closeModal('addFriendModal');
}

function toggleNotifications() {
    if (friendRequests.length > 0) {
        showFriendRequestsModal();
    } else {
        toastr.info('No new notifications');
    }
}

function showFriendRequestsModal() {
    const modal = document.getElementById('friendRequestsModal');
    const list = document.getElementById('friendRequestsList');
    
    list.innerHTML = '';
    
    if (friendRequests.length === 0) {
        list.innerHTML = `
            <div style="text-align: center; padding: 40px 20px; color: var(--accent-light);">
                <i class="fas fa-user-clock" style="font-size: 48px; margin-bottom: 15px;"></i>
                <h4>No pending requests</h4>
                <p>When someone adds you, it will appear here</p>
            </div>
        `;
    } else {
        friendRequests.forEach(request => {
            const item = document.createElement('div');
            item.className = 'friend-request-item';
            item.innerHTML = `
                <div class="friend-request-info">
                    <div class="chat-avatar">${request.fromAvatar}</div>
                    <div>
                        <h4>${request.fromDisplayName}</h4>
                        <p>@${request.from}</p>
                        <small style="color: var(--accent-light);">${request.time}</small>
                    </div>
                </div>
                <div class="request-actions">
                    <button class="accept-btn" onclick="acceptFriendRequest('${request.id}')">
                        <i class="fas fa-check"></i>
                    </button>
                    <button class="reject-btn" onclick="rejectFriendRequest('${request.id}')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
            list.appendChild(item);
        });
    }
    
    modal.style.display = 'flex';
}

function acceptFriendRequest(requestId) {
    const requestIndex = friendRequests.findIndex(r => r.id === requestId);
    if (requestIndex === -1) return;
    
    const request = friendRequests[requestIndex];
    
    const newFriend = {
        id: 'user' + Date.now(),
        username: request.from,
        displayName: request.fromDisplayName,
        avatar: request.fromAvatar,
        online: true,
        lastSeen: 'Just now'
    };
    
    friends.push(newFriend);
    localStorage.setItem('friends_' + currentUser.id, JSON.stringify(friends));
    
    friendRequests.splice(requestIndex, 1);
    localStorage.setItem('friendRequests_' + currentUser.id, JSON.stringify(friendRequests));
    
    updateFriendRequestsBadge();
    loadFriends();
    
    toastr.success('You are now friends with ' + request.fromDisplayName);
    
    if (friendRequests.length === 0) {
        closeModal('friendRequestsModal');
    } else {
        showFriendRequestsModal();
    }
}

function rejectFriendRequest(requestId) {
    const requestIndex = friendRequests.findIndex(r => r.id === requestId);
    if (requestIndex === -1) return;
    
    const request = friendRequests[requestIndex];
    friendRequests.splice(requestIndex, 1);
    localStorage.setItem('friendRequests_' + currentUser.id, JSON.stringify(friendRequests));
    
    updateFriendRequestsBadge();
    toastr.info('Friend request from ' + request.fromDisplayName + ' declined');
    
    if (friendRequests.length === 0) {
        closeModal('friendRequestsModal');
    } else {
        showFriendRequestsModal();
    }
}

// Utility Functions
function getLastMessage(friendId) {
    const savedMessages = localStorage.getItem('messages_' + currentUser.id + '_' + friendId);
    const chatMessages = savedMessages ? JSON.parse(savedMessages) : [];
    
    if (chatMessages.length === 0) {
        return 'Start a conversation';
    }
    
    const lastMsg = chatMessages[chatMessages.length - 1];
    return lastMsg.text.length > 20 ? lastMsg.text.substring(0, 20) + '...' : lastMsg.text;
}

function updateChatList() {
    const chatItems = document.querySelectorAll('.chat-item');
    chatItems.forEach(item => {
        const friendId = item.dataset.id;
        const lastMessage = item.querySelector('.last-message');
        
        if (lastMessage) {
            lastMessage.textContent = getLastMessage(friendId);
        }
    });
}

function showSettings() {
    document.getElementById('settingsModal').style.display = 'flex';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function logout() {
    localStorage.removeItem('currentUser');
    location.reload();
}

function playMessageSound() {
    const sound = document.getElementById('messageSound');
    sound.currentTime = 0;
    sound.play().catch(e => console.log("Sound play failed:", e));
}

function showNotification(title, message) {
    const notificationSound = document.getElementById('notificationSound');
    notificationSound.currentTime = 0;
    notificationSound.play().catch(e => console.log("Notification sound failed:", e));
    
    const badge = document.getElementById('notificationBadge');
    let count = parseInt(badge.textContent) || 0;
    badge.textContent = count + 1;
    badge.style.display = 'flex';
    
    toastr.info(message, title);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function autoResize(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 100) + 'px';
}

function handleEnter(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
}

// Media sharing functions
function attachFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,video/*,audio/*,text/*,.pdf,.doc,.docx';
    input.onchange = function(e) {
        const file = e.target.files[0];
        if (file) {
            const fileName = file.name;
            const fileSize = (file.size / (1024*1024)).toFixed(2) + ' MB';
            
            addFileMessageToUI(fileName, fileSize, file.type);
            
            toastr.success('File sent: ' + fileName);
        }
    };
    input.click();
}

function addFileMessageToUI(filename, size, type) {
    if (!currentChat) return;
    
    const container = document.getElementById('messagesContainer');
    
    if (container.children.length === 1 && container.children[0].querySelector('.fa-comments')) {
        container.innerHTML = '';
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message sent';
    
    const now = new Date();
    const time = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    
    let fileIcon = 'fas fa-file';
    if (type.includes('image')) fileIcon = 'fas fa-image';
    else if (type.includes('video')) fileIcon = 'fas fa-video';
    else if (type.includes('audio')) fileIcon = 'fas fa-music';
    else if (type.includes('pdf')) fileIcon = 'fas fa-file-pdf';
    else if (type.includes('word')) fileIcon = 'fas fa-file-word';
    
    messageDiv.innerHTML = `
        <div style="background: rgba(100, 255, 218, 0.1); padding: 15px; border-radius: 15px; margin: 10px 0;">
            <div style="display: flex; align-items: center; gap: 15px;">
                <div style="width: 50px; height: 50px; border-radius: 12px; background: var(--gradient-accent); display: flex; align-items: center; justify-content: center; color: var(--primary-dark);">
                    <i class="${fileIcon}"></i>
                </div>
                <div style="flex: 1;">
                    <div style="font-weight: bold; color: var(--text-white);">${filename}</div>
                    <div style="font-size: 12px; color: var(--accent-light);">${size} • Secure</div>
                </div>
            </div>
        </div>
        <div class="message-time">${time}</div>
    `;
    
    container.appendChild(messageDiv);
    container.scrollTop = container.scrollHeight;
    
    if (!messages[currentChat]) messages[currentChat] = [];
    messages[currentChat].push({
        id: Date.now(),
        sender: 'current',
        text: `[FILE] ${filename}`,
        time: time,
        type: 'sent'
    });
    
    localStorage.setItem('messages_' + currentUser.id + '_' + currentChat, 
        JSON.stringify(messages[currentChat]));
    
    playMessageSound();
    updateChatList();
}

function showMediaModal(type) {
    if (type === 'camera') {
        navigator.mediaDevices.getUserMedia({ video: true })
            .then(stream => {
                const modal = document.createElement('div');
                modal.className = 'modal-overlay';
                modal.style.display = 'flex';
                modal.innerHTML = `
                    <div class="modal" style="max-width: 800px;">
                        <div class="modal-header">
                            <h3><i class="fas fa-camera"></i> Take Photo</h3>
                            <button class="modal-close" onclick="this.parentElement.parentElement.remove()">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        <div style="text-align: center;">
                            <video id="cameraLive" autoplay style="width: 100%; max-height: 400px; border-radius: 12px;"></video>
                            <div style="margin-top: 20px;">
                                <button class="btn" onclick="capturePhoto()" style="width: auto; padding: 15px 30px;">
                                    <i class="fas fa-camera"></i> Capture
                                </button>
                                <canvas id="photoCanvas" style="display: none;"></canvas>
                            </div>
                        </div>
                    </div>
                `;
                document.body.appendChild(modal);
                
                const video = modal.querySelector('#cameraLive');
                video.srcObject = stream;
                
                window.currentStream = stream;
            })
            .catch(err => {
                toastr.error('Camera access denied or not available');
                console.error('Camera error:', err);
            });
    }
}

function capturePhoto() {
    const video = document.querySelector('#cameraLive');
    const canvas = document.querySelector('#photoCanvas');
    const modal = document.querySelector('.modal-overlay');
    
    if (!video || !canvas) return;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0);
    
    const photoData = canvas.toDataURL('image/jpeg');
    
    addPhotoMessageToUI(photoData);
    
    if (modal) modal.remove();
    if (window.currentStream) {
        window.currentStream.getTracks().forEach(track => track.stop());
        window.currentStream = null;
    }
    
    toastr.success('Photo sent!');
}

function addPhotoMessageToUI(photoData) {
    if (!currentChat) return;
    
    const container = document.getElementById('messagesContainer');
    
    if (container.children.length === 1 && container.children[0].querySelector('.fa-comments')) {
        container.innerHTML = '';
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message sent';
    
    const now = new Date();
    const time = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    
    messageDiv.innerHTML = `
        <div class="media-container">
            <img src="${photoData}" alt="Sent photo" style="max-width: 300px; border-radius: 15px;">
        </div>
        <div class="message-time">${time}</div>
    `;
    
    container.appendChild(messageDiv);
    container.scrollTop = container.scrollHeight;
    
    if (!messages[currentChat]) messages[currentChat] = [];
    messages[currentChat].push({
        id: Date.now(),
        sender: 'current',
        text: '[PHOTO]',
        time: time,
        type: 'sent',
        photo: photoData
    });
    
    localStorage.setItem('messages_' + currentUser.id + '_' + currentChat, 
        JSON.stringify(messages[currentChat]));
    
    playMessageSound();
    updateChatList();
}

function startVoiceRecording() {
    if (isRecording) {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
        }
        isRecording = false;
        document.querySelector('.tool-btn .fa-microphone').classList.remove('fa-stop');
        document.querySelector('.tool-btn .fa-microphone').classList.add('fa-microphone');
        toastr.info('Recording stopped');
    } else {
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                mediaRecorder = new MediaRecorder(stream);
                audioChunks = [];
                
                mediaRecorder.ondataavailable = event => {
                    audioChunks.push(event.data);
                };
                
                mediaRecorder.onstop = () => {
                    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                    const audioUrl = URL.createObjectURL(audioBlob);
                    
                    addVoiceMessageToUI(audioUrl, audioBlob.size);
                    
                    stream.getTracks().forEach(track => track.stop());
                };
                
                mediaRecorder.start();
                isRecording = true;
                document.querySelector('.tool-btn .fa-microphone').classList.remove('fa-microphone');
                document.querySelector('.tool-btn .fa-microphone').classList.add('fa-stop');
                
                toastr.info('Recording... Click again to stop');
            })
            .catch(err => {
                toastr.error('Microphone access denied');
                console.error('Microphone error:', err);
            });
    }
}

function addVoiceMessageToUI(audioUrl, size) {
    if (!currentChat) return;
    
    const container = document.getElementById('messagesContainer');
    
    if (container.children.length === 1 && container.children[0].querySelector('.fa-comments')) {
        container.innerHTML = '';
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message sent';
    
    const now = new Date();
    const time = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    const duration = '0:15';
    
    messageDiv.innerHTML = `
        <div class="audio-message">
            <button class="action-btn" onclick="playAudioMessage('${audioUrl}', this)">
                <i class="fas fa-play"></i>
            </button>
            <div class="audio-controls">
                <div>Voice message</div>
                <div class="audio-progress">
                    <div class="audio-progress-bar"></div>
                </div>
            </div>
            <div>${duration}</div>
        </div>
        <div class="message-time">${time}</div>
    `;
    
    container.appendChild(messageDiv);
    container.scrollTop = container.scrollHeight;
    
    if (!messages[currentChat]) messages[currentChat] = [];
    messages[currentChat].push({
        id: Date.now(),
        sender: 'current',
        text: '[VOICE MESSAGE]',
        time: time,
        type: 'sent',
        audioUrl: audioUrl
    });
    
    localStorage.setItem('messages_' + currentUser.id + '_' + currentChat, 
        JSON.stringify(messages[currentChat]));
    
    playMessageSound();
    updateChatList();
}

function playAudioMessage(audioUrl, button) {
    const audio = new Audio(audioUrl);
    const icon = button.querySelector('i');
    
    if (icon.classList.contains('fa-play')) {
        audio.play();
        icon.classList.remove('fa-play');
        icon.classList.add('fa-pause');
        
        audio.onended = () => {
            icon.classList.remove('fa-pause');
            icon.classList.add('fa-play');
        };
    } else {
        audio.pause();
        icon.classList.remove('fa-pause');
        icon.classList.add('fa-play');
    }
}

function showEmojiPicker() {
    const emojis = ['😊', '😂', '❤️', '🔥', '👍', '🎉', '🤔', '👏', '🙌', '💯'];
    const input = document.getElementById('messageInput');
    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
    input.value += randomEmoji;
    autoResize(input);
}

function startVoiceCall() {
    toastr.info('Starting secure voice call...');
}

function startVideoCall() {
    toastr.info('Starting secure video call...');
}

function showFriendInfo() {
    if (currentChat) {
        const friend = friends.find(f => f.id === currentChat);
        if (friend) {
            toastr.info(
                `<strong>${friend.displayName}</strong><br>
                Username: @${friend.username}<br>
                Status: ${friend.online ? 'Online' : 'Offline'}<br>
                Last seen: ${friend.lastSeen}`,
                'Friend Info'
            );
        }
    }
}

// Initialize app on load
document.addEventListener('DOMContentLoaded', function() {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        initializeApp();
    }
    
    document.addEventListener('click', function(event) {
        if (event.target.classList.contains('modal-overlay')) {
            event.target.style.display = 'none';
        }
    });
});

// Clear all data function (for testing)
function clearAllData() {
    if (confirm('Clear all messages and friends?')) {
        localStorage.clear();
        location.reload();
    }
}