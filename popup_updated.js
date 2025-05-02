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
  
  // Загружаем сохраненные настройки
  chrome.storage.local.get(['lineVisible', 'isVertical'], function(data) {
    // Устанавливаем состояние переключателей
    lineToggle.checked = data.lineVisible !== false;
  });
  
  // Обработчик переключения линии
  lineToggle.addEventListener('change', function() {
    const isChecked = lineToggle.checked;
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {action: 'toggleLine', visible: isChecked});
    });
  });
  
  // Обработчик изменения ориентации линии
  orientationToggle.addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {action: 'toggleOrientation'});
    });
  });
  
  // Обработчик кнопки Auto Dark Mode
  autoDarkModeBtn.addEventListener('click', function() {
    // Открываем страницу chrome://flags/#enable-force-dark в новой вкладке
    chrome.tabs.create({ url: 'chrome://flags/#enable-force-dark' });
  });
  
  // Обработчик кнопки информации о темном режиме
  darkModeInfoBtn.addEventListener('click', function() {
    // Показываем/скрываем информацию о темном режиме
    darkModeInfo.classList.toggle('active');
  });
  
  // Обработчик кнопки скачивания видео
  downloadVideoBtn.addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {action: 'downloadVideo'});
    });
  });
  
  // Обработчик кнопки показа инструкции
  showInstrBtn.addEventListener('click', function() {
    instructionsDiv.style.display = instructionsDiv.style.display === 'block' ? 'none' : 'block';
  });
  
  // Обработчик кнопки рекомендации
  recommendationBtn.addEventListener('click', function() {
    recommendationContent.classList.toggle('active');
  });
});
