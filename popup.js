// ポップアップが読み込まれたとき
document.addEventListener('DOMContentLoaded', function() {
  // スライダーと値表示要素
  const hueRotateSlider = document.getElementById('hue-rotate');
  const hueRotateValue = document.getElementById('hue-rotate-value');
  const saturateSlider = document.getElementById('saturate');
  const saturateValue = document.getElementById('saturate-value');
  const brightnessSlider = document.getElementById('brightness');
  const brightnessValue = document.getElementById('brightness-value');
  const contrastSlider = document.getElementById('contrast');
  const contrastValue = document.getElementById('contrast-value');
  
  // プレビュー、ボタン、出力エリア
  const previewBox = document.getElementById('preview');
  const applyFilterBtn = document.getElementById('applyFilter');
  const resetFilterBtn = document.getElementById('resetFilter');
  const outputDiv = document.getElementById('output');
  const presetBtns = document.querySelectorAll('.preset-btn');
  
  // 現在のフィルター設定を保持するオブジェクト
  let currentFilter = {
    hueRotate: 0,
    saturate: 100,
    brightness: 100,
    contrast: 100
  };
  
  // 保存された設定を読み込む
  loadSettings();
  
  // デバウンスタイマー
  let debounceTimer = null;
  
  // デバウンスされたフィルター適用関数
  function applyFilterToPageDebounced() {
    // 前のタイマーをキャンセル
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    
    // 新しいタイマーをセット (100msの遅延)
    debounceTimer = setTimeout(() => {
      applyFilterToPage(false); // 通知を表示しないモードで適用
    }, 100);
  }
  
  // プリセット設定
  const presets = {
    normal: { hueRotate: 0, saturate: 100, brightness: 100, contrast: 100 },
    sepia: { hueRotate: 35, saturate: 90, brightness: 95, contrast: 110 },
    cool: { hueRotate: 180, saturate: 110, brightness: 105, contrast: 105 },
    warm: { hueRotate: 30, saturate: 120, brightness: 105, contrast: 100 },
    night: { hueRotate: 225, saturate: 70, brightness: 80, contrast: 120 }
  };
  
  // スライダーの値が変更されたときの処理
  function updateFilterValue(slider, valueDisplay, suffix, filterProperty) {
    slider.addEventListener('input', function() {
      const value = slider.value;
      valueDisplay.textContent = value + suffix;
      currentFilter[filterProperty] = parseInt(value);
      updatePreview();
      
      // リアルタイムにページに適用
      applyFilterToPageDebounced();
      
      // 設定を保存
      saveSettings();
    });
  }
  
  // 全スライダーの値更新処理を設定
  updateFilterValue(hueRotateSlider, hueRotateValue, '°', 'hueRotate');
  updateFilterValue(saturateSlider, saturateValue, '%', 'saturate');
  updateFilterValue(brightnessSlider, brightnessValue, '%', 'brightness');
  updateFilterValue(contrastSlider, contrastValue, '%', 'contrast');
  
  // プレビューボックスの更新
  function updatePreview() {
    const filterString = generateFilterString(currentFilter);
    previewBox.style.filter = filterString;
  }
  
  // CSS filter文字列の生成
  function generateFilterString(filter) {
    return `hue-rotate(${filter.hueRotate}deg) saturate(${filter.saturate}%) brightness(${filter.brightness}%) contrast(${filter.contrast}%)`;
  }
  
  // プリセットボタンのクリックイベント
  presetBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      const presetName = btn.dataset.preset;
      if (presets[presetName]) {
        applyPreset(presets[presetName]);
      }
    });
  });
  
  // プリセットを適用
  function applyPreset(preset) {
    // スライダー値の更新
    hueRotateSlider.value = preset.hueRotate;
    hueRotateValue.textContent = preset.hueRotate + '°';
    
    saturateSlider.value = preset.saturate;
    saturateValue.textContent = preset.saturate + '%';
    
    brightnessSlider.value = preset.brightness;
    brightnessValue.textContent = preset.brightness + '%';
    
    contrastSlider.value = preset.contrast;
    contrastValue.textContent = preset.contrast + '%';
    
    // 現在のフィルターを更新
    currentFilter = {...preset};
    
    // プレビューを更新
    updatePreview();
    
    // ページにリアルタイム適用
    applyFilterToPageDebounced();
    
    // 設定を保存
    saveSettings();
  }
  
  // フィルター適用ボタンのクリックイベント
  applyFilterBtn.addEventListener('click', function() {
    applyFilterToPage();
  });
  
  // リセットボタンのクリックイベント
  resetFilterBtn.addEventListener('click', function() {
    // 標準プリセットを適用
    applyPreset(presets.normal);
    
    // ページに適用する（通知を表示）
    applyFilterToPage(true);
    
    outputDiv.textContent = 'フィルターをリセットしました';
    outputDiv.style.backgroundColor = '';
    outputDiv.style.color = '';
  });
  
  // 現在のフィルターをページに適用
  function applyFilterToPage(showNotification = true) {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      // chrome:// URLかどうかをチェック
      if (tabs[0].url.startsWith('chrome://')) {
        if (showNotification) {
          outputDiv.textContent = 'Chrome内部ページでは使用できません。通常のWebページで試してください。';
          outputDiv.style.backgroundColor = '#FF5733';
          outputDiv.style.color = 'white';
        }
        return;
      }
      
      // フィルター文字列を生成
      const filterString = generateFilterString(currentFilter);
      
      // ページにフィルターを適用するスクリプトを実行
      chrome.scripting.executeScript({
        target: {tabId: tabs[0].id},
        func: function(filterStr) {
          // htmlにスタイルを適用
          document.documentElement.style.filter = filterStr;
          
          // フィルター設定を保存（オプション）
          document.documentElement.dataset.appliedFilter = filterStr;
        },
        args: [filterString]
      }).then(() => {
        if (showNotification) {
          outputDiv.textContent = `フィルターを適用しました: ${filterString}`;
          outputDiv.style.backgroundColor = '#4CAF50';
          outputDiv.style.color = 'white';
        }
      }).catch(error => {
        if (showNotification) {
          outputDiv.textContent = 'エラー: ' + error.message;
          outputDiv.style.backgroundColor = '#FF5733';
          outputDiv.style.color = 'white';
        }
      });
    });
  }
  
  // 設定をChrome Storageに保存
  function saveSettings() {
    chrome.storage.sync.set({ filter: currentFilter }, function() {
      // 保存完了時の処理（オプション）
      console.log('設定を保存しました:', currentFilter);
    });
  }
  
  // 設定をChrome Storageから読み込む
  function loadSettings() {
    chrome.storage.sync.get('filter', function(data) {
      if (data.filter) {
        // 保存された設定があれば読み込む
        currentFilter = data.filter;
        
        // スライダーと表示値を更新
        hueRotateSlider.value = currentFilter.hueRotate;
        hueRotateValue.textContent = currentFilter.hueRotate + '°';
        
        saturateSlider.value = currentFilter.saturate;
        saturateValue.textContent = currentFilter.saturate + '%';
        
        brightnessSlider.value = currentFilter.brightness;
        brightnessValue.textContent = currentFilter.brightness + '%';
        
        contrastSlider.value = currentFilter.contrast;
        contrastValue.textContent = currentFilter.contrast + '%';
        
        // プレビューを更新
        updatePreview();
        
        // 保存された設定を読み込んだことを表示
        outputDiv.textContent = '保存された設定を読み込みました';
        
        // ページにフィルターを適用
        applyFilterToPageDebounced();
      }
    });
  }
  
  // 初期プレビューの更新
  updatePreview();
});