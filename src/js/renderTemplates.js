import templatesDB from '../../db/templates.json' with { type: "json" };
import {copyTemplate, getTemplateById, insertTemplate} from "./utils/tempateOperation.js";

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
    });
}
