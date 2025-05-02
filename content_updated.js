// Глобальные переменные
let isLineVisible = false;
let isVertical = true;
let lineElement = null;
let capturePoint = null;
let toggleButton = null;
let isDarkMode = false;
let hotKeyEnabled = true;
const CAPTURE_OFFSET = 15; // px внутрь экрана

// Инициализация
if (document.readyState === 'interactive' || document.readyState === 'complete') {
  initializeExtension();
} else {
  document.addEventListener('DOMContentLoaded', initializeExtension);
}

function initializeExtension() {
  chrome.storage.local.get(['lineVisible', 'isVertical', 'darkMode', 'hotKeyEnabled'], function(data) {
    isLineVisible = data.lineVisible || false;
    isVertical = data.isVertical !== undefined ? data.isVertical : true;
    isDarkMode = data.darkMode || false;
    hotKeyEnabled = data.hotKeyEnabled !== undefined ? data.hotKeyEnabled : true;
    createToggleButton();
    if (isLineVisible) createLine();
    if (isDarkMode) applyDarkMode(true);
  });

  chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.action === 'toggleLine') {
      toggleLine(message.visible);
    } else if (message.action === 'toggleOrientation') {
      toggleOrientation();
    } else if (message.action === 'toggleDarkMode') {
      applyDarkMode(message.enabled);
    } else if (message.action === 'downloadVideo') {
      downloadVideo();
    }
  });

  // Обработчик горячих клавиш
  document.addEventListener('keydown', function(e) {
    if (!hotKeyEnabled) return;
    
    // Ctrl+Shift+H - включить/выключить все функции
    if (e.ctrlKey && e.shiftKey && e.key === 'H') {
      toggleAllFeatures();
    }
  });
}

function createLine() {
  // Удаляем существующую линию, если она есть
  if (lineElement) {
    lineElement.remove();
  }
  
  // Создаем новую линию
  lineElement = document.createElement('div');
  lineElement.id = 'horizon-line';
  
  // Стили для линии
  lineElement.style.position = 'fixed';
  lineElement.style.backgroundColor = 'lime';
  lineElement.style.zIndex = '9999';
  
  if (isVertical) {
    // Вертикальная линия
    lineElement.style.width = '1px';
    lineElement.style.height = '100%';
    lineElement.style.top = '0';
    lineElement.style.left = '50px'; // Начальное положение
  } else {
    // Горизонтальная линия
    lineElement.style.width = '100%';
    lineElement.style.height = '1px';
    lineElement.style.left = '0';
    lineElement.style.top = '50px'; // Начальное положение
  }
  
  // Добавляем линию на страницу
  document.body.appendChild(lineElement);
  
  // Создаем точку захвата
  createCapturePoint();
}

function createCapturePoint() {
  // Удаляем существующую точку захвата, если она есть
  if (capturePoint) {
    capturePoint.remove();
  }
  
  // Создаем новую точку захвата
  capturePoint = document.createElement('div');
  capturePoint.id = 'capture-point';
  
  // Стили для точки захвата
  capturePoint.style.position = 'fixed';
  capturePoint.style.width = '25px';
  capturePoint.style.height = '25px';
  capturePoint.style.borderRadius = '50%';
  capturePoint.style.backgroundColor = 'rgba(0, 255, 0, 0.6)';
  capturePoint.style.border = '2px solid rgba(0, 255, 0, 0.9)';
  capturePoint.style.cursor = 'move';
  capturePoint.style.zIndex = '10000';
  capturePoint.style.boxShadow = '0 0 10px rgba(0, 255, 0, 0.5)';
  
  // Позиционируем точку захвата
  updateCapturePointPosition();
  
  // Добавляем точку захвата на страницу
  document.body.appendChild(capturePoint);
  
  // Добавляем обработчики событий для перетаскивания
  capturePoint.addEventListener('mousedown', startDrag);
  
  // Добавляем обработчик двойного клика для изменения ориентации
  capturePoint.addEventListener('dblclick', toggleOrientation);
}

function toggleLine(visible) {
  if (visible !== undefined) {
    isLineVisible = visible;
  } else {
    isLineVisible = !isLineVisible;
  }
  
  if (isLineVisible) {
    createLine();
  } else {
    if (lineElement) {
      lineElement.remove();
      lineElement = null;
    }
    if (capturePoint) {
      capturePoint.remove();
      capturePoint = null;
    }
  }
  
  chrome.storage.local.set({lineVisible: isLineVisible});
}

function toggleOrientation() {
  isVertical = !isVertical;
  
  // Сохраняем состояние
  chrome.storage.local.set({isVertical: isVertical});
  
  // Удаляем существующую линию и точку захвата
  if (lineElement) {
    lineElement.remove();
  }
  if (capturePoint) {
    capturePoint.remove();
  }
  
  // Создаем новую линию с новой ориентацией
  createLine();
  
  // Позиционируем линию у края экрана
  if (lineElement) {
    if (isVertical) {
      // Вертикальная линия у левого края
      lineElement.style.left = '50px';
      lineElement.style.top = '0';
    } else {
      // Горизонтальная линия у верхнего края
      lineElement.style.top = '50px';
      lineElement.style.left = '0';
    }
    
    // Обновляем позицию точки захвата
    updateCapturePointPosition();
  }
}

// Функция для обновления позиции точки захвата
function updateCapturePointPosition() {
  if (!capturePoint) return;
  
  if (isVertical) {
    // Для вертикальной линии
    capturePoint.style.left = '50%';
    capturePoint.style.top = CAPTURE_OFFSET + 'px';
    capturePoint.style.transform = 'translateX(-50%)';
  } else {
    // Для горизонтальной линии
    capturePoint.style.top = '50%';
    capturePoint.style.left = 'auto';
    capturePoint.style.right = CAPTURE_OFFSET + 'px';
    capturePoint.style.transform = 'translateY(-50%)';
  }
}

function startDrag(e) {
  e.preventDefault();
  const startX = e.clientX;
  const startY = e.clientY;
  const startLeft = parseInt(lineElement.style.left) || 0;
  const startTop = parseInt(lineElement.style.top) || 0;
  
  function onMouseMove(e) {
    if (isVertical) {
      // Перемещаем вертикальную линию по горизонтали
      const newLeft = startLeft + (e.clientX - startX);
      lineElement.style.left = newLeft + 'px';
    } else {
      // Перемещаем горизонтальную линию по вертикали
      const newTop = startTop + (e.clientY - startY);
      lineElement.style.top = newTop + 'px';
    }
  }
  
  function onMouseUp() {
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  }
  
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
}

function createToggleButton() {
  // Удаляем существующую кнопку, если она есть
  if (toggleButton) {
    toggleButton.remove();
  }
  
  // Создаем новую кнопку
  toggleButton = document.createElement('div');
  toggleButton.id = 'toggle-button';
  
  // Стили для кнопки
  toggleButton.style.position = 'fixed';
  toggleButton.style.bottom = '20px';
  toggleButton.style.right = '20px';
  toggleButton.style.width = '40px';
  toggleButton.style.height = '40px';
  toggleButton.style.borderRadius = '50%';
  toggleButton.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
  toggleButton.style.color = 'white';
  toggleButton.style.textAlign = 'center';
  toggleButton.style.lineHeight = '40px';
  toggleButton.style.fontSize = '20px';
  toggleButton.style.fontWeight = 'bold';
  toggleButton.style.cursor = 'pointer';
  toggleButton.style.zIndex = '10000';
  toggleButton.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.3)';
  toggleButton.textContent = 'L';
  
  // Добавляем кнопку на страницу
  document.body.appendChild(toggleButton);
  
  // Добавляем обработчик клика
  toggleButton.addEventListener('click', toggleLine);
}

// --- ТЕМНЫЙ РЕЖИМ (ИСПОЛЬЗОВАНИЕ CHROME AUTO DARK MODE) ---
function applyDarkMode(enabled) {
  isDarkMode = enabled;
  
  // Проверяем, что мы на нужном сайте
  if (!window.location.href.includes('tagme.sberdevices.ru')) {
    return;
  }
  
  // Отправляем сообщение в background script для включения/выключения Auto Dark Mode
  chrome.runtime.sendMessage({
    action: 'toggleAutoDarkMode',
    enabled: enabled
  });
  
  // Сохраняем состояние в хранилище
  chrome.storage.local.set({darkMode: isDarkMode});
}

// Функция скачивания видео
function downloadVideo() {
  // Проверяем, что мы на нужном сайте
  if (!window.location.href.includes('tagme.sberdevices.ru')) {
    alert('Эта функция работает только на сайте tagme.sberdevices.ru');
    return;
  }
  
  // Ищем видео на странице
  const videos = document.querySelectorAll('video');
  
  if (videos.length === 0) {
    // Если видео не найдено, запрашиваем URL у пользователя
    const videoUrl = prompt('Видео не найдено. Введите URL видео для скачивания:');
    if (videoUrl) {
      chrome.runtime.sendMessage({action: 'downloadVideo', url: videoUrl});
    }
    return;
  }
  
  if (videos.length === 1) {
    // Если найдено только одно видео, скачиваем его
    const videoSrc = videos[0].src || videos[0].querySelector('source')?.src;
    if (videoSrc) {
      chrome.runtime.sendMessage({action: 'downloadVideo', url: videoSrc});
    } else {
      alert('Не удалось получить URL видео.');
    }
    return;
  }
  
  // Если найдено несколько видео, предлагаем выбрать
  let videoOptions = '';
  videos.forEach((video, index) => {
    const src = video.src || video.querySelector('source')?.src;
    if (src) {
      videoOptions += `${index + 1}. ${src}\n`;
    }
  });
  
  const selectedIndex = prompt(`Найдено несколько видео. Выберите номер видео для скачивания:\n${videoOptions}`);
  if (selectedIndex && !isNaN(selectedIndex) && selectedIndex > 0 && selectedIndex <= videos.length) {
    const selectedVideo = videos[selectedIndex - 1];
    const videoSrc = selectedVideo.src || selectedVideo.querySelector('source')?.src;
    if (videoSrc) {
      chrome.runtime.sendMessage({action: 'downloadVideo', url: videoSrc});
    } else {
      alert('Не удалось получить URL выбранного видео.');
    }
  }
}

function toggleAllFeatures() {
  hotKeyEnabled = !hotKeyEnabled;
  chrome.storage.local.set({hotKeyEnabled: hotKeyEnabled});
}
