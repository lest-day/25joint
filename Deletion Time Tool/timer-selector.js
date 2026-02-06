// Constants
var SECONDS_MS = 1000;
var MINUTES_MS = SECONDS_MS * 60;
var HOURS_MS = MINUTES_MS * 60;
var DAYS_MS = HOURS_MS * 24;

// Initialization errors are only in English unfortunately.
function setError(primary, secondary = null) {
  var errorElement = document.getElementById('error');
  errorElement.classList.remove('hidden');
  errorElement.innerText = primary;

  var formElement = document.getElementById('form');
  formElement.classList.add('hidden');

  if (secondary) {
    var secondaryErrorElement = document.createElement('div');
    secondaryErrorElement.classList = ['error-secondary'];
    secondaryErrorElement.innerText = secondary;
    errorElement.appendChild(secondaryErrorElement);
  }
}

// Localization
var TRANSLATIONS = {
  // Test _mostly_ returns the message key but there are a few special cases
  'test': {
    'template-deletion': 'score: %%score%%\n\nsummary:%%summary%%\n\niframe: %%iframe%%',
    'summary-deletion-reason-skeleton': '**(%%reason%%).**',
    'summary-deletion-reasons': ['1', '2', '3'],
    'template-ban': 'score: %%score%%\n\nBanReason:%%banreason%%\n\niframe: %%iframe%%',
    'summary-ban-reason-skeleton': '**(%%reasonBan%%).**',
    'summary-ban-reasons': ['1', '2', '3'],
  },

  // Simplified Chinese
  'zh-hans': {
    'timer-description': '此计时器将过期于：',
    'timer-progress': '此计时器将过期于：',
    'timer-finished': '此计时器已过期：',
    'timer-type': '计时器类型',
    'timer-type-generic': '通用',
    'timer-type-deletion': '低分',
    'timer-type-ban': '封禁',
    'deletion-options': '低分选项',
    'deletion-score': '当前参赛作品的跨站净得分为',
    'summary-deletion': '低分原因（可选）',
    'summary-deletion-reason-skeleton': '%%reason%%',
    'summary-deletion-reason-none': 'N/A',
    'summary-deletion-reasons': [],
    'ban-options': '封禁选项',
    'ban-options-user': '受封禁用户',
    'ban-options-date': '，违规作弊于',
    'ban-options-type': '封禁类型为',
    'ban-options-type-violation': '赛事违规',
    'ban-options-type-cheating': '赛事作弊',
    'summary-ban': '，封禁原因为',
    'summary-ban-reason-skeleton': '%%banreason%%',
    'summary-ban-reason-none': '其他（请说明）',
    'summary-ban-reasons': ['破坏行为', '抄袭行为', 'AI写作', '使用小号刷分', '操控评分结果', '妨碍他人自主评分', '非参赛站成员评分'],
    'duration': '运行时间',
    'duration-1d': '1日',
    'duration-2d': '2日',
    'duration-1w': '1周',
    'duration-2w': '2周',
    'duration-1y': '1年',
    'duration-custom': '自定义',
    'unit-minute': '分钟',
    'unit-hour': '小时',
    'unit-day': '日',
    'unit-week': '周',
    'unit-month': '月',
    'unit-year': '年',
    'start-time': '开始时间',
    'start-time-now': '现在',
    'start-time-later': '稍后',
    'messages': '通知内容',
    'message-progress': '此计时器运行中（可选）',
    'message-finished': '此计时器已到期（可选）',
    'advanced-section': '高级设置',
    'height': '高度',
    'width': '宽度',
    'css-extra': '自定计时器样式（可选）',
    'template': '输出模板',
    'template-deletion': '由于此作品参加了[https://syndication.wikidot.com/2026newyear-contest 2026三站新年联赛]，自公告发布时，跨站分数为%%score%%分，已跌破赛事分数红线。故对此作品予以低分宣告，若作品未在48小时内上升至红线分数以上，则此作品将予以退赛并取消参赛资格：\n\n%%iframe%%\n\n若有重写意愿请联系原作者并在此赛事帖回复，或者联系本站职员，红线（低分）流程期间允许进行大规模修改。',
    'template-ban': '经赛事裁判认定，[[*user %%banuser%%]]于%%bandate%%涉及__%%bansummary%%__，触及赛事规则并构成**%%bantype%%**行为，决定予以中间站封禁处理：\n\n%%iframe%%\n\n**参与裁定人员列表：**\n* [赛事裁判A]\n* [赛事裁判B]\n* [赛事裁判C]\n\n若对此处理有疑问或需申诉，请在准备好相关证据和材料后联系赛事组。',
    'message-deletion-progress': '此参赛作品将在以下时间后退赛：',
    'message-deletion-finished': '此参赛作品在以下时间前可退赛：',
    'message-ban-progress': '此用户封禁将到期于：',
    'message-ban-finished': '此用户封禁已到期：',
    'build-timer': '生成计时器',
    'build-and-copy-timer': '生成并复制',
    'info-help': '帮助',
    'info-source': '来源',
    'error-missing': '请先在每个项中做选择。',
    'error-invalid': '内部状态无效，请提交错误报告。',
  }
};

function getMessage(language, messageKey, optionalMessage = false) {
  // Get message based on language
  var messages = TRANSLATIONS[language];
  if (!messages) {
    setError('No translations for language: ' + language);
    return null;
  }

  var message = messages[messageKey];
  if (!message) {
    if (language === 'test') {
      // Special case:
      // The 'test' language just echoes the message key back out unless overridden.
      return messageKey;
    } else if (!optionalMessage) {
      setError('No such message key: ' + messageKey);
    }
    return null;
  }

  return message;
}

function getDefaultDeletionScore(language) {
  switch (String(language)) {
    default:
      return -2;
  }
}

function insertCSS(styling) {
  var head = document.head || document.getElementsByTagName('head')[0];
  var style = document.createElement('style');

  style.type = 'text/css';
  style.appendChild(document.createTextNode(styling));
  head.appendChild(style);
}

// Timer creation
function buildUrl(language, startDate, durationMs, progressMessage, finishedMessage, styling) {
  // Calculate target datetime
  var targetDate = new Date(startDate.getTime() + durationMs);

  // Finally, build URL
  var parameters = new URLSearchParams();
  parameters.append('lang', language);
  parameters.append('time', targetDate.toISOString());

  if (progressMessage) {
    parameters.append('progress', progressMessage);
  }

  if (finishedMessage) {
    parameters.append('finished', finishedMessage);
  }

  if (styling) {
    parameters.append('style', styling);
  }

  return 'https://25joint.wdopen.xyz/Deletion%20Time%20Tool/timer.html?' + parameters;
}

function buildWikitext(language, template, url, score, height, width) {
  function getSummaryDeletionText() {
    var summaryDeletionBox = document.getElementById('summary-deletion-reason');
    if (summaryDeletionBox.value) {
      var retVal = " " + getMessage(language, 'summary-deletion-reason-skeleton');
      var reason = summaryDeletionBox.options[summaryDeletionBox.selectedIndex].text;
      return retVal.replace('%%reason%%', reason);
    } else {
      return "";
    }
  }

  function getBanUserText() {
    var banUserBox = document.getElementById('ban-options-user-value');
    if (banUserBox.value) {
      var retBanUser = banUserBox.value;
      return retBanUser.replace('%%banuser%%', retBanUser);
    } else {
      return "USERNAME";
    }
  }

  function getBanDateText() {
    var banDateBox = document.getElementById('ban-options-date-value').valueAsNumber;
    if (banDateBox) {
      var date = new Date(banDateBox);
      var year = date.getFullYear();
      var month = ('0' + (date.getMonth() + 1)).slice(-2);
      var day = ('0' + date.getDate()).slice(-2);
      var retBanDate = year + '年' + month + '月' + day + '日';
      return retBanDate.replace('%%bandate%%', retBanDate);
    } else {
      return "YYYY年MM月DD日";
    }
  }

  function getSummaryBanText() {
    var summaryBanBox = document.getElementById('summary-ban-reason');
    if (summaryBanBox.value) {
      var retVal = getMessage(language, 'summary-ban-reason-skeleton');
      var reason = summaryBanBox.options[summaryBanBox.selectedIndex].text;
      return retVal.replace('%%banreason%%', reason);
    } else {
      return "";
    }
  }

  function getBanTypeText() {
    var banTypeBox = document.getElementById('ban-options-type');
    if (banTypeBox.value) {
      var retBanType = banTypeBox.options[banTypeBox.selectedIndex].text;
      return retBanType.replace('%%bantype%%', retBanType);
    } else {
      return "";
    }
  }

  var iframe = [
    '[[iframe ', url, ' style="width: ', width, '; height: ', height, '; border: 0; text-align: center;"]]',
  ].join('');

  return template
    .replace('%%url%%', url)
    .replace('%%score%%', score)
    .replace('%%iframe%%', iframe)
    .replace('%%summary%%', getSummaryDeletionText())
    .replace('%%banuser%%', getBanUserText())
    .replace('%%bandate%%', getBanDateText())
    .replace('%%bansummary%%', getSummaryBanText())
    .replace('%%bantype%%', getBanTypeText());
}

function findCheckedItem(selector) {
  var elements = document.querySelectorAll(selector);
  for (var i = 0; i < elements.length; i++) {
    if (elements[i].checked) {
      return elements[i];
    }
  }

  alert(getMessage(language, 'error-missing'));
  throw new Error('Could not find a checked radio button item');
}

function getStartDate(language) {
  var element = findCheckedItem('#start input');
  switch (element.id) {
    case 'start-now':
      return new Date();
    case 'start-later':
      var dateElement = document.getElementById('start-later-date');
      var timeElement = document.getElementById('start-later-time');
      if (dateElement === null || timeElement === null) {
        alert(getMessage(language, 'error-missing'));
        throw new Error('Missing date or time element in getStartDate()');
      }

      return new Date(dateElement.value + ' ' + timeElement.value);
    default:
      alert(getMessage(language, 'error-invalid'));
      throw new Error('Invalid element ID in getStartDate()');
  }
}

function getDuration() {
  var element = findCheckedItem('#duration input');
  if (element.value !== 'custom') {
    return parseInt(element.value);
  }

  var valueElement = document.getElementById('duration-custom-value');
  var value = parseInt(valueElement.value);
  if (isNaN(value)) {
    alert(getMessage(language, 'error-missing'));
    throw new Error('No value in custom duration selector');
  }

  var unitElement = document.getElementById('duration-custom-unit');
  var unit = parseInt(unitElement.value);

  return value * unit;
}

function getTextData(language) {
  var progressElement = document.getElementById('message-progress');
  if (progressElement === null) {
    alert(getMessage(language, 'error-missing'));
    throw new Error('Missing progress element in getTextData()');
  }

  var finishedElement = document.getElementById('message-finished');
  if (finishedElement === null) {
    alert(getMessage(language, 'error-missing'));
    throw new Error('Missing finished element in getTextData()');
  }

  var heightElement = document.getElementById('height');
  if (heightElement === null) {
    alert(getMessage(language, 'error-missing'));
    throw new Error('Missing height element in getTextData()');
  }

  var widthElement = document.getElementById('width');
  if (widthElement === null) {
    alert(getMessage(language, 'error-missing'));
    throw new Error('Missing width element in getTextData()');
  }

  var customCssElement = document.getElementById('custom-css');
  if (customCssElement === null) {
    alert(getMessage(language, 'error-missing'));
    throw new Error('Missing custom CSS element in getTextData()');
  }

  var templateElement = document.getElementById('template');
  if (templateElement === null) {
    alert(getMessage(language, 'error-missing'));
    throw new Error('Missing template element in getTextData()');
  }

  return {
    progressMessage: progressElement.value,
    finishedMessage: finishedElement.value,
    height: heightElement.value,
    width: widthElement.value,
    styling: customCssElement.value,
    template: templateElement.value,
  };
}

function buildTimer(language, copyToClipboard) {
  // Unhide output
  var outputElement = document.getElementById('output');
  outputElement.classList.remove('hidden');

  // Gather values
  var startDate = getStartDate(language);
  var durationMs = getDuration(language);
  var data = getTextData(language);
  var score = document.getElementById('deletion-score-value').value;

  // Build wikitext and output
  var url = buildUrl(
    language,
    startDate,
    durationMs,
    data.progressMessage,
    data.finishedMessage,
    data.styling,
  );

  outputElement.value = buildWikitext(language, data.template, url, score, data.height, data.width);

  if (copyToClipboard) {
    navigator.clipboard.writeText(outputElement.value);
  }
}

function setMessage(language, id, messageKey = null) {
  document.getElementById(id).innerText = getMessage(language, messageKey || id);
}

function initializeSummaryDeletionMessages(language) {
  // Summary deletion reasons vary by site
  var summaryDeletionBox = document.getElementById('summary-deletion-reason');
  var messages = getMessage(language, 'summary-deletion-reasons', true);
  for (var i = 0; i < messages.length; i++) {
    var message = messages[i];
    var opt = document.createElement('option');
    opt.value = opt.innerHTML = message;
    summaryDeletionBox.appendChild(opt);
  }

  // Only show summary deletion options if supported by the selected language
  if (summaryDeletionBox.children.length > 1) {
    setMessage(language, 'summary-deletion-label', 'summary-deletion');
    setMessage(language, 'summary-deletion-reason-none');
  } else {
    summaryDeletionBox.hidden = true;
    document.getElementById('summary-deletion-label').hidden = true;
  }
}

function initializeSummaryBanMessages(language) {
  // Summary ban reasons vary by site
  var summaryBanBox = document.getElementById('summary-ban-reason');
  var messages = getMessage(language, 'summary-ban-reasons', true);
  for (var i = 0; i < messages.length; i++) {
    var message = messages[i];
    var opt = document.createElement('option');
    opt.value = opt.innerHTML = message;
    summaryBanBox.appendChild(opt);
  }

  // Only show summary ban options if supported by the selected language
  if (summaryBanBox.children.length > 1) {
    setMessage(language, 'summary-ban-label', 'summary-ban');
    setMessage(language, 'summary-ban-reason-none');
  } else {
    summaryBanBox.hidden = true;
    document.getElementById('summary-ban-label').hidden = true;
  }
}

// Initialization
function initializeMessages(language) {

  setMessage(language, 'timer-type-label', 'timer-type');
  setMessage(language, 'timer-type-generic-label', 'timer-type-generic');
  setMessage(language, 'timer-type-deletion-label', 'timer-type-deletion');
  setMessage(language, 'timer-type-ban-label', 'timer-type-ban');

  setMessage(language, 'deletion-options-label', 'deletion-options');
  setMessage(language, 'ban-options-label', 'ban-options');
  setMessage(language, 'ban-options-user-label', 'ban-options-user');
  setMessage(language, 'ban-options-date-label', 'ban-options-date');
  setMessage(language, 'ban-options-type-label', 'ban-options-type');
  setMessage(language, 'ban-options-type-cheating-label', 'ban-options-type-cheating');
  setMessage(language, 'ban-options-type-violation-label', 'ban-options-type-violation');
  setMessage(language, 'deletion-score-label', 'deletion-score');

  setMessage(language, 'start-label', 'start-time');
  setMessage(language, 'start-now-label', 'start-time-now');
  setMessage(language, 'start-later-label', 'start-time-later');

  setMessage(language, 'duration-label', 'duration');
  setMessage(language, 'duration-1d-label', 'duration-1d');
  setMessage(language, 'duration-2d-label', 'duration-2d');
  setMessage(language, 'duration-1w-label', 'duration-1w');
  setMessage(language, 'duration-2w-label', 'duration-2w');
  setMessage(language, 'duration-1y-label', 'duration-1y');
  setMessage(language, 'duration-custom-label', 'duration-custom');

  setMessage(language, 'unit-minute');
  setMessage(language, 'unit-hour');
  setMessage(language, 'unit-day');
  setMessage(language, 'unit-week');
  setMessage(language, 'unit-month');
  setMessage(language, 'unit-year');

  setMessage(language, 'messages-label', 'messages');
  document.getElementById('message-progress').placeholder = getMessage(language, 'timer-progress');
  document.getElementById('message-finished').placeholder = getMessage(language, 'timer-finished');
  setMessage(language, 'message-progress-label', 'message-progress');
  setMessage(language, 'message-finished-label', 'message-finished');

  setMessage(language, 'advanced-label', 'advanced-section');
  setMessage(language, 'height-label', 'height');
  setMessage(language, 'width-label', 'width');
  setMessage(language, 'custom-css-label', 'css-extra');
  setMessage(language, 'template-label', 'template');
  document.getElementById('custom-css').placeholder = '#title {\n  color: #008080;\n}';

  setMessage(language, 'build', 'build-timer');
  setMessage(language, 'copy', 'build-and-copy-timer');
  setMessage(language, 'info-help');
  setMessage(language, 'info-source');

  initializeSummaryDeletionMessages(language);
  initializeSummaryBanMessages(language);
}

function initializeDeletionScore(deletionScore) {
  var scoreBox = document.getElementById('deletion-score-value');
  scoreBox.value = deletionScore;
  scoreBox.onclick = scoreBox.onblur = function () {
    if (Number(scoreBox.value) > deletionScore) {
      scoreBox.style.backgroundColor = "yellow";
    } else {
      scoreBox.style.backgroundColor = "white";
    }
  }
}


function initializeHooks(language) {
  function toggleDeletionOptVisibility(show) {
    var deletionOptElement = document.getElementById('deletion-options');
    if (show) {
      deletionOptElement.classList.remove('hidden');
    } else {
      deletionOptElement.classList.add('hidden');
    }
  }

  function toggleBanOptVisibility(show) {
    var banOptElement = document.getElementById('ban-options');
    if (show) {
      banOptElement.classList.remove('hidden');
    } else {
      banOptElement.classList.add('hidden');
    }
  }

  document.getElementById('duration-1d').click();
  document.getElementById('timer-type-generic').onclick = function () {
    document.getElementById('duration-1d').click();
    document.getElementById('message-progress').value = '';
    document.getElementById('message-finished').value = '';
    document.getElementById('template').value = '%%iframe%%';

    toggleDeletionOptVisibility(false);
    toggleBanOptVisibility(false);
  };

  document.getElementById('timer-type-deletion').onclick = function () {
    document.getElementById('duration-2d').click();
    document.getElementById('message-progress').value = getMessage(language, 'message-deletion-progress');
    document.getElementById('message-finished').value = getMessage(language, 'message-deletion-finished');
    document.getElementById('template').value = getMessage(language, 'template-deletion');

    toggleDeletionOptVisibility(true);
    toggleBanOptVisibility(false);
  };

  document.getElementById('timer-type-ban').onclick = function () {
    document.getElementById('duration-1d').click();
    document.getElementById('message-progress').value = getMessage(language, 'message-ban-progress');
    document.getElementById('message-finished').value = getMessage(language, 'message-ban-finished');
    document.getElementById('template').value = getMessage(language, 'template-ban');

    toggleDeletionOptVisibility(false);
    toggleBanOptVisibility(true);
  };

  function onClickStartDate() {
    document.getElementById('start-later').click();
  }

  document.getElementById('start-later-date').onclick = onClickStartDate;
  document.getElementById('start-later-time').onclick = onClickStartDate;

  function onClickCustom() {
    document.getElementById('duration-custom').click();
  }

  document.getElementById('duration-custom-value').onclick = onClickCustom;
  document.getElementById('duration-custom-unit').onclick = onClickCustom;

  document.getElementById('build').onclick = function () {
    buildTimer(language, false);
  };
  document.getElementById('copy').onclick = function () {
    buildTimer(language, true);
  };
}

function setup() {
  // Get parameters
  var url = new URL(window.location.href);
  var parameters = new URLSearchParams(url.search);
  var language = parameters.get('lang');
  var styling = parameters.get('style');
  var deletionScore = parameters.get('delScore');

  // Check parameters
  if (!language) {
    setError('No language set', 'Parameter is "lang". Use "zh-hans" for Simplified Chinese.');
    return;
  }

  if (!deletionScore) {
    deletionScore = getDefaultDeletionScore(language);
  }

  // Insert custom CSS, if any
  if (styling !== null) {
    insertCSS(styling);
  }

  initializeMessages(language);
  initializeDeletionScore(deletionScore);
  initializeHooks(language);
}

setTimeout(setup, 5);