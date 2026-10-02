const lines = character.lines;

const pet = document.querySelector('.pet');
const petStage = document.querySelector('.pet-stage');
const profileButton = document.querySelector('#profile-button');
const profileDialog = document.querySelector('#character-profile');
const profileClose = document.querySelector('#profile-close');
document.querySelector('#profile-name').textContent = character.name;
document.querySelector('#profile-subtitle').textContent = character.subtitle;
document.querySelector('#profile-appearance').textContent = character.appearance;
document.querySelector('#profile-personality').textContent = character.personality;
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
let lineIndex = -1;
let drag = null;
let moved = false;
let doubleClickTimer = null;
let isSending = false;
let currentModelName = 'gpt-4o-mini';
let conversation = [
  {
    role: 'system',
    content: character.systemPrompt,
  },
];

function showLine() {
  lineIndex = (lineIndex + 1) % lines.length;
  showCustomLine(lines[lineIndex]);
}

function showCustomLine(text) {
  bubble.textContent = text;
  window.desktopPet.showSpeech(text);
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
  status.textContent = busy ? '正在听你说话……' : (document.body.classList.contains('pass-through') ? '鼠标穿透中 · 可从托盘恢复' : '右键打开菜单');
}

function openSettings(state = {}) {
  settingsBackdrop.hidden = false;
  apiEndpoint.value = state.apiEndpoint || 'https://api.openai.com/v1/chat/completions';
  setModelOptions([], state.apiModel || 'gpt-4o-mini');
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
  settingsStatus.textContent = '正在拉取模型列表……';
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
  showCustomLine(character.doubleClickLine);
  sparkleBurst();
});

pet.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  event.preventDefault();
  showLine();
  sparkleBurst();
});

profileButton.addEventListener('click', (event) => {
  event.stopPropagation();
  profileDialog.showModal();
});
profileClose.addEventListener('click', () => profileDialog.close());
profileDialog.addEventListener('click', (event) => {
  if (event.target === profileDialog) {
    const bounds = profileDialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) profileDialog.close();
  }
});
profileDialog.addEventListener('close', () => profileButton.focus());

chatForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const question = chatInput.value.trim();
  if (!question || isSending) return;
  chatInput.value = '';
  conversation.push({ role: 'user', content: question });
  setChatBusy(true);
  showModelAnswer(question, '让我理一理思路，再慢慢说给你听。');
  try {
    const answer = await window.desktopPet.askModel({ messages: conversation });
    conversation.push({ role: 'assistant', content: answer });
    conversation = [conversation[0], ...conversation.slice(1).slice(-10)];
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
  if (event.key === 'Escape' && !profileDialog.open && !modelChat.hidden) closeModelAnswer();
});

document.addEventListener('contextmenu', (event) => {
  event.preventDefault();
  window.desktopPet.showContextMenu();
});

window.desktopPet.onStateUpdated(renderState);
window.desktopPet.onOpenModelSettings(openSettings);
window.desktopPet.getState().then(renderState);
