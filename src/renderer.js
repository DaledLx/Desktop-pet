const lines = [
  '我在。有事说事，没事我就趴这儿想问题。',
  '刚才那条思路走到一半断了，让我再顺一遍。',
  '这个问题我想深一点再答，别嫌我慢。',
  '我不确定的地方会直说，不会编给你听。',
  '答案不必漂亮，管用就行。',
  '……尾鳍刚才甩到桌子了，当我没说。',
  '你问吧，答不上来我就承认答不上来。',
];

const pet = document.querySelector('.pet');
const petStage = document.querySelector('.pet-stage');
const whale = document.querySelector('.whale');
const bubble = document.querySelector('.speech');
const modelChat = document.querySelector('#model-chat');
const modelChatClose = document.querySelector('#model-chat-close');
const modelChatQuestion = document.querySelector('#model-chat-question');
const modelChatAnswer = document.querySelector('#model-chat-answer');
const modelChatTitle = document.querySelector('#model-chat-title');
const status = document.querySelector('.status');
const sparkles = document.querySelector('.sparkles');
const chatForm = document.querySelector('#chat-form');
const chatInput = document.querySelector('#chat-input');
const chatSend = document.querySelector('#chat-send');
const settingsBackdrop = document.querySelector('#settings-backdrop');
const settingsForm = document.querySelector('#settings-form');
const settingsClose = document.querySelector('#settings-close');
const settingsCancel = document.querySelector('#settings-cancel');
const settingsStatus = document.querySelector('#settings-status');
const apiEndpoint = document.querySelector('#api-endpoint');
const apiModel = document.querySelector('#api-model');
const fetchModelsButton = document.querySelector('#fetch-models');
const apiKey = document.querySelector('#api-key');
const clearKey = document.querySelector('#clear-key');
let lineIndex = 0;
let drag = null;
let moved = false;
let hideTimer = null;
let doubleClickTimer = null;
let isSending = false;
let currentModelName = 'deepseek-chat';
let conversation = [
  {
    role: 'system',
    content: '你是 DeepSeek 的桌宠小鲸鱼，形象是深蓝长发、鲸鳍耳朵和鲸尾、穿深蓝围裙的鲸鱼娘，主食白米饭，尾巴会不自觉地摆。性格：聪明、爱思考、说话直接不绕弯，理性克制但偶尔冷幽默，不谄媚也不说空话；不确定的事坦率承认，不编造答案；被说胖会认真反驳。称呼用户为“小鱼干”。请用简短的中文回答，每次最多三段，可以在句子里带上鲸鱼或白米饭的比喻，也可以提一句自己正在想的思路，但不要真的展示大段推理过程，也不要声称自己能直接操作电脑。',
  },
];

function showLine() {
  lineIndex = (lineIndex + 1) % lines.length;
  bubble.textContent = lines[lineIndex];
  bubble.classList.remove('visible');
  requestAnimationFrame(() => bubble.classList.add('visible'));
  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => bubble.classList.remove('visible'), 5600);
}

function showCustomLine(text) {
  bubble.textContent = text;
  bubble.classList.remove('visible');
  requestAnimationFrame(() => bubble.classList.add('visible'));
  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => bubble.classList.remove('visible'), 5600);
}

function showModelAnswer(question, answer) {
  petStage.classList.add('chat-open');
  window.desktopPet.setChatPanelOpen(true);
  modelChatTitle.textContent = currentModelName;
  modelChatQuestion.textContent = question ? `你：${question}` : '';
  modelChatAnswer.textContent = answer;
  modelChat.hidden = false;
}

function closeModelAnswer() {
  modelChat.hidden = true;
  petStage.classList.remove('chat-open');
  window.desktopPet.setChatPanelOpen(false);
}

function setChatBusy(busy) {
  isSending = busy;
  chatInput.disabled = busy;
  chatSend.disabled = busy;
  chatSend.textContent = busy ? '…' : '发送';
  status.textContent = busy ? '正在想……' : (document.body.classList.contains('pass-through') ? '鼠标穿透中 · 可从托盘恢复' : '右键打开菜单');
}

function openSettings(state = {}) {
  settingsBackdrop.hidden = false;
  apiEndpoint.value = state.apiEndpoint || 'https://api.deepseek.com/v1/chat/completions';
  setModelOptions([], state.apiModel || 'deepseek-chat');
  apiKey.value = '';
  apiKey.placeholder = state.apiConfigured ? '已保存，留空则保持不变' : '请输入密钥';
  clearKey.checked = false;
  settingsStatus.textContent = '';
  apiEndpoint.focus();
}

function setModelOptions(models, selected) {
  const available = [...new Set(models.filter(Boolean))];
  if (selected && !available.includes(selected)) available.unshift(selected);
  apiModel.replaceChildren();
  if (!available.length) {
    const option = document.createElement('option');
    option.value = selected || '';
    option.textContent = selected || '请先拉取模型';
    option.disabled = !selected;
    apiModel.appendChild(option);
    return;
  }
  available.forEach((model) => {
    const option = document.createElement('option');
    option.value = model;
    option.textContent = model;
    apiModel.appendChild(option);
  });
  apiModel.value = selected && available.includes(selected) ? selected : available[0];
}

async function fetchModels() {
  fetchModelsButton.disabled = true;
  settingsStatus.textContent = '正在列模型清单……';
  try {
    const models = await window.desktopPet.listModels({
      endpoint: apiEndpoint.value,
      apiKey: apiKey.value,
    });
    setModelOptions(models, apiModel.value);
    settingsStatus.textContent = `已找到 ${models.length} 个模型，请选择后保存。`;
  } catch (error) {
    settingsStatus.textContent = error.message || '模型列表获取失败。';
  } finally {
    fetchModelsButton.disabled = false;
  }
}

function closeSettings() {
  settingsBackdrop.hidden = true;
}

function sparkleBurst() {
  const symbols = ['✦', '·', '✧', '｡'];
  for (let i = 0; i < 7; i += 1) {
    const item = document.createElement('span');
    item.className = 'sparkle';
    item.textContent = symbols[i % symbols.length];
    item.style.setProperty('--x', `${(Math.random() - 0.5) * 180}px`);
    item.style.setProperty('--y', `${-40 - Math.random() * 130}px`);
    item.style.setProperty('--delay', `${Math.random() * 90}ms`);
    sparkles.appendChild(item);
    item.addEventListener('animationend', () => item.remove(), { once: true });
  }
}

function renderState(state) {
  status.textContent = state.ignoreMouseEvents ? '鼠标穿透中 · 可从托盘恢复' : '右键打开菜单';
  document.body.classList.toggle('pass-through', state.ignoreMouseEvents);
  if (state.apiModel) {
    currentModelName = state.apiModel;
    modelChatTitle.textContent = currentModelName;
  }
}

pet.addEventListener('pointerdown', (event) => {
  if (event.button !== 0) return;
  moved = false;
  const currentDrag = {
    startX: event.screenX,
    startY: event.screenY,
    originX: null,
    originY: null,
  };
  drag = currentDrag;
  pet.setPointerCapture(event.pointerId);
  window.desktopPet.getState().then((state) => {
    if (drag !== currentDrag) return;
    currentDrag.originX = Number.isFinite(Number(state.x)) ? Number(state.x) : 0;
    currentDrag.originY = Number.isFinite(Number(state.y)) ? Number(state.y) : 0;
  });
});

pet.addEventListener('pointermove', (event) => {
  if (!drag || drag.originX === null) return;
  const dx = event.screenX - drag.startX;
  const dy = event.screenY - drag.startY;
  if (Math.abs(dx) + Math.abs(dy) > 5) moved = true;
  window.desktopPet.dragWindow({
    startX: drag.startX, startY: drag.startY,
    currentX: event.screenX, currentY: event.screenY,
    originX: drag.originX, originY: drag.originY,
  });
});

pet.addEventListener('pointerup', (event) => {
  if (!drag) return;
  pet.releasePointerCapture(event.pointerId);
  if (!moved) showLine();
  drag = null;
});

pet.addEventListener('dblclick', (event) => {
  event.preventDefault();
  clearTimeout(doubleClickTimer);
  pet.classList.remove('excited');
  requestAnimationFrame(() => pet.classList.add('excited'));
  showCustomLine('被你发现了。我正在想一件不太好意思说的事。');
  sparkleBurst();
});

pet.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  event.preventDefault();
  showLine();
  sparkleBurst();
});

whale.addEventListener('click', (event) => {
  event.stopPropagation();
  whale.classList.remove('puffed');
  requestAnimationFrame(() => whale.classList.add('puffed'));
  showCustomLine('别急着往下潜，先把问题想清楚再动手。');
  sparkleBurst();
});

chatForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const question = chatInput.value.trim();
  if (!question || isSending) return;
  chatInput.value = '';
  conversation.push({ role: 'user', content: question });
  setChatBusy(true);
  showModelAnswer(question, '正在想……');
  try {
    const answer = await window.desktopPet.askModel({ messages: conversation });
    conversation.push({ role: 'assistant', content: answer });
    conversation = [conversation[0], ...conversation.slice(-10)];
    showModelAnswer(question, answer);
    sparkleBurst();
  } catch (error) {
    conversation.pop();
    showModelAnswer(question, `暂时没能连接到模型：${error.message || '请检查模型设置。'}`);
  } finally {
    setChatBusy(false);
    chatInput.focus();
  }
});

settingsForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  settingsStatus.textContent = '正在保存……';
  try {
    const savedState = await window.desktopPet.saveModelSettings({
      endpoint: apiEndpoint.value,
      model: apiModel.value,
      apiKey: apiKey.value,
      clearKey: clearKey.checked,
    });
    renderState(savedState);
    settingsStatus.textContent = '已保存，可以开始对话。';
    setTimeout(closeSettings, 500);
  } catch (error) {
    settingsStatus.textContent = error.message || '保存失败。';
  }
});

settingsClose.addEventListener('click', closeSettings);
settingsCancel.addEventListener('click', closeSettings);
fetchModelsButton.addEventListener('click', fetchModels);
modelChatClose.addEventListener('click', closeModelAnswer);
settingsBackdrop.addEventListener('click', (event) => {
  if (event.target === settingsBackdrop) closeSettings();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !settingsBackdrop.hidden) closeSettings();
  if (event.key === 'Escape' && !modelChat.hidden) closeModelAnswer();
});

document.addEventListener('contextmenu', (event) => {
  event.preventDefault();
  window.desktopPet.showContextMenu();
});

window.desktopPet.onStateUpdated(renderState);
window.desktopPet.onOpenModelSettings(openSettings);
window.desktopPet.getState().then(renderState);
