/**
 * 文字转卡片 - 主要JavaScript功能
 * 实现文件上传、文本处理和卡片生成等功能
 */

// DOM元素
const textInput = document.getElementById('text-input');
const fileInput = document.getElementById('file-input');
const fileName = document.getElementById('file-name');
const generateBtn = document.getElementById('generate-btn');
const loadingSpinner = document.getElementById('loading-spinner');
const previewSection = document.getElementById('preview-section');
const cardsContainer = document.getElementById('cards-container');
const regenerateBtn = document.getElementById('regenerate-btn');
const downloadBtn = document.getElementById('download-btn');
const carouselNavBtns = document.querySelectorAll('.carousel-nav button');

// 全局变量
let currentContent = '';
let currentCardIndex = 0;
let generatedCards = [];

// Claude API配置
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/complete';
const CLAUDE_API_KEY = ''; // 需要在实际部署时设置

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  // 监听文本输入
  textInput.addEventListener('input', handleTextInput);
  
  // 监听文件上传
  fileInput.addEventListener('change', handleFileUpload);
  
  // 生成卡片按钮
  generateBtn.addEventListener('click', generateCards);
  
  // 重新生成按钮
  regenerateBtn.addEventListener('click', regenerateCards);
  
  // 下载按钮
  downloadBtn.addEventListener('click', downloadCurrentCard);
  
  // 轮播导航
  carouselNavBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const index = parseInt(btn.getAttribute('data-index'));
      showCard(index);
    });
  });
  
  // 初始化生成按钮状态
  updateGenerateButtonState();
});

/**
 * 处理文本输入
 */
function handleTextInput() {
  currentContent = textInput.value.trim();
  updateGenerateButtonState();
}

/**
 * 处理文件上传
 */
async function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  // 显示文件名
  fileName.textContent = file.name;
  
  try {
    // 根据文件类型处理
    if (file.type === 'text/plain') {
      // 处理TXT文件
      const text = await readTextFile(file);
      textInput.value = text;
      currentContent = text;
    } else if (file.type === 'application/pdf' || 
              file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      // 处理PDF和DOCX文件
      const formData = new FormData();
      formData.append('file', file);
      
      try {
        const response = await fetch('/api/parse-file', {
          method: 'POST',
          body: formData
        });
        
        if (!response.ok) throw new Error('文件解析失败');
        
        const data = await response.json();
        textInput.value = data.content;
        currentContent = data.content;
      } catch (error) {
        console.error('文件解析错误:', error);
        alert('文件解析失败，请重试或尝试直接粘贴文本内容');
      }
    } else {
      alert('不支持的文件格式，请上传TXT、DOC、DOCX或PDF文件');
      return;
    }
    
    updateGenerateButtonState();
  } catch (error) {
    console.error('文件读取错误:', error);
    alert('文件读取失败，请重试');
  }
}

/**
 * 读取文本文件
 */
function readTextFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = e => reject(e);
    reader.readAsText(file);
  });
}

/**
 * 更新生成按钮状态
 */
function updateGenerateButtonState() {
  generateBtn.disabled = !currentContent;
  generateBtn.classList.toggle('opacity-50', !currentContent);
  generateBtn.classList.toggle('cursor-not-allowed', !currentContent);
}

/**
 * 生成卡片
 */
async function generateCards() {
  if (!currentContent) return;
  
  // 显示加载状态
  loadingSpinner.classList.remove('hidden');
  generateBtn.disabled = true;
  
  try {
    // 调用Claude API生成卡片
    const cards = await generateCardsWithClaude(currentContent);
    
    // 保存生成的卡片
    generatedCards = cards;
    
    // 显示预览区域
    previewSection.classList.remove('hidden');
    
    // 显示第一张卡片
    showCard(0);
  } catch (error) {
    console.error('卡片生成错误:', error);
    alert('卡片生成失败，请重试');
  } finally {
    // 隐藏加载状态
    loadingSpinner.classList.add('hidden');
    generateBtn.disabled = false;
  }
}

/**
 * 使用Claude API生成卡片
 */
async function generateCardsWithClaude(content) {
  try {
    const response = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': CLAUDE_API_KEY
      },
      body: JSON.stringify({
        prompt: `请将以下文本转换为三种不同风格的概念卡片，卡片尺寸为1080px×800px：\n\n${content}`,
        max_tokens_to_sample: 2000,
        temperature: 0.7
      })
    });
    
    if (!response.ok) throw new Error('API请求失败');
    
    const data = await response.json();
    return data.cards; // 假设API返回包含三张卡片数据的数组
  } catch (error) {
    console.error('Claude API错误:', error);
    throw new Error('卡片生成失败');
  }
}

/**
 * 显示指定索引的卡片
 */
function showCard(index) {
  if (!generatedCards[index]) return;
  
  currentCardIndex = index;
  
  // 更新卡片预览
  const cardPreview = cardsContainer.querySelector('.card-preview');
  cardPreview.innerHTML = generatedCards[index];
  
  // 更新导航按钮状态
  carouselNavBtns.forEach((btn, i) => {
    btn.classList.toggle('active', i === index);
  });
}

/**
 * 重新生成卡片
 */
function regenerateCards() {
  generateCards();
}

/**
 * 下载当前卡片
 */
function downloadCurrentCard() {
  if (!generatedCards[currentCardIndex]) return;
  
  // 创建一个临时链接
  const link = document.createElement('a');
  link.download = `concept-card-${currentCardIndex + 1}.png`;
  link.href = generatedCards[currentCardIndex];
  
  // 触发下载
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * 更新生成按钮状态
 */
function updateGenerateButtonState() {
  generateBtn.disabled = currentContent.length < 10;
}

/**
 * 生成卡片
 */
async function generateCards() {
  if (currentContent.length < 10) return;
  
  // 显示加载状态
  generateBtn.disabled = true;
  loadingSpinner.classList.remove('hidden');
  
  try {
    // 在实际应用中，这里应该调用Claude API
    // 这里使用模拟数据演示
    await simulateApiCall();
    
    // 生成三种不同风格的卡片
    generatedCards = [
      generateCardHTML('简约风格', 'bg-white'),
      generateCardHTML('深色风格', 'bg-dark text-white'),
      generateCardHTML('彩色风格', 'bg-gradient-to-r from-blue-500 to-purple-500 text-white')
    ];
    
    // 显示卡片预览区域
    previewSection.classList.remove('hidden');
    
    // 显示第一张卡片
    showCard(0);
    
    // 滚动到预览区域
    previewSection.scrollIntoView({ behavior: 'smooth' });
  } catch (error) {
    console.error('生成卡片错误:', error);
    alert('生成卡片失败，请重试');
  } finally {
    // 恢复按钮状态
    generateBtn.disabled = false;
    loadingSpinner.classList.add('hidden');
  }
}

/**
 * 模拟API调用
 */
function simulateApiCall() {
  return new Promise(resolve => {
    // 模拟API延迟
    setTimeout(resolve, 2000);
  });
}

/**
 * 生成卡片HTML
 */
function generateCardHTML(style, bgClass) {
  // 提取内容的前几句作为标题和摘要
  const sentences = currentContent.split(/[.!?。！？]/).filter(s => s.trim().length > 0);
  const title = sentences[0].trim();
  
  // 提取关键点
  const keyPoints = sentences.slice(1, 5).map(s => s.trim()).filter(s => s.length > 0);
  
  // 创建卡片HTML
  return `
    <div class="card-preview ${bgClass} flex flex-col p-8">
      <div class="text-2xl font-bold mb-6">${title}</div>
      
      <div class="flex-grow">
        <h3 class="text-lg font-semibold mb-4">核心要点</h3>
        <ul class="space-y-3">
          ${keyPoints.map(point => `<li><i class="fas fa-check-circle mr-2"></i>${point}</li>`).join('')}
        </ul>
      </div>
      
      <div class="mt-6 pt-4 border-t border-opacity-20 flex justify-between items-center">
        <div>
          <span class="text-sm opacity-70">风格：${style}</span>
        </div>
        <div>
          <i class="fas fa-lightbulb mr-1"></i>
          <span class="text-sm">文字转卡片</span>
        </div>
      </div>
    </div>
  `;
}

/**
 * 显示指定索引的卡片
 */
function showCard(index) {
  if (index < 0 || index >= generatedCards.length) return;
  
  // 更新当前卡片索引
  currentCardIndex = index;
  
  // 更新卡片容器内容
  cardsContainer.innerHTML = generatedCards[index];
  
  // 更新导航按钮状态
  carouselNavBtns.forEach((btn, i) => {
    if (i === index) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

/**
 * 重新生成卡片
 */
function regenerateCards() {
  generateCards();
}

/**
 * 下载当前卡片
 */
function downloadCurrentCard() {
  if (currentCardIndex < 0 || currentCardIndex >= generatedCards.length) return;
  
  // 在实际应用中，这里应该生成完整尺寸的卡片并下载
  // 这里使用模拟方法
  alert('在实际应用中，这里将下载完整尺寸(1080px × 800px)的卡片图片');
  
  // 实际实现可能需要使用html2canvas等库将卡片转换为图片
  // const cardElement = document.querySelector('.card-preview');
  // html2canvas(cardElement, { width: 1080, height: 800 }).then(canvas => {
  //   const link = document.createElement('a');
  //   link.download = '卡片.png';
  //   link.href = canvas.toDataURL('image/png');
  //   link.click();
  // });
}