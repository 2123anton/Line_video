// background.js - Фоновый скрипт для скачивания видео

// Обработчик сообщений от content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'toggleAutoDarkMode') {
    // Открываем страницу chrome://flags/#enable-force-dark в новой вкладке
    chrome.tabs.create({ url: 'chrome://flags/#enable-force-dark' });
  } else if (message.action === 'downloadVideo') {
    handleVideoDownload(message, sender);
  }
});

async function handleVideoDownload(message, sender) {
  try {
    if (!message.url) {
      console.error('No URL provided for download');
      return;
    }

    // Если это MediaSource, нам нужно загрузить сегменты
    if (message.type === 'mediaSource') {
      // TODO: Implement MSE download
      console.warn('MediaSource download not implemented yet');
      return;
    }

    // Для обычных URL используем chrome.downloads
    const filename = `video_${message.timestamp || Date.now()}.mp4`;
    
    const downloadOptions = {
      url: message.url,
      filename: filename,
      saveAs: true
    };

    try {
      const downloadId = await chrome.downloads.download(downloadOptions);
      console.log('Download started with ID:', downloadId);
    } catch (error) {
      console.error('Download failed:', error);
      // Пробуем альтернативный метод скачивания для blob URL
      if (message.url.startsWith('blob:')) {
        try {
          const response = await fetch(message.url);
          const blob = await response.blob();
          const objectUrl = URL.createObjectURL(blob);
          
          const downloadId = await chrome.downloads.download({
            url: objectUrl,
            filename: filename,
            saveAs: true
          });
          
          console.log('Blob download started with ID:', downloadId);
          // Очищаем созданный URL после небольшой задержки
          setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
        } catch (blobError) {
          console.error('Blob download failed:', blobError);
        }
      }
    }
  } catch (e) {
    console.error('Error in handleVideoDownload:', e);
  }
}

// Инициализация расширения
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    lineVisible: true,
    isVertical: true,
    darkMode: false
  });
});
