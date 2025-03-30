import {renderTemplateList} from "./renderTemplates.js";

document.addEventListener("DOMContentLoaded", function() {
    renderTemplateList('.list-templates');


});

/*document.getElementById("insertText").addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: insertTextAtCursor,
        args: ["Привет! Это шаблонный текст."]
    });
});*/

function insertTextAtCursor(text) {
    const el = document.activeElement;
    console.log({el, text});

    if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) {
        const start = el.selectionStart;
        const end = el.selectionEnd;

        el.setRangeText(text, start, end, "end");
        el.dispatchEvent(new Event("input", { bubbles: true }));
    }
}
