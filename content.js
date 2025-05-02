// content.js - Основной скрипт для функциональности расширения

let isLineVisible = false;
let isVertical = true;
let lineElement = null;
let capturePoint = null;
let toggleButton = null;
let isDarkMode = false;
let hotKeyEnabled = true;
let isEnabled = false;
const CAPTURE_OFFSET = 15; // px внутрь экрана

// Проверяем, включено ли расширение для текущего сайта
function checkSiteEnabled() {
  const domain = window.location.hostname;
  return new Promise((resolve) => {
    chrome.storage.local.get(['enabledSites'], function(data) {
      const enabledSites = data.enabledSites || [];
      isEnabled = enabledSites.includes(domain);
      resolve(isEnabled);
    });
  });
}

// Очищаем все элементы расширения со страницы
function clearExtensionElements() {
  if (lineElement) {
    lineElement.remove();
    lineElement = null;
  }
  if (capturePoint) {
    capturePoint.remove();
    capturePoint = null;
  }
  if (toggleButton) {
    toggleButton.remove();
    toggleButton = null;
  }
}

// Инициализация
async function initializeExtension() {
  const enabled = await checkSiteEnabled();
  if (!enabled) return;

  chrome.storage.local.get(['lineVisible', 'isVertical', 'darkMode', 'hotKeyEnabled'], function(data) {
    isLineVisible = data.lineVisible || false;
    isVertical = data.isVertical !== undefined ? data.isVertical : true;
    isDarkMode = data.darkMode || false;
    hotKeyEnabled = data.hotKeyEnabled !== undefined ? data.hotKeyEnabled : true;
    createToggleButton();
    if (isLineVisible) createLine();
    if (isDarkMode) applyDarkMode(true);
  });
}

if (document.readyState === 'interactive' || document.readyState === 'complete') {
  initializeExtension();
} else {
  document.addEventListener('DOMContentLoaded', initializeExtension);
}

// Обработчик сообщений
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (message.action === 'siteToggled') {
    isEnabled = message.enabled;
    if (!isEnabled) {
      clearExtensionElements();
    } else {
      initializeExtension();
    }
    return;
  }

  if (!isEnabled) return;

  switch (message.action) {
    case 'toggleLine':
      toggleLine(message.visible);
      break;
    case 'toggleOrientation':
      toggleOrientation();
      break;
    case 'toggleDarkMode':
      applyDarkMode(message.enabled);
      break;
    case 'downloadVideo':
      downloadVideo();
      break;
  }
});

function createToggleButton() {
  if (toggleButton) return;
  toggleButton = document.createElement('button');
  toggleButton.id = 'toggle-button';
  toggleButton.textContent = 'L';
  toggleButton.title = 'Показать/скрыть линейку';
  toggleButton.addEventListener('click', toggleLine);
  document.body.appendChild(toggleButton);
}

function createLine() {
  if (lineElement) return;
  lineElement = document.createElement('div');
  lineElement.id = 'horizon-line';
  capturePoint = document.createElement('div');
  capturePoint.id = 'capture-point';
  capturePoint.title = 'Двойной клик — сменить ориентацию';
  capturePoint.addEventListener('dblclick', toggleOrientation);
  capturePoint.addEventListener('mousedown', startDrag);
  lineElement.appendChild(capturePoint);
  document.body.appendChild(lineElement);
  updateLinePosition();
  isLineVisible = true;
  chrome.storage.local.set({lineVisible: true});
}

function updateLinePosition() {
  if (!lineElement || !capturePoint) return;
  // Keep track of current position before resetting styles
  const currentLeft = lineElement.style.left;
  const currentTop = lineElement.style.top;

  // Reset potentially conflicting styles before applying new ones
  lineElement.style.width = '';
  lineElement.style.height = '';
  lineElement.style.left = '';
  lineElement.style.top = '';
  capturePoint.style.top = '';
  capturePoint.style.left = '';
  capturePoint.style.right = '';
  capturePoint.style.transform = '';
  capturePoint.classList.remove('horizontal'); // Remove class regardless

  if (isVertical) {
    lineElement.style.width = '2px';
    lineElement.style.height = '100vh';
    // Use last known vertical position or default
    lineElement.style.left = lineElement.dataset.lastLeft || '50%';
    lineElement.style.top = '0'; // Vertical line always starts at top
    capturePoint.style.top = CAPTURE_OFFSET + 'px'; // смещаем вниз
    capturePoint.style.left = '50%';
    capturePoint.style.transform = 'translate(-50%, 0)';
    // Store the current top position as the last known horizontal position for next switch
    if (currentTop) lineElement.dataset.lastTop = currentTop;
  } else { // Horizontal
    lineElement.style.width = '100%';
    lineElement.style.height = '2px';
    // Use last known horizontal position or default
    lineElement.style.top = lineElement.dataset.lastTop || '50%';
    lineElement.style.left = '0'; // Horizontal line always starts at left
    capturePoint.style.top = '50%';
    capturePoint.style.left = 'auto'; // Reset left
    capturePoint.style.right = CAPTURE_OFFSET + 'px'; // смещаем влево
    capturePoint.style.transform = 'translate(0, -50%)';
    capturePoint.classList.add('horizontal');
    // Store the current left position as the last known vertical position for next switch
    if (currentLeft) lineElement.dataset.lastLeft = currentLeft;
  }
}

function toggleOrientation() {
  isVertical = !isVertical;
  chrome.storage.local.set({isVertical: isVertical});

  if (lineElement) {
    // Update styles instead of removing/recreating
    updateLinePosition();
  } else {
    // If the line wasn't visible, create it
    createLine();
  }
}

function startDrag(e) {
  e.preventDefault();
  const startX = e.clientX;
  const startY = e.clientY;
  // Use offsetLeft/Top for initial position as style might be empty initially
  const startLeft = lineElement.offsetLeft;
  const startTop = lineElement.offsetTop;

  // Переменные для отслеживания текущей позиции
  let currentLeft = startLeft;
  let currentTop = startTop;

  // Используем requestAnimationFrame для плавной анимации
  let animationFrameId = null;

  function updatePosition() {
    if (isVertical) {
      lineElement.style.left = `${currentLeft}px`;
    } else {
      lineElement.style.top = `${currentTop}px`;
    }
    animationFrameId = null;
  }

  function onMouseMove(e) {
    if (isVertical) {
      currentLeft = startLeft + (e.clientX - startX);
      // Ensure the line stays within bounds (consider capture point offset)
      currentLeft = Math.max(0, Math.min(window.innerWidth - parseInt(lineElement.style.width || '2'), currentLeft));
    } else {
      currentTop = startTop + (e.clientY - startY);
      // Ensure the line stays within bounds (consider capture point offset)
      currentTop = Math.max(0, Math.min(window.innerHeight - parseInt(lineElement.style.height || '2'), currentTop));
    }

    // Запрашиваем анимацию только если предыдущий кадр завершен
    if (!animationFrameId) {
      animationFrameId = requestAnimationFrame(updatePosition);
    }
  }

  function onMouseUp() {
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }
    // Store the final position in dataset
    if (isVertical) {
      lineElement.dataset.lastLeft = lineElement.style.left;
    } else {
      lineElement.dataset.lastTop = lineElement.style.top;
    }
  }

  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
}

function toggleLine() {
  if (isLineVisible) {
    if (lineElement) lineElement.style.display = 'none';
    isLineVisible = false;
  } else {
    if (!lineElement) createLine();
    else lineElement.style.display = 'block';
    isLineVisible = true;
  }
  chrome.storage.local.set({lineVisible: isLineVisible});
}

// --- ТЕМНЫЙ РЕЖИМ (ИСПОЛЬЗОВАНИЕ CHROME AUTO DARK MODE) ---
function applyDarkMode(enabled) {
  isDarkMode = enabled;
  
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
  let videoSrc = null;

  // 1. Все video
  let videos = Array.from(document.querySelectorAll('video'));
  for (let v of videos) {
    if (v.src) { videoSrc = v.src; break; }
    // 2. source внутри video
    let sources = v.querySelectorAll('source');
    for (let s of sources) { if (s.src) { videoSrc = s.src; break; } }
    if (videoSrc) break;
  }

  // 3. blob: ссылки
  if (!videoSrc) {
    let blobs = Array.from(document.querySelectorAll('video')).map(v => v.src).filter(src => src && src.startsWith('blob:'));
    if (blobs.length) videoSrc = blobs[0];
  }

  // 4. iframe (YouTube и др.) — ищем video внутри iframe
  if (!videoSrc) {
    let iframes = document.querySelectorAll('iframe');
    for (let frame of iframes) {
      try {
        let innerVideos = frame.contentDocument.querySelectorAll('video');
        for (let v of innerVideos) {
          if (v.src) { videoSrc = v.src; break; }
          let sources = v.querySelectorAll('source');
          for (let s of sources) { if (s.src) { videoSrc = s.src; break; } }
          if (videoSrc) break;
        }
      } catch (e) { /* cross-origin */ }
      if (videoSrc) break;
    }
  }

  // 5. Если не найдено — запросить у пользователя
  if (!videoSrc) {
    videoSrc = prompt('Видео не найдено. Введите ссылку на видео вручную:');
    if (!videoSrc) return alert('Видео не найдено!');
  }

  // Отправляем URL в background скрипт для скачивания
  chrome.runtime.sendMessage({
    action: 'downloadVideo',
    url: videoSrc,
    timestamp: Date.now()
  });
}

function toggleAllFeatures() {
  if (toggleButton) toggleButton.style.display = toggleButton.style.display === 'none' ? 'block' : 'none';
  if (lineElement) lineElement.style.display = lineElement.style.display === 'none' ? 'block' : 'none';
  hotKeyEnabled = !hotKeyEnabled;
  chrome.storage.local.set({hotKeyEnabled: hotKeyEnabled});
}
