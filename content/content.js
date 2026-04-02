// content/content.js - Content Script 主逻辑

(function() {
  'use strict';

  // 初始化工具
  const detector = new ContentDetector();
  let translationQueue = [];
  let isTranslating = false;
  let currentTranslationId = 0;

  /**
   * 创建译文元素
   */
  function createTranslationElement(originalText, showLoading = true) {
    const span = document.createElement('span');
    span.className = 'ollama-translation';
    span.dataset.original = originalText;
    if (showLoading) {
      span.classList.add('loading');
      span.textContent = '翻译中';
    }
    return span;
  }

  /**
   * 更新译文元素状态
   */
  function updateTranslationResult(element, result) {
    element.classList.remove('loading');

    if (result.error) {
      element.classList.add('error');
      element.textContent = result.error;
      element.onclick = () => retryTranslation(element);
    } else {
      element.classList.remove('error');
      element.textContent = result.translation;
      element.onclick = null;
    }
  }

  /**
   * 重试翻译
   */
  async function retryTranslation(element) {
    const originalText = element.dataset.original;
    element.classList.remove('error');
    element.classList.add('loading');
    element.textContent = '翻译中';

    const result = await sendTranslateRequest(originalText);
    updateTranslationResult(element, result);
  }

  /**
   * 发送翻译请求到 Background
   */
  async function sendTranslateRequest(text) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { action: 'translate', text: text },
        (response) => {
          if (chrome.runtime.lastError) {
            resolve({ error: '扩展通信失败，请刷新页面重试' });
          } else {
            resolve(response);
          }
        }
      );
    });
  }

  /**
   * 在元素后插入译文
   */
  function insertTranslationAfter(element, translationElement) {
    const wrapper = element.parentElement;
    if (wrapper && !wrapper.classList.contains('ollama-translation-wrapper')) {
      const spanWrapper = document.createElement('span');
      spanWrapper.className = 'ollama-translation-wrapper';
      const parentNode = element.parentNode;
      parentNode.insertBefore(spanWrapper, element);
      spanWrapper.appendChild(element);
      spanWrapper.appendChild(translationElement);
    } else {
      element.parentNode.insertBefore(translationElement, element.nextSibling);
    }
  }

  /**
   * 处理选中翻译
   */
  function handleSelectionTranslation(selectedText) {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    const translationElement = createTranslationElement(selectedText);

    const container = document.createElement('div');
    container.style.cssText = `
      position: absolute;
      left: ${rect.left + window.scrollX}px;
      top: ${rect.bottom + window.scrollY + 4}px;
      z-index: 10000;
      background: white;
      padding: 8px 12px;
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      max-width: 300px;
    `;
    container.appendChild(translationElement);
    document.body.appendChild(container);

    sendTranslateRequest(selectedText).then(result => {
      updateTranslationResult(translationElement, result);
    });

    const closeHandler = (e) => {
      if (!container.contains(e.target)) {
        container.remove();
        document.removeEventListener('click', closeHandler);
      }
    };
    setTimeout(() => document.addEventListener('click', closeHandler), 100);
  }

  /**
   * 创建进度显示
   */
  function createProgressUI() {
    const progressDiv = document.createElement('div');
    progressDiv.className = 'ollama-progress';
    progressDiv.innerHTML = `
      <span class="ollama-progress-text">正在翻译 0/0</span>
      <div class="ollama-progress-bar">
        <div class="ollama-progress-fill" style="width: 0%"></div>
      </div>
      <span class="ollama-progress-close">×</span>
    `;

    const closeBtn = progressDiv.querySelector('.ollama-progress-close');
    if (closeBtn) {
      closeBtn.onclick = () => {
        cancelCurrentTranslation();
        progressDiv.remove();
      };
    }

    document.body.appendChild(progressDiv);
    return progressDiv;
  }

  /**
   * 更新进度
   */
  function updateProgress(progressDiv, current, total) {
    progressDiv.querySelector('.ollama-progress-text').textContent =
      `正在翻译 ${current}/${total}`;
    progressDiv.querySelector('.ollama-progress-fill').style.width =
      `${(current / total) * 100}%`;
  }

  /**
   * 取消当前翻译
   */
  function cancelCurrentTranslation() {
    isTranslating = false;
    translationQueue = [];
  }

  /**
   * 处理全文翻译
   */
  async function handlePageTranslation() {
    if (isTranslating) {
      alert('已有翻译任务在进行中');
      return;
    }

    isTranslating = true;
    const paragraphs = detector.groupByParagraphs(detector.getTextNodes());

    if (paragraphs.length === 0) {
      alert('页面未找到可翻译的内容');
      isTranslating = false;
      return;
    }

    const progressDiv = createProgressUI();

    for (let i = 0; i < paragraphs.length && isTranslating; i++) {
      const para = paragraphs[i];
      updateProgress(progressDiv, i + 1, paragraphs.length);

      const existingTranslation = para.element.querySelector('.ollama-translation');
      if (existingTranslation && !existingTranslation.classList.contains('loading')) {
        continue;
      }

      const translationElement = createTranslationElement(para.text);
      para.element.appendChild(translationElement);

      const result = await sendTranslateRequest(para.text);
      updateTranslationResult(translationElement, result);
    }

    progressDiv.remove();
    isTranslating = false;
  }

  /**
   * 处理智能翻译
   */
  async function handleSmartTranslation() {
    if (isTranslating) {
      alert('已有翻译任务在进行中');
      return;
    }

    const mainContent = detector.detectMainContent();
    if (!mainContent) {
      alert('未识别到主要内容区域，将翻译整个页面');
      handlePageTranslation();
      return;
    }

    isTranslating = true;
    mainContent.classList.add('ollama-highlight');

    const paragraphs = detector.groupByParagraphs(detector.getTextNodes(mainContent));
    const progressDiv = createProgressUI();

    for (let i = 0; i < paragraphs.length && isTranslating; i++) {
      const para = paragraphs[i];
      updateProgress(progressDiv, i + 1, paragraphs.length);

      const existingTranslation = para.element.querySelector('.ollama-translation');
      if (existingTranslation && !existingTranslation.classList.contains('loading')) {
        continue;
      }

      const translationElement = createTranslationElement(para.text);
      para.element.appendChild(translationElement);

      const result = await sendTranslateRequest(para.text);
      updateTranslationResult(translationElement, result);
    }

    progressDiv.remove();
    mainContent.classList.remove('ollama-highlight');
    isTranslating = false;
  }

  /**
   * 创建段落翻译按钮
   */
  function createParagraphButton(paragraphElement) {
    const btn = document.createElement('span');
    btn.className = 'ollama-translate-btn';
    btn.textContent = '译';
    btn.style.display = 'none';

    btn.onclick = (e) => {
      e.stopPropagation();
      translateParagraph(paragraphElement);
      btn.remove();
    };

    return btn;
  }

  /**
   * 翻译单个段落
   */
  async function translateParagraph(paragraphElement) {
    const text = paragraphElement.textContent.trim();
    if (!text) return;

    const existingTranslation = paragraphElement.querySelector('.ollama-translation');
    if (existingTranslation) {
      existingTranslation.remove();
    }

    const translationElement = createTranslationElement(text);
    paragraphElement.appendChild(translationElement);

    const result = await sendTranslateRequest(text);
    updateTranslationResult(translationElement, result);
  }

  /**
   * 启用段落悬停翻译模式
   */
  function enableParagraphHoverMode() {
    const paragraphs = document.querySelectorAll('p, div.paragraph, article p');

    paragraphs.forEach(p => {
      const btn = createParagraphButton(p);
      p.style.position = 'relative';
      p.appendChild(btn);

      p.onmouseenter = () => {
        btn.style.display = 'inline-flex';
      };

      p.onmouseleave = () => {
        if (!btn.classList.contains('hidden')) {
          btn.style.display = 'none';
        }
      };
    });
  }

  /**
   * 处理段落翻译消息
   */
  function handleParagraphTranslation(elementId) {
    const element = document.querySelector(`[data-ollama-id="${elementId}"]`);
    if (element) {
      translateParagraph(element);
    }
  }

  // 监听来自 Background 的消息
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'translateSelection') {
      handleSelectionTranslation(message.text);
    } else if (message.action === 'translatePage') {
      handlePageTranslation();
    } else if (message.action === 'translateSmart') {
      handleSmartTranslation();
    } else if (message.action === 'translateParagraph') {
      handleParagraphTranslation(message.elementId);
    } else if (message.action === 'cancelTranslation') {
      cancelCurrentTranslation();
    }
    return false;
  });

  // 初始化段落悬停模式（根据设置）
  chrome.storage.sync.get('triggers', (result) => {
    if (result.triggers?.paragraph) {
      enableParagraphHoverMode();
    }
  });

  console.log('Ollama Translator Content Script loaded');
})();
