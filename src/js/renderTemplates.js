import templatesDB from '../../db/templates.json' with { type: "json" };
import {copyTemplate, getTemplateById, insertTemplate} from "./utils/tempateOperation.js";
import {prepareReply} from "./utils/prepareReply.js";

function renderTemplateItem(template) {
    return `
        <li class="list-templates__item template" data-templateId="${template.id}">
            <div class="template__content">
                ${template.content}
            </div>
            <div class="template-buttons">
                <button class="template-buttons__item template__copy" title="Копировать">
                    <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" class="css-i6dzq1"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                </button>
                <button class="template-buttons__item template__paste" title="Вставить в активное поле">
                    <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" class="css-i6dzq1"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>
                </button>
                <button type="button" class="template-buttons__item template__reply" title="Вставить ответ и заполнить адресата" aria-label="Вставить ответ и заполнить адресата">
                    <svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"></rect><path d="m2 6 10 7L22 6M8 17h8"></path></svg>
                </button>
            </div>
        </li>
    `;
}

export function renderTemplateList(container) {
    const containerEl = document.querySelector(container);

    if(!containerEl) {
        throw new Error("Не удалось найти элемент " + containerEl);
    }

    for(const template of templatesDB) {
        containerEl.innerHTML += renderTemplateItem(template);
    }

    const templatesList = document.querySelectorAll('.list-templates__item');

    Array.from(templatesList).forEach(templateNode => {
        const templateId = templateNode.getAttribute('data-templateId');

        /* Copy */
        templateNode.querySelector('.template__copy').addEventListener('click', () => {
            const selectedTemplate = getTemplateById(Number(templateId));
            const content = selectedTemplate.content;
            copyTemplate(content);
        });

        /* Insert */
        templateNode.querySelector('.template__paste').addEventListener('click', async () => {
            const selectedTemplate = getTemplateById(Number(templateId));
            const content = selectedTemplate.content;

            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                function: insertTemplate,
                args: [content]
            });
        });

        templateNode.querySelector('.template__reply').addEventListener('click', async () => {
            const status = document.querySelector('.template-action-status');
            const buttons = containerEl.querySelectorAll('.template__reply');
            const showStatus = (message, isError = false) => {
                status.textContent = message;
                status.dataset.error = String(isError);
                status.hidden = false;
            };

            buttons.forEach(button => { button.disabled = true; });
            showStatus('Заполняем ответ и адресата…');
            try {
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                if (tab?.id == null) {
                    throw new Error('Не удалось определить активную вкладку.');
                }

                const results = await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    func: prepareReply,
                    args: [getTemplateById(Number(templateId)).content]
                });
                const result = results[0]?.result;
                showStatus(result?.message || 'Не удалось заполнить письмо.', !result?.success);
            } catch (error) {
                console.error('Не удалось подготовить ответ:', error);
                showStatus('Не удалось заполнить письмо. Проверьте доступ расширения к вкладке Mail.ru.', true);
            } finally {
                buttons.forEach(button => { button.disabled = false; });
            }
        });
    });
}
