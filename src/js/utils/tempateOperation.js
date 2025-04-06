import {copyToClipboard} from "./copyToClipboard.js";
import templatesDB from '../../../db/templates.json' with { type: "json" };

export function getTemplateById(id) {
    const foundTemplate = templatesDB.find(item => item.id === id);

    if(!foundTemplate) {
        throw new Error("Template not found");
    }

    return foundTemplate;
}

/**
 * Сохранение шаблона в буфер обмена
 * */
export function copyTemplate(content) {
    copyToClipboard(content);
}

/**
 * Вставка шаблона в активное поле на странице
 * */
export function insertTemplate(content) {
    const activeEl = document.activeElement;
    console.log({activeEl, content});

    if (activeEl /*&& (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA")*/) {
        activeEl.insertAdjacentHTML('afterbegin', content);
        /*const start = activeEl.selectionStart;
        const end = activeEl.selectionEnd;

        activeEl.setRangeText(content, start, end, "end");
        activeEl.dispatchEvent(new Event("input", { bubbles: true }));*/
    }
}
