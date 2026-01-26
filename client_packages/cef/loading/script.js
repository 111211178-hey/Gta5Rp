const tips = [
    "Используйте /help для списка команд",
    "Соблюдайте правила сервера",
    "Играйте честно и получайте удовольствие!",
    "Общайтесь с другими игроками",
    "Зарабатывайте деньги легальными способами",
    "Уважайте других игроков",
    "Не забывайте сохранять прогресс",
    "Исследуйте мир и находите новые места"
];

let currentTip = 0;

function setCharacterInfo(name, surname, money, bank) {
    document.getElementById('characterName').textContent = `${name} ${surname}`;
    document.getElementById('money').textContent = `$${money.toLocaleString()}`;
    document.getElementById('bank').textContent = `$${bank.toLocaleString()}`;
}

function startLoading() {
    const loadingBar = document.getElementById('loadingBar');
    const loadingText = document.getElementById('loadingText');
    const tipElement = document.getElementById('tip');
    
    let progress = 0;
    const stages = [
        { percent: 15, text: 'Загрузка текстур...' },
        { percent: 35, text: 'Загрузка моделей...' },
        { percent: 55, text: 'Загрузка окружения...' },
        { percent: 75, text: 'Загрузка транспорта...' },
        { percent: 90, text: 'Финализация...' },
        { percent: 100, text: 'Готово!' }
    ];
    
    let currentStage = 0;
    
    const interval = setInterval(() => {
        if (currentStage < stages.length) {
            progress = stages[currentStage].percent;
            loadingBar.style.width = progress + '%';
            loadingText.textContent = stages[currentStage].text;
            currentStage++;
        } else {
            clearInterval(interval);
        }
    }, 1300);
    
    // Смена советов
    setInterval(() => {
        currentTip = (currentTip + 1) % tips.length;
        tipElement.style.opacity = 0;
        setTimeout(() => {
            tipElement.textContent = tips[currentTip];
            tipElement.style.opacity = 1;
        }, 300);
    }, 4000);
    
    // Установка первого совета
    tipElement.textContent = tips[0];
}