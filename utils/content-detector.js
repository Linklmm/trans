// utils/content-detector.js - 智能内容检测

/**
 * 内容检测器 - 识别页面主要内容区域
 */
class ContentDetector {
  constructor() {
    // 优先检测的标签
    this.priorityTags = ['article', 'main', '[role="main"]', '.post-content', '.article-content'];
    // 需要忽略的标签
    this.ignoreTags = ['nav', 'header', 'footer', 'aside', 'script', 'style', 'iframe', 'noscript'];
    // 需要忽略的 class/id 关键词
    this.ignorePatterns = ['nav', 'menu', 'sidebar', 'footer', 'header', 'comment', 'ad', 'advertisement', 'banner'];
  }

  /**
   * 检测主要内容区域
   * @returns {Element|null} - 主要内容容器
   */
  detectMainContent() {
    // 优先检测特定标签
    for (const selector of this.priorityTags) {
      const element = document.querySelector(selector);
      if (element && this._isValidContent(element)) {
        return element;
      }
    }

    // 基于文本密度检测
    return this._findByTextDensity();
  }

  /**
   * 验证元素是否为有效内容
   */
  _isValidContent(element) {
    if (!element) return false;

    // 检查是否在忽略列表中
    const tagName = element.tagName.toLowerCase();
    if (this.ignoreTags.includes(tagName)) return false;

    // 检查 class/id 是否包含忽略关键词
    const className = element.className || '';
    const id = element.id || '';
    for (const pattern of this.ignorePatterns) {
      if (className.toLowerCase().includes(pattern) || id.toLowerCase().includes(pattern)) {
        return false;
      }
    }

    // 检查文本长度
    const textLength = element.textContent.trim().length;
    return textLength > 100;
  }

  /**
   * 基于文本密度查找主要内容
   */
  _findByTextDensity() {
    const candidates = document.querySelectorAll('div, section');
    let bestElement = null;
    let bestScore = 0;

    for (const element of candidates) {
      if (!this._isValidContent(element)) continue;

      const score = this._calculateDensityScore(element);
      if (score > bestScore) {
        bestScore = score;
        bestElement = element;
      }
    }

    return bestElement;
  }

  /**
   * 计算文本密度评分
   */
  _calculateDensityScore(element) {
    const text = element.textContent.trim();
    const textLength = text.length;

    // 计算链接密度（链接文本占比）
    const links = element.querySelectorAll('a');
    let linkTextLength = 0;
    for (const link of links) {
      linkTextLength += link.textContent.trim().length;
    }
    const linkDensity = linkTextLength / textLength;

    // 计算段落数量
    const paragraphs = element.querySelectorAll('p');
    const paragraphCount = paragraphs.length;

    // 评分公式：文本长度 * (1 - 链接密度) * 段落数权重
    const score = textLength * (1 - linkDensity) * (1 + paragraphCount * 0.1);

    return score;
  }

  /**
   * 获取所有可翻译的文本节点
   * @param {Element} container - 内容容器，为 null 时获取全页面
   * @returns {Array} - 文本节点数组
   */
  getTextNodes(container = null) {
    const root = container || document.body;
    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          // 过滤空白文本
          if (!node.textContent.trim()) return NodeFilter.FILTER_REJECT;

          // 过滤忽略标签内的文本
          let parent = node.parentElement;
          while (parent && parent !== root) {
            const tagName = parent.tagName.toLowerCase();
            if (this.ignoreTags.includes(tagName)) return NodeFilter.FILTER_REJECT;

            const className = parent.className || '';
            const id = parent.id || '';
            for (const pattern of this.ignorePatterns) {
              if (className.toLowerCase().includes(pattern) || id.toLowerCase().includes(pattern)) {
                return NodeFilter.FILTER_REJECT;
              }
            }
            parent = parent.parentElement;
          }

          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    const nodes = [];
    while (walker.nextNode()) {
      nodes.push(walker.currentNode);
    }
    return nodes;
  }

  /**
   * 将文本节点按段落分组
   */
  groupByParagraphs(textNodes) {
    const groups = [];
    const processedParents = new Set();

    for (const node of textNodes) {
      // 找到最近的段落级父元素
      let paragraphParent = node.parentElement;
      while (paragraphParent && !this._isParagraphElement(paragraphParent)) {
        paragraphParent = paragraphParent.parentElement;
      }

      if (paragraphParent && !processedParents.has(paragraphParent)) {
        processedParents.add(paragraphParent);
        const text = paragraphParent.textContent.trim();
        if (text.length > 10) {
          groups.push({
            element: paragraphParent,
            text: text,
            nodes: this.getTextNodes(paragraphParent)
          });
        }
      } else if (!paragraphParent) {
        // 无段落父元素，单独处理
        const text = node.textContent.trim();
        if (text.length > 10) {
          groups.push({
            element: node.parentElement,
            text: text,
            nodes: [node]
          });
        }
      }
    }

    return groups;
  }

  /**
   * 判断是否为段落级元素
   */
  _isParagraphElement(element) {
    const tag = element.tagName.toLowerCase();
    const paragraphTags = ['p', 'div', 'article', 'section', 'li', 'td', 'blockquote'];
    return paragraphTags.includes(tag);
  }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ContentDetector };
} else {
  window.ContentDetector = ContentDetector;
}
