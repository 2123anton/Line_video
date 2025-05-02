// popup.js: Скрипт для обработки событий в попапе

document.addEventListener('DOMContentLoaded', function() {
  // Получаем элементы управления
  const lineToggle = document.getElementById('line-toggle');
  const orientationToggle = document.getElementById('orientation-toggle');
  const autoDarkModeBtn = document.getElementById('auto-dark-mode-btn');
  const darkModeInfoBtn = document.getElementById('dark-mode-info-btn');
  const darkModeInfo = document.getElementById('dark-mode-info');
  const downloadVideoBtn = document.getElementById('download-video');
  const showInstrBtn = document.getElementById('show-instr-btn');
  const instructionsDiv = document.getElementById('instructions');
  const recommendationBtn = document.getElementById('recommendation-btn');
  const recommendationContent = document.getElementById('recommendation-content');
  
  // Функция для проверки, находимся ли мы на целевом сайте
  function isTargetPage(url) {
    return url.includes('tagme.sberdevices.ru');
  }

  // Функция для безопасной отправки сообщений
  function sendMessageToContentScript(message) {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs[0] && isTargetPage(tabs[0].url)) {
        chrome.tabs.sendMessage(tabs[0].id, message, function(response) {
          if (chrome.runtime.lastError) {
            console.log('Error sending message:', chrome.runtime.lastError);
          }
        });
      } else {
        alert('Это расширение работает только на сайте tagme.sberdevices.ru');
      }
    });
  }
  
  // Загружаем сохраненные настройки
  chrome.storage.local.get(['lineVisible', 'isVertical'], function(data) {
    lineToggle.checked = data.lineVisible !== false;
  });
  
  // Обработчик переключения линии
  lineToggle.addEventListener('change', function() {
    const isChecked = lineToggle.checked;
    sendMessageToContentScript({action: 'toggleLine', visible: isChecked});
  });
  
  // Обработчик изменения ориентации линии
  orientationToggle.addEventListener('click', function() {
    sendMessageToContentScript({action: 'toggleOrientation'});
  });
  
  // Обработчик кнопки Auto Dark Mode
  autoDarkModeBtn.addEventListener('click', function() {
    chrome.tabs.create({ url: 'chrome://flags/#enable-force-dark' });
  });
  
  // Обработчик кнопки информации о темном режиме
  darkModeInfoBtn.addEventListener('click', function() {
    darkModeInfo.classList.toggle('active');
  });
  
  // Обработчик кнопки скачивания видео
  downloadVideoBtn.addEventListener('click', function() {
    sendMessageToContentScript({action: 'downloadVideo'});
  });
  
  // Обработчик кнопки показа инструкции
  showInstrBtn.addEventListener('click', function() {
    instructionsDiv.style.display = instructionsDiv.style.display === 'block' ? 'none' : 'block';
  });
  
  // Обработчик кнопки рекомендации
  recommendationBtn.addEventListener('click', function() {
    recommendationContent.classList.toggle('active');
  });

  // Проверяем текущую страницу при загрузке попапа
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    if (tabs[0] && !isTargetPage(tabs[0].url)) {
      // Если мы не на целевом сайте, отключаем интерактивные элементы
      lineToggle.disabled = true;
      orientationToggle.disabled = true;
      downloadVideoBtn.disabled = true;
      alert('Это расширение работает только на сайте tagme.sberdevices.ru');
    }
  });
});
