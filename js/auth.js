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

    // Убираем ошибку
    errorDiv.textContent = '';

    // Показываем приветствие
    alert(`Добро пожаловать, ${username}! Роль: ${role}`);

    // window.location.href = 'index.html'; // раскомментируем, когда создадим главную
}

function clearForm() {
    // Очищаем поле имени
    document.getElementById('username').value = '';

    // Сбрасываем выбор роли на "Тестировщик"
    document.getElementById('role').value = 'tester';

    // Очищаем ошибку
    document.getElementById('error').textContent = '';

    // Очищаем localStorage (чтобы данные не подставлялись при следующем входе)
    localStorage.removeItem('username');
    localStorage.removeItem('role');
    localStorage.removeItem('loginTime');
}