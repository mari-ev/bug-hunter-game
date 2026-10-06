function login() {
    const username = document.getElementById('username').value.trim();
    const role = document.getElementById('role').value;
    const errorDiv = document.getElementById('error');

    // Проверка: имя не пустое
    if (username === '') {
        errorDiv.textContent = '⚠️ Введите имя';
        return;
    }

    // Проверка: имя не слишком короткое
    if (username.length < 2) {
        errorDiv.textContent = '⚠️ Имя слишком короткое';
        return;
    }

    // Сохраняем данные в localStorage
    localStorage.setItem('username', username);
    localStorage.setItem('role', role);
    localStorage.setItem('loginTime', new Date().toISOString());

    // Переходим на главную (пока заглушка — потом создадим index.html)
    alert(`Добро пожаловать, ${username}! Роль: ${role}`);
    // window.location.href = 'index.html';  // раскомментируем, когда создадим главную
}