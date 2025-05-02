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
  const siteToggle = document.getElementById('site-toggle');
  const controlsContainer = document.getElementById('controls-container');
  
  // Функция для безопасной отправки сообщений
  function sendMessageToContentScript(message) {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, message, function(response) {
          if (chrome.runtime.lastError) {
            console.log('Error sending message:', chrome.runtime.lastError);
          }
        });
      }
    });
  }
  
  // Получаем текущий домен
  function getCurrentDomain() {
    return new Promise((resolve) => {
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (tabs[0]?.url) {
          const url = new URL(tabs[0].url);
          resolve(url.hostname);
        } else {
          resolve(null);
        }
      });
    });
  }

  // Проверяем, включено ли расширение для текущего сайта
  async function checkSiteEnabled() {
    const domain = await getCurrentDomain();
    if (!domain) return;

    chrome.storage.local.get(['enabledSites'], function(data) {
      const enabledSites = data.enabledSites || [];
      const isEnabled = enabledSites.includes(domain);
      siteToggle.checked = isEnabled;
      controlsContainer.style.display = isEnabled ? 'block' : 'none';
    });
  }

  // Обработчик переключения сайта
  siteToggle.addEventListener('change', async function() {
    const domain = await getCurrentDomain();
    if (!domain) return;

    chrome.storage.local.get(['enabledSites'], function(data) {
      const enabledSites = data.enabledSites || [];
      const isEnabled = siteToggle.checked;
      
      if (isEnabled && !enabledSites.includes(domain)) {
        enabledSites.push(domain);
      } else if (!isEnabled) {
        const index = enabledSites.indexOf(domain);
        if (index > -1) {
          enabledSites.splice(index, 1);
        }
      }

      chrome.storage.local.set({enabledSites: enabledSites}, function() {
        controlsContainer.style.display = isEnabled ? 'block' : 'none';
        // Отправляем сообщение в content script
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'siteToggled',
            enabled: isEnabled
          });
        });
      });
    });
  });

  // Загружаем сохраненные настройки
  chrome.storage.local.get(['lineVisible', 'isVertical'], function(data) {
    lineToggle.checked = data.lineVisible !== false;
  });

  // Инициализация при открытии popup
  checkSiteEnabled();
  
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
});
